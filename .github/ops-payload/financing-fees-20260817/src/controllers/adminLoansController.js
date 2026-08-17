/**
 * Admin Loans Controller
 *
 * Two distinct audiences sharing this controller:
 *
 *   1. Fund staff  (super_admin / admin / financial_manager) — full visibility,
 *                  approve / reject / forward to Brouj / record disbursement.
 *
 *   2. Brouj partner (brouj_partner role) — sees ONLY requests forwarded to
 *                  Brouj. Their action: upload Najiz acknowledgment. They
 *                  cannot approve/reject the request itself.
 *
 * Filtering for Brouj is enforced server-side via `req.user.role`, so the
 * client UI can't bypass it.
 */

import { query, getClient } from '../services/database.js';
import { log } from '../utils/logger.js';
import { getSignedUrl, uploadToSupabase } from '../config/documentStorage.js';
import { LOAN_STATUS, transitionStatus, dispatchStatusNotification } from '../services/loanService.js';
import { getStatusHistory, recordStatusChange } from '../services/statusHistoryService.js';
import {
  FINANCING_PROGRAM,
  createRepaymentPlanInTransaction,
  defaultFirstDueDate,
  getRepaymentPlanByRequest,
  isFinancingRepaymentEnabled,
  resolveLoanDisbursementTerms,
  validateInstallmentCount,
} from '../services/financingRepaymentService.js';
import { HijriDateManager } from '../utils/hijriDateUtils.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function isBrouj(user) {
  return user && user.role === 'brouj_partner';
}

function dateOnly(value) {
  if (value instanceof Date) {return value.toISOString().slice(0, 10);}
  return String(value || '').slice(0, 10);
}

/**
 * Brouj-side actions are allowed for the official Brouj partner role AND
 * for super_admin (since the family treats Brouj as an internal entity
 * that the admin is also responsible for). This way one admin login can
 * drive both fund-side and brouj-side actions in the same session.
 */
function canDoBroujActions(user) {
  return user && (user.role === 'brouj_partner' || user.role === 'super_admin');
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
  return rows.map(({ file_path: filePath, ...document }) => ({
    ...document,
    signed_url: getSignedUrl(filePath),
  }));
}

/**
 * Auto-create an `expenses` row when a loan disbursement is recorded. Mirrors
 * the diya auto-transfer pattern (see diyasController.transferInternalDiyas).
 *
 * This helper runs on the caller's transaction. Any failure aborts the expense,
 * balance debit, repayment plan, and request status together.
 */
async function createLoanDisbursementExpense({ client, loan, amount, userId, note }) {
    const expenseDate = new Date();
    let hijriData;
    try {
      hijriData = HijriDateManager.convertToHijri(expenseDate);
    } catch (_err) {
      hijriData = {
        hijri_date_string: '',
        hijri_year: null,
        hijri_month: null,
        hijri_day: null,
        hijri_month_name: '',
      };
    }

    const titleAr      = `تمويل سلعة - ${loan.sequence_number}`;
    const titleEn      = `Goods financing disbursement - ${loan.sequence_number}`;
    const descriptionAr = note
      ? `${note} (طلب ${loan.sequence_number})`
      : `صرف تمويل سلعة للعضو ${loan.applicant_name} (طلب ${loan.sequence_number})`;
    const notesText    = `صرف تلقائي من نظام تمويل السلع. رقم الطلب: ${loan.sequence_number}`;

    const { rows } = await client.query(
      `INSERT INTO expenses (
         expense_category, title_ar, title_en, description_ar, amount, currency,
         expense_date, paid_to, payment_method, notes,
         approval_required, status, created_by,
         hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
         approved_by, approved_at, approval_notes
       ) VALUES (
         'loan', $1, $2, $3, $4, 'SAR', $5, $6, 'bank_transfer', $7,
         false, 'paid', $8,
         $9, $10, $11, $12, $13,
         $8, $14, 'صرف تلقائي بعد إكمال إجراءات تمويل السلعة'
       ) RETURNING id`,
      [
        titleAr,
        titleEn,
        descriptionAr,
        amount,
        expenseDate.toISOString().split('T')[0],
        loan.applicant_name || '',
        notesText,
        userId,
        hijriData.hijri_date_string || '',
        hijriData.hijri_year || null,
        hijriData.hijri_month || null,
        hijriData.hijri_day || null,
        hijriData.hijri_month_name || '',
        new Date().toISOString(),
      ]
    );
    return rows[0]?.id || null;
}

// ─── list / detail ─────────────────────────────────────────────────────────────

