import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

// ========================================
// 1. Get all subscription plans (PUBLIC)
// ========================================
export const getSubscriptionPlans = async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('base_amount', { ascending: true });

    if (error) throw error;

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
    const { data: subscription, error } = await supabase
      .from('v_subscription_overview')
      .select('*')
      .eq('member_id', member_id)
      .single();

    if (error) {
      log.error('Subscription: Get member subscription error', { error: error.message });
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
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', member_id)
      .single();

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
    const { count } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_id', subscription.id);

    // Get payments with pagination
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('subscription_id', subscription.id)
      .order('payment_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      payments: payments || [],
      total: count || 0,
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

    // Build query
    let query = supabase
      .from('v_subscription_overview')
      .select('*', { count: 'exact' });

    // Apply filters
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchTerm) {
      query = query.or(`member_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    // Get total count
    const { count } = await query;

    // Get paginated data
    const { data: subscriptions, error } = await query
      .order('next_payment_due', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get quick stats
    const { data: stats } = await supabase
      .from('v_subscription_overview')
      .select('status');

    const statsData = {
      total_members: stats?.length || 0,
      active: stats?.filter(s => s.status === 'active').length || 0,
      overdue: stats?.filter(s => s.status === 'overdue').length || 0
    };

    res.json({
      success: true,
      subscriptions: subscriptions || [],
      total: count || 0,
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
    const { data: subscriptions, error } = await supabase
      .from('v_subscription_overview')
      .select('*');

    if (error) throw error;

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
    const { data: overdueMembers, error } = await supabase
      .from('v_subscription_overview')
      .select('*')
      .eq('status', 'overdue')
      .order('next_payment_due', { ascending: true });

    if (error) throw error;

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
// ========================================
export const recordPayment = async (req, res) => {
  try {
    const {
      member_id,
      amount,
      months,
      payment_method,
      receipt_number,
      notes
    } = req.body;

    // Validation
    if (!member_id || !amount || !months) {
      return res.status(400).json({
        success: false,
        message: 'البيانات المطلوبة: member_id, amount, months'
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

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', member_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على اشتراك لهذا العضو'
      });
    }

    // Get member's user_id for notification
    const { data: member } = await supabase
      .from('members')
      .select('user_id, full_name')
      .eq('id', member_id)
      .single();

    // Start transaction: Record payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        subscription_id: subscription.id,
        payer_id: member_id,
        amount: amount,
        months_purchased: months,
        payment_date: new Date().toISOString(),
        payment_method: payment_method || 'cash',
        receipt_number: receipt_number || `REC-${Date.now()}`,
        reference_number: `REF-${Date.now()}`,
        status: 'completed',
        processed_by: req.user.id || req.user.user_id,
        processing_notes: notes || ''
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Calculate new values
    const new_balance = (subscription.current_balance || 0) + amount;
    const months_paid_ahead = Math.floor(new_balance / 50);
    const next_payment_due = new Date();
    next_payment_due.setMonth(next_payment_due.getMonth() + months_paid_ahead);

    // Update subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        current_balance: new_balance,
        months_paid_ahead: months_paid_ahead,
        next_payment_due: next_payment_due.toISOString(),
        last_payment_date: new Date().toISOString(),
        last_payment_amount: amount,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    // Update member balance
    const { error: memberUpdateError } = await supabase
      .from('members')
      .update({
        balance: new_balance
      })
      .eq('id', member_id);

    if (memberUpdateError) throw memberUpdateError;

    // Create notification
    if (member?.user_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: member.user_id,
          title: 'تم استلام دفعتك',
          message: `تم تسجيل دفعة بمبلغ ${amount} ريال. شكراً لك!`,
          type: 'payment_confirmation',
          priority: 'high',
          read: false
        });
    }

    res.json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      new_balance,
      months_ahead: months_paid_ahead,
      next_due: next_payment_due.toISOString().split('T')[0],
      payment_id: payment.id
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
      const { data: overdue } = await supabase
        .from('v_subscription_overview')
        .select('member_id')
        .eq('status', 'overdue');

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
    const { data: members } = await supabase
      .from('members')
      .select('id, user_id, full_name, phone')
      .in('id', targetMembers);

    let sent = 0;
    let failed = 0;
    const details = [];

    // Send notifications
    for (const member of members) {
      if (member.user_id) {
        try {
          const { error } = await supabase
            .from('notifications')
            .insert({
              user_id: member.user_id,
              title: 'تنبيه دفع الاشتراك',
              message: 'اشتراكك الشهري (50 ريال) متأخر. الرجاء الدفع في أقرب وقت.',
              type: 'payment_reminder',
              priority: 'high',
              read: false
            });

          if (error) throw error;

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
