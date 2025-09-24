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

// Basic CRUD Operations
router.get('/', getAllPayments);
router.post('/', createPayment);
router.get('/:id', getPaymentById);
router.put('/:id/status', updatePaymentStatus);
router.post('/:id/process', processPayment);

// Statistics and Analytics
router.get('/statistics', getPaymentStatistics);
router.get('/stats', getPaymentStats); // Keep for backward compatibility
router.get('/revenue', getRevenueStats);
router.get('/categories', getPaymentsByCategory);
router.get('/contributions', getMemberContributions);
router.get('/overdue', getOverduePayments);

// Member-specific Operations
router.get('/member/:memberId', getMemberPayments);

// Bulk Operations
router.post('/bulk-update', bulkUpdatePayments);

// Reports and Receipts
router.get('/report', generateFinancialReport);
router.post('/receipt/:paymentId', generateReceipt);
router.get('/receipt/:paymentId', generateReceipt);

// Hijri Calendar Operations
router.get('/hijri-calendar', getHijriCalendarData);
router.get('/grouped-hijri', getPaymentsGroupedByHijri);
router.get('/hijri-stats', getHijriFinancialStats);

// Mobile Payment Endpoints (require member authentication)
router.post('/mobile/initiative', requireRole(['member']), payForInitiative);
router.post('/mobile/diya', requireRole(['member']), payForDiya);
router.post('/mobile/subscription', requireRole(['member']), paySubscription);
router.post('/mobile/for-member', requireRole(['member']), payForMember);
router.post('/mobile/upload-receipt/:paymentId', requireRole(['member']), upload.single('receipt'), uploadPaymentReceipt);

export default router;