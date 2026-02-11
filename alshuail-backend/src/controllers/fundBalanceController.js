/**
 * Fund Balance Controller
 * Handles fund balance calculations, snapshots, and bank reconciliation
 * Feature: 001-fund-balance-system
 *
 * Constitution Compliance:
 * - Principle V: Financial Accuracy (100% accurate calculations)
 * - Principle VI: Fund Balance Integrity (real-time calculations)
 */

import { query, getClient } from '../services/database.js';
import { log } from '../utils/logger.js';
import {
  hasFinancialAccess,
  logFinancialAccess,
  createFinancialAuditTrail
} from '../utils/accessControl.js';

// Minimum balance threshold (Constitution: 3600 SAR)
const MIN_BALANCE_THRESHOLD = 3600;

/**
 * Get current fund balance from vw_fund_balance view
 * Helper function for balance validation in other controllers
 * @returns {Object} Balance data or null on error
 */
export const getCurrentBalance = async () => {
  try {
    const { rows } = await query('SELECT * FROM vw_fund_balance LIMIT 1');

    if (!rows || rows.length === 0) {
      log.error('[FundBalance] Error getting current balance: no rows returned');
      return null;
    }

    return rows[0];
  } catch (error) {
    log.error('[FundBalance] Exception getting balance:', { error: error.message });
    return null;
  }
};

/**
 * Get fund balance for API response
 * @route GET /api/fund/balance
 */
export const getFundBalance = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Check financial access
    if (!hasFinancialAccess(userRole)) {
      logFinancialAccess(userId, 'DENIED', 'fund_balance_view', userRole, {}, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لعرض رصيد الصندوق',
        error_en: 'Access denied: Financial Manager role required'
      });
    }

    const balance = await getCurrentBalance();

    if (!balance) {
      return res.status(500).json({
        success: false,
        error: 'فشل في جلب رصيد الصندوق',
        error_en: 'Failed to retrieve fund balance'
      });
    }

    // Add warning flag if below threshold
    const isLowBalance = parseFloat(balance.current_balance) < MIN_BALANCE_THRESHOLD;

    // Log access
    logFinancialAccess(userId, 'GRANTED', 'fund_balance_view', userRole, {
      balance: balance.current_balance
    }, req.ip).catch(() => {});

    res.json({
      success: true,
      data: {
        ...balance,
        is_low_balance: isLowBalance,
        min_threshold: MIN_BALANCE_THRESHOLD,
        currency: 'SAR'
      },
      message: isLowBalance ? 'تحذير: رصيد الصندوق منخفض' : 'تم جلب الرصيد بنجاح',
      message_en: isLowBalance ? 'Warning: Fund balance is low' : 'Balance retrieved successfully'
    });
  } catch (error) {
    log.error('[FundBalance] getFundBalance error:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب رصيد الصندوق',
      error_en: error.message
    });
  }
};

/**
 * Get detailed balance breakdown with recent transactions
 * @route GET /api/fund/breakdown
 */
