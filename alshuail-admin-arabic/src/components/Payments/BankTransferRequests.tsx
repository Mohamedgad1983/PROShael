import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import { logger } from '../../utils/logger';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  BanknotesIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolidIcon,
  XCircleIcon as XCircleSolidIcon,
  ClockIcon as ClockSolidIcon
} from '@heroicons/react/24/solid';

// Types
interface BankTransfer {
  id: string;
  requester_id: string;
  beneficiary_id: string;
  amount: number;
  purpose: 'subscription' | 'diya' | 'initiative' | 'general';
  purpose_reference_id?: string;
  receipt_url: string;
  receipt_filename?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    full_name: string;
    membership_number: string;
    phone?: string;
  };
  beneficiary?: {
    id: string;
    full_name: string;
    membership_number: string;
    phone?: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
    email?: string;
  };
}

interface TransferStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount_pending: number;
  total_amount_approved: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Arabic labels
const LABELS = {
  title: 'طلبات التحويل البنكي',
  subtitle: 'مراجعة واعتماد طلبات الدفع بالتحويل البنكي',
  searchPlaceholder: 'بحث بالاسم أو رقم العضوية...',
  filter: 'تصفية',
  refresh: 'تحديث',
  all: 'الكل',
  pending: 'معلق',
  approved: 'معتمد',
  rejected: 'مرفوض',
  requester: 'الدافع',
  beneficiary: 'المستفيد',
  amount: 'المبلغ',
  purpose: 'الغرض',
  status: 'الحالة',
  date: 'التاريخ',
  actions: 'الإجراءات',
  viewReceipt: 'عرض الإيصال',
  approve: 'اعتماد',
  reject: 'رفض',
  noData: 'لا توجد طلبات تحويل',
  loading: 'جاري التحميل...',
  error: 'حدث خطأ',
  retry: 'إعادة المحاولة',
  pendingCount: 'طلبات معلقة',
  approvedCount: 'طلبات معتمدة',
  rejectedCount: 'طلبات مرفوضة',
  totalPending: 'المبلغ المعلق',
  totalApproved: 'المبلغ المعتمد',
  subscription: 'اشتراك',
  diya: 'دية',
  initiative: 'مبادرة',
  general: 'عام',
  rejectReason: 'سبب الرفض',
  rejectReasonPlaceholder: 'يرجى إدخال سبب الرفض...',
  cancel: 'إلغاء',
  confirm: 'تأكيد',
  approveConfirm: 'هل أنت متأكد من اعتماد هذا التحويل؟',
  rejectConfirm: 'هل أنت متأكد من رفض هذا التحويل؟',
  approveSuccess: 'تم اعتماد التحويل بنجاح',
  rejectSuccess: 'تم رفض التحويل',
  membershipNumber: 'رقم العضوية',
  phone: 'الجوال',
  reviewedBy: 'تمت المراجعة بواسطة',
  reviewedAt: 'تاريخ المراجعة',
  currency: 'ر.س'
};

const PURPOSE_LABELS: Record<string, string> = {
  subscription: 'اشتراك',
  diya: 'دية',
  initiative: 'مبادرة',
  general: 'عام'
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; Icon: any }> = {
  pending: {
    label: LABELS.pending,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    Icon: ClockSolidIcon
  },
  approved: {
    label: LABELS.approved,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    Icon: CheckCircleSolidIcon
  },
  rejected: {
    label: LABELS.rejected,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    Icon: XCircleSolidIcon
  }
};

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://api.alshailfund.com';

// Utility functions
const formatAmount = (amount: number): string => {
  return amount.toLocaleString('ar-SA', { maximumFractionDigits: 0 });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Stats Card Component
const StatsCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  color: string;
}> = memo(({ title, value, subtitle, icon: Icon, color }) => (
  <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
));

