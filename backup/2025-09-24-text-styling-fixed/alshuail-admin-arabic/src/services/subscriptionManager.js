/**
 * Subscription Manager - Al-Shuail Family Admin Dashboard
 * Main integration service that combines all subscription-related functionality
 * This is the primary service that the frontend components should use
 */

import subscriptionService from './subscriptionService.js';
import paymentService from './paymentService.js';
import analyticsService from './analyticsService.js';
import apiHandlers from './apiHandlers.js';
import { mockDatabase, getMockStats } from './mockData.js';

// ====================
// MAIN SUBSCRIPTION MANAGER CLASS
// ====================

export class SubscriptionManager {
  constructor() {
    this.initialized = false;
    this.eventListeners = {};
  }

  /**
   * Initialize the subscription manager
   */
  async initialize() {
    try {
      console.log('Initializing Subscription Manager...');

      // Perform initial data validation
      await this.validateData();

      // Set up automatic processes
      this.setupAutomaticProcesses();

      this.initialized = true;
      console.log('Subscription Manager initialized successfully');

      return {
        success: true,
        message: 'تم تهيئة مدير الاشتراكات بنجاح'
      };
    } catch (error) {
      console.error('Failed to initialize Subscription Manager:', error);
      return {
        success: false,
        error: 'فشل في تهيئة مدير الاشتراكات',
        details: error.message
      };
    }
  }

  /**
   * Validate data integrity
   */
  async validateData() {
    const issues = [];

    // Check for orphaned subscriptions
    const orphanedSubscriptions = mockDatabase.subscriptions.filter(sub => {
      const memberExists = mockDatabase.members.some(m => m.id === sub.member_id);
      const planExists = mockDatabase.plans.some(p => p.id === sub.plan_id);
      return !memberExists || !planExists;
    });

    if (orphanedSubscriptions.length > 0) {
      issues.push(`Found ${orphanedSubscriptions.length} orphaned subscriptions`);
    }

    // Check for orphaned payments
    const orphanedPayments = mockDatabase.payments.filter(pay => {
      return !mockDatabase.subscriptions.some(s => s.id === pay.subscription_id);
    });

    if (orphanedPayments.length > 0) {
      issues.push(`Found ${orphanedPayments.length} orphaned payments`);
    }

    if (issues.length > 0) {
      console.warn('Data integrity issues found:', issues);
    }

    return issues;
  }

  /**
   * Set up automatic processes
   */
  setupAutomaticProcesses() {
    // In a real application, these would be scheduled jobs
    console.log('Setting up automatic processes...');

    // Auto-update overdue payments (every hour in real app)
    if (typeof window === 'undefined') { // Only in backend environment
      // This would be a cron job or scheduled task
      console.log('Automatic overdue payment updates configured');
    }
  }

  // ====================
  // PLAN MANAGEMENT
  // ====================

  async getPlans(filters = {}) {
    this.ensureInitialized();
    return await apiHandlers.getSubscriptionPlansHandler(filters);
  }

  async createPlan(planData) {
    this.ensureInitialized();
    const result = await apiHandlers.createSubscriptionPlanHandler(planData);

    if (result.success) {
      this.emit('planCreated', result.data);
    }

    return result;
  }

  async updatePlan(planId, planData) {
    this.ensureInitialized();
    const result = await apiHandlers.updateSubscriptionPlanHandler(planId, planData);

    if (result.success) {
      this.emit('planUpdated', result.data);
    }

    return result;
  }

  async deletePlan(planId) {
    this.ensureInitialized();
    const result = await apiHandlers.deleteSubscriptionPlanHandler(planId);

    if (result.success) {
      this.emit('planDeleted', { planId });
    }

    return result;
  }

  // ====================
  // SUBSCRIPTION MANAGEMENT
  // ====================

  async getSubscriptions(filters = {}) {
    this.ensureInitialized();
    return await apiHandlers.getAllSubscriptionsHandler(filters);
  }

  async getMemberSubscriptions(memberId) {
    this.ensureInitialized();
    return await apiHandlers.getMemberSubscriptionsHandler(memberId);
  }

