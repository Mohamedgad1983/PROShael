import express from 'express';
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
  getHijriFinancialStats
} from '../controllers/paymentsController.js';

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

export default router;