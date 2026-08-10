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

import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertTriangle,CheckCircle2,Loader2,XCircle } from 'lucide-react';
import React,{ useCallback,useEffect,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';

import {
    initiativeDonationReviewService,
    validateDonationRejectionReason
} from '../../services/initiativeDonationReviewService';
import { API_BASE_URL,API_ORIGIN } from '../../utils/apiConfig';
import { exportJsonToExcel } from '../../utils/excelExport';
import { logger } from '../../utils/logger';

interface Initiative {
    id: string;
    title_ar?: string;
    title_en?: string;
    description_ar?: string;
    beneficiary_name_ar?: string;
    target_amount: number | null;
    current_amount: number;
    status: string;
    min_contribution?: number;
    max_contribution?: number;
}

interface Donation {
    id: number | string;
    amount: number;
    payment_method: string;
    payment_date: string;
    status: string;
    approved_by: string | null;
    approval_date: string | null;
    receipt_url?: string | null;
    receipt_document_id?: string | null;
    receipt_document?: ReceiptMetadata | null;
    rejection_reason?: string | null;
    rejected_by_id?: string | null;
    rejected_at?: string | null;
    review_state?: 'approved' | 'rejected' | 'pending' | 'inconsistent';
    donor: {
        id: number | string;
        full_name?: string;
        full_name_en?: string;
        membership_number?: string;
    };
}

interface ReceiptMetadata {
    receipt_url?: string | null;
    signed_url?: string | null;
    original_name?: string | null;
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
    progressPercentage: number | null;
}

interface NonContributorStats {
    totalActiveMembers: number;
    totalContributors: number;
    totalNonContributors: number;
    contributionRate: string;
}

type ReviewDialog = {
    action: 'approve' | 'reject';
    donation: Donation;
};

const DONATION_REVIEW_ROLES = new Set(['super_admin', 'admin', 'financial_manager']);

const storedAdminRole = () => {
    try {
        const rawUser = localStorage.getItem('user_data') || localStorage.getItem('user');
        const storedRole = localStorage.getItem('userRole');
        if (!rawUser) return storedRole || '';
        const parsed = JSON.parse(rawUser);
        return parsed?.role || parsed?.user?.role || storedRole || '';
    } catch {
        return localStorage.getItem('userRole') || '';
    }
};

const documentUrl = (path?: string | null) => {
    const rawPath = path?.trim();
    if (!rawPath) return null;

    try {
        const isAbsolute = /^https?:\/\//i.test(rawPath);
        const parsed = new URL(rawPath, `${API_ORIGIN}/`);
        const configuredApiOrigin = new URL(API_ORIGIN).origin;

        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        if (isAbsolute && parsed.origin !== configuredApiOrigin) return null;
        if (!/^\/api\/documents\/file\/[^/]+$/i.test(parsed.pathname)) return null;

        const signed = new URL(parsed.pathname, configuredApiOrigin);
        signed.search = parsed.search;
        signed.hash = parsed.hash;
        return signed.toString();
    } catch {
        return null;
    }
};

export const donationReceiptUrl = (donation: Donation) => {
    const candidates = [
        donation.receipt_url,
        donation.receipt_document?.receipt_url,
        donation.receipt_document?.signed_url
    ];

    for (const candidate of candidates) {
        const url = documentUrl(candidate);
        if (url) return url;
    }

    return null;
};

const donationStatus = (donation: Donation) => {
    const status = String(donation.status || '').trim().toLowerCase();
    if (donation.review_state) return donation.review_state;
    const hasApprovalAudit = Boolean(donation.approved_by || donation.approval_date);
    const hasRejectionAudit = Boolean(
        donation.rejection_reason || donation.rejected_by_id || donation.rejected_at
    );
    if (['approved', 'completed', 'confirmed'].includes(status)
        && donation.approved_by
        && donation.approval_date
        && !hasRejectionAudit) {
        return 'approved';
    }
    if (status === 'rejected'
        && donation.rejection_reason
        && donation.rejected_by_id
        && donation.rejected_at
        && !hasApprovalAudit) {
        return 'rejected';
    }
    if (status === 'pending' && !hasApprovalAudit && !hasRejectionAudit) return 'pending';
    return 'inconsistent';
};

const actionErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error || error.response?.data?.message || 'تعذر تنفيذ الإجراء';
    }
    return 'تعذر تنفيذ الإجراء، يرجى المحاولة مرة أخرى';
};

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
    const [reportError, setReportError] = useState<string | null>(null);
    const [reviewDialog, setReviewDialog] = useState<ReviewDialog | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null);
    const [reviewingDonationId, setReviewingDonationId] = useState<string | number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const API_URL = API_BASE_URL;
    const canReviewDonations = DONATION_REVIEW_ROLES.has(storedAdminRole());

    const fetchInitiativeReport = useCallback(async () => {
        try {
            setReportError(null);
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
            setReportError('تعذر تحديث بيانات المبادرة. حاول مرة أخرى.');
            setLoading(false);
        }
    }, [API_URL, id]);

    const fetchNonContributors = useCallback(async () => {
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
    }, [API_URL, id]);

    useEffect(() => {
        fetchInitiativeReport();
        fetchNonContributors();
    }, [fetchInitiativeReport, fetchNonContributors]);

    const openReviewDialog = (action: ReviewDialog['action'], donation: Donation) => {
        setReviewDialog({ action, donation });
        setRejectionReason('');
        setRejectionReasonError(null);
        setActionError(null);
        setActionSuccess(null);
    };

    const closeReviewDialog = () => {
        if (reviewingDonationId !== null) return;
        setReviewDialog(null);
        setRejectionReason('');
        setRejectionReasonError(null);
    };

    const handleDonationReview = async () => {
        if (!reviewDialog || reviewingDonationId !== null) return;

        let normalizedReason = '';
        if (reviewDialog.action === 'reject') {
            const validation = validateDonationRejectionReason(rejectionReason);
            if (!validation.valid) {
                setRejectionReasonError(validation.error);
                return;
            }
            normalizedReason = validation.reason;
        }

        setReviewingDonationId(reviewDialog.donation.id);
        setRejectionReasonError(null);
        setActionError(null);

        try {
            const response = reviewDialog.action === 'approve'
                ? await initiativeDonationReviewService.approve(reviewDialog.donation.id)
                : await initiativeDonationReviewService.reject(reviewDialog.donation.id, normalizedReason);

            setReviewDialog(null);
            setRejectionReason('');
            setActionSuccess(
                response.message || (reviewDialog.action === 'approve'
                    ? 'تم اعتماد المساهمة بنجاح'
                    : 'تم رفض المساهمة وتسجيل السبب')
            );
            // Always reload the authoritative initiative row and contribution
            // list so current_amount, stats, and the status badge move together.
            await fetchInitiativeReport();
        } catch (error) {
            setActionError(actionErrorMessage(error));
        } finally {
            setReviewingDonationId(null);
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
                'معتمد': donationStatus(d) === 'approved' ? 'نعم' : 'لا'
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
                'معتمد': donationStatus(d) === 'approved' ? 'نعم' : 'لا'
            }))
            : nonContributors.map(m => ({
                'رقم العضو': m.membership_number || '',
                'الاسم': m.full_name || m.full_name_en || '',
                'الهاتف': m.phone || '',
                'البريد الإلكتروني': m.email || ''
            }));

        // Set column widths for better readability
        const columnWidths = activeTab === 'contributors'
            ? [{ wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }]
            : [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
        const sheetName = activeTab === 'contributors' ? 'المساهمون' : 'غير المساهمين';

        // Generate Excel file and download
        exportJsonToExcel(exportData, sheetName, `initiative-${id}-${activeTab}-${Date.now()}.xlsx`, columnWidths);
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
                donationStatus(d) === 'approved' ? 'نعم' : 'لا'
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
                    <p className="text-xl text-gray-600">
                        {reportError || 'المبادرة غير موجودة'}
                    </p>
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

    const hasFinancialTarget = initiative.target_amount !== null && initiative.target_amount > 0;
    const remaining = hasFinancialTarget
        ? Math.max(0, initiative.target_amount! - initiative.current_amount)
        : null;
    const progress = hasFinancialTarget
        ? (initiative.current_amount / initiative.target_amount! * 100)
        : null;

    return (
        <div className="container mx-auto px-4 py-8" dir="rtl">
            {actionSuccess && (
                <div
                    role="status"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm"
                >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 font-semibold leading-7">{actionSuccess}</span>
                    <button
                        type="button"
                        onClick={() => setActionSuccess(null)}
                        className="rounded-md px-2 py-1 text-sm text-emerald-800 hover:bg-emerald-100"
                        aria-label="إغلاق رسالة النجاح"
                    >
                        إغلاق
                    </button>
                </div>
            )}
            {(actionError || reportError) && (
                <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 shadow-sm"
                >
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 font-semibold leading-7">{actionError || reportError}</span>
                    {reportError && (
                        <button
                            type="button"
                            onClick={() => fetchInitiativeReport()}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-bold hover:bg-red-100"
                        >
                            إعادة المحاولة
                        </button>
                    )}
                </div>
            )}
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                    <button
                        onClick={() => navigate('/admin/initiatives')}
                        className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-2"
                    >
                        ← العودة للمبادرات
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">{initiative.title_ar || 'تقرير المبادرة'}</h1>
                </div>
                <div className="flex flex-wrap gap-3">
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
                    <div className="text-3xl font-bold">
                        {hasFinancialTarget ? initiative.target_amount!.toLocaleString('en-US') : 'غير محدد'}
                    </div>
                    <div className="text-sm opacity-75">{hasFinancialTarget ? 'ريال سعودي' : 'مبادرة بلا هدف مالي ثابت'}</div>
                </div>

                <div
                    className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg"
                    role="group"
                    aria-label="المبلغ المحصل"
                >
                    <div className="text-sm opacity-90 mb-1">المبلغ المحصل</div>
                    <div className="text-3xl font-bold">{initiative.current_amount.toLocaleString('en-US')}</div>
                    <div className="text-sm opacity-75">ريال سعودي</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="text-sm opacity-90 mb-1">المبلغ المتبقي</div>
                    <div className="text-3xl font-bold">{remaining === null ? '—' : remaining.toLocaleString('en-US')}</div>
                    <div className="text-sm opacity-75">{remaining === null ? 'لا يوجد هدف مالي' : 'ريال سعودي'}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="text-sm opacity-90 mb-1">نسبة الإنجاز</div>
                    <div className="text-3xl font-bold">{progress === null ? '—' : `${progress.toFixed(1)}%`}</div>
                    <div className="text-sm opacity-75">{stats?.uniqueDonors || 0} مساهم</div>
                </div>
            </div>

            {/* Progress Bar */}
            {progress !== null && (
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
            )}

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
                                            <th className="px-4 py-3 text-center">الإيصال</th>
                                            <th className="px-4 py-3 text-center">الحالة</th>
                                            <th className="px-4 py-3 text-center">إجراءات المراجعة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredContributors.map((donation) => {
                                            const receiptUrl = donationReceiptUrl(donation);
                                            const hasReceiptReference = Boolean(donation.receipt_document_id);
                                            const reviewStatus = donationStatus(donation);
                                            const isReviewing = reviewingDonationId === donation.id;

                                            return (
                                                <tr key={donation.id} className="border-b align-top transition-colors hover:bg-slate-50">
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
                                                    {receiptUrl ? (
                                                        <a
                                                            href={receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                                                        >
                                                            <span aria-hidden="true">📄</span>
                                                            عرض الإيصال
                                                        </a>
                                                    ) : hasReceiptReference ? (
                                                        <span
                                                            className="inline-block max-w-56 text-sm leading-6 text-amber-700"
                                                            title="الإيصال محفوظ لكنه غير متاح من استجابة التقرير الحالية"
                                                        >
                                                            الإيصال محفوظ لكنه غير متاح من هذه الاستجابة
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">غير متوفر</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {reviewStatus === 'approved' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                                                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                                            معتمدة
                                                        </span>
                                                    )}
                                                    {reviewStatus === 'rejected' && (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-bold text-red-800">
                                                                <XCircle className="h-4 w-4" aria-hidden="true" />
                                                                مرفوضة
                                                            </span>
                                                            {donation.rejection_reason && (
                                                                <p className="max-w-52 text-xs leading-5 text-red-700">
                                                                    {donation.rejection_reason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {reviewStatus === 'pending' && (
                                                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-800">
                                                            قيد المراجعة
                                                        </span>
                                                    )}
                                                    {reviewStatus === 'inconsistent' && (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-900">
                                                                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                                                سجل مراجعة غير مكتمل
                                                            </span>
                                                            <p className="max-w-52 text-xs leading-5 text-orange-800">
                                                                يلزم تصحيح السجل التاريخي قبل اتخاذ قرار مالي.
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {reviewStatus === 'pending' && canReviewDonations ? (
                                                        <div className="flex min-w-48 flex-wrap justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openReviewDialog('approve', donation)}
                                                                disabled={reviewingDonationId !== null}
                                                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                                aria-label={`اعتماد مساهمة ${donation.donor.full_name || donation.donor.full_name_en || ''}`}
                                                            >
                                                                {isReviewing ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                                ) : (
                                                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                                                )}
                                                                اعتماد
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openReviewDialog('reject', donation)}
                                                                disabled={reviewingDonationId !== null}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                aria-label={`رفض مساهمة ${donation.donor.full_name || donation.donor.full_name_en || ''}`}
                                                            >
                                                                <XCircle className="h-4 w-4" aria-hidden="true" />
                                                                رفض
                                                            </button>
                                                        </div>
                                                    ) : reviewStatus === 'pending' ? (
                                                        <span className="text-sm text-slate-500">بانتظار المسؤول المالي</span>
                                                    ) : reviewStatus === 'inconsistent' ? (
                                                        <span className="text-sm font-semibold text-orange-700">تتطلب معالجة إدارية</span>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">اكتملت المراجعة</span>
                                                    )}
                                                </td>
                                                </tr>
                                            );
                                        })}
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

            {reviewDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeReviewDialog();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="initiative-review-dialog-title"
                        aria-describedby="initiative-review-dialog-description"
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >
                        <div className={`border-b px-6 py-5 ${
                            reviewDialog.action === 'approve'
                                ? 'border-emerald-100 bg-emerald-50'
                                : 'border-red-100 bg-red-50'
                        }`}>
                            <div className="flex items-start gap-3">
                                <div className={`rounded-xl p-2.5 ${
                                    reviewDialog.action === 'approve'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {reviewDialog.action === 'approve' ? (
                                        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                                    ) : (
                                        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                                    )}
                                </div>
                                <div>
                                    <h2 id="initiative-review-dialog-title" className="text-xl font-extrabold text-slate-900">
                                        {reviewDialog.action === 'approve'
                                            ? 'تأكيد اعتماد المساهمة'
                                            : 'رفض المساهمة'}
                                    </h2>
                                    <p id="initiative-review-dialog-description" className="mt-1 text-sm leading-6 text-slate-600">
                                        {reviewDialog.action === 'approve'
                                            ? 'سيُضاف المبلغ إلى إجمالي المبادرة بعد الاعتماد.'
                                            : 'سيبقى المبلغ خارج إجمالي المبادرة، وسيصل سبب الرفض إلى العضو.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 px-6 py-5">
                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                                <div>
                                    <span className="block text-xs font-bold text-slate-500">المساهم</span>
                                    <span className="mt-1 block font-bold text-slate-900">
                                        {reviewDialog.donation.donor.full_name ||
                                            reviewDialog.donation.donor.full_name_en || 'عضو العائلة'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-500">قيمة المساهمة</span>
                                    <span className="mt-1 block font-extrabold text-slate-900" dir="ltr">
                                        {Number(reviewDialog.donation.amount).toLocaleString('en-US')} ر.س
                                    </span>
                                </div>
                            </div>

                            {reviewDialog.action === 'reject' && (
                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label htmlFor="initiative-rejection-reason" className="text-sm font-extrabold text-slate-800">
                                            سبب الرفض <span className="text-red-600">*</span>
                                        </label>
                                        <span className="text-xs text-slate-500" dir="ltr">
                                            {rejectionReason.length}/500
                                        </span>
                                    </div>
                                    <textarea
                                        id="initiative-rejection-reason"
                                        value={rejectionReason}
                                        onChange={(event) => {
                                            setRejectionReason(event.target.value.slice(0, 500));
                                            setRejectionReasonError(null);
                                            setActionError(null);
                                        }}
                                        autoFocus
                                        rows={4}
                                        maxLength={500}
                                        disabled={reviewingDonationId !== null}
                                        placeholder="اكتب سبباً واضحاً يمكن للعضو فهمه، مثل عدم تطابق مبلغ التحويل مع الإيصال."
                                        aria-invalid={Boolean(rejectionReasonError)}
                                        aria-describedby="initiative-rejection-reason-help"
                                        className={`w-full resize-none rounded-xl border px-4 py-3 text-right leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 disabled:bg-slate-100 ${
                                            rejectionReasonError
                                                ? 'border-red-400 ring-4 ring-red-100'
                                                : 'border-slate-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                                        }`}
                                    />
                                    <p id="initiative-rejection-reason-help" className="mt-2 text-xs leading-5 text-slate-500">
                                        من 10 إلى 500 حرف، مع وصف فعلي للمشكلة وليس رموزاً فقط.
                                    </p>
                                    {rejectionReasonError && (
                                        <p role="alert" className="mt-2 text-sm font-bold text-red-700">
                                            {rejectionReasonError}
                                        </p>
                                    )}
                                </div>
                            )}

                            {actionError && (
                                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">
                                    {actionError}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeReviewDialog}
                                disabled={reviewingDonationId !== null}
                                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleDonationReview}
                                disabled={reviewingDonationId !== null}
                                autoFocus={reviewDialog.action === 'approve'}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-extrabold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                    reviewDialog.action === 'approve'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {reviewingDonationId !== null && (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                )}
                                {reviewingDonationId !== null
                                    ? (reviewDialog.action === 'approve' ? 'جارٍ الاعتماد…' : 'جارٍ رفض المساهمة…')
                                    : (reviewDialog.action === 'approve' ? 'تأكيد الاعتماد' : 'تأكيد الرفض')}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default InitiativeReport;
