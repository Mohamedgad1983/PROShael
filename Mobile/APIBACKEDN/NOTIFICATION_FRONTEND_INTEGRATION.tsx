// ===============================================
// FRONTEND INTEGRATION - Dashboard.tsx Updates
// File: alshuail-admin-arabic/src/pages/mobile/Dashboard.tsx
// ===============================================

// ADD THESE IMPORTS AT THE TOP
import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

// ADD THIS API CONFIGURATION
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://proshael.onrender.com';

// ===============================================
// REPLACE THE SAMPLE NOTIFICATIONS STATE WITH THIS:
// ===============================================

const [notifications, setNotifications] = useState({
  news: [],
  initiatives: [],
  diyas: [],
  occasions: [],
  statements: []
});

const [notificationLoading, setNotificationLoading] = useState(false);
const [notificationError, setNotificationError] = useState(null);
const [unreadCount, setUnreadCount] = useState(0);

// ===============================================
// ADD THIS FUNCTION TO FETCH NOTIFICATIONS
// ===============================================

const fetchNotifications = async () => {
  try {
    setNotificationLoading(true);
    setNotificationError(null);

    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('[Notifications] No token found, using sample data');
      loadSampleNotifications(); // Fallback to sample data
      return;
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/member/notifications`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.data.success) {
      const { notifications: notifData, unreadCount: count } = response.data.data;
      
      console.log('[Notifications] Fetched:', notifData);
      console.log('[Notifications] Unread count:', count);

      // Update state with real data
      setNotifications(notifData);
      setUnreadCount(count);
    } else {
      throw new Error('Failed to fetch notifications');
    }

  } catch (error) {
    console.error('[Notifications] Fetch error:', error);
    setNotificationError(error.message);
    
    // Fallback to sample data on error
    loadSampleNotifications();
  } finally {
    setNotificationLoading(false);
  }
};

// ===============================================
// SAMPLE DATA FALLBACK (keep existing function)
// ===============================================

const loadSampleNotifications = () => {
  setNotifications({
    news: [
      {
        id: 'sample-1',
        title: 'إعلان هام من إدارة الصندوق',
        body: 'يسر إدارة صندوق عائلة الشعيل أن تعلن عن موعد الاجتماع السنوي العام',
        time: 'منذ ساعتين',
        icon: '📰',
        priority: 'high',
        category: 'news'
      }
    ],
    initiatives: [
      {
        id: 'sample-2',
        title: 'مبادرة خيرية جديدة',
        body: 'تم إطلاق مبادرة لمساعدة الأسر المتعففة. المساهمة متاحة للجميع',
        time: 'منذ 3 ساعات',
        icon: '🤝',
        priority: 'normal',
        category: 'initiatives'
      }
    ],
    diyas: [
      {
        id: 'sample-3',
        title: 'حالة دية عاجلة',
        body: 'تحتاج إلى مساهمة عاجلة لدعم حالة دية. المبلغ المطلوب: 50,000 ريال',
        time: 'منذ 5 ساعات',
        icon: '⚖️',
        priority: 'high',
        category: 'diyas'
      }
    ],
    occasions: [
      {
        id: 'sample-4',
        title: 'مناسبة عائلية',
        body: 'دعوة لحضور حفل زفاف أحد أفراد العائلة يوم الجمعة القادم',
        time: 'منذ يوم',
        icon: '🎉',
        priority: 'normal',
        category: 'occasions'
      }
    ],
    statements: [
      {
        id: 'sample-5',
        title: 'كشف الحساب الشهري',
        body: 'تم رفع كشف الحساب لشهر أكتوبر. يمكنك الاطلاع عليه الآن',
        time: 'منذ يومين',
        icon: '📊',
        priority: 'normal',
        category: 'statements'
      }
    ]
  });
  setUnreadCount(5);
};

// ===============================================
// ADD THIS useEffect TO FETCH ON MOUNT
// ===============================================

useEffect(() => {
  // Fetch notifications when component mounts
  fetchNotifications();

  // Optional: Refresh every 2 minutes
  const intervalId = setInterval(() => {
    fetchNotifications();
  }, 120000); // 2 minutes

  return () => clearInterval(intervalId);
}, []);

// ===============================================
// ADD FUNCTION TO MARK AS READ
// ===============================================

const markNotificationAsRead = async (notificationId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) return;

    await axios.put(
      `${API_BASE_URL}/api/member/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Update local state
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Optionally refresh notifications
    fetchNotifications();

  } catch (error) {
    console.error('[Notifications] Mark read error:', error);
  }
};

