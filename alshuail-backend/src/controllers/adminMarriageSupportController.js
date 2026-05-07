/**
 * Admin Marriage Support Controller
 *
 * Two audiences in one controller:
 *
 *   1. Committee chair  (marriage_committee_chair) — reviews, enters
 *      financial inputs, runs calculation, selects witnesses, generates
 *      PDF, signs (committee_chair role), and may reject.
 *
 *   2. Fund chairman  (super_admin) — final approval after the four
 *      signatures, then records disbursement.
 */

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import {
  MARRIAGE_STATUS,
  SIGNER_ROLE,
  transitionStatus,
  calculateAndSnapshot,
  generatePdfAndStamp,
  recordSignature,
} from '../services/marriageSupportService.js';
import { getStatusHistory } from '../services/statusHistoryService.js';

// ─── role helpers ─────────────────────────────────────────────────────────────

function isCommitteeChair(user) {
  return user && (user.role === 'marriage_committee_chair' || user.role === 'super_admin');
}
function isChairman(user) {
  return user && user.role === 'super_admin'; // for v1, super_admin is the chairman
}

async function fetchSignatures(requestId) {
  const { rows } = await query(
    `SELECT id, signer_role, signer_member_id, signer_name, signed_at, ip_address
     FROM marriage_support_signatures
     WHERE request_id = $1 ORDER BY signed_at ASC`,
    [requestId]
  );
  return rows;
}

function handleTransitionError(res, err) {
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
  }
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({ success: false, code: 'ILLEGAL_TRANSITION', error: err.message });
  }
  if (err.code === 'OUT_OF_ORDER' || err.code === 'INVALID_STATE' || err.code === 'HASH_MISMATCH' || err.code === 'NO_HASH') {
    return res.status(409).json({ success: false, code: err.code, error: err.message });
  }
  log.error('[adminMarriage] transition error', { error: err.message });
  return res.status(500).json({ success: false, error: 'فشل العملية' });
}

// ─── list / detail ─────────────────────────────────────────────────────────────

