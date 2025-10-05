import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// ========================================
// PUBLIC ROUTES
// ========================================

/**
 * GET /api/subscriptions/plans
 * Get all active subscription plans
 * Auth: None required
 */
router.get('/plans', subscriptionController.getSubscriptionPlans);

// ========================================
// MEMBER ROUTES (Authentication Required)
// ========================================

/**
 * GET /api/subscriptions/member/subscription
 * Get authenticated member's subscription details
 * Auth: Member token required
 */
router.get(
  '/member/subscription',
  authenticate,
  subscriptionController.getMemberSubscription
);

/**
 * GET /api/subscriptions/member/subscription/payments
 * Get authenticated member's payment history (paginated)
 * Query params: ?page=1&limit=20
 * Auth: Member token required
 */
router.get(
  '/member/subscription/payments',
  authenticate,
  subscriptionController.getPaymentHistory
);

// ========================================
// ADMIN ROUTES (Admin Authorization Required)
// ========================================

/**
 * GET /api/subscriptions/admin/subscriptions
 * Get all member subscriptions with pagination and filters
 * Query params: ?page=1&limit=20&status=all&search=
 * Auth: Admin role required
 */
router.get(
  '/admin/subscriptions',
  authenticate,
  requireRole(['super_admin', 'financial_manager']),
  subscriptionController.getAllSubscriptions
);

/**
 * GET /api/subscriptions/admin/subscriptions/stats
 * Get dashboard statistics (total, active, overdue, revenue, etc.)
 * Auth: Admin role required
 */
router.get(
  '/admin/subscriptions/stats',
  authenticate,
  requireRole(['super_admin', 'financial_manager']),
  subscriptionController.getSubscriptionStats
);

/**
 * GET /api/subscriptions/admin/subscriptions/overdue
 * Get list of overdue members only
 * Auth: Admin role required
 */
router.get(
  '/admin/subscriptions/overdue',
  authenticate,
  requireRole(['super_admin', 'financial_manager']),
  subscriptionController.getOverdueMembers
);

/**
 * POST /api/subscriptions/admin/subscriptions/payment
 * Record a payment for a member
 * Body: { member_id, amount, months, payment_method, receipt_number, notes }
 * Auth: Admin role required
 */
router.post(
  '/admin/subscriptions/payment',
  authenticate,
  requireRole(['super_admin', 'financial_manager']),
  subscriptionController.recordPayment
);

/**
 * POST /api/subscriptions/admin/subscriptions/reminder
 * Send payment reminder to member(s)
 * Body: { member_ids: [] } or { send_to_all: true }
 * Auth: Admin role required
 */
router.post(
  '/admin/subscriptions/reminder',
  authenticate,
  requireRole(['super_admin', 'financial_manager']),
  subscriptionController.sendPaymentReminder
);

// ========================================
// Legacy routes (backward compatibility)
// ========================================

/**
 * GET /api/subscriptions
 * Legacy route - redirects to admin subscriptions
 * Auth: Admin role required
 */
router.get(
  '/',
  authenticate,
  requireRole(['super_admin', 'financial_manager']),
  subscriptionController.getAllSubscriptions
);

export default router;
