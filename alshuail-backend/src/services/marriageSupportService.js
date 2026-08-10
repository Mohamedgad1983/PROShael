/**
 * Marriage Support Service — business logic for marriage-support requests
 * (برنامج دعم المقبلين على الزواج).
 *
 * Mirrors the loan-service shape:
 *   • status enum + ALLOWED_TRANSITIONS state machine
 *   • settings reader
 *   • payload validator
 *   • createRequest (transactional, allocates sequence, writes initial history)
 *   • transitionStatus (validates legal moves, writes history, dispatches push)
 *   • enterCommitteeData (the calculation engine — produces the four amounts
 *     and snapshots the four settings used)
 *   • generateRequestHash (SHA256 of canonical request data — stamped at
 *     awaiting_signatures and embedded in every signature row)
 *   • recordSignature (sequential — beneficiary → witness_1 → witness_2 →
 *     committee_chair, validated server-side)
 *   • countPreviousAnaniyat (auto-counts past marriage_support contributions
 *     for the member; committee chair can override)
 *
 * State machine (see migration 20260501_marriage_support_system.sql):
 *
 *   submitted ─► under_committee_review ─► data_entered ─► awaiting_signatures
 *                                          └► rejected            │
 *                                                                 ▼ (4 sigs)
 *                                                         signatures_complete
 *                                                                 │ (chairman)
 *                                                                 ▼
 *                                                         approved_by_chairman
 *                                                                 │ (fund pays)
 *                                                                 ▼
 *                                                             completed
 *
 *   Member can cancel only while status ∈ {submitted, under_committee_review}.
 */

import crypto from 'crypto';
import { query, getClient } from './database.js';
import { log } from '../utils/logger.js';
import { allocateSequence } from './sequenceGenerator.js';
import { recordStatusChange } from './statusHistoryService.js';
import { createMemberNotification } from './notificationService.js';

// ─── constants ────────────────────────────────────────────────────────────────

export const MARRIAGE_STATUS = Object.freeze({
  SUBMITTED:                'submitted',
  UNDER_COMMITTEE_REVIEW:   'under_committee_review',
  DATA_ENTERED:             'data_entered',
  AWAITING_SIGNATURES:      'awaiting_signatures',
  SIGNATURES_COMPLETE:      'signatures_complete',
  APPROVED_BY_CHAIRMAN:     'approved_by_chairman',
  COMPLETED:                'completed',
  REJECTED:                 'rejected',
  CANCELLED:                'cancelled',
});

export const SIGNER_ROLE = Object.freeze({
  BENEFICIARY:      'beneficiary',
  WITNESS_1:        'witness_1',
  WITNESS_2:        'witness_2',
  COMMITTEE_CHAIR:  'committee_chair',
});

/** Strict ordering for sequential signing. */
export const SIGNATURE_ORDER = Object.freeze([
  SIGNER_ROLE.BENEFICIARY,
  SIGNER_ROLE.WITNESS_1,
  SIGNER_ROLE.WITNESS_2,
  SIGNER_ROLE.COMMITTEE_CHAIR,
]);

export const SIGNATURE_REMINDER_COOLDOWN_SECONDS = 15 * 60;

const signatureReminderCache = new Map();
const signatureReminderInFlight = new Map();

function idsMatch(left, right) {
  return left !== undefined && left !== null &&
    right !== undefined && right !== null &&
    String(left) === String(right);
}

function serviceError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Resolve a request participant from immutable server-side assignments.
 * The request body is deliberately never consulted for this decision.
 */
export function deriveParticipantRole(request, memberId) {
  if (!request || memberId === undefined || memberId === null) {return null;}
  if (idsMatch(request.member_id, memberId)) {return SIGNER_ROLE.BENEFICIARY;}
  if (idsMatch(request.witness_1_id, memberId)) {return SIGNER_ROLE.WITNESS_1;}
  if (idsMatch(request.witness_2_id, memberId)) {return SIGNER_ROLE.WITNESS_2;}
  if (idsMatch(request.committee_chair_id, memberId)) {return SIGNER_ROLE.COMMITTEE_CHAIR;}
  return null;
}

function signerMemberIdForRole(request, signerRole) {
  const ids = {
    [SIGNER_ROLE.BENEFICIARY]: request?.member_id,
    [SIGNER_ROLE.WITNESS_1]: request?.witness_1_id,
    [SIGNER_ROLE.WITNESS_2]: request?.witness_2_id,
    [SIGNER_ROLE.COMMITTEE_CHAIR]: request?.committee_chair_id,
  };
  return ids[signerRole] || null;
}

function signerNameForRole(request, signerRole) {
  const names = {
    [SIGNER_ROLE.BENEFICIARY]: request?.applicant_name,
    [SIGNER_ROLE.WITNESS_1]: request?.witness_1_name,
    [SIGNER_ROLE.WITNESS_2]: request?.witness_2_name,
    [SIGNER_ROLE.COMMITTEE_CHAIR]: request?.committee_chair_name || 'رئيس اللجنة',
  };
  return names[signerRole] || null;
}

const ALLOWED_TRANSITIONS = {
  [MARRIAGE_STATUS.SUBMITTED]:              [MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW, MARRIAGE_STATUS.CANCELLED, MARRIAGE_STATUS.REJECTED],
  [MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW]: [MARRIAGE_STATUS.DATA_ENTERED, MARRIAGE_STATUS.REJECTED, MARRIAGE_STATUS.CANCELLED],
  [MARRIAGE_STATUS.DATA_ENTERED]:           [MARRIAGE_STATUS.AWAITING_SIGNATURES, MARRIAGE_STATUS.REJECTED],
  [MARRIAGE_STATUS.AWAITING_SIGNATURES]:    [MARRIAGE_STATUS.SIGNATURES_COMPLETE, MARRIAGE_STATUS.REJECTED],
  [MARRIAGE_STATUS.SIGNATURES_COMPLETE]:    [MARRIAGE_STATUS.APPROVED_BY_CHAIRMAN, MARRIAGE_STATUS.REJECTED],
  [MARRIAGE_STATUS.APPROVED_BY_CHAIRMAN]:   [MARRIAGE_STATUS.COMPLETED, MARRIAGE_STATUS.REJECTED],
  [MARRIAGE_STATUS.COMPLETED]:              [],
  [MARRIAGE_STATUS.REJECTED]:               [],
  [MARRIAGE_STATUS.CANCELLED]:              [],
};

