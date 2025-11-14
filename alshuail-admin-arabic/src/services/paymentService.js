/**
 * Payment Service - Al-Shuail Family Admin Dashboard
 * Complete payment processing and business logic
 */
import { logger } from '../utils/logger';


import {
  mockDatabase,
  findSubscriptionById,
  findMemberById,
  findPlanById
} from './mockData.js';

// ====================
// UTILITY FUNCTIONS
// ====================

/**
 * Generate unique ID for new records
 */
const generateId = (collection) => {
  const maxId = Math.max(...collection.map(item => item.id || 0), 0);
  return maxId + 1;
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Add months to a date
 */
const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Calculate days between dates
 */
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
};

/**
 * Generate transaction ID
 */
const generateTransactionId = () => {
  return 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// ====================
// PAYMENT FUNCTIONS
// ====================

/**
 * Update payment status
 * @param {number} subscriptionId - Subscription ID
 * @param {string} status - Payment status (paid, pending, overdue, cancelled)
 * @param {Object} options - Additional payment options
 * @returns {Promise<Object>} Updated payment or error
 */
export const updatePaymentStatus = async (subscriptionId, status, options = {}) => {
  try {
    const subscription = findSubscriptionById(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: 'الاشتراك غير موجود'
      };
    }

    // Find the latest pending payment for this subscription
    const payment = mockDatabase.payments
      .filter(p => p.subscription_id === subscriptionId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!payment) {
      return {
        success: false,
        error: 'لا توجد دفعات مرتبطة بهذا الاشتراك'
      };
    }

    const validStatuses = ['paid', 'pending', 'overdue', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: 'حالة الدفع غير صحيحة'
      };
    }

    // Update payment
    const oldStatus = payment.status;
    payment.status = status;
    payment.updated_at = new Date().toISOString();

    if (status === 'paid') {
      payment.payment_date = formatDate(options.payment_date || new Date());
      payment.transaction_id = options.transaction_id || generateTransactionId();
      payment.payment_method = options.payment_method || payment.payment_method;

      // Clear late fees if paid
      if (payment.late_fee > 0) {
        payment.notes += ` | تم إلغاء رسوم التأخير: ${payment.late_fee} د.ك`;
        payment.late_fee = 0;
      }
    } else if (status === 'overdue') {
      // Calculate late fee
      const daysLate = daysBetween(new Date(), new Date(payment.due_date));
      payment.late_fee = Math.min(daysLate * 2, payment.amount * 0.1); // 2 KD per day, max 10% of amount
    } else if (status === 'refunded') {
      payment.refund_date = formatDate(options.refund_date || new Date());
      payment.refund_amount = options.refund_amount || payment.amount;
      payment.refund_reason = options.refund_reason || 'استرداد بناءً على طلب العضو';
    }

    // Add payment history
    mockDatabase.subscription_history.push({
      id: generateId(mockDatabase.subscription_history),
      subscription_id: subscriptionId,
      action: `payment_${status}`,
      action_date: new Date().toISOString(),
      notes: `تم تحديث حالة الدفع من ${oldStatus} إلى ${status} - مبلغ: ${payment.amount} د.ك`,
      performed_by: 'نظام إدارة المدفوعات',
      created_at: new Date().toISOString()
    });

    // If payment is successful, handle subscription renewal
    if (status === 'paid' && subscription.auto_renew && subscription.end_date) {
      await handleAutoRenewal(subscription);
    }

    return {
      success: true,
      data: payment,
      message: `تم تحديث حالة الدفع إلى: ${getPaymentStatusArabic(status)}`
    };
  } catch (error) {
    logger.error('Error updating payment status:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء تحديث حالة الدفع',
      details: error.message
    };
  }
};

/**
 * Get overdue payments
 * @param {number} daysOverdue - Number of days overdue (default: 0 = any overdue)
 * @returns {Promise<Object>} Overdue payments list
 */
