// @ts-nocheck
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { logger } from '../../utils/logger';

const Initiatives = () => {
    const navigate = useNavigate();
    const [activeInitiatives, setActiveInitiatives] = useState([]);
    const [completedInitiatives, setCompletedInitiatives] = useState([]);
    const [myContributions, setMyContributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // active, completed, myContributions
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [selectedInitiative, setSelectedInitiative] = useState(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [contributing, setContributing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

    useEffect(() => {
        fetchInitiatives();
        fetchMyContributions();
    }, []);

    const fetchInitiatives = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch active initiatives
            const activeResponse = await axios.get(`${API_URL}/initiatives-enhanced/active`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveInitiatives(activeResponse.data.initiatives || []);

            // Fetch completed initiatives
            const completedResponse = await axios.get(`${API_URL}/initiatives-enhanced/admin/all`, {
                params: { status: 'completed' },
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompletedInitiatives(completedResponse.data.initiatives || []);

            setLoading(false);
        } catch (error) {
            logger.error('Error fetching initiatives:', { error });
            setLoading(false);
        }
    };

    const fetchMyContributions = async () => {
        try {
            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');

            const response = await axios.get(
                `${API_URL}/initiatives-enhanced/my-contributions?member_id=${memberId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMyContributions(response.data.contributions || []);
        } catch (error) {
            logger.error('Error fetching contributions:', { error });
        }
    };

    const handleContributeClick = (initiative) => {
        setSelectedInitiative(initiative);
        setShowContributeModal(true);
        setContributeAmount('');
    };

    const handleContribute = async () => {
        if (!contributeAmount || parseFloat(contributeAmount) <= 0) {
            alert('يرجى إدخال مبلغ صحيح');
            return;
        }

        const amount = parseFloat(contributeAmount);
        const minAmount = parseFloat(selectedInitiative.min_contribution || 0);
        const maxAmount = parseFloat(selectedInitiative.max_contribution || Infinity);

        if (minAmount && amount < minAmount) {
            alert(`الحد الأدنى للمساهمة هو ${minAmount} ر.س`);
            return;
        }

        if (maxAmount && amount > maxAmount) {
            alert(`الحد الأقصى للمساهمة هو ${maxAmount} ر.س`);
            return;
        }

        try {
            setContributing(true);
            const token = localStorage.getItem('token');
            const memberId = localStorage.getItem('memberId');

            await axios.post(
                `${API_URL}/initiatives-enhanced/${selectedInitiative.id}/contribute`,
                {
                    member_id: memberId,
                    amount: amount,
                    payment_method: 'cash'
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccessMessage('✓ تمت المساهمة بنجاح! شكراً لدعمك');
            setTimeout(() => {
                setShowContributeModal(false);
                setSuccessMessage('');
                fetchInitiatives();
                fetchMyContributions();
            }, 2000);
        } catch (error) {
            alert('خطأ: ' + (error.response?.data?.error || error.message));
        } finally {
            setContributing(false);
        }
    };

    const getProgressPercentage = (current, target) => {
        return Math.min((current / target) * 100, 100).toFixed(0);
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 75) return 'from-green-500 to-green-600';
        if (percentage >= 50) return 'from-blue-500 to-blue-600';
        if (percentage >= 25) return 'from-yellow-500 to-yellow-600';
        return 'from-red-500 to-red-600';
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toLocaleString('ar-SA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20" dir="rtl">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white shadow-md">
                <div className="px-4 py-4">
                    <div className="flex items-center gap-3 mb-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <span className="text-2xl">→</span>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">المبادرات الخيرية</h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                                activeTab === 'active'
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            النشطة ({activeInitiatives.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                                activeTab === 'completed'
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            المكتملة ({completedInitiatives.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('myContributions')}
                            className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                                activeTab === 'myContributions'
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            مساهماتي ({myContributions.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Initiatives */}
            {activeTab === 'active' && (
                <div className="px-4 py-6 space-y-4">
                    {activeInitiatives.map((initiative) => {
                        const progress = getProgressPercentage(
                            initiative.current_amount,
                            initiative.target_amount
                        );
                        const remaining = initiative.target_amount - initiative.current_amount;

                        return (
                            <div
                                key={initiative.id}
                                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                {/* Header with Gradient */}
                                <div className={`bg-gradient-to-r ${getProgressColor(progress)} p-6 text-white`}>
                                    <h3 className="text-xl font-bold mb-2">
                                        {initiative.title_ar || initiative.title_en}
                                    </h3>
                                    {initiative.beneficiary_name_ar && (
                                        <p className="text-sm opacity-90">
                                            المستفيد: {initiative.beneficiary_name_ar}
                                        </p>
                                    )}
                                </div>

                                <div className="p-6">
                                    {/* Description */}
                                    {initiative.description_ar && (
                                        <p className="text-gray-600 mb-4 line-clamp-2">
                                            {initiative.description_ar}
                                        </p>
                                    )}

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm font-bold mb-2">
                                            <span className="text-gray-700">التقدم</span>
                                            <span className="text-blue-600">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                            <div
                                                className={`bg-gradient-to-r ${getProgressColor(progress)} h-4 rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2`}
                                                style={{ width: `${progress}%` }}
                                            >
                                                {progress > 10 && (
                                                    <span className="text-xs text-white font-bold">
                                                        {progress}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amounts */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <div className="text-xs text-gray-600 mb-1">المبلغ المحصل</div>
                                            <div className="text-xl font-bold text-blue-600">
                                                {formatCurrency(initiative.current_amount)}
                                                <span className="text-sm mr-1">ر.س</span>
                                            </div>
                                        </div>
                                        <div className="bg-purple-50 rounded-xl p-4">
                                            <div className="text-xs text-gray-600 mb-1">المبلغ المستهدف</div>
                                            <div className="text-xl font-bold text-purple-600">
                                                {formatCurrency(initiative.target_amount)}
                                                <span className="text-sm mr-1">ر.س</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remaining Amount */}
                                    {remaining > 0 && (
                                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 mb-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">
                                                    المتبقي للوصول للهدف
                                                </span>
                                                <span className="text-lg font-bold text-yellow-600">
                                                    {formatCurrency(remaining)} ر.س
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contribution Limits */}
                                    {(initiative.min_contribution || initiative.max_contribution) && (
                                        <div className="text-xs text-gray-500 mb-4 text-center">
                                            {initiative.min_contribution && (
                                                <span>الحد الأدنى: {formatCurrency(initiative.min_contribution)} ر.س</span>
                                            )}
                                            {initiative.min_contribution && initiative.max_contribution && (
                                                <span> | </span>
                                            )}
                                            {initiative.max_contribution && (
                                                <span>الحد الأقصى: {formatCurrency(initiative.max_contribution)} ر.س</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Contribute Button */}
                                    <button
                                        onClick={() => handleContributeClick(initiative)}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                                    >
                                        ساهم الآن 🤲
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {activeInitiatives.length === 0 && (
                        <div className="text-center py-16">
                            <div className="text-8xl mb-4">🎯</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                لا توجد مبادرات نشطة حالياً
                            </h2>
                            <p className="text-gray-600">تابعنا لمعرفة المبادرات الجديدة</p>
                        </div>
                    )}
                </div>
            )}

            {/* Completed Initiatives */}
            {activeTab === 'completed' && (
                <div className="px-4 py-6 space-y-4">
                    {completedInitiatives.map((initiative) => (
                        <div
                            key={initiative.id}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden"
                        >
                            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">✓</span>
                                    <span className="font-bold">مكتملة</span>
                                </div>
                                <h3 className="text-xl font-bold">
                                    {initiative.title_ar || initiative.title_en}
                                </h3>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-sm text-gray-600 mb-1">المبلغ المحصل</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {formatCurrency(initiative.current_amount)} ر.س
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-600 mb-1">عدد المساهمين</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {initiative.contributors_count || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {completedInitiatives.length === 0 && (
                        <div className="text-center py-16">
                            <div className="text-8xl mb-4">🏆</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                لا توجد مبادرات مكتملة
                            </h2>
                        </div>
                    )}
                </div>
            )}

            {/* My Contributions */}
            {activeTab === 'myContributions' && (
                <div className="px-4 py-6 space-y-4">
                    {myContributions.map((contribution) => (
                        <div
                            key={contribution.id}
                            className="bg-white rounded-2xl shadow-lg p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 mb-1">
                                        {contribution.initiative_title}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {new Date(contribution.created_at).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {formatCurrency(contribution.amount)}
                                    </div>
                                    <div className="text-sm text-gray-500">ر.س</div>
                                </div>
                            </div>
                            <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                                contribution.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : contribution.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                                {contribution.status === 'approved' ? 'تمت الموافقة' :
                                 contribution.status === 'pending' ? 'قيد المراجعة' : contribution.status}
                            </div>
                        </div>
                    ))}

                    {myContributions.length === 0 && (
                        <div className="text-center py-16">
                            <div className="text-8xl mb-4">🤲</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                لم تساهم بعد
                            </h2>
                            <p className="text-gray-600 mb-6">ابدأ بالمساهمة في المبادرات الخيرية</p>
                            <button
                                onClick={() => setActiveTab('active')}
                                className="bg-purple-600 text-white px-8 py-3 rounded-xl hover:bg-purple-700 font-bold"
                            >
                                تصفح المبادرات
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Contribute Modal */}
            {showContributeModal && selectedInitiative && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl">
                            <h2 className="text-2xl font-bold text-center">المساهمة</h2>
                        </div>

                        <div className="p-6">
                            <h3 className="font-bold text-gray-800 mb-4 text-center">
                                {selectedInitiative.title_ar}
                            </h3>

                            {successMessage ? (
                                <div className="text-center py-8">
                                    <div className="text-6xl mb-4 animate-bounce">✓</div>
                                    <p className="text-xl font-bold text-green-600">{successMessage}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            المبلغ (ر.س)
                                        </label>
                                        <input
                                            type="number"
                                            value={contributeAmount}
                                            onChange={(e) => setContributeAmount(e.target.value)}
                                            placeholder="أدخل المبلغ"
                                            className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-center"
                                            min="0"
                                            step="1"
                                        />
                                        {selectedInitiative.min_contribution && (
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                الحد الأدنى: {formatCurrency(selectedInitiative.min_contribution)} ر.س
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowContributeModal(false)}
                                            disabled={contributing}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition-colors"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            onClick={handleContribute}
                                            disabled={contributing}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
                                        >
                                            {contributing ? 'جاري المساهمة...' : 'تأكيد المساهمة'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Initiatives;
