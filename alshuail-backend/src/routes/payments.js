
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${duration}`);
  }
  next();
};
import express from 'express';
import multer from 'multer';
import {
  getAllPayments,
  createPayment,
  updatePaymentStatus,
  getPaymentStats,
  getPaymentStatistics,
  getMemberPayments,
  bulkUpdatePayments,
  generateFinancialReport,
  generateReceipt,
  processPayment,
  getOverduePayments,
  getPaymentById,
  getRevenueStats,
  getPaymentsByCategory,
  getMemberContributions,
  getHijriCalendarData,
  getPaymentsGroupedByHijri,
  getHijriFinancialStats,
  // Mobile payment endpoints
  payForInitiative,
  payForDiya,
  paySubscription,
  payForMember,
  uploadPaymentReceipt,
  // Approval queue
  getPendingPayments,
  getPendingPaymentsStats
} from '../controllers/paymentsController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import {
  validatePaymentInitiation,
  validatePaymentVerification,
  validateBankTransfer
} from '../middleware/payment-validator.js';
import { validateMinimumAmount } from '../middleware/dynamicAmountValidator.js';

// Configure multer for receipt uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يجب أن يكون صورة أو PDF'), false);
    }
  }
});

const router = express.Router();

// Approval queue — must be registered BEFORE /:id so "/pending" doesn't get
// swallowed by the dynamic :id route. Admin-only.
router.get('/pending',       requireRole(['super_admin', 'financial_manager']), getPendingPayments);
router.get('/pending/stats', requireRole(['super_admin', 'financial_manager']), getPendingPaymentsStats);

// Basic CRUD Operations - require financial access
router.get('/', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getAllPayments);
router.post('/', requireRole(['super_admin', 'financial_manager']), validatePaymentInitiation, createPayment);
router.get('/:id', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager', 'member']), getPaymentById);
// Admin approval / status change.
// NOTE: validatePaymentVerification was removed because that middleware is
// designed for payment-gateway verification callbacks (requires transactionId,
// status ∈ {success, failed, pending, cancelled}). For admin approval the body
// is just { status: 'paid' | 'cancelled' | ... } and the middleware would 400
// the request before it hits the controller. The controller itself validates
// the status enum in PaymentProcessingService.updatePaymentStatus().
router.put('/:id/status',   requireRole(['super_admin', 'financial_manager']), updatePaymentStatus);
router.post('/:id/process', requireRole(['super_admin', 'financial_manager']), processPayment);

// Statistics and Analytics - require financial access
router.get('/statistics', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentStatistics);
router.get('/stats', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentStats); // Keep for backward compatibility
router.get('/revenue', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getRevenueStats);
router.get('/categories', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentsByCategory);
router.get('/contributions', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getMemberContributions);
router.get('/overdue', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getOverduePayments);

// Member-specific Operations - members can view their own, admins can view all
router.get('/member/:memberId', cacheMiddleware(300),
  requireRole(['super_admin', 'financial_manager', 'member']),
  (req, res, next) => {
    // For members, only allow access to their own payments
    if (req.user.role === 'member') {
      if (req.user.id !== req.params.memberId && req.user.membershipNumber !== req.params.memberId) {
        return res.status(403).json({ 
          success: false, 
          message: 'ليس لديك الصلاحية للوصول إلى مدفوعات عضو آخر' 
        });
      }
    }
    next();
  },
  getMemberPayments
);

// Bulk Operations - require super admin access
router.post('/bulk-update', requireRole(['super_admin']), bulkUpdatePayments);

// Reports and Receipts - financial manager access
router.get('/report', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), generateFinancialReport);
router.post('/receipt/:paymentId', requireRole(['super_admin', 'financial_manager', 'member']), generateReceipt);
router.get('/receipt/:paymentId', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager', 'member']), generateReceipt);

// Hijri Calendar Operations - require financial access
router.get('/hijri-calendar', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getHijriCalendarData);
router.get('/grouped-hijri', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentsGroupedByHijri);
router.get('/hijri-stats', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getHijriFinancialStats);

// Mobile Payment Endpoints (require member authentication + payment validation)
// The dynamic amount validator runs BEFORE the static payment-validator so the
// per-category floor (pulled from active subscription plans) is applied first.
//
// The mobile flow doesn't expose a payment-method picker — members always upload
// a bank transfer receipt image — so we default `method` to 'bank_transfer'
// before the static validator runs. This way iOS/Flutter clients don't have to
// send the field, and admins can still override via the dashboard flow.
const defaultBankTransferMethod = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') return next();
  if (!req.body.method && !req.body.payment_method) {
    req.body.method = 'bank_transfer';
  }
  next();
};

router.post('/mobile/initiative',  requireRole(['member']), defaultBankTransferMethod, validateMinimumAmount('initiative'),  validatePaymentInitiation, payForInitiative);
router.post('/mobile/diya',        requireRole(['member']), defaultBankTransferMethod, validateMinimumAmount('diya'),        validatePaymentInitiation, payForDiya);
router.post('/mobile/subscription', requireRole(['member']), defaultBankTransferMethod, validateMinimumAmount('subscription'), validatePaymentInitiation, paySubscription);
router.post('/mobile/for-member',  requireRole(['member']), defaultBankTransferMethod, validateMinimumAmount('for_member'), validatePaymentInitiation, payForMember);
// Receipt upload — tolerant route for mobile clients.
//   * accepts paymentId in the URL (/:paymentId) OR in the request body (as
//     `paymentId`) OR falls back to the member's most recent pending payment
//   * accepts the multipart file under ANY field name (iOS currently sends
//     "file", older clients sent "receipt" — both work via upload.any())
//   * validateBankTransfer was removed — it required an accountNumber in
//     the body which mobile doesn't send, so every mobile upload was 400'd
//     by that middleware before ever reaching the controller
const uploadAny = upload.any();
router.post('/mobile/upload-receipt/:paymentId', requireRole(['member']), uploadAny, uploadPaymentReceipt);
router.post('/mobile/upload-receipt',             requireRole(['member']), uploadAny, uploadPaymentReceipt);

export default router;