// ─── settings ─────────────────────────────────────────────────────────────────

export async function getSettings() {
  const { rows } = await query('SELECT * FROM marriage_support_settings WHERE id = 1');
  if (rows.length === 0) {
    return {
      competition_discount_rate: 0.25,
      marriage_support_minimum: 10000,
      ananiyat_per_unit: 500,
      additional_support_multiplier: 1.5,
      enabled: true,
    };
  }
  return rows[0];
}

// ─── eligibility ──────────────────────────────────────────────────────────────

export async function checkEligibility(memberId) {
  const settings = await getSettings();
  if (!settings.enabled) {
    return {
      ok: false,
      code: 'MARRIAGE_SUPPORT_DISABLED',
      message: 'خدمة دعم الزواج غير متاحة حالياً',
      message_en: 'Marriage support service is currently disabled',
    };
  }
  const { rows } = await query(
    'SELECT id, full_name_ar, full_name, national_id, phone, current_balance FROM members WHERE id = $1',
    [memberId]
  );
  if (rows.length === 0) {
    return { ok: false, code: 'MEMBER_NOT_FOUND', message: 'العضو غير موجود', message_en: 'Member not found' };
  }
  const m = rows[0];
  if (!m.national_id) {
    return { ok: false, code: 'MISSING_NATIONAL_ID', message: 'رقم الهوية مطلوب في الملف الشخصي', message_en: 'National ID is required in your profile' };
  }
  return {
    ok: true,
    code: 'ELIGIBLE',
    message: 'يمكنك تقديم طلب دعم الزواج',
    message_en: 'You can submit a marriage support request',
    settings: {
      competition_discount_rate: Number(settings.competition_discount_rate),
      marriage_support_minimum: Number(settings.marriage_support_minimum),
      ananiyat_per_unit: Number(settings.ananiyat_per_unit),
      additional_support_multiplier: Number(settings.additional_support_multiplier),
    },
  };
}

// ─── validation ───────────────────────────────────────────────────────────────

export async function validateRequestPayload(payload) {
  const required = ['national_id', 'spouse_name_ar', 'marriage_date'];
  for (const f of required) {
    const v = payload[f];
    if (v === undefined || v === null || v === '') {
      return { code: 'MISSING_FIELD', message: `حقل مطلوب: ${f}`, message_en: `Missing required field: ${f}` };
    }
  }
  // Basic date sanity — must parse.
  const d = new Date(payload.marriage_date);
  if (isNaN(d.getTime())) {
    return { code: 'INVALID_DATE', message: 'تاريخ الزواج غير صالح', message_en: 'Invalid marriage date' };
  }
  return null;
}

// ─── creation ─────────────────────────────────────────────────────────────────

