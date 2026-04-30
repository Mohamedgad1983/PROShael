/**
 * Admin Loans Controller
 *
 * Two distinct audiences sharing this controller:
 *
 *   1. Fund staff  (super_admin / admin / financial_manager) — full visibility,
 *                  approve / reject / forward to Brouj / record disbursement.
 *
 *   2. Brouj partner (brouj_partner role) — sees ONLY requests forwarded to
 *                  Brouj. Their actions: upload Najiz acknowledgment + confirm
 *                  fee receipt. They cannot approve/reject the request itself.
 *
 * Filtering for Brouj is enforced server-side via `req.user.role`, so the
 * client UI can't bypass it.
 */

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { uploadToSupabase } from '../config/documentStorage.js';
import { LOAN_STATUS, transitionStatus } from '../services/loanService.js';
import { getStatusHistory } from '../services/statusHistoryService.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function isBrouj(user) {
  return user && user.role === 'brouj_partner';
}

/**
 * Brouj should only ever see requests in stages that are theirs to handle.
 * For everyone else (fund admins) we don't add an extra filter.
 */
function statusFilterForRole(user) {
  if (!isBrouj(user)) {return null;}
  return [
    LOAN_STATUS.FORWARDED_TO_BROUJ,
    LOAN_STATUS.BROUJ_PROCESSING,
    LOAN_STATUS.NAJIZ_UPLOADED,
    LOAN_STATUS.FEE_COLLECTED,
    // include final states so they can see their completed work
    LOAN_STATUS.READY_FOR_DISBURSEMENT,
    LOAN_STATUS.COMPLETED,
  ];
}

async function fetchDocuments(loanId) {
  const { rows } = await query(
    `SELECT id, document_type, file_path, file_size, file_type, original_name, uploaded_at, uploaded_by
     FROM loan_request_documents
     WHERE loan_request_id = $1 AND deleted_at IS NULL
     ORDER BY uploaded_at ASC`,
    [loanId]
  );
  return rows;
}

// ─── list / detail ─────────────────────────────────────────────────────────────

