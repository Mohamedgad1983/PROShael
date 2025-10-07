// @ts-nocheck
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const NewsDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [news, setNews] = useState(null);
    const [relatedNews, setRelatedNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [shareSuccess, setShareSuccess] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

    useEffect(() => {
        fetchNewsDetail();
    }, [id]);

    const fetchNewsDetail = async () => {
        try {
            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');

            // Fetch news detail
            const response = await axios.get(`${API_URL}/news/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNews(response.data.news);

            // Mark as read
            await axios.post(
                `${API_URL}/news/${id}/read`,
                { member_id: memberId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Fetch related news
            const relatedResponse = await axios.get(`${API_URL}/news`, {
                params: {
                    category: response.data.news.category,
                    limit: 3,
                    exclude_id: id
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            setRelatedNews(relatedResponse.data.news || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching news:', error);
            setLoading(false);
        }
    };

    const handleReaction = async (reactionType) => {
        try {
            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');

            await axios.post(
                `${API_URL}/news/${id}/react`,
                {
                    member_id: memberId,
                    reaction_type: reactionType
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSelectedReaction(reactionType);

            // Update local count
            setNews(prev => ({
                ...prev,
                reactions_count: (prev.reactions_count || 0) + 1
            }));
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    };

    const handleShare = async () => {
        try {
            const shareData = {
                title: news.title_ar || news.title_en,
                text: news.content_ar || news.content_en,
                url: window.location.href
            };

            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(window.location.href);
                setShareSuccess(true);
                setTimeout(() => setShareSuccess(false), 2000);
            }
        } catch (error) {
            console.error('Error sharing:', error);
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

    const reactions = [
        { type: 'like', emoji: '👍', label: 'إعجاب' },
        { type: 'love', emoji: '❤️', label: 'حب' },
        { type: 'celebrate', emoji: '🎉', label: 'احتفال' },
        { type: 'support', emoji: '🤲', label: 'دعاء' }
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!news) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4" dir="rtl">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">الخبر غير موجود</h2>
                <button
                    onClick={() => navigate('/member/news')}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                    العودة إلى الأخبار
                </button>
            </div>
        );
    }

    const images = news.image_url ? [news.image_url] : [];

    return (
        <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-md">
                <div className="px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <span className="text-2xl">→</span>
                    </button>
                    <h1 className="text-lg font-bold text-gray-800 flex-1">تفاصيل الخبر</h1>
                    <button
                        onClick={handleShare}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                    >
                        <span className="text-2xl">↗️</span>
                        {shareSuccess && (
                            <span className="absolute top-0 right-0 text-xs bg-green-500 text-white px-2 py-1 rounded animate-bounce">
                                تم النسخ
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Image Gallery */}
            {images.length > 0 && (
                <div className="relative bg-black">
                    <div className="relative h-64 md:h-96 overflow-hidden">
                        <img
                            src={images[currentImageIndex]}
                            alt={news.title_ar}
                            className="w-full h-full object-contain"
                        />
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-90 rounded-full w-10 h-10 flex items-center justify-center"
                                    disabled={currentImageIndex === 0}
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-90 rounded-full w-10 h-10 flex items-center justify-center"
                                    disabled={currentImageIndex === images.length - 1}
                                >
                                    →
                                </button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                    {images.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentImageIndex(index)}
                                            className={`w-2 h-2 rounded-full transition-all ${
                                                index === currentImageIndex ? 'bg-white w-6' : 'bg-white bg-opacity-50'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="px-4 py-6">
                {/* Category & Time */}
                <div className="flex justify-between items-center mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm text-white font-bold ${getCategoryColor(news.category)}`}>
                        {getCategoryText(news.category)}
                    </span>
                    <span className="text-sm text-gray-500">
                        {getTimeAgo(news.created_at)}
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {news.title_ar || news.title_en}
                </h1>

                {/* English Title */}
                {news.title_en && news.title_ar && (
                    <h2 className="text-xl text-gray-600 mb-4" dir="ltr">
                        {news.title_en}
                    </h2>
                )}

                {/* Stats */}
                <div className="flex gap-6 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <span>👁️</span>
                        <span>{news.views_count || 0} مشاهدة</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span>{news.reads_count || 0} قراءة</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>❤️</span>
                        <span>{news.reactions_count || 0} تفاعل</span>
                    </div>
                </div>

                {/* Content */}
                <div className="prose prose-lg max-w-none mb-8">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                        {news.content_ar || news.content_en}
                    </p>
                    {news.content_en && news.content_ar && (
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap" dir="ltr">
                                {news.content_en}
                            </p>
                        </div>
                    )}
                </div>

                {/* Reactions */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">ما رأيك في هذا الخبر؟</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {reactions.map(reaction => (
                            <button
                                key={reaction.type}
                                onClick={() => handleReaction(reaction.type)}
                                disabled={selectedReaction !== null}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                                    selectedReaction === reaction.type
                                        ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                                        : selectedReaction
                                        ? 'bg-gray-100 opacity-50'
                                        : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'
                                }`}
                            >
                                <span className="text-3xl">{reaction.emoji}</span>
                                <span className="text-xs font-medium text-gray-700">{reaction.label}</span>
                            </button>
                        ))}
                    </div>
                    {selectedReaction && (
                        <p className="text-center text-sm text-green-600 mt-4 font-medium animate-bounce">
                            ✓ شكراً لتفاعلك!
                        </p>
                    )}
                </div>

                {/* Related News */}
                {relatedNews.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">أخبار ذات صلة</h3>
                        <div className="space-y-3">
                            {relatedNews.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/member/news/${item.id}`)}
                                    className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex gap-3">
                                        {item.image_url && (
                                            <div className="w-20 h-20 flex-shrink-0">
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title_ar}
                                                    className="w-full h-full object-cover rounded-lg"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 line-clamp-2 mb-1">
                                                {item.title_ar || item.title_en}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {getTimeAgo(item.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Fixed Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200 p-4 z-50">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-colors"
                    >
                        رجوع
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                    >
                        مشاركة
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewsDetail;
