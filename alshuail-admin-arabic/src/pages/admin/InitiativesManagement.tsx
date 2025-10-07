import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatHijri, toHijri } from '../../utils/hijriDate';

interface Initiative {
    id: number;
    title_ar?: string;
    title_en?: string;
    beneficiary_name_ar?: string;
    beneficiary_name_en?: string;
    target_amount: number;
    current_amount: number;
    status: string;
    min_contribution?: number;
    max_contribution?: number;
}

// Force component to be included in bundle
if (process.env.NODE_ENV !== 'test') {
  console.log('[InitiativesManagement] Component loaded');
}

const InitiativesManagement = () => {
    const [initiatives, setInitiatives] = useState<Initiative[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('all');

    // Form state
    const [formData, setFormData] = useState({
        title_ar: '', title_en: '', description_ar: '', description_en: '',
        beneficiary_name_ar: '', beneficiary_name_en: '',
        target_amount: '', min_contribution: '', max_contribution: '',
        start_date: '', end_date: '', status: 'draft'
    });

    useEffect(() => {
        fetchInitiatives();
    }, [selectedStatus]);

    const fetchInitiatives = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/initiatives-enhanced/admin/all`,
                { params, headers: { Authorization: `Bearer ${token}` } }
            );
            setInitiatives(response.data.initiatives || []);
            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            setInitiatives([]);
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.REACT_APP_API_URL}/api/initiatives-enhanced`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('تم إنشاء المبادرة بنجاح!');
            setShowCreateModal(false);
            fetchInitiatives();
            // Reset form
            setFormData({
                title_ar: '', title_en: '', description_ar: '', description_en: '',
                beneficiary_name_ar: '', beneficiary_name_en: '',
                target_amount: '', min_contribution: '', max_contribution: '',
                start_date: '', end_date: '', status: 'draft'
            });
        } catch (error: any) {
            alert('خطأ: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleStatusChange = async (initiativeId: number, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${process.env.REACT_APP_API_URL}/api/initiatives-enhanced/${initiativeId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('تم تحديث الحالة بنجاح');
            fetchInitiatives();
        } catch (error) {
            alert('خطأ في تحديث الحالة');
        }
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
                    onClick={() => setShowCreateModal(true)}
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

            {/* Statistics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">إجمالي المبادرات</div>
                    <div className="text-2xl font-bold">{initiatives.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">المبادرات النشطة</div>
                    <div className="text-2xl font-bold text-green-600">
                        {initiatives.filter(i => i.status === 'active').length}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">المبلغ المستهدف الإجمالي</div>
                    <div className="text-2xl font-bold">
                        {initiatives.reduce((sum, i) => sum + (i.target_amount || 0), 0).toLocaleString()} ر.س
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-gray-600 text-sm">المبلغ المحصل</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {initiatives.reduce((sum, i) => sum + (i.current_amount || 0), 0).toLocaleString()} ر.س
                    </div>
                </div>
            </div>

            {/* Initiatives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {initiatives.map(init => (
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
                                    <span>{((init.current_amount / init.target_amount) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((init.current_amount / init.target_amount * 100), 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-600">
                                        {(init.current_amount || 0).toLocaleString()} ر.س
                                    </span>
                                    <span className="font-bold">
                                        {(init.target_amount || 0).toLocaleString()} ر.س
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.location.href = `/admin/initiatives/${init.id}`}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg transition-colors duration-200"
                                >
                                    التفاصيل
                                </button>
                                {init.status === 'draft' && (
                                    <button
                                        onClick={() => handleStatusChange(init.id, 'active')}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors duration-200"
                                    >
                                        تفعيل
                                    </button>
                                )}
                                {init.status === 'active' && (
                                    <button
                                        onClick={() => handleStatusChange(init.id, 'completed')}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors duration-200"
                                    >
                                        إكمال
                                    </button>
                                )}
                            </div>
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

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                            <h2 className="text-2xl font-bold">إنشاء مبادرة جديدة</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        تاريخ البداية (ميلادي)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    {formData.start_date && (
                                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-800 font-medium">
                                                📅 التاريخ الهجري: {formatHijri(formData.start_date)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        تاريخ النهاية (ميلادي)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    {formData.end_date && (
                                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-800 font-medium">
                                                📅 التاريخ الهجري: {formatHijri(formData.end_date)}
                                            </p>
                                        </div>
                                    )}
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
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg transition-colors duration-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg transition-all duration-200"
                                >
                                    إنشاء المبادرة
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InitiativesManagement;