export const getOverduePayments = async (daysOverdue = 0) => {
  try {
    const today = new Date();
    let overduePayments = mockDatabase.payments.filter(payment => {
      const dueDate = new Date(payment.due_date);
      const daysPast = daysBetween(today, dueDate);

      return payment.status === 'pending' &&
             dueDate < today &&
             daysPast >= daysOverdue;
    });

    // Enrich with subscription and member data
    overduePayments = overduePayments.map(payment => {
      const subscription = findSubscriptionById(payment.subscription_id);
      const member = findMemberById(subscription?.member_id);
      const plan = findPlanById(subscription?.plan_id);
      const daysPast = daysBetween(today, new Date(payment.due_date));

      return {
        ...payment,
        days_overdue: daysPast,
        subscription_status: subscription?.status,
        member_name: member?.name || 'عضو محذوف',
        member_email: member?.email || '',
        member_phone: member?.phone || '',
        plan_name: plan?.name_ar || 'خطة محذوفة',
        calculated_late_fee: Math.min(daysPast * 2, payment.amount * 0.1)
      };
    });

    // Sort by days overdue (highest first)
    overduePayments.sort((a, b) => b.days_overdue - a.days_overdue);

    // Calculate totals
    const totalAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);
    const totalLateFees = overduePayments.reduce((sum, p) => sum + p.calculated_late_fee, 0);

    return {
      success: true,
      data: overduePayments,
      summary: {
        total_payments: overduePayments.length,
        total_amount: totalAmount,
        total_late_fees: totalLateFees,
        total_with_fees: totalAmount + totalLateFees
      },
      message: `تم العثور على ${overduePayments.length} دفعة متأخرة`
    };
  } catch (error) {
    logger.error('Error fetching overdue payments:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب الدفعات المتأخرة',
      details: error.message
    };
  }
};

/**
 * Generate payment reminders
 * @param {Object} options - Reminder options
 * @returns {Promise<Object>} Generated reminders
 */
export const generatePaymentReminders = async (options = {}) => {
  try {
    const today = new Date();
    const reminderDays = options.days_before || 7; // Remind 7 days before due
    const futureDate = addMonths(today, 0);
    futureDate.setDate(futureDate.getDate() + reminderDays);

    // Get payments due within reminder period
    const upcomingPayments = mockDatabase.payments.filter(payment => {
      const dueDate = new Date(payment.due_date);
      return payment.status === 'pending' &&
             dueDate >= today &&
             dueDate <= futureDate;
    });

    // Get overdue payments
    const overdueResult = await getOverduePayments(0);
    const overduePayments = overdueResult.success ? overdueResult.data : [];

    // Generate reminder messages
    const reminders = [];

    // Upcoming payment reminders
    upcomingPayments.forEach(payment => {
      const subscription = findSubscriptionById(payment.subscription_id);
      const member = findMemberById(subscription?.member_id);
      const plan = findPlanById(subscription?.plan_id);
      const daysUntilDue = daysBetween(new Date(payment.due_date), today);

      if (member && member.status === 'active') {
        reminders.push({
          type: 'upcoming',
          member_id: member.id,
          member_name: member.name,
          member_email: member.email,
          member_phone: member.phone,
          payment_id: payment.id,
          subscription_id: payment.subscription_id,
          amount: payment.amount,
          due_date: payment.due_date,
          days_until_due: daysUntilDue,
          plan_name: plan?.name_ar || 'خطة محذوفة',
          priority: daysUntilDue <= 3 ? 'high' : 'normal',
          message_ar: generateReminderMessage('upcoming', {
            member_name: member.name,
            amount: payment.amount,
            due_date: payment.due_date,
            plan_name: plan?.name_ar,
            days_until_due: daysUntilDue
          })
        });
      }
    });

    // Overdue payment reminders
    overduePayments.forEach(payment => {
      if (payment.member_name !== 'عضو محذوف') {
        reminders.push({
          type: 'overdue',
          member_id: payment.subscription?.member_id,
          member_name: payment.member_name,
          member_email: payment.member_email,
          member_phone: payment.member_phone,
          payment_id: payment.id,
          subscription_id: payment.subscription_id,
          amount: payment.amount,
          due_date: payment.due_date,
          days_overdue: payment.days_overdue,
          late_fee: payment.calculated_late_fee,
          total_amount: payment.amount + payment.calculated_late_fee,
          plan_name: payment.plan_name,
          priority: payment.days_overdue > 30 ? 'critical' : 'high',
          message_ar: generateReminderMessage('overdue', {
            member_name: payment.member_name,
            amount: payment.amount,
            due_date: payment.due_date,
            plan_name: payment.plan_name,
            days_overdue: payment.days_overdue,
            late_fee: payment.calculated_late_fee
          })
        });
      }
    });

    // Sort by priority and days
    reminders.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'normal': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // For overdue, sort by days overdue (descending)
      if (a.type === 'overdue' && b.type === 'overdue') {
        return b.days_overdue - a.days_overdue;
      }

      // For upcoming, sort by days until due (ascending)
      if (a.type === 'upcoming' && b.type === 'upcoming') {
        return a.days_until_due - b.days_until_due;
      }

      return a.type === 'overdue' ? -1 : 1; // Overdue first
    });

    return {
      success: true,
      data: reminders,
      summary: {
        total_reminders: reminders.length,
        upcoming_payments: reminders.filter(r => r.type === 'upcoming').length,
        overdue_payments: reminders.filter(r => r.type === 'overdue').length,
        critical_reminders: reminders.filter(r => r.priority === 'critical').length,
        high_priority: reminders.filter(r => r.priority === 'high').length
      },
      message: `تم إنشاء ${reminders.length} تذكير دفع`
    };
  } catch (error) {
    logger.error('Error generating payment reminders:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء إنشاء تذكيرات الدفع',
      details: error.message
    };
  }
};

