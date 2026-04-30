/**
 * Loans Controller — member-side endpoints
 *
 * Routes (mounted under /api/loans by routes/loans.js):
 *   GET    /eligibility-check   — pre-form check; surfaces tunable settings + reason if blocked
 *   GET    /me                  — list the current member's loan requests
 *   GET    /me/:id              — full detail of one of their requests
 *   POST   /                    — create a new request (multipart with attachments)
 *   DELETE /:id                 — cancel a still-reviewable request
 */

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { uploadToSupabase } from '../config/documentStorage.js';
import {
  LOAN_STATUS,
  checkLoanEligibility,
  validateRequestPayload,
  createLoanRequest,
  transitionStatus,
} from '../services/loanService.js';
import { getStatusHistory } from '../services/statusHistoryService.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function attachDocuments({ loanId, files, memberId }) {
  // multer's upload.fields() puts files under their declared names. We accept:
  //   id_copy, salary_certificate, financial_statement
  // (Najiz acknowledgment + fee receipt are uploaded by Brouj later.)
  const allowed = ['id_copy', 'salary_certificate', 'financial_statement'];
  const inserts = [];
  for (const fieldName of allowed) {
    const list = (files && files[fieldName]) || [];
    for (const file of list) {
      const upload = await uploadToSupabase(file, memberId, `loan-${fieldName}`);
      inserts.push({
        document_type: fieldName,
        file_path: upload.path,
        file_size: upload.size,
        file_type: upload.type,
        original_name: file.originalname,
      });
    }
  }

  for (const doc of inserts) {
    await query(
      `INSERT INTO loan_request_documents
         (loan_request_id, document_type, file_path, file_size, file_type, original_name, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [loanId, doc.document_type, doc.file_path, doc.file_size, doc.file_type, doc.original_name, memberId]
    );
  }
  return inserts.length;
}

async function fetchDocuments(loanId) {
  const { rows } = await query(
    `SELECT id, document_type, file_path, file_size, file_type, original_name, uploaded_at
     FROM loan_request_documents
     WHERE loan_request_id = $1 AND deleted_at IS NULL
     ORDER BY uploaded_at ASC`,
    [loanId]
  );
  return rows;
}

// ─── handlers ─────────────────────────────────────────────────────────────────

export const getEligibility = async (req, res) => {
  try {
    const result = await checkLoanEligibility(req.user.id);
    return res.json({ success: result.ok, data: result });
  } catch (err) {
    log.error('[loans] getEligibility', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل التحقق من الأهلية' });
  }
};

export const listMyLoans = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, sequence_number, status, loan_amount, admin_fee_amount,
              created_at, updated_at, rejection_reason
       FROM loan_requests
       WHERE member_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    log.error('[loans] listMyLoans', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلبات' });
  }
};

export const getMyLoan = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM loan_requests WHERE id = $1 AND member_id = $2',
      [req.params.id, req.user.id]
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
    log.error('[loans] getMyLoan', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل جلب الطلب' });
  }
};

export const createLoan = async (req, res) => {
  try {
    // 1. eligibility re-check (don't trust the client) ---------------------
    const elig = await checkLoanEligibility(req.user.id);
    if (!elig.ok) {
      return res.status(403).json({ success: false, error: elig.message, code: elig.code });
    }

    // 2. validate the payload --------------------------------------------------
    const validationError = await validateRequestPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, ...validationError });
    }

    // 3. require at least: id_copy, salary_certificate, financial_statement -----
    const hasFile = (name) => req.files && req.files[name] && req.files[name].length > 0;
    if (!hasFile('id_copy') || !hasFile('salary_certificate') || !hasFile('financial_statement')) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_ATTACHMENTS',
        message: 'يجب رفع صورة الهوية ومشهد الراتب وكشف الحساب أو سمة',
        message_en: 'ID copy, salary certificate, and bank/Sima statement are required',
      });
    }

    // 4. create the loan + initial status row -----------------------------------
    const created = await createLoanRequest({ memberId: req.user.id, payload: req.body });

    // 5. persist attachments ------------------------------------------------------
    const docsAttached = await attachDocuments({
      loanId: created.id,
      files: req.files,
      memberId: req.user.id,
    });

    log.info('[loans] created', {
      loanId: created.id,
      seq: created.sequence_number,
      docsAttached,
    });

    return res.status(201).json({
      success: true,
      message: `تم استلام طلبك برقم ${created.sequence_number}`,
      data: { ...created, attachments_count: docsAttached },
    });
  } catch (err) {
    log.error('[loans] createLoan', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'فشل إنشاء الطلب', detail: err.message });
  }
};

export const cancelMyLoan = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, status FROM loan_requests WHERE id = $1 AND member_id = $2',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }
    const loan = rows[0];
    // Members can cancel only while still in early review.
    if (![LOAN_STATUS.SUBMITTED, LOAN_STATUS.UNDER_FUND_REVIEW].includes(loan.status)) {
      return res.status(409).json({
        success: false,
        code: 'CANNOT_CANCEL',
        message: 'لا يمكن إلغاء الطلب في هذه المرحلة',
        message_en: 'This request can no longer be cancelled',
      });
    }
    const updated = await transitionStatus({
      loanId: loan.id,
      toStatus: LOAN_STATUS.CANCELLED,
      changedById: req.user.id,
      note: 'إلغاء من قِبل العضو',
      extraUpdates: { cancelled_at: new Date(), cancelled_by_id: req.user.id },
    });
    return res.json({ success: true, message: 'تم إلغاء الطلب', data: updated });
  } catch (err) {
    log.error('[loans] cancelMyLoan', { error: err.message });
    return res.status(500).json({ success: false, error: 'فشل إلغاء الطلب' });
  }
};
