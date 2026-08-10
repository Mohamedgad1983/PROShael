import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';

import {
  gatewayRefundService,
  PendingGatewayRefund,
} from '../../services/gatewayRefundService';

interface PendingRefundReviewProps {
  currentUserRole?: string;
  onCountChange?: (count: number) => void;
}

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

export const isMeaningfulRefundReason = (value: string) => {
  const normalized = normalizeText(value);
  const meaningfulCharacters = normalized.match(/[A-Za-z0-9\u0600-\u06FF]/g) || [];
  return normalized.length >= 10 && normalized.length <= 500 && meaningfulCharacters.length >= 8;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatCurrencyAmount = (amountValue: string | number, currencyValue?: string | null) => {
  const amount = Number(amountValue) || 0;
  const currency = String(currencyValue || 'SAR').toUpperCase();
  try {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('ar-SA')} ${currency}`;
  }
};

const formatAmount = (refund: PendingGatewayRefund) =>
  formatCurrencyAmount(refund.amount, refund.gateway_currency);

const formatProviderAmount = (refund: PendingGatewayRefund) => {
  const amountMinor = Number(refund.gateway_amount_minor);
  if (!Number.isFinite(amountMinor)) return 'غير متاح';
  return formatCurrencyAmount(amountMinor / 100, refund.gateway_currency);
};

const categoryLabel = (category?: string | null) => {
  switch (category) {
    case 'subscription': return 'اشتراك';
    case 'initiative': return 'مبادرة';
    case 'diya': return 'دية';
    case 'occasion': return 'مناسبة';
    default: return category || 'دفعة';
  }
};

const providerLabel = (provider?: string | null) =>
  provider?.toLowerCase() === 'moyasar' ? 'ميسر' : provider || 'بوابة الدفع';

const gatewayStatusLabel = (status?: string | null) => {
  switch (status?.toLowerCase()) {
    case 'paid': return 'مدفوعة لدى المزود';
    case 'captured': return 'تم الخصم لدى المزود';
    case 'refunded': return 'مستردة لدى المزود';
    default: return status || 'غير معروف';
  }
};

const operationStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'processing': return 'محاولة استرداد جارية';
    case 'failed': return 'تعذرت محاولة سابقة';
    case 'succeeded': return 'اكتمل الاسترداد';
    default: return null;
  }
};

interface RefundConfirmationDialogProps {
  refund: PendingGatewayRefund;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string, confirmationPaymentId: string) => void;
}

const RefundConfirmationDialog: React.FC<RefundConfirmationDialogProps> = ({
  refund,
  submitting,
  error,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [confirmationPaymentId, setConfirmationPaymentId] = useState('');
  const paymentId = String(refund.id);
  const normalizedReason = normalizeText(reason);
  const reasonIsValid = isMeaningfulRefundReason(reason);
  const confirmationMatches = confirmationPaymentId.trim() === paymentId;
  const canSubmit = reasonIsValid && confirmationMatches && !submitting;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  return (
    <div
      className="gateway-refund-overlay z-[1300] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.76)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gateway-refund-dialog-title"
        aria-describedby="gateway-refund-dialog-description"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-rose-200 bg-white shadow-2xl"
        dir="rtl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <ArrowUturnLeftIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 id="gateway-refund-dialog-title" className="m-0 text-lg font-bold text-slate-900">
                تنفيذ استرداد بوابة الدفع
              </h2>
              <p id="gateway-refund-dialog-description" className="mt-1 text-sm leading-7 text-slate-600">
                هذا الإجراء يطلب من {providerLabel(refund.gateway_provider)} إعادة كامل المبلغ، ثم يحدّث السجل المحلي فقط بعد تأكيد المزود.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="إغلاق نافذة الاسترداد"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
              <div>
                <div className="font-bold">تنبيه مالي مهم</div>
                <p className="mt-1 text-sm leading-7">
                  المبلغ خُصم فعلياً لدى بوابة الدفع، لكنه لم يُضف إلى رصيد العضو. لا تستخدم تحديث الحالة العام لمعالجة هذه العملية.
                </p>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-slate-500">رقم العملية المحلية</dt>
              <dd className="mt-1 select-all break-all font-mono text-sm font-bold text-slate-900" dir="ltr">{paymentId}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">المبلغ المطلوب استرداده</dt>
              <dd className="mt-1 text-sm font-bold text-rose-700" dir="ltr">{formatAmount(refund)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">معرف العملية لدى {providerLabel(refund.gateway_provider)}</dt>
              <dd className="mt-1 select-all break-all font-mono text-xs font-semibold text-slate-800" dir="ltr">
                {refund.gateway_payment_id || 'غير متاح'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">مبلغ الخصم وفق دليل المزود</dt>
              <dd className="mt-1 text-sm font-bold text-teal-800" dir="ltr">{formatProviderAmount(refund)}</dd>
            </div>
          </dl>

          <div>
            <label htmlFor="gateway-refund-reason" className="mb-2 block text-sm font-bold text-slate-800">
              سبب الاسترداد <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <textarea
              id="gateway-refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              maxLength={500}
              disabled={submitting}
              autoFocus
              placeholder="اشرح سبب الاسترداد بوضوح، مثل: تجاوز رصيد الاشتراك الحد بعد تأكيد الخصم لدى ميسر."
              className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 disabled:bg-slate-100"
              aria-invalid={reason.length > 0 && !reasonIsValid}
            />
            <div className="mt-1 flex items-center justify-between gap-3 text-xs">
              <span className={reason.length > 0 && !reasonIsValid ? 'text-rose-700' : 'text-slate-500'}>
                من 10 إلى 500 حرف، مع وصف فعلي للسبب.
              </span>
              <span className="text-slate-500" dir="ltr">{reason.length}/500</span>
            </div>
          </div>

          <div>
            <label htmlFor="gateway-refund-confirmation" className="mb-2 block text-sm font-bold text-slate-800">
              اكتب رقم العملية للتأكيد <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <input
              id="gateway-refund-confirmation"
              type="text"
              value={confirmationPaymentId}
              onChange={(event) => setConfirmationPaymentId(event.target.value)}
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              placeholder={paymentId}
              className={`w-full rounded-2xl border bg-white px-4 py-3 font-mono text-sm text-slate-900 focus:outline-none focus:ring-4 disabled:bg-slate-100 ${
                confirmationPaymentId.length > 0 && !confirmationMatches
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/10'
              }`}
              dir="ltr"
              aria-invalid={confirmationPaymentId.length > 0 && !confirmationMatches}
              aria-describedby="gateway-refund-confirmation-help"
            />
            <p id="gateway-refund-confirmation-help" className="mt-1 text-xs text-slate-500">
              يجب أن يطابق الرقم أعلاه حرفياً لمنع استرداد عملية أخرى بالخطأ.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-7 text-rose-800">
              {error}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:px-7">
          <button
            type="button"
            onClick={() => onConfirm(normalizedReason, confirmationPaymentId.trim())}
            disabled={!canSubmit}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ArrowUturnLeftIcon className="h-5 w-5" aria-hidden="true" />}
            {submitting ? 'جارٍ التحقق والاسترداد…' : 'تنفيذ الاسترداد عبر ميسر'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            إلغاء
          </button>
        </footer>
      </section>
    </div>
  );
};

const PendingRefundReview: React.FC<PendingRefundReviewProps> = ({ currentUserRole, onCountChange }) => {
  const [refunds, setRefunds] = useState<PendingGatewayRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<PendingGatewayRefund | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canExecuteRefund = currentUserRole === 'super_admin';

  const loadRefunds = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await gatewayRefundService.listPendingRefunds();
      setRefunds(result.data);
      onCountChange?.(result.count);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل عمليات الاسترداد المطلوبة');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    refunds.forEach((refund) => {
      const currency = String(refund.gateway_currency || 'SAR').toUpperCase();
      totals.set(currency, (totals.get(currency) || 0) + (Number(refund.amount) || 0));
    });
    return Array.from(totals.entries());
  }, [refunds]);

  const openRefundDialog = (refund: PendingGatewayRefund) => {
    if (!canExecuteRefund) return;
    setSelectedRefund(refund);
    setActionError(null);
    setSuccess(null);
  };

  const closeRefundDialog = useCallback(() => {
    if (submitting) return;
    setSelectedRefund(null);
    setActionError(null);
  }, [submitting]);

  const executeRefund = async (reason: string, confirmationPaymentId: string) => {
    if (!selectedRefund || !canExecuteRefund || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const result = await gatewayRefundService.refundPendingPayment(selectedRefund.id, {
        reason,
        confirmation_payment_id: confirmationPaymentId,
      });
      setSuccess(result.idempotent_replay
        ? `العملية ${selectedRefund.id} مستردة مسبقاً، وتمت مطابقة السجل بنجاح.`
        : `أكدت بوابة الدفع استرداد العملية ${selectedRefund.id} بالكامل.`);
      const remainingRefunds = refunds.filter(
        (refund) => String(refund.id) !== String(selectedRefund.id)
      );
      setRefunds(remainingRefunds);
      onCountChange?.(remainingRefunds.length);
      setSelectedRefund(null);
      await loadRefunds(true);
    } catch (refundError: unknown) {
      setActionError(refundError instanceof Error ? refundError.message : 'تعذر تنفيذ الاسترداد الآمن');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-5 font-arabic" dir="rtl" aria-labelledby="pending-refunds-title">
      <div className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-bl from-amber-50 via-white to-rose-50 shadow-sm">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-amber-200">
              <ExclamationTriangleIcon className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 id="pending-refunds-title" className="m-0 text-xl font-bold text-slate-900">مراجعة الاستردادات المعلقة</h2>
                <span className="rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 font-mono text-[11px] font-bold text-rose-800" dir="ltr">
                  pending_refund
                </span>
              </div>
              <p className="m-0 max-w-3xl text-sm leading-7 text-slate-700">
                هذه مبالغ خُصمت فعلياً لدى مزود الدفع، لكن النظام لم يقيدها في رصيد العضو. يجب مراجعة الدليل ثم تنفيذ الاسترداد من المسار المخصص فقط.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadRefunds(true)}
            disabled={loading || refreshing || submitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshing ? 'جارٍ التحديث…' : 'تحديث القائمة'}
          </button>
        </div>
      </div>

      {!loading && (!error || refunds.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">عمليات تتطلب مراجعة</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{refunds.length}</div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <ArrowUturnLeftIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">إجمالي الالتزام</div>
                <div className="mt-1 text-base font-bold text-rose-700" dir="ltr">
                  {totalsByCurrency.length > 0
                    ? totalsByCurrency.map(([currency, amount]) => formatCurrencyAmount(amount, currency)).join(' + ')
                    : formatCurrencyAmount(0, 'SAR')}
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <BanknotesIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">صلاحيتك الحالية</div>
                <div className={`mt-1 text-sm font-bold ${canExecuteRefund ? 'text-teal-800' : 'text-slate-700'}`}>
                  {canExecuteRefund ? 'المراجعة وتنفيذ الاسترداد' : 'المراجعة فقط دون تنفيذ'}
                </div>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${canExecuteRefund ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      )}

      {!canExecuteRefund && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-900" role="note">
          يمكنك مراجعة تفاصيل العمليات والأدلة فقط. تنفيذ الاسترداد محصور بدور <strong>المشرف العام</strong>.
        </div>
      )}

      <div aria-live="polite" className="space-y-3">
        {success && (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-7 text-emerald-900">
            <CheckCircleIcon className="mt-1 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm font-semibold leading-7">
              <ExclamationTriangleIcon className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => loadRefunds()} className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100">
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="جاري تحميل عمليات الاسترداد">
          {[0, 1].map((item) => (
            <div key={item} className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-6 h-6 w-1/3 rounded bg-slate-200" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-4/5 rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : !error && refunds.length === 0 ? (
        <div className="rounded-3xl border border-emerald-200 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircleIcon className="h-9 w-9" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-slate-900">لا توجد استردادات معلقة</h3>
          <p className="mt-2 text-sm text-slate-600">كل عمليات الخصم المسجلة تمت تسويتها أو استردادها.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {refunds.map((refund) => {
            const operationLabel = operationStatusLabel(refund.refund_operation_status);
            return (
              <article key={String(refund.id)} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-amber-300 hover:shadow-md">
                <div className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">بانتظار الاسترداد</span>
                        <span className="font-mono text-xs font-bold text-slate-700" dir="ltr">#{String(refund.id)}</span>
                      </div>
                      <div className="mt-2 text-lg font-bold text-slate-900" dir="ltr">{formatAmount(refund)}</div>
                    </div>
                    <div className="text-end">
                      <div className="text-xs font-semibold text-slate-500">تم التحقق من الخصم</div>
                      <time className="mt-1 block text-xs text-slate-700" dateTime={refund.gateway_verified_at || undefined}>
                        {formatDate(refund.gateway_verified_at)}
                      </time>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                        <UserIcon className="h-4 w-4" aria-hidden="true" /> العضو
                      </div>
                      <div className="truncate text-sm font-bold text-slate-900">{refund.member_name || 'غير محدد'}</div>
                      <div className="mt-1 text-xs text-slate-600" dir="ltr">{refund.member_phone || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                        <IdentificationIcon className="h-4 w-4" aria-hidden="true" /> مرجع الدفع
                      </div>
                      <div className="break-all font-mono text-xs font-bold text-slate-900" dir="ltr">{refund.reference_number || '—'}</div>
                      <div className="mt-1 text-xs text-slate-600">{categoryLabel(refund.category)}</div>
                    </div>
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                          <CreditCardIcon className="h-4 w-4" aria-hidden="true" /> دليل مزود الدفع
                        </div>
                        <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-900">
                          {gatewayStatusLabel(refund.gateway_status)}
                        </span>
                      </div>
                      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                        <div><dt className="text-teal-700">المزود</dt><dd className="font-bold text-teal-950">{providerLabel(refund.gateway_provider)}</dd></div>
                        <div><dt className="text-teal-700">وسيلة الدفع</dt><dd className="font-bold text-teal-950">{refund.source_company || refund.source_type || 'غير متاحة'} {refund.masked_card ? <span dir="ltr">({refund.masked_card})</span> : null}</dd></div>
                        <div><dt className="text-teal-700">المبلغ المثبت لدى المزود</dt><dd className="font-bold text-teal-950" dir="ltr">{formatProviderAmount(refund)}</dd></div>
                        <div className="sm:col-span-3"><dt className="text-teal-700">معرف المزود</dt><dd className="select-all break-all font-mono font-bold text-teal-950" dir="ltr">{refund.gateway_payment_id}</dd></div>
                      </dl>
                    </div>
                  </div>

                  <div className="rounded-2xl border-s-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
                    <strong>سبب الالتزام:</strong> تجاوز سقف الاشتراك بعد تأكيد الخصم؛ لم يُقيد المبلغ في رصيد العضو.
                  </div>

                  {operationLabel && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${refund.refund_operation_status === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                      <div className="flex items-center gap-2 font-bold">
                        <ClockIcon className="h-4 w-4" aria-hidden="true" />
                        {operationLabel}
                        {refund.refund_attempt_count ? <span className="text-xs">({refund.refund_attempt_count} محاولة)</span> : null}
                      </div>
                      {refund.refund_last_error && <p className="mt-1 break-words text-xs leading-6">{refund.refund_last_error}</p>}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs leading-6 text-slate-500">
                      أُنشئت العملية: {formatDate(refund.created_at)}
                    </div>
                    {canExecuteRefund ? (
                      <button
                        type="button"
                        onClick={() => openRefundDialog(refund)}
                        disabled={submitting || refund.refund_operation_status === 'processing'}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
                        {refund.refund_operation_status === 'processing' ? 'الاسترداد قيد التنفيذ' : 'مراجعة وتنفيذ الاسترداد'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                        <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" /> للعرض فقط
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedRefund && (
        <RefundConfirmationDialog
          refund={selectedRefund}
          submitting={submitting}
          error={actionError}
          onClose={closeRefundDialog}
          onConfirm={executeRefund}
        />
      )}
    </section>
  );
};

export default PendingRefundReview;
