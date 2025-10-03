import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBell,
  FaNewspaper,
  FaGift,
  FaHandHoldingUsd,
  FaLightbulb,
  FaHeartBroken,
  FaClock,
  FaCheckDouble
} from 'react-icons/fa';
import BottomNav from '../../components/mobile/BottomNav';
import '../../styles/mobile/Notifications.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'news' | 'occasions' | 'diyas' | 'initiatives' | 'condolences';
  date: string;
  is_read: boolean;
  priority?: 'high' | 'normal' | 'low';
  action_url?: string;
  image_url?: string;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'news' | 'occasions' | 'diyas' | 'initiatives' | 'condolences'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const typeConfig = {
    news: {
      label: 'أخبار',
      icon: FaNewspaper,
      color: '#007AFF',
      bgColor: '#007AFF10'
    },
    occasions: {
      label: 'مناسبات',
      icon: FaGift,
      color: '#FF9500',
      bgColor: '#FF950010'
    },
    diyas: {
      label: 'ديات',
      icon: FaHandHoldingUsd,
      color: '#FF3B30',
      bgColor: '#FF3B3010'
    },
    initiatives: {
      label: 'مبادرات',
      icon: FaLightbulb,
      color: '#34C759',
      bgColor: '#34C75910'
    },
    condolences: {
      label: 'تعازي',
      icon: FaHeartBroken,
      color: '#8E8E93',
      bgColor: '#8E8E9310'
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
    updateUnreadCount();
  }, [notifications, activeFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      const response = await fetch(`${apiUrl}/api/member/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    if (activeFilter === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === activeFilter));
    }
  };

  const updateUnreadCount = () => {
    const count = notifications.filter(n => !n.is_read).length;
    setUnreadCount(count);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      await fetch(`${apiUrl}/api/member/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      await fetch(`${apiUrl}/api/member/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) {
      return `منذ ${minutes} دقيقة`;
    } else if (hours < 24) {
      return `منذ ${hours} ساعة`;
    } else if (days < 7) {
      return `منذ ${days} أيام`;
    } else {
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل الإشعارات...</p>
      </div>
    );
  }

  return (
    <div className="mobile-notifications">
      {/* Header */}
      <div className="notifications-header">
        <h1>الإشعارات</h1>
        {unreadCount > 0 && (
          <button className="mark-all-btn" onClick={markAllAsRead}>
            <FaCheckDouble />
            قراءة الكل
          </button>
        )}
      </div>

      {/* Unread Count */}
      {unreadCount > 0 && (
        <div className="unread-banner">
          <FaBell />
          <span>لديك {unreadCount} إشعارات غير مقروءة</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          الكل
        </button>
        {Object.entries(typeConfig).map(([type, config]) => (
          <button
            key={type}
            className={`tab-btn ${activeFilter === type ? 'active' : ''}`}
            onClick={() => setActiveFilter(type as any)}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification, index) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={notification.id}
                className={`notification-card ${notification.is_read ? 'read' : 'unread'}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div
                  className="notification-icon"
                  style={{
                    backgroundColor: config.bgColor,
                    color: config.color
                  }}
                >
                  <Icon />
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <span
                      className="notification-type"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>
                    <span className="notification-time">
                      <FaClock />
                      {formatDate(notification.date)}
                    </span>
                  </div>
                  <h3 className="notification-title">{notification.title}</h3>
                  <p className="notification-message">{notification.message}</p>
                </div>
                {!notification.is_read && (
                  <div className="unread-indicator"></div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="empty-state">
            <FaBell />
            <p>لا توجد إشعارات</p>
          </div>
        )}
      </div>

      {/* Notification Details Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div
              className="notification-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <span
                  className="modal-type"
                  style={{
                    color: typeConfig[selectedNotification.type].color,
                    backgroundColor: typeConfig[selectedNotification.type].bgColor
                  }}
                >
                  {typeConfig[selectedNotification.type].label}
                </span>
                <span className="modal-date">
                  {new Date(selectedNotification.date).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              {selectedNotification.image_url && (
                <img
                  src={selectedNotification.image_url}
                  alt={selectedNotification.title}
                  className="modal-image"
                />
              )}

              <h2 className="modal-title">{selectedNotification.title}</h2>
              <p className="modal-message">{selectedNotification.message}</p>

              {selectedNotification.action_url && (
                <button className="action-button">
                  عرض التفاصيل
                </button>
              )}

              <button
                className="modal-close"
                onClick={() => setSelectedNotification(null)}
              >
                إغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Notifications;