export const listRequests = async (req, res) => {
  try {
    const { status, year, search, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    let p = 1;

    if (status && status !== 'all') {
      conditions.push(`mr.status = $${p++}`);
      params.push(status);
    }
    if (year) {
      conditions.push(`mr.sequence_year = $${p++}`);
      params.push(Number(year));
    }
    if (search) {
      conditions.push(`(mr.sequence_number ILIKE $${p} OR mr.applicant_name ILIKE $${p} OR mr.spouse_name_ar ILIKE $${p})`);
      params.push(`%${search}%`);
      p++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit), Number(offset));

    const { rows } = await query(
      `SELECT mr.id, mr.sequence_number, mr.status, mr.applicant_name, mr.spouse_name_ar,
              mr.marriage_date, mr.final_amount, mr.created_at, mr.updated_at,
              mr.member_id, mr.linked_initiative_id, mr.rejection_reason
       FROM marriage_support_requests mr
       ${where}
       ORDER BY mr.created_at DESC
       LIMIT $${p++} OFFSET $${p}`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    log.error('[adminMarriage] listRequests', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلبات' });
  }
};

export const getRequest = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM marriage_support_requests WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const request = rows[0];
    const signatures = await fetchSignatures(request.id);
    const history = await getStatusHistory({
      tableName: 'marriage_support_status_history',
      foreignKey: 'request_id',
      recordId: request.id,
    });
    return res.json({ success: true, data: { ...request, signatures, history } });
  } catch (err) {
    log.error('[adminMarriage] getRequest', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلب' });
  }
};

// ─── committee chair actions ──────────────────────────────────────────────────

export const startCommitteeReview = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس اللجنة' });
    }
    const updated = await transitionStatus({
      requestId: req.params.id,
      toStatus: MARRIAGE_STATUS.UNDER_COMMITTEE_REVIEW,
      changedById: req.user.id,
      actorRole: 'marriage_committee_chair',
      note: 'بدء المراجعة',
      extraUpdates: { committee_chair_id: req.user.id, reviewed_at: new Date() },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

/**
 * Link an initiative to the request. Typically called once the committee
 * chair has activated a fundraising initiative for this marriage.
 *
 * Body: { initiative_id }
 */
export const linkInitiative = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس اللجنة' });
    }
    const initiativeId = req.body?.initiative_id;
    if (!initiativeId) {
      return res.status(400).json({ success: false, code: 'MISSING_INITIATIVE_ID', error: 'معرف المبادرة مطلوب' });
    }
    const { rows } = await query(
      `UPDATE marriage_support_requests SET linked_initiative_id = $1 WHERE id = $2 RETURNING *`,
      [initiativeId, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    // Reflect on initiatives row.
    await query(
      `UPDATE initiatives SET type = 'marriage_support', linked_marriage_request_id = $1 WHERE id = $2`,
      [req.params.id, initiativeId]
    ).catch(() => {});
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    log.error('[adminMarriage] linkInitiative', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل ربط المبادرة' });
  }
};

/**
 * Enter committee data — runs the calculation engine. Body:
 *   {
 *     contributions_sum,                  // required (typically initiative.current_amount)
 *     previous_ananiyat_count_override?,  // optional manual override
 *     additional_support_balance?,
 *     special_ananiya_value?,
 *     witness_1_id?, witness_1_name?,     // can also be set via setWitnesses
 *     witness_2_id?, witness_2_name?
 *   }
 */
export const enterCommitteeData = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس اللجنة' });
    }
    const {
      contributions_sum,
      previous_ananiyat_count_override = null,
      additional_support_balance = 0,
      special_ananiya_value = 0,
      witness_1_id, witness_1_name, witness_2_id, witness_2_name,
    } = req.body || {};

    if (contributions_sum === undefined || contributions_sum === null) {
      return res.status(400).json({ success: false, code: 'MISSING_CONTRIBUTIONS_SUM', error: 'مجموع المساهمات مطلوب' });
    }

    // First persist witness selections if provided.
    if (witness_1_id || witness_2_id) {
      await query(
        `UPDATE marriage_support_requests SET
           witness_1_id = COALESCE($1, witness_1_id),
           witness_1_name = COALESCE($2, witness_1_name),
           witness_2_id = COALESCE($3, witness_2_id),
           witness_2_name = COALESCE($4, witness_2_name)
         WHERE id = $5`,
        [witness_1_id || null, witness_1_name || null, witness_2_id || null, witness_2_name || null, req.params.id]
      );
    }

    // Run the calculation + snapshot.
    const calculated = await calculateAndSnapshot({
      requestId: req.params.id,
      contributionsSum: contributions_sum,
      previousAnaniyatOverride: previous_ananiyat_count_override,
      additionalSupportBalance: additional_support_balance,
      specialAnaniyaValue: special_ananiya_value,
    });

    // Transition to data_entered.
    const updated = await transitionStatus({
      requestId: req.params.id,
      toStatus: MARRIAGE_STATUS.DATA_ENTERED,
      changedById: req.user.id,
      actorRole: 'marriage_committee_chair',
      note: 'تم إدخال بيانات الحساب',
    });

    return res.json({ success: true, data: { ...updated, ...calculated } });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

/**
 * Generate the PDF (placeholder for now) and stamp the canonical hash on the
 * request, transitioning to awaiting_signatures.
 */
export const generatePdf = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس اللجنة' });
    }
    const updated = await generatePdfAndStamp({
      requestId: req.params.id,
      changedById: req.user.id,
      actorRole: 'marriage_committee_chair',
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

/**
 * Committee chair signs as the 4th signer (after both witnesses).
 * The recordSignature service auto-transitions to signatures_complete on
 * the 4th sig.
 */
export const signCommittee = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس اللجنة' });
    }
    const result = await recordSignature({
      requestId: req.params.id,
      signerRole: SIGNER_ROLE.COMMITTEE_CHAIR,
      signerMemberId: req.user.id,
      signerName: req.user.full_name_ar || 'رئيس اللجنة',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

/**
 * Witness signs (witness_1 or witness_2). Body: { signer_role: 'witness_1' | 'witness_2' }
 * Witness can be ANY member with the committee_witness role assigned via the
 * multi-role system; the request's witness_*_id columns determine which slot
 * this user fills.
 */
export const signWitness = async (req, res) => {
  try {
    const role = req.body?.signer_role;
    if (![SIGNER_ROLE.WITNESS_1, SIGNER_ROLE.WITNESS_2].includes(role)) {
      return res.status(400).json({ success: false, error: 'دور التوقيع غير صالح' });
    }

    const { rows } = await query(
      'SELECT witness_1_id, witness_2_id, witness_1_name, witness_2_name FROM marriage_support_requests WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const r = rows[0];
    const expectedId = role === SIGNER_ROLE.WITNESS_1 ? r.witness_1_id : r.witness_2_id;
    const expectedName = role === SIGNER_ROLE.WITNESS_1 ? r.witness_1_name : r.witness_2_name;

    if (!expectedId || String(expectedId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'لست الشاهد المختار لهذا الدور' });
    }

    const result = await recordSignature({
      requestId: req.params.id,
      signerRole: role,
      signerMemberId: req.user.id,
      signerName: expectedName || req.user.full_name_ar || 'شاهد',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

/**
 * Committee chair (or super_admin) rejects the request with a reason.
 * Body: { reason }
 */
export const reject = async (req, res) => {
  try {
    if (!isCommitteeChair(req.user) && !isChairman(req.user)) {
      return res.status(403).json({ success: false, error: 'غير مسموح' });
    }
    const reason = req.body?.reason || '';
    const updated = await transitionStatus({
      requestId: req.params.id,
      toStatus: MARRIAGE_STATUS.REJECTED,
      changedById: req.user.id,
      actorRole: req.user.role,
      note: `رفض: ${reason}`,
      extraUpdates: { rejection_reason: reason, rejected_at: new Date(), rejected_by_id: req.user.id },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

// ─── chairman actions ─────────────────────────────────────────────────────────

export const chairmanApprove = async (req, res) => {
  try {
    if (!isChairman(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس الصندوق' });
    }
    const updated = await transitionStatus({
      requestId: req.params.id,
      toStatus: MARRIAGE_STATUS.APPROVED_BY_CHAIRMAN,
      changedById: req.user.id,
      actorRole: 'super_admin',
      note: 'اعتماد رئيس الصندوق',
      extraUpdates: { chairman_id: req.user.id, chairman_approved_at: new Date(), chairman_note: req.body?.note || '' },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

/**
 * Record disbursement — completes the workflow. Body: { amount, note? }
 * Mirrors loans recordDisbursement: creates an expenses row tying the
 * payout to the fund's accounting.
 */
export const recordDisbursement = async (req, res) => {
  try {
    if (!isChairman(req.user)) {
      return res.status(403).json({ success: false, error: 'مخصص لرئيس الصندوق' });
    }
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, code: 'INVALID_AMOUNT', error: 'المبلغ غير صالح' });
    }

    const { rows } = await query(
      'SELECT id, sequence_number, applicant_name FROM marriage_support_requests WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const request = rows[0];

    // Auto-create expense row (best-effort).
    let expenseId = null;
    try {
      const expenseDate = new Date();
      const { HijriDateManager } = await import('../utils/hijriDateUtils.js');
      let hijriData;
      try {
        hijriData = HijriDateManager.convertToHijri(expenseDate);
      } catch (_e) {
        hijriData = { hijri_date_string: '', hijri_year: null, hijri_month: null, hijri_day: null, hijri_month_name: '' };
      }

      const titleAr = `دعم زواج - ${request.sequence_number}`;
      const titleEn = `Marriage support - ${request.sequence_number}`;
      const descriptionAr = `صرف دعم زواج للعضو ${request.applicant_name} (طلب ${request.sequence_number})`;
      const notesText = `صرف تلقائي من نظام دعم الزواج. رقم الطلب: ${request.sequence_number}`;

      const { rows: expRows } = await query(
        `INSERT INTO expenses (
           expense_category, title_ar, title_en, description_ar, amount, currency,
           expense_date, paid_to, payment_method, notes,
           approval_required, status, created_by,
           hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
           approved_by, approved_at, approval_notes
         ) VALUES (
           'marriage_support', $1, $2, $3, $4, 'SAR', $5, $6, 'bank_transfer', $7,
           false, 'paid', $8,
           $9, $10, $11, $12, $13,
           $8, $14, 'صرف تلقائي بعد اكتمال إجراءات دعم الزواج'
         ) RETURNING id`,
        [
          titleAr, titleEn, descriptionAr, amount,
          expenseDate.toISOString().split('T')[0],
          request.applicant_name || '', notesText,
          req.user.id,
          hijriData.hijri_date_string || '',
          hijriData.hijri_year || null,
          hijriData.hijri_month || null,
          hijriData.hijri_day || null,
          hijriData.hijri_month_name || '',
          new Date().toISOString(),
        ]
      );
      expenseId = expRows[0]?.id || null;
    } catch (err) {
      log.warn('[adminMarriage] expense create failed (non-fatal)', { error: err.message, requestId: request.id });
    }

    const updated = await transitionStatus({
      requestId: request.id,
      toStatus: MARRIAGE_STATUS.COMPLETED,
      changedById: req.user.id,
      actorRole: 'super_admin',
      note: req.body?.note || 'تم صرف الدعم',
      extraUpdates: {
        disbursed_at: new Date(),
        disbursed_amount: amount,
        disbursed_by_id: req.user.id,
        ...(expenseId ? { disbursement_expense_id: expenseId } : {}),
      },
    });
    return res.json({ success: true, data: updated, expense_id: expenseId });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};
