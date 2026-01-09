/**
 * Payment Service - نظام الدفع الشامل
 * Handles all payment operations including pay-on-behalf and bank transfers
 * Created: December 2025
 */
import api from '../utils/api'

const paymentService = {
  /**
   * Search for members by ID, name, or phone
   * @param {string} query - Search query
   * @param {number} limit - Max results
   */
  searchMembers: async (query, limit = 10) => {
    const response = await api.get('/members/search', { 
      params: { q: query, limit } 
    })
    return response.data
  },

  /**
   * Get member details by ID
   * @param {string} memberId 
   */
  getMemberById: async (memberId) => {
    const response = await api.get(`/members/${memberId}`)
    return response.data
  },

  /**
   * Pay subscription (for self or another member)
   * @param {Object} data - { beneficiary_id, month_id, year, amount, is_on_behalf }
   */
  paySubscription: async (data) => {
    const response = await api.post('/payments/subscription', data)
    return response.data
  },

  /**
   * Contribute to Diya case (for self or another member)
   * @param {Object} data - { beneficiary_id, case_id, amount, is_on_behalf }
   */
  payDiya: async (data) => {
    const response = await api.post('/payments/diya', data)
    return response.data
  },

  /**
   * Contribute to Initiative (for self or another member)
   * @param {Object} data - { beneficiary_id, initiative_id, amount, is_on_behalf }
   */
  payInitiative: async (data) => {
    const response = await api.post('/payments/initiative', data)
    return response.data
  },

  /**
   * Submit bank transfer request with receipt
   * @param {FormData} formData - Contains beneficiary_id, amount, purpose, receipt file
   */
  submitBankTransfer: async (formData) => {
    const response = await api.post('/bank-transfers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  /**
   * Get my bank transfer requests
   */
  getMyBankTransfers: async () => {
    const response = await api.get('/bank-transfers/my-requests')
    return response.data
  },

  /**
   * Get active Diya cases for contribution
   */
  getActiveDiyaCases: async () => {
    const response = await api.get('/diya-cases', { params: { status: 'active' } })
    return response.data
  },

  /**
   * Get available subscription months
   * @param {string} memberId - Member to get available months for
   */
  getAvailableMonths: async (memberId) => {
    const response = await api.get(`/subscriptions/available-months/${memberId}`)
    return response.data
  },

  /**
   * Get my payment history (both as payer and beneficiary)
   */
  getPaymentHistory: async () => {
    const response = await api.get('/payments/history')
    return response.data
  },

  /**
   * Get payments I made for others
   */
  getPaymentsForOthers: async () => {
    const response = await api.get('/payments/for-others')
    return response.data
  },

  /**
   * Get payments others made for me
   */
  getPaymentsFromOthers: async () => {
    const response = await api.get('/payments/from-others')
    return response.data
  }
}

export default paymentService
