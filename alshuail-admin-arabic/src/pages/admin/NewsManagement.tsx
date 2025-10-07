import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatHijri } from '../../utils/hijriDate.js';
import SimpleHijriDatePicker from '../../components/Common/SimpleHijriDatePicker';

interface NewsItem {
    id: number;
    title_ar?: string;
    title_en?: string;
    content_ar?: string;
    content_en?: string;
    category: string;
    priority?: string;
    is_published?: boolean;
    views_count?: number;
    reads_count?: number;
    reactions_count?: number;
    image_url?: string;
    video_url?: string;
    created_at?: string;
}

// Force component to be included in bundle
if (process.env.NODE_ENV !== 'test') {
  console.log('[NewsManagement] Component loaded');
}

const NewsManagement = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewNews, setPreviewNews] = useState<NewsItem | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ar'); // ar or en
    const [showPushModal, setShowPushModal] = useState(false);
    const [pushingNewsId, setPushingNewsId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState<{
        title_ar: string;
        title_en: string;
        content_ar: string;
        content_en: string;
        category: string;
        priority: string;
        is_published: boolean;
        images: File[];
        publish_date: string;
    }>({
        title_ar: '',
        title_en: '',
        content_ar: '',
        content_en: '',
        category: '',
        priority: '',
        is_published: false,
        images: [],
        publish_date: ''
    });

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

    useEffect(() => {
        fetchNews();
    }, [selectedCategory]);

    const fetchNews = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
            const response = await axios.get(`${API_URL}/news`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setNews(response.data.news || []);
            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            setNews([]);
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.category) {
            alert('الرجاء اختيار التصنيف');
            return;
        }
        if (!formData.priority) {
            alert('الرجاء اختيار الأولوية');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const formDataToSend = new FormData();

            // Append text fields
            Object.keys(formData).forEach((key) => {
                if (key !== 'images') {
                    const value = formData[key as keyof typeof formData];
                    if (typeof value === 'string' || typeof value === 'boolean') {
                        formDataToSend.append(key, String(value));
                    }
                }
            });

            // Append images
            if (formData.images && formData.images.length > 0) {
                formData.images.forEach(image => {
                    formDataToSend.append('images', image);
                });
            }

            await axios.post(`${API_URL}/news`, formDataToSend, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('تم إنشاء الخبر بنجاح!');
            setShowCreateModal(false);
            fetchNews();
            resetForm();
        } catch (error: any) {
            alert('خطأ: ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePushNotification = async (newsId: number) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/news/${newsId}/push-notification`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Show success animation
            setPushingNewsId(newsId);
            setTimeout(() => {
                setPushingNewsId(null);
                alert('تم إرسال الإشعار إلى 344 عضو بنجاح!');
            }, 2000);

            setShowPushModal(false);
        } catch (error: any) {
            alert('خطأ في إرسال الإشعار: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setFormData({ ...formData, images: [...formData.images, ...files] });
    };

    const removeImage = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData({ ...formData, images: newImages });
    };

    const resetForm = () => {
        setFormData({
            title_ar: '',
            title_en: '',
            content_ar: '',
            content_en: '',
            category: '',
            priority: '',
            is_published: false,
            images: [],
            publish_date: ''
        });
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

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            announcement: 'bg-blue-500',
            urgent: 'bg-red-500',
            event: 'bg-purple-500',
            general: 'bg-gray-500'
        };
        return colors[category] || 'bg-gray-500';
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            high: 'text-red-600',
            normal: 'text-gray-600',
            low: 'text-gray-400'
        };
        return colors[priority] || 'text-gray-600';
    };

    const filteredNews = news.filter(item =>
        item.title_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title_en?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8" dir="rtl">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="bg-white rounded-2xl shadow-xl p-6 backdrop-blur-lg bg-opacity-90">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                إدارة الأخبار
                            </h1>
                            <p className="text-gray-600">إنشاء وإدارة أخبار العائلة</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 font-bold"
                        >
                            <span className="text-2xl">+</span>
                            <span>خبر جديد</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="bg-white rounded-xl shadow-lg p-4 backdrop-blur-lg bg-opacity-90">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="بحث في الأخبار..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        {/* Category Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {['all', 'announcement', 'urgent', 'event', 'general'].map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-6 py-3 rounded-lg transition-all duration-200 whitespace-nowrap font-medium ${
                                        selectedCategory === category
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    {category === 'all' ? 'الكل' : getCategoryText(category)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="text-sm opacity-90 mb-2">إجمالي الأخبار</div>
                        <div className="text-4xl font-bold">{news.length}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="text-sm opacity-90 mb-2">المنشورة</div>
                        <div className="text-4xl font-bold">
                            {news.filter(n => n.is_published).length}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="text-sm opacity-90 mb-2">المسودات</div>
                        <div className="text-4xl font-bold">
                            {news.filter(n => !n.is_published).length}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="text-sm opacity-90 mb-2">العاجلة</div>
                        <div className="text-4xl font-bold">
                            {news.filter(n => n.category === 'urgent').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* News Grid */}
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNews.map(item => (
                        <div
                            key={item.id}
                            className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group ${
                                item.category === 'urgent' ? 'ring-2 ring-red-500 ring-offset-2' : ''
                            }`}
                        >
                            {/* Category Badge */}
                            <div className={`h-2 ${getCategoryColor(item.category)}`}></div>

                            <div className="p-6">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                                            {item.title_ar || item.title_en || 'بدون عنوان'}
                                        </h3>
                                        <div className="flex gap-2 flex-wrap">
                                            <span className={`px-2 py-1 rounded text-xs text-white ${getCategoryColor(item.category)}`}>
                                                {getCategoryText(item.category)}
                                            </span>
                                            {!item.is_published && (
                                                <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                                                    مسودة
                                                </span>
                                            )}
                                            {item.priority === 'high' && (
                                                <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                                                    عالية الأولوية
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Preview */}
                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                    {item.content_ar || item.content_en || 'لا يوجد محتوى'}
                                </p>

                                {/* Stats */}
                                <div className="flex gap-4 text-sm text-gray-500 mb-4 pb-4 border-b">
                                    <div className="flex items-center gap-1">
                                        <span>👁️</span>
                                        <span>{item.views_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>✓</span>
                                        <span>{item.reads_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>❤️</span>
                                        <span>{item.reactions_count || 0}</span>
                                    </div>
                                </div>

                                {/* Hijri Date */}
                                {item.created_at && (
                                    <div className="mb-4 p-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                        <p className="text-xs text-green-800 font-medium flex items-center gap-2">
                                            <span>📅</span>
                                            <span>{formatHijri(item.created_at)}</span>
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setPreviewNews(item);
                                                setShowPreviewModal(true);
                                            }}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                                        >
                                            معاينة
                                        </button>
                                        <button
                                            onClick={() => window.location.href = `/admin/news/${item.id}/edit`}
                                            className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                                        >
                                            تعديل
                                        </button>
                                    </div>

                                    {/* BIG RED PUSH NOTIFICATION BUTTON */}
                                    {item.is_published && (
                                        <button
                                            onClick={() => {
                                                setPreviewNews(item);
                                                setShowPushModal(true);
                                            }}
                                            disabled={pushingNewsId === item.id}
                                            className={`w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-bold text-sm transition-all duration-300 hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2 ${
                                                pushingNewsId === item.id ? 'animate-pulse' : ''
                                            }`}
                                        >
                                            {pushingNewsId === item.id ? (
                                                <>
                                                    <span className="animate-spin">⚡</span>
                                                    <span>جاري الإرسال...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-xl">📢</span>
                                                    <span>إرسال إشعار لجميع الأعضاء</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredNews.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-gray-400 text-8xl mb-6">📰</div>
                        <p className="text-gray-600 text-2xl mb-4">لا توجد أخبار حالياً</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
                        >
                            إنشاء أول خبر
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center rounded-t-2xl">
                            <h2 className="text-2xl font-bold">إنشاء خبر جديد</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-all"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6">
                            {/* Language Tabs */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('ar')}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                                        activeTab === 'ar'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    العربية
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('en')}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                                        activeTab === 'en'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    English
                                </button>
                            </div>

                            {/* Arabic Content */}
                            {activeTab === 'ar' && (
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            العنوان بالعربية *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title_ar}
                                            onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                            dir="rtl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            المحتوى بالعربية *
                                        </label>
                                        <textarea
                                            value={formData.content_ar}
                                            onChange={(e) => setFormData({ ...formData, content_ar: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows={8}
                                            required
                                            dir="rtl"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* English Content */}
                            {activeTab === 'en' && (
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Title (English)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title_en}
                                            onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Content (English)
                                        </label>
                                        <textarea
                                            value={formData.content_en}
                                            onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows={8}
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        التصنيف
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            console.log('Category selected:', value);
                                            console.log('Before update:', formData);
                                            setFormData(prev => {
                                                const updated = { ...prev, category: value };
                                                console.log('After update:', updated);
                                                return updated;
                                            });
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">-- اختر التصنيف --</option>
                                        <option value="general">عام</option>
                                        <option value="announcement">إعلان</option>
                                        <option value="urgent">عاجل</option>
                                        <option value="event">حدث</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        الأولوية
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            console.log('Priority selected:', value);
                                            console.log('Before update:', formData);
                                            setFormData(prev => {
                                                const updated = { ...prev, priority: value };
                                                console.log('After update:', updated);
                                                return updated;
                                            });
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">-- اختر الأولوية --</option>
                                        <option value="low">منخفضة</option>
                                        <option value="normal">عادية</option>
                                        <option value="high">عالية</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        الحالة
                                    </label>
                                    <label className="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_published}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setFormData(prev => ({ ...prev, is_published: checked }));
                                            }}
                                            className="w-5 h-5 text-blue-600"
                                        />
                                        <span className="font-medium">نشر مباشرة</span>
                                    </label>
                                </div>
                            </div>

                            {/* Hijri Date Picker */}
                            <div className="mb-6">
                                <SimpleHijriDatePicker
                                    label="تاريخ النشر / الحدث"
                                    value={formData.publish_date}
                                    onChange={(date: string) => setFormData({ ...formData, publish_date: date })}
                                    required={false}
                                />
                            </div>

                            {/* Image Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    الصور والمرفقات
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                                >
                                    <div className="text-6xl mb-2">📁</div>
                                    <p className="text-gray-600 font-medium">اضغط لرفع الصور</p>
                                    <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF حتى 10MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </div>

                                {/* Image Preview */}
                                {formData.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        {formData.images.map((image, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={URL.createObjectURL(image)}
                                                    alt={`Preview ${index}`}
                                                    className="w-full h-32 object-cover rounded-lg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg transition-colors duration-200 font-bold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg transition-all duration-200 font-bold shadow-lg hover:shadow-xl"
                                >
                                    إنشاء الخبر
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Push Notification Confirmation Modal */}
            {showPushModal && previewNews && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-bounce-in">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl">
                            <div className="text-6xl text-center mb-4">⚠️</div>
                            <h2 className="text-2xl font-bold text-center">تأكيد الإرسال</h2>
                        </div>
                        <div className="p-6">
                            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                                <p className="text-center text-lg font-bold mb-2">
                                    سيتم إرسال إشعار إلى
                                </p>
                                <p className="text-center text-5xl font-bold text-red-600 mb-2">
                                    344
                                </p>
                                <p className="text-center text-lg font-bold">
                                    عضو من عائلة الشعيل
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="font-bold text-gray-700 mb-2">معاينة الإشعار:</p>
                                <p className="text-gray-600 line-clamp-2">
                                    {previewNews.title_ar || previewNews.title_en}
                                </p>
                            </div>

                            {/* Hijri Date */}
                            {previewNews.created_at && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-6">
                                    <p className="text-sm text-green-800 font-medium text-center flex items-center justify-center gap-2">
                                        <span>📅</span>
                                        <span>التاريخ الهجري: {formatHijri(previewNews.created_at)}</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPushModal(false)}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg transition-colors font-bold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={() => handlePushNotification(previewNews.id)}
                                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-bold transition-all hover:shadow-xl"
                                >
                                    تأكيد الإرسال
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && previewNews && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center rounded-t-2xl">
                            <h2 className="text-2xl font-bold">معاينة الخبر</h2>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-full text-sm text-white ${getCategoryColor(previewNews.category)}`}>
                                    {getCategoryText(previewNews.category)}
                                </span>
                                {!previewNews.is_published && (
                                    <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                                        مسودة
                                    </span>
                                )}
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 mb-4">
                                {previewNews.title_ar || previewNews.title_en}
                            </h3>
                            {previewNews.title_en && (
                                <h4 className="text-xl text-gray-600 mb-4" dir="ltr">
                                    {previewNews.title_en}
                                </h4>
                            )}
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
                                {previewNews.content_ar || previewNews.content_en}
                            </p>
                            {previewNews.content_en && (
                                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed" dir="ltr">
                                    {previewNews.content_en}
                                </p>
                            )}
                            <div className="flex gap-4 text-sm text-gray-500 mt-6 pt-6 border-t">
                                <div>المشاهدات: {previewNews.views_count || 0}</div>
                                <div>القراءات: {previewNews.reads_count || 0}</div>
                                <div>التفاعلات: {previewNews.reactions_count || 0}</div>
                            </div>

                            {/* Hijri Date */}
                            {previewNews.created_at && (
                                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800 font-medium flex items-center justify-center gap-2">
                                        <span>📅</span>
                                        <span>تاريخ النشر: {formatHijri(previewNews.created_at)}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewsManagement;
