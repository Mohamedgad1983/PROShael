/**
 * Firebase Configuration for Al-Shuail Mobile PWA
 * Push Notifications using Firebase Cloud Messaging (FCM)
 */

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDV_8GEXglt-rnftvs37GaTKGKbUIth5yA",
  authDomain: "i-o-s-shaael-gqra2n-ef788.firebaseapp.com",
  projectId: "i-o-s-shaael-gqra2n-ef788",
  storageBucket: "i-o-s-shaael-gqra2n-ef788.firebasestorage.app",
  messagingSenderId: "384257332256",
  appId: "1:384257332256:web:11d2543409f62f655ad845"
};

// VAPID Key for Web Push
const VAPID_KEY = 'BFOJB7exHm1YgARigl7e85CMVkkZJnAEgoM7oHVdFefgjZGYdO8a4tsstug1jJ7TwiXpCtm5pdrCsPD6Eriv0S4';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://api.alshailfund.com';

class PushNotificationManager {
  constructor() {
    this.messaging = null;
    this.token = null;
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Initialize Firebase and request notification permission
   */
  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      // Dynamically import Firebase
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
      const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      this.messaging = getMessaging(app);

      // Setup message handler
      onMessage(this.messaging, (payload) => {
        console.log('📩 Message received:', payload);
        this.showNotification(payload);
      });

      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermission() {
    if (!this.isSupported) {
      return { success: false, error: 'Not supported' };
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        return { success: false, error: 'Permission denied' };
      }

      // Get FCM token
      const { getToken } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');
      
      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        this.token = token;
        console.log('✅ FCM Token:', token);
        
        // Register token with backend
        await this.registerToken(token);
        
        return { success: true, token };
      } else {
        return { success: false, error: 'No token received' };
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register FCM token with backend
   */
  async registerToken(token) {
    try {
      const memberId = localStorage.getItem('memberId');
      
      const response = await fetch(`${API_URL}/api/notifications/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          token,
          memberId,
          platform: 'web'
        })
      });

      const result = await response.json();
      console.log('Token registration result:', result);
      return result;
    } catch (error) {
      console.error('Token registration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Show notification when app is in foreground
   */
  showNotification(payload) {
    const { title, body, icon } = payload.notification || {};
    const data = payload.data || {};

    // Show in-app notification
    this.showInAppNotification({
      title: title || 'إشعار جديد',
      body: body || '',
      icon: icon || '/icons/icon-192.png',
      onClick: () => {
        if (data.click_action) {
          window.location.href = data.click_action;
        }
      }
    });

    // Also show browser notification if page is not visible
    if (document.hidden && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200]
      });
    }
  }

  /**
   * Show in-app notification toast
   */
  showInAppNotification({ title, body, icon, onClick }) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'push-notification-toast';
    notification.innerHTML = `
      <div class="notification-content">
        <img src="${icon}" alt="icon" class="notification-icon">
        <div class="notification-text">
          <div class="notification-title">${title}</div>
          <div class="notification-body">${body}</div>
        </div>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add styles if not exists
    if (!document.getElementById('push-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'push-notification-styles';
      styles.textContent = `
        .push-notification-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          left: 20px;
          max-width: 400px;
          margin: 0 auto;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
          cursor: pointer;
        }
        .notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .notification-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
        }
        .notification-text {
          flex: 1;
        }
        .notification-title {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 4px;
        }
        .notification-body {
          font-size: 14px;
          opacity: 0.9;
        }
        .notification-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .notification-close:hover {
          opacity: 1;
        }
        @keyframes slideIn {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Click handler
    notification.addEventListener('click', (e) => {
      if (!e.target.classList.contains('notification-close')) {
        onClick?.();
      }
      notification.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  /**
   * Unregister device token
   */
  async unregisterToken() {
    if (!this.token) return;

    try {
      await fetch(`${API_URL}/api/notifications/push/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ token: this.token })
      });

      this.token = null;
      console.log('Token unregistered');
    } catch (error) {
      console.error('Token unregister error:', error);
    }
  }
}

// Export singleton instance
const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;
