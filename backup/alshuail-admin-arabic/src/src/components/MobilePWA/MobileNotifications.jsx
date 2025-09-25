/**
 * MobileNotifications - Mobile-optimized notifications center
 * Features: Real-time notifications, read/unread states, categories, offline support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import VirtualScrollList from '../Common/VirtualScrollList';
import { NotificationSkeleton, SkeletonProvider } from '../Common/SkeletonLoaders';
import performanceMonitor, { trackUserAction, measureRender } from '../../utils/performanceMonitor';
import '../../styles/mobile-arabic.css';

const MobileNotifications = ({ user, isOnline = true, onLogout, device, viewport }) => {
  const { applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();

  // Component state
  const [notificationsState, setNotificationsState] = useState({
    notifications: [],
    loading: true,
    error: null,
    hasNextPage: true,
    filters: {
      category: 'all', // all, payments, activities, system, general
      status: 'all' // all, read, unread
    },
    searchQuery: ''
  });

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Performance monitoring
  const renderMonitor = useMemo(() => measureRender('MobileNotifications'), []);

  // Mock notifications data
  const mockNotifications = useMemo(() => [
    {
      id: 'notif_001',
      title_ar: 'تم استلام دفعة شهرية',
      title_en: 'Monthly payment received',
      message_ar: 'تم استلام دفعة الاشتراك الشهري بقيمة 3000 ريال بنجاح',
      message_en: 'Monthly subscription payment of 3000 SAR received successfully',
      category: 'payments',
      type: 'success',
      read: false,
      created_at: '2024-01-15T10:30:00Z',
      hijri_date: '١٤٤٥/٧/٥',
      action_url: '/payments',
      icon: '💰',
      priority: 'high'
    },
    {
      id: 'notif_002',
      title_ar: 'دعوة لفعالية جديدة',
      title_en: 'New event invitation',
      message_ar: 'تم دعوتك للمشاركة في رحلة العائلة السنوية. آخر موعد للتسجيل 20 يناير',
      message_en: 'You are invited to join the annual family trip. Registration deadline: January 20',
      category: 'activities',
      type: 'info',
      read: false,
      created_at: '2024-01-14T15:45:00Z',
      hijri_date: '١٤٤٥/٧/٤',
      action_url: '/activities',
      icon: '🎉',
      priority: 'medium'
    },
    {
      id: 'notif_003',
      title_ar: 'تحديث النظام',
      title_en: 'System update',
      message_ar: 'تم تحديث التطبيق لتحسين الأداء وإضافة ميزات جديدة',
      message_en: 'App updated with performance improvements and new features',
      category: 'system',
      type: 'info',
      read: true,
      created_at: '2024-01-13T09:00:00Z',
      hijri_date: '١٤٤٥/٧/٣',
      action_url: null,
      icon: '🔄',
      priority: 'low'
    },
    {
      id: 'notif_004',
      title_ar: 'تذكير بدفع الاشتراك',
      title_en: 'Subscription payment reminder',
      message_ar: 'موعد دفع اشتراك الشهر القادم: 1 فبراير 2024',
      message_en: 'Next month subscription due: February 1, 2024',
      category: 'payments',
      type: 'warning',
      read: false,
      created_at: '2024-01-12T12:00:00Z',
      hijri_date: '١٤٤٥/٧/٢',
      action_url: '/payments',
      icon: '⏰',
      priority: 'high'
    },
    {
      id: 'notif_005',
      title_ar: 'رسالة ترحيبية',
      title_en: 'Welcome message',
      message_ar: 'مرحباً بك في تطبيق آل شعيل! نتمنى لك تجربة ممتعة',
      message_en: 'Welcome to Al-Shuail app! We hope you enjoy your experience',
      category: 'general',
      type: 'info',
      read: true,
      created_at: '2024-01-10T08:00:00Z',
      hijri_date: '١٤٤٤/١٢/٣٠',
      action_url: null,
      icon: '👋',
      priority: 'low'
    }
  ], []);

  // Load notifications data
  const loadNotifications = useCallback(async (reset = false) => {
    if (!isOnline && reset) {
      // Load from cache when offline
      const cachedNotifications = localStorage.getItem('cached_notifications');
      if (cachedNotifications) {
        setNotificationsState(prev => ({
          ...prev,
          notifications: JSON.parse(cachedNotifications),
          loading: false
        }));
        return;
      }
    }

    try {
      setNotificationsState(prev => ({ ...prev, loading: reset ? true : prev.loading, error: null }));

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const filteredNotifications = mockNotifications.filter(notification => {
        // Apply filters
        if (notificationsState.filters.category !== 'all' && notification.category !== notificationsState.filters.category) {
          return false;
        }
        if (notificationsState.filters.status === 'read' && !notification.read) {
          return false;
        }
        if (notificationsState.filters.status === 'unread' && notification.read) {
          return false;
        }
        if (notificationsState.searchQuery && !notification.title_ar.includes(notificationsState.searchQuery)) {
          return false;
        }
        return true;
      });

      // Cache notifications for offline use
      if (isOnline) {
        localStorage.setItem('cached_notifications', JSON.stringify(filteredNotifications));
      }

      setNotificationsState(prev => ({
        ...prev,
        notifications: reset ? filteredNotifications : [...prev.notifications, ...filteredNotifications],
        loading: false,
        hasNextPage: false // No pagination for mock data
      }));

      trackUserAction('notifications-loaded', { count: filteredNotifications.length });

    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotificationsState(prev => ({
        ...prev,
        loading: false,
        error: 'فشل في تحميل البيانات'
      }));
    }
  }, [isOnline, mockNotifications, notificationsState.filters, notificationsState.searchQuery]);

  // Initialize component
  useEffect(() => {
    loadNotifications(true);
  }, []);

  // Convert timestamp to relative time
  const getRelativeTime = useCallback((timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    return time.toLocaleDateString('ar-SA');
  }, []);

  // Get notification type styling
  const getTypeStyle = useCallback((type) => {
    switch (type) {
      case 'success':
        return 'border-green-400 bg-green-500';
      case 'warning':
        return 'border-yellow-400 bg-yellow-500';
      case 'error':
        return 'border-red-400 bg-red-500';
      default:
        return 'border-blue-400 bg-blue-500';
    }
  }, []);

  // Get category name
  const getCategoryName = useCallback((category) => {
    switch (category) {
      case 'payments': return 'المدفوعات';
      case 'activities': return 'الأنشطة';
      case 'system': return 'النظام';
      case 'general': return 'عام';
      default: return 'غير محدد';
    }
  }, []);

  // Handle notification selection
  const handleNotificationSelect = useCallback(async (notification) => {
    setSelectedNotification(notification);
    trackUserAction('notification-select', { notificationId: notification.id });
    feedback('medium');

    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  }, [feedback]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Update local state immediately
      setNotificationsState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      }));

      trackUserAction('notification-read', { notificationId });

      // Simulate API call
      if (isOnline) {
        // TODO: Call actual API to mark as read
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [isOnline]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotificationsState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => ({ ...notif, read: true }))
      }));

      trackUserAction('notifications-mark-all-read');
      feedback('success');

      if (isOnline) {
        // TODO: Call actual API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [isOnline, feedback]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      setNotificationsState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(notif => notif.id !== notificationId)
      }));

      trackUserAction('notification-delete', { notificationId });
      feedback('success');

      if (isOnline) {
        // TODO: Call actual API
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [isOnline, feedback]);

  // Handle filter change
  const handleFilterChange = useCallback((filterType, value) => {
    setNotificationsState(prev => ({
      ...prev,
      filters: { ...prev.filters, [filterType]: value }
    }));

    trackUserAction('notifications-filter', { filterType, value });
    feedback('light');
  }, [feedback]);

  // Render notification item
  const renderNotificationItem = useCallback((notification, index, { isScrolling }) => (
    <div
      className={`glass-card mb-3 transition-all duration-200 ${
        isScrolling ? 'opacity-80' : 'opacity-100'
      } ${!notification.read ? 'border-l-4 border-accent' : ''}`}
      onClick={() => handleNotificationSelect(notification)}
    >
      <div className="flex items-start gap-3">
        {/* Icon and status */}
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${getTypeStyle(notification.type)} bg-opacity-20`}>
            {notification.icon}
          </div>
          {!notification.read && (
            <div className="w-2 h-2 bg-accent rounded-full mx-auto mt-1"></div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className={`font-semibold text-sm ${notification.read ? 'text-slate-300' : 'text-white'}`}>
              {notification.title_ar}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2 py-1 rounded-full text-xs ${getTypeStyle(notification.type)} bg-opacity-20 text-white`}>
                {getCategoryName(notification.category)}
              </span>
              <button
                className="w-6 h-6 rounded-full bg-red-500 bg-opacity-20 text-red-400 flex items-center justify-center text-xs hover:bg-opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                ×
              </button>
            </div>
          </div>

          <p className={`text-sm mb-3 line-clamp-2 ${notification.read ? 'text-slate-400' : 'text-slate-300'}`}>
            {notification.message_ar}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{getRelativeTime(notification.created_at)}</span>
            <span>{notification.hijri_date}</span>
          </div>
        </div>
      </div>
    </div>
  ), [handleNotificationSelect, getTypeStyle, getCategoryName, getRelativeTime, deleteNotification]);

  // Calculate unread count
  const unreadCount = useMemo(() =>
    notificationsState.notifications.filter(n => !n.read).length,
    [notificationsState.notifications]
  );

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, payments: 0, activities: 0, system: 0, general: 0 };
    notificationsState.notifications.forEach(notif => {
      counts.all++;
      counts[notif.category]++;
    });
    return counts;
  }, [notificationsState.notifications]);

  // Cleanup performance monitor
  useEffect(() => {
    return () => {
      if (renderMonitor) {
        renderMonitor.end();
      }
    };
  }, [renderMonitor]);

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">
      {/* Safe area container */}
      <div className="safe-area-container pb-20">

        {/* Header */}
        <header
          className="glass-nav sticky top-0 z-40"
          style={applySafeArea(['top'])}
        >
          <div className="container py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-white">الإشعارات</h1>
                <p className="text-slate-300 text-sm">
                  {unreadCount > 0 && `${unreadCount} إشعار غير مقروء`}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  className="px-4 py-2 bg-accent bg-opacity-20 text-accent rounded-lg text-sm font-medium border border-accent border-opacity-30"
                  onClick={markAllAsRead}
                >
                  قراءة الكل
                </button>
              )}
            </div>

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'payments', label: 'المدفوعات' },
                { id: 'activities', label: 'الأنشطة' },
                { id: 'system', label: 'النظام' },
                { id: 'general', label: 'عام' }
              ].map(category => (
                <button
                  key={category.id}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-white bg-opacity-20 text-white border border-white border-opacity-30'
                      : 'text-slate-300 hover:text-white bg-black bg-opacity-20'
                  }`}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    handleFilterChange('category', category.id);
                  }}
                >
                  {category.label}
                  {categoryCounts[category.id] > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-accent rounded-full text-xs">
                      {categoryCounts[category.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-6">

          {/* Search */}
          <div className="glass-card mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="البحث في الإشعارات..."
                className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-400 focus:border-accent focus:ring-1 focus:ring-accent"
                value={notificationsState.searchQuery}
                onChange={(e) => {
                  setNotificationsState(prev => ({ ...prev, searchQuery: e.target.value }));
                }}
              />
              <svg className="absolute right-3 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex gap-2 mt-3">
              <select
                className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white text-sm"
                value={notificationsState.filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">جميع الحالات</option>
                <option value="unread">غير مقروء</option>
                <option value="read">مقروء</option>
              </select>
            </div>
          </div>

          {/* Notifications list */}
          <SkeletonProvider
            loading={notificationsState.loading}
            skeleton={<NotificationSkeleton count={5} />}
          >
            <VirtualScrollList
              items={notificationsState.notifications}
              itemHeight={120}
              containerHeight={viewport.height - 350}
              renderItem={renderNotificationItem}
              onLoadMore={() => loadNotifications(false)}
              hasNextPage={notificationsState.hasNextPage}
              loading={notificationsState.loading}
              threshold={0.2}
              className="notifications-list"
              direction="rtl"
              getItemKey={(item) => item.id}
              emptyComponent={() => (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                    🔔
                  </div>
                  <h3 className="text-white font-semibold mb-2">لا توجد إشعارات</h3>
                  <p className="text-slate-400 text-sm">ستظهر الإشعارات الجديدة هنا</p>
                </div>
              )}
            />
          </SkeletonProvider>

          {notificationsState.error && (
            <div className="glass-card border border-red-500 border-opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 text-red-400">⚠️</div>
                <div>
                  <p className="text-red-400 font-medium">{notificationsState.error}</p>
                  <button
                    className="text-accent text-sm hover:underline mt-1"
                    onClick={() => loadNotifications(true)}
                  >
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>

      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-24 left-4 right-4 glass-card border border-yellow-500 border-opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <p className="text-yellow-400 text-sm">وضع عدم الاتصال - البيانات المحفوظة محلياً</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNotifications;