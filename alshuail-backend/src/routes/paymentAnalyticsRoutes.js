import express from 'express';
import {
  getMonthlyPaymentSummary,
  getYearlyMemberPayments,
  getTribalSectionPayments
} from '../controllers/paymentAnalyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/analytics/payments/monthly
 * @desc    Get monthly payment summary for last 12 months
 * @access  Private (requires authentication)
 */
router.get('/payments/monthly', getMonthlyPaymentSummary);

/**
 * @route   GET /api/analytics/payments/yearly
 * @desc    Get yearly payment breakdown (2021-2025)
 * @access  Private (requires authentication)
 */
router.get('/payments/yearly', getYearlyMemberPayments);

/**
 * @route   GET /api/analytics/payments/tribal-sections
 * @desc    Get payment distribution by tribal section
 * @access  Private (requires authentication)
 */
router.get('/payments/tribal-sections', getTribalSectionPayments);

export default router;
