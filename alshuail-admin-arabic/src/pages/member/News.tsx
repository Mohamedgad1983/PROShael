// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { logger } from '../../utils/logger';

const News = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const observer = useRef();

    const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api');

    // Fetch unread count
    useEffect(() => {
        fetchUnreadCount();
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');
            const response = await axios.get(
                `${API_URL}/news/notifications/unread-count?member_id=${memberId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUnreadCount(response.data.count || 0);
        } catch (error) {
            logger.error('Error fetching unread count:', { error });
        }
    };

    // Fetch news with pagination
    const fetchNews = async (pageNum = 1, isRefresh = false) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/news`, {
                params: { page: pageNum, limit: 10, is_published: true },
                headers: { Authorization: `Bearer ${token}` }
            });

            const newNews = response.data.news || [];

            if (isRefresh) {
                setNews(newNews);
            } else {
                setNews(prev => pageNum === 1 ? newNews : [...prev, ...newNews]);
            }

            setHasMore(newNews.length === 10);
            setLoading(false);
            setRefreshing(false);
        } catch (error) {
            logger.error('Fetch error:', { error });
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchNews(1);
    }, []);

    // Pull to refresh
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(1);
        fetchNews(1, true);
        fetchUnreadCount();
    }, []);

    // Infinite scroll - last element observer
    const lastNewsElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchNews(nextPage);
                    return nextPage;
                });
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Track view when news is clicked
    const handleNewsClick = async (newsItem) => {
        try {
            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');

            // Track view
            await axios.post(
                `${API_URL}/news/${newsItem.id}/view`,
                { member_id: memberId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Navigate to detail
            navigate(`/member/news/${newsItem.id}`);
        } catch (error) {
            logger.error('Error tracking view:', { error });
            navigate(`/member/news/${newsItem.id}`);
        }
    };

    const getCategoryColor = (category) => {
        const colors = {
            announcement: 'bg-blue-500',
            urgent: 'bg-red-500',
            event: 'bg-purple-500',
            general: 'bg-gray-500'
        };
        return colors[category] || 'bg-gray-500';
    };

    const getCategoryText = (category) => {
        const texts = {
            announcement: 'إعلان',
            urgent: 'عاجل',
            event: 'حدث',
            general: 'عام'
        };
        return texts[category] || category;
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

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20" dir="rtl">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-md">
                <div className="px-4 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-800">الأخبار</h1>
                        <div className="relative">
                            <button
                                onClick={() => navigate('/member/notifications')}
                                className="relative p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                            >
                                <span className="text-2xl">🔔</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
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

            {/* News Feed */}
            <div className="px-4 space-y-4 mt-4">
                {news.map((item, index) => {
                    const isUrgent = item.category === 'urgent';
                    const isLastElement = index === news.length - 1;

                    return (
                        <div
                            key={item.id}
                            ref={isLastElement ? lastNewsElementRef : null}
                            onClick={() => handleNewsClick(item)}
                            className={`bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl ${
                                isUrgent ? 'ring-2 ring-red-500 animate-pulse-slow' : ''
                            }`}
                        >
                            {/* Cover Image */}
                            {item.image_url && (
                                <div className="relative h-48 bg-gradient-to-r from-blue-400 to-purple-400">
                                    <img
                                        src={item.image_url}
                                        alt={item.title_ar}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                    {/* Urgent Badge Overlay */}
                                    {isUrgent && (
                                        <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-bounce">
                                            <span>⚡</span>
                                            <span>عاجل</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-4">
                                {/* Category & Time */}
                                <div className="flex justify-between items-center mb-3">
                                    <span className={`px-3 py-1 rounded-full text-xs text-white font-bold ${getCategoryColor(item.category)}`}>
                                        {getCategoryText(item.category)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {getTimeAgo(item.created_at)}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                                    {item.title_ar || item.title_en}
                                </h3>

                                {/* Content Preview */}
                                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                                    {item.content_ar || item.content_en}
                                </p>

                                {/* Stats & Actions */}
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <div className="flex gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <span>👁️</span>
                                            <span>{item.views_count || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span>❤️</span>
                                            <span>{item.reactions_count || 0}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="text-blue-600 font-bold text-sm hover:text-blue-700 flex items-center gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNewsClick(item);
                                        }}
                                    >
                                        <span>اقرأ المزيد</span>
                                        <span>←</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Loading Indicator */}
            {loading && page === 1 && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Load More Indicator */}
            {loading && page > 1 && (
                <div className="flex justify-center items-center py-8">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">جاري التحميل...</span>
                    </div>
                </div>
            )}

            {/* No More Content */}
            {!loading && !hasMore && news.length > 0 && (
                <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">✓</div>
                    <p>لا يوجد المزيد من الأخبار</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && news.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-8xl mb-4">📰</div>
                    <p className="text-xl text-gray-600 mb-2">لا توجد أخبار حالياً</p>
                    <p className="text-sm text-gray-400">تابعنا للحصول على آخر الأخبار</p>
                </div>
            )}

            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.9; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default News;
