/**
 * Notifications Service
 * Handles notifications API calls
 * Updated: December 2025 - Fixed API endpoints
 */
import api from '../utils/api'

const notificationService = {
  /**
   * Get my notifications
   * Uses the member ID from stored user data
   * @param {boolean} unreadOnly - Only get unread notifications
   */
  getMyNotifications: async (unreadOnly = false) => {
    try {
      // Get member ID from localStorage
      const userData = localStorage.getItem('alshuail_user')
      if (!userData) {
        return { notifications: [], success: false }
      }
      
      const user = JSON.parse(userData)
      const memberId = user.id || user.member_id || user.membershipNumber
      
      if (!memberId) {
        console.log('No member ID found for notifications')
        return { notifications: [], success: false }
      }
      
      // Call the correct endpoint: /notifications/member/:memberId
      const response = await api.get(`/notifications/member/${memberId}`, {
        params: { unread_only: unreadOnly }
      })
      
      return response.data
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  },

  /**
   * Get all notifications (admin only)
   */
  getNotifications: async () => {
    const response = await api.get('/notifications')
    return response.data
  },

  /**
   * Mark notification as read
   * @param {string} notificationId 
   */
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`)
      return response.data
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Don't throw - just log the error
      return { success: false }
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      // Get member ID
      const userData = localStorage.getItem('alshuail_user')
      if (!userData) return { success: false }
      
      const user = JSON.parse(userData)
      const memberId = user.id || user.member_id
      
      // Get all unread notifications for this member
      const notificationsRes = await notificationService.getMyNotifications(true)
      const notifications = notificationsRes.notifications || notificationsRes.data || []
      
      // Mark each as read
      const promises = notifications.map(n => 
        notificationService.markAsRead(n.id).catch(() => null)
      )
      
      await Promise.allSettled(promises)
      return { success: true }
    } catch (error) {
      console.error('Error marking all as read:', error)
      return { success: false }
    }
  },

  /**
   * Get unread count
   * Fetches notifications and counts unread ones
   */
  getUnreadCount: async () => {
    try {
      const response = await notificationService.getMyNotifications(true)
      const notifications = response.notifications || response.data || []
      const unreadCount = Array.isArray(notifications) ? notifications.length : 0
      
      return { unread_count: unreadCount, success: true }
    } catch (error) {
      console.error('Error getting unread count:', error)
      return { unread_count: 0, success: false }
    }
  },

  /**
   * Register device for push notifications
   * @param {string} deviceToken 
   * @param {string} deviceType - 'web', 'ios', 'android'
   */
  registerDevice: async (deviceToken, deviceType = 'web') => {
    try {
      const response = await api.post('/device-tokens/register', {
        device_token: deviceToken,
        device_type: deviceType,
        platform: 'pwa'
      })
      return response.data
    } catch (error) {
      console.error('Error registering device:', error)
      throw error
    }
  },

  /**
   * Get notification statistics (admin only)
   */
  getStats: async () => {
    const response = await api.get('/notifications/stats')
    return response.data
  }
}

export default notificationService