export const listLoans = async (req, res) => {
  try {
    const { status, year, q, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    let p = 1;

    // All column references must be qualified with `lr.` because the JOIN
    // pulls in `members` which has overlapping column names (e.g. `status`).
    // Without the prefix `?status=submitted` was matching members.status and
    // returning zero rows.
    const broujStatuses = statusFilterForRole(req.user);
    if (broujStatuses) {
      conditions.push(`lr.status = ANY($${p++}::text[])`);
      params.push(broujStatuses);
    }

    if (status) {
      conditions.push(`lr.status = $${p++}`);
      params.push(status);
    }
    if (year) {
      conditions.push(`lr.sequence_year = $${p++}`);
      params.push(Number(year));
    }
    if (q) {
      conditions.push(`(lr.applicant_name ILIKE $${p} OR lr.sequence_number ILIKE $${p} OR lr.national_id ILIKE $${p})`);
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
              lr.loan_amount, lr.admin_fee_amount, lr.financing_fee_amount,
              lr.total_repayment_amount, lr.created_at, lr.updated_at,
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
    const repaymentPlan = await getRepaymentPlanByRequest({
      programType: FINANCING_PROGRAM.FAMILY,
      requestId: loan.id,
    });
    return res.json({ success: true, data: { ...loan, documents, history, repayment_plan: repaymentPlan } });
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
    if (reason.length < 5) {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'يجب كتابة سبب واضح للرفض لا يقل عن 5 أحرف',
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
  if (!isFinancingRepaymentEnabled()) {
    return res.status(503).json({
      success: false,
      code: 'FINANCING_REPAYMENT_DISABLED',
      message: 'صرف التمويل وجدول السداد غير مفعلين حالياً'
    });
  }
  let client;
  try {
    if (isBrouj(req.user)) {return res.status(403).json({ success: false, error: 'غير مسموح' });}
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, code: 'INVALID_AMOUNT', message: 'المبلغ غير صالح' });
    }

    const installmentCount = validateInstallmentCount(req.body?.installment_count, 12);
    const firstDueDate = req.body?.first_due_date === null || req.body?.first_due_date === undefined
      ? defaultFirstDueDate()
      : req.body.first_due_date;

    client = await getClient();
    await client.query('BEGIN');
    const { rows: loanRows } = await client.query(
      'SELECT * FROM loan_requests WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (loanRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'الطلب غير موجود' });
    }
    const loan = loanRows[0];
    if (loan.status === LOAN_STATUS.COMPLETED) {
      const existingPlan = await getRepaymentPlanByRequest({
        programType: FINANCING_PROGRAM.FAMILY,
        requestId: loan.id,
        client,
      });
      if (!existingPlan) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          code: 'LEGACY_COMPLETED_REQUEST_NO_PLAN',
          message: 'هذا طلب تاريخي مكتمل ولا يمكن إنشاء جدول سداد له تلقائياً'
        });
      }
      const replayMismatch = !Number.isFinite(Number(loan.disbursed_amount))
        || Math.abs(Number(loan.disbursed_amount) - amount) > 0.009
        || (
          req.body?.installment_count !== null
          && req.body?.installment_count !== undefined
          && Number(existingPlan.installment_count) !== installmentCount
        )
        || (
          req.body?.first_due_date !== null
          && req.body?.first_due_date !== undefined
          && dateOnly(existingPlan.first_due_date) !== String(firstDueDate)
        );
      if (replayMismatch) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          code: 'DISBURSEMENT_REPLAY_MISMATCH',
          message: 'بيانات إعادة الطلب لا تطابق عملية الصرف المسجلة'
        });
      }
      await client.query('COMMIT');
      return res.json({
        success: true,
        idempotent_replay: true,
        data: { ...loan, repayment_plan: existingPlan },
        expense_id: loan.disbursement_expense_id,
        repayment_plan: existingPlan,
      });
    }
    if (loan.status !== LOAN_STATUS.READY_FOR_DISBURSEMENT) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        code: 'ILLEGAL_TRANSITION',
        message: 'الطلب غير جاهز للصرف'
      });
    }
    const terms = resolveLoanDisbursementTerms(loan);
    if (
      req.body?.installment_count === null
      || req.body?.installment_count === undefined
      || req.body?.first_due_date === null
      || req.body?.first_due_date === undefined
    ) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        code: terms.isLegacy ? 'LEGACY_SCHEDULE_SELECTION_REQUIRED' : 'SCHEDULE_SELECTION_REQUIRED',
        message: 'يجب تحديد عدد الأقساط وتاريخ أول قسط صراحةً'
      });
    }

    const { principal, feeAmount } = terms;
    if (Math.abs(amount - principal) > 0.009) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        code: 'DISBURSEMENT_AMOUNT_MISMATCH',
        message: `مبلغ الصرف يجب أن يطابق مبلغ الباقة (${principal} ر.س)`
      });
    }
    const expenseId = await createLoanDisbursementExpense({
      client,
      loan,
      amount,
      userId: req.user.id,
      note: req.body?.note,
    });

    const plan = await createRepaymentPlanInTransaction({
      client,
      programType: FINANCING_PROGRAM.FAMILY,
      requestId: loan.id,
      memberId: loan.member_id,
      principalAmount: principal,
      feeAmount,
      installmentCount,
      firstDueDate,
      createdById: req.user.id,
    });

    const { rows: updatedRows } = await client.query(
      `UPDATE loan_requests
       SET status = $1,
           disbursed_at = NOW(),
           disbursed_amount = $2,
           disbursement_expense_id = $3,
           financing_fee_amount = $4,
           total_repayment_amount = $5
       WHERE id = $6 AND status = $7
       RETURNING *`,
      [
        LOAN_STATUS.COMPLETED,
        amount,
        expenseId,
        feeAmount,
        Number(plan.total_amount),
        loan.id,
        LOAN_STATUS.READY_FOR_DISBURSEMENT,
      ]
    );
    if (!updatedRows.length) {
      throw Object.assign(new Error('تغيرت حالة الطلب أثناء الصرف'), { code: 'ILLEGAL_TRANSITION' });
    }
    const updated = updatedRows[0];
    await recordStatusChange({
      tableName: 'loan_request_status_history',
      foreignKey: 'loan_request_id',
      recordId: loan.id,
      fromStatus: loan.status,
      toStatus: LOAN_STATUS.COMPLETED,
      changedById: req.user.id,
      note: req.body?.note || 'تم صرف تمويل السلعة وتفعيل جدول الأقساط',
      client,
    });
    const repaymentPlan = await getRepaymentPlanByRequest({
      programType: FINANCING_PROGRAM.FAMILY,
      requestId: loan.id,
      client,
    });
    await client.query('COMMIT');
    await dispatchStatusNotification(updated, LOAN_STATUS.COMPLETED);
    return res.json({
      success: true,
      data: { ...updated, repayment_plan: repaymentPlan },
      expense_id: expenseId,
      repayment_plan: repaymentPlan,
    });
  } catch (err) {
    try { await client?.query('ROLLBACK'); } catch (_rollbackError) { /* no-op */ }
    if ([
      'INVALID_INSTALLMENT_COUNT',
      'INVALID_FIRST_DUE_DATE',
      'FIRST_DUE_DATE_IN_PAST',
      'INVALID_FINANCING_TIER',
    ].includes(err?.code)) {
      return res.status(400).json({ success: false, code: err.code, message: err.message });
    }
    if ([
      'REPAYMENT_PLAN_CONFLICT',
      'FINANCING_TERMS_SNAPSHOT_INVALID',
    ].includes(err?.code)) {
      return res.status(409).json({ success: false, code: err.code, message: err.message });
    }
    return handleTransitionError(res, err);
  } finally {
    client?.release();
  }
};

