/**
 * @fileoverview Balance Adjustment Controller
 * @description Handles member balance adjustments with full audit trail
 * @version 1.0.0
 * @module controllers/balanceAdjustmentController
 *
 * @requires ../config/database.js - Supabase client
 * @requires ../utils/logger.js - Logging utility
 *
 * @features
 * - Adjust member balances (credit/debit/correction)
 * - Target specific years and months for historical adjustments
 * - Complete audit trail logging
 * - Bulk restore functionality
 * - Data propagation to members and subscriptions tables
 *
 * @roles
 * - super_admin: Full access to all adjustments
 * - financial_manager: Can make balance adjustments
 */

import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

// Business constants
const MONTHLY_SUBSCRIPTION = 50;
const MAX_BALANCE = 3000; // 60 months max
const CURRENT_YEAR = new Date().getFullYear();
const MIN_ADJUSTMENT_YEAR = CURRENT_YEAR - 5; // Allow adjustments for past 5 years

/**
 * Adjust member balance with audit trail
 * POST /api/balance-adjustments
 */
export const adjustBalance = async (req, res) => {
  try {
    const {
      member_id,
      adjustment_type,
      amount,
      target_year,
      target_month,
      reason,
      notes
    } = req.body;

    // Validation
    if (!member_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف العضو مطلوب',
        message_en: 'Member ID is required'
      });
    }

    if (!adjustment_type || !['credit', 'debit', 'correction', 'initial_balance', 'yearly_payment'].includes(adjustment_type)) {
      return res.status(400).json({
        success: false,
        error: 'نوع التعديل غير صالح',
        message_en: 'Invalid adjustment type. Must be: credit, debit, correction, initial_balance, or yearly_payment'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'المبلغ يجب أن يكون أكبر من صفر',
        message_en: 'Amount must be greater than zero'
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'سبب التعديل مطلوب (5 أحرف على الأقل)',
        message_en: 'Reason is required (at least 5 characters)'
      });
    }

    // Validate target year if provided
    if (target_year) {
      if (target_year < MIN_ADJUSTMENT_YEAR || target_year > CURRENT_YEAR) {
        return res.status(400).json({
          success: false,
          error: `السنة يجب أن تكون بين ${MIN_ADJUSTMENT_YEAR} و ${CURRENT_YEAR}`,
          message_en: `Year must be between ${MIN_ADJUSTMENT_YEAR} and ${CURRENT_YEAR}`
        });
      }
    }

    // Validate target month if provided
    if (target_month && (target_month < 1 || target_month > 12)) {
      return res.status(400).json({
        success: false,
        error: 'الشهر يجب أن يكون بين 1 و 12',
        message_en: 'Month must be between 1 and 12'
      });
    }

    // Get current member data
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, membership_number, balance, payment_2021, payment_2022, payment_2023, payment_2024, payment_2025')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      log.error('Balance adjustment: Member not found', { member_id, error: memberError?.message });
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود',
        message_en: 'Member not found'
      });
    }

    // Calculate new balance
    const previousBalance = parseFloat(member.balance) || 0;
    let newBalance;

    switch (adjustment_type) {
      case 'credit':
      case 'initial_balance':
      case 'yearly_payment':
        newBalance = previousBalance + parseFloat(amount);
        break;
      case 'debit':
        newBalance = previousBalance - parseFloat(amount);
        break;
      case 'correction':
        newBalance = parseFloat(amount); // Direct set to the amount
        break;
      default:
        newBalance = previousBalance;
    }

    // Cap balance at max
    if (newBalance > MAX_BALANCE) {
      newBalance = MAX_BALANCE;
    }

    // Prepare member update data
    const memberUpdateData = {
      balance: newBalance,
      current_balance: newBalance,
      total_balance: newBalance,
      updated_at: new Date().toISOString()
    };

    // If target year is specified, also update the yearly payment field
    if (target_year && target_year >= 2021 && target_year <= 2025) {
      const yearField = `payment_${target_year}`;
      const currentYearPayment = parseFloat(member[yearField]) || 0;

      if (adjustment_type === 'credit' || adjustment_type === 'yearly_payment') {
        memberUpdateData[yearField] = currentYearPayment + parseFloat(amount);
      } else if (adjustment_type === 'debit') {
        memberUpdateData[yearField] = Math.max(0, currentYearPayment - parseFloat(amount));
      } else if (adjustment_type === 'correction') {
        memberUpdateData[yearField] = parseFloat(amount);
      }
    }

    // Start transaction: Update member balance
    const { error: updateMemberError } = await supabase
      .from('members')
      .update(memberUpdateData)
      .eq('id', member_id);

    if (updateMemberError) {
      throw updateMemberError;
    }

    // Update subscription if exists
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, current_balance')
      .eq('member_id', member_id)
      .single();

    if (subscription) {
      const monthsPaidAhead = Math.floor(newBalance / MONTHLY_SUBSCRIPTION);
      const nextPaymentDue = new Date();
      nextPaymentDue.setMonth(nextPaymentDue.getMonth() + monthsPaidAhead);

      await supabase
        .from('subscriptions')
        .update({
          current_balance: newBalance,
      current_balance: newBalance,
      total_balance: newBalance,
          months_paid_ahead: monthsPaidAhead,
          next_payment_due: nextPaymentDue.toISOString(),
          status: newBalance >= 0 ? 'active' : 'overdue',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }

    // Create audit record
    const auditRecord = {
      member_id,
      adjustment_type,
      amount: parseFloat(amount),
      previous_balance: previousBalance,
      new_balance: newBalance,
      current_balance: newBalance,
      total_balance: newBalance,
      target_year: target_year || null,
      target_month: target_month || null,
      reason,
      notes: notes || null,
      adjusted_by: req.user.id,
      adjusted_by_email: req.user.email,
      adjusted_by_role: req.user.role,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers['user-agent']
    };

    const { data: adjustment, error: auditError } = await supabase
      .from('balance_adjustments')
      .insert(auditRecord)
      .select()
      .single();

    if (auditError) {
      log.error('Balance adjustment: Failed to create audit record', { error: auditError.message });
      // Don't fail the request, balance was already updated
    }

    // Also log to financial_audit_trail for comprehensive tracking
    await supabase
      .from('financial_audit_trail')
      .insert({
        user_id: req.user.id,
        operation: 'BALANCE_ADJUSTMENT',
        resource_type: 'member_balance',
        resource_id: member_id,
        previous_value: { balance: previousBalance },
        new_value: { balance: newBalance, adjustment_type, amount },
        metadata: { reason, target_year, target_month, notes },
        ip_address: req.ip
      });

    log.info('Balance adjustment successful', {
      member_id,
      adjustment_type,
      amount,
      previousBalance,
      newBalance,
      adjusted_by: req.user.email
    });

    res.json({
      success: true,
      message: 'تم تعديل الرصيد بنجاح',
      message_en: 'Balance adjusted successfully',
      data: {
        adjustment_id: adjustment?.id,
        member_id,
        member_name: member.full_name,
        membership_number: member.membership_number,
        previous_balance: previousBalance,
        new_balance: newBalance,
      current_balance: newBalance,
      total_balance: newBalance,
        adjustment_type,
        amount: parseFloat(amount),
        target_year,
        target_month
      }
    });

  } catch (error) {
    log.error('Balance adjustment error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'فشل في تعديل الرصيد',
      message_en: 'Failed to adjust balance',
      details: error.message
    });
  }
};

