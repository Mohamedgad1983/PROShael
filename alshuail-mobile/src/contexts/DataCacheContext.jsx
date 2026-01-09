/**
 * DataCacheContext - Global Data Caching for Al-Shuail Mobile PWA
 * 
 * ✅ SOLVES: Constant loading on every page navigation
 * 
 * Features:
 * 1. Caches data globally across all pages
 * 2. Shows cached data INSTANTLY (no loading spinner)
 * 3. Refreshes data in BACKGROUND (user doesn't notice)
 * 4. Only shows loading on FIRST visit
 * 5. Pull-to-refresh forces new data
 * 
 * Created: December 2025
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { memberService, newsService, notificationService, subscriptionService, familyTreeService, initiativeService } from '../services'

const DataCacheContext = createContext(null)

// Cache duration in milliseconds
const CACHE_DURATION = {
  SHORT: 2 * 60 * 1000,      // 2 minutes - for notifications, real-time data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes - for dashboard, profile
  LONG: 15 * 60 * 1000,      // 15 minutes - for family tree, static data
}

export const useDataCache = () => {
  const context = useContext(DataCacheContext)
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider')
  }
  return context
}

export const DataCacheProvider = ({ children }) => {
  // ========== CACHED DATA STORE ==========
  const [cache, setCache] = useState({
    // Dashboard data
    dashboard: { data: null, timestamp: null, loading: false },
    
    // Profile/Member data
    profile: { data: null, timestamp: null, loading: false },
    
    // Subscriptions & Payments
    subscriptions: { data: null, timestamp: null, loading: false },
    payments: { data: null, timestamp: null, loading: false },
    
    // Notifications
    notifications: { data: null, timestamp: null, loading: false },
    notificationCount: { data: 0, timestamp: null, loading: false },
    
    // Family Tree
    familyTree: { data: null, timestamp: null, loading: false },
    branches: { data: null, timestamp: null, loading: false },
    
    // Initiatives
    initiatives: { data: null, timestamp: null, loading: false },
    
    // News
    news: { data: null, timestamp: null, loading: false },
  })

  // Track if background refresh is happening
  const refreshingRef = useRef({})

  // ========== HELPER: Check if cache is valid ==========
  const isCacheValid = useCallback((key, maxAge = CACHE_DURATION.MEDIUM) => {
    const cached = cache[key]
    if (!cached?.data || !cached?.timestamp) return false
    return (Date.now() - cached.timestamp) < maxAge
  }, [cache])

  // ========== HELPER: Update cache ==========
  const updateCache = useCallback((key, data, loading = false) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: data ? Date.now() : prev[key]?.timestamp,
        loading
      }
    }))
  }, [])

  // ========== DASHBOARD DATA ==========
  const fetchDashboard = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'dashboard'
    
    // Return cached data immediately if valid
    if (!forceRefresh && isCacheValid(cacheKey)) {
      // Background refresh if data is getting old (> 2 min)
      if (Date.now() - cache[cacheKey].timestamp > CACHE_DURATION.SHORT) {
        if (!refreshingRef.current[cacheKey]) {
          refreshingRef.current[cacheKey] = true
          fetchDashboard(true).finally(() => {
            refreshingRef.current[cacheKey] = false
          })
        }
      }
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    // Set loading only for initial fetch
    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const [profileRes, subscriptionRes, notifRes, newsRes] = await Promise.allSettled([
        memberService.getMyData().catch(() => null),
        subscriptionService.getMySubscriptions().catch(() => null),
        notificationService.getUnreadCount().catch(() => ({ unread_count: 0 })),
        newsService.getRecentNews(1).catch(() => ({ news: [] }))
      ])

      const dashboardData = {
        profile: profileRes.status === 'fulfilled' ? (profileRes.value?.data || profileRes.value) : null,
        subscriptions: subscriptionRes.status === 'fulfilled' ? subscriptionRes.value?.data : [],
        notificationCount: notifRes.status === 'fulfilled' ? (notifRes.value?.unread_count || 0) : 0,
        recentNews: newsRes.status === 'fulfilled' ? newsRes.value?.news?.[0] : null,
        fetchedAt: Date.now()
      }

      updateCache(cacheKey, dashboardData)
      
      // Also update individual caches
      if (dashboardData.profile) {
        updateCache('profile', dashboardData.profile)
      }
      updateCache('notificationCount', dashboardData.notificationCount)

      return { data: dashboardData, loading: false, fromCache: false }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      updateCache(cacheKey, cache[cacheKey]?.data, false)
      return { data: cache[cacheKey]?.data, loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== PROFILE DATA ==========
  const fetchProfile = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'profile'
    
    if (!forceRefresh && isCacheValid(cacheKey)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await memberService.getMyData()
      const profileData = response?.data || response
      updateCache(cacheKey, profileData)
      return { data: profileData, loading: false, fromCache: false }
    } catch (error) {
      console.error('Profile fetch error:', error)
      return { data: cache[cacheKey]?.data, loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== SUBSCRIPTIONS DATA ==========
  const fetchSubscriptions = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'subscriptions'
    
    if (!forceRefresh && isCacheValid(cacheKey)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await subscriptionService.getMySubscriptions()
      const data = response?.data || []
      updateCache(cacheKey, data)
      return { data, loading: false, fromCache: false }
    } catch (error) {
      console.error('Subscriptions fetch error:', error)
      return { data: cache[cacheKey]?.data || [], loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== PAYMENT HISTORY ==========
  const fetchPayments = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'payments'
    
    if (!forceRefresh && isCacheValid(cacheKey)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await subscriptionService.getPaymentHistory()
      const data = response?.data || []
      updateCache(cacheKey, data)
      return { data, loading: false, fromCache: false }
    } catch (error) {
      console.error('Payments fetch error:', error)
      return { data: cache[cacheKey]?.data || [], loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== NOTIFICATIONS ==========
  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'notifications'
    
    if (!forceRefresh && isCacheValid(cacheKey, CACHE_DURATION.SHORT)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await notificationService.getMyNotifications()
      const data = response?.notifications || response?.data || []
      updateCache(cacheKey, data)
      return { data, loading: false, fromCache: false }
    } catch (error) {
      console.error('Notifications fetch error:', error)
      return { data: cache[cacheKey]?.data || [], loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== NOTIFICATION COUNT ==========
  const fetchNotificationCount = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'notificationCount'
    
    if (!forceRefresh && isCacheValid(cacheKey, CACHE_DURATION.SHORT)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    try {
      const response = await notificationService.getUnreadCount()
      const count = response?.unread_count || 0
      updateCache(cacheKey, count)
      return { data: count, loading: false, fromCache: false }
    } catch (error) {
      return { data: cache[cacheKey]?.data || 0, loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== FAMILY TREE ==========
  const fetchFamilyTree = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'familyTree'
    
    if (!forceRefresh && isCacheValid(cacheKey, CACHE_DURATION.LONG)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await familyTreeService.getMyFamilyTree()
      const data = response?.data || response
      updateCache(cacheKey, data)
      return { data, loading: false, fromCache: false }
    } catch (error) {
      console.error('Family tree fetch error:', error)
      return { data: cache[cacheKey]?.data, loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== BRANCHES ==========
  const fetchBranches = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'branches'
    
    if (!forceRefresh && isCacheValid(cacheKey, CACHE_DURATION.LONG)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await familyTreeService.getBranches()
      const data = response?.data || response?.branches || []
      updateCache(cacheKey, data)
      return { data, loading: false, fromCache: false }
    } catch (error) {
      console.error('Branches fetch error:', error)
      return { data: cache[cacheKey]?.data || [], loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== INITIATIVES ==========
  const fetchInitiatives = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'initiatives'
    
    if (!forceRefresh && isCacheValid(cacheKey)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await initiativeService.getActiveInitiatives()
      const data = response?.initiatives || response?.data || []
      updateCache(cacheKey, data)
      return { data, loading: false, fromCache: false }
    } catch (error) {
      console.error('Initiatives fetch error:', error)
      return { data: cache[cacheKey]?.data || [], loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== NEWS ==========
  const fetchNews = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'news'
    
    if (!forceRefresh && isCacheValid(cacheKey)) {
      return { data: cache[cacheKey].data, loading: false, fromCache: true }
    }

    if (!cache[cacheKey].data) {
      updateCache(cacheKey, null, true)
    }

    try {
      const response = await newsService.getAllNews()
      const data = response?.news || response?.data || []
      updateCache(cacheKey, data)
      return { data, loading: false, fromCache: false }
    } catch (error) {
      console.error('News fetch error:', error)
      return { data: cache[cacheKey]?.data || [], loading: false, error: error.message }
    }
  }, [cache, isCacheValid, updateCache])

  // ========== CLEAR ALL CACHE ==========
  const clearCache = useCallback(() => {
    setCache({
      dashboard: { data: null, timestamp: null, loading: false },
      profile: { data: null, timestamp: null, loading: false },
      subscriptions: { data: null, timestamp: null, loading: false },
      payments: { data: null, timestamp: null, loading: false },
      notifications: { data: null, timestamp: null, loading: false },
      notificationCount: { data: 0, timestamp: null, loading: false },
      familyTree: { data: null, timestamp: null, loading: false },
      branches: { data: null, timestamp: null, loading: false },
      initiatives: { data: null, timestamp: null, loading: false },
      news: { data: null, timestamp: null, loading: false },
    })
  }, [])

  // ========== INVALIDATE SPECIFIC CACHE ==========
  const invalidateCache = useCallback((key) => {
    setCache(prev => ({
      ...prev,
      [key]: { ...prev[key], timestamp: null }
    }))
  }, [])

  // ========== GET CACHE STATUS ==========
  const getCacheStatus = useCallback((key) => {
    return {
      hasData: !!cache[key]?.data,
      isLoading: cache[key]?.loading || false,
      isFresh: isCacheValid(key),
      timestamp: cache[key]?.timestamp
    }
  }, [cache, isCacheValid])

  const value = {
    // Data access
    cache,
    
    // Fetch functions
    fetchDashboard,
    fetchProfile,
    fetchSubscriptions,
    fetchPayments,
    fetchNotifications,
    fetchNotificationCount,
    fetchFamilyTree,
    fetchBranches,
    fetchInitiatives,
    fetchNews,
    
    // Cache management
    clearCache,
    invalidateCache,
    getCacheStatus,
    isCacheValid,
  }

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  )
}

export default DataCacheContext