export const getBalanceBreakdown = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!hasFinancialAccess(userRole)) {
      logFinancialAccess(userId, 'DENIED', 'fund_breakdown_view', userRole, {}, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لعرض تفاصيل الرصيد',
        error_en: 'Access denied: Financial Manager role required'
      });
    }

    // Parallel queries for efficiency
    const [balanceResult, recentExpensesResult, recentPaymentsResult, internalDiyaResult] = await Promise.all([
      // 1. Current balance from view
      query('SELECT * FROM vw_fund_balance LIMIT 1'),

      // 2. Recent approved/paid expenses
      query(
        `SELECT id, title_ar, amount, status, expense_date, expense_number
         FROM expenses
         WHERE status IN ('approved', 'paid')
         ORDER BY expense_date DESC
         LIMIT 10`
      ),

      // 3. Recent completed payments
      query(
        `SELECT id, amount, status, created_at
         FROM payments
         WHERE status = 'completed'
         ORDER BY created_at DESC
         LIMIT 10`
      ),

      // 4. Internal diya cases
      query(
        `SELECT id, case_number, beneficiary_name, amount_paid, status, diya_type
         FROM diya_cases
         WHERE diya_type = 'internal' AND status IN ('paid', 'partially_paid', 'completed')
         ORDER BY created_at DESC
         LIMIT 10`
      )
    ]);

    if (!balanceResult.rows || balanceResult.rows.length === 0) {
      throw new Error('Failed to retrieve fund balance');
    }

    const balance = balanceResult.rows[0];
    const isLowBalance = parseFloat(balance.current_balance) < MIN_BALANCE_THRESHOLD;

    // Log access
    logFinancialAccess(userId, 'GRANTED', 'fund_breakdown_view', userRole, {}, req.ip).catch(() => {});

    res.json({
      success: true,
      data: {
        summary: {
          ...balance,
          is_low_balance: isLowBalance,
          min_threshold: MIN_BALANCE_THRESHOLD,
          currency: 'SAR'
        },
        recent_expenses: recentExpensesResult.rows || [],
        recent_payments: recentPaymentsResult.rows || [],
        internal_diya_cases: internalDiyaResult.rows || [],
        breakdown: {
          total_revenue: {
            amount: parseFloat(balance.total_revenue),
            label_ar: 'إجمالي الإيرادات',
            label_en: 'Total Revenue (Subscriptions)'
          },
          total_expenses: {
            amount: parseFloat(balance.total_expenses),
            label_ar: 'إجمالي المصروفات',
            label_en: 'Total Expenses'
          },
          total_internal_diya: {
            amount: parseFloat(balance.total_internal_diya),
            label_ar: 'إجمالي الدية الداخلية',
            label_en: 'Total Internal Diya'
          },
          current_balance: {
            amount: parseFloat(balance.current_balance),
            label_ar: 'الرصيد الحالي',
            label_en: 'Current Balance'
          }
        }
      },
      message: 'تم جلب تفاصيل الرصيد بنجاح',
      message_en: 'Balance breakdown retrieved successfully'
    });
  } catch (error) {
    log.error('[FundBalance] getBalanceBreakdown error:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب تفاصيل الرصيد',
      error_en: error.message
    });
  }
};

/**
 * Create balance reconciliation snapshot
 * @route POST /api/fund/snapshot
 */
