/**
 * @fileoverview Subscription Management Controller
 * @description Handles all subscription-related operations including
 *              plans, member subscriptions, payments, and reminders
 * @version 3.0.0
 * @module controllers/subscriptionController
 *
 * @requires ../services/database.js - Direct PostgreSQL via pg.Pool
 * @requires ../utils/logger.js - Logging utility
 *
 * @business-rules
 * - Monthly subscription: 50 SAR
 * - Maximum balance: 3000 SAR (60 months)
 * - Overdue status: balance < 0
 * - Active status: balance >= 0
 */

import { query, getClient } from '../services/database.js';
import { log } from '../utils/logger.js';

// ========================================
// 1. Get all subscription plans (PUBLIC)
// ========================================
export const getSubscriptionPlans = async (req, res) => {
  try {
    const { rows: plans } = await query(
      'SELECT * FROM subscription_plans WHERE is_active = $1 ORDER BY base_amount ASC',
      [true]
    );

    res.json({
      success: true,
      plans: plans || []
    });
  } catch (error) {
    log.error('Subscription: Get plans error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب خطط الاشتراك',
      error: error.message
    });
  }
};

// ========================================
// 2. Get member's own subscription (MEMBER AUTH REQUIRED)
// ========================================
export const getMemberSubscription = async (req, res) => {
  try {
    const member_id = req.user.member_id || req.user.id;

    if (!member_id) {
      return res.status(401).json({
        success: false,
        message: 'معرف العضو غير موجود'
      });
    }

    // Calculate balance from payments_yearly (source of truth)
    const { rows: balanceRows } = await query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count, MAX(payment_date) as last_payment_date FROM payments_yearly WHERE member_id = $1 AND amount > 0',
      [member_id]
    );
    const totalPaid = parseFloat(balanceRows[0]?.total_paid || 0);
    const lastPaymentDate = balanceRows[0]?.last_payment_date;

    // Also try v_subscription_overview for extra fields (plan_name etc)
    let subscriptionExtra = null;
    try {
      const { rows } = await query(
        'SELECT plan_name, next_payment_due FROM v_subscription_overview WHERE member_id = $1 LIMIT 1',
        [member_id]
      );
      subscriptionExtra = rows[0];
    } catch (e) {
      // View might not exist or have issues, continue without it
      log.warn('v_subscription_overview query failed, using payments_yearly only', { error: e.message });
    }

    // Also read the actual member balance from members table (source of truth)
    // This accounts for balance adjustments that don't go through payments_yearly
    let actualBalance = totalPaid;
    try {
      const { rows: memberRows } = await query(
        'SELECT current_balance FROM members WHERE id = $1 LIMIT 1',
        [member_id]
      );
      if (memberRows[0]?.current_balance != null) {
        actualBalance = parseFloat(memberRows[0].current_balance) || totalPaid;
      }
    } catch (e) {
      log.warn('Could not fetch member balance, using payments_yearly total', { error: e.message });
    }

    const TOTAL_REQUIRED = 3000; // 600 SAR/year × 5 years
    const amountDue = Math.max(0, TOTAL_REQUIRED - actualBalance);
    const status = actualBalance >= TOTAL_REQUIRED ? 'active' : 'overdue';
    const monthsPaidAhead = Math.floor(actualBalance / 50);

    res.json({
      success: true,
      subscription: {
        member_id: member_id,
        status: status,
        current_balance: String(actualBalance),
        total_paid: String(totalPaid),
        total_required: String(TOTAL_REQUIRED),
        months_paid_ahead: monthsPaidAhead,
        next_payment_due: subscriptionExtra?.next_payment_due || null,
        last_payment_date: lastPaymentDate || null,
        amount_due: String(amountDue),
        plan_name: subscriptionExtra?.plan_name || 'اشتراك سنوي'
      }
    });
  } catch (error) {
    log.error('Subscription: Get member subscription error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات الاشتراك',
      error: error.message
    });
  }
};