// ===============================================
// ADD FUNCTION TO MARK ALL AS READ
// ===============================================

const markAllNotificationsAsRead = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) return;

    await axios.put(
      `${API_BASE_URL}/api/member/notifications/read-all`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Update local state
    setUnreadCount(0);
    
    // Refresh notifications
    fetchNotifications();

  } catch (error) {
    console.error('[Notifications] Mark all read error:', error);
  }
};

// ===============================================
// UPDATE THE NOTIFICATION DROPDOWN JSX
// ===============================================

// Find the notification dropdown section and UPDATE the onClick handlers:

{allNotifications.map((notif, index) => (
  <div 
    key={notif.id} 
    className={`notification-card ${notif.priority === 'high' ? 'priority-high' : ''}`}
    onClick={() => {
      // Mark as read when clicked
      if (!notif.isRead) {
        markNotificationAsRead(notif.id);
      }
      
      // Navigate if action URL exists
      if (notif.actionUrl) {
        navigate(notif.actionUrl);
      }
      
      // Close dropdown
      setShowNotifications(false);
    }}
    style={{ cursor: 'pointer' }}
  >
    <div className="notification-icon">{notif.icon}</div>
    <div className="notification-content">
      <div className="notification-title">
        {notif.title}
        {!notif.isRead && <span className="unread-indicator">●</span>}
      </div>
      <div className="notification-body">{notif.body}</div>
      <div className="notification-time">{notif.time}</div>
    </div>
  </div>
))}

// ===============================================
// ADD "MARK ALL AS READ" BUTTON IN DROPDOWN
// ===============================================

// Add this button in the dropdown footer (before "View All Notifications"):

{unreadCount > 0 && (
  <button
    className="mark-all-read-btn"
    onClick={(e) => {
      e.stopPropagation();
      markAllNotificationsAsRead();
    }}
  >
    تحديد الكل كمقروء ({unreadCount})
  </button>
)}

// ===============================================
// ADD LOADING STATE IN DROPDOWN
// ===============================================

// Add this at the top of the dropdown content:

{notificationLoading && (
  <div className="notification-loading">
    <div className="spinner"></div>
    <p>جاري تحميل الإشعارات...</p>
  </div>
)}

{notificationError && (
  <div className="notification-error">
    <p>⚠️ فشل في تحميل الإشعارات</p>
    <button onClick={() => fetchNotifications()}>إعادة المحاولة</button>
  </div>
)}

// ===============================================
// ADD CSS FOR NEW ELEMENTS
// ===============================================

/* Add to Dashboard.css */

.unread-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #007AFF;
  border-radius: 50%;
  margin-right: 6px;
}

.mark-all-read-btn {
  width: 100%;
  padding: 10px;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  color: #007AFF;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 8px;
}

.mark-all-read-btn:hover {
  background: #e0e0e0;
}

.notification-loading {
  text-align: center;
  padding: 30px;
  color: #666;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007AFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.notification-error {
  text-align: center;
  padding: 20px;
  color: #ff3b30;
}

.notification-error button {
  margin-top: 10px;
  padding: 8px 16px;
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.notification-card {
  cursor: pointer;
  transition: background 0.2s;
}

.notification-card:hover {
  background: #f9f9f9;
}

.notification-card:active {
  background: #f0f0f0;
}
