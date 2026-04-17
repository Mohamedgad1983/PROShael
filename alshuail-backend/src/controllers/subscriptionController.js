/**
 * @fileoverview Subscription Management Controller
 * @description Handles all subscription-related operations including
 *              plans, member subscriptions, payments, and reminders
 * @version 3.1.0
 * @module controllers/subscriptionController
 *
 * @requires ../services/database.js - Direct PostgreSQL via pg.Pool
 * @requires ../utils/logger.js - Logging utility
 *
 * @business-rules
 * - Monthly subscription: 50 SAR
 * - Balance source of truth: members.current_balance
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
    const member_id = req.user?.member_id || req.user?.id;
    const member_phone = req.user?.phone;

    log.info('getMemberSubscription called', { member_id, member_phone, user: JSON.stringify(req.user) });

    if (!member_id) {
      return res.status(401).json({
        success: false,
        message: 'معرف العضو غير موجود'
      });
    }

    // STEP 1: Get member info including current_balance from members table (source of truth)
    let memberBalance = 0;
    let memberInfo = null;
    try {
      const { rows } = await query('SELECT id, phone, current_balance, full_name_ar FROM members WHERE id = $1', [member_id]);
      memberInfo = rows[0];
      memberBalance = parseFloat(memberInfo?.current_balance || 0);
      log.info('getMemberSubscription: member info', { id: memberInfo?.id, phone: memberInfo?.phone, current_balance: memberInfo?.current_balance });
    } catch (e) {
      log.error('getMemberSubscription: member query failed', { error: e.message });
    }

    // STEP 2: Calculate balance from payments table
    // Try multiple strategies to match payments to this member
    let totalPaid = 0;
    let lastPaymentDate = null;
    let paymentCount = 0;

    // Strategy 1: match by beneficiary_id = member.id
    try {
      const { rows: balanceRows } = await query(
        `SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count, MAX(payment_date) as last_payment_date
         FROM payments
         WHERE beneficiary_id = $1 AND amount > 0 AND status IN ('approved', 'paid')`,
        [member_id]
      );
      totalPaid = parseFloat(balanceRows[0]?.total_paid || 0);
      paymentCount = parseInt(balanceRows[0]?.payment_count || 0);
      lastPaymentDate = balanceRows[0]?.last_payment_date;
      log.info('getMemberSubscription: Strategy 1 (beneficiary_id=member_id)', { totalPaid, paymentCount, member_id });
    } catch (e) {
      log.error('getMemberSubscription: Strategy 1 failed', { error: e.message });
    }

    // Strategy 2: if no payments found by ID, try by payer_id
    if (paymentCount === 0) {
      try {
        const { rows: balanceRows } = await query(
          `SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count, MAX(payment_date) as last_payment_date
           FROM payments
           WHERE payer_id = $1 AND amount > 0 AND status IN ('approved', 'paid')`,
          [member_id]
        );
        const paidAsPayer = parseFloat(balanceRows[0]?.total_paid || 0);
        const payerCount = parseInt(balanceRows[0]?.payment_count || 0);
        log.info('getMemberSubscription: Strategy 2 (payer_id=member_id)', { paidAsPayer, payerCount, member_id });
        if (payerCount > 0) {
          totalPaid = paidAsPayer;
          paymentCount = payerCount;
          lastPaymentDate = balanceRows[0]?.last_payment_date;
        }
      } catch (e) {
        log.error('getMemberSubscription: Strategy 2 failed', { error: e.message });
      }
    }

    // Strategy 3: if still no payments, try matching by member_id column in payments
    if (paymentCount === 0) {
      try {
        const { rows: balanceRows } = await query(
          `SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count, MAX(payment_date) as last_payment_date
           FROM payments
           WHERE member_id = $1 AND amount > 0 AND status IN ('approved', 'paid')`,
          [member_id]
        );
        const paidByMemberId = parseFloat(balanceRows[0]?.total_paid || 0);
        const memberIdCount = parseInt(balanceRows[0]?.payment_count || 0);
        log.info('getMemberSubscription: Strategy 3 (member_id column)', { paidByMemberId, memberIdCount, member_id });
        if (memberIdCount > 0) {
          totalPaid = paidByMemberId;
          paymentCount = memberIdCount;
          lastPaymentDate = balanceRows[0]?.last_payment_date;
        }
      } catch (e) {
        log.warn('getMemberSubscription: Strategy 3 failed (member_id column may not exist)', { error: e.message });
      }
    }

    // Strategy 4: Use members.current_balance as final fallback (source of truth)
    if (paymentCount === 0 && memberBalance > 0) {
      log.info('getMemberSubscription: Using members.current_balance as fallback', { memberBalance });
      totalPaid = memberBalance;
    }

    // Also try v_subscription_overview for extra fields (plan_name etc)
    let subscriptionExtra = null;
    try {
      const { rows } = await query(
        'SELECT plan_name, next_payment_due FROM v_subscription_overview WHERE member_id = $1 LIMIT 1',
        [member_id]
      );
      subscriptionExtra = rows[0];
    } catch (e) {
      log.warn('v_subscription_overview query failed, using payments only', { error: e.message });
    }

    const actualBalance = Math.max(totalPaid, memberBalance);
    const TOTAL_REQUIRED = 3000;
    const amountDue = Math.max(0, TOTAL_REQUIRED - actualBalance);
    const status = actualBalance >= TOTAL_REQUIRED ? 'active' : 'overdue';
    const monthsPaidAhead = Math.floor(actualBalance / 50);

    res.json({
      success: true,
      subscription: {
        id: String(member_id),
        member_id: String(member_id),
        status: status,
        current_balance: String(actualBalance),
        total_paid: String(totalPaid),
        total_required: String(TOTAL_REQUIRED),
        months_paid_ahead: monthsPaidAhead,
        next_payment_due: subscriptionExtra?.next_payment_due || null,
        last_payment_date: lastPaymentDate ? String(lastPaymentDate) : null,
        amount_due: String(amountDue),
        plan_name: subscriptionExtra?.plan_name || 'اشتراك سنوي'
      }
    });
  } catch (error) {
    log.error('Subscription: Get member subscription error', { error: error.message, stack: error.stack, user: JSON.stringify(req.user) });
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
    const member_id = req.user?.member_id || req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    log.info('getPaymentHistory called', { member_id });

    if (!member_id) {
      return res.status(401).json({
        success: false,
        message: 'معرف العضو غير موجود'
      });
    }

    const memberId = String(member_id);

    // Try multiple strategies to find payments for this member
    let rawPayments = [];
    let total = 0;
    let matchStrategy = 'none';

    // Strategy 1: beneficiary_id
    const { rows: countRows1 } = await query(
      `SELECT COUNT(*) AS count FROM payments WHERE beneficiary_id = $1 AND amount > 0 AND status IN ('approved', 'paid')`,
      [memberId]
    );
    total = parseInt(countRows1[0].count) || 0;

    if (total > 0) {
      matchStrategy = 'beneficiary_id';
      const { rows } = await query(
        `SELECT id, beneficiary_id, payer_id, subscription_year, fiscal_year, amount, payment_date, payment_method, receipt_number, notes, notes_ar, status, category, created_at
         FROM payments
         WHERE beneficiary_id = $1 AND amount > 0 AND status IN ('approved', 'paid')
         ORDER BY payment_date DESC NULLS LAST, created_at DESC
         LIMIT $2 OFFSET $3`,
        [memberId, limit, offset]
      );
      rawPayments = rows;
    }

    // Strategy 2: payer_id
    if (total === 0) {
      const { rows: countRows2 } = await query(
        `SELECT COUNT(*) AS count FROM payments WHERE payer_id = $1 AND amount > 0 AND status IN ('approved', 'paid')`,
        [memberId]
      );
      total = parseInt(countRows2[0].count) || 0;
      if (total > 0) {
        matchStrategy = 'payer_id';
        const { rows } = await query(
          `SELECT id, beneficiary_id, payer_id, subscription_year, fiscal_year, amount, payment_date, payment_method, receipt_number, notes, notes_ar, status, category, created_at
           FROM payments
           WHERE payer_id = $1 AND amount > 0 AND status IN ('approved', 'paid')
           ORDER BY payment_date DESC NULLS LAST, created_at DESC
           LIMIT $2 OFFSET $3`,
          [memberId, limit, offset]
        );
        rawPayments = rows;
      }
    }

    // Strategy 3: member_id column (if exists)
    if (total === 0) {
      try {
        const { rows: countRows3 } = await query(
          `SELECT COUNT(*) AS count FROM payments WHERE member_id = $1 AND amount > 0 AND status IN ('approved', 'paid')`,
          [memberId]
        );
        total = parseInt(countRows3[0].count) || 0;
        if (total > 0) {
          matchStrategy = 'member_id';
          const { rows } = await query(
            `SELECT id, beneficiary_id, payer_id, subscription_year, fiscal_year, amount, payment_date, payment_method, receipt_number, notes, notes_ar, status, category, created_at
             FROM payments
             WHERE member_id = $1 AND amount > 0 AND status IN ('approved', 'paid')
             ORDER BY payment_date DESC NULLS LAST, created_at DESC
             LIMIT $2 OFFSET $3`,
            [memberId, limit, offset]
          );
          rawPayments = rows;
        }
      } catch (e) {
        log.warn('getPaymentHistory: member_id column strategy failed', { error: e.message });
      }
    }

    log.info('getPaymentHistory result', { total, matchStrategy, member_id: memberId });

    // Format to match iOS Payment model expectations
    const payments = rawPayments.map(p => ({
      id: String(p.id),
      amount: parseFloat(p.amount) || 0,
      payment_date: p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : (p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : null),
      status: p.status || 'approved',
      year: p.subscription_year || p.fiscal_year || (p.payment_date ? new Date(p.payment_date).getFullYear() : new Date(p.created_at).getFullYear()),
      receipt_url: null,
      receipt_number: p.receipt_number || `RCP-${memberId.substring(0, 8)}`,
      notes: p.notes_ar || p.notes || (p.category ? `دفعة ${p.category}` : 'دفعة'),
      payment_method: p.payment_method || 'cash'
    }));

    res.json({
      success: true,
      payments: payments,
      total,
      page,
      limit
    });
  } catch (error) {
    log.error('Subscription: Get payment history error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب سجل الدفعات',
      error: error.message
    });
  }
};

// ========================================
// 4. Get all subscriptions (ADMIN ONLY)
// Uses v_subscription_overview view for compatibility,
// then overrides current_balance with members.current_balance (source of truth)
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

    // FIX: Override current_balance with SUM from payments table (source of truth)
    if (subscriptions.length > 0) {
      const memberIds = subscriptions.map(s => s.member_id);
      try {
        const { rows: balances } = await query(
          `SELECT beneficiary_id as member_id, COALESCE(SUM(amount), 0) as real_balance
           FROM payments
           WHERE beneficiary_id = ANY($1) AND amount > 0 AND status IN ('approved', 'paid')
           GROUP BY beneficiary_id`,
          [memberIds]
        );
        const balanceMap = {};
        for (const b of balances) {
          balanceMap[b.member_id] = parseFloat(b.real_balance) || 0;
        }
        for (const sub of subscriptions) {
          if (balanceMap[sub.member_id] !== undefined) {
            sub.current_balance = balanceMap[sub.member_id];
          }
        }
      } catch (e) {
        log.warn('Could not fetch real balances from payments, using view balances', { error: e.message });
      }
    }

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
    log.error('Subscription: Get all subscriptions error', { error: error.message, stack: error.stack });
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
    const avg_months_ahead = total_members > 0
      ? subscriptions.reduce((sum, s) => sum + (s.months_paid_ahead || 0), 0) / total_members
      : 0;

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
// FIX: Removed 3000 SAR cap - members who pay more should see their real balance
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
          'paid',
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