// ========================================
// 3. Get payment history (MEMBER AUTH REQUIRED)
// ========================================
export const getPaymentHistory = async (req, res) => {
  try {
    const member_id = req.user.member_id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    if (!member_id) {
      return res.status(401).json({
        success: false,
        message: 'معرف العضو غير موجود'
      });
    }

    // Get total count from payments_yearly
    const { rows: countRows } = await query(
      'SELECT COUNT(*) AS count FROM payments_yearly WHERE member_id = $1 AND amount > 0',
      [member_id]
    );
    const total = parseInt(countRows[0].count) || 0;

    // Get payments from payments_yearly (source of truth)
    const { rows: yearlyPayments } = await query(
      `SELECT id, member_id, year, amount, payment_date, payment_method, receipt_number, notes
       FROM payments_yearly
       WHERE member_id = $1 AND amount > 0
       ORDER BY year DESC
       LIMIT $2 OFFSET $3`,
      [member_id, limit, offset]
    );

    // Format to match iOS Payment model expectations
    const payments = yearlyPayments.map(p => ({
      id: p.id,
      amount: parseFloat(p.amount),
      paymentDate: p.payment_date,
      payment_date: p.payment_date,
      status: 'approved',
      year: p.year,
      receiptUrl: null,
      receipt_url: null,
      receipt_number: p.receipt_number || `RCP-${p.year}-${member_id.substring(0, 5)}`,
      notes: p.notes || `دفعة سنة ${p.year}`,
      payment_method: p.payment_method
    }));

    res.json({
      success: true,
      payments: payments,
      total,
      page,
      limit
    });
  } catch (error) {
    log.error('Subscription: Get payment history error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب سجل الدفعات',
      error: error.message
    });
  }
};

