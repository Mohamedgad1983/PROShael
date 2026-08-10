import { query, getClient } from './database.js';
import { log } from '../utils/logger.js';
import {
  DOCUMENT_CATEGORIES,
  deleteFromSupabase,
  getSignedUrl,
  uploadToSupabase
} from '../config/documentStorage.js';
import {
  SUBSCRIPTION_POLICY,
  clampSubscriptionBalance,
  remainingSubscriptionBalance,
  subscriptionMonthsFromBalance,
  subscriptionStatusFromBalance
} from '../constants/subscriptionPolicy.js';

/**
 * Bank Transfer Service
 * Handles bank transfer requests for pay-on-behalf feature
 */

const serviceError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const withPrivateReceiptUrl = (transfer) => {
  if (!transfer) return transfer;
  const { receipt_file_path: receiptFilePath, ...safeTransfer } = transfer;
  return {
    ...safeTransfer,
    receipt_url: receiptFilePath ? getSignedUrl(receiptFilePath) : null
  };
};

/**
 * Upload receipt to storage
 * The historical implementation only fabricated a URL. Bank-transfer
 * evidence now uses the same private local document storage as every other
 * member document.
 * @param {Object} file - Multer file object
 * @param {string} requesterId - ID of the member making the request
 * @returns {Object} Upload result with URL and path
 */
export const uploadReceipt = async (file, requesterId) => {
  try {
    if (!file?.buffer || !file?.originalname || !requesterId) {
      throw serviceError(
        400,
        'BANK_TRANSFER_RECEIPT_REQUIRED',
        'ملف إيصال التحويل البنكي غير مكتمل'
      );
    }

    const uploaded = await uploadToSupabase(
      file,
      requesterId,
      DOCUMENT_CATEGORIES.RECEIPTS
    );

    return {
      ...uploaded,
      filename: file.originalname,
      originalName: file.originalname
    };
  } catch (error) {
    log.error('Failed to upload receipt:', error);
    if (error?.statusCode) {
      throw error;
    }
    throw serviceError(
      500,
      'BANK_TRANSFER_RECEIPT_UPLOAD_FAILED',
      'فشل في رفع إيصال التحويل'
    );
  }
};

export const removeUploadedReceipt = async (filePath) => {
  if (!filePath) return;
  await deleteFromSupabase(filePath);
};

/**
 * Create a new bank transfer request
 * @param {Object} transferData - Transfer request data
 * @returns {Object} Created transfer request
 */
