/**
 * Subscription Service - Al-Shuail Family Admin Dashboard
 * Complete backend logic and business rules for subscription management
 */

import {
  mockDatabase,
  findMemberById,
  findPlanById,
  findSubscriptionById,
  getMockStats
} from './mockData.js';
import PaymentValidationService from './paymentValidationService.js';

import { logger } from '../utils/logger';

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
 * Check if date is in the past
 */
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Calculate prorated amount for partial periods
 */
const calculateProratedAmount = (fullAmount, daysUsed, totalDays) => {
  return Math.round((fullAmount * daysUsed / totalDays) * 100) / 100;
};

// ====================
// VALIDATION FUNCTIONS
// ====================

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Kuwait format)
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
};

/**
 * Validate Arabic text
 */
const isValidArabicText = (text) => {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text) && text.trim().length > 0;
};

/**
 * Validate plan data
 */
const validatePlanData = (planData) => {
  const errors = [];

  if (!planData.name_ar || !isValidArabicText(planData.name_ar)) {
    errors.push('اسم الخطة باللغة العربية مطلوب');
  }

  if (!planData.description_ar || !isValidArabicText(planData.description_ar)) {
    errors.push('وصف الخطة باللغة العربية مطلوب');
  }

  if (!planData.price || planData.price <= 0) {
    errors.push('سعر الخطة يجب أن يكون أكبر من الصفر');
  }

  if (!planData.duration_months || (planData.duration_months < 1 && planData.duration_months !== -1)) {
    errors.push('مدة الاشتراك يجب أن تكون شهر واحد على الأقل أو -1 للاشتراك الدائم');
  }

  return errors;
};

/**
 * Validate member data
 */
const validateMemberData = (memberData) => {
  const errors = [];

  if (!memberData.name || !isValidArabicText(memberData.name)) {
    errors.push('اسم العضو باللغة العربية مطلوب');
  }

  if (!memberData.email || !isValidEmail(memberData.email)) {
    errors.push('البريد الإلكتروني غير صحيح');
  }

  if (!memberData.phone || !isValidPhone(memberData.phone)) {
    errors.push('رقم الهاتف غير صحيح');
  }

  return errors;
};

// ====================
// SUBSCRIPTION PLAN FUNCTIONS
// ====================

/**
 * Get all subscription plans
 * @param {Object} filters - Optional filters (status, price_range)
 * @returns {Promise<Object>} Plans data with pagination
 */
export const getSubscriptionPlans = async (filters = {}) => {
  try {
    let plans = [...mockDatabase.plans];

    // Apply filters
    if (filters.status) {
      plans = plans.filter(plan => plan.status === filters.status);
    }

    if (filters.price_min !== undefined) {
      plans = plans.filter(plan => plan.price >= filters.price_min);
    }

    if (filters.price_max !== undefined) {
      plans = plans.filter(plan => plan.price <= filters.price_max);
    }

    if (filters.duration_months !== undefined) {
      plans = plans.filter(plan => plan.duration_months === filters.duration_months);
    }

    // Sort by price ascending by default
    plans.sort((a, b) => a.price - b.price);

    return {
      success: true,
      data: plans,
      total: plans.length,
      message: 'تم جلب خطط الاشتراك بنجاح'
    };
  } catch (error) {
    logger.error('Error fetching subscription plans:', { error });
    return {
      success: false,
      data: [],
      error: 'حدث خطأ أثناء جلب خطط الاشتراك',
      details: error.message
    };
  }
};

/**
 * Create new subscription plan
 * @param {Object} planData - Plan information
 * @returns {Promise<Object>} Created plan or error
 */
