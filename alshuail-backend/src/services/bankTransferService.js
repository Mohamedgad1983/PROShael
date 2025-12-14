import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Bank Transfer Service
 * Handles bank transfer requests for pay-on-behalf feature
 */

const BUCKET_NAME = 'bank-transfer-receipts';

/**
 * Upload receipt to Supabase Storage
 * @param {Object} file - Multer file object
 * @param {string} requesterId - ID of the member making the request
 * @returns {Object} Upload result with URL and path
 */
export const uploadReceipt = async (file, requesterId) => {
  try {
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${requesterId}/${timestamp}_${sanitizedFilename}`;

    const { data: _data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      log.error('Receipt upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
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
    const { data: beneficiary, error: beneficiaryError } = await supabase
      .from('members')
      .select('id, full_name, membership_number')
      .eq('id', beneficiary_id)
      .single();

    if (beneficiaryError || !beneficiary) {
      throw new Error('العضو المستفيد غير موجود');
    }

    // Create the transfer request
    const { data: transfer, error } = await supabase
      .from('bank_transfer_requests')
      .insert({
        requester_id,
        beneficiary_id,
        amount: parseFloat(amount),
        purpose,
        purpose_reference_id,
        receipt_url,
        receipt_filename,
        notes,
        status: 'pending'
      })
      .select(`
        *,
        requester:members!requester_id(id, full_name, membership_number, phone),
        beneficiary:members!beneficiary_id(id, full_name, membership_number, phone)
      `)
      .single();

    if (error) {
      log.error('Error creating bank transfer request:', error);
      throw error;
    }

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
      limit = 20,
      search
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('bank_transfer_requests')
      .select(`
        *,
        requester:members!requester_id(id, full_name, membership_number, phone),
        beneficiary:members!beneficiary_id(id, full_name, membership_number, phone),
        reviewer:users!reviewed_by(id, full_name_ar, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    const { data: transfers, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      log.error('Error fetching bank transfers:', error);
      throw error;
    }

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
    const { data: transfer, error } = await supabase
      .from('bank_transfer_requests')
      .select(`
        *,
        requester:members!requester_id(id, full_name, membership_number, phone, email),
        beneficiary:members!beneficiary_id(id, full_name, membership_number, phone, email),
        reviewer:users!reviewed_by(id, full_name_ar, email)
      `)
      .eq('id', transferId)
      .single();

    if (error) {
      log.error('Error fetching bank transfer:', error);
      throw error;
    }

    return transfer;
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

    // Update transfer status
    const { data: updatedTransfer, error: updateError } = await supabase
      .from('bank_transfer_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        notes: notes || transfer.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId)
      .select()
      .single();

    if (updateError) {
      log.error('Error updating transfer status:', updateError);
      throw updateError;
    }

    // Create the actual payment record
    const paymentData = {
      payer_id: transfer.requester_id,
      beneficiary_id: transfer.beneficiary_id,
      amount: transfer.amount,
      category: transfer.purpose,
      payment_method: 'bank_transfer',
      status: 'completed',
      is_on_behalf: transfer.requester_id !== transfer.beneficiary_id,
      reference_id: transfer.purpose_reference_id,
      notes: `تحويل بنكي معتمد - رقم الطلب: ${transferId}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      log.error('Error creating payment from bank transfer:', paymentError);
      // Rollback the transfer status update
      await supabase
        .from('bank_transfer_requests')
        .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
        .eq('id', transferId);
      throw paymentError;
    }

    // Update member balance for subscription payments
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

    const { data: updatedTransfer, error } = await supabase
      .from('bank_transfer_requests')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId)
      .select(`
        *,
        requester:members!requester_id(id, full_name, membership_number),
        beneficiary:members!beneficiary_id(id, full_name, membership_number)
      `)
      .single();

    if (error) {
      log.error('Error rejecting transfer:', error);
      throw error;
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
 * Update member balance after payment
 * @param {string} memberId - Member ID
 * @param {number} amount - Amount to add
 */
const updateMemberBalance = async (memberId, amount) => {
  try {
    // Get current balance
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('current_balance, balance, total_paid')
      .eq('id', memberId)
      .single();

    if (fetchError) {
      log.error('Error fetching member for balance update:', fetchError);
      return;
    }

    const currentBalance = parseFloat(member.current_balance) || parseFloat(member.balance) || parseFloat(member.total_paid) || 0;
    const newBalance = Math.min(currentBalance + parseFloat(amount), 3000); // Cap at 3000 SAR

    // Update all balance fields
    const { error: updateError } = await supabase
      .from('members')
      .update({
        current_balance: newBalance,
        balance: newBalance,
        total_paid: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (updateError) {
      log.error('Error updating member balance:', updateError);
    }

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

    const { data: transfers, error, count } = await supabase
      .from('bank_transfer_requests')
      .select(`
        *,
        beneficiary:members!beneficiary_id(id, full_name, membership_number)
      `, { count: 'exact' })
      .eq('requester_id', memberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      log.error('Error fetching member transfers:', error);
      throw error;
    }

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
