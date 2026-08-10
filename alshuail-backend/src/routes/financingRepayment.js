import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import {
  createGatewaySession,
  getMyPlan,
  reconcilePendingGatewayPayments,
  runReminders,
} from '../controllers/financingRepaymentController.js';

const router = express.Router();

router.get(
  '/plans/:planId',
  authenticateToken,
  requireRole(['member', 'super_admin', 'admin', 'financial_manager']),
  getMyPlan
);

router.post(
  '/plans/:planId/gateway-session',
  authenticateToken,
  requireRole(['member']),
  createGatewaySession
);

router.post(
  '/gateway/reconcile-pending',
  authenticateToken,
  requireRole(['super_admin', 'financial_manager']),
  reconcilePendingGatewayPayments
);

router.post(
  '/reminders/run',
  authenticateToken,
  requireRole(['super_admin', 'financial_manager']),
  runReminders
);

export default router;