export const createBankTransferRequest = async (transferData) => {
  try {
    const {
      requester_id,
      beneficiary_id,
      amount,
      purpose,
      purpose_reference_id,
      receipt,
      notes
    } = transferData;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw serviceError(400, 'BANK_TRANSFER_AMOUNT_INVALID', 'يجب تحديد مبلغ صحيح');
    }

    if (
      !receipt?.path
      || !receipt?.url
      || !receipt?.originalName
      || !Number.isFinite(Number(receipt?.size))
      || Number(receipt.size) <= 0
      || !receipt?.type
    ) {
      throw serviceError(
        409,
        'BANK_TRANSFER_RECEIPT_ARCHIVE_REQUIRED',
        'تعذر أرشفة إيصال التحويل. يرجى رفع الملف مرة أخرى'
      );
    }

    const client = await getClient();
    let transactionOpen = false;
    let transfer;
    let requester;
    let beneficiary;
    try {
      await client.query('BEGIN');
      transactionOpen = true;

      const { rows: memberRows } = await client.query(
        `SELECT id, full_name, membership_number, phone
           FROM members
          WHERE id = ANY($1::uuid[])`,
        [[requester_id, beneficiary_id]]
      );
      requester = memberRows.find((member) => String(member.id) === String(requester_id));
      beneficiary = memberRows.find((member) => String(member.id) === String(beneficiary_id));
      if (!requester) {
        throw serviceError(404, 'BANK_TRANSFER_REQUESTER_NOT_FOUND', 'العضو صاحب الطلب غير موجود');
      }
      if (!beneficiary) {
        throw serviceError(404, 'BANK_TRANSFER_BENEFICIARY_NOT_FOUND', 'العضو المستفيد غير موجود');
      }

      const { rows: documentRows } = await client.query(
        `INSERT INTO documents_metadata (
           member_id, uploaded_by, title, description, category,
           file_path, file_size, file_type, original_name, status
         ) VALUES ($1, $1, $2, $3, 'receipts', $4, $5, $6, $7, 'active')
         RETURNING id`,
        [
          requester_id,
          `إيصال تحويل بنكي - ${requester.full_name || receipt.originalName}`,
          notes || '',
          receipt.path,
          Number(receipt.size),
          receipt.type,
          receipt.originalName
        ]
      );
      const receiptDocumentId = documentRows[0]?.id;
      if (!receiptDocumentId) {
        throw serviceError(
          500,
          'BANK_TRANSFER_RECEIPT_ARCHIVE_FAILED',
          'تعذر حفظ إيصال التحويل في الأرشيف'
        );
      }

      const { rows: transferRows } = await client.query(
        `INSERT INTO bank_transfer_requests
          (requester_id, beneficiary_id, amount, purpose, purpose_reference_id,
           receipt_url, receipt_filename, receipt_document_id, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
         RETURNING *`,
        [
          requester_id,
          beneficiary_id,
          numericAmount,
          purpose,
          purpose_reference_id || null,
          `/api/documents/${receiptDocumentId}/download`,
          receipt.originalName,
          receiptDocumentId,
          notes || null
        ]
      );
      transfer = transferRows[0];
      await client.query('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) {
        try { await client.query('ROLLBACK'); } catch (_rollbackError) { /* preserve original */ }
      }
      throw error;
    } finally {
      client.release();
    }

    transfer.requester = requester || null;
    transfer.beneficiary = beneficiary || null;
    transfer.receipt_file_path = receipt.path;

    log.info('Bank transfer request created', {
      id: transfer.id,
      requester_id,
      beneficiary_id,
      amount,
      purpose
    });

    return withPrivateReceiptUrl(transfer);
  } catch (error) {
    log.error('Failed to create bank transfer request:', error);
    throw error;
  }
};

/**
 * Get all bank transfer requests (for admin)
 * @param {Object} filters - Filter options
 * @returns {Object} Paginated transfer requests
 */