export async function createRequest({ memberId, payload }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const seq = await allocateSequence({
      tableName: 'marriage_support_requests',
      yearColumn: 'sequence_year',
      sequenceColumn: 'sequence_in_year',
      client,
    });

    const { rows: memberRows } = await client.query(
      'SELECT full_name_ar, full_name, national_id, date_of_birth FROM members WHERE id = $1',
      [memberId]
    );
    const m = memberRows[0] || {};
    const applicantName = (m.full_name_ar || m.full_name || '').trim();

    const insert = await client.query(
      `INSERT INTO marriage_support_requests (
         sequence_number, sequence_year, sequence_in_year,
         member_id,
         applicant_name, national_id, date_of_birth,
         spouse_name_ar, spouse_national_id, marriage_date,
         marriage_contract_url,
         status
       ) VALUES (
         $1, $2, $3,
         $4,
         $5, $6, $7,
         $8, $9, $10,
         $11,
         $12
       )
       RETURNING *`,
      [
        seq.formatted, seq.year, seq.sequenceInYear,
        memberId,
        applicantName, String(payload.national_id), m.date_of_birth || null,
        String(payload.spouse_name_ar), payload.spouse_national_id || null, payload.marriage_date,
        payload.marriage_contract_url || null,
        MARRIAGE_STATUS.SUBMITTED,
      ]
    );
    const created = insert.rows[0];

    await recordStatusChange({
      tableName: 'marriage_support_status_history',
      foreignKey: 'request_id',
      recordId: created.id,
      fromStatus: null,
      toStatus: MARRIAGE_STATUS.SUBMITTED,
      changedById: memberId,
      note: 'تم إنشاء الطلب',
      client,
    });

    await client.query('COMMIT');
    const notificationDelivery = await dispatchStatusNotification(created, MARRIAGE_STATUS.SUBMITTED);
    return { ...created, notification_delivery: notificationDelivery };
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('[marriageSupportService] createRequest rollback', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

// ─── transition ───────────────────────────────────────────────────────────────

const STATUS_NOTIFICATIONS = {
  [MARRIAGE_STATUS.SUBMITTED]: {
    title: 'تم استلام طلب دعم الزواج',
    body: (r) => `تم استلام طلب دعم الزواج رقم ${r.sequence_number} بنجاح، وستصلك تحديثات كل مرحلة من خلال التطبيق.`,
  },
  [MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW]: {
    title: 'جاري مراجعة طلب دعم الزواج',
    body: (r) => `تم استلام طلب دعم الزواج رقم ${r.sequence_number} وجاري مراجعته من اللجنة.`,
  },
  [MARRIAGE_STATUS.DATA_ENTERED]: {
    title: 'جاري احتساب مبلغ الدعم',
    body: (r) => `تم إدخال بيانات طلب دعم الزواج رقم ${r.sequence_number}. سيتم إعداد إقرار الدين قريباً.`,
  },
  [MARRIAGE_STATUS.AWAITING_SIGNATURES]: {
    title: 'يلزم التوقيع على إقرار الدين',
    body: (r) => `إقرار الدين لطلب دعم الزواج رقم ${r.sequence_number} جاهز للتوقيع.`,
  },
  [MARRIAGE_STATUS.SIGNATURES_COMPLETE]: {
    title: 'اكتملت التوقيعات',
    body: (r) => `اكتملت توقيعات إقرار الدين لطلب رقم ${r.sequence_number}. بانتظار اعتماد رئيس الصندوق.`,
  },
  [MARRIAGE_STATUS.APPROVED_BY_CHAIRMAN]: {
    title: 'اعتماد رئيس الصندوق',
    body: (r) => `تم اعتماد طلب دعم الزواج رقم ${r.sequence_number}. سيتم الصرف قريباً.`,
  },
  [MARRIAGE_STATUS.COMPLETED]: {
    title: 'تم صرف دعم الزواج',
    body: (r) => `تم صرف دعم الزواج رقم ${r.sequence_number} وتفعيل جدول الأقساط.`,
  },
  [MARRIAGE_STATUS.REJECTED]: {
    title: 'تم رفض طلب دعم الزواج',
    body: (r) => {
      const reason = r.rejection_reason ? ` السبب: ${r.rejection_reason}.` : '';
      return `تم رفض طلب دعم الزواج رقم ${r.sequence_number}.${reason} للاستفسار يرجى التواصل مع اللجنة.`;
    },
  },
};

export async function dispatchStatusNotification(request, toStatus) {
  const t = STATUS_NOTIFICATIONS[toStatus];
  if (!t) {return { success: true, skipped: true, inAppStored: false };}
  try {
    return await createMemberNotification(request.member_id, {
      title: t.title,
      body: typeof t.body === 'function' ? t.body(request) : t.body,
      type: 'marriage_support_status_update',
      relatedId: request.id,
      relatedType: 'marriage_support',
      actionUrl: '/requests',
      data: {
        type: 'marriage_support_status_update',
        request_id: String(request.id),
        sequence_number: String(request.sequence_number || ''),
        status: String(toStatus),
      },
    });
  } catch (err) {
    log.warn('[marriageSupportService] status notification failed (non-fatal)', {
      error: err.message,
      requestId: request.id,
      toStatus,
    });
    return { success: false, inAppStored: false, error: err.message };
  }
}

export async function transitionStatus({ requestId, toStatus, changedById, actorRole, note, extraUpdates = {} }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: cur } = await client.query(
      'SELECT id, status FROM marriage_support_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    if (cur.length === 0) {
      const e = new Error('Marriage support request not found');
      e.code = 'NOT_FOUND';
      throw e;
    }
    const fromStatus = cur[0].status;
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      const e = new Error(`Illegal transition ${fromStatus} → ${toStatus}`);
      e.code = 'ILLEGAL_TRANSITION';
      throw e;
    }

    const fields = ['status = $1'];
    const params = [toStatus];
    let p = 2;
    for (const [k, v] of Object.entries(extraUpdates)) {
      fields.push(`${k} = $${p++}`);
      params.push(v);
    }
    params.push(requestId);

    const { rows: updated } = await client.query(
      `UPDATE marriage_support_requests SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      params
    );

    await recordStatusChange({
      tableName: 'marriage_support_status_history',
      foreignKey: 'request_id',
      recordId: requestId,
      fromStatus,
      toStatus,
      changedById,
      actorRole,
      note,
      client,
    });

    await client.query('COMMIT');
    const notificationDelivery = await dispatchStatusNotification(updated[0], toStatus);
    return { ...updated[0], notification_delivery: notificationDelivery };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── ananiyat counter ────────────────────────────────────────────────────────

/**
 * Count past payments this member made to marriage_support initiatives.
 * Returns a non-negative integer. Uses payments.beneficiary_id /
 * payer_id / member_id with a left-join on initiatives where type='marriage_support'.
 *
 * If payments table doesn't have any of those linking columns, returns 0.
 * Treat as best-effort — committee chair has the override field if needed.
 */
export async function countPreviousAnaniyat(memberId) {
  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS n
         FROM payments p
         JOIN initiatives i
           ON i.id::text = COALESCE(p.activity_id::text, p.initiative_id::text, '')
        WHERE i.type = 'marriage_support'
          AND (p.payer_id = $1 OR p.beneficiary_id = $1 OR p.member_id = $1)`,
      [memberId]
    );
    return Number(rows[0]?.n || 0);
  } catch (err) {
    log.warn('[marriageSupportService] countPreviousAnaniyat failed (returning 0)', { error: err.message, memberId });
    return 0;
  }
}

// ─── calculation engine ─────────────────────────────────────────────────────

/**
 * Compute the four amounts and persist them along with a snapshot of the
 * settings used. Inputs are entered by the committee chair after activating
 * the linked initiative.
 *
 * Formula:
 *   initial_total       = contributions_sum + (previous_ananiyat_count × ananiyat_per_unit)
 *   after_discount      = initial_total × (1 - competition_discount_rate)
 *   competitive_balance = max(after_discount, marriage_support_minimum)
 *   final_amount        = competitive_balance + (additional_support_balance × multiplier) + special_ananiya_value
 *
 * All four outputs are stored rounded to 2 decimal places (NUMERIC(12,2)).
 * Caller transitions the request to data_entered after this returns.
 *
 * @param {Object} params
 * @param {string} params.requestId
 * @param {number} params.contributionsSum            - from linked initiative
 * @param {number} [params.previousAnaniyatOverride]  - manual override (committee chair)
 * @param {number} [params.additionalSupportBalance]  - default 0
 * @param {number} [params.specialAnaniyaValue]       - default 0
 */
