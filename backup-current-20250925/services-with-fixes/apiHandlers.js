/**
 * API Handlers - Al-Shuail Family Admin Dashboard
 * API endpoint handlers that the frontend can integrate with
 */

import subscriptionService from './subscriptionService.js';
import paymentService from './paymentService.js';
import analyticsService from './analyticsService.js';
import PaymentValidationService from './paymentValidationService.js';
import { mockDatabase, findMemberById, findPlanById, findSubscriptionById } from './mockData.js';

// ====================
// ERROR HANDLING UTILITIES
// ====================

/**
 * Standard API response wrapper
 */
const createResponse = (success, data = null, message = '', error = null, statusCode = 200) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    status_code: statusCode
  };

  if (success) {
    response.data = data;
  } else {
    response.error = error;
  }

  return response;
};

/**
 * Error handler middleware
 */
const handleError = (error, context = 'API') => {
  console.error(`[${context}] Error:`, error);

  // Log error details for debugging
  const errorLog = {
    timestamp: new Date().toISOString(),
    context,
    error: error.message,
    stack: error.stack
  };

  console.log('Error Details:', errorLog);

  return createResponse(
    false,
    null,
    'حدث خطأ في الخادم',
    {
      message: error.message,
      type: error.name || 'ServerError'
    },
    500
  );
};

/**
 * Validate request parameters
 */
