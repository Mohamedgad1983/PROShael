
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
  uploadPaymentReceipt
} from '../controllers/paymentsController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import {
  validatePaymentInitiation,
  validatePaymentVerification,
  validateBankTransfer
} from '../../middleware/payment-validator.js';

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

// Basic CRUD Operations - require financial access
router.get('/', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager']), getAllPayments);
router.post('/', requireRole(['super_admin', 'financial_manager']), validatePaymentInitiation, createPayment);
router.get('/:id', cacheMiddleware(300), requireRole(['super_admin', 'financial_manager', 'member']), getPaymentById);
router.put('/:id/status', requireRole(['super_admin', 'financial_manager']), validatePaymentVerification, updatePaymentStatus);
router.post('/:id/process', requireRole(['super_admin', 'financial_manager']), validatePaymentVerification, processPayment);

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
router.post('/mobile/initiative', requireRole(['member']), validatePaymentInitiation, payForInitiative);
router.post('/mobile/diya', requireRole(['member']), validatePaymentInitiation, payForDiya);
router.post('/mobile/subscription', requireRole(['member']), validatePaymentInitiation, paySubscription);
router.post('/mobile/for-member', requireRole(['member']), validatePaymentInitiation, payForMember);
router.post('/mobile/upload-receipt/:paymentId', requireRole(['member']), upload.single('receipt'), validateBankTransfer, uploadPaymentReceipt);

export default router;