export const createSubscriptionPlan = async (planData) => {
  try {
    // Validate input data
    const validationErrors = validatePlanData(planData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'بيانات الخطة غير صحيحة',
        validation_errors: validationErrors
      };
    }

    // Check for duplicate plan names
    const existingPlan = mockDatabase.plans.find(
      plan => plan.name_ar.toLowerCase() === planData.name_ar.toLowerCase()
    );

    if (existingPlan) {
      return {
        success: false,
        error: 'خطة بنفس الاسم موجودة مسبقاً'
      };
    }

    // Create new plan
    const newPlan = {
      id: generateId(mockDatabase.plans),
      name_ar: planData.name_ar.trim(),
      description_ar: planData.description_ar.trim(),
      price: parseFloat(planData.price),
      duration_months: parseInt(planData.duration_months),
      status: planData.status || 'active',
      features: planData.features || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockDatabase.plans.push(newPlan);

    return {
      success: true,
      data: newPlan,
      message: 'تم إنشاء الخطة بنجاح'
    };
  } catch (error) {
    logger.error('Error creating subscription plan:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء إنشاء الخطة',
      details: error.message
    };
  }
};

/**
 * Update subscription plan
 * @param {number} planId - Plan ID
 * @param {Object} planData - Updated plan data
 * @returns {Promise<Object>} Updated plan or error
 */
export const updateSubscriptionPlan = async (planId, planData) => {
  try {
    const plan = findPlanById(planId);
    if (!plan) {
      return {
        success: false,
        error: 'الخطة غير موجودة'
      };
    }

    // Validate input data
    const validationErrors = validatePlanData(planData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'بيانات الخطة غير صحيحة',
        validation_errors: validationErrors
      };
    }

    // Check for active subscriptions before major changes
    const activeSubscriptions = mockDatabase.subscriptions.filter(
      sub => sub.plan_id === planId && sub.status === 'active'
    );

    if (activeSubscriptions.length > 0 && planData.price !== plan.price) {
      return {
        success: false,
        error: `لا يمكن تغيير سعر الخطة لوجود ${activeSubscriptions.length} اشتراك نشط. يرجى إلغاء أو تعليق الاشتراكات أولاً`
      };
    }

    // Update plan
    Object.assign(plan, {
      ...planData,
      id: plan.id, // Preserve ID
      updated_at: new Date().toISOString()
    });

    return {
      success: true,
      data: plan,
      message: 'تم تحديث الخطة بنجاح'
    };
  } catch (error) {
    logger.error('Error updating subscription plan:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء تحديث الخطة',
      details: error.message
    };
  }
};

/**
 * Delete subscription plan
 * @param {number} planId - Plan ID
 * @returns {Promise<Object>} Success status or error
 */
export const deleteSubscriptionPlan = async (planId) => {
  try {
    const plan = findPlanById(planId);
    if (!plan) {
      return {
        success: false,
        error: 'الخطة غير موجودة'
      };
    }

    // Check for active subscriptions
    const activeSubscriptions = mockDatabase.subscriptions.filter(
      sub => sub.plan_id === planId && ['active', 'suspended'].includes(sub.status)
    );

    if (activeSubscriptions.length > 0) {
      return {
        success: false,
        error: `لا يمكن حذف الخطة لوجود ${activeSubscriptions.length} اشتراك نشط أو معلق`
      };
    }

    // Soft delete by changing status
    plan.status = 'deleted';
    plan.updated_at = new Date().toISOString();

    return {
      success: true,
      message: 'تم حذف الخطة بنجاح'
    };
  } catch (error) {
    logger.error('Error deleting subscription plan:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء حذف الخطة',
      details: error.message
    };
  }
};

// ====================
// MEMBER SUBSCRIPTION FUNCTIONS
// ====================

/**
 * Assign subscription to member
 * @param {number} memberId - Member ID
 * @param {number} planId - Plan ID
 * @param {Object} options - Additional options (start_date, payment_method, etc.)
 * @returns {Promise<Object>} Created subscription or error
 */
