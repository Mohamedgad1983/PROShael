/**
 * NotificationCards - Cards for occasions, initiatives, and diyas
 * Features: Swipeable cards, interactive notifications, priority indicators
 */

import React, { useState } from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import '../../styles/mobile-arabic.css';

const NotificationCards = ({ onNotificationSelect, onMarkAsRead, onDismiss }) => {
  const { viewport } = useMobile();
  const { feedback } = useHapticFeedback();

  // Sample notification data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'occasion',
      category: 'مناسبة',
      title: 'زواج أحمد محمد الشعيل',
      description: 'ندعوكم لحضور حفل زواج ابننا أحمد',
      date: '٢٠٢٤/١٠/١٥',
      time: '٧:٠٠ مساءً',
      location: 'قاعة الملك فهد',
      priority: 'high',
      isRead: false,
      icon: '💒',
      color: 'from-pink-500 to-rose-600',
      action: 'RSVP'
    },
    {
      id: 2,
      type: 'initiative',
      category: 'مبادرة',
      title: 'مبادرة كسوة الشتاء',
      description: 'مبادرة لتوزيع ملابس الشتاء على المحتاجين',
      date: '٢٠٢٤/١٠/٢٠',
      targetAmount: '٢٠,٠٠٠ ريال',
      currentAmount: '١٢,٥٠٠ ريال',
      progress: 62.5,
      priority: 'medium',
      isRead: false,
      icon: '🧥',
      color: 'from-blue-500 to-cyan-600',
      action: 'تبرع'
    },
    {
      id: 3,
      type: 'diya',
      category: 'دية',
      title: 'دية حادث مروري',
      description: 'مساهمة في دية حادث مروري لأحد أفراد الأسرة',
      date: '٢٠٢٤/١٠/١٠',
      targetAmount: '١٠٠,٠٠٠ ريال',
      currentAmount: '٨٥,٠٠٠ ريال',
      progress: 85,
      priority: 'high',
      isRead: true,
      icon: '🤝',
      color: 'from-green-500 to-emerald-600',
      action: 'مساهمة'
    },
    {
      id: 4,
      type: 'occasion',
      category: 'مناسبة',
      title: 'تخرج فاطمة علي الشعيل',
      description: 'نبارك لابنتنا فاطمة تخرجها من الجامعة',
      date: '٢٠٢٤/١٠/٢٥',
      time: '٥:٠٠ مساءً',
      location: 'جامعة الملك سعود',
      priority: 'medium',
      isRead: false,
      icon: '🎓',
      color: 'from-purple-500 to-indigo-600',
      action: 'تهنئة'
    }
  ]);

  // Convert numbers to Arabic numerals
  const toArabicNumerals = (num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Handle notification selection
  const handleNotificationSelect = (notification) => {
    feedback('light');

    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (onNotificationSelect) {
      onNotificationSelect(notification);
    }
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );

    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
  };

  // Dismiss notification
  const dismissNotification = (id) => {
    feedback('medium');
    setNotifications(prev => prev.filter(notif => notif.id !== id));

    if (onDismiss) {
      onDismiss(id);
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-error';
      case 'medium': return 'text-warning';
      default: return 'text-success';
    }
  };

  // Get priority indicator
  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      default: return '🟢';
    }
  };

  // Group notifications by category
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const category = notification.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(notification);
    return groups;
  }, {});

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">الإشعارات والمناسبات</h3>
        <div className="flex items-center gap-2">
          {/* Unread count */}
          {notifications.filter(n => !n.isRead).length > 0 && (
            <div className="bg-error rounded-full px-2 py-1 min-w-[20px] text-center">
              <span className="text-white text-xs font-bold">
                {toArabicNumerals(notifications.filter(n => !n.isRead).length)}
              </span>
            </div>
          )}
          <button
            className="touch-target glass rounded-lg"
            onClick={() => feedback('light')}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notification groups */}
      {Object.entries(groupedNotifications).map(([category, notifs]) => (
        <div key={category} className="space-y-3">

          {/* Category header */}
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-slate-300">{category}</h4>
            <div className="flex-1 h-px bg-slate-600"></div>
            <span className="text-xs text-slate-400">
              {toArabicNumerals(notifs.length)}
            </span>
          </div>

          {/* Notification cards */}
          {notifs.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onSelect={handleNotificationSelect}
              onDismiss={dismissNotification}
              toArabicNumerals={toArabicNumerals}
              getPriorityColor={getPriorityColor}
              getPriorityIndicator={getPriorityIndicator}
              isMobile={viewport.isMobile}
            />
          ))}

        </div>
      ))}

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="glass-card text-center py-8">
          <div className="text-4xl mb-4">📭</div>
          <h4 className="text-lg font-medium text-white mb-2">لا توجد إشعارات</h4>
          <p className="text-slate-400 text-sm">سيتم عرض الإشعارات والمناسبات هنا</p>
        </div>
      )}

    </div>
  );
};

// Individual notification card component
const NotificationCard = ({
  notification,
  onSelect,
  onDismiss,
  toArabicNumerals,
  getPriorityColor,
  getPriorityIndicator,
  isMobile
}) => {
  const { feedback } = useHapticFeedback();
  const [isSwipedLeft, setIsSwipedLeft] = useState(false);

  const handleCardPress = () => {
    onSelect(notification);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismiss(notification.id);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
        isSwipedLeft ? 'transform -translate-x-16' : ''
      }`}
    >

      {/* Dismiss button (revealed on swipe) */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-error flex items-center justify-center">
        <button
          className="text-white text-xl"
          onClick={handleDismiss}
        >
          🗑️
        </button>
      </div>

      {/* Main card */}
      <div
        className={`glass-card cursor-pointer transition-all hover:transform hover:scale-[1.02] ${
          !notification.isRead ? 'border-r-4 border-accent' : ''
        }`}
        onClick={handleCardPress}
      >

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${notification.color} rounded-lg flex items-center justify-center text-xl`}>
              {notification.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-white text-sm">{notification.title}</h4>
                {getPriorityIndicator(notification.priority)}
              </div>
              <p className="text-xs text-slate-400">{notification.category} • {notification.date}</p>
            </div>
          </div>

          {/* Status and dismiss */}
          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <div className="w-2 h-2 bg-accent rounded-full"></div>
            )}
            <button
              className="touch-target opacity-50 hover:opacity-100"
              onClick={handleDismiss}
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 mb-3 leading-relaxed">
          {notification.description}
        </p>

        {/* Additional info based on type */}
        {notification.type === 'occasion' && notification.time && (
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
            <span>🕰️ {notification.time}</span>
            {notification.location && <span>📍 {notification.location}</span>}
          </div>
        )}

        {/* Progress bar for initiatives and diyas */}
        {(notification.type === 'initiative' || notification.type === 'diya') && notification.progress && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>المبلغ المحصل</span>
              <span>{toArabicNumerals(Math.round(notification.progress))}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full bg-gradient-to-r ${notification.color} transition-all duration-1000`}
                style={{ width: `${notification.progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium">
                {toArabicNumerals(notification.currentAmount)}
              </span>
              <span className="text-slate-400">
                من {toArabicNumerals(notification.targetAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="flex gap-2">
          <button
            className={`btn btn-primary flex-1 text-sm py-2 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              feedback('medium');
            }}
          >
            {notification.action}
          </button>

          {notification.type === 'occasion' && (
            <button
              className="btn btn-secondary px-4 text-sm py-2"
              onClick={(e) => {
                e.stopPropagation();
                feedback('light');
              }}
            >
              📅
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default NotificationCards;