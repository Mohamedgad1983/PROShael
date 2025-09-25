/**
 * NotificationCenter - Enhanced notification center with real-time updates
 * Features: Filter tabs, swipe-to-dismiss, priority indicators, Arabic RTL support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import notificationService from '../../services/notificationService';
import '../../styles/mobile-arabic.css';

const NotificationCenter = ({ onNotificationSelect, onClose }) => {
  const { notifications, unreadCount, markAsRead, dismissNotification, clearAll } = useNotifications();
  const { viewport } = useMobile();
  const { feedback } = useHapticFeedback();

  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Filter options
  const filterOptions = [
    { key: 'all', label: 'الكل', icon: '📋', count: notifications.length },
    { key: 'occasion', label: 'مناسبات', icon: '🎉', count: notifications.filter(n => n.type === 'occasion').length },
    { key: 'initiative', label: 'مبادرات', icon: '🤝', count: notifications.filter(n => n.type === 'initiative').length },
    { key: 'diya', label: 'ديات', icon: '💰', count: notifications.filter(n => n.type === 'diya').length },
    { key: 'balance', label: 'رصيد', icon: '💳', count: notifications.filter(n => n.type === 'balance').length }
  ];

  // Filter notifications based on selected filter and search query
  const filteredNotifications = notifications
    .filter(notification => {
      const matchesFilter = filter === 'all' || notification.type === filter;
      const matchesSearch = !searchQuery ||
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (notification.body && notification.body.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by: unread first, then by timestamp (newest first)
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return b.timestamp - a.timestamp;
    });

  // Convert numbers to Arabic numerals
  const toArabicNumerals = (num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Format timestamp to Arabic date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `منذ ${toArabicNumerals(Math.max(1, diffInMinutes))} دقيقة`;
    } else if (diffInHours < 24) {
      return `منذ ${toArabicNumerals(Math.floor(diffInHours))} ساعة`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `منذ ${toArabicNumerals(diffInDays)} يوم`;
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    feedback('light');
  };

  // Handle notification selection
  const handleNotificationSelect = useCallback((notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    feedback('medium');

    // Call parent handler
    if (onNotificationSelect) {
      onNotificationSelect(notification);
    }

    // Handle navigation based on notification type
    switch (notification.type) {
      case 'balance':
        window.location.hash = '#/member/balance';
        break;
      case 'occasion':
        window.location.hash = `#/member/occasions/${notification.data?.id || ''}`;
        break;
      case 'initiative':
        window.location.hash = `#/member/initiatives/${notification.data?.id || ''}`;
        break;
      case 'diya':
        window.location.hash = `#/member/diyas/${notification.data?.id || ''}`;
        break;
      default:
        break;
    }
  }, [markAsRead, feedback, onNotificationSelect]);

  // Handle notification dismissal
  const handleDismissNotification = useCallback((notificationId) => {
    dismissNotification(notificationId);
    feedback('medium');
  }, [dismissNotification, feedback]);

  // Handle clear all notifications
  const handleClearAll = () => {
    if (filteredNotifications.length === 0) return;

    const unreadNotifications = filteredNotifications.filter(n => !n.isRead);
    if (unreadNotifications.length > 0) {
      // Show confirmation for unread notifications
      if (window.confirm(`هل تريد حذف ${toArabicNumerals(filteredNotifications.length)} إشعار؟`)) {
        clearAll();
        feedback('heavy');
      }
    } else {
      clearAll();
      feedback('heavy');
    }
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Get priority color class
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  // Get notification type icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'balance': return '💳';
      case 'occasion': return '🎉';
      case 'initiative': return '🤝';
      case 'diya': return '💰';
      case 'payment-reminder': return '⏰';
      case 'announcement': return '📢';
      default: return '📬';
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="touch-target glass rounded-lg"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-bold text-white">مركز الإشعارات</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Unread count badge */}
              {unreadCount > 0 && (
                <div className="bg-red-500 rounded-full px-2 py-1 min-w-[24px] text-center">
                  <span className="text-white text-xs font-bold">
                    {toArabicNumerals(unreadCount)}
                  </span>
                </div>
              )}

              {/* Settings button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="touch-target glass rounded-lg"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="البحث في الإشعارات..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full glass-input pr-12 pl-4 py-3 text-white placeholder-slate-400"
              dir="rtl"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filterOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => handleFilterChange(option.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                  filter === option.key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'glass text-slate-300 hover:text-white'
                }`}
              >
                <span className="text-sm">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
                {option.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === option.key
                      ? 'bg-blue-800 text-blue-100'
                      : 'bg-slate-600 text-slate-300'
                  }`}>
                    {toArabicNumerals(option.count)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
          <div className="space-y-3">
            <button
              onClick={handleClearAll}
              disabled={filteredNotifications.length === 0}
              className="w-full btn btn-danger text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              مسح جميع الإشعارات ({toArabicNumerals(filteredNotifications.length)})
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => notificationService.requestPermission()}
                className="flex-1 btn btn-secondary text-sm py-2"
              >
                تفعيل الإشعارات
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 btn btn-outline text-sm py-2"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications list */}
      <div className="px-6 py-4">
        {isLoading ? (
          <NotificationSkeleton />
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onSelect={handleNotificationSelect}
                onDismiss={handleDismissNotification}
                formatDate={formatDate}
                toArabicNumerals={toArabicNumerals}
                getPriorityColor={getPriorityColor}
                getNotificationIcon={getNotificationIcon}
                isMobile={viewport.isMobile}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            filter={filter}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            onResetFilter={() => setFilter('all')}
          />
        )}
      </div>

      {/* Bottom padding for mobile navigation */}
      <div className="h-20"></div>
    </div>
  );
};