/**
 * Process subscription payment
 * @param {number} paymentId - Payment ID
 * @param {Object} paymentData - Payment processing data
 * @returns {Promise<Object>} Payment processing result
 */
export const processPayment = async (paymentId, paymentData) => {
  try {
    const payment = mockDatabase.payments.find(p => p.id === paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'الدفعة غير موجودة'
      };
    }

    if (payment.status === 'paid') {
      return {
        success: false,
        error: 'تم دفع هذه الدفعة مسبقاً'
      };
    }

    const subscription = findSubscriptionById(payment.subscription_id);
    const member = findMemberById(subscription?.member_id);

    if (!subscription || subscription.status !== 'active') {
      return {
        success: false,
        error: 'الاشتراك غير نشط'
      };
    }

    // Validate payment amount
    const totalAmount = payment.amount + (payment.late_fee || 0);
    if (paymentData.amount < totalAmount) {
      return {
        success: false,
        error: `المبلغ المدفوع أقل من المطلوب. المبلغ المطلوب: ${totalAmount} د.ك`
      };
    }

    // Process payment
    payment.status = 'paid';
    payment.payment_date = formatDate(paymentData.payment_date || new Date());
    payment.transaction_id = paymentData.transaction_id || generateTransactionId();
    payment.payment_method = paymentData.payment_method || payment.payment_method;
    payment.amount_paid = paymentData.amount;

    if (paymentData.amount > totalAmount) {
      payment.overpaid_amount = paymentData.amount - totalAmount;
      payment.notes += ` | مبلغ إضافي: ${payment.overpaid_amount} د.ك`;
    }

    payment.updated_at = new Date().toISOString();

    // Add payment history
    mockDatabase.subscription_history.push({
      id: generateId(mockDatabase.subscription_history),
      subscription_id: payment.subscription_id,
      action: 'payment_processed',
      action_date: new Date().toISOString(),
      notes: `تم معالجة الدفع بنجاح - مبلغ: ${paymentData.amount} د.ك - طريقة الدفع: ${paymentData.payment_method}`,
      performed_by: 'نظام معالجة المدفوعات',
      created_at: new Date().toISOString()
    });

    // Create next payment if auto-renew is enabled
    if (subscription.auto_renew && subscription.end_date) {
      await createNextPayment(subscription);
    }

    return {
      success: true,
      data: {
        payment,
        member_name: member?.name,
        transaction_id: payment.transaction_id,
        receipt_number: `RCP-${payment.id}-${Date.now()}`
      },
      message: 'تم معالجة الدفع بنجاح'
    };
  } catch (error) {
    logger.error('Error processing payment:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء معالجة الدفع',
      details: error.message
    };
  }
};

/**
 * Get payment history for subscription
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Payment history
 */
