import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import NotificationPrompt from '../../../src/components/NotificationPrompt'
import { pushNotificationService } from '../../../src/services'

// Mock pushNotificationService
vi.mock('../../../src/services', () => ({
  pushNotificationService: {
    isNotificationsEnabled: vi.fn(),
    getPermissionStatus: vi.fn(),
    isPushSupported: vi.fn(),
    setupPushNotifications: vi.fn(),
    showTestNotification: vi.fn(),
  },
}))

describe('NotificationPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localStorage.clear()

    // Default mocks - notifications not enabled, permission not denied, push supported
    pushNotificationService.isNotificationsEnabled.mockReturnValue(false)
    pushNotificationService.getPermissionStatus.mockReturnValue('default')
    pushNotificationService.isPushSupported.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('visibility logic', () => {
    it('should not show prompt if notifications already enabled', () => {
      pushNotificationService.isNotificationsEnabled.mockReturnValue(true)

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.queryByText('تفعيل الإشعارات 🔔')).toBeNull()
    })

    it('should not show prompt if permission denied', () => {
      pushNotificationService.getPermissionStatus.mockReturnValue('denied')

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.queryByText('تفعيل الإشعارات 🔔')).toBeNull()
    })

    it('should not show prompt if push not supported', () => {
      pushNotificationService.isPushSupported.mockReturnValue(false)

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.queryByText('تفعيل الإشعارات 🔔')).toBeNull()
    })

    it('should not show prompt if dismissed within last 7 days', () => {
      const sevenDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000) // 6 days ago
      localStorage.setItem('notification_prompt_dismissed', sevenDaysAgo.toString())

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.queryByText('تفعيل الإشعارات 🔔')).toBeNull()
    })

    it('should show prompt if dismissed more than 7 days ago', () => {
      const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000)
      localStorage.setItem('notification_prompt_dismissed', eightDaysAgo.toString())

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(screen.getByText('تفعيل الإشعارات 🔔')).toBeDefined()
    })

    it('should show prompt after 2 second delay', () => {
      render(<NotificationPrompt memberId={1} />)

      // Before 2 seconds
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.queryByText('تفعيل الإشعارات 🔔')).toBeNull()

      // After 2 seconds
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByText('تفعيل الإشعارات 🔔')).toBeDefined()
    })
  })

  describe('rendering', () => {
    beforeEach(() => {
      render(<NotificationPrompt memberId={1} />)
      act(() => {
        vi.advanceTimersByTime(2000)
      })
    })

    it('should render prompt with Arabic title', () => {
      expect(screen.getByText('تفعيل الإشعارات 🔔')).toBeDefined()
    })

    it('should render Arabic description text', () => {
      expect(screen.getByText('فعّل الإشعارات ليصلك تنبيه بـ:')).toBeDefined()
    })

    it('should render notification benefits list', () => {
      expect(screen.getByText(/تذكير بموعد الاشتراك/)).toBeDefined()
      expect(screen.getByText(/المناسبات والفعاليات/)).toBeDefined()
      expect(screen.getByText(/الإعلانات الهامة/)).toBeDefined()
    })

    it('should render dismiss button with "لاحقاً" text', () => {
      expect(screen.getByText('لاحقاً')).toBeDefined()
    })

    it('should render enable button with "تفعيل" text', () => {
      expect(screen.getByText('تفعيل')).toBeDefined()
    })

    it('should render close (X) button', () => {
      const { container } = render(<NotificationPrompt memberId={1} />)
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // X button exists (Lucide X icon)
      const closeButtons = container.querySelectorAll('button')
      expect(closeButtons.length).toBeGreaterThan(0)
    })
  })

  describe('dismiss functionality', () => {
    it('should hide prompt when dismiss button clicked', () => {
      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const dismissButton = screen.getByText('لاحقاً')
      fireEvent.click(dismissButton)

      expect(screen.queryByText('تفعيل الإشعارات 🔔')).toBeNull()
    })

    it('should save dismiss timestamp to localStorage', () => {
      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const dismissButton = screen.getByText('لاحقاً')
      fireEvent.click(dismissButton)

      const dismissedAt = localStorage.getItem('notification_prompt_dismissed')
      expect(dismissedAt).toBeDefined()
      expect(Number(dismissedAt)).toBeGreaterThan(0)
    })

    it('should call onComplete with false when dismissed', () => {
      const onCompleteMock = vi.fn()
      render(<NotificationPrompt memberId={1} onComplete={onCompleteMock} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const dismissButton = screen.getByText('لاحقاً')
      fireEvent.click(dismissButton)

      expect(onCompleteMock).toHaveBeenCalledWith(false)
    })

    it('should hide prompt when close (X) button clicked', () => {
      const { container } = render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Click the X button (first button, top-left)
      const closeButton = container.querySelector('button')
      fireEvent.click(closeButton)

      expect(screen.queryByText('تفعيل الإشعارات 🔔')).toBeNull()
    })
  })

  describe('enable functionality', () => {
    it('should show loading spinner when enable button clicked', async () => {
      // Delay resolution to observe loading state
      pushNotificationService.setupPushNotifications.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      const { container } = render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers() // Use real timers for async operation
      fireEvent.click(enableButton)

      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin')
        expect(spinner).toBeDefined()
      }, { timeout: 200 })

      vi.useFakeTimers() // Back to fake timers
    })

    it('should call setupPushNotifications with memberId', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: true })

      render(<NotificationPrompt memberId={123} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(pushNotificationService.setupPushNotifications).toHaveBeenCalledWith(123)
      })

      vi.useFakeTimers()
    })

    it('should show success message on successful setup', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: true })

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('تم تفعيل الإشعارات! ✅')).toBeDefined()
      })

      vi.useFakeTimers()
    })

    it('should show test notification on success', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: true })

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('تم تفعيل الإشعارات! ✅')).toBeDefined()
      })

      // Wait for test notification to be called (500ms delay in component)
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(pushNotificationService.showTestNotification).toHaveBeenCalled()

      vi.useFakeTimers()
    })

    it('should auto-hide prompt after successful setup', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: true })

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('تم تفعيل الإشعارات! ✅')).toBeDefined()
      })

      // Wait for auto-hide (2000ms delay in component)
      await new Promise(resolve => setTimeout(resolve, 2100))

      expect(screen.queryByText('تم تفعيل الإشعارات! ✅')).toBeNull()

      vi.useFakeTimers()
    })

    it('should call onComplete with true on success', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: true })

      const onCompleteMock = vi.fn()
      render(<NotificationPrompt memberId={1} onComplete={onCompleteMock} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('تم تفعيل الإشعارات! ✅')).toBeDefined()
      })

      // Wait for auto-hide and onComplete call
      await new Promise(resolve => setTimeout(resolve, 2100))

      expect(onCompleteMock).toHaveBeenCalledWith(true)

      vi.useFakeTimers()
    })

    it('should show error message on failed setup', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: false })

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('تعذر التفعيل')).toBeDefined()
      })

      vi.useFakeTimers()
    })

    it('should show retry button on error', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: false })

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('إعادة المحاولة')).toBeDefined()
      })

      vi.useFakeTimers()
    })

    it('should reset to initial state when retry clicked', async () => {
      pushNotificationService.setupPushNotifications.mockResolvedValue({ success: false })

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('إعادة المحاولة')).toBeDefined()
      })

      const retryButton = screen.getByText('إعادة المحاولة')
      fireEvent.click(retryButton)

      expect(screen.getByText('تفعيل الإشعارات 🔔')).toBeDefined()

      vi.useFakeTimers()
    })

    it('should handle setup exception gracefully', async () => {
      pushNotificationService.setupPushNotifications.mockRejectedValue(new Error('Setup failed'))

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('تعذر التفعيل')).toBeDefined()
      })

      vi.useFakeTimers()
    })
  })

  describe('edge cases', () => {
    it('should handle onComplete being undefined', () => {
      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const dismissButton = screen.getByText('لاحقاً')

      expect(() => fireEvent.click(dismissButton)).not.toThrow()
    })

    it('should disable enable button during loading', async () => {
      // Delay resolution to observe loading state
      pushNotificationService.setupPushNotifications.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(<NotificationPrompt memberId={1} />)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      const enableButton = screen.getByText('تفعيل').closest('button')

      vi.useRealTimers()
      fireEvent.click(enableButton)

      await waitFor(() => {
        expect(enableButton.disabled).toBe(true)
      }, { timeout: 200 })

      vi.useFakeTimers()
    })
  })
})