export async function calculateAndSnapshot({
  requestId,
  contributionsSum,
  previousAnaniyatOverride = null,
  additionalSupportBalance = 0,
  specialAnaniyaValue = 0,
}) {
  const settings = await getSettings();

  // Signing inputs are mutable only during committee review. The UPDATE below
  // repeats this predicate to close the race between this read and the write.
  const { rows: rRows } = await query(
    'SELECT member_id, status FROM marriage_support_requests WHERE id = $1',
    [requestId]
  );
  if (rRows.length === 0) {
    throw serviceError('Marriage support request not found', 'NOT_FOUND');
  }
  if (rRows[0].status !== MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW) {
    throw serviceError(
      'Marriage support calculation can only be changed during committee review',
      'INVALID_STATE'
    );
  }
  const memberId = rRows[0].member_id;
  const autoCount = await countPreviousAnaniyat(memberId);
  const effectiveCount = previousAnaniyatOverride !== null && previousAnaniyatOverride !== undefined
    ? Number(previousAnaniyatOverride)
    : autoCount;

  const cs = Number(contributionsSum) || 0;
  const asb = Number(additionalSupportBalance) || 0;
  const sav = Number(specialAnaniyaValue) || 0;
  const discount = Number(settings.competition_discount_rate);
  const minimum = Number(settings.marriage_support_minimum);
  const perUnit = Number(settings.ananiyat_per_unit);
  const multiplier = Number(settings.additional_support_multiplier);

  const initialTotal       = cs + (effectiveCount * perUnit);
  const afterDiscount      = initialTotal * (1 - discount);
  const competitiveBalance = Math.max(afterDiscount, minimum);
  const finalAmount        = competitiveBalance + (asb * multiplier) + sav;

  const round2 = (n) => Math.round(n * 100) / 100;

  const { rows: updated } = await query(
    `UPDATE marriage_support_requests SET
       contributions_sum                = $1,
       previous_ananiyat_count_auto     = $2,
       previous_ananiyat_count_override = $3,
       additional_support_balance       = $4,
       special_ananiya_value            = $5,
       snapshot_competition_discount_rate    = $6,
       snapshot_marriage_support_minimum     = $7,
       snapshot_ananiyat_per_unit            = $8,
       snapshot_additional_support_multiplier = $9,
       initial_total       = $10,
       after_discount      = $11,
       competitive_balance = $12,
       final_amount        = $13,
       calculated_at       = NOW()
     WHERE id = $14 AND status = $15
     RETURNING *`,
    [
      round2(cs),
      autoCount,
      previousAnaniyatOverride !== null && previousAnaniyatOverride !== undefined ? Number(previousAnaniyatOverride) : null,
      round2(asb),
      round2(sav),
      discount, minimum, perUnit, multiplier,
      round2(initialTotal),
      round2(afterDiscount),
      round2(competitiveBalance),
      round2(finalAmount),
      requestId,
      MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW,
    ]
  );
  if (updated.length === 0) {
    throw serviceError(
      'Marriage support request left committee review before the calculation was saved',
      'INVALID_STATE'
    );
  }
  return updated[0];
}

function executeWith(executor, sql, params) {
  if (typeof executor === 'function') {return executor(sql, params);}
  return executor.query(sql, params);
}

async function loadWitnessMembers(witnessIds, executor = query) {
  const uniqueIds = [...new Set(witnessIds.filter(Boolean).map(String))];
  if (uniqueIds.length === 0) {return new Map();}
  const { rows } = await executeWith(
    executor,
    `SELECT id, full_name_ar, full_name
       FROM members
      WHERE id = ANY($1::uuid[])`,
    [uniqueIds]
  );
  return new Map(rows.map((member) => [String(member.id), member]));
}

/** Validate the two witness assignments immediately before signing opens. */
export async function validateWitnessAssignments(request, executor = query) {
  const witness1Id = request?.witness_1_id;
  const witness2Id = request?.witness_2_id;
  if (!witness1Id || !witness2Id) {
    throw serviceError('Two witnesses must be selected before signatures open', 'WITNESSES_REQUIRED');
  }
  if (idsMatch(witness1Id, witness2Id)) {
    throw serviceError('The two witnesses must be different members', 'WITNESSES_MUST_BE_DISTINCT');
  }
  if (idsMatch(witness1Id, request.member_id) || idsMatch(witness2Id, request.member_id)) {
    throw serviceError('The beneficiary cannot be selected as a witness', 'WITNESS_CANNOT_BE_BENEFICIARY');
  }

  const members = await loadWitnessMembers([witness1Id, witness2Id], executor);
  if (!members.has(String(witness1Id)) || !members.has(String(witness2Id))) {
    throw serviceError('One or more selected witnesses do not exist', 'WITNESS_NOT_FOUND');
  }
  return {
    witness1: members.get(String(witness1Id)),
    witness2: members.get(String(witness2Id)),
  };
}

/**
 * Persist witness selections while the request is under committee review.
 * Names are resolved from members server-side and cannot be supplied by the
 * caller. A row lock prevents concurrent selection changes.
 */