  async createSubscription(subscriptionData) {
    this.ensureInitialized();
    const result = await apiHandlers.assignSubscriptionHandler(subscriptionData);

    if (result.success) {
      this.emit('subscriptionCreated', result.data);

      // Generate welcome notification
      await this.generateWelcomeNotification(result.data);
    }

    return result;
  }

  async updateSubscriptionStatus(subscriptionId, status, notes = '') {
    this.ensureInitialized();
    const result = await apiHandlers.updateSubscriptionStatusHandler(subscriptionId, { status, notes });

    if (result.success) {
      this.emit('subscriptionStatusUpdated', { subscriptionId, status, notes });
    }

    return result;
  }

  // ====================
  // PAYMENT MANAGEMENT
  // ====================

  async getOverduePayments(daysOverdue = 0) {
    this.ensureInitialized();
    return await apiHandlers.getOverduePaymentsHandler({ days_overdue: daysOverdue });
  }

  async processPayment(paymentData) {
    this.ensureInitialized();
    const result = await apiHandlers.processPaymentHandler(paymentData);

    if (result.success) {
      this.emit('paymentProcessed', result.data);

      // Generate payment confirmation notification
      await this.generatePaymentConfirmation(result.data);
    }

    return result;
  }

  async updatePaymentStatus(subscriptionId, status, options = {}) {
    this.ensureInitialized();
    const result = await apiHandlers.updatePaymentStatusHandler(subscriptionId, { status, options });

    if (result.success) {
      this.emit('paymentStatusUpdated', result.data);
    }

    return result;
  }

  async getPaymentHistory(subscriptionId) {
    this.ensureInitialized();
    return await apiHandlers.getPaymentHistoryHandler(subscriptionId);
  }

  // ====================
  // NOTIFICATION MANAGEMENT
  // ====================

  async getPaymentReminders(daysBefore = 7) {
    this.ensureInitialized();
    return await apiHandlers.getPaymentRemindersHandler({ days_before: daysBefore });
  }

  async sendNotification(notificationData) {
    this.ensureInitialized();
    return await apiHandlers.sendNotificationHandler(notificationData);
  }

  async generateWelcomeNotification(subscriptionData) {
    const notification = {
      member_id: subscriptionData.member_id,
      type: 'welcome',
      message: `مرحباً بك في ${subscriptionData.plan_name}! نحن سعداء لانضمامك إلى عائلة الشعيل.`,
      delivery_method: 'email'
    };

    return await this.sendNotification(notification);
  }

  async generatePaymentConfirmation(paymentData) {
    const notification = {
      member_id: paymentData.member_id || 1, // Default for mock
      type: 'payment_confirmation',
      message: `تم استلام دفعتك بنجاح. رقم المعاملة: ${paymentData.transaction_id}`,
      delivery_method: 'email'
    };

    return await this.sendNotification(notification);
  }

  // ====================
  // ANALYTICS AND REPORTING
  // ====================

  async getAnalytics(filters = {}) {
    this.ensureInitialized();
    return await apiHandlers.getAnalyticsHandler(filters);
  }

  async getRevenueAnalytics(filters = {}) {
    this.ensureInitialized();
    return await apiHandlers.getRevenueAnalyticsHandler(filters);
  }

  async getMemberEngagement() {
    this.ensureInitialized();
    return await apiHandlers.getMemberEngagementHandler();
  }

  async generateReport(reportConfig) {
    this.ensureInitialized();
    return await apiHandlers.generateCustomReportHandler(reportConfig);
  }

  async getDashboardData() {
    this.ensureInitialized();

    try {
      const [analytics, overduePayments, reminders] = await Promise.all([
        this.getAnalytics(),
        this.getOverduePayments(),
        this.getPaymentReminders()
      ]);

      return {
        success: true,
        data: {
          analytics: analytics.data,
          overdue_payments: overduePayments.data,
          reminders: reminders.data,
          last_updated: new Date().toISOString()
        },
        message: 'تم جلب بيانات لوحة التحكم بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: 'حدث خطأ أثناء جلب بيانات لوحة التحكم',
        details: error.message
      };
    }
  }

  // ====================
  // MEMBER MANAGEMENT
  // ====================

  async getMembers(filters = {}) {
    this.ensureInitialized();
    return await apiHandlers.getMembersHandler(filters);
  }

