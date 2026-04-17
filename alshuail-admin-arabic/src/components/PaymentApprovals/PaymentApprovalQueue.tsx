// Payment Approval Queue — admin screen listing pending payments
// awaiting approval. Mirrors the UX of ApprovalQueue.jsx (member registrations)
// but for the payments table.

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhoneIcon,
  IdentificationIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import {
  paymentApprovalService,
  PendingPayment,
  PendingPaymentsStats
} from '../../services/paymentApproval.service';

const CATEGORY_LABELS: Record<string, string> = {
  subscription: 'اشتراك',
  initiative: 'مبادرة',
  diya: 'دية',
  for_member: 'نيابة عن عضو'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  pending_verification: 'بانتظار التحقق من الإيصال'
};

const formatSAR = (v: number | string): string => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const PaymentApprovalQueue: React.FC = () => {
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [stats, setStats] = useState<PendingPaymentsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (category?: string) => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        paymentApprovalService.getPendingPayments({ category }),
        paymentApprovalService.getPendingStats()
      ]);
      setPending(listRes.data || []);
      setStats(statsRes.data || null);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(categoryFilter || undefined);
  }, [categoryFilter]);

  const handleApprove = async (paymentId: string) => {
    if (!window.confirm('تأكيد الموافقة على الدفعة؟ سيتم تحديث رصيد العضو تلقائياً.')) return;
    try {
      setActionLoading(paymentId);
      await paymentApprovalService.approvePayment(paymentId);
      setPending((prev) => prev.filter((p) => p.id !== paymentId));
      loadData(categoryFilter || undefined);
    } catch (err: any) {
      alert(err?.message || 'فشل في الموافقة على الدفعة');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    const reason = window.prompt('سبب رفض الدفعة (اختياري):') ?? undefined;
    if (!window.confirm('تأكيد رفض الدفعة؟')) return;
    try {
      setActionLoading(paymentId);
      await paymentApprovalService.rejectPayment(paymentId, reason);
      setPending((prev) => prev.filter((p) => p.id !== paymentId));
      loadData(categoryFilter || undefined);
    } catch (err: any) {
      alert(err?.message || 'فشل في رفض الدفعة');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return pending;
    const q = searchQuery.trim().toLowerCase();
    return pending.filter((p) =>
      [p.payer_name, p.payer_phone, p.payer_membership_number, p.reference_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [pending, searchQuery]);

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BanknotesIcon className="w-7 h-7 text-indigo-600" />
          موافقات الدفعات
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          مراجعة الدفعات المعلقة واعتمادها أو رفضها. سيتم تحديث رصيد العضو
          تلقائياً فور الاعتماد.
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-700">{stats.total_pending}</div>
            <div className="text-xs text-gray-600 mt-1">دفعات معلقة</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-emerald-700">
              {formatSAR(stats.total_amount)} ر.س
            </div>
            <div className="text-xs text-gray-600 mt-1">إجمالي المبالغ</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-amber-700">{stats.awaiting_verification}</div>
            <div className="text-xs text-gray-600 mt-1">بانتظار التحقق من الإيصال</div>
          </div>
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-sky-700">{stats.unique_payers}</div>
            <div className="text-xs text-gray-600 mt-1">عدد الأعضاء</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو رقم العضوية أو رقم المرجع..."
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">كل الفئات</option>
          <option value="subscription">اشتراك</option>
          <option value="initiative">مبادرة</option>
          <option value="diya">دية</option>
          <option value="for_member">نيابة عن عضو</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-10 rounded-lg text-center text-gray-500">
          لا توجد دفعات معلقة.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const busy = actionLoading === p.id;
            const amount = formatSAR(p.amount);
            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Left: member info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">
                      {p.payer_name || 'عضو غير معروف'}
                    </span>
                    {p.payer_membership_number && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <IdentificationIcon className="w-4 h-4" />
                        {p.payer_membership_number}
                      </span>
                    )}
                    {p.payer_phone && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <PhoneIcon className="w-4 h-4" />
                        {p.payer_phone}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
                      {CATEGORY_LABELS[p.category] || p.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        p.status === 'pending_verification'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <ClockIcon className="w-3 h-3 inline mb-0.5" /> {STATUS_LABELS[p.status] || p.status}
                    </span>
                    {p.reference_number && (
                      <span className="text-xs text-gray-500">
                        مرجع: {p.reference_number}
                      </span>
                    )}
                  </div>
                  {p.beneficiary_id && p.beneficiary_id !== p.payer_id && p.beneficiary_name && (
                    <div className="text-xs text-gray-600 mt-1">
                      الدفع لصالح: {p.beneficiary_name}
                    </div>
                  )}
                  {p.notes && (
                    <div className="text-xs text-gray-500 mt-1 italic">{p.notes}</div>
                  )}
                </div>

                {/* Middle: amount */}
                <div className="text-center px-4 border-x border-gray-100">
                  <div className="text-2xl font-bold text-emerald-700">{amount}</div>
                  <div className="text-xs text-gray-500">ر.س</div>
                </div>

                {/* Right: actions */}
                <div className="flex flex-col gap-2">
                  {p.receipt_url && (
                    <a
                      href={p.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      <DocumentMagnifyingGlassIcon className="w-5 h-5" />
                      عرض الوصل
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={busy}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      موافقة
                    </button>
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={busy}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      رفض
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentApprovalQueue;