export async function updateWitnessAssignments({ requestId, witness1Id, witness2Id }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, status, member_id, witness_1_id, witness_2_id,
              witness_1_name, witness_2_name
         FROM marriage_support_requests
        WHERE id = $1
        FOR UPDATE`,
      [requestId]
    );
    if (rows.length === 0) {
      throw serviceError('Marriage support request not found', 'NOT_FOUND');
    }
    const request = rows[0];
    if (request.status !== MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW) {
      throw serviceError('Witnesses can only be changed during committee review', 'INVALID_STATE');
    }

    const nextWitness1Id = witness1Id || request.witness_1_id || null;
    const nextWitness2Id = witness2Id || request.witness_2_id || null;
    if (nextWitness1Id && nextWitness2Id && idsMatch(nextWitness1Id, nextWitness2Id)) {
      throw serviceError('The two witnesses must be different members', 'WITNESSES_MUST_BE_DISTINCT');
    }
    if (idsMatch(nextWitness1Id, request.member_id) || idsMatch(nextWitness2Id, request.member_id)) {
      throw serviceError('The beneficiary cannot be selected as a witness', 'WITNESS_CANNOT_BE_BENEFICIARY');
    }

    const members = await loadWitnessMembers([nextWitness1Id, nextWitness2Id], client);
    for (const witnessId of [nextWitness1Id, nextWitness2Id].filter(Boolean)) {
      if (!members.has(String(witnessId))) {
        throw serviceError('One or more selected witnesses do not exist', 'WITNESS_NOT_FOUND');
      }
    }
    const witness1 = nextWitness1Id ? members.get(String(nextWitness1Id)) : null;
    const witness2 = nextWitness2Id ? members.get(String(nextWitness2Id)) : null;

    const { rows: updated } = await client.query(
      `UPDATE marriage_support_requests
          SET witness_1_id = $1,
              witness_1_name = $2,
              witness_2_id = $3,
              witness_2_name = $4
        WHERE id = $5 AND status = $6
        RETURNING *`,
      [
        nextWitness1Id,
        witness1 ? (witness1.full_name_ar || witness1.full_name || '') : null,
        nextWitness2Id,
        witness2 ? (witness2.full_name_ar || witness2.full_name || '') : null,
        requestId,
        MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW,
      ]
    );
    if (updated.length === 0) {
      throw serviceError('Witness assignments are no longer editable', 'INVALID_STATE');
    }
    await client.query('COMMIT');
    return updated[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─── canonical hash ─────────────────────────────────────────────────────────

/**
 * Produce a SHA256 hex digest of the request's canonical signing data. This
 * is what gets stamped onto the request when status moves to
 * awaiting_signatures, and what each signature row stores so we can later
 * detect tampering.
 */
export function generateRequestHash(request) {
  const canonical = {
    id: String(request.id),
    sequence_number: String(request.sequence_number || ''),
    member_id: String(request.member_id),
    applicant_name: String(request.applicant_name || ''),
    national_id: String(request.national_id || ''),
    spouse_name_ar: String(request.spouse_name_ar || ''),
    spouse_national_id: String(request.spouse_national_id || ''),
    marriage_date: request.marriage_date ? String(request.marriage_date).slice(0, 10) : '',
    contributions_sum: request.contributions_sum != null ? Number(request.contributions_sum).toFixed(2) : '',
    previous_ananiyat_count: request.previous_ananiyat_count_override != null
      ? Number(request.previous_ananiyat_count_override)
      : (request.previous_ananiyat_count_auto != null ? Number(request.previous_ananiyat_count_auto) : 0),
    additional_support_balance: request.additional_support_balance != null ? Number(request.additional_support_balance).toFixed(2) : '0.00',
    special_ananiya_value: request.special_ananiya_value != null ? Number(request.special_ananiya_value).toFixed(2) : '0.00',
    final_amount: request.final_amount != null ? Number(request.final_amount).toFixed(2) : '',
    witness_1_id: request.witness_1_id || '',
    witness_2_id: request.witness_2_id || '',
  };
  // Stable JSON: keys are ordered above.
  const json = JSON.stringify(canonical);
  return crypto.createHash('sha256').update(json).digest('hex');
}

// ─── signatures ─────────────────────────────────────────────────────────────

/**
 * Determine which signer role is next, given the signatures already on file.
 * Returns null when all four are signed.
 */
export function nextExpectedSigner(existingSignerRoles) {
  for (const r of SIGNATURE_ORDER) {
    if (!existingSignerRoles.includes(r)) {return r;}
  }
  return null;
}

function normalizedSignerRoles(signatures) {
  return (Array.isArray(signatures) ? signatures : [])
    .map((signature) => typeof signature === 'string' ? signature : signature?.signer_role)
    .filter((role) => SIGNATURE_ORDER.includes(role));
}

/** Attach the participant-specific fields consumed by the shipped iOS app. */
export function decorateRequestForParticipant(request, memberId, signatures = request?.signed_roles || []) {
  const signedRoles = normalizedSignerRoles(signatures);
  const participantRole = deriveParticipantRole(request, memberId);
  const nextSignerRole = nextExpectedSigner(signedRoles);
  const publicRequest = { ...request };
  delete publicRequest.signed_roles;
  return {
    ...publicRequest,
    participant_role: participantRole,
    next_signer_role: nextSignerRole,
    can_current_user_sign: Boolean(
      participantRole &&
      request.status === MARRIAGE_STATUS.AWAITING_SIGNATURES &&
      participantRole === nextSignerRole
    ),
    signature_summary: {
      signed_count: new Set(signedRoles).size,
      total_count: SIGNATURE_ORDER.length,
      next_signer_role: nextSignerRole,
      next_signer_name: nextSignerRole ? signerNameForRole(request, nextSignerRole) : null,
    },
  };
}

export async function listParticipantRequests(memberId) {
  const { rows } = await query(
    `SELECT mr.id, mr.sequence_number, mr.status, mr.spouse_name_ar,
            mr.marriage_date, mr.final_amount, mr.created_at, mr.updated_at,
            mr.rejection_reason, mr.member_id, mr.applicant_name,
            mr.witness_1_id, mr.witness_2_id,
            mr.witness_1_name, mr.witness_2_name, mr.committee_chair_id,
            ARRAY(
              SELECT ms.signer_role
                FROM marriage_support_signatures ms
               WHERE ms.request_id = mr.id
               ORDER BY ms.signed_at ASC
            ) AS signed_roles
       FROM marriage_support_requests mr
      WHERE mr.member_id = $1
         OR mr.witness_1_id = $1
         OR mr.witness_2_id = $1
         OR mr.committee_chair_id = $1
      ORDER BY mr.created_at DESC`,
    [memberId]
  );
  return rows.map((request) => decorateRequestForParticipant(request, memberId));
}

export async function getParticipantRequest({ requestId, memberId }) {
  const { rows } = await query(
    `SELECT *
       FROM marriage_support_requests
      WHERE id = $1
        AND (member_id = $2 OR witness_1_id = $2 OR witness_2_id = $2 OR committee_chair_id = $2)`,
    [requestId, memberId]
  );
  if (rows.length === 0) {return null;}
  const request = rows[0];
  const { rows: signatures } = await query(
    `SELECT id, signer_role, signer_member_id, signer_name, signed_at,
            ip_address, signature_method
       FROM marriage_support_signatures
      WHERE request_id = $1
      ORDER BY signed_at ASC`,
    [requestId]
  );
  return decorateRequestForParticipant({ ...request, signatures }, memberId, signatures);
}

function reminderCacheKey(requestId, signerRole, memberId) {
  return `${requestId}:${signerRole}:${memberId}`;
}

async function findRecentSignatureReminder({ requestId, memberId, cooldownSeconds }) {
  const richSql = `
    SELECT created_at
      FROM notifications
     WHERE related_id = $1
       AND type = 'marriage_support_signature_reminder'
       AND (member_id = $2 OR user_id = $2)
       AND created_at >= NOW() - ($3 * INTERVAL '1 second')
     ORDER BY created_at DESC
     LIMIT 1`;
  try {
    const { rows } = await query(richSql, [requestId, memberId, cooldownSeconds]);
    return rows[0]?.created_at || null;
  } catch (_richSchemaError) {
    // Older rolling-deployment schemas only expose user_id.
    try {
      const { rows } = await query(
        `SELECT created_at
           FROM notifications
          WHERE related_id = $1
            AND type = 'marriage_support_signature_reminder'
            AND user_id = $2
            AND created_at >= NOW() - ($3 * INTERVAL '1 second')
          ORDER BY created_at DESC
          LIMIT 1`,
        [requestId, memberId, cooldownSeconds]
      );
      return rows[0]?.created_at || null;
    } catch (error) {
      log.warn('[marriageSupportService] reminder cooldown lookup unavailable', {
        requestId,
        error: error.message,
      });
      return null;
    }
  }
}

function signatureReminderCopy(request, signerRole) {
  const sequence = request.sequence_number || request.id;
  if (signerRole === SIGNER_ROLE.BENEFICIARY) {
    return {
      title: 'توقيع إقرار دعم الزواج',
      body: `طلب دعم الزواج رقم ${sequence} بانتظار توقيعك على الإقرار.`,
    };
  }
  if (signerRole === SIGNER_ROLE.COMMITTEE_CHAIR) {
    return {
      title: 'إقرار دعم الزواج جاهز لاعتماد اللجنة',
      body: `اكتملت توقيعات المستفيد والشاهدين للطلب رقم ${sequence}، والإقرار بانتظار توقيعك.`,
    };
  }
  return {
    title: 'مطلوب توقيع شاهد على إقرار دعم الزواج',
    body: `تم اختيارك شاهداً للطلب رقم ${sequence}. يرجى مراجعة الإقرار وتوقيعه من التطبيق.`,
  };
}

async function notifyNextSignerInternal({
  requestId,
  requestedById = null,
  cooldownSeconds = SIGNATURE_REMINDER_COOLDOWN_SECONDS,
}) {
  const { rows } = await query(
    'SELECT * FROM marriage_support_requests WHERE id = $1',
    [requestId]
  );
  if (rows.length === 0) {
    throw serviceError('Marriage support request not found', 'NOT_FOUND');
  }
  const request = rows[0];
  if (request.status !== MARRIAGE_STATUS.AWAITING_SIGNATURES) {
    throw serviceError('The request is not awaiting signatures', 'INVALID_STATE');
  }
  const { rows: signatures } = await query(
    `SELECT signer_role
       FROM marriage_support_signatures
      WHERE request_id = $1
      ORDER BY signed_at ASC`,
    [requestId]
  );
  const nextSignerRole = nextExpectedSigner(normalizedSignerRoles(signatures));
  if (!nextSignerRole) {
    throw serviceError('All required signatures are already complete', 'NO_NEXT_SIGNER');
  }
  const nextSignerId = signerMemberIdForRole(request, nextSignerRole);
  const nextSignerName = signerNameForRole(request, nextSignerRole);
  if (!nextSignerId) {
    throw serviceError(`No member is assigned to ${nextSignerRole}`, 'NEXT_SIGNER_UNASSIGNED');
  }

  const cacheKey = reminderCacheKey(requestId, nextSignerRole, nextSignerId);
  const now = Date.now();
  const cachedAt = signatureReminderCache.get(cacheKey);
  if (cachedAt && now - cachedAt < cooldownSeconds * 1000) {
    return {
      notified: false,
      cooldown_active: true,
      retry_after_seconds: Math.max(1, Math.ceil(cooldownSeconds - ((now - cachedAt) / 1000))),
      next_signer_role: nextSignerRole,
      next_signer_name: nextSignerName,
    };
  }

  const recentAt = await findRecentSignatureReminder({ requestId, memberId: nextSignerId, cooldownSeconds });
  if (recentAt) {
    const timestamp = new Date(recentAt).getTime();
    signatureReminderCache.set(cacheKey, Number.isFinite(timestamp) ? timestamp : now);
    return {
      notified: false,
      cooldown_active: true,
      retry_after_seconds: cooldownSeconds,
      next_signer_role: nextSignerRole,
      next_signer_name: nextSignerName,
    };
  }

  const copy = signatureReminderCopy(request, nextSignerRole);
  const delivery = await createMemberNotification(nextSignerId, {
    title: copy.title,
    body: copy.body,
    type: 'marriage_support_signature_reminder',
    priority: 'high',
    relatedId: request.id,
    relatedType: 'marriage_support',
    actionUrl: '/requests',
    data: {
      request_id: String(request.id),
      sequence_number: String(request.sequence_number || ''),
      signer_role: nextSignerRole,
      requested_by_id: requestedById ? String(requestedById) : '',
    },
  });
  if (delivery?.success || delivery?.inAppStored) {
    signatureReminderCache.set(cacheKey, now);
  }
  return {
    notified: Boolean(delivery?.success || delivery?.inAppStored),
    cooldown_active: false,
    next_signer_role: nextSignerRole,
    next_signer_name: nextSignerName,
    notification_delivery: delivery,
  };
}

/** Notify the currently expected signer, with process and database cooldowns. */
export async function notifyNextSigner(options) {
  const lockKey = String(options.requestId);
  const existing = signatureReminderInFlight.get(lockKey);
  if (existing) {
    await existing.catch(() => {});
  }
  const task = notifyNextSignerInternal(options);
  signatureReminderInFlight.set(lockKey, task);
  try {
    return await task;
  } finally {
    if (signatureReminderInFlight.get(lockKey) === task) {
      signatureReminderInFlight.delete(lockKey);
    }
  }
}

/**
 * Record a signature. Validates:
 *   • request is in awaiting_signatures status
 *   • signer is the next expected role in SIGNATURE_ORDER
 *   • data_hash matches the request's stamped pdf_data_hash
 * On the 4th signature, automatically transitions the request to
 * signatures_complete and dispatches the corresponding push notification.
 */
export async function recordSignature({ requestId, signerRole = null, signerMemberId, signerName, ipAddress, userAgent }) {
  const client = await getClient();
  let transactionResult;
  let completedRequest = null;
  try {
    await client.query('BEGIN');

    const { rows: rrows } = await client.query(
      'SELECT * FROM marriage_support_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    if (rrows.length === 0) {
      throw serviceError('Marriage support request not found', 'NOT_FOUND');
    }
    const request = rrows[0];

    const resolvedSignerRole = signerRole || deriveParticipantRole(request, signerMemberId);
    if (!resolvedSignerRole || !SIGNATURE_ORDER.includes(resolvedSignerRole)) {
      throw serviceError('The authenticated user is not a signer on this request', 'PARTICIPANT_FORBIDDEN');
    }
    const assignedMemberId = signerMemberIdForRole(request, resolvedSignerRole);
    if (!assignedMemberId || !idsMatch(assignedMemberId, signerMemberId)) {
      throw serviceError('The authenticated user is not assigned to this signer role', 'SIGNER_MISMATCH');
    }

    const { rows: sigs } = await client.query(
      `SELECT signer_role, signer_member_id
         FROM marriage_support_signatures
        WHERE request_id = $1
        ORDER BY signed_at ASC`,
      [requestId]
    );
    const haveRoles = normalizedSignerRoles(sigs);
    const existingSignature = sigs.find((signature) => signature.signer_role === resolvedSignerRole);
    if (existingSignature) {
      if (!idsMatch(existingSignature.signer_member_id, signerMemberId)) {
        throw serviceError('This signer role was recorded for a different member', 'SIGNER_MISMATCH');
      }
      const allDone = SIGNATURE_ORDER.every((role) => haveRoles.includes(role));
      if (allDone && request.status === MARRIAGE_STATUS.AWAITING_SIGNATURES) {
        const { rows: completedRows } = await client.query(
          `UPDATE marriage_support_requests
              SET status = $1
            WHERE id = $2 AND status = $3
            RETURNING *`,
          [MARRIAGE_STATUS.SIGNATURES_COMPLETE, requestId, MARRIAGE_STATUS.AWAITING_SIGNATURES]
        );
        if (completedRows.length === 0) {
          throw serviceError('Request status changed while completing signatures', 'INVALID_STATE');
        }
        completedRequest = completedRows[0];
        await recordStatusChange({
          tableName: 'marriage_support_status_history',
          foreignKey: 'request_id',
          recordId: requestId,
          fromStatus: MARRIAGE_STATUS.AWAITING_SIGNATURES,
          toStatus: MARRIAGE_STATUS.SIGNATURES_COMPLETE,
          changedById: signerMemberId,
          actorRole: resolvedSignerRole,
          note: 'اكتملت كل التوقيعات',
          client,
        });
      }
      await client.query('COMMIT');
      transactionResult = {
        ok: true,
        alreadySigned: true,
        allDone,
        signerRole: resolvedSignerRole,
        signer_role: resolvedSignerRole,
        nextSigner: allDone ? null : nextExpectedSigner(haveRoles),
        next_signer_role: allDone ? null : nextExpectedSigner(haveRoles),
      };
    } else {
      if (request.status !== MARRIAGE_STATUS.AWAITING_SIGNATURES) {
        throw serviceError(
          `Request status is ${request.status}, signatures only accepted in awaiting_signatures`,
          'INVALID_STATE'
        );
      }

      if (!request.pdf_data_hash) {
        throw serviceError('Request has no stamped data hash; PDF not generated', 'NO_HASH');
      }

      const next = nextExpectedSigner(haveRoles);
      if (next !== resolvedSignerRole) {
        throw serviceError(`Expected ${next} to sign next, got ${resolvedSignerRole}`, 'OUT_OF_ORDER');
      }

      const currentHash = generateRequestHash(request);
      if (currentHash !== request.pdf_data_hash) {
        throw serviceError('Request data has changed since PDF was generated; re-issue required', 'HASH_MISMATCH');
      }

      await client.query(
        `INSERT INTO marriage_support_signatures (
           request_id, signer_role, signer_member_id, signer_name,
           ip_address, user_agent, data_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          requestId,
          resolvedSignerRole,
          signerMemberId,
          signerNameForRole(request, resolvedSignerRole) || signerName || '',
          ipAddress || null,
          userAgent || null,
          currentHash,
        ]
      );

      const allRolesNow = [...haveRoles, resolvedSignerRole];
      const allDone = SIGNATURE_ORDER.every((role) => allRolesNow.includes(role));
      if (allDone) {
        const { rows: completedRows } = await client.query(
          `UPDATE marriage_support_requests
              SET status = $1
            WHERE id = $2 AND status = $3
            RETURNING *`,
          [MARRIAGE_STATUS.SIGNATURES_COMPLETE, requestId, MARRIAGE_STATUS.AWAITING_SIGNATURES]
        );
        if (completedRows.length === 0) {
          throw serviceError('Request status changed while completing signatures', 'INVALID_STATE');
        }
        completedRequest = completedRows[0];
        await recordStatusChange({
          tableName: 'marriage_support_status_history',
          foreignKey: 'request_id',
          recordId: requestId,
          fromStatus: MARRIAGE_STATUS.AWAITING_SIGNATURES,
          toStatus: MARRIAGE_STATUS.SIGNATURES_COMPLETE,
          changedById: signerMemberId,
          actorRole: resolvedSignerRole,
          note: 'اكتملت كل التوقيعات',
          client,
        });
      }

      await client.query('COMMIT');
      transactionResult = {
        ok: true,
        alreadySigned: false,
        allDone,
        signerRole: resolvedSignerRole,
        signer_role: resolvedSignerRole,
        nextSigner: allDone ? null : nextExpectedSigner(allRolesNow),
        next_signer_role: allDone ? null : nextExpectedSigner(allRolesNow),
      };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (completedRequest) {
    transactionResult.notification_delivery = await dispatchStatusNotification(
      completedRequest,
      MARRIAGE_STATUS.SIGNATURES_COMPLETE
    );
  } else if (!transactionResult.alreadySigned && transactionResult.next_signer_role) {
    try {
      transactionResult.next_signer_notification = await notifyNextSigner({ requestId });
    } catch (error) {
      log.warn('[marriageSupportService] next-signer notification failed (non-fatal)', {
        requestId,
        error: error.message,
      });
      transactionResult.next_signer_notification = { notified: false, error: error.message };
    }
  }
  return transactionResult;
}

