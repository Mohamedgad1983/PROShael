
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `private, max-age=${duration}`);
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
import {
  cancelGatewaySession,
  createGatewaySession,
  handleMoyasarWebhook,
  markGatewaySubmissionStarted,
  verifyGatewaySession,
} from '../controllers/paymentGatewayController.js';
import {
  listPendingGatewayRefunds,
  refundPendingGatewayPayment,
} from '../controllers/gatewayRefundController.js';
import {
  listGatewayFinancialExceptions,
  reviewGatewayFinancialException,
} from '../controllers/gatewayFinancialExceptionController.js';
import {
  actOnGatewayReconciliationReview,
  listGatewayReconciliationReviews,
} from '../controllers/gatewayReconciliationReviewController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validatePaymentInitiation } from '../middleware/payment-validator.js';
import { validateMinimumAmount } from '../middleware/dynamicAmountValidator.js';
import { uploadLegacyInitiativeReceipt } from '../controllers/initiativeReceiptCompatibilityController.js';
import { query } from '../services/database.js';

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

// requireRole authenticates and populates req.user. Member-facing single-row
// reads need an additional resource ownership check; otherwise knowing a UUID
// exposes another member's payment/gateway metadata or receipt.
export const requirePaymentOwnerForMember = async (req, res, next) => {
  if (req.user?.role !== 'member') {return next();}
  const paymentId = req.params.id || req.params.paymentId;
  const { rows } = await query(
    `SELECT payer_id, beneficiary_id
       FROM payments
      WHERE id = $1
      LIMIT 1`,
    [paymentId]
  );
  if (!rows.length) {
    return res.status(404).json({ success: false, error: 'الدفعة غير موجودة' });
  }
  const memberId = String(req.user.id);
  if (
    String(rows[0].payer_id || '') !== memberId
    && String(rows[0].beneficiary_id || '') !== memberId
  ) {
    return res.status(403).json({ success: false, error: 'ليس لديك الصلاحية للوصول إلى هذه الدفعة' });
  }
  return next();
};

// Native iOS uses the dedicated Moyasar routes for Apple Pay. These legacy
// mobile endpoints are therefore manual bank-transfer flows only and must
// continue into receipt verification instead of creating unverified
// `app_payment` rows.
export const requireLegacyMobileBankTransfer = (req, res, next) => {
  const method = String(
    req.body?.payment_method || req.body?.method || 'bank_transfer'
  ).trim().toLowerCase();
  if (method !== 'bank_transfer') {
    return res.status(400).json({
      success: false,
      error: 'هذا المسار مخصص للتحويل البنكي فقط. استخدم Apple Pay من شاشة الدفع الإلكتروني.',
      code: 'UNVERIFIED_MOBILE_PAYMENT_METHOD'
    });
  }
  req.body.method = 'bank_transfer';
  req.body.payment_method = 'bank_transfer';
  return next();
};

// Approval queue — must be registered BEFORE /:id so "/pending" doesn't get
// swallowed by the dynamic :id route. Admin-only.
router.get('/pending',       requireRole(['super_admin', 'financial_manager']), getPendingPayments);
router.get('/pending/stats', requireRole(['super_admin', 'financial_manager']), getPendingPaymentsStats);

// Basic CRUD Operations - require financial access
router.get('/', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getAllPayments);
router.post('/', requireRole(['super_admin', 'financial_manager']), validatePaymentInitiation, createPayment);

// Statistics and Analytics - require financial access
router.get('/statistics', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentStatistics);
router.get('/stats', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentStats); // Keep for backward compatibility
router.get('/revenue', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getRevenueStats);
router.get('/categories', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentsByCategory);
router.get('/contributions', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getMemberContributions);
router.get('/overdue', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getOverduePayments);

// iOS/Moyasar gateway checkout. These routes intentionally sit before the
// generic /:id route family. The session/verify endpoints are member-auth
// protected; the webhook is authenticated with Moyasar's shared secret.
router.post('/gateway/session', requireRole(['member']), createGatewaySession);
router.post('/gateway/session/:paymentId/submission-started', requireRole(['member']), markGatewaySubmissionStarted);
router.post('/gateway/session/:paymentId/verify', requireRole(['member']), verifyGatewaySession);
router.delete('/gateway/session/:paymentId', requireRole(['member']), cancelGatewaySession);
router.post('/gateway/moyasar/webhook', handleMoyasarWebhook);

// Captured-but-uncredited payments are a separate financial obligation. They
// must never be resolved by the generic status endpoint. Financial managers
// may review them; only the super administrator can instruct Moyasar to refund.
router.get(
  '/gateway/pending-refunds',
  requireRole(['super_admin', 'financial_manager']),
  listPendingGatewayRefunds
);
router.post(
  '/gateway/pending-refunds/:paymentId/refund',
  requireRole(['super_admin']),
  refundPendingGatewayPayment
);

