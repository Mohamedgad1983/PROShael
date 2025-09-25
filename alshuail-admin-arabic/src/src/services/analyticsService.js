/**
 * Analytics Service - Al-Shuail Family Admin Dashboard
 * Comprehensive analytics and reporting for subscription management
 */

import {
  mockDatabase,
  findMemberById,
  findPlanById,
  getMockStats
} from './mockData.js';

// ====================
// UTILITY FUNCTIONS
// ====================

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Get start of month
 */
const getStartOfMonth = (date) => {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Get end of month
 */
const getEndOfMonth = (date) => {
  const end = new Date(date);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Group data by month
 */
const groupByMonth = (data, dateField) => {
  const grouped = {};
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(item);
  });
  return grouped;
};

/**
 * Calculate percentage change
 */
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
};

/**
 * Get date range data
 */
const getDateRangeData = (data, dateField, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= start && itemDate <= end;
  });
};

// ====================
// MAIN ANALYTICS FUNCTIONS
// ====================

/**
 * Get comprehensive subscription analytics
 * @param {Object} filters - Date range and other filters
 * @returns {Promise<Object>} Analytics data
 */
export const getSubscriptionAnalytics = async (filters = {}) => {
  try {
    const now = new Date();
    const currentMonth = getStartOfMonth(now);
    const lastMonth = getStartOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const currentYear = new Date(now.getFullYear(), 0, 1);

    // Get basic stats
    const basicStats = getMockStats();

    // Active subscriptions analysis
    const activeSubscriptions = mockDatabase.subscriptions.filter(s => s.status === 'active');
    const suspendedSubscriptions = mockDatabase.subscriptions.filter(s => s.status === 'suspended');
    const cancelledSubscriptions = mockDatabase.subscriptions.filter(s => s.status === 'cancelled');
    const expiredSubscriptions = mockDatabase.subscriptions.filter(s => s.status === 'expired');

    // Revenue analysis
    const paidPayments = mockDatabase.payments.filter(p => p.status === 'paid');
    const currentMonthRevenue = paidPayments
      .filter(p => new Date(p.payment_date) >= currentMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    const lastMonthRevenue = paidPayments
      .filter(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate >= lastMonth && paymentDate < currentMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const yearlyRevenue = paidPayments
      .filter(p => new Date(p.payment_date) >= currentYear)
      .reduce((sum, p) => sum + p.amount, 0);

    // Monthly Recurring Revenue (MRR)
    const monthlyPlans = mockDatabase.plans.filter(p => p.duration_months === 1);
    const yearlyPlans = mockDatabase.plans.filter(p => p.duration_months === 12);

    let mrr = 0;
    activeSubscriptions.forEach(sub => {
      const plan = findPlanById(sub.plan_id);
      if (!plan) return;

      const monthlyAmount = plan.duration_months === 12 ? plan.price / 12 : plan.price;
      const discountedAmount = monthlyAmount * (1 - sub.discount_applied / 100);
      mrr += discountedAmount;
    });

    // Annual Recurring Revenue (ARR)
    const arr = mrr * 12;

    // Churn rate calculation
    const subscriptionsStartMonth = mockDatabase.subscriptions.filter(s =>
      new Date(s.created_at) < currentMonth
    ).length;

    const churned = mockDatabase.subscriptions.filter(s => {
      const cancelDate = new Date(s.updated_at);
      return s.status === 'cancelled' && cancelDate >= currentMonth;
    }).length;

    const churnRate = subscriptionsStartMonth > 0 ? (churned / subscriptionsStartMonth) * 100 : 0;

    // Customer Acquisition Cost (simplified)
    const newSubscriptionsThisMonth = mockDatabase.subscriptions.filter(s =>
      new Date(s.created_at) >= currentMonth
    ).length;

    // Average Revenue Per User (ARPU)
    const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;

    // Payment success rate
    const totalPayments = mockDatabase.payments.length;
    const successfulPayments = mockDatabase.payments.filter(p => p.status === 'paid').length;
    const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    // Plan distribution
    const planDistribution = mockDatabase.plans.map(plan => {
      const subscriptionsCount = activeSubscriptions.filter(s => s.plan_id === plan.id).length;
      const revenue = activeSubscriptions
        .filter(s => s.plan_id === plan.id)
        .reduce((sum, s) => {
          const planPrice = plan.duration_months === 12 ? plan.price / 12 : plan.price;
          return sum + (planPrice * (1 - s.discount_applied / 100));
        }, 0);

      return {
        plan_id: plan.id,
        plan_name: plan.name_ar,
        subscriptions_count: subscriptionsCount,
        percentage: activeSubscriptions.length > 0 ? (subscriptionsCount / activeSubscriptions.length) * 100 : 0,
        monthly_revenue: revenue,
        average_price: plan.price
      };
    });

    // Monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = formatDate(targetMonth).substring(0, 7);

      const monthRevenue = paidPayments
        .filter(p => p.payment_date && p.payment_date.startsWith(monthKey))
        .reduce((sum, p) => sum + p.amount, 0);

      const monthNewSubscriptions = mockDatabase.subscriptions
        .filter(s => s.created_at.startsWith(monthKey))
        .length;

      const monthCancellations = mockDatabase.subscriptions
        .filter(s => s.status === 'cancelled' && s.updated_at.startsWith(monthKey))
        .length;

      monthlyTrends.push({
        month: monthKey,
        month_name: targetMonth.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }),
        revenue: monthRevenue,
        new_subscriptions: monthNewSubscriptions,
        cancellations: monthCancellations,
        net_subscriptions: monthNewSubscriptions - monthCancellations
      });
    }

    // Member demographics
    const memberDemographics = {
      total_members: mockDatabase.members.length,
      active_members: mockDatabase.members.filter(m => m.status === 'active').length,
      by_type: ['adult', 'child', 'elderly'].map(type => ({
        type,
        count: mockDatabase.members.filter(m => m.member_type === type).length,
        with_subscription: mockDatabase.members.filter(m =>
          m.member_type === type &&
          activeSubscriptions.some(s => s.member_id === m.id)
        ).length
      }))
    };

    // Overdue analysis
    const overduePayments = mockDatabase.payments.filter(p =>
      p.status === 'overdue' || (p.status === 'pending' && new Date(p.due_date) < now)
    );

    const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);
    const lateFeesAmount = overduePayments.reduce((sum, p) => sum + (p.late_fee || 0), 0);

    return {
      success: true,
      data: {
        // Summary metrics
        summary: {
          total_subscriptions: mockDatabase.subscriptions.length,
          active_subscriptions: activeSubscriptions.length,
          suspended_subscriptions: suspendedSubscriptions.length,
          cancelled_subscriptions: cancelledSubscriptions.length,
          expired_subscriptions: expiredSubscriptions.length,
          total_revenue: basicStats.totalRevenue,
          monthly_recurring_revenue: Math.round(mrr * 100) / 100,
          annual_recurring_revenue: Math.round(arr * 100) / 100,
          average_revenue_per_user: Math.round(arpu * 100) / 100,
          churn_rate: Math.round(churnRate * 100) / 100,
          payment_success_rate: Math.round(paymentSuccessRate * 100) / 100
        },

        // Revenue metrics
        revenue: {
          current_month: currentMonthRevenue,
          last_month: lastMonthRevenue,
          monthly_growth: calculatePercentageChange(currentMonthRevenue, lastMonthRevenue),
          yearly_total: yearlyRevenue,
          mrr: Math.round(mrr * 100) / 100,
          arr: Math.round(arr * 100) / 100,
          overdue_amount: overdueAmount,
          late_fees_amount: lateFeesAmount
        },

        // Subscription metrics
        subscriptions: {
          total: mockDatabase.subscriptions.length,
          active: activeSubscriptions.length,
          suspended: suspendedSubscriptions.length,
          cancelled: cancelledSubscriptions.length,
          expired: expiredSubscriptions.length,
          new_this_month: newSubscriptionsThisMonth,
          churn_rate: Math.round(churnRate * 100) / 100
        },

        // Plan distribution
        plan_distribution: planDistribution,

        // Monthly trends
        monthly_trends: monthlyTrends,

        // Member demographics
        member_demographics: memberDemographics,

        // Payment insights
        payment_insights: {
          total_payments: totalPayments,
          successful_payments: successfulPayments,
          pending_payments: mockDatabase.payments.filter(p => p.status === 'pending').length,
          overdue_payments: overduePayments.length,
          success_rate: Math.round(paymentSuccessRate * 100) / 100,
          average_payment_amount: totalPayments > 0 ? mockDatabase.payments.reduce((sum, p) => sum + p.amount, 0) / totalPayments : 0
        }
      },
      message: 'تم جلب تحليلات الاشتراكات بنجاح'
    };
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب التحليلات',
      details: error.message
    };
  }
};

