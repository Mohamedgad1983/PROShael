// @ts-nocheck
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { logger } from '../../utils/logger';

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);

            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');

            const response = await axios.get(
                `${API_URL}/news/notifications/my?member_id=${memberId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNotifications(response.data.notifications || []);
            setLoading(false);
            setRefreshing(false);
        } catch (error) {
            logger.error('Error fetching notifications:', { error });
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            const token = localStorage.getItem('token');

            // Mark as read
            if (!notification.is_read) {
                await axios.patch(
                    `${API_URL}/news/notifications/${notification.id}/read`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // Update local state
                setNotifications(prev =>
                    prev.map(n =>
                        n.id === notification.id ? { ...n, is_read: true } : n
                    )
                );
            }

            // Navigate to news detail
            if (notification.news_id) {
                navigate(`/member/news/${notification.news_id}`);
            }
        } catch (error) {
            logger.error('Error marking as read:', { error });
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');

            // Mark all as read
            const unreadIds = notifications
                .filter(n => !n.is_read)
                .map(n => n.id);

            await Promise.all(
                unreadIds.map(id =>
                    axios.patch(
                        `${API_URL}/news/notifications/${id}/read`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                )
            );

            // Update local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
        } catch (error) {
            logger.error('Error marking all as read:', { error });
        }
    };

    const handleRefresh = () => {
        fetchNotifications(true);
    };

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'الآن';
        if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
        if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
        if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
        return date.toLocaleDateString('ar-SA');
    };

    const getNotificationIcon = (type) => {
        const icons = {
            news: '📰',
            urgent: '⚠️',
            announcement: '📢',
            event: '📅',
            general: '💬'
        };
        return icons[type] || '🔔';
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20" dir="rtl">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-md">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <span className="text-2xl">→</span>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">الإشعارات</h1>
                                {unreadCount > 0 && (
                                    <p className="text-sm text-blue-600 font-medium">
                                        {unreadCount} إشعار غير مقروء
                                    </p>
                                )}
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                قراءة الكل
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Pull to Refresh Indicator */}
            {refreshing && (
                <div className="flex justify-center items-center py-4 bg-blue-50">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-blue-600 font-medium">جاري التحديث...</span>
                    </div>
                </div>
            )}

            {/* Pull to Refresh Area */}
            <div
                className="px-4 py-2 text-center text-sm text-gray-400"
                onTouchStart={(e) => {
                    const startY = e.touches[0].clientY;
                    const onTouchMove = (moveEvent) => {
                        const currentY = moveEvent.touches[0].clientY;
                        if (currentY - startY > 80 && window.scrollY === 0) {
                            handleRefresh();
                            document.removeEventListener('touchmove', onTouchMove);
                        }
                    };
                    document.addEventListener('touchmove', onTouchMove);
                    document.addEventListener('touchend', () => {
                        document.removeEventListener('touchmove', onTouchMove);
                    }, { once: true });
                }}
            >
                اسحب للتحديث
            </div>

            {/* Notifications List */}
            <div className="px-4 space-y-2 mt-4">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`relative cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden ${
                            !notification.is_read
                                ? 'bg-blue-50 border-2 border-blue-200 shadow-md'
                                : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
                        }`}
                    >
                        {/* Unread Indicator */}
                        {!notification.is_read && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                        )}

                        <div className="p-4">
                            <div className="flex gap-3">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                    !notification.is_read ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                    <span className="text-2xl">
                                        {getNotificationIcon(notification.notification_type || 'general')}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold mb-1 line-clamp-2 ${
                                        !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                                    }`}>
                                        {notification.title || 'إشعار جديد'}
                                    </h3>
                                    {notification.message && (
                                        <p className={`text-sm line-clamp-2 mb-2 ${
                                            !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                                        }`}>
                                            {notification.message}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>🕒</span>
                                        <span>{getTimeAgo(notification.created_at)}</span>
                                    </div>
                                </div>

                                {/* Unread Badge */}
                                {!notification.is_read && (
                                    <div className="flex-shrink-0">
                                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                    </div>
                                )}
                            </div>

                            {/* Action Hint */}
                            {notification.news_id && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <button className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                        <span>عرض التفاصيل</span>
                                        <span>←</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="text-8xl mb-6">🔔</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                        لا توجد إشعارات
                    </h2>
                    <p className="text-gray-600 text-center mb-6">
                        سيتم إشعارك عند وجود أخبار جديدة
                    </p>
                    <button
                        onClick={() => navigate('/member/news')}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                        تصفح الأخبار
                    </button>
                </div>
            )}

            {/* Success State (All Read) */}
            {notifications.length > 0 && unreadCount === 0 && (
                <div className="mt-8 px-4">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 text-center">
                        <div className="text-5xl mb-3">✓</div>
                        <p className="font-bold text-gray-800 mb-1">رائع!</p>
                        <p className="text-sm text-gray-600">لقد قرأت جميع الإشعارات</p>
                    </div>
                </div>
            )}

            {/* Statistics */}
            {notifications.length > 0 && (
                <div className="mt-8 px-4 pb-8">
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h3 className="font-bold text-gray-800 mb-4 text-center">إحصائيات الإشعارات</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-1">
                                    {notifications.length}
                                </div>
                                <div className="text-xs text-gray-600">الإجمالي</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 mb-1">
                                    {notifications.filter(n => n.is_read).length}
                                </div>
                                <div className="text-xs text-gray-600">مقروء</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-600 mb-1">
                                    {unreadCount}
                                </div>
                                <div className="text-xs text-gray-600">غير مقروء</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
