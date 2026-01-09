/**
 * Integration Test: Dashboard with DataCache and Components
 * Tests Dashboard page integration with DataCacheContext, BottomNav, and NotificationPrompt
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../../src/pages/Dashboard'
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
    isNotificationsEnabled: vi.fn(() => true), // Disable notification prompt
    getPermissionStatus: vi.fn(() => 'granted'),
    isPushSupported: vi.fn(() => true),
    setupPushNotifications: vi.fn(),
    showTestNotification: vi.fn(),
  },
}))

// Mock useAuth
const mockNavigate = vi.fn()

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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' }),
  }
})

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <DataCacheProvider>
          <Dashboard />
        </DataCacheProvider>
      </BrowserRouter>
    )
  }

  describe('Initial Load with Cache', () => {
    it('should load dashboard data from API on first visit', async () => {
      const mockProfile = {
        id: 1,
        full_name_ar: 'محمد أحمد',
        current_balance: '1500.00',
        membership_status: 'active',
      }

      const mockSubscriptions = [
        {
          id: 1,
          amount: '100.00',
          payment_date: '2026-01-01',
          description: 'اشتراك يناير',
        },
      ]

      const mockNotifCount = { unread_count: 5 }
      const mockNews = {
        news: [
          {
            id: 1,
            title_ar: 'خبر جديد',
            content_ar: 'محتوى الخبر...',
            publish_date: '2026-01-09',
          },
        ],
      }

      services.memberService.getMyData.mockResolvedValue(mockProfile)
      services.subscriptionService.getMySubscriptions.mockResolvedValue({
        data: mockSubscriptions,
      })
      services.notificationService.getUnreadCount.mockResolvedValue(mockNotifCount)
      services.newsService.getRecentNews.mockResolvedValue(mockNews)

      renderDashboard()

      // Should show loading initially
      expect(screen.getByText(/تحميل/)).toBeDefined()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined() // Balance formatted
      })

      // Verify all services were called
      expect(services.memberService.getMyData).toHaveBeenCalled()
      expect(services.subscriptionService.getMySubscriptions).toHaveBeenCalled()
      expect(services.notificationService.getUnreadCount).toHaveBeenCalled()
      expect(services.newsService.getRecentNews).toHaveBeenCalled()
    })

    it('should use cached data on subsequent render', async () => {
      const mockProfile = {
        id: 1,
        full_name_ar: 'محمد أحمد',
        current_balance: '1500.00',
        membership_status: 'active',
      }

      services.memberService.getMyData.mockResolvedValue(mockProfile)
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      // First render
      const { unmount } = renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      const firstCallCount = services.memberService.getMyData.mock.calls.length

      unmount()

      // Second render - should use cache
      renderDashboard()

      // Should not show loading
      expect(screen.queryByText(/تحميل/)).toBeNull()

      // Should display cached data immediately
      expect(screen.getByText('1,500')).toBeDefined()

      // Services should not be called again immediately (cache is valid)
      expect(services.memberService.getMyData.mock.calls.length).toBe(firstCallCount)
    })
  })

  describe('Pull to Refresh', () => {
    it('should refresh data when refresh button clicked', async () => {
      const mockProfile1 = {
        id: 1,
        full_name_ar: 'محمد أحمد',
        current_balance: '1500.00',
        membership_status: 'active',
      }

      const mockProfile2 = {
        id: 1,
        full_name_ar: 'محمد أحمد',
        current_balance: '2000.00', // Updated balance
        membership_status: 'active',
      }

      services.memberService.getMyData
        .mockResolvedValueOnce(mockProfile1)
        .mockResolvedValueOnce(mockProfile2)

      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      renderDashboard()

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeDefined()
      })

      // Find and click refresh button
      const refreshButton = screen.getByRole('button', { name: /تحديث/ })
      fireEvent.click(refreshButton)

      // Wait for refresh to complete
      await waitFor(() => {
        expect(screen.getByText('2,000')).toBeDefined()
      })

      // Should have called API twice
      expect(services.memberService.getMyData).toHaveBeenCalledTimes(2)
    })
  })

  describe('BottomNav Integration', () => {
    it('should render BottomNav with notification count', async () => {
      services.memberService.getMyData.mockResolvedValue({
        id: 1,
        current_balance: '1000.00',
      })
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 7 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeDefined()
      })

      // BottomNav should be rendered
      expect(screen.getByText('الرئيسية')).toBeDefined()
      expect(screen.getByText('المدفوعات')).toBeDefined()
      expect(screen.getByText('الإشعارات')).toBeDefined()
      expect(screen.getByText('حسابي')).toBeDefined()

      // Should show notification badge
      expect(screen.getByText('7')).toBeDefined()
    })

    it('should navigate when BottomNav item clicked', async () => {
      services.memberService.getMyData.mockResolvedValue({
        id: 1,
        current_balance: '1000.00',
      })
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeDefined()
      })

      // Click on المدفوعات (Payments)
      const paymentsItem = screen.getByText('المدفوعات').closest('.nav-item')
      fireEvent.click(paymentsItem)

      expect(mockNavigate).toHaveBeenCalledWith('/payment-center')
    })
  })

  describe('Quick Actions', () => {
    it('should navigate to payment center when pay subscription clicked', async () => {
      services.memberService.getMyData.mockResolvedValue({
        id: 1,
        current_balance: '1000.00',
      })
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeDefined()
      })

      // Find and click "دفع الاشتراك" button
      const payButton = screen.getByText(/دفع الاشتراك/)
      fireEvent.click(payButton)

      expect(mockNavigate).toHaveBeenCalledWith('/payment-center')
    })

    it('should navigate to family tree when view family clicked', async () => {
      services.memberService.getMyData.mockResolvedValue({
        id: 1,
        current_balance: '1000.00',
      })
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeDefined()
      })

      // Find and click "شجرة العائلة" button
      const familyButton = screen.getByText(/شجرة العائلة/)
      fireEvent.click(familyButton)

      expect(mockNavigate).toHaveBeenCalledWith('/family-tree')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      services.memberService.getMyData.mockRejectedValue(new Error('Network error'))
      services.subscriptionService.getMySubscriptions.mockRejectedValue(
        new Error('Network error')
      )
      services.notificationService.getUnreadCount.mockRejectedValue(
        new Error('Network error')
      )
      services.newsService.getRecentNews.mockRejectedValue(new Error('Network error'))

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText(/حدث خطأ/)).toBeDefined()
      })
    })

    it('should fallback to user data when profile fetch fails', async () => {
      services.memberService.getMyData.mockRejectedValue(new Error('Network error'))
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      renderDashboard()

      await waitFor(() => {
        // Should show balance from mocked user (1500 from useAuth mock)
        expect(screen.getByText('1,500')).toBeDefined()
      })
    })
  })

  describe('Recent Activity', () => {
    it('should display recent subscriptions as activity', async () => {
      const mockSubscriptions = [
        {
          id: 1,
          amount: '100.00',
          payment_date: '2026-01-09',
          description: 'اشتراك يناير',
        },
        {
          id: 2,
          amount: '100.00',
          payment_date: '2025-12-09',
          description: 'اشتراك ديسمبر',
        },
      ]

      services.memberService.getMyData.mockResolvedValue({
        id: 1,
        current_balance: '1000.00',
      })
      services.subscriptionService.getMySubscriptions.mockResolvedValue({
        data: mockSubscriptions,
      })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('اشتراك يناير')).toBeDefined()
        expect(screen.getByText('اشتراك ديسمبر')).toBeDefined()
      })
    })
  })

  describe('News Display', () => {
    it('should display recent news item', async () => {
      const mockNews = {
        news: [
          {
            id: 1,
            title_ar: 'اجتماع عام للعائلة',
            content_ar:
              'يسر إدارة الصندوق دعوتكم لحضور الاجتماع السنوي للعائلة يوم الجمعة القادم',
            publish_date: '2026-01-09',
          },
        ],
      }

      services.memberService.getMyData.mockResolvedValue({
        id: 1,
        current_balance: '1000.00',
      })
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue(mockNews)

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('اجتماع عام للعائلة')).toBeDefined()
      })

      // Should show truncated content
      expect(screen.getByText(/يسر إدارة الصندوق/)).toBeDefined()
    })

    it('should navigate to news page when news item clicked', async () => {
      const mockNews = {
        news: [
          {
            id: 1,
            title_ar: 'خبر جديد',
            content_ar: 'محتوى الخبر',
            publish_date: '2026-01-09',
          },
        ],
      }

      services.memberService.getMyData.mockResolvedValue({
        id: 1,
        current_balance: '1000.00',
      })
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue(mockNews)

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('خبر جديد')).toBeDefined()
      })

      // Click news item
      const newsItem = screen.getByText('خبر جديد').closest('div')
      fireEvent.click(newsItem)

      expect(mockNavigate).toHaveBeenCalledWith('/news')
    })
  })
})