export const assignSubscriptionToMember = async (memberId, planId, options = {}) => {
  try {
    const member = findMemberById(memberId);
    const plan = findPlanById(planId);

    if (!member) {
      return {
        success: false,
        error: 'العضو غير موجود'
      };
    }

    if (!plan || plan.status !== 'active') {
      return {
        success: false,
        error: 'الخطة غير موجودة أو غير فعالة'
      };
    }

    if (member.status !== 'active') {
      return {
        success: false,
        error: 'لا يمكن إنشاء اشتراك لعضو غير نشط'
      };
    }

    // Check for existing active subscription
    const existingSubscription = mockDatabase.subscriptions.find(
      sub => sub.member_id === memberId && sub.status === 'active'
    );

    if (existingSubscription) {
      return {
        success: false,
        error: 'العضو لديه اشتراك نشط بالفعل. يرجى إلغاء الاشتراك الحالي أولاً'
      };
    }

    // Calculate subscription dates
    const startDate = new Date(options.start_date || new Date());
    let endDate = null;

    if (plan.duration_months !== -1) {
      endDate = addMonths(startDate, plan.duration_months);
    }

    // Create new subscription
    const newSubscription = {
      id: generateId(mockDatabase.subscriptions),
      member_id: memberId,
      plan_id: planId,
      start_date: formatDate(startDate),
      end_date: endDate ? formatDate(endDate) : null,
      status: 'active',
      auto_renew: options.auto_renew !== undefined ? options.auto_renew : true,
      payment_method: options.payment_method || 'credit_card',
      discount_applied: options.discount_applied || 0,
      notes: options.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockDatabase.subscriptions.push(newSubscription);

    // Create subscription history entry
    mockDatabase.subscription_history.push({
      id: generateId(mockDatabase.subscription_history),
      subscription_id: newSubscription.id,
      action: 'created',
      action_date: new Date().toISOString(),
      notes: 'تم إنشاء الاشتراك بنجاح',
      performed_by: 'نظام إدارة الاشتراكات',
      created_at: new Date().toISOString()
    });

    // Create first payment record
    const firstPayment = {
      id: generateId(mockDatabase.payments),
      subscription_id: newSubscription.id,
      amount: plan.price * (1 - newSubscription.discount_applied / 100),
      due_date: formatDate(addMonths(startDate, 0)), // Due immediately
      status: 'pending',
      payment_date: null,
      payment_method: newSubscription.payment_method,
      transaction_id: null,
      late_fee: 0,
      notes: 'أول دفعة للاشتراك',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockDatabase.payments.push(firstPayment);

    return {
      success: true,
      data: {
        ...newSubscription,
        member_name: member.name,
        plan_name: plan.name_ar,
        first_payment: firstPayment
      },
      message: 'تم إنشاء الاشتراك بنجاح'
    };
  } catch (error) {
    logger.error('Error assigning subscription to member:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء إنشاء الاشتراك',
      details: error.message
    };
  }
};

/**
 * Get subscriptions by member
 * @param {number} memberId - Member ID
 * @returns {Promise<Object>} Member subscriptions
 */
export const getSubscriptionsByMember = async (memberId) => {
  try {
    const member = findMemberById(memberId);
    if (!member) {
      return {
        success: false,
        error: 'العضو غير موجود'
      };
    }

    const subscriptions = mockDatabase.subscriptions
      .filter(sub => sub.member_id === memberId)
      .map(subscription => {
        const plan = findPlanById(subscription.plan_id);
        const payments = mockDatabase.payments.filter(p => p.subscription_id === subscription.id);

        return {
          ...subscription,
          member_name: member.name,
          plan_name: plan?.name_ar || 'خطة محذوفة',
          plan_price: plan?.price || 0,
          total_payments: payments.length,
          paid_amount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
          overdue_payments: payments.filter(p => p.status === 'overdue').length
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      success: true,
      data: {
        member,
        subscriptions,
        total_subscriptions: subscriptions.length,
        active_subscriptions: subscriptions.filter(s => s.status === 'active').length
      },
      message: 'تم جلب اشتراكات العضو بنجاح'
    };
  } catch (error) {
    logger.error('Error fetching member subscriptions:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب اشتراكات العضو',
      details: error.message
    };
  }
};

/**
 * Get all subscriptions with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Filtered subscriptions
 */
export const getAllSubscriptions = async (filters = {}) => {
  try {
    let subscriptions = [...mockDatabase.subscriptions];

    // Apply filters
    if (filters.status) {
      subscriptions = subscriptions.filter(sub => sub.status === filters.status);
    }

    if (filters.plan_id) {
      subscriptions = subscriptions.filter(sub => sub.plan_id === parseInt(filters.plan_id));
    }

    if (filters.member_id) {
      subscriptions = subscriptions.filter(sub => sub.member_id === parseInt(filters.member_id));
    }

    if (filters.start_date) {
      subscriptions = subscriptions.filter(sub => sub.start_date >= filters.start_date);
    }

    if (filters.end_date) {
      subscriptions = subscriptions.filter(sub =>
        sub.end_date && sub.end_date <= filters.end_date
      );
    }

    if (filters.auto_renew !== undefined) {
      subscriptions = subscriptions.filter(sub => sub.auto_renew === filters.auto_renew);
    }

    // Enrich with member and plan data
    const enrichedSubscriptions = subscriptions.map(subscription => {
      const member = findMemberById(subscription.member_id);
      const plan = findPlanById(subscription.plan_id);
      const payments = mockDatabase.payments.filter(p => p.subscription_id === subscription.id);

      return {
        ...subscription,
        member_name: member?.name || 'عضو محذوف',
        member_email: member?.email || '',
        plan_name: plan?.name_ar || 'خطة محذوفة',
        plan_price: plan?.price || 0,
        total_payments: payments.length,
        paid_amount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
        pending_amount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
        overdue_amount: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0)
      };
    });

    // Sort by creation date (newest first)
    enrichedSubscriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedSubscriptions = enrichedSubscriptions.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedSubscriptions,
      pagination: {
        current_page: page,
        per_page: limit,
        total: enrichedSubscriptions.length,
        total_pages: Math.ceil(enrichedSubscriptions.length / limit)
      },
      message: 'تم جلب الاشتراكات بنجاح'
    };
  } catch (error) {
    logger.error('Error fetching all subscriptions:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب الاشتراكات',
      details: error.message
    };
  }
};

/**
 * Update subscription status
 * @param {number} subscriptionId - Subscription ID
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Updated subscription or error
 */
export const updateSubscriptionStatus = async (subscriptionId, status, notes = '') => {
  try {
    const subscription = findSubscriptionById(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: 'الاشتراك غير موجود'
      };
    }

    const validStatuses = ['active', 'suspended', 'cancelled', 'expired'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: 'حالة الاشتراك غير صحيحة'
      };
    }

    const oldStatus = subscription.status;
    subscription.status = status;
    subscription.updated_at = new Date().toISOString();

    // Add to subscription history
    mockDatabase.subscription_history.push({
      id: generateId(mockDatabase.subscription_history),
      subscription_id: subscriptionId,
      action: status,
      action_date: new Date().toISOString(),
      notes: notes || `تم تغيير حالة الاشتراك من ${oldStatus} إلى ${status}`,
      performed_by: 'نظام إدارة الاشتراكات',
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      data: subscription,
      message: `تم تحديث حالة الاشتراك إلى: ${status}`
    };
  } catch (error) {
    logger.error('Error updating subscription status:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء تحديث حالة الاشتراك',
      details: error.message
    };
  }
};

// ====================
// FLEXIBLE SUBSCRIPTION FUNCTIONS
// ====================

/**
 * Create flexible subscription with custom amount
 * @param {Object} subscriptionData - Subscription data with flexible amount
 * @returns {Promise<Object>} Created subscription or error
 */
export const createFlexibleSubscription = async (subscriptionData) => {
  try {
    const { member_id, amount, duration, payment_method } = subscriptionData;

    // Validate required fields
    if (!member_id || !amount) {
      return {
        success: false,
        error: 'البيانات المطلوبة مفقودة',
        validation_errors: ['member_id', 'amount']
      };
    }

    // Validate amount using PaymentValidationService
    const amountValidation = PaymentValidationService.validateSubscriptionAmount(amount);
    if (!amountValidation.isValid) {
      return {
        success: false,
        error: amountValidation.message,
        code: amountValidation.code,
        validation_details: amountValidation
      };
    }

    // Validate member exists and is active
    const member = findMemberById(member_id);
    if (!member) {
      return {
        success: false,
        error: 'العضو غير موجود'
      };
    }

    if (member.status !== 'active') {
      return {
        success: false,
        error: 'لا يمكن إنشاء اشتراك لعضو غير نشط'
      };
    }

    // Check for existing active subscription
    const existingSubscription = await getActiveSubscriptionByMember(member_id);
    if (existingSubscription.success && existingSubscription.data) {
      return {
        success: false,
        error: 'العضو لديه اشتراك نشط بالفعل. يرجى إلغاء الاشتراك الحالي أولاً',
        existing_subscription: existingSubscription.data
      };
    }

    // Calculate subscription details
    const subscriptionDetails = PaymentValidationService.calculateSubscriptionDetails(
      amountValidation.amount,
      duration || 'monthly'
    );

    // Create subscription record
    const newSubscription = {
      id: generateId(mockDatabase.subscriptions),
      member_id,
      amount: amountValidation.amount,
      currency: subscriptionDetails.currency,
      duration: subscriptionDetails.duration,
      duration_months: subscriptionDetails.duration_months,
      start_date: formatDate(subscriptionDetails.start_date),
      end_date: subscriptionDetails.end_date ? formatDate(subscriptionDetails.end_date) : null,
      payment_method: payment_method || 'credit_card',
      status: 'pending_payment',
      auto_renew: subscriptionData.auto_renew !== undefined ? subscriptionData.auto_renew : true,
      discount_applied: subscriptionData.discount_applied || 0,
      is_flexible: true, // Mark as flexible subscription
      notes: subscriptionData.notes || 'اشتراك مرن بمبلغ مخصص',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to mock database
    mockDatabase.subscriptions.push(newSubscription);

    // Create subscription history entry
    mockDatabase.subscription_history.push({
      id: generateId(mockDatabase.subscription_history),
      subscription_id: newSubscription.id,
      action: 'created',
      action_date: new Date().toISOString(),
      notes: `تم إنشاء اشتراك مرن بمبلغ ${amountValidation.formatted.arabic}`,
      performed_by: 'نظام الاشتراكات المرنة',
      created_at: new Date().toISOString()
    });

    // Create payment record
    const paymentRecord = await createFlexiblePaymentRecord(newSubscription, amountValidation.amount);

    // Enrich response data
    const responseData = {
      ...newSubscription,
      member_name: member.name,
      member_email: member.email,
      formatted_amount: amountValidation.formatted,
      subscription_details: subscriptionDetails.formatted_details,
      first_payment: paymentRecord,
      validation_passed: amountValidation
    };

    return {
      success: true,
      data: responseData,
      message: `تم إنشاء الاشتراك المرن بنجاح بمبلغ ${amountValidation.formatted.arabic}`
    };
  } catch (error) {
    logger.error('Error creating flexible subscription:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء إنشاء الاشتراك المرن',
      details: error.message
    };
  }
};

/**
 * Update subscription amount (for existing flexible subscriptions)
 * @param {number} subscriptionId - Subscription ID
 * @param {number} newAmount - New subscription amount
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Updated subscription or error
 */
export const updateSubscriptionAmount = async (subscriptionId, newAmount, options = {}) => {
  try {
    // Validate new amount
    const amountValidation = PaymentValidationService.validateSubscriptionAmount(newAmount);
    if (!amountValidation.isValid) {
      return {
        success: false,
        error: amountValidation.message,
        validation_details: amountValidation
      };
    }

    // Find subscription
    const subscription = findSubscriptionById(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: 'الاشتراك غير موجود'
      };
    }

    // Check if subscription allows amount changes
    if (!subscription.is_flexible && subscription.plan_id) {
      return {
        success: false,
        error: 'لا يمكن تغيير مبلغ اشتراك الخطة الثابتة. يرجى إنشاء اشتراك مرن جديد'
      };
    }

    const currentAmount = subscription.amount;

    // Check if it's an upgrade
    if (options.validate_upgrade) {
      const upgradeValidation = PaymentValidationService.validateSubscriptionUpgrade(
        currentAmount,
        newAmount
      );

      if (!upgradeValidation.isValid) {
        return {
          success: false,
          error: upgradeValidation.message,
          upgrade_validation: upgradeValidation
        };
      }
    }

    // Calculate prorated amount if mid-cycle change
    let proratedCalculation = null;
    if (options.apply_proration && subscription.start_date && subscription.end_date) {
      const currentPeriodStart = new Date(subscription.start_date);
      const currentPeriodEnd = new Date(subscription.end_date);

      proratedCalculation = PaymentValidationService.calculateProratedAmount(
        newAmount,
        currentPeriodStart,
        currentPeriodEnd,
        options.change_date ? new Date(options.change_date) : new Date()
      );
    }

    // Update subscription
    subscription.amount = amountValidation.amount;
    subscription.updated_at = new Date().toISOString();

    if (options.update_notes) {
      subscription.notes = `${subscription.notes || ''}\nتحديث المبلغ: من ${currentAmount} إلى ${newAmount} ريال`;
    }

    // Add to history
    mockDatabase.subscription_history.push({
      id: generateId(mockDatabase.subscription_history),
      subscription_id: subscriptionId,
      action: 'amount_updated',
      action_date: new Date().toISOString(),
      notes: `تم تحديث المبلغ من ${currentAmount} إلى ${newAmount} ريال سعودي`,
      performed_by: 'نظام الاشتراكات المرنة',
      created_at: new Date().toISOString()
    });

    // Create additional payment if needed (for upgrades)
    let additionalPayment = null;
    if (proratedCalculation && proratedCalculation.prorated_amount > 0) {
      additionalPayment = {
        id: generateId(mockDatabase.payments),
        subscription_id: subscriptionId,
        amount: proratedCalculation.prorated_amount,
        due_date: formatDate(new Date()),
        status: 'pending',
        payment_date: null,
        payment_method: subscription.payment_method,
        transaction_id: null,
        late_fee: 0,
        notes: `مبلغ متناسب لترقية الاشتراك - ${proratedCalculation.remaining_days} يوم متبقي`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDatabase.payments.push(additionalPayment);
    }

    return {
      success: true,
      data: {
        subscription,
        previous_amount: currentAmount,
        new_amount: amountValidation.amount,
        formatted_amounts: {
          previous: PaymentValidationService.formatAmount(currentAmount),
          new: amountValidation.formatted
        },
        proration: proratedCalculation,
        additional_payment: additionalPayment
      },
      message: `تم تحديث مبلغ الاشتراك بنجاح إلى ${amountValidation.formatted.arabic}`
    };
  } catch (error) {
    logger.error('Error updating subscription amount:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء تحديث مبلغ الاشتراك',
      details: error.message
    };
  }
};

/**
 * Get active subscription for member
 * @param {number} memberId - Member ID
 * @returns {Promise<Object>} Active subscription or null
 */
export const getActiveSubscriptionByMember = async (memberId) => {
  try {
    const activeSubscription = mockDatabase.subscriptions.find(
      sub => sub.member_id === memberId && sub.status === 'active'
    );

    if (!activeSubscription) {
      return {
        success: true,
        data: null,
        message: 'لا يوجد اشتراك نشط للعضو'
      };
    }

    const member = findMemberById(memberId);
    const enrichedSubscription = {
      ...activeSubscription,
      member_name: member?.name,
      member_email: member?.email,
      formatted_amount: PaymentValidationService.formatAmount(activeSubscription.amount),
      is_flexible: activeSubscription.is_flexible || false
    };

    return {
      success: true,
      data: enrichedSubscription,
      message: 'تم العثور على اشتراك نشط'
    };
  } catch (error) {
    logger.error('Error getting active subscription:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء البحث عن الاشتراك النشط',
      details: error.message
    };
  }
};

/**
 * Create payment record for flexible subscription
 * @param {Object} subscription - Subscription object
 * @param {number} amount - Payment amount
 * @returns {Object} Created payment record
 */
const createFlexiblePaymentRecord = async (subscription, amount) => {
  try {
    const payment = {
      id: generateId(mockDatabase.payments),
      subscription_id: subscription.id,
      amount: amount,
      due_date: formatDate(new Date()), // Due immediately
      status: 'pending',
      payment_date: null,
      payment_method: subscription.payment_method,
      transaction_id: null,
      late_fee: 0,
      notes: 'دفعة اشتراك مرن - مبلغ مخصص',
      is_flexible_payment: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockDatabase.payments.push(payment);
    return payment;
  } catch (error) {
    logger.error('Error creating flexible payment record:', { error });
    throw new Error('فشل في إنشاء سجل الدفع');
  }
};

/**
 * Get member subscription status with flexible subscription support
 * @param {number} memberId - Member ID
 * @returns {Promise<Object>} Member subscription status
 */
export const getMemberSubscriptionStatus = async (memberId) => {
  try {
    const member = findMemberById(memberId);
    if (!member) {
      return {
        success: false,
        error: 'العضو غير موجود'
      };
    }

    const activeSubscription = await getActiveSubscriptionByMember(memberId);
    const allSubscriptions = mockDatabase.subscriptions.filter(s => s.member_id === memberId);
    const payments = mockDatabase.payments.filter(p =>
      allSubscriptions.some(s => s.id === p.subscription_id)
    );

    const overduePayments = payments.filter(p => p.status === 'overdue');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

    return {
      success: true,
      data: {
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          status: member.status
        },
        subscription_status: {
          has_active: activeSubscription.data !== null,
          active_subscription: activeSubscription.data,
          total_subscriptions: allSubscriptions.length,
          flexible_subscriptions: allSubscriptions.filter(s => s.is_flexible).length
        },
        payment_status: {
          total_paid: totalPaid,
          formatted_total_paid: PaymentValidationService.formatAmount(totalPaid),
          overdue_count: overduePayments.length,
          pending_count: pendingPayments.length,
          overdue_amount: overduePayments.reduce((sum, p) => sum + p.amount, 0),
          pending_amount: pendingPayments.reduce((sum, p) => sum + p.amount, 0)
        },
        can_create_flexible: activeSubscription.data === null,
        payment_options: PaymentValidationService.getPaymentMethodRules()
      },
      message: 'تم جلب حالة اشتراك العضو بنجاح'
    };
  } catch (error) {
    logger.error('Error getting member subscription status:', { error });
    return {
      success: false,
      error: 'حدث خطأ أثناء جلب حالة الاشتراك',
      details: error.message
    };
  }
};

// Export all functions as default
export default {
  // Plan management
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,

  // Subscription management
  assignSubscriptionToMember,
  getSubscriptionsByMember,
  getAllSubscriptions,
  updateSubscriptionStatus,

  // Flexible subscription management
  createFlexibleSubscription,
  updateSubscriptionAmount,
  getActiveSubscriptionByMember,
  getMemberSubscriptionStatus,

  // Utility functions
  validatePlanData,
  validateMemberData,
  calculateProratedAmount,
  formatDate,
  addMonths
};