export const listLoans = async (req, res) => {
  try {
    const { status, year, q, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    let p = 1;

    const broujStatuses = statusFilterForRole(req.user);
    if (broujStatuses) {
      conditions.push(`status = ANY($${p++}::text[])`);
      params.push(broujStatuses);
    }

    if (status) {
      conditions.push(`status = $${p++}`);
      params.push(status);
    }
    if (year) {
      conditions.push(`sequence_year = $${p++}`);
      params.push(Number(year));
    }
    if (q) {
      conditions.push(`(applicant_name ILIKE $${p} OR sequence_number ILIKE $${p} OR national_id ILIKE $${p})`);
      params.push(`%${q}%`);
      p++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit));
    const limitParam = p++;
    params.push(Number(offset));
    const offsetParam = p++;

    const { rows } = await query(
      `SELECT lr.id, lr.sequence_number, lr.status, lr.applicant_name, lr.national_id,
              lr.loan_amount, lr.admin_fee_amount, lr.created_at, lr.updated_at,
              lr.member_id, m.phone AS member_phone, m.full_name_ar AS member_full_name_ar
       FROM loan_requests lr
       LEFT JOIN members m ON lr.member_id = m.id
       ${whereClause}
       ORDER BY lr.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    log.error('[adminLoans] list', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلبات' });
  }
};

export const getLoan = async (req, res) => {
  try {
    const conditions = ['lr.id = $1'];
    const params = [req.params.id];
    const broujStatuses = statusFilterForRole(req.user);
    if (broujStatuses) {
      conditions.push(`lr.status = ANY($2::text[])`);
      params.push(broujStatuses);
    }
    const { rows } = await query(
      `SELECT lr.*, m.phone AS member_phone, m.full_name_ar AS member_full_name_ar
       FROM loan_requests lr
       LEFT JOIN members m ON lr.member_id = m.id
       WHERE ${conditions.join(' AND ')}`,
      params
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const loan = rows[0];
    const documents = await fetchDocuments(loan.id);
    const history = await getStatusHistory({
      tableName: 'loan_request_status_history',
      foreignKey: 'loan_request_id',
      recordId: loan.id,
    });
    return res.json({ success: true, data: { ...loan, documents, history } });
  } catch (err) {
    log.error('[adminLoans] getLoan', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلب' });
  }
};

// ─── fund-side actions ─────────────────────────────────────────────────────────

export const startReview = async (req, res) => {
  try {
    if (isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'غير مسموح' });}
    const updated = await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.UNDER_FUND_REVIEW,
      changedById: req.user.id,
      note: 'بدء المراجعة',
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

export const approveByFund = async (req, res) => {
  try {
    if (isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'غير مسموح' });}
    const updated = await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.APPROVED_BY_FUND,
      changedById: req.user.id,
      note: req.body?.note || 'موافقة المرحلة الأولى',
      extraUpdates: {
        reviewed_by_fund_id: req.user.id,
        reviewed_by_fund_at: new Date(),
        fund_review_note: req.body?.note || null,
      },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

export const rejectLoan = async (req, res) => {
  try {
    if (isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'غير مسموح' });}
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'يجب تحديد سبب الرفض',
      });
    }
    const updated = await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.REJECTED,
      changedById: req.user.id,
      note: reason,
      extraUpdates: {
        rejection_reason: reason,
        rejected_at: new Date(),
        rejected_by_id: req.user.id,
      },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

export const forwardToBrouj = async (req, res) => {
  try {
    if (isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'غير مسموح' });}
    const updated = await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.FORWARDED_TO_BROUJ,
      changedById: req.user.id,
      note: 'إحالة إلى مؤسسة بروز الريادة',
      extraUpdates: {
        forwarded_to_brouj_at: new Date(),
        forwarded_by_id: req.user.id,
      },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

export const recordDisbursement = async (req, res) => {
  try {
    if (isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'غير مسموح' });}
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, code: 'INVALID_AMOUNT', message: 'المبلغ غير صالح' });
    }
    // TODO Phase 1B: also create an `expenses` row tying the disbursement to the
    // fund's accounting. Left as a hook for the next pass to keep this PR
    // focused on the workflow itself.
    const updated = await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.COMPLETED,
      changedById: req.user.id,
      note: req.body?.note || 'تم صرف السلفة',
      extraUpdates: {
        disbursed_at: new Date(),
        disbursed_amount: amount,
      },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

// ─── Brouj-side actions ────────────────────────────────────────────────────────

export const broujUploadNajiz = async (req, res) => {
  try {
    if (!isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'مخصص لبروز الريادة' });}
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'يرجى رفع إقرار ناجز' });
    }
    const upload = await uploadToSupabase(req.file, req.params.id, 'loan-najiz_acknowledgment');
    await query(
      `INSERT INTO loan_request_documents
         (loan_request_id, document_type, file_path, file_size, file_type, original_name, uploaded_by)
       VALUES ($1, 'najiz_acknowledgment', $2, $3, $4, $5, $6)`,
      [req.params.id, upload.path, upload.size, upload.type, req.file.originalname, req.user.id]
    );
    const updated = await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.NAJIZ_UPLOADED,
      changedById: req.user.id,
      note: 'تم رفع إقرار ناجز',
      extraUpdates: {
        processed_by_brouj_id: req.user.id,
        najiz_uploaded_at: new Date(),
      },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

export const broujConfirmFee = async (req, res) => {
  try {
    if (!isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'مخصص لبروز الريادة' });}
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'يرجى رفع إيصال الرسوم' });
    }
    const upload = await uploadToSupabase(req.file, req.params.id, 'loan-fee_receipt');
    await query(
      `INSERT INTO loan_request_documents
         (loan_request_id, document_type, file_path, file_size, file_type, original_name, uploaded_by)
       VALUES ($1, 'fee_receipt', $2, $3, $4, $5, $6)`,
      [req.params.id, upload.path, upload.size, upload.type, req.file.originalname, req.user.id]
    );
    await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.FEE_COLLECTED,
      changedById: req.user.id,
      note: 'تم تحصيل الرسوم الإدارية',
      extraUpdates: {
        admin_fee_collected: true,
        fee_collected_at: new Date(),
      },
    });
    // Auto-advance: once the fee is collected, the loan is ready for fund disbursement.
    const ready = await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.READY_FOR_DISBURSEMENT,
      changedById: req.user.id,
      note: 'جاهز للصرف من الصندوق',
    });
    return res.json({ success: true, data: ready });
  } catch (err) {
    return handleTransitionError(res, err);
  }
};

// ─── shared error handler ──────────────────────────────────────────────────────

function handleTransitionError(res, err) {
  if (err && err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
  }
  if (err && err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({
      success: false,
      code: 'ILLEGAL_TRANSITION',
      message: 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية',
      detail: err.message,
    });
  }
  log.error('[adminLoans] action error', { error: err?.message, stack: err?.stack });
  return res.status(500).json({ success: false, error: 'فشل تنفيذ الإجراء' });
}
