import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toHijri, toGregorian } from 'hijri-converter';
import SimpleHijriDatePicker from '../../components/Common/SimpleHijriDatePicker';
import { HijriDateInput } from '../../components/Common/HijriDateInput';
import useActiveMemberCount from '../../hooks/useActiveMemberCount';
import MemberCountToast from '../../components/Common/MemberCountToast';

import { logger } from '../../utils/logger';

interface Initiative {
    id: number;
    title_ar?: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    beneficiary_name_ar?: string;
    beneficiary_name_en?: string;
    target_amount: number;
    current_amount: number;
    status: string;
    min_contribution?: number;
    max_contribution?: number;
    start_date?: string;
    end_date?: string;
    created_at?: string;
}

// Force component to be included in bundle
if (process.env.NODE_ENV !== 'test') {
  logger.debug('[InitiativesManagement] Component loaded');
}

const InitiativesManagement = () => {
    const navigate = useNavigate();
    const [initiatives, setInitiatives] = useState<Initiative[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingInitiative, setDeletingInitiative] = useState<Initiative | null>(null);
    const [deletingInitiativeId, setDeletingInitiativeId] = useState<number | null>(null);
    const [showPushModal, setShowPushModal] = useState(false);
    const [previewInitiative, setPreviewInitiative] = useState<Initiative | null>(null);
    const [pushingInitiativeId, setPushingInitiativeId] = useState<number | null>(null);
    const [showToast, setShowToast] = useState(false);

    // Hijri Date Range Filter
    const [fromHijriDate, setFromHijriDate] = useState('');
    const [fromGregorianDate, setFromGregorianDate] = useState('');
    const [toHijriDate, setToHijriDate] = useState('');
    const [toGregorianDate, setToGregorianDate] = useState('');
    const [showDateFilter, setShowDateFilter] = useState(false);

    // Real-time member count with 10-second auto-refresh and change detection
    const {
        count: memberCount,
        loading: loadingMemberCount,
        hasChanged,
        trend,
        changeAmount,
        previousCount,
        lastUpdated
    } = useActiveMemberCount({
        onCountChange: (newCount, prevCount) => {
            // Show toast when count changes
            setShowToast(true);
            logger.debug(`[Initiatives] Member count changed: ${prevCount} → ${newCount}`);
        }
    });

    // Form state
    const [formData, setFormData] = useState({
        title_ar: '', title_en: '', description_ar: '', description_en: '',
        beneficiary_name_ar: '', beneficiary_name_en: '',
        target_amount: '', min_contribution: '', max_contribution: '',
        start_date: '', end_date: '', status: 'draft'
    });

    const API_URL = (process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com')) + '/api';

    useEffect(() => {
        fetchInitiatives();
    }, [selectedStatus]);

    const fetchInitiatives = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
            const response = await axios.get(`${API_URL}/initiatives-enhanced/admin/all`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setInitiatives(response.data.initiatives || []);
            setLoading(false);
        } catch (error) {
            logger.error('Fetch error:', { error });
            setInitiatives([]);
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            if (isEditMode && editingInitiative) {
                // UPDATE existing initiative
                await axios.put(
                    `${API_URL}/initiatives-enhanced/${editingInitiative.id}`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                alert('تم تحديث المبادرة بنجاح!');
            } else {
                // CREATE new initiative
                await axios.post(
                    `${API_URL}/initiatives-enhanced`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                alert('تم إنشاء المبادرة بنجاح!');
            }

            setShowCreateModal(false);
            setIsEditMode(false);
            setEditingInitiative(null);
            fetchInitiatives();
            resetForm();
        } catch (error: any) {
            alert('خطأ: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleStatusChange = async (initiativeId: number, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${API_URL}/initiatives-enhanced/${initiativeId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('تم تحديث الحالة بنجاح');
            fetchInitiatives();
        } catch (error) {
            alert('خطأ في تحديث الحالة');
        }
    };

    const handlePushNotification = async (initiativeId: number) => {
        try {
            const token = localStorage.getItem('token');
            setPushingInitiativeId(initiativeId);

            const response = await axios.post(
                `${API_URL}/initiatives-enhanced/${initiativeId}/push-notification`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const recipientCount = response.data?.recipient_count || 0;
            const successMessage = response.data?.message || `تم إرسال الإشعار إلى ${recipientCount} عضو بنجاح!`;

            setTimeout(() => {
                setPushingInitiativeId(null);
                setShowPushModal(false);
                alert(`✅ ${successMessage}\n\n📊 عدد المستلمين: ${recipientCount}`);
            }, 1000);

        } catch (error: any) {
            setPushingInitiativeId(null);
            const errorMsg = error.response?.data?.errorAr || error.response?.data?.error || error.message;
            alert('❌ خطأ في إرسال الإشعار: ' + errorMsg);
        }
    };

    const handleDeleteInitiative = async (initiativeId: number) => {
        try {
            const token = localStorage.getItem('token');
            setDeletingInitiativeId(initiativeId);

            await axios.delete(`${API_URL}/initiatives-enhanced/${initiativeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ تم حذف المبادرة بنجاح!');
            setShowDeleteModal(false);
            setDeletingInitiative(null);
            setDeletingInitiativeId(null);
            fetchInitiatives();
        } catch (error: any) {
            setDeletingInitiativeId(null);
            alert('❌ خطأ في حذف المبادرة: ' + (error.response?.data?.error || error.message));
        }
    };

    const resetForm = () => {
        setFormData({
            title_ar: '', title_en: '', description_ar: '', description_en: '',
            beneficiary_name_ar: '', beneficiary_name_en: '',
            target_amount: '', min_contribution: '', max_contribution: '',
            start_date: '', end_date: '', status: 'draft'
        });
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            draft: 'bg-gray-500',
            active: 'bg-green-500',
            completed: 'bg-blue-500',
            archived: 'bg-purple-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const getStatusText = (status: string) => {
        const texts: Record<string, string> = {
            draft: 'مسودة',
            active: 'نشط',
            completed: 'مكتمل',
            archived: 'مؤرشف'
        };
        return texts[status] || status;
    };

    // Filter initiatives by Hijri date range (using Gregorian conversion for comparison)
    const filterInitiativesByHijriDate = (initiatives: Initiative[]) => {
        if (!fromGregorianDate && !toGregorianDate) return initiatives;

        return initiatives.filter(initiative => {
            // Check start_date field - initiatives may not have created_at
            if (!initiative.start_date && !initiative.created_at) return false;

            // Compare with Gregorian dates (database format)
            const itemDateStr = (initiative.start_date || initiative.created_at || '').split('T')[0];

            // Check if within range
            if (fromGregorianDate && itemDateStr < fromGregorianDate) return false;
            if (toGregorianDate && itemDateStr > toGregorianDate) return false;
            return true;
        });
    };

    // Apply filtering
    const filteredInitiatives = filterInitiativesByHijriDate(initiatives);

    // Clear date filters
    const clearDateFilters = () => {
        setFromHijriDate('');
        setFromGregorianDate('');
        setToHijriDate('');
        setToGregorianDate('');
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">إدارة المبادرات</h1>
                <button
                    onClick={() => {
                        setIsEditMode(false);
                        setEditingInitiative(null);
                        resetForm();
                        setShowCreateModal(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                    <span className="text-xl">+</span>
                    <span>مبادرة جديدة</span>
                </button>
            </div>

            {/* Status Filters */}
            <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
                {['all', 'draft', 'active', 'completed', 'archived'].map(status => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-6 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                            selectedStatus === status
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        {status === 'all' ? 'الكل' : getStatusText(status)}
                    </button>
                ))}
            </div>

            {/* Hijri Date Range Filter - Apple Style */}
            <div className="mb-6">
                <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md transition-all duration-200"
                >
                    <span className="text-2xl">📅</span>
                    <span className="font-medium text-gray-700">تصفية بالتاريخ الهجري</span>
                    <span className={`mr-auto transform transition-transform duration-200 ${showDateFilter ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {showDateFilter && (
                    <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* From Date - Hijri Input */}
                            <HijriDateInput
                                value={fromHijriDate}
                                onChange={(hijri, gregorian) => {
                                    setFromHijriDate(hijri);
                                    setFromGregorianDate(gregorian);
                                }}
                                label="من تاريخ (هجري)"
                                minYear={1440}
                                maxYear={1450}
                            />

                            {/* To Date - Hijri Input */}
                            <HijriDateInput
                                value={toHijriDate}
                                onChange={(hijri, gregorian) => {
                                    setToHijriDate(hijri);
                                    setToGregorianDate(gregorian);
                                }}
                                label="إلى تاريخ (هجري)"
                                minYear={1440}
                                maxYear={1450}
                            />
                        </div>

                        {/* Filter Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={clearDateFilters}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-all duration-200"
                            >
                                مسح الفلاتر
                            </button>
                            <button
                                onClick={() => setShowDateFilter(false)}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                تطبيق
                            </button>
                        </div>

                        {/* Active Filters Display */}
                        {(fromHijriDate || toHijriDate) && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                    <span className="font-semibold text-gray-700">الفلاتر النشطة (تاريخ هجري):</span>
                                    {fromHijriDate && (
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                                            من: {fromHijriDate} هـ
                                        </span>
                                    )}
                                    {toHijriDate && (
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                                            إلى: {toHijriDate} هـ
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Statistics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">إجمالي المبادرات</div>
                    <div className="text-2xl font-bold">{filteredInitiatives.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">المبادرات النشطة</div>
                    <div className="text-2xl font-bold text-green-600">
                        {filteredInitiatives.filter(i => i.status === 'active').length}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">المبلغ المستهدف الإجمالي</div>
                    <div className="text-2xl font-bold">
                        {filteredInitiatives.reduce((sum, i) => sum + (i.target_amount || 0), 0).toLocaleString('en-US')} ر.س
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">المبلغ المحصل</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {filteredInitiatives.reduce((sum, i) => sum + (i.current_amount || 0), 0).toLocaleString('en-US')} ر.س
                    </div>
                </div>
            </div>

            {/* Initiatives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInitiatives.map(init => (
                    <div key={init.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden">
                        <div className={`h-2 ${getStatusColor(init.status)}`}></div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-gray-800">{init.title_ar || 'بدون عنوان'}</h3>
                                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(init.status)}`}>
                                    {getStatusText(init.status)}
                                </span>
                            </div>

                            {init.beneficiary_name_ar && (
                                <p className="text-sm text-gray-600 mb-3">المستفيد: {init.beneficiary_name_ar}</p>
                            )}

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>التقدم</span>
                                    <span>{init.target_amount ? ((init.current_amount / init.target_amount) * 100).toFixed(0) : 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${init.target_amount ? Math.min((init.current_amount / init.target_amount * 100), 100) : 0}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-600">
                                        {(init.current_amount || 0).toLocaleString('en-US')} ر.س
                                    </span>
                                    <span className="font-bold">
                                        {(init.target_amount || 0).toLocaleString('en-US')} ر.س
                                    </span>
                                </div>
                            </div>

                            {/* Contribution Limits */}
                            {(init.min_contribution || init.max_contribution) && (
                                <div className="text-xs text-gray-500 mb-3">
                                    {init.min_contribution && <span>الحد الأدنى: {init.min_contribution} ر.س</span>}
                                    {init.min_contribution && init.max_contribution && <span> | </span>}
                                    {init.max_contribution && <span>الحد الأقصى: {init.max_contribution} ر.س</span>}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                <button
                                    onClick={() => navigate(`/admin/initiatives/${init.id}/report`)}
                                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-1"
                                >
                                    <span>📊</span>
                                    <span>تقرير</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingInitiative(init);
                                        setIsEditMode(true);
                                        setFormData({
                                            title_ar: init.title_ar || '',
                                            title_en: init.title_en || '',
                                            description_ar: init.description_ar || '',
                                            description_en: init.description_en || '',
                                            beneficiary_name_ar: init.beneficiary_name_ar || '',
                                            beneficiary_name_en: init.beneficiary_name_en || '',
                                            target_amount: String(init.target_amount || ''),
                                            min_contribution: String(init.min_contribution || ''),
                                            max_contribution: String(init.max_contribution || ''),
                                            start_date: '',
                                            end_date: '',
                                            status: init.status || 'draft'
                                        });
                                        setShowCreateModal(true);
                                    }}
                                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                                >
                                    تعديل
                                </button>
                                <button
                                    onClick={() => {
                                        setDeletingInitiative(init);
                                        setShowDeleteModal(true);
                                    }}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                                >
                                    حذف
                                </button>
                                {init.status === 'draft' && (
                                    <button
                                        onClick={() => handleStatusChange(init.id, 'active')}
                                        className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors duration-200 text-sm"
                                    >
                                        تفعيل
                                    </button>
                                )}
                                {init.status === 'active' && (
                                    <button
                                        onClick={() => handleStatusChange(init.id, 'completed')}
                                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors duration-200 text-sm"
                                    >
                                        إكمال
                                    </button>
                                )}
                            </div>

                            {/* Push Notification Button */}
                            <button
                                onClick={() => {
                                    setPreviewInitiative(init);
                                    setShowPushModal(true);
                                    // Member count updates automatically every 10 seconds via useActiveMemberCount hook
                                }}
                                disabled={pushingInitiativeId === init.id}
                                className={`w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-bold text-sm transition-all duration-300 hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2 ${
                                    pushingInitiativeId === init.id ? 'animate-pulse' : ''
                                }`}
                            >
                                {pushingInitiativeId === init.id ? (
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
                        </div>
                    </div>
                ))}
            </div>

            {initiatives.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📋</div>
                    <p className="text-gray-600 text-xl">لا توجد مبادرات حالياً</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        إنشاء أول مبادرة
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-6xl h-[95vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                            <h2 className="text-2xl font-bold">
                                {isEditMode ? 'تعديل المبادرة' : 'إنشاء مبادرة جديدة'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setIsEditMode(false);
                                    setEditingInitiative(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        العنوان (عربي) *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title_ar}
                                        onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        العنوان (إنجليزي)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title_en}
                                        onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        اسم المستفيد (عربي)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.beneficiary_name_ar}
                                        onChange={(e) => setFormData({ ...formData, beneficiary_name_ar: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        اسم المستفيد (إنجليزي)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.beneficiary_name_en}
                                        onChange={(e) => setFormData({ ...formData, beneficiary_name_en: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الوصف (عربي)
                                </label>
                                <textarea
                                    value={formData.description_ar}
                                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الوصف (إنجليزي)
                                </label>
                                <textarea
                                    value={formData.description_en}
                                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        المبلغ المستهدف *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.target_amount}
                                        onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        الحد الأدنى للمساهمة
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.min_contribution}
                                        onChange={(e) => setFormData({ ...formData, min_contribution: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        الحد الأقصى للمساهمة
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.max_contribution}
                                        onChange={(e) => setFormData({ ...formData, max_contribution: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <SimpleHijriDatePicker
                                        label="تاريخ البداية"
                                        value={formData.start_date}
                                        onChange={(date: string) => setFormData({ ...formData, start_date: date })}
                                        required={false}
                                    />
                                </div>
                                <div>
                                    <SimpleHijriDatePicker
                                        label="تاريخ النهاية"
                                        value={formData.end_date}
                                        onChange={(date: string) => setFormData({ ...formData, end_date: date })}
                                        required={false}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الحالة
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="draft">مسودة</option>
                                    <option value="active">نشط</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setIsEditMode(false);
                                        setEditingInitiative(null);
                                    }}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg transition-colors duration-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg transition-all duration-200"
                                >
                                    {isEditMode ? 'حفظ التعديلات' : 'إنشاء المبادرة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingInitiative && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">تأكيد الحذف</h3>
                        <p className="text-gray-600 mb-6">
                            هل أنت متأكد من حذف المبادرة "{deletingInitiative.title_ar || 'بدون عنوان'}"؟
                            لا يمكن التراجع عن هذا الإجراء.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingInitiative(null);
                                }}
                                disabled={deletingInitiativeId !== null}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg transition-colors duration-200"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => handleDeleteInitiative(deletingInitiative.id)}
                                disabled={deletingInitiativeId !== null}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors duration-200"
                            >
                                {deletingInitiativeId ? 'جاري الحذف...' : 'حذف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Push Notification Modal */}
            {showPushModal && previewInitiative && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl p-6">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">إرسال إشعار للأعضاء</h3>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h4 className="font-bold text-blue-900 mb-2">{previewInitiative.title_ar || 'بدون عنوان'}</h4>
                            {previewInitiative.description_ar && (
                                <p className="text-blue-800 text-sm mb-2">{previewInitiative.description_ar.substring(0, 150)}...</p>
                            )}
                            <p className="text-blue-700 text-sm">
                                المبلغ المستهدف: {previewInitiative.target_amount.toLocaleString('en-US')} ر.س
                            </p>
                        </div>

                        <div className={`border rounded-lg p-4 mb-6 transition-all duration-500 ${
                            hasChanged
                                ? 'bg-gradient-to-r from-green-100 to-blue-100 border-green-400 shadow-lg scale-105'
                                : 'bg-green-50 border-green-200'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">👥</span>
                                    <span className="font-bold text-green-900">عدد المستلمين</span>
                                </div>
                                {hasChanged && (
                                    <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                                        تم التحديث الآن!
                                    </span>
                                )}
                            </div>
                            {loadingMemberCount ? (
                                <p className="text-green-700">جاري التحميل...</p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-3xl font-bold text-green-600">{memberCount} عضو نشط</p>
                                        {trend === 'increased' && (
                                            <span className="text-2xl text-green-500 animate-bounce">↑</span>
                                        )}
                                        {trend === 'decreased' && (
                                            <span className="text-2xl text-red-500 animate-bounce">↓</span>
                                        )}
                                    </div>
                                    {previousCount !== null && changeAmount !== 0 && (
                                        <p className="text-sm text-gray-600">
                                            {changeAmount > 0 ? '+' : ''}{changeAmount} من {previousCount} عضو
                                        </p>
                                    )}
                                    {lastUpdated && (
                                        <p className="text-xs text-gray-500">
                                            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <p className="text-gray-600 text-sm mb-6">
                            سيتم إرسال إشعار فوري لجميع الأعضاء النشطين عن هذه المبادرة.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowPushModal(false);
                                    setPreviewInitiative(null);
                                }}
                                disabled={pushingInitiativeId !== null}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg transition-colors duration-200"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => handlePushNotification(previewInitiative.id)}
                                disabled={pushingInitiativeId !== null}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {pushingInitiativeId ? (
                                    <>
                                        <span className="animate-spin">⚡</span>
                                        <span>جاري الإرسال...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📢</span>
                                        <span>إرسال الإشعار</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification for Member Count Changes */}
            <MemberCountToast
                show={showToast}
                memberCount={memberCount}
                previousCount={previousCount}
                trend={trend}
                changeAmount={changeAmount}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
};

export default InitiativesManagement;