// ─── PDF stub ───────────────────────────────────────────────────────────────

/**
 * Stamp the request as ready for signing — generate the canonical hash and
 * (placeholder) PDF URL, then transition to awaiting_signatures.
 *
 * The actual PDF rendering is deferred — this records the hash and a
 * placeholder URL so the workflow proceeds. Hook real pdfkit-Arabic rendering
 * here when the template is finalised.
 */
export async function generatePdfAndStamp({ requestId, changedById, actorRole }) {
  const client = await getClient();
  let updatedRequest;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM marriage_support_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    if (rows.length === 0) {
      throw serviceError('Marriage support request not found', 'NOT_FOUND');
    }
    const request = rows[0];
    if (request.status !== MARRIAGE_STATUS.DATA_ENTERED) {
      throw serviceError(
        `Illegal transition ${request.status} → ${MARRIAGE_STATUS.AWAITING_SIGNATURES}`,
        'ILLEGAL_TRANSITION'
      );
    }
    await validateWitnessAssignments(request, client);

    const hash = generateRequestHash(request);
    const pdfUrl = `/api/marriage-support/${requestId}/pdf`;
    const { rows: updated } = await client.query(
      `UPDATE marriage_support_requests
          SET status = $1,
              pdf_data_hash = $2,
              pdf_url = $3,
              pdf_generated_at = $4
        WHERE id = $5 AND status = $6
        RETURNING *`,
      [
        MARRIAGE_STATUS.AWAITING_SIGNATURES,
        hash,
        pdfUrl,
        new Date(),
        requestId,
        MARRIAGE_STATUS.DATA_ENTERED,
      ]
    );
    if (updated.length === 0) {
      throw serviceError('Request status changed while opening signatures', 'INVALID_STATE');
    }
    updatedRequest = updated[0];
    await recordStatusChange({
      tableName: 'marriage_support_status_history',
      foreignKey: 'request_id',
      recordId: requestId,
      fromStatus: MARRIAGE_STATUS.DATA_ENTERED,
      toStatus: MARRIAGE_STATUS.AWAITING_SIGNATURES,
      changedById,
      actorRole,
      note: 'تم إعداد إقرار الدين وفتح باب التوقيع',
      client,
    });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const notificationDelivery = await dispatchStatusNotification(
    updatedRequest,
    MARRIAGE_STATUS.AWAITING_SIGNATURES
  );
  return { ...updatedRequest, notification_delivery: notificationDelivery };
}

export default {
  MARRIAGE_STATUS,
  SIGNER_ROLE,
  SIGNATURE_ORDER,
  SIGNATURE_REMINDER_COOLDOWN_SECONDS,
  getSettings,
  checkEligibility,
  validateRequestPayload,
  createRequest,
  transitionStatus,
  countPreviousAnaniyat,
  calculateAndSnapshot,
  validateWitnessAssignments,
  updateWitnessAssignments,
  generateRequestHash,
  nextExpectedSigner,
  deriveParticipantRole,
  decorateRequestForParticipant,
  listParticipantRequests,
  getParticipantRequest,
  recordSignature,
  notifyNextSigner,
  generatePdfAndStamp,
  dispatchStatusNotification,
};
