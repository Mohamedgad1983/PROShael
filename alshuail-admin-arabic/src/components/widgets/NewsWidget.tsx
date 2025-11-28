// @ts-nocheck
import React, { memo,  useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { logger } from '../../utils/logger';

interface NewsItem {
    id: number;
    title_ar?: string;
    title_en?: string;
    content_ar?: string;
    content_en?: string;
    category: string;
    views_count?: number;
    created_at: string;
}

const NewsWidget = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api');

    useEffect(() => {
        fetchLatestNews();
        fetchUnreadCount();
    }, []);

    const fetchLatestNews = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/news`, {
                params: { limit: 3, is_published: true },
                headers: { Authorization: `Bearer ${token}` }
            });
            setNews(response.data.news || []);
            setLoading(false);
        } catch (error) {
            logger.error('Error fetching news:', { error });
            setLoading(false);
        }
    };

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

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            announcement: 'bg-blue-500',
            urgent: 'bg-red-500',
            event: 'bg-purple-500',
            general: 'bg-gray-500'
        };
        return colors[category] || 'bg-gray-500';
    };

    const getCategoryText = (category: string) => {
        const texts: Record<string, string> = {
            announcement: 'إعلان',
            urgent: 'عاجل',
            event: 'حدث',
            general: 'عام'
        };
        return texts[category] || category;
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'الآن';
        if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} د`;
        if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} س`;
        if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
        return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    };

    const handleNewsClick = (newsId: number) => {
        navigate(`/member/news/${newsId}`);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6" dir="rtl">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg overflow-hidden" dir="rtl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">📰</span>
                        <h3 className="text-lg font-bold text-white">آخر الأخبار</h3>
                    </div>
                    {unreadCount > 0 && (
                        <div className="relative">
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                {unreadCount} جديد
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* News List */}
            <div className="p-4">
                {news.length > 0 ? (
                    <div className="space-y-3">
                        {news.map((item, index) => {
                            const isUrgent = item.category === 'urgent';

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleNewsClick(item.id)}
                                    className={`group cursor-pointer transition-all duration-300 hover:shadow-md rounded-xl overflow-hidden ${
                                        isUrgent
                                            ? 'bg-red-50 border-2 border-red-300 hover:border-red-400'
                                            : 'bg-white border border-gray-200 hover:border-blue-400'
                                    }`}
                                >
                                    <div className="p-3">
                                        <div className="flex gap-3">
                                            {/* Category Badge */}
                                            <div className="flex-shrink-0">
                                                <div className={`w-12 h-12 rounded-full ${getCategoryColor(item.category)} flex items-center justify-center`}>
                                                    <span className="text-white text-xl">
                                                        {isUrgent ? '⚡' : '📄'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-bold text-gray-800 line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">
                                                        {item.title_ar || item.title_en}
                                                    </h4>
                                                    {isUrgent && (
                                                        <span className="flex-shrink-0 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                                                            عاجل
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                                    {item.content_ar || item.content_en}
                                                </p>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className={`px-2 py-0.5 rounded-full text-white text-xs ${getCategoryColor(item.category)}`}>
                                                            {getCategoryText(item.category)}
                                                        </span>
                                                        <span>👁️ {item.views_count || 0}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {getTimeAgo(item.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Urgent Animation Bar */}
                                    {isUrgent && (
                                        <div className="h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 bg-size-200 animate-gradient"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-2">📭</div>
                        <p className="text-sm text-gray-500">لا توجد أخبار حالياً</p>
                    </div>
                )}

                {/* View All Button */}
                {news.length > 0 && (
                    <button
                        onClick={() => navigate('/member/news')}
                        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                        <span>عرض جميع الأخبار</span>
                        <span>←</span>
                    </button>
                )}
            </div>

            <style>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 2s ease infinite;
                }
                .bg-size-200 {
                    background-size: 200% 200%;
                }
            `}</style>
        </div>
    );
};

export default memo(NewsWidget);