// Transfer Card Component
const TransferCard: React.FC<{
  transfer: BankTransfer;
  onViewReceipt: (url: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = memo(({ transfer, onViewReceipt, onApprove, onReject }) => {
  const statusConfig = STATUS_CONFIG[transfer.status];
  const StatusIcon = statusConfig.Icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${statusConfig.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
          </div>
          <div>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            <p className="text-xs text-gray-400 mt-1">{formatDate(transfer.created_at)}</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-xl font-bold text-gray-900">{formatAmount(transfer.amount)}</p>
          <p className="text-xs text-gray-500">{LABELS.currency}</p>
        </div>
      </div>

      {/* Purpose Badge */}
      <div className="mb-4">
        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
          {PURPOSE_LABELS[transfer.purpose] || transfer.purpose}
        </span>
      </div>

      {/* Requester & Beneficiary */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">{LABELS.requester}:</span>
          <span className="font-medium">{transfer.requester?.full_name || '-'}</span>
          <span className="text-gray-400">({transfer.requester?.membership_number || '-'})</span>
        </div>
        {transfer.requester_id !== transfer.beneficiary_id && (
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="w-4 h-4 text-green-500" />
            <span className="text-gray-500">{LABELS.beneficiary}:</span>
            <span className="font-medium text-green-600">{transfer.beneficiary?.full_name || '-'}</span>
            <span className="text-gray-400">({transfer.beneficiary?.membership_number || '-'})</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {transfer.notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">{transfer.notes}</p>
        </div>
      )}

      {/* Rejection Reason */}
      {transfer.status === 'rejected' && transfer.rejection_reason && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm text-red-600">
            <strong>{LABELS.rejectReason}:</strong> {transfer.rejection_reason}
          </p>
        </div>
      )}

      {/* Reviewer Info */}
      {transfer.reviewer && transfer.reviewed_at && (
        <div className="mb-4 text-xs text-gray-400">
          <p>{LABELS.reviewedBy}: {transfer.reviewer.full_name}</p>
          <p>{LABELS.reviewedAt}: {formatDate(transfer.reviewed_at)}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={() => onViewReceipt(transfer.receipt_url)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <EyeIcon className="w-4 h-4" />
          {LABELS.viewReceipt}
        </button>

        {transfer.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(transfer.id)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors mr-auto"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {LABELS.approve}
            </button>
            <button
              onClick={() => onReject(transfer.id)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <XCircleIcon className="w-4 h-4" />
              {LABELS.reject}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

// Reject Modal Component
const RejectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reason.trim().length >= 5) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{LABELS.reject}</h3>
        </div>

        <p className="text-gray-600 mb-4">{LABELS.rejectConfirm}</p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={LABELS.rejectReasonPlaceholder}
          className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          dir="rtl"
        />

        {reason.length > 0 && reason.length < 5 && (
          <p className="text-xs text-red-500 mt-1">يجب أن يكون السبب 5 أحرف على الأقل</p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {LABELS.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || reason.trim().length < 5}
            className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? LABELS.loading : LABELS.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

// Receipt Modal Component
const ReceiptModal: React.FC<{
  isOpen: boolean;
  url: string | null;
  onClose: () => void;
}> = ({ isOpen, url, onClose }) => {
  if (!isOpen || !url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 left-0 text-white hover:text-gray-300 text-sm"
        >
          ✕ إغلاق
        </button>
        <img
          src={url}
          alt="إيصال التحويل"
          className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
        />
      </div>
    </div>
  );
};

// Main Component
const BankTransferRequests: React.FC = () => {
  const { token, hasPermission, user } = useAuth();
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check permissions
  const hasAccess = user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    user?.role === 'financial_manager' ||
    hasPermission?.('manage_finances');

  // Fetch transfers
  const fetchTransfers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`${API_BASE_URL}/api/bank-transfers?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setTransfers(data.data || []);
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total,
            pages: data.pagination.pages
          }));
        }
      } else {
        throw new Error(data.error || 'Failed to fetch transfers');
      }
    } catch (err: any) {
      logger.error('Error fetching bank transfers:', err);
      setError(err.message || LABELS.error);
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, pagination.limit, statusFilter, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-transfers/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err: any) {
      logger.error('Error fetching transfer stats:', err);
    }
  }, [token]);

  // Approve transfer
  const handleApprove = useCallback(async (transferId: string) => {
    if (!token || !window.confirm(LABELS.approveConfirm)) return;

    setActionLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-transfers/${transferId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        alert(LABELS.approveSuccess);
        fetchTransfers();
        fetchStats();
      } else {
        throw new Error(data.error || 'Failed to approve transfer');
      }
    } catch (err: any) {
      logger.error('Error approving transfer:', err);
      alert(err.message || LABELS.error);
    } finally {
      setActionLoading(false);
    }
  }, [token, fetchTransfers, fetchStats]);

  // Reject transfer
  const handleReject = useCallback(async (reason: string) => {
    if (!token || !selectedTransferId) return;

    setActionLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-transfers/${selectedTransferId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        alert(LABELS.rejectSuccess);
        setShowRejectModal(false);
        setSelectedTransferId(null);
        fetchTransfers();
        fetchStats();
      } else {
        throw new Error(data.error || 'Failed to reject transfer');
      }
    } catch (err: any) {
      logger.error('Error rejecting transfer:', err);
      alert(err.message || LABELS.error);
    } finally {
      setActionLoading(false);
    }
  }, [token, selectedTransferId, fetchTransfers, fetchStats]);

  // View receipt
  const handleViewReceipt = useCallback((url: string) => {
    setReceiptUrl(url);
    setShowReceiptModal(true);
  }, []);

  // Open reject modal
  const openRejectModal = useCallback((transferId: string) => {
    setSelectedTransferId(transferId);
    setShowRejectModal(true);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (hasAccess) {
      fetchTransfers();
      fetchStats();
    }
  }, [hasAccess, fetchTransfers, fetchStats]);

  // Permission check
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-600">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{LABELS.title}</h1>
            <p className="text-blue-100 mt-1">{LABELS.subtitle}</p>
          </div>
          <BanknotesIcon className="w-12 h-12 text-blue-200" />
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title={LABELS.pendingCount}
            value={stats.pending}
            subtitle={`${formatAmount(stats.total_amount_pending)} ${LABELS.currency}`}
            icon={ClockIcon}
            color="text-amber-600"
          />
          <StatsCard
            title={LABELS.approvedCount}
            value={stats.approved}
            subtitle={`${formatAmount(stats.total_amount_approved)} ${LABELS.currency}`}
            icon={CheckCircleIcon}
            color="text-green-600"
          />
          <StatsCard
            title={LABELS.rejectedCount}
            value={stats.rejected}
            icon={XCircleIcon}
            color="text-red-600"
          />
          <StatsCard
            title={LABELS.all}
            value={stats.total}
            icon={DocumentTextIcon}
            color="text-blue-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={LABELS.searchPlaceholder}
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">{LABELS.all}</option>
              <option value="pending">{LABELS.pending}</option>
              <option value="approved">{LABELS.approved}</option>
              <option value="rejected">{LABELS.rejected}</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              fetchTransfers();
              fetchStats();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {LABELS.refresh}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTransfers}
            className="px-4 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            {LABELS.retry}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && transfers.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Transfer List */}
      {!loading && transfers.length === 0 && !error && (
        <div className="bg-white rounded-xl p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{LABELS.noData}</p>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {transfers.map((transfer) => (
            <TransferCard
              key={transfer.id}
              transfer={transfer}
              onViewReceipt={handleViewReceipt}
              onApprove={handleApprove}
              onReject={openRejectModal}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPagination((prev) => ({ ...prev, page }))}
              className={`w-10 h-10 rounded-lg transition-colors ${
                pagination.page === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedTransferId(null);
        }}
        onConfirm={handleReject}
        loading={actionLoading}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        url={receiptUrl}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptUrl(null);
        }}
      />
    </div>
  );
};

export default memo(BankTransferRequests);