  // ====================
  // SYSTEM UTILITIES
  // ====================

  async getSystemHealth() {
    return await apiHandlers.healthCheckHandler();
  }

  async performMaintenance() {
    this.ensureInitialized();

    try {
      // Update overdue payments
      await this.updateOverduePayments();

      // Clean up old data (if needed)
      await this.cleanupOldData();

      // Generate scheduled reports
      await this.generateScheduledReports();

      return {
        success: true,
        message: 'تم تنفيذ صيانة النظام بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: 'حدث خطأ أثناء صيانة النظام',
        details: error.message
      };
    }
  }

  async updateOverduePayments() {
    const today = new Date();
    const overduePayments = mockDatabase.payments.filter(p =>
      p.status === 'pending' && new Date(p.due_date) < today
    );

    overduePayments.forEach(payment => {
      payment.status = 'overdue';
      payment.updated_at = new Date().toISOString();
    });

    console.log(`Updated ${overduePayments.length} payments to overdue status`);
  }

  async cleanupOldData() {
    // Remove old subscription history entries (keep last 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const beforeCount = mockDatabase.subscription_history.length;
    mockDatabase.subscription_history = mockDatabase.subscription_history.filter(
      h => new Date(h.created_at) >= twoYearsAgo
    );

    console.log(`Cleaned up ${beforeCount - mockDatabase.subscription_history.length} old history entries`);
  }

  async generateScheduledReports() {
    // Generate monthly revenue report
    const monthlyReport = await this.generateReport({
      type: 'revenue_breakdown',
      date_range: {
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end_date: new Date()
      }
    });

    console.log('Generated monthly revenue report');
    return monthlyReport;
  }

  // ====================
  // EVENT SYSTEM
  // ====================

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  // ====================
  // HELPER METHODS
  // ====================

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Subscription Manager not initialized. Call initialize() first.');
    }
  }

  getStats() {
    return getMockStats();
  }
}

// ====================
// EXPORT SINGLETON INSTANCE
// ====================

// Create and export singleton instance
const subscriptionManager = new SubscriptionManager();

// Auto-initialize in non-test environments
if (typeof window === 'undefined' || process.env.NODE_ENV !== 'test') {
  subscriptionManager.initialize().then(result => {
    if (!result.success) {
      console.error('Failed to auto-initialize Subscription Manager:', result.error);
    }
  });
}

export default subscriptionManager;

// ====================
// CONVENIENCE FUNCTIONS FOR FRONTEND
// ====================

/**
 * Quick access functions for common operations
 * These can be imported directly by frontend components
 */

export const getSubscriptionPlans = (filters = {}) => subscriptionManager.getPlans(filters);
export const createSubscriptionPlan = (planData) => subscriptionManager.createPlan(planData);
export const updateSubscriptionPlan = (planId, planData) => subscriptionManager.updatePlan(planId, planData);
export const deleteSubscriptionPlan = (planId) => subscriptionManager.deletePlan(planId);

export const getSubscriptions = (filters = {}) => subscriptionManager.getSubscriptions(filters);
export const createSubscription = (subscriptionData) => subscriptionManager.createSubscription(subscriptionData);
export const updateSubscriptionStatus = (subscriptionId, status, notes) => subscriptionManager.updateSubscriptionStatus(subscriptionId, status, notes);

export const processPayment = (paymentData) => subscriptionManager.processPayment(paymentData);
export const getOverduePayments = (daysOverdue = 0) => subscriptionManager.getOverduePayments(daysOverdue);
export const getPaymentReminders = (daysBefore = 7) => subscriptionManager.getPaymentReminders(daysBefore);

export const getAnalytics = (filters = {}) => subscriptionManager.getAnalytics(filters);
export const getRevenueAnalytics = (filters = {}) => subscriptionManager.getRevenueAnalytics(filters);
export const getDashboardData = () => subscriptionManager.getDashboardData();

export const getMembers = (filters = {}) => subscriptionManager.getMembers(filters);
export const getMemberSubscriptions = (memberId) => subscriptionManager.getMemberSubscriptions(memberId);

export const performSystemMaintenance = () => subscriptionManager.performMaintenance();
export const getSystemHealth = () => subscriptionManager.getSystemHealth();