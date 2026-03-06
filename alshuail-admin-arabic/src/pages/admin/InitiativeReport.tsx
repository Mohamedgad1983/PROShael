/**
 * Initiative Report Page
 *
 * Comprehensive reporting for initiatives with:
 * - Financial analytics (collected, remaining, progress)
 * - List of contributors with amounts
 * - List of non-contributors
 * - Targeted notifications to non-contributors
 * - Export functionality
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { logger } from '../../utils/logger';

interface Initiative {
    id: number;
    title_ar?: string;
    title_en?: string;
    description_ar?: string;
    beneficiary_name_ar?: string;
    target_amount: number;
    current_amount: number;
    status: string;
    min_contribution?: number;
    max_contribution?: number;
}

interface Donation {
    id: number;
    amount: number;
    payment_method: string;
    payment_date: string;
    approved_by: string | null;
    approval_date: string | null;
    donor: {
        id: number;
        full_name?: string;
        full_name_en?: string;
        membership_number?: string;
    };
}

interface NonContributor {
    id: number;
    member_id: number;
    full_name?: string;
    full_name_en?: string;
    membership_number?: string;
    phone?: string;
    email?: string;
}

interface Stats {
    totalDonations: number;
    uniqueDonors: number;
    approvedAmount: number;
    progressPercentage: string;
}

interface NonContributorStats {
    totalActiveMembers: number;
    totalContributors: number;
    totalNonContributors: number;
    contributionRate: string;
}

const InitiativeReport = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [initiative, setInitiative] = useState<Initiative | null>(null);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [nonContributors, setNonContributors] = useState<NonContributor[]>([]);
    const [nonContributorStats, setNonContributorStats] = useState<NonContributorStats | null>(null);
    const [activeTab, setActiveTab] = useState<'contributors' | 'non-contributors'>('contributors');
    const [sendingNotification, setSendingNotification] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const API_URL = (process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com')) + '/api';

    useEffect(() => {
        fetchInitiativeReport();
        fetchNonContributors();
    }, [id]);

    const fetchInitiativeReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/initiatives-enhanced/${id}/details`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setInitiative(response.data.initiative);
            setDonations(response.data.donations || []);
            setStats(response.data.stats);
            setLoading(false);
        } catch (error) {
            logger.error('Error fetching initiative report:', { error });
            setLoading(false);
        }
    };

    const fetchNonContributors = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/initiatives-enhanced/${id}/non-contributors`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNonContributors(response.data.nonContributors || []);
            setNonContributorStats(response.data.stats);
        } catch (error) {
            logger.error('Error fetching non-contributors:', { error });
        }
    };

    const handleNotifyNonContributors = async () => {
        if (!window.confirm(`هل تريد إرسال تذكير لـ ${nonContributors.length} عضو غير مساهم؟`)) {
            return;
        }

        try {
            setSendingNotification(true);
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/initiatives-enhanced/${id}/notify-non-contributors`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(`✅ ${response.data.message}\n\n📊 معدل المساهمة: ${response.data.contributionRate}%`);
        } catch (error: any) {
            alert(`❌ ${error.response?.data?.errorAr || 'فشل إرسال التذكير'}`);
        } finally {
            setSendingNotification(false);
        }
    };

    const handleExportCSV = () => {
        const csvData = activeTab === 'contributors'
            ? donations.map(d => ({
                'رقم العضو': d.donor.membership_number || '',
                'الاسم': d.donor.full_name || d.donor.full_name_en || '',
                'المبلغ': d.amount,
                'طريقة الدفع': d.payment_method,
                'تاريخ الدفع': new Date(d.payment_date).toLocaleDateString('ar-SA'),
                'معتمد': d.approved_by ? 'نعم' : 'لا'
            }))
            : nonContributors.map(m => ({
                'رقم العضو': m.membership_number || '',
                'الاسم': m.full_name || m.full_name_en || '',
                'الهاتف': m.phone || '',
                'البريد الإلكتروني': m.email || ''
            }));

        const headers = Object.keys(csvData[0] || {});
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => headers.map(h => (row as any)[h]).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `initiative-${id}-${activeTab}-${Date.now()}.csv`;
        link.click();
    };

    const handleExportExcel = () => {
        const exportData = activeTab === 'contributors'
            ? donations.map(d => ({
                'رقم العضو': d.donor.membership_number || '',
                'الاسم': d.donor.full_name || d.donor.full_name_en || '',
                'المبلغ': d.amount,
                'طريقة الدفع': d.payment_method,
                'تاريخ الدفع': new Date(d.payment_date).toLocaleDateString('ar-SA'),
                'معتمد': d.approved_by ? 'نعم' : 'لا'
            }))
            : nonContributors.map(m => ({
                'رقم العضو': m.membership_number || '',
                'الاسم': m.full_name || m.full_name_en || '',
                'الهاتف': m.phone || '',
                'البريد الإلكتروني': m.email || ''
            }));

        // Create worksheet from data
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Set column widths for better readability
        const columnWidths = activeTab === 'contributors'
            ? [{ wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }]
            : [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
        worksheet['!cols'] = columnWidths;

        // Create workbook and add worksheet
        const workbook = XLSX.utils.book_new();
        const sheetName = activeTab === 'contributors' ? 'المساهمون' : 'غير المساهمين';
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Generate Excel file and download
        XLSX.writeFile(workbook, `initiative-${id}-${activeTab}-${Date.now()}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Title
        const title = activeTab === 'contributors'
            ? `تقرير المساهمين - ${initiative?.title_ar || 'المبادرة'}`
            : `غير المساهمين - ${initiative?.title_ar || 'المبادرة'}`;

        doc.setFontSize(16);
        doc.text(title, 105, 15, { align: 'center' });

        // Table headers and data
        const headers = activeTab === 'contributors'
            ? [['رقم العضو', 'الاسم', 'المبلغ', 'طريقة الدفع', 'تاريخ الدفع', 'معتمد']]
            : [['رقم العضو', 'الاسم', 'الهاتف', 'البريد الإلكتروني']];

        const data = activeTab === 'contributors'
            ? donations.map(d => [
                d.donor.membership_number || '-',
                d.donor.full_name || d.donor.full_name_en || '-',
                d.amount.toLocaleString('en-US') + ' ر.س',
                d.payment_method,
                new Date(d.payment_date).toLocaleDateString('ar-SA'),
                d.approved_by ? 'نعم' : 'لا'
            ])
            : nonContributors.map(m => [
                m.membership_number || '-',
                m.full_name || m.full_name_en || '-',
                m.phone || '-',
                m.email || '-'
            ]);

        // Generate table with autoTable
        autoTable(doc, {
            head: headers,
            body: data,
            startY: 25,
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: 3,
                halign: 'center'
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { top: 25 }
        });

        // Save PDF
        doc.save(`initiative-${id}-${activeTab}-${Date.now()}.pdf`);
    };

    const filteredContributors = donations.filter(d =>
        (d.donor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         d.donor.full_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         d.donor.membership_number?.includes(searchTerm))
    );

    const filteredNonContributors = nonContributors.filter(m =>
        (m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         m.full_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         m.membership_number?.includes(searchTerm) ||
         m.phone?.includes(searchTerm))
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!initiative) {
        return (
            <div className="container mx-auto px-4 py-8" dir="rtl">
                <div className="text-center">
                    <p className="text-xl text-gray-600">المبادرة غير موجودة</p>
                    <button
                        onClick={() => navigate('/admin/initiatives')}
                        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg"
                    >
                        العودة للمبادرات
                    </button>
                </div>
            </div>
        );
    }

    const remaining = initiative.target_amount - initiative.current_amount;
    const progress = (initiative.current_amount / initiative.target_amount * 100);

    return (
        <div className="container mx-auto px-4 py-8" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button
                        onClick={() => navigate('/admin/initiatives')}
                        className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-2"
                    >
                        ← العودة للمبادرات
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">{initiative.title_ar || 'تقرير المبادرة'}</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg flex items-center gap-2 transition-all hover:shadow-lg"
                    >
                        <span>📄</span>
                        <span>CSV</span>
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg flex items-center gap-2 transition-all hover:shadow-lg"
                    >
                        <span>📊</span>
                        <span>Excel</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg flex items-center gap-2 transition-all hover:shadow-lg"
                    >
                        <span>📕</span>
                        <span>PDF</span>
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="text-sm opacity-90 mb-1">المبلغ المستهدف</div>
                    <div className="text-3xl font-bold">{initiative.target_amount.toLocaleString('en-US')}</div>
                    <div className="text-sm opacity-75">ريال سعودي</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="text-sm opacity-90 mb-1">المبلغ المحصل</div>
                    <div className="text-3xl font-bold">{initiative.current_amount.toLocaleString('en-US')}</div>
                    <div className="text-sm opacity-75">ريال سعودي</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="text-sm opacity-90 mb-1">المبلغ المتبقي</div>
                    <div className="text-3xl font-bold">{remaining.toLocaleString('en-US')}</div>
                    <div className="text-sm opacity-75">ريال سعودي</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="text-sm opacity-90 mb-1">نسبة الإنجاز</div>
                    <div className="text-3xl font-bold">{progress.toFixed(1)}%</div>
                    <div className="text-sm opacity-75">{stats?.uniqueDonors || 0} مساهم</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h3 className="text-lg font-bold mb-4">التقدم نحو الهدف</h3>
                <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                        className="bg-gradient-to-r from-green-500 to-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center text-white text-sm font-bold"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    >
                        {progress.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="border-b flex">
                    <button
                        onClick={() => setActiveTab('contributors')}
                        className={`flex-1 py-4 px-6 font-bold transition-colors ${
                            activeTab === 'contributors'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        المساهمون ({donations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('non-contributors')}
                        className={`flex-1 py-4 px-6 font-bold transition-colors ${
                            activeTab === 'non-contributors'
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        غير المساهمين ({nonContributors.length})
                    </button>
                </div>

                {/* Search and Actions */}
                <div className="p-6 border-b bg-gray-50 flex gap-4">
                    <input
                        type="text"
                        placeholder="بحث..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {activeTab === 'non-contributors' && nonContributors.length > 0 && (
                        <button
                            onClick={handleNotifyNonContributors}
                            disabled={sendingNotification}
                            className="bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white px-6 py-2 rounded-lg font-bold transition-all hover:shadow-xl flex items-center gap-2"
                        >
                            {sendingNotification ? (
                                <>
                                    <span className="animate-spin">⚡</span>
                                    <span>جاري الإرسال...</span>
                                </>
                            ) : (
                                <>
                                    <span>🔔</span>
                                    <span>إرسال تذكير</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Contributors Tab */}
                {activeTab === 'contributors' && (
                    <div className="p-6">
                        {filteredContributors.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="text-6xl mb-4">💰</div>
                                <p className="text-xl">لا توجد مساهمات بعد</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b">
                                            <th className="px-4 py-3 text-right">رقم العضو</th>
                                            <th className="px-4 py-3 text-right">الاسم</th>
                                            <th className="px-4 py-3 text-right">المبلغ</th>
                                            <th className="px-4 py-3 text-right">طريقة الدفع</th>
                                            <th className="px-4 py-3 text-right">تاريخ الدفع</th>
                                            <th className="px-4 py-3 text-center">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredContributors.map((donation) => (
                                            <tr key={donation.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3">{donation.donor.membership_number || '-'}</td>
                                                <td className="px-4 py-3 font-medium">
                                                    {donation.donor.full_name || donation.donor.full_name_en || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-green-600">
                                                        {donation.amount.toLocaleString('en-US')} ر.س
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">{donation.payment_method}</td>
                                                <td className="px-4 py-3">
                                                    {new Date(donation.payment_date).toLocaleDateString('ar-SA')}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {donation.approved_by ? (
                                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                                            معتمد ✓
                                                        </span>
                                                    ) : (
                                                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                                                            قيد المراجعة
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Non-Contributors Tab */}
                {activeTab === 'non-contributors' && (
                    <div className="p-6">
                        {nonContributorStats && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-orange-600">
                                            {nonContributorStats.totalActiveMembers}
                                        </div>
                                        <div className="text-sm text-gray-600">إجمالي الأعضاء النشطين</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {nonContributorStats.totalContributors}
                                        </div>
                                        <div className="text-sm text-gray-600">المساهمون</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {nonContributorStats.totalNonContributors}
                                        </div>
                                        <div className="text-sm text-gray-600">غير المساهمين</div>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <span className="text-sm text-gray-600">معدل المساهمة: </span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {nonContributorStats.contributionRate}%
                                    </span>
                                </div>
                            </div>
                        )}

                        {filteredNonContributors.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="text-6xl mb-4">🎉</div>
                                <p className="text-xl">جميع الأعضاء النشطين قد ساهموا!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b">
                                            <th className="px-4 py-3 text-right">رقم العضو</th>
                                            <th className="px-4 py-3 text-right">الاسم</th>
                                            <th className="px-4 py-3 text-right">الهاتف</th>
                                            <th className="px-4 py-3 text-right">البريد الإلكتروني</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredNonContributors.map((member) => (
                                            <tr key={member.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3">{member.membership_number || '-'}</td>
                                                <td className="px-4 py-3 font-medium">
                                                    {member.full_name || member.full_name_en || '-'}
                                                </td>
                                                <td className="px-4 py-3">{member.phone || '-'}</td>
                                                <td className="px-4 py-3">{member.email || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InitiativeReport;