/**
 * Get balance adjustment history for a member
 * GET /api/balance-adjustments/member/:memberId
 */
export const getMemberAdjustments = async (req, res) => {
  try {
    const { memberId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('balance_adjustments')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberId);

    // Get adjustments with pagination
    const { data: adjustments, error } = await supabase
      .from('balance_adjustments')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: adjustments || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    log.error('Get member adjustments error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب سجل التعديلات',
      message_en: 'Failed to fetch adjustment history'
    });
  }
};

/**
 * Get all balance adjustments with filters
 * GET /api/balance-adjustments
 */
export const getAllAdjustments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { adjustment_type, target_year, from_date, to_date } = req.query;

    // Build query
    let query = supabase
      .from('balance_adjustments')
      .select(`
        *,
        members:member_id (
          full_name,
          membership_number,
          phone
        )
      `, { count: 'exact' });

    // Apply filters
    if (adjustment_type) {
      query = query.eq('adjustment_type', adjustment_type);
    }
    if (target_year) {
      query = query.eq('target_year', parseInt(target_year));
    }
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    // Get total count
    const { count } = await query;

    // Get data with pagination
    const { data: adjustments, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: adjustments || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    log.error('Get all adjustments error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب التعديلات',
      message_en: 'Failed to fetch adjustments'
    });
  }
};

/**
 * Bulk restore balances from yearly payment fields
 * POST /api/balance-adjustments/bulk-restore
 */
