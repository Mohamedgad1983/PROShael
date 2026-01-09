/**
 * Integration Test: Navigation Flow
 * Tests navigation between pages with persistent state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dashboard from '../../src/pages/Dashboard'
import Profile from '../../src/pages/Profile'
import Notifications from '../../src/pages/Notifications'
import PaymentCenter from '../../src/pages/PaymentCenter'
import { DataCacheProvider } from '../../src/contexts/DataCacheContext'
import * as services from '../../src/services'

// Mock all services
vi.mock('../../src/services', () => ({
  memberService: {
    getMyData: vi.fn(),
  },
  newsService: {
    getRecentNews: vi.fn(),
    getAllNews: vi.fn(),
  },
  notificationService: {
    getUnreadCount: vi.fn(),
    getMyNotifications: vi.fn(),
  },
  subscriptionService: {
    getMySubscriptions: vi.fn(),
    getPaymentHistory: vi.fn(),
  },
  familyTreeService: {
    getMyFamilyTree: vi.fn(),
    getBranches: vi.fn(),
  },
  initiativeService: {
    getActiveInitiatives: vi.fn(),
  },
  pushNotificationService: {
    isNotificationsEnabled: vi.fn(() => true),
    getPermissionStatus: vi.fn(() => 'granted'),
    isPushSupported: vi.fn(() => true),
  },
}))

// Mock useAuth
vi.mock('../../src/App', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name_ar: 'محمد أحمد الشعيل',
      membership_number: 'SH-0001',
      balance: 1500,
    },
    logout: vi.fn(),
  }),
}))

describe('Navigation Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    services.memberService.getMyData.mockResolvedValue({
      id: 1,
      full_name_ar: 'محمد أحمد',
      current_balance: '1500.00',
      membership_status: 'active',
    })
    services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
    services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 3 })
    services.notificationService.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          id: 1,
          title_ar: 'إشعار جديد',
          message_ar: 'لديك رسالة جديدة',
          created_at: '2026-01-09',
        },
      ],
    })
    services.newsService.getRecentNews.mockResolvedValue({ news: [] })
  })

  const renderApp = (initialRoute = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DataCacheProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/payment-center" element={<PaymentCenter />} />
          </Routes>
        </DataCacheProvider>
      </MemoryRouter>
    )
  }

  describe('Dashboard to Notifications Flow', () => {
    it('should navigate from Dashboard to Notifications via BottomNav', async () => {
      renderApp('/dashboard')

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Verify we're on dashboard
      expect(screen.getByText('الرئيسية')).toBeDefined()

      // Click notifications in BottomNav
      const notifItem = screen.getByText('الإشعارات').closest('.nav-item')
      fireEvent.click(notifItem)

      // Should navigate to notifications page
      await waitFor(() => {
        expect(screen.getByText('إشعار جديد')).toBeDefined()
      })

      // Should have called notifications API
      expect(services.notificationService.getMyNotifications).toHaveBeenCalled()
    })

    it('should preserve notification count across navigation', async () => {
      renderApp('/dashboard')

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Should show notification count badge
      expect(screen.getByText('3')).toBeDefined()

      // Navigate to notifications
      const notifItem = screen.getByText('الإشعارات').closest('.nav-item')
      fireEvent.click(notifItem)

      await waitFor(() => {
        expect(screen.getByText('إشعار جديد')).toBeDefined()
      })

      // Navigate back to dashboard
      const dashboardItem = screen.getByText('الرئيسية').closest('.nav-item')
      fireEvent.click(dashboardItem)

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Badge should still show count
      expect(screen.getByText('3')).toBeDefined()
    })
  })

  describe('Dashboard to Profile Flow', () => {
    it('should navigate from Dashboard to Profile via BottomNav', async () => {
      renderApp('/dashboard')

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Click profile in BottomNav
      const profileItem = screen.getByText('حسابي').closest('.nav-item')
      fireEvent.click(profileItem)

      // Should navigate to profile page
      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
      })
    })
  })

  describe('Dashboard to Payment Center Flow', () => {
    it('should navigate from Dashboard to Payment Center via quick action', async () => {
      renderApp('/dashboard')

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Click "دفع الاشتراك" button
      const payButton = screen.getByText(/دفع الاشتراك/)
      fireEvent.click(payButton)

      // Should navigate to payment center
      await waitFor(() => {
        expect(screen.getByText(/خيارات الدفع/) || screen.getByText(/المدفوعات/)).toBeDefined()
      })
    })

    it('should navigate from Dashboard to Payment Center via BottomNav', async () => {
      renderApp('/dashboard')

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Click payments in BottomNav
      const paymentItem = screen.getByText('المدفوعات').closest('.nav-item')
      fireEvent.click(paymentItem)

      // Should navigate to payment center
      await waitFor(() => {
        expect(screen.getByText(/خيارات الدفع/) || screen.getByText(/المدفوعات/)).toBeDefined()
      })
    })
  })

  describe('Cache Persistence Across Navigation', () => {
    it('should use cached dashboard data when returning from another page', async () => {
      renderApp('/dashboard')

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      const initialCallCount = services.memberService.getMyData.mock.calls.length

      // Navigate to profile
      const profileItem = screen.getByText('حسابي').closest('.nav-item')
      fireEvent.click(profileItem)

      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
      })

      // Navigate back to dashboard
      const dashboardItem = screen.getByText('الرئيسية').closest('.nav-item')
      fireEvent.click(dashboardItem)

      // Should show cached data immediately (no loading)
      expect(screen.getByText('1,500')).toBeDefined()

      // Should not have made additional API calls (cache is valid)
      expect(services.memberService.getMyData.mock.calls.length).toBe(initialCallCount)
    })
  })

  describe('BottomNav Active State', () => {
    it('should highlight active page in BottomNav', async () => {
      renderApp('/dashboard')

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Dashboard should be active
      const dashboardItem = screen.getByText('الرئيسية').closest('.nav-item')
      expect(dashboardItem.className).toContain('active')

      // Navigate to notifications
      const notifItem = screen.getByText('الإشعارات').closest('.nav-item')
      fireEvent.click(notifItem)

      await waitFor(() => {
        expect(screen.getByText('إشعار جديد')).toBeDefined()
      })

      // Notifications should now be active
      const notifItemActive = screen.getByText('الإشعارات').closest('.nav-item')
      expect(notifItemActive.className).toContain('active')

      // Dashboard should no longer be active
      const dashboardItemInactive = screen.getByText('الرئيسية').closest('.nav-item')
      expect(dashboardItemInactive.className).not.toContain('active')
    })
  })

  describe('Complete User Journey', () => {
    it('should complete full journey: Dashboard → Notifications → Profile → Dashboard', async () => {
      renderApp('/dashboard')

      // Step 1: Start at Dashboard
      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Step 2: Go to Notifications
      const notifItem = screen.getByText('الإشعارات').closest('.nav-item')
      fireEvent.click(notifItem)

      await waitFor(() => {
        expect(screen.getByText('إشعار جديد')).toBeDefined()
      })

      // Step 3: Go to Profile
      const profileItem = screen.getByText('حسابي').closest('.nav-item')
      fireEvent.click(profileItem)

      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
      })

      // Step 4: Return to Dashboard
      const dashboardItem = screen.getByText('الرئيسية').closest('.nav-item')
      fireEvent.click(dashboardItem)

      // Should show cached data immediately
      expect(screen.getByText('1,500')).toBeDefined()

      // All pages should have loaded successfully
      expect(services.memberService.getMyData).toHaveBeenCalled()
      expect(services.notificationService.getMyNotifications).toHaveBeenCalled()
    })
  })

  describe('Direct Page Access', () => {
    it('should load notifications page directly', async () => {
      renderApp('/notifications')

      await waitFor(() => {
        expect(screen.getByText('إشعار جديد')).toBeDefined()
      })

      // Should have loaded notifications
      expect(services.notificationService.getMyNotifications).toHaveBeenCalled()
    })

    it('should load profile page directly', async () => {
      renderApp('/profile')

      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
      })

      // Should have loaded profile
      expect(services.memberService.getMyData).toHaveBeenCalled()
    })
  })
})
