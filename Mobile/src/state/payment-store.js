/**
 * Payment Store - Manages payment state and history
 * @module payment-store
 */

import stateManager from './state-manager.js';
import apiClient from '../api/api-client.js';

// Initial state
const initialState = {
  payments: [],
  currentPayment: null,
  paymentMethods: ['knet', 'card', 'bank_transfer'],
  isProcessing: false,
  error: null,
  filters: {
    status: 'all', // all, success, pending, failed
    dateFrom: null,
    dateTo: null,
    minAmount: null,
    maxAmount: null
  }
};

// Actions
const actions = {
  /**
   * Fetch payment history
   * @param {Object} state - Current state
   * @param {Object} filters - Filter options
   */
  async fetchPayments(state, filters = {}) {
    try {
      const result = await apiClient.get('/api/payments/history', {
        body: filters
      });

      if (result.success) {
        state.payments = result.data;
        return { success: true };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحميل سجل الدفع';
      return { success: false, error: 'فشل في تحميل سجل الدفع' };
    }
  },

  /**
   * Initiate payment
   * @param {Object} state - Current state
   * @param {Object} paymentData - Payment data
   */
  async initiatePayment(state, paymentData) {
    state.isProcessing = true;
    state.error = null;

    try {
      const { method, amount, description } = paymentData;

      let result;

      if (method === 'knet') {
        result = await apiClient.post('/api/payments/knet', {
          amount,
          description
        });
      } else if (method === 'card') {
        result = await apiClient.post('/api/payments/card', {
          amount,
          description
        });
      } else if (method === 'bank_transfer') {
        result = await apiClient.post('/api/payments/bank-transfer', {
          amount,
          description
        });
      }

      if (result.success) {
        state.currentPayment = result.data;
        return { success: true, data: result.data };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في بدء عملية الدفع';
      return { success: false, error: 'فشل في بدء عملية الدفع' };
    } finally {
      state.isProcessing = false;
    }
  },

  /**
   * Verify payment
   * @param {Object} state - Current state
   * @param {string} paymentId - Payment ID
   */
  async verifyPayment(state, paymentId) {
    state.isProcessing = true;

    try {
      const result = await apiClient.post('/api/payments/verify', {
        paymentId
      });

      if (result.success) {
        // Add to payment history
        state.payments.unshift(result.data);
        state.currentPayment = null;
        return { success: true, data: result.data };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في التحقق من الدفع';
      return { success: false, error: 'فشل في التحقق من الدفع' };
    } finally {
      state.isProcessing = false;
    }
  },

  /**
   * Download payment receipt
   * @param {Object} state - Current state
   * @param {string} paymentId - Payment ID
   */
  async downloadReceipt(state, paymentId) {
    try {
      const result = await apiClient.get(`/api/payments/${paymentId}/receipt`);

      if (result.success) {
        // Open PDF in new tab
        window.open(result.data.url, '_blank');
        return { success: true };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحميل الإيصال';
      return { success: false, error: 'فشل في تحميل الإيصال' };
    }
  },

  /**
   * Update payment filters
   * @param {Object} state - Current state
   * @param {Object} filters - New filters
   */
  updateFilters(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },

  /**
   * Clear current payment
   * @param {Object} state - Current state
   */
  clearCurrentPayment(state) {
    state.currentPayment = null;
  },

  /**
   * Clear error
   * @param {Object} state - Current state
   */
  clearError(state) {
    state.error = null;
  }
};

// Computed properties
const computed = {
  /**
   * Get filtered payments
   * @param {Object} state - Current state
   * @returns {Array} Filtered payments
   */
  filteredPayments(state) {
    let filtered = [...state.payments];

    // Filter by status
    if (state.filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === state.filters.status);
    }

    // Filter by date range
    if (state.filters.dateFrom) {
      const fromDate = new Date(state.filters.dateFrom);
      filtered = filtered.filter(p => new Date(p.created_at) >= fromDate);
    }

    if (state.filters.dateTo) {
      const toDate = new Date(state.filters.dateTo);
      filtered = filtered.filter(p => new Date(p.created_at) <= toDate);
    }

    // Filter by amount range
    if (state.filters.minAmount !== null) {
      filtered = filtered.filter(p => p.amount >= state.filters.minAmount);
    }

    if (state.filters.maxAmount !== null) {
      filtered = filtered.filter(p => p.amount <= state.filters.maxAmount);
    }

    return filtered;
  },

  /**
   * Get total payment amount
   * @param {Object} state - Current state
   * @returns {number} Total amount
   */
  totalAmount(state) {
    return state.payments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0);
  },

  /**
   * Get payment statistics
   * @param {Object} state - Current state
   * @returns {Object} Payment statistics
   */
  statistics(state) {
    const successful = state.payments.filter(p => p.status === 'success').length;
    const pending = state.payments.filter(p => p.status === 'pending').length;
    const failed = state.payments.filter(p => p.status === 'failed').length;

    return {
      total: state.payments.length,
      successful,
      pending,
      failed,
      successRate: state.payments.length > 0
        ? (successful / state.payments.length * 100).toFixed(1)
        : 0
    };
  }
};

// Create store
const paymentStore = stateManager.createStore('payment', initialState, {
  persist: true,
  actions,
  computed
});

export default paymentStore;