export const getPaymentHistory = async (subscriptionId) => {
  try {
    const subscription = findSubscriptionById(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: 'الاشتراك غير موجود'
      };
    }

    const payments = mockDatabase.payments
      .filter(p => p.subscription_id === subscriptionId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const member = findMemberById(subscription.member_id);
    const plan = findPlanById(subscription.plan_id);

    // Calculate payment statistics
    const stats = {
      total_payments: payments.length,
      paid_payments: payments.filter(p => p.status === 'paid').length,
      pending_payments: payments.filter(p => p.status === 'pending').length,
      overdue_payments: payments.filter(p => p.status === 'overdue').length,
      total_paid_amount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      total_pending_amount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      total_overdue_amount: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0),
      total_late_fees: payments.reduce((sum, p) => sum + (p.late_fee || 0), 0)
    };

    return {
      success: true,
      data: {
        subscription: {
          ...subscription,
          member_name: member?.name,
          plan_name: plan?.name_ar
        },
        payments,
        statistics: stats
      },
      message: 'تم جلب تاريخ المدفوعات بنجاح'
    };
  } catch (error) {
    logger.error('Error fetching payment history:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب تاريخ المدفوعات',
      details: error.message
    };
  }
};

// ====================
// HELPER FUNCTIONS
// ====================

/**
 * Handle automatic subscription renewal
 */
const handleAutoRenewal = async (subscription) => {
  const plan = findPlanById(subscription.plan_id);
  if (!plan || plan.duration_months === -1) return; // Skip for lifetime plans

  const endDate = new Date(subscription.end_date);
  const renewalDate = addMonths(endDate, plan.duration_months);

  // Update subscription end date
  subscription.end_date = formatDate(renewalDate);
  subscription.updated_at = new Date().toISOString();

  // Create next payment
  await createNextPayment(subscription);
};

/**
 * Create next payment for subscription
 */
const createNextPayment = async (subscription) => {
  const plan = findPlanById(subscription.plan_id);
  if (!plan) return;

  const nextPayment = {
    id: generateId(mockDatabase.payments),
    subscription_id: subscription.id,
    amount: plan.price * (1 - subscription.discount_applied / 100),
    due_date: formatDate(addMonths(new Date(subscription.end_date), -plan.duration_months + 1)),
    status: 'pending',
    payment_date: null,
    payment_method: subscription.payment_method,
    transaction_id: null,
    late_fee: 0,
    notes: 'دفعة تجديد تلقائية',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockDatabase.payments.push(nextPayment);
};

/**
 * Generate reminder message in Arabic
 */
const generateReminderMessage = (type, data) => {
  if (type === 'upcoming') {
    return `عزيزي/عزيزتي ${data.member_name}،\n\nنذكركم بأن موعد دفع اشتراك ${data.plan_name} سيحل في ${data.days_until_due} أيام (${data.due_date}).\n\nالمبلغ المستحق: ${data.amount} د.ك\n\nيرجى المبادرة بالدفع لتجنب أي رسوم إضافية.\n\nشكراً لكم،\nإدارة عائلة الشعيل`;
  } else if (type === 'overdue') {
    return `عزيزي/عزيزتي ${data.member_name}،\n\nنود تذكيركم بأن دفعة اشتراك ${data.plan_name} متأخرة منذ ${data.days_overdue} يوم.\n\nالمبلغ الأساسي: ${data.amount} د.ك\nرسوم التأخير: ${data.late_fee} د.ك\nالإجمالي: ${data.amount + data.late_fee} د.ك\n\nيرجى المبادرة بالدفع في أقرب وقت ممكن.\n\nشكراً لكم،\nإدارة عائلة الشعيل`;
  }
  return '';
};

/**
 * Get payment status in Arabic
 */
const getPaymentStatusArabic = (status) => {
  const statusMap = {
    'paid': 'مدفوع',
    'pending': 'في الانتظار',
    'overdue': 'متأخر',
    'cancelled': 'ملغى',
    'refunded': 'مسترد'
  };
  return statusMap[status] || status;
};

// Export all functions
export default {
  updatePaymentStatus,
  getOverduePayments,
  generatePaymentReminders,
  processPayment,
  getPaymentHistory,
  generateTransactionId,
  daysBetween,
  getPaymentStatusArabic
};