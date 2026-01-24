/**
 * Fund Balance Routes
 * API endpoints for fund balance management and bank reconciliation
 * Feature: 001-fund-balance-system
 *
 * Endpoints:
 * - GET  /api/fund/balance    - Get current fund balance
 * - GET  /api/fund/breakdown  - Get detailed balance breakdown
 * - POST /api/fund/snapshot   - Create bank reconciliation snapshot
 * - GET  /api/fund/snapshots  - Get reconciliation history
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getFundBalance,
  getBalanceBreakdown,
  createSnapshot,
  getSnapshots
} from '../controllers/fundBalanceController.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = express.Router();

/**
 * Authentication middleware to verify JWT token and attach user to request
 * Checks for Bearer token in Authorization header
 */
const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز التوثيق مطلوب',
        error_en: 'Authentication token required'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'رمز التوثيق غير صالح أو منتهي الصلاحية',
        error_en: 'Invalid or expired authentication token'
      });
    }
  } catch (error) {
    log.error('[FundBalance Routes] Auth error:', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'خطأ في المصادقة',
      error_en: 'Authentication error'
    });
  }
};

/**
 * Role-based authorization middleware
 * Ensures user has financial access (financial_manager, admin, super_admin)
 */
const requireFinancialAccess = (req, res, next) => {
  const userRole = req.user?.role;
  const allowedRoles = ['financial_manager', 'admin', 'super_admin', 'operational_manager'];

  if (!allowedRoles.includes(userRole)) {
    log.warn('[FundBalance Routes] Access denied', {
      userId: req.user?.id,
      role: userRole,
      path: req.path
    });
    return res.status(403).json({
      success: false,
      error: 'ليس لديك صلاحية الوصول إلى بيانات رصيد الصندوق',
      error_en: 'Access denied: Financial access required',
      code: 'INSUFFICIENT_PRIVILEGES'
    });
  }
  next();
};

// Apply authentication middleware to all fund balance routes
router.use(authenticateUser);
// Apply role-based authorization to all fund balance routes
router.use(requireFinancialAccess);

/**
 * GET /api/fund/balance
 * Get current fund balance
 * Returns: total_revenue, total_expenses, total_internal_diya, current_balance
 * Requires: Financial Manager role or higher
 */
router.get('/balance', getFundBalance);

/**
 * GET /api/fund/breakdown
 * Get detailed balance breakdown with recent transactions
 * Returns: summary, recent_expenses, recent_payments, internal_diya_cases
 * Requires: Financial Manager role or higher
 */
router.get('/breakdown', getBalanceBreakdown);

/**
 * POST /api/fund/snapshot
 * Create bank reconciliation snapshot
 * Body: { bank_statement_balance: number, snapshot_date: date, notes?: string }
 * Returns: snapshot with variance calculation
 * Requires: Financial Manager role or higher
 */
router.post('/snapshot', createSnapshot);

/**
 * GET /api/fund/snapshots
 * Get reconciliation snapshot history
 * Query params: limit (default 20), offset (default 0)
 * Returns: array of snapshots with reconciliation status
 * Requires: Financial Manager role or higher
 */
router.get('/snapshots', getSnapshots);

export default router;
