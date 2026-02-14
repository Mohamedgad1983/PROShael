/**
 * Expenses Controller with Advanced Financial Management
 * Handles expense tracking, approval workflows, and role-based access
 * OPTIMIZED: Parallel execution, minimal JOINs, single-pass aggregation
 */

import { query } from '../services/database.js';
import {
  hasFinancialAccess,
  logFinancialAccess,
  validateFinancialOperation,
  createFinancialAuditTrail,
  checkSuspiciousActivity
} from '../utils/accessControl.js';
import { HijriDateManager } from '../utils/hijriDateUtils.js';
import { log } from '../utils/logger.js';
import { getCurrentBalance } from './fundBalanceController.js';

/**
 * OPTIMIZED: Single-pass summary calculation - O(n) instead of O(6n)
 * Calculates all summary metrics in one iteration
 */
function calculateSummaryFast(expenses) {
  if (!expenses || expenses.length === 0) {
    return {
      total_expenses: 0, pending_count: 0, approved_count: 0, paid_count: 0,
      rejected_count: 0, average_amount: 0, by_category: {}, pending_approval_value: 0
    };
  }
  let totalAmount = 0, pendingCount = 0, approvedCount = 0, paidCount = 0, rejectedCount = 0, pendingValue = 0;
  const byCategory = {};
  for (const expense of expenses) {
    const amount = parseFloat(expense.amount || 0);
    totalAmount += amount;
    switch (expense.status) {
      case 'pending': pendingCount++; pendingValue += amount; break;
      case 'approved': approvedCount++; break;
      case 'paid': paidCount++; break;
      case 'rejected': rejectedCount++; break;
    }
    const cat = expense.expense_category || 'other';
    if (!byCategory[cat]) { byCategory[cat] = { count: 0, total: 0 }; }
    byCategory[cat].count++;
    byCategory[cat].total += amount;
  }
  return {
    total_expenses: totalAmount, pending_count: pendingCount, approved_count: approvedCount,
    paid_count: paidCount, rejected_count: rejectedCount,
    average_amount: expenses.length > 0 ? totalAmount / expenses.length : 0,
    by_category: byCategory, pending_approval_value: pendingValue
  };
}

/**
 * Get all expenses with comprehensive filtering and role-based access
 * OPTIMIZED: Parallel execution, minimal JOINs, single-pass aggregation
 * @route GET /api/expenses
 */
