/**
 * Member Service
 * Handles member profile and data API calls
 */
import api from '../utils/api'

const memberService = {
  /**
   * Get current member's profile
   */
  getProfile: async () => {
    const response = await api.get('/user/profile')
    return response.data
  },

  /**
   * Update member profile
   * @param {Object} data - Profile data to update
   */
  updateProfile: async (data) => {
    const response = await api.put('/user/profile', data)
    return response.data
  },

  /**
   * Upload avatar
   * @param {File} file - Avatar image file
   */
  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    // Don't set Content-Type header manually - axios will set it with proper boundary
    const response = await api.post('/user/profile/avatar', formData)
    return response.data
  },

  /**
   * Delete avatar
   */
  deleteAvatar: async () => {
    const response = await api.delete('/user/profile/avatar')
    return response.data
  },

  /**
   * Get member by ID
   * @param {string} memberId 
   */
  getMemberById: async (memberId) => {
    const response = await api.get(`/members/${memberId}`)
    return response.data
  },

  /**
   * Get current member data (from members table)
   */
  getMyData: async () => {
    const response = await api.get('/members/mobile/profile')
    return response.data
  },

  /**
   * Get member's subscription status
   */
  getSubscriptionStatus: async () => {
    const response = await api.get('/members/mobile/subscriptions')
    return response.data
  },

  /**
   * Get member's payment history
   */
  getPaymentHistory: async () => {
    const response = await api.get('/members/mobile/payments')
    return response.data
  },

  /**
   * Get member's balance
   */
  getBalance: async () => {
    const response = await api.get('/members/mobile/balance')
    return response.data
  },

  /**
   * Get notification settings
   */
  getNotificationSettings: async () => {
    const response = await api.get('/user/profile/notification-settings')
    return response.data
  },

  /**
   * Update notification settings
   * @param {Object} settings 
   */
  updateNotificationSettings: async (settings) => {
    const response = await api.put('/user/profile/notification-settings', settings)
    return response.data
  },

  /**
   * Get appearance settings
   */
  getAppearanceSettings: async () => {
    const response = await api.get('/user/profile/appearance-settings')
    return response.data
  },

  /**
   * Update appearance settings
   * @param {Object} settings 
   */
  updateAppearanceSettings: async (settings) => {
    const response = await api.put('/user/profile/appearance-settings', settings)
    return response.data
  },

  /**
   * Get language settings
   */
  getLanguageSettings: async () => {
    const response = await api.get('/user/profile/language-settings')
    return response.data
  },

  /**
   * Update language settings
   * @param {Object} settings
   */
  updateLanguageSettings: async (settings) => {
    const response = await api.put('/user/profile/language-settings', settings)
    return response.data
  },

  // ===== Document Management =====

  /**
   * Get member's documents
   * @param {string} memberId - Optional member ID (defaults to current user)
   * @param {Object} params - Optional filters (category, search)
   */
  getDocuments: async (memberId = null, params = {}) => {
    const url = memberId ? `/documents/member/${memberId}` : '/documents/member'
    const response = await api.get(url, { params })
    return response.data
  },

  /**
   * Upload a document
   * @param {File} file - Document file
   * @param {Object} metadata - Document metadata (title, description, category)
   */
  uploadDocument: async (file, metadata = {}) => {
    const formData = new FormData()
    formData.append('document', file)
    if (metadata.title) formData.append('title', metadata.title)
    if (metadata.description) formData.append('description', metadata.description)
    if (metadata.category) formData.append('category', metadata.category)

    // Don't set Content-Type header manually - axios will set it with proper boundary
    const response = await api.post('/documents/upload', formData)
    return response.data
  },

  /**
   * Get single document by ID
   * @param {string} documentId
   */
  getDocument: async (documentId) => {
    const response = await api.get(`/documents/${documentId}`)
    return response.data
  },

  /**
   * Delete a document
   * @param {string} documentId
   */
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`)
    return response.data
  },

  /**
   * Get document categories
   */
  getDocumentCategories: async () => {
    const response = await api.get('/documents/categories')
    return response.data
  }
}

export default memberService