// Individual notification card component
const NotificationCard = ({
  notification,
  onSelect,
  onDismiss,
  formatDate,
  toArabicNumerals,
  getPriorityColor,
  getNotificationIcon,
  isMobile
}) => {
  const { feedback } = useHapticFeedback();
  const [isSwipedLeft, setIsSwipedLeft] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!startX) return;
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;

    if (diff > 50) {
      setIsSwipedLeft(true);
    } else if (diff < -50) {
      setIsSwipedLeft(false);
    }
  };

  const handleTouchEnd = () => {
    setStartX(0);
  };

  const handleCardPress = () => {
    if (isSwipedLeft) {
      setIsSwipedLeft(false);
      return;
    }

    feedback('light');
    onSelect(notification);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    feedback('medium');
    onDismiss(notification.id);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
        isSwipedLeft ? 'transform -translate-x-16' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >

      {/* Dismiss button (revealed on swipe) */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-red-600 flex items-center justify-center z-10">
        <button
          className="text-white text-xl"
          onClick={handleDismiss}
        >
          🗑️
        </button>
      </div>

      {/* Main card */}
      <div
        className={`glass-card cursor-pointer transition-all hover:transform hover:scale-[1.02] relative z-20 ${
          !notification.isRead ? 'border-r-4 border-blue-500' : ''
        }`}
        onClick={handleCardPress}
      >

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-xl">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-white text-sm truncate">{notification.title}</h4>
                {notification.priority && (
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`}></div>
                )}
              </div>
              <p className="text-xs text-slate-400">{formatDate(notification.timestamp)}</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
            <button
              className="touch-target opacity-50 hover:opacity-100 p-1"
              onClick={handleDismiss}
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {notification.body && (
          <p className="text-sm text-slate-300 mb-3 leading-relaxed line-clamp-2">
            {notification.body}
          </p>
        )}

        {/* Additional info for specific types */}
        {notification.data && notification.data.amount && (
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 p-2 bg-slate-800/50 rounded-lg">
            <span>المبلغ:</span>
            <span className="text-white font-medium">
              {toArabicNumerals(notification.data.amount)} ر.س
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            className={`btn btn-primary flex-1 text-sm py-2 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              feedback('medium');
              onSelect(notification);
            }}
          >
            عرض التفاصيل
          </button>

          {!notification.isRead && (
            <button
              className="btn btn-outline px-4 text-sm py-2"
              onClick={(e) => {
                e.stopPropagation();
                // Mark as read without opening
                feedback('light');
              }}
            >
              ✓
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

// Loading skeleton component
const NotificationSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass-card animate-pulse">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 bg-slate-700 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-700 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-3 bg-slate-800 rounded mb-2"></div>
        <div className="h-3 bg-slate-800 rounded w-2/3 mb-3"></div>
        <div className="h-8 bg-slate-700 rounded"></div>
      </div>
    ))}
  </div>
);

// Empty state component
const EmptyState = ({ filter, searchQuery, onClearSearch, onResetFilter }) => (
  <div className="glass-card text-center py-12">
    <div className="text-6xl mb-4">
      {searchQuery ? '🔍' : filter !== 'all' ? '📭' : '🔔'}
    </div>
    <h3 className="text-lg font-medium text-white mb-2">
      {searchQuery
        ? 'لم يتم العثور على نتائج'
        : filter !== 'all'
        ? `لا توجد إشعارات في فئة ${filter}`
        : 'لا توجد إشعارات'
      }
    </h3>
    <p className="text-slate-400 text-sm mb-4">
      {searchQuery
        ? 'جرب البحث بكلمات مختلفة'
        : filter !== 'all'
        ? 'سيتم عرض الإشعارات الجديدة هنا'
        : 'سيتم إشعارك عند وجود أحداث جديدة'
      }
    </p>

    {(searchQuery || filter !== 'all') && (
      <div className="flex gap-2 justify-center">
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="btn btn-secondary text-sm px-4 py-2"
          >
            مسح البحث
          </button>
        )}
        {filter !== 'all' && (
          <button
            onClick={onResetFilter}
            className="btn btn-outline text-sm px-4 py-2"
          >
            عرض الكل
          </button>
        )}
      </div>
    )}
  </div>
);

export default NotificationCenter;