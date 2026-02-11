import { log } from '../utils/logger.js';
import { query } from '../services/database.js';
import {
  uploadReceipt,
  createBankTransferRequest,
  getBankTransferRequests,
  getBankTransferById,
  approveBankTransfer,
  rejectBankTransfer,
  getMemberTransferRequests
} from '../services/bankTransferService.js';

/**
 * Submit a new bank transfer request
 * POST /api/bank-transfers
 */
export const submitBankTransfer = async (req, res) => {
  try {
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - يرجى تسجيل الدخول'
      });
    }

    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'يجب رفع إيصال التحويل البنكي'
      });
    }

    const {
      beneficiary_id,
      amount,
      purpose,
      purpose_reference_id,
      notes
    } = req.body;

    // Validate required fields
    if (!beneficiary_id) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العضو المستفيد'
      });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد مبلغ صحيح'
      });
    }

    const validPurposes = ['subscription', 'diya', 'initiative', 'general'];
    if (!purpose || !validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد نوع الدفع (subscription, diya, initiative, general)'
      });
    }

    // Upload the receipt
    const uploadResult = await uploadReceipt(req.file, requesterId);

    // Create the transfer request
    const transfer = await createBankTransferRequest({
      requester_id: requesterId,
      beneficiary_id,
      amount,
      purpose,
      purpose_reference_id,
      receipt_url: uploadResult.url,
      receipt_filename: uploadResult.filename,
      notes
    });

    log.info('Bank transfer submitted', {
      transferId: transfer.id,
      requesterId,
      beneficiaryId: beneficiary_id,
      amount,
      purpose
    });

    res.status(201).json({
      success: true,
      data: transfer,
      message: 'تم إرسال طلب التحويل البنكي بنجاح وسيتم مراجعته قريباً'
    });
  } catch (error) {
    log.error('Error submitting bank transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إرسال طلب التحويل'
    });
  }
};

/**
 * Get all bank transfer requests (admin)
 * GET /api/bank-transfers
 */
export const getAllBankTransfers = async (req, res) => {
  try {
    const { status, page, limit, search } = req.query;

    const result = await getBankTransferRequests({
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    log.error('Error fetching bank transfers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب طلبات التحويل'
    });
  }
};

/**
 * Get a single bank transfer request
 * GET /api/bank-transfers/:id
 */
export const getBankTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await getBankTransferById(id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'طلب التحويل غير موجود'
      });
    }

    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    log.error('Error fetching bank transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب طلب التحويل'
    });
  }
};

/**
 * Approve a bank transfer request
 * PUT /api/bank-transfers/:id/approve
 */
export const approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح'
      });
    }

    const result = await approveBankTransfer(id, reviewerId, notes);

    log.info('Bank transfer approved by admin', {
      transferId: id,
      reviewerId,
      paymentId: result.payment?.id
    });

    res.json({
      success: true,
      data: result,
      message: 'تم اعتماد التحويل البنكي بنجاح وتسجيل الدفعة'
    });
  } catch (error) {
    log.error('Error approving bank transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في اعتماد التحويل'
    });
  }
};

/**
 * Reject a bank transfer request
 * PUT /api/bank-transfers/:id/reject
 */
export const rejectTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'يجب تقديم سبب الرفض'
      });
    }

    const transfer = await rejectBankTransfer(id, reviewerId, reason);

    log.info('Bank transfer rejected by admin', {
      transferId: id,
      reviewerId,
      reason
    });

    res.json({
      success: true,
      data: transfer,
      message: 'تم رفض طلب التحويل البنكي'
    });
  } catch (error) {
    log.error('Error rejecting bank transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في رفض التحويل'
    });
  }
};

/**
 * Get current member's bank transfer requests
 * GET /api/bank-transfers/my-requests
 */
export const getMyTransferRequests = async (req, res) => {
  try {
    const memberId = req.user?.id;

    if (!memberId) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - يرجى تسجيل الدخول'
      });
    }

    const { page, limit } = req.query;

    const result = await getMemberTransferRequests(memberId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    log.error('Error fetching member transfers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب طلبات التحويل'
    });
  }
};

/**
 * Get bank transfer statistics (admin dashboard)
 * GET /api/bank-transfers/stats
 */
export const getTransferStats = async (req, res) => {
  try {
    const { rows: stats } = await query(
      'SELECT status, amount FROM bank_transfer_requests ORDER BY created_at DESC'
    );

    const summary = {
      total: stats?.length || 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      total_amount_pending: 0,
      total_amount_approved: 0
    };

    (stats || []).forEach(transfer => {
      if (transfer.status === 'pending') {
        summary.pending++;
        summary.total_amount_pending += parseFloat(transfer.amount) || 0;
      } else if (transfer.status === 'approved') {
        summary.approved++;
        summary.total_amount_approved += parseFloat(transfer.amount) || 0;
      } else if (transfer.status === 'rejected') {
        summary.rejected++;
      }
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    log.error('Error fetching transfer stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب إحصائيات التحويلات'
    });
  }
};
