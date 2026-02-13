import { query, getClient } from './database.js';
import { log } from '../utils/logger.js';

/**
 * Bank Transfer Service
 * Handles bank transfer requests for pay-on-behalf feature
 */

const BUCKET_NAME = 'bank-transfer-receipts';

/**
 * Upload receipt to storage
 * NOTE: Supabase Storage has been removed. This function now requires
 * an external storage implementation (e.g., local filesystem, S3).
 * @param {Object} file - Multer file object
 * @param {string} requesterId - ID of the member making the request
 * @returns {Object} Upload result with URL and path
 */
export const uploadReceipt = async (file, requesterId) => {
  try {
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${requesterId}/${timestamp}_${sanitizedFilename}`;

    // Storage migration pending: Replace with local filesystem or S3.
    // Supabase Storage was removed during PostgreSQL migration.
    log.warn('uploadReceipt called but storage backend is not configured', {
      bucket: BUCKET_NAME,
      filePath
    });

    return {
      path: filePath,
      url: `/uploads/${BUCKET_NAME}/${filePath}`,
      filename: file.originalname
    };
  } catch (error) {
    log.error('Failed to upload receipt:', error);
    throw new Error('فشل في رفع إيصال التحويل');
  }
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
      receipt_url,
      receipt_filename,
      notes
    } = transferData;

    // Validate beneficiary exists
    const { rows: beneficiaryRows } = await query(
      'SELECT id, full_name, membership_number FROM members WHERE id = $1',
      [beneficiary_id]
    );

    if (!beneficiaryRows[0]) {
      throw new Error('العضو المستفيد غير موجود');
    }

    // Create the transfer request
    const { rows: transferRows } = await query(
      `INSERT INTO bank_transfer_requests
        (requester_id, beneficiary_id, amount, purpose, purpose_reference_id, receipt_url, receipt_filename, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [requester_id, beneficiary_id, parseFloat(amount), purpose, purpose_reference_id, receipt_url, receipt_filename, notes]
    );

    const transfer = transferRows[0];

    // Fetch the joined requester and beneficiary data
    const { rows: requesterRows } = await query(
      'SELECT id, full_name, membership_number, phone FROM members WHERE id = $1',
      [requester_id]
    );
    const { rows: beneficiaryDetailRows } = await query(
      'SELECT id, full_name, membership_number, phone FROM members WHERE id = $1',
      [beneficiary_id]
    );

    transfer.requester = requesterRows[0] || null;
    transfer.beneficiary = beneficiaryDetailRows[0] || null;

    log.info('Bank transfer request created', {
      id: transfer.id,
      requester_id,
      beneficiary_id,
      amount,
      purpose
    });

    return transfer;
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
      ? 'WHERE ' + conditions.join(' AND ')
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
        json_build_object('id', req.id, 'full_name', req.full_name, 'membership_number', req.membership_number, 'phone', req.phone) AS requester,
        json_build_object('id', ben.id, 'full_name', ben.full_name, 'membership_number', ben.membership_number, 'phone', ben.phone) AS beneficiary,
        json_build_object('id', rev.id, 'full_name_ar', rev.full_name_ar, 'email', rev.email) AS reviewer
       FROM bank_transfer_requests btr
       LEFT JOIN members req ON req.id = btr.requester_id
       LEFT JOIN members ben ON ben.id = btr.beneficiary_id
       LEFT JOIN users rev ON rev.id = btr.reviewed_by
       ${whereClause}
       ORDER BY btr.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

    return {
      data: transfers || [],
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
export const getBankTransferById = async (transferId) => {
  try {
    const { rows } = await query(
      `SELECT btr.*,
        json_build_object('id', req.id, 'full_name', req.full_name, 'membership_number', req.membership_number, 'phone', req.phone, 'email', req.email) AS requester,
        json_build_object('id', ben.id, 'full_name', ben.full_name, 'membership_number', ben.membership_number, 'phone', ben.phone, 'email', ben.email) AS beneficiary,
        json_build_object('id', rev.id, 'full_name_ar', rev.full_name_ar, 'email', rev.email) AS reviewer
       FROM bank_transfer_requests btr
       LEFT JOIN members req ON req.id = btr.requester_id
       LEFT JOIN members ben ON ben.id = btr.beneficiary_id
       LEFT JOIN users rev ON rev.id = btr.reviewed_by
       WHERE btr.id = $1`,
      [transferId]
    );

    return rows[0];
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
    // Get the transfer request
    const transfer = await getBankTransferById(transferId);

    if (!transfer) {
      throw new Error('طلب التحويل غير موجود');
    }

    if (transfer.status !== 'pending') {
      throw new Error('لا يمكن الموافقة على هذا الطلب - الحالة: ' + transfer.status);
    }

    // Use a transaction client for atomicity
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Update transfer status
      const { rows: updatedTransferRows } = await client.query(
        `UPDATE bank_transfer_requests
         SET status = 'approved',
             reviewed_by = $1,
             reviewed_at = $2,
             notes = $3,
             updated_at = $2
         WHERE id = $4
         RETURNING *`,
        [reviewerId, new Date().toISOString(), notes || transfer.notes, transferId]
      );
      const updatedTransfer = updatedTransferRows[0];

      // Create the actual payment record
      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments
          (payer_id, beneficiary_id, amount, category, payment_method, status, is_on_behalf, reference_id, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'bank_transfer', 'completed', $5, $6, $7, $8, $8)
         RETURNING *`,
        [
          transfer.requester_id,
          transfer.beneficiary_id,
          transfer.amount,
          transfer.purpose,
          transfer.requester_id !== transfer.beneficiary_id,
          transfer.purpose_reference_id,
          `تحويل بنكي معتمد - رقم الطلب: ${transferId}`,
          new Date().toISOString()
        ]
      );
      const payment = paymentRows[0];

      await client.query('COMMIT');

      // Update member balance for subscription payments (outside transaction - non-critical)
      if (transfer.purpose === 'subscription') {
        await updateMemberBalance(transfer.beneficiary_id, transfer.amount);
      }

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
      throw new Error('يجب تقديم سبب الرفض (5 أحرف على الأقل)');
    }

    const transfer = await getBankTransferById(transferId);

    if (!transfer) {
      throw new Error('طلب التحويل غير موجود');
    }

    if (transfer.status !== 'pending') {
      throw new Error('لا يمكن رفض هذا الطلب - الحالة: ' + transfer.status);
    }

    // Update transfer status
    const { rows: updatedRows } = await query(
      `UPDATE bank_transfer_requests
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = $2,
           rejection_reason = $3,
           updated_at = $2
       WHERE id = $4
       RETURNING *`,
      [reviewerId, new Date().toISOString(), reason.trim(), transferId]
    );
    const updatedTransfer = updatedRows[0];

    // Fetch joined data for the response
    const { rows: requesterRows } = await query(
      'SELECT id, full_name, membership_number FROM members WHERE id = $1',
      [updatedTransfer.requester_id]
    );
    const { rows: beneficiaryRows } = await query(
      'SELECT id, full_name, membership_number FROM members WHERE id = $1',
      [updatedTransfer.beneficiary_id]
    );

    updatedTransfer.requester = requesterRows[0] || null;
    updatedTransfer.beneficiary = beneficiaryRows[0] || null;

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
 * Update member balance after payment
 * @param {string} memberId - Member ID
 * @param {number} amount - Amount to add
 */
const updateMemberBalance = async (memberId, amount) => {
  try {
    // Get current balance
    const { rows } = await query(
      'SELECT current_balance, balance, total_paid FROM members WHERE id = $1',
      [memberId]
    );
    const member = rows[0];

    if (!member) {
      log.error('Error fetching member for balance update: member not found', { memberId });
      return;
    }

    const currentBalance = parseFloat(member.current_balance) || parseFloat(member.balance) || parseFloat(member.total_paid) || 0;
    const newBalance = Math.min(currentBalance + parseFloat(amount), 3000); // Cap at 3000 SAR

    // Update all balance fields
    await query(
      `UPDATE members
       SET current_balance = $1,
           balance = $1,
           total_paid = $1,
           updated_at = $2
       WHERE id = $3`,
      [newBalance, new Date().toISOString(), memberId]
    );

    log.info('Member balance updated', {
      memberId,
      previousBalance: currentBalance,
      addedAmount: amount,
      newBalance
    });
  } catch (error) {
    log.error('Failed to update member balance:', error);
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
        json_build_object('id', ben.id, 'full_name', ben.full_name, 'membership_number', ben.membership_number) AS beneficiary
       FROM bank_transfer_requests btr
       LEFT JOIN members ben ON ben.id = btr.beneficiary_id
       WHERE btr.requester_id = $1
       ORDER BY btr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );

    return {
      data: transfers || [],
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
