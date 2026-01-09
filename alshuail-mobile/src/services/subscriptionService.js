/**
 * Subscriptions Service
 * Handles subscription and payment API calls
 */
import api from '../utils/api'

const subscriptionService = {
  /**
   * Get all subscription plans
   */
  getPlans: async () => {
    const response = await api.get('/subscriptions/plans')
    return response.data
  },

  /**
   * Get current member's subscriptions
   */
  getMySubscriptions: async () => {
    const response = await api.get('/subscriptions/member/subscription')
    return response.data
  },

  /**
   * Get subscription status by year
   * @param {number} year - Year to get status for
   */
  getYearlyStatus: async (year) => {
    const response = await api.get(`/subscriptions/year/${year}`)
    return response.data
  },

  /**
   * Get payment history
   */
  getPaymentHistory: async () => {
    const response = await api.get('/payments/history')
    return response.data
  },

  /**
   * Get payments by year
   * @param {number} year 
   */
  getPaymentsByYear: async (year) => {
    const response = await api.get('/payments/year', { params: { year } })
    return response.data
  },

  /**
   * Make a payment
   * @param {Object} paymentData 
   */
  makePayment: async (paymentData) => {
    const response = await api.post('/payments', paymentData)
    return response.data
  },

  /**
   * Get member statement
   */
  getStatement: async () => {
    const response = await api.get('/member-statement')
    return response.data
  },

  /**
   * Get statement for specific member
   * @param {string} memberId 
   */
  getMemberStatement: async (memberId) => {
    const response = await api.get(`/member-statement/${memberId}`)
    return response.data
  },

  /**
   * Get balance summary
   */
  getBalanceSummary: async () => {
    const response = await api.get('/subscriptions/balance')
    return response.data
  },

  /**
   * Get subscription years available
   */
  getAvailableYears: async () => {
    const response = await api.get('/subscriptions/years')
    return response.data
  }
}

export default subscriptionService