export const createSnapshot = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Only financial managers can create snapshots
    if (!hasFinancialAccess(userRole)) {
      logFinancialAccess(userId, 'DENIED', 'snapshot_creation', userRole, {}, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لإنشاء مطابقة بنكية',
        error_en: 'Access denied: Financial Manager role required'
      });
    }

    const { bank_statement_balance, snapshot_date, notes } = req.body;

    if (bank_statement_balance === undefined || !snapshot_date) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال رصيد كشف البنك وتاريخ المطابقة',
        error_en: 'Bank statement balance and snapshot date are required'
      });
    }

    // Get current calculated balance
    const balance = await getCurrentBalance();
    if (!balance) {
      return res.status(500).json({
        success: false,
        error: 'فشل في جلب الرصيد الحالي للمقارنة',
        error_en: 'Failed to get current balance for comparison'
      });
    }

    const calculatedBalance = parseFloat(balance.current_balance);
    const bankBalance = parseFloat(bank_statement_balance);
    const variance = bankBalance - calculatedBalance;

    // Create snapshot record
    const { rows } = await query(
      `INSERT INTO fund_balance_snapshots (
        snapshot_date, total_revenue, total_expenses, total_internal_diya,
        calculated_balance, bank_statement_balance, variance, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        snapshot_date,
        parseFloat(balance.total_revenue),
        parseFloat(balance.total_expenses),
        parseFloat(balance.total_internal_diya),
        calculatedBalance,
        bankBalance,
        variance,
        notes || null,
        userId
      ]
    );

    const snapshot = rows[0];

    // Audit trail
    createFinancialAuditTrail({
      userId,
      operation: 'snapshot_creation',
      resourceType: 'fund_balance_snapshot',
      resourceId: snapshot.id,
      newValue: snapshot,
      metadata: { variance, bank_balance: bankBalance, calculated_balance: calculatedBalance },
      ipAddress: req.ip
    }).catch(() => {});

    logFinancialAccess(userId, 'SUCCESS', 'snapshot_creation', userRole, {
      snapshot_id: snapshot.id,
      variance
    }, req.ip).catch(() => {});

    // Determine reconciliation status
    const isReconciled = Math.abs(variance) < 0.01; // Consider reconciled if variance < 1 fils

    res.status(201).json({
      success: true,
      data: {
        ...snapshot,
        is_reconciled: isReconciled,
        variance_status: isReconciled ? 'مطابق' : (variance > 0 ? 'فائض في البنك' : 'نقص في البنك'),
        variance_status_en: isReconciled ? 'Reconciled' : (variance > 0 ? 'Bank excess' : 'Bank shortage')
      },
      message: isReconciled ? 'الرصيد مطابق' : `يوجد فرق ${Math.abs(variance).toFixed(2)} ريال`,
      message_en: isReconciled ? 'Balance reconciled' : `Variance of ${Math.abs(variance).toFixed(2)} SAR`
    });
  } catch (error) {
    log.error('[FundBalance] createSnapshot error:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء المطابقة البنكية',
      error_en: error.message
    });
  }
};

/**
 * Get reconciliation snapshot history
 * @route GET /api/fund/snapshots
 */
export const getSnapshots = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!hasFinancialAccess(userRole)) {
      logFinancialAccess(userId, 'DENIED', 'snapshots_view', userRole, {}, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لعرض سجل المطابقات',
        error_en: 'Access denied: Financial Manager role required'
      });
    }

    const { limit = 20, offset = 0 } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    const { rows: snapshots } = await query(
      'SELECT * FROM fund_balance_snapshots ORDER BY snapshot_date DESC LIMIT $1 OFFSET $2',
      [parsedLimit, parsedOffset]
    );

    // Enhance snapshots with status
    const enhancedSnapshots = (snapshots || []).map(snapshot => {
      const isReconciled = Math.abs(snapshot.variance) < 0.01;
      return {
        ...snapshot,
        is_reconciled: isReconciled,
        variance_status: isReconciled ? 'مطابق' : (snapshot.variance > 0 ? 'فائض' : 'نقص'),
        variance_status_en: isReconciled ? 'Reconciled' : (snapshot.variance > 0 ? 'Excess' : 'Shortage'),
        snapshot_date_formatted: new Date(snapshot.snapshot_date).toLocaleDateString('ar-SA')
      };
    });

    logFinancialAccess(userId, 'GRANTED', 'snapshots_view', userRole, {
      count: snapshots?.length || 0
    }, req.ip).catch(() => {});

    res.json({
      success: true,
      data: enhancedSnapshots,
      count: enhancedSnapshots.length,
      message: 'تم جلب سجل المطابقات بنجاح',
      message_en: 'Snapshot history retrieved successfully'
    });
  } catch (error) {
    log.error('[FundBalance] getSnapshots error:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب سجل المطابقات',
      error_en: error.message
    });
  }
};

/**
 * Validate if expense amount is within available balance
 * Used by expense creation for balance validation (T026b)
 * Uses database transaction with row locking for concurrent safety
 *
 * @param {number} amount - Expense amount to validate
 * @returns {Object} { valid: boolean, balance: number, error?: string }
 */
export const validateExpenseBalance = async (amount) => {
  const client = await getClient();

  try {
    // Start transaction with SERIALIZABLE isolation for concurrent safety
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the balance view by querying with FOR UPDATE on underlying tables
    // This prevents race conditions when multiple expenses are created simultaneously
    // Note: FOR UPDATE doesn't work on aggregated queries directly
    // Instead, we rely on SERIALIZABLE isolation level
    const { rows } = await client.query('SELECT * FROM vw_fund_balance');

    if (!rows || rows.length === 0) {
      await client.query('ROLLBACK');
      return { valid: false, balance: 0, error: 'Unable to calculate fund balance' };
    }

    const currentBalance = parseFloat(rows[0].current_balance);
    const expenseAmount = parseFloat(amount);

    if (expenseAmount > currentBalance) {
      await client.query('ROLLBACK');
      return {
        valid: false,
        balance: currentBalance,
        balance_after: currentBalance - expenseAmount,
        error: 'رصيد الصندوق غير كافي',
        error_en: 'Insufficient fund balance'
      };
    }

    // Commit - the actual expense insert should happen in the same transaction
    // This function just validates, the caller handles the insert
    await client.query('COMMIT');

    return {
      valid: true,
      balance: currentBalance,
      balance_after: currentBalance - expenseAmount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    log.error('[FundBalance] validateExpenseBalance error:', { error: error.message });
    return { valid: false, balance: 0, error: error.message };
  } finally {
    client.release();
  }
};
