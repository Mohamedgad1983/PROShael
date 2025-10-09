/**
 * Expenses Controller with Advanced Financial Management
 * Handles expense tracking, approval workflows, and role-based access
 */

import { supabase } from '../config/database.js';
import {
  hasFinancialAccess,
  logFinancialAccess,
  validateFinancialOperation,
  createFinancialAuditTrail,
  checkSuspiciousActivity
} from '../utils/accessControl.js';
import { HijriDateManager } from '../utils/hijriDateUtils.js';
import { log } from '../utils/logger.js';

/**
 * Get all expenses with comprehensive filtering and role-based access
 * @route GET /api/expenses
 */
export const getExpenses = async (req, res) => {
  try {
    const {
      category,
      status,
      date_from,
      date_to,
      hijri_month,
      hijri_year,
      limit = 50,
      offset = 0,
      search,
      sort_by = 'hijri'
    } = req.query;

    const userRole = req.user.role;
    const userId = req.user.id;

    // CRITICAL: Role-based access control
    if (!hasFinancialAccess(userRole)) {
      await logFinancialAccess(
        userId,
        'DENIED',
        'expenses_view',
        userRole,
        {},
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied: Financial Manager role required',
        code: 'INSUFFICIENT_FINANCIAL_PRIVILEGES'
      });
    }

    // Check for suspicious activity
    const suspiciousCheck = await checkSuspiciousActivity(userId);
    if (suspiciousCheck.should_block) {
      await logFinancialAccess(
        userId,
        'BLOCKED',
        'expenses_view',
        userRole,
        { reason: 'Suspicious activity detected' },
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: 'Access temporarily blocked due to suspicious activity',
        code: 'SUSPICIOUS_ACTIVITY_BLOCK'
      });
    }

    await logFinancialAccess(userId, 'GRANTED', 'expenses_view', userRole, {}, req.ip);

    let query = supabase
      .from('expenses')
      .select(`
        *,
        paid_by_member:members!paid_by(
          id, full_name, membership_number, phone, email
        ),
        approved_by_user:users!approved_by(
          id, full_name, email, role
        ),
        created_by_user:users!created_by(
          id, full_name, email, role
        )
      `)
      .range(offset, offset + limit - 1);

    // Apply Hijri-primary sorting
    if (sort_by === 'hijri') {
      query = query
        .order('hijri_year', { ascending: false })
        .order('hijri_month', { ascending: false })
        .order('hijri_day', { ascending: false });
    } else {
      query = query.order('expense_date', { ascending: false });
    }

    // Apply filters
    if (category && category !== 'all') query = query.eq('expense_category', category);
    if (status && status !== 'all') query = query.eq('status', status);
    if (hijri_month) query = query.eq('hijri_month', parseInt(hijri_month));
    if (hijri_year) query = query.eq('hijri_year', parseInt(hijri_year));
    if (date_from) query = query.gte('expense_date', date_from);
    if (date_to) query = query.lte('expense_date', date_to);

    if (search) {
      query = query.or(`
        title_ar.ilike.%${search}%,
        title_en.ilike.%${search}%,
        paid_to.ilike.%${search}%,
        receipt_number.ilike.%${search}%
      `);
    }

    const { data: expenses, error } = await query;
    if (error) throw error;

    // Enhanced expense data with Hijri formatting and analysis
    const enhancedExpenses = (expenses || []).map(expense => ({
      ...expense,
      hijri_formatted: HijriDateManager.formatHijriDisplay(expense.hijri_date_string),
      gregorian_formatted: new Date(expense.expense_date).toLocaleDateString('ar-SA'),
      approval_status_ar: getApprovalStatusArabic(expense.status),
      category_ar: getExpenseCategoryArabic(expense.expense_category),
      days_since_creation: calculateDaysBetween(expense.created_at, new Date()),
      requires_attention: expense.status === 'pending' &&
                         calculateDaysBetween(expense.created_at, new Date()) > 7,
      is_overdue: expense.due_date && new Date(expense.due_date) < new Date() &&
                  expense.status === 'pending'
    }));

    // Calculate comprehensive summary statistics
    const summary = {
      total_expenses: expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0,
      pending_count: expenses?.filter(e => e.status === 'pending').length || 0,
      approved_count: expenses?.filter(e => e.status === 'approved').length || 0,
      paid_count: expenses?.filter(e => e.status === 'paid').length || 0,
      rejected_count: expenses?.filter(e => e.status === 'rejected').length || 0,
      average_amount: expenses?.length > 0
        ? expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) / expenses.length
        : 0,

      // Category breakdown
      by_category: expenses?.reduce((acc, e) => {
        const cat = e.expense_category || 'other';
        if (!acc[cat]) acc[cat] = { count: 0, total: 0 };
        acc[cat].count++;
        acc[cat].total += parseFloat(e.amount || 0);
        return acc;
      }, {}),

      // Approval metrics
      approval_metrics: {
        average_approval_time: calculateAverageApprovalTime(expenses),
        pending_approval_value: expenses
          ?.filter(e => e.status === 'pending')
          ?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0,
        items_requiring_attention: enhancedExpenses.filter(e => e.requires_attention).length
      }
    };

    await logFinancialAccess(
      userId,
      'SUCCESS',
      'expenses_view',
      userRole,
      {
        records_retrieved: expenses?.length || 0,
        total_value: summary.total_expenses
      },
      req.ip
    );

    res.json({
      success: true,
      data: {
        expenses: enhancedExpenses,  // Wrapped in expenses key for backward compatibility
        summary: summary
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: expenses?.length || 0
      },
      user_role: userRole,
      message: 'Expenses retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXPENSE_RETRIEVAL_ERROR'
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

    // Role-based access control
    if (!hasFinancialAccess(userRole)) {
      await logFinancialAccess(
        userId,
        'DENIED',
        'expense_creation',
        userRole,
        {},
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied: Financial Manager role required for expense creation',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    const {
      expense_category,
      title_ar,
      title_en,
      description_ar,
      description_en,
      amount,
      currency = 'SAR',
      expense_date,
      paid_to,
      paid_by,
      payment_method,
      receipt_number,
      invoice_number,
      notes,
      approval_required = false,
      tags,
      attachments
    } = req.body;

    // Validate required fields
    if (!expense_category || !title_ar || !amount || !expense_date || !paid_to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Auto-generate Hijri dates
    const expenseDate = new Date(expense_date);
    const hijriData = HijriDateManager.convertToHijri(expenseDate);

    const expenseData = {
      expense_category,
      title_ar,
      title_en,
      description_ar,
      description_en,
      amount: parseFloat(amount),
      currency,
      expense_date,
      paid_to,
      paid_by: paid_by || userId,
      payment_method,
      receipt_number,
      invoice_number,
      notes,
      tags: tags || [],
      attachments: attachments || [],
      approval_required,
      status: userRole === 'financial_manager' && !approval_required ? 'approved' : 'pending',
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // Hijri date fields
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name
    };

    // Auto-approve for Financial Managers when not explicitly required
    if (userRole === 'financial_manager' && !approval_required) {
      expenseData.approved_by = userId;
      expenseData.approved_at = new Date().toISOString();
      expenseData.approval_notes = 'Auto-approved by Financial Manager';
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert([expenseData])
      .select(`
        *,
        paid_by_member:members!paid_by(full_name, membership_number),
        approved_by_user:users!approved_by(full_name, role),
        created_by_user:users!created_by(full_name, role)
      `)
      .single();

    if (error) throw error;

    // Create audit trail
    await createFinancialAuditTrail({
      userId: userId,
      operation: 'expense_creation',
      resourceType: 'expense',
      resourceId: expense.id,
      newValue: expense,
      metadata: {
        amount: expense.amount,
        category: expense.expense_category,
        auto_approved: expense.status === 'approved'
      },
      ipAddress: req.ip
    });

    await logFinancialAccess(
      userId,
      'SUCCESS',
      'expense_creation',
      userRole,
      {
        expense_id: expense.id,
        amount: expense.amount,
        auto_approved: expense.status === 'approved'
      },
      req.ip
    );

    // Send notification for approval if needed
    if (expense.status === 'pending') {
      await sendExpenseApprovalNotification(expense);
    }

    res.status(201).json({
      success: true,
      data: expense,
      message: expense.status === 'approved'
        ? 'Expense created and auto-approved successfully'
        : 'Expense created successfully and pending approval'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXPENSE_CREATION_ERROR'
    });
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

    // Only Financial Managers can approve expenses
    if (userRole !== 'financial_manager') {
      await logFinancialAccess(
        userId,
        'DENIED',
        'expense_approval',
        userRole,
        { expense_id: expenseId },
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: 'Only Financial Managers can approve expenses',
        code: 'APPROVAL_UNAUTHORIZED'
      });
    }

    // Validate action
    if (!['approve', 'reject', 'request_info'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be approve, reject, or request_info',
        code: 'INVALID_ACTION'
      });
    }

    // Get current expense
    const { data: currentExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (fetchError || !currentExpense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Check if expense is already processed
    if (currentExpense.status === 'approved' && !force_approve) {
      return res.status(400).json({
        success: false,
        error: 'Expense already approved',
        code: 'ALREADY_APPROVED'
      });
    }

    const newStatus = action === 'approve' ? 'approved' :
                     action === 'reject' ? 'rejected' :
                     'pending_info';

    const updateData = {
      status: newStatus,
      approved_by: userId,
      approved_at: new Date().toISOString(),
      approval_notes: notes || '',
      updated_at: new Date().toISOString()
    };

    const { data: expense, error: updateError } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select(`
        *,
        paid_by_member:members!paid_by(full_name, phone, email),
        approved_by_user:users!approved_by(full_name, role),
        created_by_user:users!created_by(full_name, email)
      `)
      .single();

    if (updateError) throw updateError;

    // Create detailed audit trail
    await createFinancialAuditTrail({
      userId: userId,
      operation: `expense_${action}`,
      resourceType: 'expense',
      resourceId: expenseId,
      previousValue: currentExpense,
      newValue: expense,
      metadata: {
        action: action,
        notes: notes,
        amount: expense.amount,
        previous_status: currentExpense.status,
        new_status: newStatus
      },
      ipAddress: req.ip
    });

    await logFinancialAccess(
      userId,
      'SUCCESS',
      'expense_approval',
      userRole,
      {
        expense_id: expenseId,
        action: action,
        amount: expense.amount,
        new_status: newStatus
      },
      req.ip
    );

    // Send notification about approval/rejection
    await sendExpenseStatusNotification(expense, action);

    res.json({
      success: true,
      data: expense,
      message: `Expense ${action}${action === 'approve' ? 'd' : action === 'reject' ? 'ed' : ''} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXPENSE_APPROVAL_ERROR'
    });
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

    // Validate financial operation
    const validation = await validateFinancialOperation(userId, 'expense_update', expenseId);
    if (!validation.valid) {
      await logFinancialAccess(
        userId,
        'DENIED',
        'expense_update',
        userRole,
        { expense_id: expenseId, reason: validation.reason },
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: validation.reason,
        code: validation.code
      });
    }

    // Get current expense for audit trail
    const { data: currentExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (fetchError || !currentExpense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
      updated_by: userId
    };

    // If expense date is being updated, recalculate Hijri dates
    if (updateData.expense_date) {
      const hijriData = HijriDateManager.convertToHijri(new Date(updateData.expense_date));
      updateData.hijri_date_string = hijriData.hijri_date_string;
      updateData.hijri_year = hijriData.hijri_year;
      updateData.hijri_month = hijriData.hijri_month;
      updateData.hijri_day = hijriData.hijri_day;
      updateData.hijri_month_name = hijriData.hijri_month_name;
    }

    const { data: expense, error: updateError } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select(`
        *,
        paid_by_member:members!paid_by(full_name, membership_number),
        approved_by_user:users!approved_by(full_name, role),
        created_by_user:users!created_by(full_name, role)
      `)
      .single();

    if (updateError) throw updateError;

    // Create audit trail
    await createFinancialAuditTrail({
      userId: userId,
      operation: 'expense_update',
      resourceType: 'expense',
      resourceId: expenseId,
      previousValue: currentExpense,
      newValue: expense,
      metadata: {
        fields_updated: Object.keys(req.body),
        amount_changed: currentExpense.amount !== expense.amount
      },
      ipAddress: req.ip
    });

    await logFinancialAccess(
      userId,
      'SUCCESS',
      'expense_update',
      userRole,
      { expense_id: expenseId },
      req.ip
    );

    res.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXPENSE_UPDATE_ERROR'
    });
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

    // Validate financial operation
    const validation = await validateFinancialOperation(userId, 'expense_view', expenseId);
    if (!validation.valid) {
      await logFinancialAccess(
        userId,
        'DENIED',
        'expense_view_single',
        userRole,
        { expense_id: expenseId },
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: validation.reason,
        code: validation.code
      });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .select(`
        *,
        paid_by_member:members!paid_by(
          id, full_name, membership_number, phone, email
        ),
        approved_by_user:users!approved_by(
          id, full_name, email, role
        ),
        created_by_user:users!created_by(
          id, full_name, email, role
        )
      `)
      .eq('id', expenseId)
      .single();

    if (error || !expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Get audit history for this expense
    const { data: auditHistory } = await supabase
      .from('financial_audit_trail')
      .select(`
        *,
        user:users!user_id(full_name, role)
      `)
      .eq('resource_type', 'expense')
      .eq('resource_id', expenseId)
      .order('created_at', { ascending: false });

    // Enhanced expense data
    const enhancedExpense = {
      ...expense,
      hijri_formatted: HijriDateManager.formatHijriDisplay(expense.hijri_date_string),
      gregorian_formatted: new Date(expense.expense_date).toLocaleDateString('ar-SA'),
      approval_status_ar: getApprovalStatusArabic(expense.status),
      category_ar: getExpenseCategoryArabic(expense.expense_category),
      audit_history: auditHistory || []
    };

    await logFinancialAccess(
      userId,
      'SUCCESS',
      'expense_view_single',
      userRole,
      { expense_id: expenseId },
      req.ip
    );

    res.json({
      success: true,
      data: enhancedExpense,
      message: 'Expense retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXPENSE_RETRIEVAL_ERROR'
    });
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

    // Only Financial Managers can delete expenses
    if (userRole !== 'financial_manager') {
      await logFinancialAccess(
        userId,
        'DENIED',
        'expense_deletion',
        userRole,
        { expense_id: expenseId },
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: 'Only Financial Managers can delete expenses',
        code: 'DELETION_UNAUTHORIZED'
      });
    }

    // Get current expense for audit
    const { data: currentExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (fetchError || !currentExpense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      });
    }

    // Soft delete by updating status
    const { data: expense, error: deleteError } = await supabase
      .from('expenses')
      .update({
        status: 'deleted',
        deleted_by: userId,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (deleteError) throw deleteError;

    // Create audit trail
    await createFinancialAuditTrail({
      userId: userId,
      operation: 'expense_deletion',
      resourceType: 'expense',
      resourceId: expenseId,
      previousValue: currentExpense,
      newValue: { status: 'deleted' },
      metadata: {
        amount: currentExpense.amount,
        category: currentExpense.expense_category
      },
      ipAddress: req.ip
    });

    await logFinancialAccess(
      userId,
      'SUCCESS',
      'expense_deletion',
      userRole,
      {
        expense_id: expenseId,
        amount: currentExpense.amount
      },
      req.ip
    );

    res.json({
      success: true,
      message: 'Expense deleted successfully',
      data: expense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXPENSE_DELETION_ERROR'
    });
  }
};

/**
 * Get expense statistics
 * @route GET /api/expenses/statistics
 */
export const getExpenseStatistics = async (req, res) => {
  try {
    const { period = 'month', hijri_year, hijri_month } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!hasFinancialAccess(userRole)) {
      await logFinancialAccess(
        userId,
        'DENIED',
        'expense_statistics',
        userRole,
        {},
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied: Financial Manager role required',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Build date filters
    const currentHijri = HijriDateManager.getCurrentHijriDate();
    const filterYear = hijri_year || currentHijri.hijri_year;
    const filterMonth = hijri_month || currentHijri.hijri_month;

    // Get expenses for the period
    let query = supabase
      .from('expenses')
      .select('*')
      .neq('status', 'deleted');

    if (period === 'month') {
      query = query
        .eq('hijri_year', filterYear)
        .eq('hijri_month', filterMonth);
    } else if (period === 'year') {
      query = query.eq('hijri_year', filterYear);
    }

    const { data: expenses, error } = await query;
    if (error) throw error;

    // Calculate statistics
    const statistics = {
      period: {
        type: period,
        hijri_year: filterYear,
        hijri_month: filterMonth,
        hijri_month_name: HijriDateManager.getMonthProperties(filterMonth).name_ar
      },

      totals: {
        total_expenses: expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0,
        total_count: expenses?.length || 0,
        average_expense: expenses?.length > 0
          ? expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) / expenses.length
          : 0
      },

      by_status: {
        pending: {
          count: expenses?.filter(e => e.status === 'pending').length || 0,
          amount: expenses?.filter(e => e.status === 'pending')
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
        },
        approved: {
          count: expenses?.filter(e => e.status === 'approved').length || 0,
          amount: expenses?.filter(e => e.status === 'approved')
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
        },
        paid: {
          count: expenses?.filter(e => e.status === 'paid').length || 0,
          amount: expenses?.filter(e => e.status === 'paid')
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
        },
        rejected: {
          count: expenses?.filter(e => e.status === 'rejected').length || 0,
          amount: expenses?.filter(e => e.status === 'rejected')
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
        }
      },

      by_category: expenses?.reduce((acc, e) => {
        const cat = e.expense_category || 'other';
        if (!acc[cat]) {
          acc[cat] = {
            name_ar: getExpenseCategoryArabic(cat),
            count: 0,
            amount: 0,
            percentage: 0
          };
        }
        acc[cat].count++;
        acc[cat].amount += parseFloat(e.amount || 0);
        return acc;
      }, {}),

      payment_methods: expenses?.reduce((acc, e) => {
        const method = e.payment_method || 'unspecified';
        if (!acc[method]) {
          acc[method] = {
            count: 0,
            amount: 0
          };
        }
        acc[method].count++;
        acc[method].amount += parseFloat(e.amount || 0);
        return acc;
      }, {}),

      top_expenses: expenses
        ?.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        ?.slice(0, 5)
        ?.map(e => ({
          id: e.id,
          title: e.title_ar,
          amount: e.amount,
          category: e.expense_category,
          date: e.expense_date,
          hijri_date: e.hijri_date_string
        }))
    };

    // Calculate percentages
    Object.keys(statistics.by_category || {}).forEach(cat => {
      statistics.by_category[cat].percentage =
        (statistics.by_category[cat].amount / statistics.totals.total_expenses * 100).toFixed(2);
    });

    await logFinancialAccess(
      userId,
      'SUCCESS',
      'expense_statistics',
      userRole,
      { period: period },
      req.ip
    );

    res.json({
      success: true,
      data: statistics,
      message: 'Expense statistics generated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'STATISTICS_ERROR'
    });
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
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const calculateAverageApprovalTime = (expenses) => {
  const approvedExpenses = (expenses || []).filter(e =>
    e.status === 'approved' && e.approved_at
  );

  if (approvedExpenses.length === 0) return 0;

  const totalDays = approvedExpenses.reduce((sum, e) => {
    return sum + calculateDaysBetween(e.created_at, e.approved_at);
  }, 0);

  return Math.round(totalDays / approvedExpenses.length);
};

const sendExpenseApprovalNotification = async (expense) => {
  // Implementation for sending notifications
  // This would integrate with your notification system
  log.info('Sending approval notification for expense', { expense_id: expense.id });
};

const sendExpenseStatusNotification = async (expense, action) => {
  // Implementation for sending status change notifications
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