export const getBankTransferRequests = async (filters = {}) => {
  try {
    const {
      status,
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Apply status filter
    if (status && status !== 'all') {
      conditions.push(`btr.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count query
    const { rows: countRows } = await query(
      `SELECT COUNT(*) AS total FROM bank_transfer_requests btr ${whereClause}`,
      params
    );
    const count = parseInt(countRows[0].total, 10);

    // Data query with joins
    const dataParams = [...params, limit, offset];
    const { rows: transfers } = await query(
      `SELECT btr.*,
        dm.file_path AS receipt_file_path,
        json_build_object('id', req.id, 'full_name', req.full_name, 'membership_number', req.membership_number, 'phone', req.phone) AS requester,
        json_build_object('id', ben.id, 'full_name', ben.full_name, 'membership_number', ben.membership_number, 'phone', ben.phone) AS beneficiary,
        json_build_object('id', rev.id, 'full_name_ar', rev.full_name_ar, 'email', rev.email) AS reviewer
       FROM bank_transfer_requests btr
       LEFT JOIN members req ON req.id = btr.requester_id
       LEFT JOIN members ben ON ben.id = btr.beneficiary_id
       LEFT JOIN users rev ON rev.id = btr.reviewed_by
       LEFT JOIN documents_metadata dm
         ON dm.id = btr.receipt_document_id AND dm.status = 'active'
       ${whereClause}
       ORDER BY btr.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

    return {
      data: (transfers || []).map(withPrivateReceiptUrl),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    log.error('Failed to get bank transfer requests:', error);
    throw error;
  }
};

/**
 * Get a single bank transfer request by ID
 * @param {string} transferId - Transfer request ID
 * @returns {Object} Transfer request details
 */
export const getBankTransferById = async (transferId, requesterId = null) => {
  try {
    const { rows } = await query(
      `SELECT btr.*,
        dm.file_path AS receipt_file_path,
        json_build_object('id', req.id, 'full_name', req.full_name, 'membership_number', req.membership_number, 'phone', req.phone, 'email', req.email) AS requester,
        json_build_object('id', ben.id, 'full_name', ben.full_name, 'membership_number', ben.membership_number, 'phone', ben.phone, 'email', ben.email) AS beneficiary,
        json_build_object('id', rev.id, 'full_name_ar', rev.full_name_ar, 'email', rev.email) AS reviewer
       FROM bank_transfer_requests btr
       LEFT JOIN members req ON req.id = btr.requester_id
       LEFT JOIN members ben ON ben.id = btr.beneficiary_id
       LEFT JOIN users rev ON rev.id = btr.reviewed_by
       LEFT JOIN documents_metadata dm
         ON dm.id = btr.receipt_document_id AND dm.status = 'active'
       WHERE btr.id = $1
         AND ($2::uuid IS NULL OR btr.requester_id = $2::uuid)`,
      [transferId, requesterId]
    );

    return withPrivateReceiptUrl(rows[0]);
  } catch (error) {
    log.error('Failed to get bank transfer:', error);
    throw error;
  }
};

/**
 * Approve a bank transfer request
 * @param {string} transferId - Transfer request ID
 * @param {string} reviewerId - Admin user ID
 * @param {string} notes - Optional approval notes
 * @returns {Object} Updated transfer and created payment
 */
export const approveBankTransfer = async (transferId, reviewerId, notes = '') => {
  try {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // This is the serialization point for approve/approve and
      // approve/reject races. Status must always be checked after this lock.
      const { rows: transferRows } = await client.query(
        `SELECT *
           FROM bank_transfer_requests
          WHERE id = $1
          FOR UPDATE`,
        [transferId]
      );
      const transfer = transferRows[0];
      if (!transfer) {
        throw serviceError(404, 'BANK_TRANSFER_NOT_FOUND', 'طلب التحويل غير موجود');
      }
      if (transfer.status !== 'pending') {
        throw serviceError(
          409,
          'BANK_TRANSFER_ALREADY_REVIEWED',
          `تمت مراجعة هذا الطلب مسبقاً - الحالة: ${transfer.status}`
        );
      }
      if (!transfer.receipt_document_id) {
        throw serviceError(
          409,
          'BANK_TRANSFER_RECEIPT_ARCHIVE_REQUIRED',
          'لا يمكن اعتماد الطلب لأن الإيصال القديم غير مؤرشف. يلزم رفع الإيصال وربطه من الدعم الفني'
        );
      }

      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
        [transfer.receipt_document_id]
      );
      const { rows: receiptRows } = await client.query(
        `SELECT id
           FROM documents_metadata
          WHERE id = $1
            AND member_id = $2
            AND category = 'receipts'
            AND status = 'active'`,
        [transfer.receipt_document_id, transfer.requester_id]
      );
      if (!receiptRows[0]) {
        throw serviceError(
          409,
          'BANK_TRANSFER_RECEIPT_INVALID',
          'لا يمكن اعتماد الطلب: الإيصال غير نشط أو غير مملوك لصاحب الطلب'
        );
      }

      let subscriptionBalance = null;
      if (transfer.purpose === 'subscription') {
        const numericAmount = Number(transfer.amount);
        if (!Number.isFinite(numericAmount) || numericAmount < SUBSCRIPTION_POLICY.MONTHLY_FEE || numericAmount % SUBSCRIPTION_POLICY.MONTHLY_FEE !== 0) {
          throw serviceError(400, 'SUBSCRIPTION_AMOUNT_INVALID', 'مبلغ الاشتراك يجب أن يكون من مضاعفات 50 ريال');
        }

        const { rows: lockedRows } = await client.query(
          'SELECT current_balance FROM members WHERE id = $1 FOR UPDATE',
          [transfer.beneficiary_id]
        );
        if (!lockedRows.length) {
          throw serviceError(404, 'BANK_TRANSFER_BENEFICIARY_NOT_FOUND', 'العضو المستفيد غير موجود');
        }
        const currentBalance = clampSubscriptionBalance(lockedRows[0].current_balance);
        const remaining = remainingSubscriptionBalance(currentBalance);
        if (numericAmount > remaining) {
          throw serviceError(409, 'SUBSCRIPTION_BALANCE_EXCEEDED', `مبلغ التحويل يتجاوز الرصيد المتبقي (${remaining} ريال)`);
        }
        subscriptionBalance = currentBalance + numericAmount;
      }

      // Update transfer status
      const { rows: updatedTransferRows } = await client.query(
        `UPDATE bank_transfer_requests
         SET status = 'approved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             notes = $2,
             updated_at = NOW()
         WHERE id = $3 AND status = 'pending'
         RETURNING *`,
        [reviewerId, notes || transfer.notes, transferId]
      );
      const updatedTransfer = updatedTransferRows[0];
      if (!updatedTransfer) {
        throw serviceError(409, 'BANK_TRANSFER_ALREADY_REVIEWED', 'تمت مراجعة هذا الطلب مسبقاً');
      }

      // Create the actual payment record
      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments
          (payer_id, beneficiary_id, amount, category, payment_method, status,
           is_on_behalf, reference_number, notes, receipt_document_id,
           created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'bank_transfer', 'paid', $5, $6, $7, $8, $9, $9)
         RETURNING *`,
        [
          transfer.requester_id,
          transfer.beneficiary_id,
          transfer.amount,
          transfer.purpose,
          transfer.requester_id !== transfer.beneficiary_id,
          transfer.purpose_reference_id,
          `تحويل بنكي معتمد - رقم الطلب: ${transferId}`,
          transfer.receipt_document_id,
          new Date().toISOString()
        ]
      );
      const payment = paymentRows[0];

      if (subscriptionBalance !== null) {
        const subscriptionStatus = subscriptionStatusFromBalance(subscriptionBalance);
        await client.query(
          `UPDATE members
           SET current_balance = $1, balance = $1, total_balance = $1, total_paid = $1,
               is_compliant = ($1 >= $2),
               balance_status = CASE WHEN $1 >= $2 THEN 'sufficient' ELSE 'insufficient' END,
               payment_status = CASE WHEN $1 >= $2 THEN 'paid' ELSE 'pending' END,
               updated_at = NOW()
           WHERE id = $3`,
          [subscriptionBalance, SUBSCRIPTION_POLICY.MAX_BALANCE, transfer.beneficiary_id]
        );
        const subscriptionUpdate = await client.query(
          `UPDATE subscriptions
           SET amount = $1, total_amount = $1, paid_amount = $2,
               remaining_amount = $3, current_balance = $2,
               months_paid_ahead = $4, status = $5,
               payment_status = $6, start_date = '2021-01-01',
               end_date = '2025-12-31', next_payment_due = $7,
               last_payment_date = CURRENT_DATE, last_payment_amount = $8,
               updated_at = NOW()
           WHERE member_id = $9`,
          [
            SUBSCRIPTION_POLICY.MAX_BALANCE,
            subscriptionBalance,
            remainingSubscriptionBalance(subscriptionBalance),
            subscriptionMonthsFromBalance(subscriptionBalance),
            subscriptionStatus,
            subscriptionStatus === 'active' ? 'paid' : 'pending',
            subscriptionStatus === 'active' ? null : new Date().toISOString().split('T')[0],
            Number(transfer.amount),
            transfer.beneficiary_id
          ]
        );

        if (subscriptionUpdate.rowCount === 0) {
          await client.query(
            `INSERT INTO subscriptions (
               member_id, amount, total_amount, paid_amount, remaining_amount,
               current_balance, months_paid_ahead, status, payment_status,
               start_date, end_date, next_payment_due, last_payment_date,
               last_payment_amount, created_at, updated_at
             ) VALUES (
               $1, $2, $2, $3, $4, $3, $5, $6, $7,
               '2021-01-01', '2025-12-31', $8, CURRENT_DATE, $9, NOW(), NOW()
             )`,
            [
              transfer.beneficiary_id,
              SUBSCRIPTION_POLICY.MAX_BALANCE,
              subscriptionBalance,
              remainingSubscriptionBalance(subscriptionBalance),
              subscriptionMonthsFromBalance(subscriptionBalance),
              subscriptionStatus,
              subscriptionStatus === 'active' ? 'paid' : 'pending',
              subscriptionStatus === 'active' ? null : new Date().toISOString().split('T')[0],
              Number(transfer.amount)
            ]
          );
        }
      }

      await client.query('COMMIT');

      log.info('Bank transfer approved', {
        transferId,
        paymentId: payment.id,
        reviewerId
      });

      return {
        transfer: updatedTransfer,
        payment
      };
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    log.error('Failed to approve bank transfer:', error);
    throw error;
  }
};

/**
 * Reject a bank transfer request
 * @param {string} transferId - Transfer request ID
 * @param {string} reviewerId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Object} Updated transfer
 */
export const rejectBankTransfer = async (transferId, reviewerId, reason) => {
  try {
    if (!reason || reason.trim().length < 5) {
      throw serviceError(400, 'BANK_TRANSFER_REJECTION_REASON_REQUIRED', 'يجب تقديم سبب الرفض (5 أحرف على الأقل)');
    }

    const client = await getClient();
    let updatedTransfer;
    try {
      await client.query('BEGIN');
      const { rows: transferRows } = await client.query(
        'SELECT * FROM bank_transfer_requests WHERE id = $1 FOR UPDATE',
        [transferId]
      );
      const transfer = transferRows[0];
      if (!transfer) {
        throw serviceError(404, 'BANK_TRANSFER_NOT_FOUND', 'طلب التحويل غير موجود');
      }
      if (transfer.status !== 'pending') {
        throw serviceError(
          409,
          'BANK_TRANSFER_ALREADY_REVIEWED',
          `تمت مراجعة هذا الطلب مسبقاً - الحالة: ${transfer.status}`
        );
      }

      const { rows: updatedRows } = await client.query(
        `UPDATE bank_transfer_requests
         SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
             rejection_reason = $2, updated_at = NOW()
         WHERE id = $3 AND status = 'pending'
         RETURNING *`,
        [reviewerId, reason.trim(), transferId]
      );
      updatedTransfer = updatedRows[0];
      if (!updatedTransfer) {
        throw serviceError(409, 'BANK_TRANSFER_ALREADY_REVIEWED', 'تمت مراجعة هذا الطلب مسبقاً');
      }

      const { rows: memberRows } = await client.query(
        `SELECT id, full_name, membership_number
           FROM members
          WHERE id = ANY($1::uuid[])`,
        [[updatedTransfer.requester_id, updatedTransfer.beneficiary_id]]
      );
      updatedTransfer.requester = memberRows.find((member) => String(member.id) === String(updatedTransfer.requester_id)) || null;
      updatedTransfer.beneficiary = memberRows.find((member) => String(member.id) === String(updatedTransfer.beneficiary_id)) || null;
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_rollbackError) { /* preserve original */ }
      throw error;
    } finally {
      client.release();
    }

    log.info('Bank transfer rejected', {
      transferId,
      reviewerId,
      reason
    });

    return updatedTransfer;
  } catch (error) {
    log.error('Failed to reject bank transfer:', error);
    throw error;
  }
};

/**
 * Get transfer requests for a specific member
 * @param {string} memberId - Member ID
 * @param {Object} filters - Filter options
 * @returns {Object} Member's transfer requests
 */
export const getMemberTransferRequests = async (memberId, filters = {}) => {
  try {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    // Count query
    const { rows: countRows } = await query(
      'SELECT COUNT(*) AS total FROM bank_transfer_requests WHERE requester_id = $1',
      [memberId]
    );
    const count = parseInt(countRows[0].total, 10);

    // Data query with join
    const { rows: transfers } = await query(
      `SELECT btr.*,
        dm.file_path AS receipt_file_path,
        json_build_object('id', ben.id, 'full_name', ben.full_name, 'membership_number', ben.membership_number) AS beneficiary
       FROM bank_transfer_requests btr
       LEFT JOIN members ben ON ben.id = btr.beneficiary_id
       LEFT JOIN documents_metadata dm
         ON dm.id = btr.receipt_document_id AND dm.status = 'active'
       WHERE btr.requester_id = $1
       ORDER BY btr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );

    return {
      data: (transfers || []).map(withPrivateReceiptUrl),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    log.error('Failed to get member transfer requests:', error);
    throw error;
  }
};
