/**
 * Events Service - خدمة المناسبات والفعاليات
 * Handles all events/occasions operations
 * Created: December 2025
 */
import api from '../utils/api'

const eventsService = {
  /**
   * Get all events with optional filters
   * @param {Object} params - { status, category, upcoming, limit, offset }
   */
  getAllEvents: async (params = {}) => {
    try {
      const response = await api.get('/occasions', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  },

  /**
   * Get upcoming events only
   * @param {number} limit - Maximum number of events
   */
  getUpcomingEvents: async (limit = 20) => {
    try {
      const response = await api.get('/occasions', { 
        params: { upcoming: 'true', status: 'active', limit } 
      })
      return response.data
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
      throw error
    }
  },

  /**
   * Get event by ID
   * @param {string} eventId - Event UUID
   */
  getEventById: async (eventId) => {
    try {
      const response = await api.get(`/occasions/${eventId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching event:', error)
      throw error
    }
  },

  /**
   * Get event statistics
   */
  getStats: async () => {
    try {
      const response = await api.get('/occasions/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching event stats:', error)
      throw error
    }
  },

  /**
   * Update RSVP for an event
   * @param {string} eventId - Event UUID
   * @param {Object} data - { member_id, status, notes }
   */
  updateRSVP: async (eventId, data) => {
    try {
      const response = await api.put(`/occasions/${eventId}/rsvp`, data)
      return response.data
    } catch (error) {
      console.error('Error updating RSVP:', error)
      throw error
    }
  },

  /**
   * Get event attendees
   * @param {string} eventId - Event UUID
   * @param {string} statusFilter - Optional: 'confirmed', 'pending', 'declined'
   */
  getAttendees: async (eventId, statusFilter = null) => {
    try {
      const params = statusFilter ? { status_filter: statusFilter } : {}
      const response = await api.get(`/occasions/${eventId}/attendees`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching attendees:', error)
      throw error
    }
  },

  /**
   * Get my RSVP status for an event
   * @param {string} eventId - Event UUID
   * @param {string} memberId - Member UUID
   */
  getMyRSVP: async (eventId, memberId) => {
    try {
      const response = await api.get(`/occasions/${eventId}/attendees`, {
        params: { member_id: memberId }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching RSVP:', error)
      return null
    }
  }
}

export default eventsService
