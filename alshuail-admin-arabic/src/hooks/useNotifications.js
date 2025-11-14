/**
 * useNotifications Hook - React hook for notification state management
 * Features: Real-time updates, badge counting, permission management, offline support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';

import { logger } from '../utils/logger';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState('default');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Refs for cleanup
  const eventListenersRef = useRef([]);
  const intervalRef = useRef(null);

  // Load initial notifications from localStorage
  const loadNotifications = useCallback(() => {
    try {
      const history = notificationService.getNotificationHistory();
      setNotifications(history);

      const unread = history.filter(n => !n.isRead).length;
      setUnreadCount(unread);

      setLastUpdateTime(new Date());
      setIsLoading(false);
    } catch (error) {
      logger.error('❌ Error loading notifications:', { error });
      setIsLoading(false);
    }
  }, []);

  // Check permission status
  const checkPermission = useCallback(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check connection status
  const checkConnectionStatus = useCallback(() => {
    setIsConnected(notificationService.isConnectedToWebSocket());
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      const granted = await notificationService.requestPermission();
      setPermission(granted ? 'granted' : 'denied');
      return granted;
    } catch (error) {
      logger.error('❌ Error requesting permission:', { error });
      return false;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    notificationService.markAsRead(notificationId);

    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );

    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    const unreadNotifications = notifications.filter(n => !n.isRead);

    unreadNotifications.forEach(notification => {
      notificationService.markAsRead(notification.id);
    });

    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );

    setUnreadCount(0);
  }, [notifications]);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );

    // Update localStorage
    const history = notificationService.getNotificationHistory();
    const updatedHistory = history.filter(n => n.id !== notificationId);
    localStorage.setItem('notificationHistory', JSON.stringify(updatedHistory));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    notificationService.clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Get unread notifications
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(notification => !notification.isRead);
  }, [notifications]);

  // Add new notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: Date.now(),
      isRead: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep max 50
    setUnreadCount(prev => prev + 1);

    // Update localStorage
    notificationService.addToNotificationHistory(notification.title, {
      body: notification.body,
      data: notification.data || {}
    });
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    notificationService.reconnect();
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  // Sync with server
  const syncNotifications = useCallback(async () => {
    try {
      setIsLoading(true);

      // In a real app, this would fetch from server
      // For now, we'll just reload from localStorage
      loadNotifications();

      setLastUpdateTime(new Date());
    } catch (error) {
      logger.error('❌ Error syncing notifications:', { error });
    } finally {
      setIsLoading(false);
    }
  }, [loadNotifications]);

  // Setup event listeners
  useEffect(() => {
    const setupEventListeners = () => {
      // Listen for balance updates
      const handleBalanceUpdate = (event) => {
        addNotification({
          title: 'تحديث الرصيد',
          body: `تم تحديث رصيدك إلى ${event.detail.balance} ر.س`,
          type: 'balance',
          data: { amount: event.detail.balance }
        });
      };

      // Listen for notification clicks
      const handleNotificationClick = (event) => {
        const notification = notifications.find(n =>
          n.data && n.data.id === event.detail.id
        );
        if (notification && !notification.isRead) {
          markAsRead(notification.id);
        }
      };

      // Listen for badge updates
      const handleBadgeUpdate = (event) => {
        setUnreadCount(event.detail.count);
      };

      // Listen for connection status changes
      const handleOnline = () => {
        notificationService.reconnect();
        checkConnectionStatus();
        syncNotifications();
      };

      const handleOffline = () => {
        setIsConnected(false);
      };

      // Listen for visibility changes to sync when app becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          loadNotifications();
          checkConnectionStatus();
        }
      };

      // Add event listeners
      const listeners = [
        { target: window, event: 'balanceUpdated', handler: handleBalanceUpdate },
        { target: window, event: 'notificationClicked', handler: handleNotificationClick },
        { target: window, event: 'badgeUpdated', handler: handleBadgeUpdate },
        { target: window, event: 'online', handler: handleOnline },
        { target: window, event: 'offline', handler: handleOffline },
        { target: document, event: 'visibilitychange', handler: handleVisibilityChange }
      ];

      listeners.forEach(({ target, event, handler }) => {
        target.addEventListener(event, handler);
      });

      eventListenersRef.current = listeners;
    };

    setupEventListeners();

    // Cleanup function
    return () => {
      eventListenersRef.current.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
    };
  }, [addNotification, markAsRead, checkConnectionStatus, syncNotifications, loadNotifications, notifications]);

  // Initialize and setup periodic checks
  useEffect(() => {
    // Initial setup
    loadNotifications();
    checkPermission();
    checkConnectionStatus();

    // Periodic checks every 2 minutes for stability
    intervalRef.current = setInterval(() => {
      checkConnectionStatus();

      // Auto-sync if connected and hasn't synced in 5 minutes
      if (lastUpdateTime && Date.now() - lastUpdateTime.getTime() > 5 * 60 * 1000) {
        syncNotifications();
      }
    }, 120000); // 2 minutes instead of 30 seconds

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadNotifications, checkPermission, checkConnectionStatus, syncNotifications, lastUpdateTime]);

  // Monitor permission changes
  useEffect(() => {
    const handlePermissionChange = () => {
      checkPermission();
    };

    // Some browsers support this
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' }).then(permission => {
        permission.onchange = handlePermissionChange;
      });
    }

    return () => {
      // Cleanup if permission object exists
    };
  }, [checkPermission]);

  // Analytics and insights
  const getNotificationStats = useCallback(() => {
    const now = new Date();
    const last24Hours = now.getTime() - (24 * 60 * 60 * 1000);
    const lastWeek = now.getTime() - (7 * 24 * 60 * 60 * 1000);

    const recent = notifications.filter(n => n.timestamp >= last24Hours);
    const weekly = notifications.filter(n => n.timestamp >= lastWeek);

    const typeStats = notifications.reduce((stats, notification) => {
      stats[notification.type] = (stats[notification.type] || 0) + 1;
      return stats;
    }, {});

    return {
      total: notifications.length,
      unread: unreadCount,
      recent24h: recent.length,
      lastWeek: weekly.length,
      typeBreakdown: typeStats,
      readRate: notifications.length > 0 ?
        ((notifications.length - unreadCount) / notifications.length * 100).toFixed(1) : 0
    };
  }, [notifications, unreadCount]);

  // Export notification data
  const exportNotifications = useCallback((format = 'json') => {
    const data = {
      notifications,
      stats: getNotificationStats(),
      exportDate: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      const csv = [
        'ID,Title,Body,Type,Timestamp,IsRead',
        ...notifications.map(n =>
          `${n.id},"${n.title}","${n.body || ''}",${n.type},${new Date(n.timestamp).toISOString()},${n.isRead}`
        )
      ].join('\n');
      return csv;
    }

    return data;
  }, [notifications, getNotificationStats]);

  return {
    // State
    notifications,
    unreadCount,
    permission,
    isConnected,
    isLoading,
    lastUpdateTime,

    // Actions
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    requestPermission,
    reconnect,
    syncNotifications,
    addNotification,

    // Getters
    getNotificationsByType,
    getUnreadNotifications,
    getNotificationStats,
    exportNotifications,

    // Status checks
    hasPermission: permission === 'granted',
    canShowNotifications: permission === 'granted' && isConnected,
    needsPermission: permission === 'default',
    permissionDenied: permission === 'denied'
  };
};

export { useNotifications };