/**
 * Get revenue analytics with detailed breakdown
 * @param {Object} filters - Date range and filters
 * @returns {Promise<Object>} Revenue analytics
 */
export const getRevenueAnalytics = async (filters = {}) => {
  try {
    const { start_date, end_date } = filters;
    let payments = mockDatabase.payments.filter(p => p.status === 'paid');

    // Apply date filters
    if (start_date && end_date) {
      payments = getDateRangeData(payments, 'payment_date', start_date, end_date);
    }

    // Group by payment method
    const paymentMethods = {};
    payments.forEach(payment => {
      const method = payment.payment_method || 'unknown';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 };
      }
      paymentMethods[method].count++;
      paymentMethods[method].total += payment.amount;
    });

    // Group by plan
    const revenueByPlan = {};
    payments.forEach(payment => {
      const subscription = mockDatabase.subscriptions.find(s => s.id === payment.subscription_id);
      const plan = subscription ? findPlanById(subscription.plan_id) : null;
      const planName = plan?.name_ar || 'خطة محذوفة';

      if (!revenueByPlan[planName]) {
        revenueByPlan[planName] = { count: 0, total: 0, plan_id: plan?.id };
      }
      revenueByPlan[planName].count++;
      revenueByPlan[planName].total += payment.amount;
    });

    // Monthly revenue breakdown
    const monthlyRevenue = groupByMonth(payments, 'payment_date');
    const monthlyBreakdown = Object.keys(monthlyRevenue).sort().map(month => ({
      month,
      month_name: new Date(month + '-01').toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }),
      payments_count: monthlyRevenue[month].length,
      total_revenue: monthlyRevenue[month].reduce((sum, p) => sum + p.amount, 0),
      average_payment: monthlyRevenue[month].reduce((sum, p) => sum + p.amount, 0) / monthlyRevenue[month].length
    }));

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      success: true,
      data: {
        total_revenue: totalRevenue,
        payments_count: payments.length,
        average_payment: totalRevenue / payments.length,
        payment_methods: Object.keys(paymentMethods).map(method => ({
          method,
          method_name: getPaymentMethodArabic(method),
          count: paymentMethods[method].count,
          total: paymentMethods[method].total,
          percentage: (paymentMethods[method].total / totalRevenue) * 100
        })),
        revenue_by_plan: Object.keys(revenueByPlan).map(planName => ({
          plan_name: planName,
          plan_id: revenueByPlan[planName].plan_id,
          count: revenueByPlan[planName].count,
          total: revenueByPlan[planName].total,
          percentage: (revenueByPlan[planName].total / totalRevenue) * 100
        })),
        monthly_breakdown: monthlyBreakdown
      },
      message: 'تم جلب تحليلات الإيرادات بنجاح'
    };
  } catch (error) {
    console.error('Error getting revenue analytics:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب تحليلات الإيرادات',
      details: error.message
    };
  }
};

/**
 * Get member engagement analytics
 * @returns {Promise<Object>} Member engagement data
 */
export const getMemberEngagementAnalytics = async () => {
  try {
    const activeMembers = mockDatabase.members.filter(m => m.status === 'active');
    const subscriptions = mockDatabase.subscriptions;

    // Subscription adoption rate
    const membersWithSubscription = activeMembers.filter(member =>
      subscriptions.some(sub => sub.member_id === member.id && sub.status === 'active')
    );

    const adoptionRate = (membersWithSubscription.length / activeMembers.length) * 100;

    // Member lifetime value
    const memberLTV = {};
    activeMembers.forEach(member => {
      const memberSubscriptions = subscriptions.filter(s => s.member_id === member.id);
      const memberPayments = mockDatabase.payments.filter(p => {
        const subscription = subscriptions.find(s => s.id === p.subscription_id);
        return subscription && subscription.member_id === member.id && p.status === 'paid';
      });

      const totalSpent = memberPayments.reduce((sum, p) => sum + p.amount, 0);
      const subscriptionCount = memberSubscriptions.length;
      const avgSubscriptionDuration = memberSubscriptions.length > 0 ?
        memberSubscriptions.reduce((sum, s) => {
          const start = new Date(s.created_at);
          const end = s.status === 'active' ? new Date() : new Date(s.updated_at);
          const months = (end - start) / (1000 * 60 * 60 * 24 * 30);
          return sum + months;
        }, 0) / memberSubscriptions.length : 0;

      memberLTV[member.id] = {
        member_name: member.name,
        total_spent: totalSpent,
        subscription_count: subscriptionCount,
        avg_subscription_duration: avgSubscriptionDuration,
        lifetime_value: totalSpent
      };
    });

    // Top spending members
    const topSpenders = Object.values(memberLTV)
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10);

    // Member segmentation
    const segments = {
      high_value: Object.values(memberLTV).filter(m => m.total_spent >= 500).length,
      medium_value: Object.values(memberLTV).filter(m => m.total_spent >= 100 && m.total_spent < 500).length,
      low_value: Object.values(memberLTV).filter(m => m.total_spent > 0 && m.total_spent < 100).length,
      no_spending: activeMembers.length - Object.keys(memberLTV).filter(id => memberLTV[id].total_spent > 0).length
    };

    return {
      success: true,
      data: {
        total_active_members: activeMembers.length,
        members_with_subscription: membersWithSubscription.length,
        adoption_rate: Math.round(adoptionRate * 100) / 100,
        member_segments: segments,
        top_spenders: topSpenders,
        average_lifetime_value: Object.values(memberLTV).reduce((sum, m) => sum + m.lifetime_value, 0) / Object.values(memberLTV).length
      },
      message: 'تم جلب تحليلات المشاركة للأعضاء بنجاح'
    };
  } catch (error) {
    console.error('Error getting member engagement analytics:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب تحليلات المشاركة',
      details: error.message
    };
  }
};