// Partial/contradictory provider evidence never changes a balance. It is
// quarantined in this dedicated queue for financial review; only a super
// administrator can record a final review result.
router.get(
  '/gateway/financial-exceptions',
  requireRole(['super_admin', 'financial_manager']),
  listGatewayFinancialExceptions
);
router.post(
  '/gateway/financial-exceptions/:id/review',
  requireRole(['super_admin']),
  reviewGatewayFinancialException
);

// Durable reconciliation review queue. These static routes must stay before
// /:id. Financial managers have read-only visibility; only the super
// administrator can requeue or resolve a row, with an immutable audit record.
router.get(
  '/gateway/reconciliation-reviews',
  requireRole(['super_admin', 'financial_manager']),
  listGatewayReconciliationReviews
);
router.post(
  '/gateway/reconciliation-reviews/:paymentId/action',
  requireRole(['super_admin']),
  actOnGatewayReconciliationReview
);

router.get('/:id', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager', 'member']), requirePaymentOwnerForMember, getPaymentById);
// Admin approval / status change.
// NOTE: validatePaymentVerification was removed because that middleware is
// designed for payment-gateway verification callbacks (requires transactionId,
// status ∈ {success, failed, pending, cancelled}). For admin approval the body
// is just { status: 'paid' | 'cancelled' | ... } and the middleware would 400
// the request before it hits the controller. The controller itself validates
// the status enum in PaymentProcessingService.updatePaymentStatus().
router.put('/:id/status',   requireRole(['super_admin', 'financial_manager']), updatePaymentStatus);
router.post('/:id/process', requireRole(['super_admin', 'financial_manager']), processPayment);

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
router.post('/receipt/:paymentId', requireRole(['super_admin', 'financial_manager', 'member']), requirePaymentOwnerForMember, generateReceipt);
router.get('/receipt/:paymentId', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager', 'member']), requirePaymentOwnerForMember, generateReceipt);

// Hijri Calendar Operations - require financial access
router.get('/hijri-calendar', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getHijriCalendarData);
router.get('/grouped-hijri', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getPaymentsGroupedByHijri);
router.get('/hijri-stats', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getHijriFinancialStats);

// Mobile Payment Endpoints (require member authentication + payment validation)
// The dynamic amount validator runs BEFORE the static payment-validator so the
// per-category floor (pulled from active subscription plans) is applied first.
//
// Bank-transfer mobile flows default `method` to 'bank_transfer' before the
// static validator runs. Newer iOS clients send an explicit method after the
// member chooses between bank transfer and in-app gateway payment.
const defaultBankTransferMethod = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }
  if (!req.body.method && !req.body.payment_method) {
    req.body.method = 'bank_transfer';
  }
  next();
};

router.post('/mobile/initiative',  requireRole(['member']), defaultBankTransferMethod, requireLegacyMobileBankTransfer, validateMinimumAmount('initiative'),  validatePaymentInitiation, payForInitiative);
router.post('/mobile/diya',        requireRole(['member']), defaultBankTransferMethod, requireLegacyMobileBankTransfer, validateMinimumAmount('diya'),        validatePaymentInitiation, payForDiya);
router.post('/mobile/subscription', requireRole(['member']), defaultBankTransferMethod, requireLegacyMobileBankTransfer, validateMinimumAmount('subscription'), validatePaymentInitiation, paySubscription);
router.post('/mobile/for-member',  requireRole(['member']), defaultBankTransferMethod, requireLegacyMobileBankTransfer, validateMinimumAmount('for_member'), validatePaymentInitiation, payForMember);
// Receipt upload — tolerant route for mobile clients.
//   * accepts paymentId in the URL (/:paymentId) OR in the request body (as
//     `paymentId`) OR falls back to the member's most recent pending payment
//   * accepts the multipart file under ANY field name (iOS currently sends
//     "file", older clients sent "receipt" — both work via upload.any())
//   * validateBankTransfer was removed — it required an accountNumber in
//     the body which mobile doesn't send, so every mobile upload was 400'd
//     by that middleware before ever reaching the controller
const uploadAny = upload.any();
const routeMobileReceiptUpload = (req, res) => {
  if (req.body?.activityId) {
    return uploadLegacyInitiativeReceipt(req, res);
  }
  return uploadPaymentReceipt(req, res);
};
router.post('/mobile/upload-receipt/:paymentId', requireRole(['member']), uploadAny, routeMobileReceiptUpload);
router.post('/mobile/upload-receipt',             requireRole(['member']), uploadAny, routeMobileReceiptUpload);

export default router;