const validateRequest = (params, requiredFields) => {
  const missing = [];
  const invalid = [];

  requiredFields.forEach(field => {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
      missing.push(field);
    }
  });

  if (missing.length > 0) {
    return {
      valid: false,
      error: `الحقول المطلوبة مفقودة: ${missing.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Validate ID parameter
 */
const validateId = (id, entityName = 'العنصر') => {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId <= 0) {
    return {
      valid: false,
      error: `معرف ${entityName} غير صحيح`
    };
  }
  return { valid: true, id: parsedId };
};

// ====================
// SUBSCRIPTION PLAN API HANDLERS
// ====================

/**
 * GET /api/subscriptions/plans
 * Get all subscription plans with optional filtering
 */
export const getSubscriptionPlansHandler = async (query = {}) => {
  try {
    const result = await subscriptionService.getSubscriptionPlans(query);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, result.validation_errors, 400);
    }
  } catch (error) {
    return handleError(error, 'getSubscriptionPlans');
  }
};

/**
 * POST /api/subscriptions/plans
 * Create new subscription plan
 */
export const createSubscriptionPlanHandler = async (planData) => {
  try {
    const validation = validateRequest(planData, ['name_ar', 'description_ar', 'price', 'duration_months']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await subscriptionService.createSubscriptionPlan(planData);

    if (result.success) {
      return createResponse(true, result.data, result.message, null, 201);
    } else {
      return createResponse(false, null, result.error, result.validation_errors, 400);
    }
  } catch (error) {
    return handleError(error, 'createSubscriptionPlan');
  }
};

/**
 * PUT /api/subscriptions/plans/:id
 * Update subscription plan
 */
export const updateSubscriptionPlanHandler = async (planId, planData) => {
  try {
    const idValidation = validateId(planId, 'الخطة');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const validation = validateRequest(planData, ['name_ar', 'description_ar', 'price', 'duration_months']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await subscriptionService.updateSubscriptionPlan(idValidation.id, planData);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'updateSubscriptionPlan');
  }
};

/**
 * DELETE /api/subscriptions/plans/:id
 * Delete subscription plan
 */
export const deleteSubscriptionPlanHandler = async (planId) => {
  try {
    const idValidation = validateId(planId, 'الخطة');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const result = await subscriptionService.deleteSubscriptionPlan(idValidation.id);

    if (result.success) {
      return createResponse(true, null, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'deleteSubscriptionPlan');
  }
};

// ====================
// SUBSCRIPTION MANAGEMENT API HANDLERS
// ====================

/**
 * GET /api/subscriptions/members/:id
 * Get subscriptions for a specific member
 */
export const getMemberSubscriptionsHandler = async (memberId) => {
  try {
    const idValidation = validateId(memberId, 'العضو');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const result = await subscriptionService.getSubscriptionsByMember(idValidation.id);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 404);
    }
  } catch (error) {
    return handleError(error, 'getMemberSubscriptions');
  }
};

/**
 * POST /api/subscriptions/members
 * Assign subscription to member
 */
export const assignSubscriptionHandler = async (subscriptionData) => {
  try {
    const validation = validateRequest(subscriptionData, ['member_id', 'plan_id']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await subscriptionService.assignSubscriptionToMember(
      subscriptionData.member_id,
      subscriptionData.plan_id,
      subscriptionData.options || {}
    );

    if (result.success) {
      return createResponse(true, result.data, result.message, null, 201);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'assignSubscription');
  }
};

/**
 * GET /api/subscriptions
 * Get all subscriptions with filtering
 */
export const getAllSubscriptionsHandler = async (query = {}) => {
  try {
    const result = await subscriptionService.getAllSubscriptions(query);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'getAllSubscriptions');
  }
};

/**
 * PUT /api/subscriptions/:id/status
 * Update subscription status
 */
export const updateSubscriptionStatusHandler = async (subscriptionId, statusData) => {
  try {
    const idValidation = validateId(subscriptionId, 'الاشتراك');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const validation = validateRequest(statusData, ['status']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await subscriptionService.updateSubscriptionStatus(
      idValidation.id,
      statusData.status,
      statusData.notes || ''
    );

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'updateSubscriptionStatus');
  }
};

// ====================
// PAYMENT API HANDLERS
// ====================

/**
 * GET /api/subscriptions/payments/overdue
 * Get overdue payments
 */
export const getOverduePaymentsHandler = async (query = {}) => {
  try {
    const daysOverdue = query.days_overdue ? parseInt(query.days_overdue) : 0;
    const result = await paymentService.getOverduePayments(daysOverdue);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'getOverduePayments');
  }
};

/**
 * PUT /api/subscriptions/payments/:id/status
 * Update payment status
 */
export const updatePaymentStatusHandler = async (subscriptionId, paymentData) => {
  try {
    const idValidation = validateId(subscriptionId, 'الاشتراك');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const validation = validateRequest(paymentData, ['status']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await paymentService.updatePaymentStatus(
      idValidation.id,
      paymentData.status,
      paymentData.options || {}
    );

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'updatePaymentStatus');
  }
};

/**
 * POST /api/subscriptions/payments/process
 * Process payment
 */
export const processPaymentHandler = async (paymentData) => {
  try {
    const validation = validateRequest(paymentData, ['payment_id', 'amount']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await paymentService.processPayment(paymentData.payment_id, paymentData);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'processPayment');
  }
};

/**
 * GET /api/subscriptions/payments/history/:subscriptionId
 * Get payment history for subscription
 */
export const getPaymentHistoryHandler = async (subscriptionId) => {
  try {
    const idValidation = validateId(subscriptionId, 'الاشتراك');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const result = await paymentService.getPaymentHistory(idValidation.id);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 404);
    }
  } catch (error) {
    return handleError(error, 'getPaymentHistory');
  }
};

// ====================
// NOTIFICATION API HANDLERS
// ====================

/**
 * GET /api/subscriptions/notifications
 * Get payment reminders
 */
export const getPaymentRemindersHandler = async (query = {}) => {
  try {
    const options = {
      days_before: query.days_before ? parseInt(query.days_before) : 7
    };

    const result = await paymentService.generatePaymentReminders(options);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'getPaymentReminders');
  }
};

/**
 * POST /api/subscriptions/notifications/send
 * Send notification (mock implementation)
 */
export const sendNotificationHandler = async (notificationData) => {
  try {
    const validation = validateRequest(notificationData, ['member_id', 'type', 'message']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    // Mock implementation - in real app, this would integrate with email/SMS services
    const member = findMemberById(notificationData.member_id);
    if (!member) {
      return createResponse(false, null, 'العضو غير موجود', null, 404);
    }

    const notificationResult = {
      id: Math.floor(Math.random() * 10000),
      member_id: notificationData.member_id,
      member_name: member.name,
      type: notificationData.type,
      message: notificationData.message,
      delivery_method: notificationData.delivery_method || 'email',
      status: 'sent',
      sent_at: new Date().toISOString()
    };

    return createResponse(true, notificationResult, 'تم إرسال الإشعار بنجاح', null, 201);
  } catch (error) {
    return handleError(error, 'sendNotification');
  }
};

// ====================
// ANALYTICS API HANDLERS
// ====================

/**
 * GET /api/subscriptions/analytics
 * Get subscription analytics
 */
export const getAnalyticsHandler = async (query = {}) => {
  try {
    const result = await analyticsService.getSubscriptionAnalytics(query);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'getAnalytics');
  }
};

/**
 * GET /api/subscriptions/analytics/revenue
 * Get revenue analytics
 */
export const getRevenueAnalyticsHandler = async (query = {}) => {
  try {
    const result = await analyticsService.getRevenueAnalytics(query);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'getRevenueAnalytics');
  }
};

/**
 * GET /api/subscriptions/analytics/engagement
 * Get member engagement analytics
 */
export const getMemberEngagementHandler = async () => {
  try {
    const result = await analyticsService.getMemberEngagementAnalytics();

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'getMemberEngagement');
  }
};

/**
 * POST /api/subscriptions/reports/custom
 * Generate custom report
 */
export const generateCustomReportHandler = async (reportConfig) => {
  try {
    const validation = validateRequest(reportConfig, ['type']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await analyticsService.generateCustomReport(reportConfig);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 400);
    }
  } catch (error) {
    return handleError(error, 'generateCustomReport');
  }
};

// ====================
// MEMBER API HANDLERS
// ====================

/**
 * GET /api/subscriptions/members
 * Get all members with subscription info
 */
export const getMembersHandler = async (query = {}) => {
  try {
    let members = [...mockDatabase.members];

    // Apply filters
    if (query.status) {
      members = members.filter(m => m.status === query.status);
    }

    if (query.member_type) {
      members = members.filter(m => m.member_type === query.member_type);
    }

    // Enrich with subscription data
    const enrichedMembers = members.map(member => {
      const subscriptions = mockDatabase.subscriptions.filter(s => s.member_id === member.id);
      const activeSubscription = subscriptions.find(s => s.status === 'active');

      return {
        ...member,
        total_subscriptions: subscriptions.length,
        active_subscription: activeSubscription ? {
          id: activeSubscription.id,
          plan_name: findPlanById(activeSubscription.plan_id)?.name_ar,
          start_date: activeSubscription.start_date,
          end_date: activeSubscription.end_date
        } : null,
        has_overdue: mockDatabase.payments.some(p => {
          const subscription = subscriptions.find(s => s.id === p.subscription_id);
          return subscription && p.status === 'overdue';
        })
      };
    });

    // Pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedMembers = enrichedMembers.slice(startIndex, endIndex);

    return createResponse(true, {
      members: paginatedMembers,
      pagination: {
        current_page: page,
        per_page: limit,
        total: enrichedMembers.length,
        total_pages: Math.ceil(enrichedMembers.length / limit)
      }
    }, 'تم جلب بيانات الأعضاء بنجاح');
  } catch (error) {
    return handleError(error, 'getMembers');
  }
};

// ====================
// FLEXIBLE PAYMENT API HANDLERS
// ====================

/**
 * POST /api/subscriptions/flexible/validate-amount
 * Validate payment amount for flexible subscription
 */
export const validatePaymentAmount = async (req) => {
  try {
    const { amount } = req.body || req;

    if (!amount) {
      return createResponse(false, null, 'المبلغ مطلوب', { field: 'amount' }, 400);
    }

    const validation = PaymentValidationService.validateSubscriptionAmount(amount);

    if (validation.isValid) {
      // Add additional useful information
      const suggestions = PaymentValidationService.getQuickAmountSuggestions();
      const paymentMethods = PaymentValidationService.getPaymentMethodRules();

      return createResponse(true, {
        validation,
        amount_suggestions: suggestions,
        payment_methods: paymentMethods.supported_methods
      }, 'المبلغ صالح للاشتراك المرن');
    } else {
      return createResponse(false, validation, validation.message, null, 400);
    }
  } catch (error) {
    return handleError(error, 'validatePaymentAmount');
  }
};

/**
 * POST /api/subscriptions/flexible/create
 * Create flexible subscription with custom amount
 */
export const createFlexibleSubscriptionEndpoint = async (req) => {
  try {
    const validation = validateRequest(req.body || req, ['member_id', 'amount']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const result = await subscriptionService.createFlexibleSubscription(req.body || req);

    if (result.success) {
      return createResponse(true, result.data, result.message, null, 201);
    } else {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.error.includes('موجود') ? 409 : 400;
      return createResponse(false, null, result.error, result.validation_details, statusCode);
    }
  } catch (error) {
    return handleError(error, 'createFlexibleSubscription');
  }
};

/**
 * PUT /api/subscriptions/flexible/:id/amount
 * Update flexible subscription amount
 */
export const updateFlexibleSubscriptionAmount = async (subscriptionId, req) => {
  try {
    const idValidation = validateId(subscriptionId, 'الاشتراك');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const validation = validateRequest(req.body || req, ['amount']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const { amount, options } = req.body || req;
    const result = await subscriptionService.updateSubscriptionAmount(
      idValidation.id,
      amount,
      options || {}
    );

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, result.validation_details, 400);
    }
  } catch (error) {
    return handleError(error, 'updateFlexibleSubscriptionAmount');
  }
};

/**
 * GET /api/subscriptions/flexible/payment-options/:memberId
 * Get payment options and suggestions for member
 */
export const getPaymentOptions = async (req) => {
  try {
    const { member_id } = req.params || req;

    if (!member_id) {
      return createResponse(false, null, 'معرف العضو مطلوب', null, 400);
    }

    const idValidation = validateId(member_id, 'العضو');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    // Get member subscription status
    const memberStatus = await subscriptionService.getMemberSubscriptionStatus(idValidation.id);
    if (!memberStatus.success) {
      return createResponse(false, null, memberStatus.error, null, 404);
    }

    // Get payment options and suggestions
    const suggestions = PaymentValidationService.getQuickAmountSuggestions();
    const paymentMethods = PaymentValidationService.getPaymentMethodRules();

    return createResponse(true, {
      minimum_amount: PaymentValidationService.MIN_AMOUNT,
      amount_multiple: PaymentValidationService.AMOUNT_MULTIPLE,
      currency: PaymentValidationService.CURRENCY,
      amount_suggestions: suggestions,
      payment_methods: paymentMethods,
      member_status: memberStatus.data,
      validation_rules: {
        min_amount: PaymentValidationService.MIN_AMOUNT,
        multiple_of: PaymentValidationService.AMOUNT_MULTIPLE,
        supported_durations: Object.keys(PaymentValidationService.DURATION_TYPES)
      }
    }, 'تم جلب خيارات الدفع بنجاح');

  } catch (error) {
    return handleError(error, 'getPaymentOptions');
  }
};

/**
 * POST /api/subscriptions/flexible/validate-upgrade
 * Validate subscription upgrade amount
 */
export const validateSubscriptionUpgrade = async (req) => {
  try {
    const validation = validateRequest(req.body || req, ['current_amount', 'new_amount']);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const { current_amount, new_amount } = req.body || req;
    const upgradeValidation = PaymentValidationService.validateSubscriptionUpgrade(
      current_amount,
      new_amount
    );

    if (upgradeValidation.isValid) {
      return createResponse(true, upgradeValidation, 'ترقية الاشتراك صالحة');
    } else {
      return createResponse(false, upgradeValidation, upgradeValidation.message, null, 400);
    }
  } catch (error) {
    return handleError(error, 'validateSubscriptionUpgrade');
  }
};

/**
 * POST /api/subscriptions/flexible/calculate-proration
 * Calculate prorated amount for subscription changes
 */
export const calculateProration = async (req) => {
  try {
    const validation = validateRequest(req.body || req, [
      'new_amount',
      'current_period_start',
      'current_period_end'
    ]);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, null, 400);
    }

    const {
      new_amount,
      current_period_start,
      current_period_end,
      change_date
    } = req.body || req;

    const proration = PaymentValidationService.calculateProratedAmount(
      new_amount,
      new Date(current_period_start),
      new Date(current_period_end),
      change_date ? new Date(change_date) : new Date()
    );

    return createResponse(true, proration, 'تم حساب المبلغ المتناسب بنجاح');
  } catch (error) {
    return handleError(error, 'calculateProration');
  }
};

/**
 * POST /api/subscriptions/flexible/validate-bulk
 * Validate multiple amounts in bulk
 */
export const validateBulkAmounts = async (req) => {
  try {
    const { amounts } = req.body || req;

    if (!amounts || !Array.isArray(amounts)) {
      return createResponse(false, null, 'مصفوفة المبالغ مطلوبة', null, 400);
    }

    if (amounts.length === 0) {
      return createResponse(false, null, 'يجب تقديم مبلغ واحد على الأقل', null, 400);
    }

    if (amounts.length > 50) {
      return createResponse(false, null, 'الحد الأقصى 50 مبلغ في الطلب الواحد', null, 400);
    }

    const validationResults = PaymentValidationService.validateBulkAmounts(amounts);
    const validCount = validationResults.filter(r => r.result.isValid).length;
    const invalidCount = validationResults.length - validCount;

    return createResponse(true, {
      total_amounts: validationResults.length,
      valid_amounts: validCount,
      invalid_amounts: invalidCount,
      results: validationResults,
      summary: {
        all_valid: invalidCount === 0,
        success_rate: Math.round((validCount / validationResults.length) * 100)
      }
    }, `تم التحقق من ${validationResults.length} مبلغ - ${validCount} صالح، ${invalidCount} غير صالح`);

  } catch (error) {
    return handleError(error, 'validateBulkAmounts');
  }
};

/**
 * GET /api/subscriptions/flexible/member/:id/status
 * Get comprehensive member subscription status
 */
export const getMemberFlexibleStatus = async (memberId) => {
  try {
    const idValidation = validateId(memberId, 'العضو');
    if (!idValidation.valid) {
      return createResponse(false, null, idValidation.error, null, 400);
    }

    const result = await subscriptionService.getMemberSubscriptionStatus(idValidation.id);

    if (result.success) {
      return createResponse(true, result.data, result.message);
    } else {
      return createResponse(false, null, result.error, null, 404);
    }
  } catch (error) {
    return handleError(error, 'getMemberFlexibleStatus');
  }
};

// ====================
// HEALTH CHECK
// ====================

/**
 * GET /api/subscriptions/health
 * System health check
 */
export const healthCheckHandler = async () => {
  try {
    const stats = {
      system_status: 'healthy',
      database_status: 'connected',
      total_plans: mockDatabase.plans.length,
      total_subscriptions: mockDatabase.subscriptions.length,
      total_members: mockDatabase.members.length,
      total_payments: mockDatabase.payments.length,
      last_updated: new Date().toISOString()
    };

    return createResponse(true, stats, 'النظام يعمل بشكل طبيعي');
  } catch (error) {
    return handleError(error, 'healthCheck');
  }
};

// Export all handlers
export default {
  // Plan management
  getSubscriptionPlansHandler,
  createSubscriptionPlanHandler,
  updateSubscriptionPlanHandler,
  deleteSubscriptionPlanHandler,

  // Subscription management
  getMemberSubscriptionsHandler,
  assignSubscriptionHandler,
  getAllSubscriptionsHandler,
  updateSubscriptionStatusHandler,

  // Flexible payment management
  validatePaymentAmount,
  createFlexibleSubscriptionEndpoint,
  updateFlexibleSubscriptionAmount,
  getPaymentOptions,
  validateSubscriptionUpgrade,
  calculateProration,
  validateBulkAmounts,
  getMemberFlexibleStatus,

  // Payment management
  getOverduePaymentsHandler,
  updatePaymentStatusHandler,
  processPaymentHandler,
  getPaymentHistoryHandler,

  // Notifications
  getPaymentRemindersHandler,
  sendNotificationHandler,

  // Analytics
  getAnalyticsHandler,
  getRevenueAnalyticsHandler,
  getMemberEngagementHandler,
  generateCustomReportHandler,

  // Member management
  getMembersHandler,

  // System
  healthCheckHandler,

  // Utilities
  createResponse,
  handleError,
  validateRequest,
  validateId
};