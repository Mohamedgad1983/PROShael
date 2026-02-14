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

    // Get subscription from view (has all calculated fields)
    const { rows } = await query(
      'SELECT * FROM v_subscription_overview WHERE member_id = $1 LIMIT 1',
      [member_id]
    );

    const subscription = rows[0];

    if (!subscription) {
      log.error('Subscription: Get member subscription error', { member_id });
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على اشتراك لهذا العضو'
      });
    }

    res.json({
      success: true,
      subscription: {
        member_id: subscription.member_id,
        status: subscription.status,
        current_balance: subscription.current_balance,
        months_paid_ahead: subscription.months_paid_ahead,
        next_payment_due: subscription.next_payment_due,
        last_payment_date: subscription.last_payment_date,
        amount_due: subscription.amount_due,
        plan_name: subscription.plan_name
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

    // Get subscription_id first
    const { rows: subRows } = await query(
      'SELECT id FROM subscriptions WHERE member_id = $1 LIMIT 1',
      [member_id]
    );

    const subscription = subRows[0];

    if (!subscription) {
      return res.json({
        success: true,
        payments: [],
        total: 0,
        page,
        limit
      });
    }

    // Get total count
    const { rows: countRows } = await query(
      'SELECT COUNT(*) AS count FROM payments WHERE subscription_id = $1',
      [subscription.id]
    );
    const total = parseInt(countRows[0].count) || 0;

    // Get payments with pagination
    const { rows: payments } = await query(
      'SELECT * FROM payments WHERE subscription_id = $1 ORDER BY payment_date DESC LIMIT $2 OFFSET $3',
      [subscription.id, limit, offset]
    );

    res.json({
      success: true,
      payments: payments || [],
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
export const getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status; // 'all', 'active', 'overdue'
    const searchTerm = req.query.search;

    // Build dynamic WHERE clauses
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(`status = $${paramIndex++}`);
      params.push(statusFilter);
    }

    if (searchTerm) {
      conditions.push(`(member_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) AS count FROM v_subscription_overview ${whereClause}`,
      params
    );
    const total = parseInt(countRows[0].count) || 0;

    // Get paginated data
    const { rows: subscriptions } = await query(
      `SELECT * FROM v_subscription_overview ${whereClause} ORDER BY next_payment_due ASC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    // Get quick stats
    const { rows: stats } = await query(
      'SELECT status FROM v_subscription_overview'
    );

    const statsData = {
      total_members: stats?.length || 0,
      active: stats?.filter(s => s.status === 'active').length || 0,
      overdue: stats?.filter(s => s.status === 'overdue').length || 0
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
export const getSubscriptionStats = async (req, res) => {
  try {
    // Get all subscriptions from view
    const { rows: subscriptions } = await query(
      'SELECT * FROM v_subscription_overview'
    );

    const total_members = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'active').length;
    const overdue = subscriptions.filter(s => s.status === 'overdue').length;

    // Monthly revenue: 50 SAR per member
    const monthly_revenue = total_members * 50;

    // Total overdue amount
    const overdue_amount = subscriptions
      .filter(s => s.status === 'overdue')
      .reduce((sum, s) => sum + (s.amount_due || 50), 0);

    // Average months paid ahead
    const avg_months_ahead = subscriptions.reduce((sum, s) =>
      sum + (s.months_paid_ahead || 0), 0) / total_members;

    res.json({
      success: true,
      total_members,
      active,
      overdue,
      monthly_revenue,
      overdue_amount,
      avg_months_ahead: Math.round(avg_months_ahead * 10) / 10 // Round to 1 decimal
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
export const getOverdueMembers = async (req, res) => {
  try {
    const { rows: overdueMembers } = await query(
      'SELECT * FROM v_subscription_overview WHERE status = $1 ORDER BY next_payment_due ASC',
      ['overdue']
    );

    const total_due = overdueMembers.reduce((sum, member) =>
      sum + (member.amount_due || 50), 0);

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

    // Calculate new values - cap balance at 3000 SAR (50 SAR x 60 months = 5 years max)
    const MAX_BALANCE = 3000;
    const calculated_balance = (subscription.current_balance || 0) + amount;
    const new_balance = Math.min(calculated_balance, MAX_BALANCE);
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
      // Get all overdue members
      const { rows: overdue } = await query(
        'SELECT member_id FROM v_subscription_overview WHERE status = $1',
        ['overdue']
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
