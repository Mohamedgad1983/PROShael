/**
 * @fileoverview Balance Adjustment Routes
 * @description API endpoints for member balance management and adjustments
 * @version 1.0.0
 * @module routes/balanceAdjustments
 *
 * @routes
 * POST   /api/balance-adjustments              - Adjust member balance
 * GET    /api/balance-adjustments              - Get all adjustments (admin)
 * GET    /api/balance-adjustments/member/:id   - Get member's adjustment history
 * GET    /api/balance-adjustments/summary/:id  - Get member balance summary
 * POST   /api/balance-adjustments/bulk-restore - Bulk restore balances
 *
 * @roles
 * - super_admin: Full access
 * - financial_manager: Full access
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import {
  adjustBalance,
  getMemberAdjustments,
  getAllAdjustments,
  bulkRestoreBalances,
  getMemberBalanceSummary
} from '../controllers/balanceAdjustmentController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Require financial access for all balance adjustment operations
const requireFinancialAccess = requireRole(['super_admin', 'financial_manager', 'admin']);

/**
 * @route POST /api/balance-adjustments
 * @desc Adjust a member's balance with audit trail
 * @access financial_manager, super_admin
 * @body {
 *   member_id: string (required),
 *   adjustment_type: 'credit' | 'debit' | 'correction' | 'initial_balance' | 'yearly_payment' (required),
 *   amount: number (required),
 *   target_year: number (optional, 2020-current),
 *   target_month: number (optional, 1-12),
 *   reason: string (required, min 5 chars),
 *   notes: string (optional)
 * }
 */
router.post('/', requireFinancialAccess, adjustBalance);

/**
 * @route GET /api/balance-adjustments
 * @desc Get all balance adjustments with filters
 * @access financial_manager, super_admin
 * @query {
 *   page: number,
 *   limit: number,
 *   adjustment_type: string,
 *   target_year: number,
 *   from_date: string,
 *   to_date: string
 * }
 */
router.get('/', requireFinancialAccess, getAllAdjustments);

/**
 * @route GET /api/balance-adjustments/member/:memberId
 * @desc Get adjustment history for a specific member
 * @access financial_manager, super_admin
 * @params memberId - Member UUID
 */
router.get('/member/:memberId', requireFinancialAccess, getMemberAdjustments);

/**
 * @route GET /api/balance-adjustments/summary/:memberId
 * @desc Get member balance summary with yearly breakdown
 * @access financial_manager, super_admin
 * @params memberId - Member UUID
 */
router.get('/summary/:memberId', requireFinancialAccess, getMemberBalanceSummary);

/**
 * @route POST /api/balance-adjustments/bulk-restore
 * @desc Bulk restore member balances from yearly payment fields
 * @access super_admin only
 * @body {
 *   member_ids: string[] (optional, if empty restores all),
 *   restore_year: number (optional, if empty restores from all years),
 *   reason: string (required)
 * }
 */
router.post('/bulk-restore', requireRole(['super_admin']), bulkRestoreBalances);

export default router;