/**
 * Generate custom report
 * @param {Object} reportConfig - Report configuration
 * @returns {Promise<Object>} Custom report data
 */
export const generateCustomReport = async (reportConfig) => {
  try {
    const { type, date_range, filters, metrics } = reportConfig;

    let data = [];
    let reportData = {};

    switch (type) {
      case 'subscription_summary':
        reportData = await getSubscriptionSummaryReport(date_range, filters);
        break;
      case 'revenue_breakdown':
        reportData = await getRevenueBreakdownReport(date_range, filters);
        break;
      case 'member_activity':
        reportData = await getMemberActivityReport(date_range, filters);
        break;
      case 'plan_performance':
        reportData = await getPlanPerformanceReport(date_range, filters);
        break;
      default:
        throw new Error('نوع التقرير غير مدعوم');
    }

    return {
      success: true,
      data: reportData,
      generated_at: new Date().toISOString(),
      report_type: type,
      message: 'تم إنشاء التقرير المخصص بنجاح'
    };
  } catch (error) {
    console.error('Error generating custom report:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء إنشاء التقرير المخصص',
      details: error.message
    };
  }
};

// ====================
// HELPER FUNCTIONS
// ====================

/**
 * Get payment method name in Arabic
 */
const getPaymentMethodArabic = (method) => {
  const methods = {
    'credit_card': 'بطاقة ائتمان',
    'bank_transfer': 'تحويل بنكي',
    'cash': 'نقداً',
    'unknown': 'غير محدد'
  };
  return methods[method] || method;
};

/**
 * Subscription summary report
 */
const getSubscriptionSummaryReport = async (dateRange, filters) => {
  const subscriptions = mockDatabase.subscriptions;
  // Implementation details...
  return {
    title: 'تقرير ملخص الاشتراكات',
    data: subscriptions,
    summary: 'ملخص شامل لجميع الاشتراكات'
  };
};

/**
 * Revenue breakdown report
 */
const getRevenueBreakdownReport = async (dateRange, filters) => {
  const payments = mockDatabase.payments.filter(p => p.status === 'paid');
  // Implementation details...
  return {
    title: 'تقرير تفصيل الإيرادات',
    data: payments,
    summary: 'تفصيل شامل للإيرادات حسب المصدر والفترة'
  };
};

/**
 * Member activity report
 */
const getMemberActivityReport = async (dateRange, filters) => {
  const members = mockDatabase.members;
  // Implementation details...
  return {
    title: 'تقرير نشاط الأعضاء',
    data: members,
    summary: 'تفصيل نشاط الأعضاء واستخدام الخدمات'
  };
};

/**
 * Plan performance report
 */
const getPlanPerformanceReport = async (dateRange, filters) => {
  const plans = mockDatabase.plans;
  // Implementation details...
  return {
    title: 'تقرير أداء الخطط',
    data: plans,
    summary: 'تحليل أداء خطط الاشتراك المختلفة'
  };
};

// Export all functions
export default {
  getSubscriptionAnalytics,
  getRevenueAnalytics,
  getMemberEngagementAnalytics,
  generateCustomReport,
  formatDate,
  calculatePercentageChange,
  getDateRangeData
};