/**
 * Initiatives Service
 * Handles initiatives and contributions API calls
 */
import api from '../utils/api'

const initiativeService = {
  /**
   * Get all initiatives
   */
  getAllInitiatives: async () => {
    const response = await api.get('/initiatives')
    return response.data
  },

  /**
   * Get initiative by ID
   * @param {string} initiativeId 
   */
  getInitiativeById: async (initiativeId) => {
    const response = await api.get(`/initiatives/${initiativeId}`)
    return response.data
  },

  /**
   * Get initiative statistics
   */
  getStats: async () => {
    const response = await api.get('/initiatives/stats')
    return response.data
  },

  /**
   * Contribute to an initiative
   * @param {string} initiativeId 
   * @param {Object} contributionData - { amount, payment_method, notes }
   */
  contribute: async (initiativeId, contributionData) => {
    const response = await api.post(`/initiatives/${initiativeId}/contribute`, contributionData)
    return response.data
  },

  /**
   * Get my contributions
   */
  getMyContributions: async () => {
    const response = await api.get('/initiatives/my-contributions')
    return response.data
  },

  /**
   * Get active initiatives only
   */
  getActiveInitiatives: async () => {
    const response = await api.get('/initiatives', { params: { status: 'active' } })
    return response.data
  },

  /**
   * Get completed initiatives
   */
  getCompletedInitiatives: async () => {
    const response = await api.get('/initiatives', { params: { status: 'completed' } })
    return response.data
  }
}

export default initiativeService