// ========================================
// 4. Get all subscriptions (ADMIN ONLY)
// ========================================
// FIX: Use members table + payments_yearly as source of truth for balance
// instead of v_subscription_overview which may have stale/capped data
export const getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status; // 'all', 'active', 'overdue'
    const searchTerm = req.query.search;

    const TOTAL_REQUIRED = 3000; // 600 SAR/year × 5 years

    // Build query from members table with payments_yearly totals
    // This matches the statement page's data source (members.current_balance)
    const conditions = ['m.membership_status != \'deleted\''];
    const params = [];
    let paramIndex = 1;

    if (searchTerm) {
      conditions.push(`(m.full_name ILIKE $${paramIndex} OR m.phone ILIKE $${paramIndex})`);
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Main query: join members with payments_yearly for real balance
    const subscriptionQuery = `
      SELECT
        m.id as member_id,
        m.full_name as member_name,
        m.phone,
        COALESCE(m.current_balance, 0) as current_balance,
        COALESCE(py.total_paid, 0) as total_paid,
        py.last_payment_date,
        py.last_payment_amount,
        py.payment_count,
        CASE
          WHEN COALESCE(m.current_balance, 0) >= ${TOTAL_REQUIRED} THEN 'active'
          ELSE 'overdue'
        END as status,
        FLOOR(COALESCE(m.current_balance, 0) / 50) as months_paid_ahead,
        GREATEST(0, ${TOTAL_REQUIRED} - COALESCE(m.current_balance, 0)) as amount_due
      FROM members m
      LEFT JOIN (
        SELECT
          member_id,
          SUM(amount) as total_paid,
          MAX(payment_date) as last_payment_date,
          MAX(amount) as last_payment_amount,
          COUNT(*) as payment_count
        FROM payments_yearly
        WHERE amount > 0
        GROUP BY member_id
      ) py ON py.member_id = m.id
      ${whereClause}
    `;

    // Apply status filter after calculation
    let fullQuery = subscriptionQuery;
    if (statusFilter && statusFilter !== 'all') {
      const statusCondition = statusFilter === 'active'
        ? `COALESCE(m.current_balance, 0) >= ${TOTAL_REQUIRED}`
        : `COALESCE(m.current_balance, 0) < ${TOTAL_REQUIRED}`;
      fullQuery = `${subscriptionQuery} AND ${statusCondition}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM (${fullQuery}) sub`;
    const { rows: countRows } = await query(countQuery, params);
    const total = parseInt(countRows[0].count) || 0;

    // Get paginated data
    const paginatedQuery = `${fullQuery} ORDER BY current_balance ASC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    const { rows: subscriptions } = await query(paginatedQuery, [...params, limit, offset]);

    // Get quick stats from same source
    const statsQuery = `
      SELECT
        COUNT(*) as total_members,
        COUNT(CASE WHEN COALESCE(m.current_balance, 0) >= ${TOTAL_REQUIRED} THEN 1 END) as active,
        COUNT(CASE WHEN COALESCE(m.current_balance, 0) < ${TOTAL_REQUIRED} THEN 1 END) as overdue
      FROM members m
      WHERE m.membership_status != 'deleted'
    `;
    const { rows: statsRows } = await query(statsQuery);

    const statsData = {
      total_members: parseInt(statsRows[0]?.total_members) || 0,
      active: parseInt(statsRows[0]?.active) || 0,
      overdue: parseInt(statsRows[0]?.overdue) || 0
    };

    res.json({
      success: true,
      subscriptions: subscriptions || [],
      total,
      page,
      limit,
      stats: statsData
    });
  } catch (error) {
    log.error('Subscription: Get all subscriptions error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الاشتراكات',
      error: error.message
    });
  }
};

// ========================================
// 5. Get dashboard statistics (ADMIN ONLY)
// ========================================
// FIX: Use members table as source of truth (matches statement page)
export const getSubscriptionStats = async (req, res) => {
  try {
    const TOTAL_REQUIRED = 3000; // 600 SAR/year × 5 years

    // Calculate stats directly from members table (source of truth)
    const { rows: statsRows } = await query(`
      SELECT
        COUNT(*) as total_members,
        COUNT(CASE WHEN COALESCE(current_balance, 0) >= ${TOTAL_REQUIRED} THEN 1 END) as active,
        COUNT(CASE WHEN COALESCE(current_balance, 0) < ${TOTAL_REQUIRED} THEN 1 END) as overdue,
        SUM(GREATEST(0, ${TOTAL_REQUIRED} - COALESCE(current_balance, 0))) as overdue_amount,
        AVG(FLOOR(COALESCE(current_balance, 0) / 50)) as avg_months_ahead
      FROM members
      WHERE membership_status != 'deleted'
    `);

    const stats = statsRows[0];
    const total_members = parseInt(stats.total_members) || 0;
    const active = parseInt(stats.active) || 0;
    const overdue = parseInt(stats.overdue) || 0;
    const monthly_revenue = total_members * 50;
    const overdue_amount = parseFloat(stats.overdue_amount) || 0;
    const avg_months_ahead = parseFloat(stats.avg_months_ahead) || 0;

    res.json({
      success: true,
      total_members,
      active,
      overdue,
      monthly_revenue,
      overdue_amount,
      avg_months_ahead: Math.round(avg_months_ahead * 10) / 10
    });
  } catch (error) {
    log.error('Subscription: Get stats error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      error: error.message
    });
  }
};

// ========================================
// 6. Get overdue members only (ADMIN ONLY)
// ========================================
// FIX: Use members table as source of truth (matches statement page)
export const getOverdueMembers = async (req, res) => {
  try {
    const TOTAL_REQUIRED = 3000;

    const { rows: overdueMembers } = await query(`
      SELECT
        m.id as member_id,
        m.full_name as member_name,
        m.phone,
        COALESCE(m.current_balance, 0) as current_balance,
        FLOOR(COALESCE(m.current_balance, 0) / 50) as months_paid_ahead,
        GREATEST(0, ${TOTAL_REQUIRED} - COALESCE(m.current_balance, 0)) as amount_due,
        'overdue' as status
      FROM members m
      WHERE m.membership_status != 'deleted'
        AND COALESCE(m.current_balance, 0) < ${TOTAL_REQUIRED}
      ORDER BY m.current_balance ASC
    `);

    const total_due = overdueMembers.reduce((sum, member) =>
      sum + parseFloat(member.amount_due || 0), 0);

    res.json({
      success: true,
      overdue_members: overdueMembers || [],
      total_due
    });
  } catch (error) {
    log.error('Subscription: Get overdue members error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الأعضاء المتأخرين',
      error: error.message
    });
  }
};

// ========================================
// 7. Record a payment (ADMIN ONLY)
// Supports pay-on-behalf: payer_id pays, beneficiary_id receives credit
// TRANSACTION: payment insert + subscription update + member balance update + notification
// ========================================
export const recordPayment = async (req, res) => {
  try {
    const {
      member_id,      // Legacy field - used as payer if no payer_id specified
      payer_id,       // Who is paying (optional, defaults to member_id)
      beneficiary_id, // Who receives credit (optional, defaults to member_id)
      amount,
      months,
      payment_method,
      receipt_number,
      notes
    } = req.body;

    // Determine actual payer and beneficiary
    const actualPayerId = payer_id || member_id;
    const actualBeneficiaryId = beneficiary_id || member_id;
    const isOnBehalf = actualPayerId !== actualBeneficiaryId;

    // Validation
    if (!actualBeneficiaryId || !amount || !months) {
      return res.status(400).json({
        success: false,
        message: 'البيانات المطلوبة: member_id أو beneficiary_id, amount, months'
      });
    }

    if (amount < 50) {
      return res.status(400).json({
        success: false,
        message: 'الحد الأدنى للدفع 50 ريال'
      });
    }

    if (amount % 50 !== 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون من مضاعفات الـ 50 ريال'
      });
    }

    // Read-only lookups before transaction
    const { rows: subRows } = await query(
      'SELECT * FROM subscriptions WHERE member_id = $1 LIMIT 1',
      [actualBeneficiaryId]
    );
    const subscription = subRows[0];

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على اشتراك للعضو المستفيد'
      });
    }

    // Get beneficiary's user_id for notification
    const { rows: beneficiaryRows } = await query(
      'SELECT user_id, full_name FROM members WHERE id = $1 LIMIT 1',
      [actualBeneficiaryId]
    );
    const beneficiaryMember = beneficiaryRows[0];

    // Get payer's info if on-behalf payment
    let payerMember = null;
    if (isOnBehalf && actualPayerId) {
      const { rows: payerRows } = await query(
        'SELECT user_id, full_name FROM members WHERE id = $1 LIMIT 1',
        [actualPayerId]
      );
      payerMember = payerRows[0];
    }

    // Calculate new values - no artificial cap, allow actual balance to grow
    // Members who pay more than 3000 SAR should see their real balance
    const calculated_balance = (subscription.current_balance || 0) + amount;
    const new_balance = calculated_balance;
    const months_paid_ahead = Math.floor(new_balance / 50);
    const next_payment_due = new Date();
    next_payment_due.setMonth(next_payment_due.getMonth() + months_paid_ahead);

    // === TRANSACTION: payment + subscription + member balance + notification ===
    const client = await getClient();
    let payment;
    try {
      await client.query('BEGIN');

      // 1. Insert payment
      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments (
          subscription_id, payer_id, beneficiary_id, is_on_behalf,
          amount, months_purchased, payment_date, payment_method,
          receipt_number, reference_number, status, processed_by, processing_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          subscription.id,
          actualPayerId,
          actualBeneficiaryId,
          isOnBehalf,
          amount,
          months,
          new Date().toISOString(),
          payment_method || 'cash',
          receipt_number || `REC-${Date.now()}`,
          `REF-${Date.now()}`,
          'completed',
          req.user.id || req.user.user_id,
          isOnBehalf
            ? `دفع نيابة عن العضو - ${notes || ''}`.trim()
            : (notes || '')
        ]
      );
      payment = paymentRows[0];

      // 2. Update subscription
      await client.query(
        `UPDATE subscriptions SET
          current_balance = $1, months_paid_ahead = $2,
          next_payment_due = $3, last_payment_date = $4,
          last_payment_amount = $5, status = $6, updated_at = $7
        WHERE id = $8`,
        [
          new_balance,
          months_paid_ahead,
          next_payment_due.toISOString(),
          new Date().toISOString(),
          amount,
          'active',
          new Date().toISOString(),
          subscription.id
        ]
      );

      // 3. Update beneficiary's member balance (all balance fields)
      await client.query(
        `UPDATE members SET balance = $1, current_balance = $1, total_paid = $1 WHERE id = $2`,
        [new_balance, actualBeneficiaryId]
      );

      // 4. Create notification for beneficiary
      if (beneficiaryMember?.user_id) {
        const notificationMessage = isOnBehalf && payerMember
          ? `تم تسجيل دفعة بمبلغ ${amount} ريال من ${payerMember.full_name} نيابة عنك. شكراً لك!`
          : `تم تسجيل دفعة بمبلغ ${amount} ريال. شكراً لك!`;

        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, priority, read)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            beneficiaryMember.user_id,
            isOnBehalf ? 'تم استلام دفعة نيابة عنك' : 'تم استلام دفعتك',
            notificationMessage,
            'payment_confirmation',
            'high',
            false
          ]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: isOnBehalf
        ? `تم تسجيل الدفعة نيابة عن ${beneficiaryMember?.full_name || 'العضو'} بنجاح`
        : 'تم تسجيل الدفعة بنجاح',
      new_balance,
      months_ahead: months_paid_ahead,
      next_due: next_payment_due.toISOString().split('T')[0],
      payment_id: payment.id,
      is_on_behalf: isOnBehalf,
      payer: isOnBehalf ? {
        id: actualPayerId,
        name: payerMember?.full_name
      } : null,
      beneficiary: {
        id: actualBeneficiaryId,
        name: beneficiaryMember?.full_name
      }
    });
  } catch (error) {
    log.error('Subscription: Record payment error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في تسجيل الدفعة',
      error: error.message
    });
  }
};

// ========================================
// 8. Send payment reminder (ADMIN ONLY)
// ========================================
export const sendPaymentReminder = async (req, res) => {
  try {
    const { member_ids, send_to_all } = req.body;

    let targetMembers = [];

    if (send_to_all) {
      // Get all overdue members (balance < 3000) from members table
      const { rows: overdue } = await query(
        'SELECT id as member_id FROM members WHERE membership_status != $1 AND COALESCE(current_balance, 0) < 3000',
        ['deleted']
      );

      targetMembers = overdue?.map(m => m.member_id) || [];
    } else if (member_ids && Array.isArray(member_ids)) {
      targetMembers = member_ids;
    } else {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد member_ids أو send_to_all'
      });
    }

    if (targetMembers.length === 0) {
      return res.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'لا يوجد أعضاء للإرسال إليهم'
      });
    }

    // Get member details
    const { rows: members } = await query(
      'SELECT id, user_id, full_name, phone FROM members WHERE id = ANY($1)',
      [targetMembers]
    );

    let sent = 0;
    let failed = 0;
    const details = [];

    // Send notifications
    for (const member of members) {
      if (member.user_id) {
        try {
          await query(
            `INSERT INTO notifications (user_id, title, message, type, priority, read)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              member.user_id,
              'تنبيه دفع الاشتراك',
              'اشتراكك الشهري (50 ريال) متأخر. الرجاء الدفع في أقرب وقت.',
              'payment_reminder',
              'high',
              false
            ]
          );

          sent++;
          details.push({
            member_id: member.id,
            phone: member.phone,
            status: 'sent'
          });
        } catch (error) {
          failed++;
          details.push({
            member_id: member.id,
            phone: member.phone,
            status: 'failed',
            error: error.message
          });
        }
      } else {
        failed++;
        details.push({
          member_id: member.id,
          phone: member.phone,
          status: 'failed',
          error: 'No user_id'
        });
      }
    }

    res.json({
      success: true,
      sent,
      failed,
      details: req.query.verbose ? details : undefined,
      message: `تم إرسال ${sent} تذكير بنجاح`
    });
  } catch (error) {
    log.error('Subscription: Send reminder error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال التذكير',
      error: error.message
    });
  }
};