// ─── Brouj-side actions ────────────────────────────────────────────────────────

export const broujUploadNajiz = async (req, res) => {
  try {
    if (!canDoBroujActions(req.user)) {return res.status(403).json({ success: false, error: 'مخصص لبروز الريادة' });}
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

    const { rows: currentRows } = await query(
      'SELECT status FROM loan_requests WHERE id = $1',
      [req.params.id]
    );
    if (currentRows[0]?.status === LOAN_STATUS.FORWARDED_TO_BROUJ) {
      await transitionStatus({
        loanId: req.params.id,
        toStatus: LOAN_STATUS.BROUJ_PROCESSING,
        changedById: req.user.id,
        note: 'بدء معالجة بروز الريادة',
      });
    }

    await transitionStatus({
      loanId: req.params.id,
      toStatus: LOAN_STATUS.NAJIZ_UPLOADED,
      changedById: req.user.id,
      note: 'تم رفع إقرار ناجز',
      extraUpdates: {
        processed_by_brouj_id: req.user.id,
        najiz_uploaded_at: new Date(),
      },
    });

    // New financing policy: there is no separate member-facing fee collection
    // step. The total item value already includes service/sustainability in the
    // backend calculation, so after Najiz is uploaded the request is ready for
    // fund disbursement.
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

export const broujConfirmFee = async (req, res) => {
  try {
    if (!canDoBroujActions(req.user)) {return res.status(403).json({ success: false, error: 'مخصص لبروز الريادة' });}
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'يرجى رفع مستند المعالجة' });
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
      note: 'تم استكمال المعالجة',
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
