/**
 * News Service
 * Handles news and announcements API calls
 */
import api from '../utils/api'

const newsService = {
  /**
   * Get all published news
   * @param {Object} params - { category, limit }
   */
  getNews: async (params = {}) => {
    const response = await api.get('/news', { params })
    return response.data
  },

  /**
   * Get news by ID
   * @param {string} newsId 
   */
  getNewsById: async (newsId) => {
    const response = await api.get(`/news/${newsId}`)
    return response.data
  },

  /**
   * Get news by category
   * @param {string} category 
   */
  getNewsByCategory: async (category) => {
    const response = await api.get('/news', { params: { category } })
    return response.data
  },

  /**
   * React to news (like, love, celebrate, support)
   * @param {string} newsId 
   * @param {string} reactionType 
   */
  reactToNews: async (newsId, reactionType) => {
    const response = await api.post(`/news/${newsId}/react`, { reaction_type: reactionType })
    return response.data
  },

  /**
   * Get recent news (limited)
   * @param {number} limit 
   */
  getRecentNews: async (limit = 5) => {
    const response = await api.get('/news', { params: { limit } })
    return response.data
  }
}

export default newsService
