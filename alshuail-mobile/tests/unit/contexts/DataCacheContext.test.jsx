import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, renderHook, act } from '@testing-library/react'
import { DataCacheProvider, useDataCache } from '../../../src/contexts/DataCacheContext'
import * as services from '../../../src/services'

// Mock all services
vi.mock('../../../src/services', () => ({
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
}))

describe('DataCacheContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Provider', () => {
    it('should render children correctly', () => {
      render(
        <DataCacheProvider>
          <div>Test Child</div>
        </DataCacheProvider>
      )

      expect(screen.getByText('Test Child')).toBeDefined()
    })

    it('should throw error when useDataCache is used outside provider', () => {
      expect(() => {
        renderHook(() => useDataCache())
      }).toThrow('useDataCache must be used within DataCacheProvider')
    })
  })

  describe('fetchDashboard', () => {
    it('should fetch and cache dashboard data with MEDIUM TTL', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      const mockSubscriptions = { subscriptions: ['sub1'] }
      const mockNotifCount = { unread_count: 5 }
      const mockNews = { news: [{ id: 1, title: 'News 1' }] }

      services.memberService.getMyData.mockResolvedValue(mockProfile)
      services.subscriptionService.getMySubscriptions.mockResolvedValue(mockSubscriptions)
      services.notificationService.getUnreadCount.mockResolvedValue(mockNotifCount)
      services.newsService.getRecentNews.mockResolvedValue(mockNews)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let dashboardResult
      await act(async () => {
        dashboardResult = await result.current.fetchDashboard()
      })

      expect(dashboardResult.data).toBeDefined()
      expect(dashboardResult.data.profile).toEqual(mockProfile)
      expect(dashboardResult.data.notificationCount).toBe(5)
      expect(dashboardResult.fromCache).toBe(false)
      expect(dashboardResult.loading).toBe(false)

      // Check that data is cached
      expect(result.current.cache.dashboard.data).toBeDefined()
      expect(result.current.cache.dashboard.timestamp).toBeDefined()
    })

    it('should return cached data on subsequent calls', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      services.memberService.getMyData.mockResolvedValue(mockProfile)
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ subscriptions: [] })
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 0 })
      services.newsService.getRecentNews.mockResolvedValue({ news: [] })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // First fetch
      await act(async () => {
        await result.current.fetchDashboard()
      })

      expect(services.memberService.getMyData).toHaveBeenCalledTimes(1)

      // Second fetch should use cache
      let cachedResult
      await act(async () => {
        cachedResult = await result.current.fetchDashboard()
      })

      expect(cachedResult.fromCache).toBe(true)
      expect(services.memberService.getMyData).toHaveBeenCalledTimes(1) // Still 1
    })
  })

  describe('fetchProfile', () => {
    it('should return cached data within TTL', async () => {
      const mockProfile = { id: 1, name: 'Test User', balance: '1000.00' }
      services.memberService.getMyData.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // First fetch
      await act(async () => {
        await result.current.fetchProfile()
      })

      expect(services.memberService.getMyData).toHaveBeenCalledTimes(1)

      // Second fetch within TTL should use cache
      let cachedResult
      await act(async () => {
        cachedResult = await result.current.fetchProfile()
      })

      expect(cachedResult.fromCache).toBe(true)
      expect(cachedResult.data).toEqual(mockProfile)
      expect(services.memberService.getMyData).toHaveBeenCalledTimes(1)
    })

    it('should fetch new data when cache expired', async () => {
      const mockProfile1 = { id: 1, name: 'User 1' }
      const mockProfile2 = { id: 1, name: 'User 2 Updated' }

      services.memberService.getMyData
        .mockResolvedValueOnce(mockProfile1)
        .mockResolvedValueOnce(mockProfile2)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // First fetch
      await act(async () => {
        await result.current.fetchProfile()
      })

      expect(result.current.cache.profile.data).toEqual(mockProfile1)

      // Advance time beyond MEDIUM TTL (5 minutes)
      act(() => {
        vi.advanceTimersByTime(6 * 60 * 1000)
      })

      // Second fetch after TTL expired
      let newResult
      await act(async () => {
        newResult = await result.current.fetchProfile()
      })

      expect(newResult.fromCache).toBe(false)
      expect(newResult.data).toEqual(mockProfile2)
      expect(services.memberService.getMyData).toHaveBeenCalledTimes(2)
    })
  })

  describe('forceRefresh', () => {
    it('should bypass cache when forceRefresh is true', async () => {
      const mockProfile1 = { id: 1, name: 'User 1' }
      const mockProfile2 = { id: 1, name: 'User 2 Updated' }

      services.memberService.getMyData
        .mockResolvedValueOnce(mockProfile1)
        .mockResolvedValueOnce(mockProfile2)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // First fetch
      await act(async () => {
        await result.current.fetchProfile()
      })

      expect(result.current.cache.profile.data).toEqual(mockProfile1)

      // Force refresh
      let refreshResult
      await act(async () => {
        refreshResult = await result.current.fetchProfile(true)
      })

      expect(refreshResult.fromCache).toBe(false)
      expect(refreshResult.data).toEqual(mockProfile2)
      expect(services.memberService.getMyData).toHaveBeenCalledTimes(2)
    })
  })

  describe('invalidateCache', () => {
    it('should clear specific cache key', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      services.memberService.getMyData.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // Fetch profile
      await act(async () => {
        await result.current.fetchProfile()
      })

      expect(result.current.cache.profile.timestamp).toBeDefined()

      // Invalidate profile cache
      act(() => {
        result.current.invalidateCache('profile')
      })

      expect(result.current.cache.profile.timestamp).toBeNull()
      expect(result.current.cache.profile.data).toBeDefined() // Data still there, just timestamp null
    })
  })

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      const mockNews = { news: [{ id: 1, title: 'News' }] }

      services.memberService.getMyData.mockResolvedValue(mockProfile)
      services.newsService.getAllNews.mockResolvedValue(mockNews)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // Fetch data
      await act(async () => {
        await result.current.fetchProfile()
        await result.current.fetchNews()
      })

      expect(result.current.cache.profile.data).toBeDefined()
      expect(result.current.cache.news.data).toBeDefined()

      // Clear all cache
      act(() => {
        result.current.clearCache()
      })

      expect(result.current.cache.profile.data).toBeNull()
      expect(result.current.cache.news.data).toBeNull()
      expect(result.current.cache.dashboard.data).toBeNull()
    })
  })

  describe('getCacheStatus', () => {
    it('should return correct freshness state', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      services.memberService.getMyData.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // Before fetch
      let status = result.current.getCacheStatus('profile')
      expect(status.hasData).toBe(false)
      expect(status.isFresh).toBe(false)
      expect(status.isLoading).toBe(false)

      // After fetch
      await act(async () => {
        await result.current.fetchProfile()
      })

      status = result.current.getCacheStatus('profile')
      expect(status.hasData).toBe(true)
      expect(status.isFresh).toBe(true)
      expect(status.timestamp).toBeDefined()

      // After TTL expires
      act(() => {
        vi.advanceTimersByTime(6 * 60 * 1000)
      })

      status = result.current.getCacheStatus('profile')
      expect(status.hasData).toBe(true)
      expect(status.isFresh).toBe(false) // Expired
    })
  })

  describe('error handling', () => {
    it('should propagate fetch error to context state', async () => {
      const mockError = new Error('Network error')
      services.memberService.getMyData.mockRejectedValue(mockError)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let errorResult
      await act(async () => {
        errorResult = await result.current.fetchProfile()
      })

      expect(errorResult.error).toBe('Network error')
      expect(errorResult.loading).toBe(false)
      // Returns null when no cached data available
      expect(errorResult.data).toBeNull()
    })

    it('should return cached data when fetch fails', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      services.memberService.getMyData
        .mockResolvedValueOnce(mockProfile)
        .mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // First successful fetch
      await act(async () => {
        await result.current.fetchProfile()
      })

      // Second fetch fails but returns cached data
      let errorResult
      await act(async () => {
        vi.advanceTimersByTime(6 * 60 * 1000) // Expire cache
        errorResult = await result.current.fetchProfile()
      })

      expect(errorResult.error).toBe('Network error')
      expect(errorResult.data).toEqual(mockProfile) // Returns cached data
    })
  })

  describe('multiple components', () => {
    it('should share cached data across multiple useDataCache calls', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      services.memberService.getMyData.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // First fetch
      await act(async () => {
        await result.current.fetchProfile()
      })

      expect(services.memberService.getMyData).toHaveBeenCalledTimes(1)

      // Second fetch from same context should use cache
      let cachedResult
      await act(async () => {
        cachedResult = await result.current.fetchProfile()
      })

      expect(cachedResult.fromCache).toBe(true)
      expect(cachedResult.data).toEqual(mockProfile)
      expect(services.memberService.getMyData).toHaveBeenCalledTimes(1) // Still only once
    })
  })

  describe('isCacheValid', () => {
    it('should validate cache correctly', async () => {
      const mockProfile = { id: 1, name: 'Test User' }
      services.memberService.getMyData.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      // Before fetch
      expect(result.current.isCacheValid('profile')).toBe(false)

      // After fetch
      await act(async () => {
        await result.current.fetchProfile()
      })

      expect(result.current.isCacheValid('profile')).toBe(true)

      // After expiry
      act(() => {
        vi.advanceTimersByTime(6 * 60 * 1000)
      })

      expect(result.current.isCacheValid('profile')).toBe(false)
    })
  })

  describe('fetchSubscriptions', () => {
    it('should fetch and cache subscriptions data', async () => {
      const mockSubscriptions = [{ id: 1, year: 2026, status: 'active' }]
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: mockSubscriptions })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let subsResult
      await act(async () => {
        subsResult = await result.current.fetchSubscriptions()
      })

      expect(subsResult.data).toEqual(mockSubscriptions)
      expect(subsResult.fromCache).toBe(false)
      expect(services.subscriptionService.getMySubscriptions).toHaveBeenCalledTimes(1)
    })

    it('should return cached subscriptions on subsequent calls', async () => {
      const mockSubscriptions = [{ id: 1, year: 2026 }]
      services.subscriptionService.getMySubscriptions.mockResolvedValue({ data: mockSubscriptions })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      await act(async () => {
        await result.current.fetchSubscriptions()
      })

      let cachedResult
      await act(async () => {
        cachedResult = await result.current.fetchSubscriptions()
      })

      expect(cachedResult.fromCache).toBe(true)
      expect(services.subscriptionService.getMySubscriptions).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchPayments', () => {
    it('should fetch and cache payment history', async () => {
      const mockPayments = [{ id: 1, amount: '100.00', type: 'subscription' }]
      services.subscriptionService.getPaymentHistory.mockResolvedValue({ data: mockPayments })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let paymentsResult
      await act(async () => {
        paymentsResult = await result.current.fetchPayments()
      })

      expect(paymentsResult.data).toEqual(mockPayments)
      expect(paymentsResult.fromCache).toBe(false)
    })
  })

  describe('fetchNotifications', () => {
    it('should fetch and cache notifications with SHORT TTL', async () => {
      const mockNotifications = [{ id: 1, title: 'Test Notification' }]
      services.notificationService.getMyNotifications.mockResolvedValue({ notifications: mockNotifications })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let notifsResult
      await act(async () => {
        notifsResult = await result.current.fetchNotifications()
      })

      expect(notifsResult.data).toEqual(mockNotifications)
      expect(notifsResult.fromCache).toBe(false)
    })

    it('should return cached notifications within SHORT TTL', async () => {
      const mockNotifications = [{ id: 1, title: 'Test' }]
      services.notificationService.getMyNotifications.mockResolvedValue({ notifications: mockNotifications })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      await act(async () => {
        await result.current.fetchNotifications()
      })

      let cachedResult
      await act(async () => {
        cachedResult = await result.current.fetchNotifications()
      })

      expect(cachedResult.fromCache).toBe(true)
    })
  })

  describe('fetchNotificationCount', () => {
    it('should fetch notification count', async () => {
      services.notificationService.getUnreadCount.mockResolvedValue({ unread_count: 10 })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let countResult
      await act(async () => {
        countResult = await result.current.fetchNotificationCount()
      })

      expect(countResult.data).toBe(10)
      expect(countResult.fromCache).toBe(false)
    })
  })

  describe('fetchFamilyTree', () => {
    it('should fetch and cache family tree with LONG TTL', async () => {
      const mockTree = { id: 1, name: 'Al-Shuail Family' }
      services.familyTreeService.getMyFamilyTree.mockResolvedValue({ data: mockTree })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let treeResult
      await act(async () => {
        treeResult = await result.current.fetchFamilyTree()
      })

      expect(treeResult.data).toEqual(mockTree)
      expect(treeResult.fromCache).toBe(false)
    })
  })

  describe('fetchBranches', () => {
    it('should fetch and cache branches with LONG TTL', async () => {
      const mockBranches = [{ id: 1, name: 'Branch 1' }]
      services.familyTreeService.getBranches.mockResolvedValue({ branches: mockBranches })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let branchesResult
      await act(async () => {
        branchesResult = await result.current.fetchBranches()
      })

      expect(branchesResult.data).toEqual(mockBranches)
      expect(branchesResult.fromCache).toBe(false)
    })
  })

  describe('fetchInitiatives', () => {
    it('should fetch and cache initiatives', async () => {
      const mockInitiatives = [{ id: 1, title: 'Initiative 1' }]
      services.initiativeService.getActiveInitiatives.mockResolvedValue({ initiatives: mockInitiatives })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let initiativesResult
      await act(async () => {
        initiativesResult = await result.current.fetchInitiatives()
      })

      expect(initiativesResult.data).toEqual(mockInitiatives)
      expect(initiativesResult.fromCache).toBe(false)
    })
  })

  describe('fetchNews', () => {
    it('should fetch and cache news', async () => {
      const mockNews = [{ id: 1, title: 'News 1' }]
      services.newsService.getAllNews.mockResolvedValue({ news: mockNews })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      let newsResult
      await act(async () => {
        newsResult = await result.current.fetchNews()
      })

      expect(newsResult.data).toEqual(mockNews)
      expect(newsResult.fromCache).toBe(false)
    })

    it('should return cached news on subsequent calls', async () => {
      const mockNews = [{ id: 1, title: 'News 1' }]
      services.newsService.getAllNews.mockResolvedValue({ news: mockNews })

      const { result } = renderHook(() => useDataCache(), {
        wrapper: DataCacheProvider,
      })

      await act(async () => {
        await result.current.fetchNews()
      })

      let cachedResult
      await act(async () => {
        cachedResult = await result.current.fetchNews()
      })

      expect(cachedResult.fromCache).toBe(true)
      expect(services.newsService.getAllNews).toHaveBeenCalledTimes(1)
    })
  })
})