export const getExpenses = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      category, status, date_from, date_to, hijri_month, hijri_year,
      limit = 50, offset = 0, search, sort_by = 'hijri', fast = 'true'
    } = req.query;

    const userRole = req.user.role;
    const userId = req.user.id;
    const useFastMode = fast === 'true';

    // Sync role check - no await needed
    if (!hasFinancialAccess(userRole)) {
      logFinancialAccess(userId, 'DENIED', 'expenses_view', userRole, {}, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Access denied: Financial Manager role required',
        code: 'INSUFFICIENT_FINANCIAL_PRIVILEGES'
      });
    }

    // Build dynamic SQL query
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      conditions.push(`expense_category = $${paramIndex++}`);
      params.push(category);
    }
    if (status && status !== 'all') {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (hijri_month) {
      conditions.push(`hijri_month = $${paramIndex++}`);
      params.push(parseInt(hijri_month));
    }
    if (hijri_year) {
      conditions.push(`hijri_year = $${paramIndex++}`);
      params.push(parseInt(hijri_year));
    }
    if (date_from) {
      conditions.push(`expense_date >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`expense_date <= $${paramIndex++}`);
      params.push(date_to);
    }
    if (search) {
      conditions.push(`(title_ar ILIKE $${paramIndex} OR title_en ILIKE $${paramIndex} OR paid_to ILIKE $${paramIndex} OR receipt_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const orderClause = sort_by === 'hijri'
      ? 'ORDER BY hijri_year DESC, hijri_month DESC, hijri_day DESC'
      : 'ORDER BY expense_date DESC';

    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);
    params.push(parsedLimit, parsedOffset);

    const sql = `SELECT * FROM expenses ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

    // PARALLEL: Run security check and main query together
    const [suspiciousResult, queryResult] = await Promise.all([
      checkSuspiciousActivity(userId).catch(() => ({ should_block: false })),
      query(sql, params)
    ]);

    // Check suspicious activity
    if (suspiciousResult.should_block) {
      logFinancialAccess(userId, 'BLOCKED', 'expenses_view', userRole, { reason: 'Suspicious activity' }, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Access temporarily blocked due to suspicious activity',
        code: 'SUSPICIOUS_ACTIVITY_BLOCK'
      });
    }

    const expenses = queryResult.rows;

    // Fire-and-forget logging
    logFinancialAccess(userId, 'GRANTED', 'expenses_view', userRole, {}, req.ip).catch(() => {});

    // Pre-calculate date once
    const now = new Date();
    const nowTime = now.getTime();

    // Enhanced expense data
    const enhancedExpenses = (expenses || []).map(expense => {
      const createdAt = new Date(expense.created_at);
      const daysSinceCreation = Math.ceil((nowTime - createdAt.getTime()) / 86400000);
      const isPending = expense.status === 'pending';

      return {
        ...expense,
        hijri_formatted: HijriDateManager.formatHijriDisplay(expense.hijri_date_string),
        gregorian_formatted: new Date(expense.expense_date).toLocaleDateString('ar-SA'),
        approval_status_ar: getApprovalStatusArabic(expense.status),
        category_ar: getExpenseCategoryArabic(expense.expense_category),
        days_since_creation: daysSinceCreation,
        requires_attention: isPending && daysSinceCreation > 7,
        is_overdue: expense.due_date && new Date(expense.due_date) < now && isPending
      };
    });

    // OPTIMIZED: Single-pass summary
    const baseSummary = calculateSummaryFast(expenses);
    const summary = {
      ...baseSummary,
      approval_metrics: {
        average_approval_time: calculateAverageApprovalTime(expenses),
        pending_approval_value: baseSummary.pending_approval_value,
        items_requiring_attention: enhancedExpenses.filter(e => e.requires_attention).length
      }
    };

    // Async logging
    logFinancialAccess(userId, 'SUCCESS', 'expenses_view', userRole,
      { records_retrieved: expenses?.length || 0, total_value: summary.total_expenses }, req.ip
    ).catch(() => {});

    res.json({
      success: true,
      data: { expenses: enhancedExpenses, summary: summary },
      pagination: { limit: parsedLimit, offset: parsedOffset, total: expenses?.length || 0 },
      user_role: userRole,
      message: 'Expenses retrieved successfully',
      response_time_ms: Date.now() - startTime,
      fast_mode: useFastMode
    });
  } catch (error) {
    res.status(500).json({
      success: false, error: error.message, code: 'EXPENSE_RETRIEVAL_ERROR',
      response_time_ms: Date.now() - startTime
    });
  }
};

/**
 * Create new expense with auto-approval for Financial Managers
 * @route POST /api/expenses
 */
export const createExpense = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!hasFinancialAccess(userRole)) {
      logFinancialAccess(userId, 'DENIED', 'expense_creation', userRole, {}, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Access denied: Financial Manager role required for expense creation',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    const {
      expense_category, title_ar, title_en, description_ar, description_en: _description_en,
      amount, currency = 'SAR', expense_date, paid_to, paid_by, payment_method,
      receipt_number, invoice_number: _invoice_number, notes, approval_required = false, tags: _tags, attachments: _attachments
    } = req.body;

    if (!expense_category || !title_ar || !amount || !expense_date || !paid_to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Fund Balance Validation (Constitution VI.2)
    // Validate that expense amount doesn't exceed available fund balance
    const expenseAmount = parseFloat(amount);
    const balance = await getCurrentBalance();

    if (!balance) {
      log.error('[Expenses] Failed to get fund balance for validation');
      return res.status(500).json({
        success: false,
        error: 'فشل في التحقق من رصيد الصندوق',
        error_en: 'Failed to validate fund balance',
        code: 'BALANCE_VALIDATION_ERROR'
      });
    }

    const currentBalance = parseFloat(balance.current_balance);

    // Check if expense would cause negative balance
    if (expenseAmount > currentBalance) {
      log.warn('[Expenses] Expense rejected: insufficient balance', {
        userId,
        expenseAmount,
        currentBalance,
        shortfall: expenseAmount - currentBalance
      });

      return res.status(400).json({
        success: false,
        error: 'رصيد الصندوق غير كافي',
        error_en: 'Insufficient fund balance',
        code: 'INSUFFICIENT_BALANCE',
        balance_info: {
          current_balance: currentBalance,
          expense_amount: expenseAmount,
          shortfall: expenseAmount - currentBalance,
          currency: 'SAR'
        }
      });
    }

    const expenseDate = new Date(expense_date);
    const hijriData = HijriDateManager.convertToHijri(expenseDate);

    const expenseStatus = userRole === 'financial_manager' && !approval_required ? 'approved' : 'pending';
    const approvedBy = (userRole === 'financial_manager' && !approval_required) ? userId : null;
    const approvedAt = (userRole === 'financial_manager' && !approval_required) ? new Date().toISOString() : null;
    const approvalNotes = (userRole === 'financial_manager' && !approval_required) ? 'Auto-approved by Financial Manager' : null;

    const { rows } = await query(
      `INSERT INTO expenses (
        expense_category, title_ar, title_en, description_ar, amount, currency,
        expense_date, paid_to, paid_by, payment_method, receipt_number, notes,
        approval_required, status, created_by,
        hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
        approved_by, approved_at, approval_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING *`,
      [
        expense_category, title_ar, title_en || null, description_ar || null,
        parseFloat(amount), currency || 'SAR', expense_date, paid_to || null,
        paid_by || null, payment_method || null, receipt_number || null, notes || null,
        approval_required || false, expenseStatus, userId,
        hijriData.hijri_date_string, hijriData.hijri_year, hijriData.hijri_month,
        hijriData.hijri_day, hijriData.hijri_month_name,
        approvedBy, approvedAt, approvalNotes
      ]
    );

    const expense = rows[0];

    // Async audit trail
    createFinancialAuditTrail({
      userId, operation: 'expense_creation', resourceType: 'expense', resourceId: expense.id,
      newValue: expense, metadata: { amount: expense.amount, category: expense.expense_category, auto_approved: expense.status === 'approved' },
      ipAddress: req.ip
    }).catch(() => {});

    logFinancialAccess(userId, 'SUCCESS', 'expense_creation', userRole,
      { expense_id: expense.id, amount: expense.amount, auto_approved: expense.status === 'approved' }, req.ip
    ).catch(() => {});

    if (expense.status === 'pending') {
      sendExpenseApprovalNotification(expense).catch(() => {});
    }

    // Calculate balance after expense
    const balanceAfter = expense.status === 'approved'
      ? currentBalance - expenseAmount
      : currentBalance; // Pending expenses don't affect balance yet

    res.status(201).json({
      success: true,
      data: expense,
      balance_info: {
        balance_before: currentBalance,
        expense_amount: expenseAmount,
        balance_after: balanceAfter,
        currency: 'SAR',
        expense_status: expense.status
      },
      message: expense.status === 'approved' ? 'تم إنشاء المصروف والموافقة عليه' : 'تم إنشاء المصروف وهو في انتظار الموافقة',
      message_en: expense.status === 'approved' ? 'Expense created and auto-approved successfully' : 'Expense created successfully and pending approval'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, code: 'EXPENSE_CREATION_ERROR' });
  }
};

/**
 * Approve or reject expense with audit trail
 * @route PUT /api/expenses/:expenseId/approval
 */
export const approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { action, notes, force_approve = false } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole !== 'financial_manager') {
      logFinancialAccess(userId, 'DENIED', 'expense_approval', userRole, { expense_id: expenseId }, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Only Financial Managers can approve expenses',
        code: 'APPROVAL_UNAUTHORIZED'
      });
    }

    if (!['approve', 'reject', 'request_info'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be approve, reject, or request_info',
        code: 'INVALID_ACTION'
      });
    }

    const { rows: fetchRows } = await query(
      'SELECT * FROM expenses WHERE id = $1', [expenseId]
    );
    const currentExpense = fetchRows[0];

    if (!currentExpense) {
      return res.status(404).json({ success: false, error: 'Expense not found', code: 'EXPENSE_NOT_FOUND' });
    }

    if (currentExpense.status === 'approved' && !force_approve) {
      return res.status(400).json({ success: false, error: 'Expense already approved', code: 'ALREADY_APPROVED' });
    }

    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending_info';

    const { rows: updateRows } = await query(
      `UPDATE expenses SET status = $1, approved_by = $2, approved_at = $3, approval_notes = $4, updated_at = $5
       WHERE id = $6 RETURNING *`,
      [newStatus, userId, new Date().toISOString(), notes || '', new Date().toISOString(), expenseId]
    );
    const expense = updateRows[0];

    // Async audit
    createFinancialAuditTrail({
      userId, operation: `expense_${action}`, resourceType: 'expense', resourceId: expenseId,
      previousValue: currentExpense, newValue: expense,
      metadata: { action, notes, amount: expense.amount, previous_status: currentExpense.status, new_status: newStatus },
      ipAddress: req.ip
    }).catch(() => {});

    logFinancialAccess(userId, 'SUCCESS', 'expense_approval', userRole,
      { expense_id: expenseId, action, amount: expense.amount, new_status: newStatus }, req.ip
    ).catch(() => {});

    sendExpenseStatusNotification(expense, action).catch(() => {});

    res.json({
      success: true,
      data: expense,
      message: `Expense ${action}${action === 'approve' ? 'd' : action === 'reject' ? 'ed' : ''} successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, code: 'EXPENSE_APPROVAL_ERROR' });
  }
};

