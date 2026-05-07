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
import { sendPushNotification } from './notificationService.js';

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
    return created;
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
    body: (r) => `تم صرف دعم الزواج رقم ${r.sequence_number} بنجاح.`,
  },
  [MARRIAGE_STATUS.REJECTED]: {
    title: 'تم رفض طلب دعم الزواج',
    body: (r) => {
      const reason = r.rejection_reason ? ` السبب: ${r.rejection_reason}.` : '';
      return `تم رفض طلب دعم الزواج رقم ${r.sequence_number}.${reason} للاستفسار يرجى التواصل مع اللجنة.`;
    },
  },
};

async function dispatchStatusNotification(request, toStatus) {
  const t = STATUS_NOTIFICATIONS[toStatus];
  if (!t) {return;}
  try {
    await sendPushNotification(
      request.member_id,
      { title: t.title, body: typeof t.body === 'function' ? t.body(request) : t.body },
      {
        type: 'marriage_support_status_update',
        request_id: String(request.id),
        sequence_number: String(request.sequence_number || ''),
        status: String(toStatus),
      }
    );
  } catch (err) {
    log.warn('[marriageSupportService] status notification failed (non-fatal)', {
      error: err.message,
      requestId: request.id,
      toStatus,
    });
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
    await dispatchStatusNotification(updated[0], toStatus);
    return updated[0];
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

  // Auto-count previous ananiyat for this member (lookup via the request).
  const { rows: rRows } = await query('SELECT member_id FROM marriage_support_requests WHERE id = $1', [requestId]);
  if (rRows.length === 0) {
    const e = new Error('Marriage support request not found');
    e.code = 'NOT_FOUND';
    throw e;
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
     WHERE id = $14
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
    ]
  );
  return updated[0];
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

/**
 * Record a signature. Validates:
 *   • request is in awaiting_signatures status
 *   • signer is the next expected role in SIGNATURE_ORDER
 *   • data_hash matches the request's stamped pdf_data_hash
 * On the 4th signature, automatically transitions the request to
 * signatures_complete and dispatches the corresponding push notification.
 */
export async function recordSignature({ requestId, signerRole, signerMemberId, signerName, ipAddress, userAgent }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: rrows } = await client.query(
      'SELECT * FROM marriage_support_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    if (rrows.length === 0) {
      const e = new Error('Marriage support request not found');
      e.code = 'NOT_FOUND';
      throw e;
    }
    const request = rrows[0];

    if (request.status !== MARRIAGE_STATUS.AWAITING_SIGNATURES) {
      const e = new Error(`Request status is ${request.status}, signatures only accepted in awaiting_signatures`);
      e.code = 'INVALID_STATE';
      throw e;
    }

    if (!request.pdf_data_hash) {
      const e = new Error('Request has no stamped data hash; PDF not generated');
      e.code = 'NO_HASH';
      throw e;
    }

    // Check ordering.
    const { rows: sigs } = await client.query(
      'SELECT signer_role FROM marriage_support_signatures WHERE request_id = $1 ORDER BY signed_at ASC',
      [requestId]
    );
    const haveRoles = sigs.map((s) => s.signer_role);
    const next = nextExpectedSigner(haveRoles);
    if (next !== signerRole) {
      const e = new Error(`Expected ${next} to sign next, got ${signerRole}`);
      e.code = 'OUT_OF_ORDER';
      throw e;
    }

    // Re-derive hash from current request — must match stamp.
    const currentHash = generateRequestHash(request);
    if (currentHash !== request.pdf_data_hash) {
      const e = new Error('Request data has changed since PDF was generated; re-issue required');
      e.code = 'HASH_MISMATCH';
      throw e;
    }

    await client.query(
      `INSERT INTO marriage_support_signatures (
         request_id, signer_role, signer_member_id, signer_name,
         ip_address, user_agent, data_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [requestId, signerRole, signerMemberId, signerName || '', ipAddress || null, userAgent || null, currentHash]
    );

    // If this was the 4th signature, transition to signatures_complete.
    const allRolesNow = [...haveRoles, signerRole];
    const allDone = SIGNATURE_ORDER.every((r) => allRolesNow.includes(r));

    await client.query('COMMIT');

    if (allDone) {
      await transitionStatus({
        requestId,
        toStatus: MARRIAGE_STATUS.SIGNATURES_COMPLETE,
        changedById: signerMemberId,
        actorRole: signerRole,
        note: 'اكتملت كل التوقيعات',
      });
    }

    return { ok: true, allDone, nextSigner: allDone ? null : nextExpectedSigner(allRolesNow) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
  const { rows } = await query('SELECT * FROM marriage_support_requests WHERE id = $1', [requestId]);
  if (rows.length === 0) {
    const e = new Error('Marriage support request not found');
    e.code = 'NOT_FOUND';
    throw e;
  }
  const request = rows[0];
  const hash = generateRequestHash(request);
  // Placeholder URL — replace with real document storage path when PDF
  // generation is wired up.
  const pdfUrl = `/api/marriage-support/${requestId}/pdf`;

  return transitionStatus({
    requestId,
    toStatus: MARRIAGE_STATUS.AWAITING_SIGNATURES,
    changedById,
    actorRole,
    note: 'تم إعداد إقرار الدين وفتح باب التوقيع',
    extraUpdates: {
      pdf_data_hash: hash,
      pdf_url: pdfUrl,
      pdf_generated_at: new Date(),
    },
  });
}

export default {
  MARRIAGE_STATUS,
  SIGNER_ROLE,
  SIGNATURE_ORDER,
  getSettings,
  checkEligibility,
  validateRequestPayload,
  createRequest,
  transitionStatus,
  countPreviousAnaniyat,
  calculateAndSnapshot,
  generateRequestHash,
  nextExpectedSigner,
  recordSignature,
  generatePdfAndStamp,
};