export const bulkRestoreBalances = async (req, res) => {
  try {
    const { member_ids, restore_year, reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'سبب الاستعادة مطلوب',
        message_en: 'Restore reason is required'
      });
    }

    // Get members to restore
    let query = supabase
      .from('members')
      .select('id, full_name, membership_number, balance, payment_2021, payment_2022, payment_2023, payment_2024, payment_2025');

    if (member_ids && member_ids.length > 0) {
      query = query.in('id', member_ids);
    }

    const { data: members, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const member of members) {
      try {
        // Calculate total balance from yearly payments
        let calculatedBalance = 0;

        if (restore_year) {
          // Restore specific year
          const yearField = `payment_${restore_year}`;
          calculatedBalance = parseFloat(member[yearField]) || 0;
        } else {
          // Restore from all years
          calculatedBalance =
            (parseFloat(member.payment_2021) || 0) +
            (parseFloat(member.payment_2022) || 0) +
            (parseFloat(member.payment_2023) || 0) +
            (parseFloat(member.payment_2024) || 0) +
            (parseFloat(member.payment_2025) || 0);
        }

        // Cap at max balance
        if (calculatedBalance > MAX_BALANCE) {
          calculatedBalance = MAX_BALANCE;
        }

        const previousBalance = parseFloat(member.balance) || 0;

        // Skip if balance already matches
        if (Math.abs(calculatedBalance - previousBalance) < 0.01) {
          results.skipped.push({
            member_id: member.id,
            name: member.full_name,
            reason: 'Balance already correct'
          });
          continue;
        }

        // Update member balance
        const { error: updateError } = await supabase
          .from('members')
          .update({
            balance: calculatedBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', member.id);

        if (updateError) throw updateError;

        // Update subscription
        const monthsPaidAhead = Math.floor(calculatedBalance / MONTHLY_SUBSCRIPTION);
        const nextPaymentDue = new Date();
        nextPaymentDue.setMonth(nextPaymentDue.getMonth() + monthsPaidAhead);

        await supabase
          .from('subscriptions')
          .update({
            current_balance: calculatedBalance,
            months_paid_ahead: monthsPaidAhead,
            next_payment_due: nextPaymentDue.toISOString(),
            status: calculatedBalance >= 0 ? 'active' : 'overdue',
            updated_at: new Date().toISOString()
          })
          .eq('member_id', member.id);

        // Create audit record
        await supabase
          .from('balance_adjustments')
          .insert({
            member_id: member.id,
            adjustment_type: 'bulk_restore',
            amount: calculatedBalance,
            previous_balance: previousBalance,
            new_balance: calculatedBalance,
            target_year: restore_year || null,
            reason: reason,
            notes: `Bulk restore from yearly payment fields${restore_year ? ` (year ${restore_year})` : ' (all years)'}`,
            adjusted_by: req.user.id,
            adjusted_by_email: req.user.email,
            adjusted_by_role: req.user.role,
            ip_address: req.ip
          });

        results.success.push({
          member_id: member.id,
          name: member.full_name,
          previous_balance: previousBalance,
          new_balance: calculatedBalance
        });

      } catch (memberError) {
        results.failed.push({
          member_id: member.id,
          name: member.full_name,
          error: memberError.message
        });
      }
    }

    log.info('Bulk balance restore completed', {
      success_count: results.success.length,
      failed_count: results.failed.length,
      skipped_count: results.skipped.length,
      adjusted_by: req.user.email
    });

    res.json({
      success: true,
      message: `تم استعادة ${results.success.length} رصيد بنجاح`,
      message_en: `Successfully restored ${results.success.length} balances`,
      results
    });

  } catch (error) {
    log.error('Bulk restore error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في استعادة الأرصدة',
      message_en: 'Failed to restore balances',
      details: error.message
    });
  }
};

/**
 * Get member balance summary with yearly breakdown
 * GET /api/balance-adjustments/summary/:memberId
 */
export const getMemberBalanceSummary = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Get member with all payment fields
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select(`
        id,
        full_name,
        membership_number,
        phone,
        balance,
        payment_2021,
        payment_2022,
        payment_2023,
        payment_2024,
        payment_2025,
        created_at
      `)
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود',
        message_en: 'Member not found'
      });
    }

    // Get subscription data
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .single();

    // Get recent adjustments
    const { data: recentAdjustments } = await supabase
      .from('balance_adjustments')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate totals
    const yearlyBreakdown = {
      2021: parseFloat(member.payment_2021) || 0,
      2022: parseFloat(member.payment_2022) || 0,
      2023: parseFloat(member.payment_2023) || 0,
      2024: parseFloat(member.payment_2024) || 0,
      2025: parseFloat(member.payment_2025) || 0
    };

    const totalFromYearlyPayments = Object.values(yearlyBreakdown).reduce((sum, val) => sum + val, 0);

    res.json({
      success: true,
      data: {
        member: {
          id: member.id,
          full_name: member.full_name,
          membership_number: member.membership_number,
          phone: member.phone,
          current_balance: parseFloat(member.balance) || 0,
          member_since: member.created_at
        },
        subscription: subscription ? {
          status: subscription.status,
          months_paid_ahead: subscription.months_paid_ahead,
          next_payment_due: subscription.next_payment_due,
          last_payment_date: subscription.last_payment_date
        } : null,
        yearly_breakdown: yearlyBreakdown,
        total_from_yearly_payments: totalFromYearlyPayments,
        balance_discrepancy: Math.abs(totalFromYearlyPayments - (parseFloat(member.balance) || 0)) > 0.01
          ? totalFromYearlyPayments - (parseFloat(member.balance) || 0)
          : 0,
        recent_adjustments: recentAdjustments || []
      }
    });

  } catch (error) {
    log.error('Get balance summary error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب ملخص الرصيد',
      message_en: 'Failed to fetch balance summary'
    });
  }
};

export default {
  adjustBalance,
  getMemberAdjustments,
  getAllAdjustments,
  bulkRestoreBalances,
  getMemberBalanceSummary
};
