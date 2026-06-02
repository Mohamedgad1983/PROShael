import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, CheckCheck, RefreshCw, WifiOff } from 'lucide-react'
import { useDataCache } from '../contexts/DataCacheContext'
import BottomNav from '../components/BottomNav'
import { notificationService } from '../services'

const Notifications = () => {
  const navigate = useNavigate()
  const { fetchNotifications, cache } = useDataCache()
  
  // Use cached data for initial state
  const [notifications, setNotifications] = useState(cache.notifications?.data || [])
  const [loading, setLoading] = useState(!cache.notifications?.data)
  const [refreshing, setRefreshing] = useState(false)
  const [isOfflineMode, setIsOfflineMode] = useState(false) // Track if showing demo data

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    }

    try {
      const result = await fetchNotifications(forceRefresh)
      
      if (result.data && result.data.length > 0) {
        const notifData = result.data
        
        const processedNotifications = Array.isArray(notifData) ? notifData.map(n => ({
          id: n.id,
          title: n.title_ar || n.title,
          body: n.message_ar || n.message || n.body,
          type: n.type || 'general',
          icon: getNotificationIcon(n.type),
          isRead: n.is_read || false,
          date: n.created_at,
          actionUrl: n.action_url,
          relatedId: n.related_id,
          relatedType: n.related_type
        })) : []
        
        setNotifications(processedNotifications)
        setIsOfflineMode(false)
        
        if (result.fromCache) {
          console.log('📦 Notifications loaded from cache')
        }
      } else {
        // No real data - use demo notifications
        setDemoNotifications()
        setIsOfflineMode(true)
      }
      
      if (result.error) {
        setDemoNotifications()
        setIsOfflineMode(true)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setDemoNotifications()
      setIsOfflineMode(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const setDemoNotifications = () => {
    // Only set demo data if we don't already have notifications
    if (notifications.length === 0) {
      setNotifications([
        {
          id: 1,
          title: 'تذكير بالاشتراك',
          body: 'يرجى سداد اشتراك شهر جمادى الأولى 1446هـ',
          type: 'payment',
          icon: '💳',
          isRead: false,
          date: new Date().toISOString()
        },
        {
          id: 2,
          title: 'مناسبة جديدة',
          body: 'تمت إضافة مناسبة زواج أحمد محمد الشعيل',
          type: 'event',
          icon: '🎉',
          isRead: false,
          date: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          title: 'تم استلام الدفعة',
          body: 'تم استلام مبلغ 50 ر.س - اشتراك ربيع الثاني',
          type: 'payment_success',
          icon: '✅',
          isRead: true,
          date: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: 4,
          title: 'إعلان هام',
          body: 'اجتماع العائلة السنوي يوم الجمعة القادم',
          type: 'announcement',
          icon: '📢',
          isRead: true,
          date: new Date(Date.now() - 604800000).toISOString()
        }
      ])
    }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      payment: '💳',
      payment_success: '✅',
      payment_reminder: '🔔',
      event: '🎉',
      announcement: '📢',
      news: '📰',
      initiative: '❤️',
      family_tree: '🌳',
      security: '🔒',
      system: '⚙️',
      general: '📌'
    }
    return icons[type] || icons.general
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMinutes = Math.floor((now - date) / (1000 * 60))
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffMinutes < 1) return 'الآن'
      if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`
      if (diffHours < 24) return `منذ ${diffHours} ساعة`
      if (diffDays === 1) return 'أمس'
      if (diffDays < 7) return `منذ ${diffDays} أيام`
      if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`
      
      return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    )
    
    // Try to update server (don't block UI)
    notificationService.markAsRead(notificationId).catch(() => {
      console.log('Could not sync read status with server')
    })
  }

  const handleMarkAllAsRead = async () => {
    // Optimistically update UI
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    
    // Try to update server (don't block UI)
    notificationService.markAllAsRead().catch(() => {
      console.log('Could not sync read status with server')
    })
  }

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }
    
    // Navigate based on type
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    } else if (notification.relatedType === 'news') {
      navigate(`/news/${notification.relatedId}`)
    } else if (notification.relatedType === 'initiative') {
      navigate('/initiatives')
    } else if (notification.type === 'payment' || notification.type === 'payment_reminder') {
      navigate('/payments')
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Only show loading on first load without cache
  if (loading && !cache.notifications?.data) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="page-header">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="back-button ml-3">
              <ArrowRight size={20} />
            </button>
            <h1 className="text-xl font-bold">الإشعارات</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="back-button ml-3">
              <ArrowRight size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">الإشعارات</h1>
              {unreadCount > 0 && (
                <p className="text-white/70 text-xs mt-1">{unreadCount} إشعار غير مقروء</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => loadNotifications(true)}
              className={`p-2 bg-white/20 rounded-full ${refreshing ? 'animate-spin' : ''}`}
              disabled={refreshing}
            >
              <RefreshCw size={18} className="text-white" />
            </button>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="p-2 bg-white/20 rounded-full"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck size={18} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Offline/Demo Mode Indicator - Small and non-intrusive */}
        {isOfflineMode && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mb-3 py-2">
            <WifiOff size={14} />
            <span>عرض الإشعارات المحفوظة</span>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`card animate-fadeIn cursor-pointer transition ${
                  !notification.isRead ? 'bg-primary-50 border-r-4 border-r-primary-500' : ''
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    !notification.isRead ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    {notification.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold text-sm ${
                        !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{notification.body}</p>
                    <span className="text-gray-400 text-xs mt-2 block">{formatDate(notification.date)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <Bell size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">لا توجد إشعارات</p>
              <p className="text-gray-400 text-sm">ستظهر الإشعارات الجديدة هنا</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav notificationCount={unreadCount} />
    </div>
  )
}

export default Notifications
