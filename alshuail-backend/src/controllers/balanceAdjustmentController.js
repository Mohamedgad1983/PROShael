/**
 * @fileoverview Balance Adjustment Controller
 * @description Handles member balance adjustments with full audit trail
 * @version 1.0.0
 * @module controllers/balanceAdjustmentController
 *
 * @requires ../services/database.js - PostgreSQL client
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

import { query, getClient } from '../services/database.js';
import { log } from '../utils/logger.js';

// Business constants
const MONTHLY_SUBSCRIPTION = 50;
const MAX_BALANCE = 3600; // 72 months max (6 years × 600 SAR)
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
    const memberResult = await query(
      'SELECT id, full_name, membership_number, balance, payment_2021, payment_2022, payment_2023, payment_2024, payment_2025 FROM members WHERE id = $1',
      [member_id]
    );

    if (!memberResult.rows || memberResult.rows.length === 0) {
      log.error('Balance adjustment: Member not found', { member_id });
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود',
        message_en: 'Member not found'
      });
    }

    const member = memberResult.rows[0];

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
    const memberUpdateFields = ['balance = $1', 'current_balance = $2', 'total_balance = $3', 'updated_at = $4'];
    const memberUpdateValues = [newBalance, newBalance, newBalance, new Date().toISOString()];
    let paramIndex = 5;

    // If target year is specified, also update the yearly payment field
    if (target_year && target_year >= 2021 && target_year <= 2025) {
      const yearField = `payment_${target_year}`;
      const currentYearPayment = parseFloat(member[yearField]) || 0;
      let updatedYearPayment;

      if (adjustment_type === 'credit' || adjustment_type === 'yearly_payment') {
        updatedYearPayment = currentYearPayment + parseFloat(amount);
      } else if (adjustment_type === 'debit') {
        updatedYearPayment = Math.max(0, currentYearPayment - parseFloat(amount));
      } else if (adjustment_type === 'correction') {
        updatedYearPayment = parseFloat(amount);
      }

      if (updatedYearPayment !== undefined) {
        memberUpdateFields.push(`${yearField} = $${paramIndex}`);
        memberUpdateValues.push(updatedYearPayment);
        paramIndex++;
      }
    }

    memberUpdateValues.push(member_id);

    // Start transaction: Update member balance
    await query(
      `UPDATE members SET ${memberUpdateFields.join(', ')} WHERE id = $${paramIndex}`,
      memberUpdateValues
    );

    // Update subscription if exists
    const subscriptionResult = await query(
      'SELECT id, current_balance FROM subscriptions WHERE member_id = $1',
      [member_id]
    );

    if (subscriptionResult.rows && subscriptionResult.rows.length > 0) {
      const subscription = subscriptionResult.rows[0];
      const monthsPaidAhead = Math.floor(newBalance / MONTHLY_SUBSCRIPTION);
      const nextPaymentDue = new Date();
      nextPaymentDue.setMonth(nextPaymentDue.getMonth() + monthsPaidAhead);

      await query(
        `UPDATE subscriptions
         SET current_balance = $1,
             months_paid_ahead = $2,
             next_payment_due = $3,
             status = $4,
             updated_at = $5
         WHERE id = $6`,
        [
          newBalance,
          monthsPaidAhead,
          nextPaymentDue.toISOString(),
          newBalance >= 0 ? 'active' : 'overdue',
          new Date().toISOString(),
          subscription.id
        ]
      );
    }

    // Create audit record
    const auditResult = await query(
      `INSERT INTO balance_adjustments (
        member_id, adjustment_type, amount, previous_balance, new_balance,
        target_year, target_month, reason, notes, adjusted_by,
        adjusted_by_email, adjusted_by_role, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        member_id,
        adjustment_type,
        parseFloat(amount),
        previousBalance,
        newBalance,
        target_year || null,
        target_month || null,
        reason,
        notes || null,
        req.user.id,
        req.user.email,
        req.user.role,
        req.ip || req.connection?.remoteAddress,
        req.headers['user-agent']
      ]
    );

    const adjustment = auditResult.rows[0];

    // Also log to financial_audit_trail for comprehensive tracking
    await query(
      `INSERT INTO financial_audit_trail (
        user_id, operation, resource_type, resource_id,
        previous_value, new_value, metadata, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user.id,
        'BALANCE_ADJUSTMENT',
        'member_balance',
        member_id,
        JSON.stringify({ balance: previousBalance }),
        JSON.stringify({ balance: newBalance, adjustment_type, amount }),
        JSON.stringify({ reason, target_year, target_month, notes }),
        req.ip
      ]
    );

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
    const countResult = await query(
      'SELECT COUNT(*) as count FROM balance_adjustments WHERE member_id = $1',
      [memberId]
    );
    const count = parseInt(countResult.rows[0].count);

    // Get adjustments with pagination
    const adjustmentsResult = await query(
      `SELECT * FROM balance_adjustments
       WHERE member_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );

    res.json({
      success: true,
      data: adjustmentsResult.rows || [],
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
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

    // Build query with filters
    const whereClauses = [];
    const queryParams = [];
    let paramIndex = 1;

    if (adjustment_type) {
      whereClauses.push(`ba.adjustment_type = $${paramIndex}`);
      queryParams.push(adjustment_type);
      paramIndex++;
    }
    if (target_year) {
      whereClauses.push(`ba.target_year = $${paramIndex}`);
      queryParams.push(parseInt(target_year));
      paramIndex++;
    }
    if (from_date) {
      whereClauses.push(`ba.created_at >= $${paramIndex}`);
      queryParams.push(from_date);
      paramIndex++;
    }
    if (to_date) {
      whereClauses.push(`ba.created_at <= $${paramIndex}`);
      queryParams.push(to_date);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM balance_adjustments ba ${whereClause}`,
      queryParams
    );
    const count = parseInt(countResult.rows[0].count);

    // Get data with pagination
    queryParams.push(limit);
    queryParams.push(offset);

    const adjustmentsResult = await query(
      `SELECT ba.*,
              m.full_name, m.membership_number, m.phone
       FROM balance_adjustments ba
       LEFT JOIN members m ON ba.member_id = m.id
       ${whereClause}
       ORDER BY ba.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    // Format data to match expected structure
    const formattedData = adjustmentsResult.rows.map(row => ({
      ...row,
      members: {
        full_name: row.full_name,
        membership_number: row.membership_number,
        phone: row.phone
      }
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
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
    let membersQuery;
    let queryParams;

    if (member_ids && member_ids.length > 0) {
      membersQuery = `SELECT id, full_name, membership_number, balance, payment_2021, payment_2022, payment_2023, payment_2024, payment_2025
                      FROM members WHERE id = ANY($1)`;
      queryParams = [member_ids];
    } else {
      membersQuery = `SELECT id, full_name, membership_number, balance, payment_2021, payment_2022, payment_2023, payment_2024, payment_2025
                      FROM members`;
      queryParams = [];
    }

    const membersResult = await query(membersQuery, queryParams);
    const members = membersResult.rows;

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
        await query(
          `UPDATE members
           SET balance = $1, updated_at = $2
           WHERE id = $3`,
          [calculatedBalance, new Date().toISOString(), member.id]
        );

        // Update subscription
        const monthsPaidAhead = Math.floor(calculatedBalance / MONTHLY_SUBSCRIPTION);
        const nextPaymentDue = new Date();
        nextPaymentDue.setMonth(nextPaymentDue.getMonth() + monthsPaidAhead);

        await query(
          `UPDATE subscriptions
           SET current_balance = $1,
               months_paid_ahead = $2,
               next_payment_due = $3,
               status = $4,
               updated_at = $5
           WHERE member_id = $6`,
          [
            calculatedBalance,
            monthsPaidAhead,
            nextPaymentDue.toISOString(),
            calculatedBalance >= 0 ? 'active' : 'overdue',
            new Date().toISOString(),
            member.id
          ]
        );

        // Create audit record
        await query(
          `INSERT INTO balance_adjustments (
            member_id, adjustment_type, amount, previous_balance, new_balance,
            target_year, reason, notes, adjusted_by, adjusted_by_email,
            adjusted_by_role, ip_address
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            member.id,
            'bulk_restore',
            calculatedBalance,
            previousBalance,
            calculatedBalance,
            restore_year || null,
            reason,
            `Bulk restore from yearly payment fields${restore_year ? ` (year ${restore_year})` : ' (all years)'}`,
            req.user.id,
            req.user.email,
            req.user.role,
            req.ip
          ]
        );

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
    const memberResult = await query(
      `SELECT id, full_name, membership_number, phone, balance,
              payment_2021, payment_2022, payment_2023, payment_2024, payment_2025,
              created_at
       FROM members WHERE id = $1`,
      [memberId]
    );

    if (!memberResult.rows || memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود',
        message_en: 'Member not found'
      });
    }

    const member = memberResult.rows[0];

    // Get subscription data
    const subscriptionResult = await query(
      'SELECT * FROM subscriptions WHERE member_id = $1',
      [memberId]
    );
    const subscription = subscriptionResult.rows.length > 0 ? subscriptionResult.rows[0] : null;

    // Get recent adjustments
    const adjustmentsResult = await query(
      `SELECT * FROM balance_adjustments
       WHERE member_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [memberId]
    );

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
        recent_adjustments: adjustmentsResult.rows || []
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
