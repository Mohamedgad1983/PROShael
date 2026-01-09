import { describe, it, expect, beforeEach } from 'vitest'
import notificationService from '../../../src/services/notificationService'

describe('notificationService', () => {
  beforeEach(() => {
    // Set up user data for notification service
    const mockUser = {
      id: 1,
      member_id: 1,
      full_name_ar: 'محمد أحمد الشعيل',
      membership_number: 'M001'
    }
    localStorage.setItem('alshuail_user', JSON.stringify(mockUser))
    localStorage.setItem('alshuail_token', 'mock-jwt-token')
  })

  describe('getMyNotifications', () => {
    it('should fetch all notifications', async () => {
      const result = await notificationService.getMyNotifications()

      expect(result.notifications).toBeDefined()
      expect(Array.isArray(result.notifications)).toBe(true)
      expect(result.notifications.length).toBeGreaterThan(0)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const result = await notificationService.markAsRead(1)

      expect(result.success).toBe(true)
      expect(result.message).toContain('read')
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const result = await notificationService.markAllAsRead()

      expect(result.success).toBe(true)
    })
  })

  describe('getUnreadCount', () => {
    it('should fetch unread notification count', async () => {
      const result = await notificationService.getUnreadCount()

      expect(result.unread_count).toBeDefined()
      expect(typeof result.unread_count).toBe('number')
      expect(result.success).toBe(true)
    })
  })

  describe('registerDevice', () => {
    it('should register device for push notifications', async () => {
      const result = await notificationService.registerDevice({
        token: 'fcm-token',
        platform: 'web'
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('registered')
    })
  })
})
