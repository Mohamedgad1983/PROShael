/**
 * Real-time Notification Service for Al-Shuail Family Management System
 * Features: Push notifications, WebSocket integration, background sync, Arabic RTL support
 */
import { logger } from '../utils/logger';


class NotificationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.permissionGranted = false;
    this.registration = null;
    this.notificationQueue = [];
    this.retryCount = 0;
    this.maxRetries = 5;
    this.reconnectTimeout = null;

    // Initialize service
    this.init();
  }

  /**
   * Initialize notification service
   */
  async init() {
    try {
      // Check for service worker support
      if ('serviceWorker' in navigator) {
        await this.registerServiceWorker();
      }

      // Request notification permission
      await this.requestPermission();

      // Initialize WebSocket connection
      this.initializeWebSocket();

      // Setup background sync for offline scenarios
      this.setupBackgroundSync();

      logger.debug('🔔 Notification service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize notification service:', { error });
    }
  }

  /**
   * Register service worker for background notifications
   */
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.registration = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, show update notification
              this.showLocalNotification('تحديث متاح', {
                body: 'يوجد تحديث جديد للتطبيق، أعد تحميل الصفحة للاستفادة من أحدث المميزات',
                icon: '/icons/icon-192.png',
                tag: 'app-update',
                actions: [
                  { action: 'update', title: 'تحديث الآن' },
                  { action: 'dismiss', title: 'لاحقاً' }
                ]
              });
            }
          });
        }
      });

      logger.debug('✅ Service worker registered successfully');
      return registration;
    } catch (error) {
      logger.error('❌ Service worker registration failed:', { error });
      throw error;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      logger.warn('⚠️ This browser does not support notifications');
      return false;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    this.permissionGranted = permission === 'granted';

    if (!this.permissionGranted) {
      logger.warn('⚠️ Notification permission denied');
      return false;
    }

    logger.debug('✅ Notification permission granted');
    return true;
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  initializeWebSocket() {
    const token = localStorage.getItem('token');
    if (!token) {
      logger.warn('⚠️ No auth token found, WebSocket connection delayed');
      return;
    }

    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
      this.socket = new WebSocket(`${wsUrl}?token=${token}`);

      this.socket.onopen = () => {
        logger.debug('🌐 WebSocket connected');
        this.isConnected = true;
        this.retryCount = 0;

        // Send initial handshake
        this.socket.send(JSON.stringify({
          type: 'handshake',
          userId: this.getUserId(),
          timestamp: new Date().toISOString()
        }));
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          logger.error('❌ Error parsing WebSocket message:', { error });
        }
      };

      this.socket.onclose = (event) => {
        logger.debug('🔌 WebSocket disconnected:', { code: event.code });
        this.isConnected = false;
        this.handleReconnection();
      };

      this.socket.onerror = (error) => {
        logger.error('❌ WebSocket error:', { error });
        this.isConnected = false;
      };

    } catch (error) {
      logger.error('❌ Failed to initialize WebSocket:', { error });
      this.handleReconnection();
    }
  }

  /**
   * Handle WebSocket reconnection with exponential backoff
   */
  handleReconnection() {
    if (this.retryCount >= this.maxRetries) {
      logger.error('❌ Max reconnection attempts reached');
      return;
    }

    const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
    this.retryCount++;

    logger.debug(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.retryCount});`);

    this.reconnectTimeout = setTimeout(() => {
      this.initializeWebSocket();
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'balance-update':
        this.handleBalanceUpdate(data);
        break;
      case 'new-occasion':
        this.handleNewOccasion(data);
        break;
      case 'new-initiative':
        this.handleNewInitiative(data);
        break;
      case 'new-diya':
        this.handleNewDiya(data);
        break;
      case 'payment-reminder':
        this.handlePaymentReminder(data);
        break;
      case 'family-announcement':
        this.handleFamilyAnnouncement(data);
        break;
      default:
        logger.debug('📨 Received unknown message type:', { type: data.type });
    }
  }

  /**
   * Handle balance update notifications
   */
  handleBalanceUpdate(data) {
    const title = 'تحديث الرصيد';
    const body = `تم تحديث رصيدك إلى ${this.toArabicNumerals(data.newBalance)} ر.س`;

    this.showNotification(title, {
      body,
      icon: '/icons/wallet-icon.png',
      tag: 'balance-update',
      data: { type: 'balance', amount: data.newBalance },
      actions: [
        { action: 'view-balance', title: 'عرض الرصيد' },
        { action: 'payment-history', title: 'تاريخ المدفوعات' }
      ]
    });

    // Update local storage for offline access
    localStorage.setItem('lastBalance', data.newBalance.toString());

    // Trigger UI update event
    window.dispatchEvent(new CustomEvent('balanceUpdated', {
      detail: { balance: data.newBalance }
    }));
  }

  /**
   * Handle new occasion notifications
   */
  handleNewOccasion(data) {
    const title = `مناسبة جديدة: ${data.occasionType}`;
    const body = `${data.title} - ${data.date}`;

    this.showNotification(title, {
      body,
      icon: '/icons/occasion-icon.png',
      tag: `occasion-${data.id}`,
      data: { type: 'occasion', id: data.id },
      actions: [
        { action: 'view-details', title: 'عرض التفاصيل' },
        { action: 'rsvp', title: 'تأكيد الحضور' }
      ],
      vibrate: [200, 100, 200] // Custom vibration pattern
    });
  }

  /**
   * Handle new initiative notifications
   */
  handleNewInitiative(data) {
    const title = `مبادرة خيرية جديدة`;
    const body = `${data.title} - الهدف: ${this.toArabicNumerals(data.targetAmount)} ر.س`;

    this.showNotification(title, {
      body,
      icon: '/icons/charity-icon.png',
      tag: `initiative-${data.id}`,
      data: { type: 'initiative', id: data.id },
      actions: [
        { action: 'donate', title: 'تبرع الآن' },
        { action: 'share', title: 'مشاركة' }
      ]
    });
  }

  /**
   * Handle new diya notifications
   */
  handleNewDiya(data) {
    const title = 'دية جديدة';
    const body = `${data.description} - المطلوب: ${this.toArabicNumerals(data.targetAmount)} ر.س`;

    this.showNotification(title, {
      body,
      icon: '/icons/diya-icon.png',
      tag: `diya-${data.id}`,
      data: { type: 'diya', id: data.id },
      actions: [
        { action: 'contribute', title: 'مساهمة' },
        { action: 'view-details', title: 'التفاصيل' }
      ],
      requireInteraction: true // Keep notification visible until user interacts
    });
  }

  /**
   * Handle payment reminder notifications
   */
  handlePaymentReminder(data) {
    const title = 'تذكير بالدفع';
    const body = `حان موعد دفع الاشتراك الشهري - ${this.toArabicNumerals(data.amount)} ر.س`;

    this.showNotification(title, {
      body,
      icon: '/icons/reminder-icon.png',
      tag: 'payment-reminder',
      data: { type: 'payment-reminder', amount: data.amount },
      actions: [
        { action: 'pay-now', title: 'ادفع الآن' },
        { action: 'remind-later', title: 'تذكير لاحقاً' }
      ]
    });
  }

  /**
   * Handle family announcement notifications
   */
  handleFamilyAnnouncement(data) {
    const title = 'إعلان عائلي';
    const body = data.message;

    this.showNotification(title, {
      body,
      icon: '/icons/family-icon.png',
      tag: `announcement-${data.id}`,
      data: { type: 'announcement', id: data.id },
      actions: [
        { action: 'read-more', title: 'قراءة المزيد' }
      ]
    });
  }

  /**
   * Show notification (handles both local and service worker notifications)
   */
  async showNotification(title, options = {}) {
    if (!this.permissionGranted) {
      logger.warn('⚠️ Cannot show notification: permission not granted');
      return;
    }

    const defaultOptions = {
      dir: 'rtl',
      lang: 'ar',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      timestamp: Date.now(),
      ...options
    };

    try {
      if (this.registration && 'showNotification' in this.registration) {
        // Use service worker notification (works when app is in background/closed)
        await this.registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to local notification
        this.showLocalNotification(title, defaultOptions);
      }

      // Add to notification history
      this.addToNotificationHistory(title, defaultOptions);

    } catch (error) {
      logger.error('❌ Failed to show notification:', { error });
      // Queue for retry
      this.queueNotification(title, defaultOptions);
    }
  }

  /**
   * Show local notification (fallback)
   */
  showLocalNotification(title, options) {
    const notification = new Notification(title, options);

    notification.onclick = () => {
      this.handleNotificationClick(options.data || {});
      notification.close();
    };

    // Auto-close after 10 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    return notification;
  }

  /**
   * Handle notification click events
   */
  handleNotificationClick(data) {
    // Focus the app window
    if (window.focus) {
      window.focus();
    }

    // Navigate based on notification type
    switch (data.type) {
      case 'balance':
        window.location.hash = '#/member/balance';
        break;
      case 'occasion':
        window.location.hash = `#/member/occasions/${data.id}`;
        break;
      case 'initiative':
        window.location.hash = `#/member/initiatives/${data.id}`;
        break;
      case 'diya':
        window.location.hash = `#/member/diyas/${data.id}`;
        break;
      default:
        window.location.hash = '#/member/notifications';
    }

    // Trigger notification click event
    window.dispatchEvent(new CustomEvent('notificationClicked', {
      detail: data
    }));
  }

  /**
   * Setup background sync for offline scenarios
   */
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        // Register background sync for queued notifications
        registration.sync.register('sync-notifications');
        logger.debug('✅ Background sync registered');
      });
    }
  }

  /**
   * Queue notification for retry when online
   */
  queueNotification(title, options) {
    this.notificationQueue.push({ title, options, timestamp: Date.now() });

    // Store in localStorage for persistence
    localStorage.setItem('pendingNotifications', JSON.stringify(this.notificationQueue));
  }

  /**
   * Process queued notifications when back online
   */
  async processQueuedNotifications() {
    const queued = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');

    for (const notification of queued) {
      try {
        await this.showNotification(notification.title, notification.options);
      } catch (error) {
        logger.error('❌ Failed to process queued notification:', { error });
      }
    }

    // Clear the queue
    this.notificationQueue = [];
    localStorage.removeItem('pendingNotifications');
  }

  /**
   * Add notification to history for notification center
   */
  addToNotificationHistory(title, options) {
    const historyKey = 'notificationHistory';
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    const notification = {
      id: Date.now(),
      title,
      body: options.body,
      type: options.data?.type || 'general',
      timestamp: Date.now(),
      isRead: false,
      icon: options.icon,
      data: options.data
    };

    history.unshift(notification);

    // Keep only last 50 notifications
    if (history.length > 50) {
      history.splice(50);
    }

    localStorage.setItem(historyKey, JSON.stringify(history));

    // Update notification count
    this.updateNotificationBadge();
  }

  /**
   * Update notification badge count
   */
  updateNotificationBadge() {
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    const unreadCount = history.filter(n => !n.isRead).length;

    // Update app badge if supported
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(unreadCount);
    }

    // Trigger badge update event
    window.dispatchEvent(new CustomEvent('badgeUpdated', {
      detail: { count: unreadCount }
    }));
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    const historyKey = 'notificationHistory';
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    const notification = history.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      localStorage.setItem(historyKey, JSON.stringify(history));
      this.updateNotificationBadge();
    }
  }

  /**
   * Get notification history for notification center
   */
  getNotificationHistory(filter = 'all') {
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');

    if (filter === 'all') {
      return history;
    }

    return history.filter(n => n.type === filter);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    localStorage.removeItem('notificationHistory');
    this.updateNotificationBadge();
  }

  /**
   * Convert numbers to Arabic numerals
   */
  toArabicNumerals(num) {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  }

  /**
   * Get current user ID from token
   */
  getUserId() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id;
    } catch (error) {
      logger.error('❌ Error parsing user ID from token:', { error });
      return null;
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnected = false;
    logger.debug('🔌 Notification service disconnected');
  }

  /**
   * Reconnect WebSocket
   */
  reconnect() {
    this.disconnect();
    this.retryCount = 0;
    this.initializeWebSocket();
  }

  /**
   * Check if notifications are supported and enabled
   */
  isNotificationSupported() {
    return 'Notification' in window && this.permissionGranted;
  }

  /**
   * Check WebSocket connection status
   */
  isConnectedToWebSocket() {
    return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;