/**
 * Update expense details
 * @route PUT /api/expenses/:expenseId
 */
export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const validation = await validateFinancialOperation(userId, 'expense_update', expenseId);
    if (!validation.valid) {
      logFinancialAccess(userId, 'DENIED', 'expense_update', userRole, { expense_id: expenseId, reason: validation.reason }, req.ip).catch(() => {});
      return res.status(403).json({ success: false, error: validation.reason, code: validation.code });
    }

    const { rows: fetchRows } = await query(
      'SELECT * FROM expenses WHERE id = $1', [expenseId]
    );
    const currentExpense = fetchRows[0];

    if (!currentExpense) {
      return res.status(404).json({ success: false, error: 'Expense not found', code: 'EXPENSE_NOT_FOUND' });
    }

    const updateData = { ...req.body, updated_at: new Date().toISOString(), updated_by: userId };

    if (updateData.expense_date) {
      const hijriData = HijriDateManager.convertToHijri(new Date(updateData.expense_date));
      updateData.hijri_date_string = hijriData.hijri_date_string;
      updateData.hijri_year = hijriData.hijri_year;
      updateData.hijri_month = hijriData.hijri_month;
      updateData.hijri_day = hijriData.hijri_day;
      updateData.hijri_month_name = hijriData.hijri_month_name;
    }

    // Build dynamic UPDATE SET clause
    const setClauses = [];
    const params = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(updateData)) {
      setClauses.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
    params.push(expenseId);

    const { rows: updateRows } = await query(
      `UPDATE expenses SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    const expense = updateRows[0];

    createFinancialAuditTrail({
      userId, operation: 'expense_update', resourceType: 'expense', resourceId: expenseId,
      previousValue: currentExpense, newValue: expense,
      metadata: { fields_updated: Object.keys(req.body), amount_changed: currentExpense.amount !== expense.amount },
      ipAddress: req.ip
    }).catch(() => {});

    logFinancialAccess(userId, 'SUCCESS', 'expense_update', userRole, { expense_id: expenseId }, req.ip).catch(() => {});

    res.json({ success: true, data: expense, message: 'Expense updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, code: 'EXPENSE_UPDATE_ERROR' });
  }
};

/**
 * Get expense by ID with full details
 * @route GET /api/expenses/:expenseId
 */
export const getExpenseById = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const validation = await validateFinancialOperation(userId, 'expense_view', expenseId);
    if (!validation.valid) {
      logFinancialAccess(userId, 'DENIED', 'expense_view_single', userRole, { expense_id: expenseId }, req.ip).catch(() => {});
      return res.status(403).json({ success: false, error: validation.reason, code: validation.code });
    }

    const { rows: expenseRows } = await query(
      'SELECT * FROM expenses WHERE id = $1', [expenseId]
    );
    const expense = expenseRows[0];

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found', code: 'EXPENSE_NOT_FOUND' });
    }

    const { rows: auditHistory } = await query(
      `SELECT * FROM financial_audit_trail WHERE resource_type = $1 AND resource_id = $2 ORDER BY created_at DESC`,
      ['expense', expenseId]
    );

    const enhancedExpense = {
      ...expense,
      hijri_formatted: HijriDateManager.formatHijriDisplay(expense.hijri_date_string),
      gregorian_formatted: new Date(expense.expense_date).toLocaleDateString('ar-SA'),
      approval_status_ar: getApprovalStatusArabic(expense.status),
      category_ar: getExpenseCategoryArabic(expense.expense_category),
      audit_history: auditHistory || []
    };

    logFinancialAccess(userId, 'SUCCESS', 'expense_view_single', userRole, { expense_id: expenseId }, req.ip).catch(() => {});

    res.json({ success: true, data: enhancedExpense, message: 'Expense retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, code: 'EXPENSE_RETRIEVAL_ERROR' });
  }
};

/**
 * Delete expense (soft delete)
 * @route DELETE /api/expenses/:expenseId
 */
export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole !== 'financial_manager') {
      logFinancialAccess(userId, 'DENIED', 'expense_deletion', userRole, { expense_id: expenseId }, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Only Financial Managers can delete expenses',
        code: 'DELETION_UNAUTHORIZED'
      });
    }

    const { rows: fetchRows } = await query(
      'SELECT * FROM expenses WHERE id = $1', [expenseId]
    );
    const currentExpense = fetchRows[0];

    if (!currentExpense) {
      return res.status(404).json({ success: false, error: 'Expense not found', code: 'EXPENSE_NOT_FOUND' });
    }

    const { rows: deleteRows } = await query(
      `UPDATE expenses SET status = 'deleted', deleted_by = $1, deleted_at = $2, updated_at = $3
       WHERE id = $4 RETURNING *`,
      [userId, new Date().toISOString(), new Date().toISOString(), expenseId]
    );
    const expense = deleteRows[0];

    createFinancialAuditTrail({
      userId, operation: 'expense_deletion', resourceType: 'expense', resourceId: expenseId,
      previousValue: currentExpense, newValue: { status: 'deleted' },
      metadata: { amount: currentExpense.amount, category: currentExpense.expense_category },
      ipAddress: req.ip
    }).catch(() => {});

    logFinancialAccess(userId, 'SUCCESS', 'expense_deletion', userRole, { expense_id: expenseId, amount: currentExpense.amount }, req.ip).catch(() => {});

    res.json({ success: true, message: 'Expense deleted successfully', data: expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, code: 'EXPENSE_DELETION_ERROR' });
  }
};

/**
 * Get expense statistics
 * @route GET /api/expenses/statistics
 */
export const getExpenseStatistics = async (req, res) => {
  const startTime = Date.now();
  try {
    const { period = 'month', hijri_year, hijri_month } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!hasFinancialAccess(userRole)) {
      logFinancialAccess(userId, 'DENIED', 'expense_statistics', userRole, {}, req.ip).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Access denied: Financial Manager role required',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    const currentHijri = HijriDateManager.getCurrentHijriDate();
    const filterYear = hijri_year || currentHijri.hijri_year;
    const filterMonth = hijri_month || currentHijri.hijri_month;

    const conditions = ["status != 'deleted'"];
    const params = [];
    let paramIndex = 1;

    if (period === 'month') {
      conditions.push(`hijri_year = $${paramIndex++}`);
      params.push(filterYear);
      conditions.push(`hijri_month = $${paramIndex++}`);
      params.push(filterMonth);
    } else if (period === 'year') {
      conditions.push(`hijri_year = $${paramIndex++}`);
      params.push(filterYear);
    }

    const { rows: expenses } = await query(
      `SELECT * FROM expenses WHERE ${conditions.join(' AND ')}`, params
    );

    // Single-pass statistics calculation
    const stats = calculateSummaryFast(expenses);

    // Build by_status in single pass
    const byStatus = { pending: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 } };
    const paymentMethods = {};

    for (const e of (expenses || [])) {
      const amount = parseFloat(e.amount || 0);
      if (byStatus[e.status]) {
        byStatus[e.status].count++;
        byStatus[e.status].amount += amount;
      }
      const method = e.payment_method || 'unspecified';
      if (!paymentMethods[method]) { paymentMethods[method] = { count: 0, amount: 0 }; }
      paymentMethods[method].count++;
      paymentMethods[method].amount += amount;
    }

    // Add category names and percentages
    const byCategory = {};
    for (const [cat, data] of Object.entries(stats.by_category)) {
      byCategory[cat] = {
        name_ar: getExpenseCategoryArabic(cat),
        count: data.count,
        amount: data.total,
        percentage: stats.total_expenses > 0 ? ((data.total / stats.total_expenses) * 100).toFixed(2) : '0.00'
      };
    }

    const topExpenses = (expenses || [])
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 5)
      .map(e => ({ id: e.id, title: e.title_ar, amount: e.amount, category: e.expense_category, date: e.expense_date, hijri_date: e.hijri_date_string }));

    const statistics = {
      period: { type: period, hijri_year: filterYear, hijri_month: filterMonth, hijri_month_name: HijriDateManager.getMonthProperties(filterMonth).name_ar },
      totals: { total_expenses: stats.total_expenses, total_count: expenses?.length || 0, average_expense: stats.average_amount },
      by_status: byStatus,
      by_category: byCategory,
      payment_methods: paymentMethods,
      top_expenses: topExpenses
    };

    logFinancialAccess(userId, 'SUCCESS', 'expense_statistics', userRole, { period }, req.ip).catch(() => {});

    res.json({
      success: true,
      data: statistics,
      message: 'Expense statistics generated successfully',
      response_time_ms: Date.now() - startTime
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, code: 'STATISTICS_ERROR', response_time_ms: Date.now() - startTime });
  }
};

// Helper functions
const getApprovalStatusArabic = (status) => {
  const statusMap = {
    'pending': 'في انتظار الموافقة',
    'approved': 'معتمد',
    'paid': 'مدفوع',
    'rejected': 'مرفوض',
    'pending_info': 'في انتظار المعلومات',
    'deleted': 'محذوف'
  };
  return statusMap[status] || status;
};

const getExpenseCategoryArabic = (category) => {
  const categoryMap = {
    'operational': 'تشغيلية',
    'events': 'مناسبات',
    'initiatives': 'مبادرات',
    'maintenance': 'صيانة',
    'administrative': 'إدارية',
    'emergency': 'طوارئ',
    'charity': 'خيرية',
    'educational': 'تعليمية',
    'other': 'أخرى'
  };
  return categoryMap[category] || category;
};

const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil(Math.abs(end - start) / 86400000);
};

const calculateAverageApprovalTime = (expenses) => {
  const approvedExpenses = (expenses || []).filter(e => e.status === 'approved' && e.approved_at);
  if (approvedExpenses.length === 0) { return 0; }
  const totalDays = approvedExpenses.reduce((sum, e) => sum + calculateDaysBetween(e.created_at, e.approved_at), 0);
  return Math.round(totalDays / approvedExpenses.length);
};

const sendExpenseApprovalNotification = (expense) => {
  log.info('Sending approval notification for expense', { expense_id: expense.id });
};

const sendExpenseStatusNotification = (expense, action) => {
  log.info('Sending expense status notification', { action, expense_id: expense.id });
};

export default {
  getExpenses,
  createExpense,
  updateExpense,
  approveExpense,
  getExpenseById,
  deleteExpense,
  getExpenseStatistics
};
