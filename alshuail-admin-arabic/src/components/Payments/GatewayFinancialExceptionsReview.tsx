import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  UserIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';

import {
  GatewayFinancialException,
  GatewayFinancialExceptionReviewStatus,
  gatewayFinancialExceptionService,
  isMeaningfulArabicReviewNotes,
} from '../../services/gatewayFinancialExceptionService';

interface GatewayFinancialExceptionsReviewProps {
  currentUserRole?: string;
  onCountChange?: (count: number) => void;
}

type FinalReviewStatus = Exclude<GatewayFinancialExceptionReviewStatus, 'open'>;

interface SelectedReview {
  item: GatewayFinancialException;
  status: FinalReviewStatus;
}

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const formatDate = (value?: string | null) => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatMinorAmount = (minor: number | null | undefined, currency = 'SAR') => {
  if (minor === null || minor === undefined || !Number.isFinite(Number(minor))) return 'غير متاح';
  try {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: String(currency || 'SAR').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(Number(minor) / 100);
  } catch {
    return `${(Number(minor) / 100).toLocaleString('ar-SA')} ${currency}`;
  }
};

const providerLabel = (provider?: string | null) =>
  provider?.toLowerCase() === 'moyasar' ? 'ميسر' : provider || 'بوابة الدفع';

const providerStatusLabel = (status?: string | null) => {
  switch (status?.toLowerCase()) {
    case 'captured': return 'تم الخصم';
    case 'refunded': return 'تم الاسترداد';
    case 'voided': return 'ملغاة لدى المزود';
    default: return status || 'غير معروف';
  }
};

const exceptionPresentation = (kind: GatewayFinancialException['exception_kind']) => {
  switch (kind) {
    case 'partial_capture':
      return {
        label: 'خصم جزئي',
        description: 'المبلغ المثبت لدى المزود لا يساوي كامل المبلغ المتوقع للدفعة.',
        className: 'border-amber-200 bg-amber-100 text-amber-900',
      };
    case 'partial_refund':
      return {
        label: 'استرداد جزئي',
        description: 'المزود أعاد جزءاً من المبلغ فقط؛ لم تُعكس التسوية محلياً.',
        className: 'border-rose-200 bg-rose-100 text-rose-900',
      };
    case 'invalid_void_evidence':
      return {
        label: 'دليل إلغاء غير مكتمل',
        description: 'حالة الإلغاء لدى المزود لا تحتوي دليلاً زمنياً أو مالياً كافياً.',
        className: 'border-violet-200 bg-violet-100 text-violet-900',
      };
  }
};

const maskEvidenceNumber = (value?: string | null) => {
  const normalized = String(value || '').replace(/\s+/g, '');
  if (!normalized) return null;
  const lastFour = normalized.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  return lastFour ? `•••• ${lastFour}` : 'رقم محجوب';
};

interface ReviewDialogProps {
  selected: SelectedReview;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (notes: string) => void;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  selected,
  submitting,
  error,
  onClose,
  onConfirm,
}) => {
  const [notes, setNotes] = useState('');
  const normalizedNotes = normalizeText(notes);
  const notesAreValid = isMeaningfulArabicReviewNotes(notes);
  const isDismissal = selected.status === 'dismissed';

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  return (
    <div
      className="z-[1300] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.76)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gateway-exception-review-title"
        aria-describedby="gateway-exception-review-description"
        className={`max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-white shadow-2xl ${
          isDismissal ? 'border-slate-300' : 'border-emerald-200'
        }`}
        dir="rtl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isDismissal ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isDismissal
                ? <XCircleIcon className="h-6 w-6" aria-hidden="true" />
                : <CheckCircleIcon className="h-6 w-6" aria-hidden="true" />}
            </span>
            <div>
              <h2 id="gateway-exception-review-title" className="m-0 text-lg font-bold text-slate-900">
                {isDismissal ? 'استبعاد الاستثناء من قائمة المراجعة' : 'تعليم الاستثناء بأنه تمت معالجته'}
              </h2>
              <p id="gateway-exception-review-description" className="mt-1 text-sm leading-7 text-slate-600">
                سجّل قراراً واضحاً وقابلاً للتدقيق. هذا الإجراء لا يغيّر رصيد العضو ولا ينفذ استرداداً مالياً.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="إغلاق نافذة مراجعة الاستثناء"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-slate-500">العضو</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">{selected.item.member_name || 'غير محدد'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">مرجع الدفعة</dt>
              <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-900" dir="ltr">
                {selected.item.reference_number || selected.item.payment_id}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">المتوقع</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900" dir="ltr">
                {formatMinorAmount(selected.item.expected_minor, selected.item.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">الفعلي لدى المزود</dt>
              <dd className="mt-1 text-sm font-bold text-rose-700" dir="ltr">
                {formatMinorAmount(selected.item.actual_minor, selected.item.currency)}
              </dd>
            </div>
          </dl>

          <div>
            <label htmlFor="gateway-exception-review-notes" className="mb-2 block text-sm font-bold text-slate-800">
              ملاحظات المراجعة بالعربية <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <textarea
              id="gateway-exception-review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              maxLength={500}
              disabled={submitting}
              autoFocus
              placeholder={isDismissal
                ? 'اشرح سبب استبعاد التنبيه، والدليل الذي يؤكد أنه لا يتطلب إجراءً مالياً.'
                : 'اشرح الإجراء المالي الذي تم خارج هذه الشاشة، وكيف تمت مطابقة المبلغ مع دليل المزود.'}
              className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-100"
              aria-invalid={notes.length > 0 && !notesAreValid}
              aria-describedby="gateway-exception-review-notes-help"
            />
            <div id="gateway-exception-review-notes-help" className="mt-1 flex items-center justify-between gap-3 text-xs">
              <span className={notes.length > 0 && !notesAreValid ? 'text-rose-700' : 'text-slate-500'}>
                من 10 إلى 500 حرف، وتتضمن وصفاً عربياً فعلياً للقرار.
              </span>
              <span className="text-slate-500" dir="ltr">{notes.length}/500</span>
            </div>
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
            onClick={() => onConfirm(normalizedNotes)}
            disabled={!notesAreValid || submitting}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-300 ${
              isDismissal
                ? 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500/20'
                : 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-500/20'
            }`}
          >
            {submitting
              ? <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
              : isDismissal
                ? <XCircleIcon className="h-5 w-5" aria-hidden="true" />
                : <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />}
            {submitting ? 'جارٍ حفظ المراجعة…' : isDismissal ? 'تأكيد الاستبعاد' : 'تأكيد اكتمال المعالجة'}
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

const GatewayFinancialExceptionsReview: React.FC<GatewayFinancialExceptionsReviewProps> = ({
  currentUserRole,
  onCountChange,
}) => {
  const [items, setItems] = useState<GatewayFinancialException[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedReview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canReview = currentUserRole === 'super_admin';

  const loadExceptions = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await gatewayFinancialExceptionService.listOpenExceptions(50);
      setItems(result.items);
      setTotal(result.total);
      onCountChange?.(result.total);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الاستثناءات المالية');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const totals = useMemo(() => items.reduce((summary, item) => ({
    expected: summary.expected + item.expected_minor,
    actual: summary.actual + (item.actual_minor || 0),
  }), { expected: 0, actual: 0 }), [items]);

  const openReview = (item: GatewayFinancialException, status: FinalReviewStatus) => {
    if (!canReview) return;
    setSelected({ item, status });
    setActionError(null);
    setSuccess(null);
  };

  const closeReview = useCallback(() => {
    if (submitting) return;
    setSelected(null);
    setActionError(null);
  }, [submitting]);

  const submitReview = async (notes: string) => {
    if (!selected || !canReview || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await gatewayFinancialExceptionService.reviewException(selected.item.id, {
        review_status: selected.status,
        review_notes: notes,
      });
      const remainingItems = items.filter((item) => item.id !== selected.item.id);
      const remainingTotal = Math.max(0, total - 1);
      setItems(remainingItems);
      setTotal(remainingTotal);
      onCountChange?.(remainingTotal);
      setSuccess(selected.status === 'resolved'
        ? `تم توثيق معالجة الاستثناء المرتبط بالدفعة ${selected.item.reference_number || selected.item.payment_id}.`
        : `تم استبعاد الاستثناء المرتبط بالدفعة ${selected.item.reference_number || selected.item.payment_id} مع حفظ السبب.`);
      setSelected(null);
      await loadExceptions(true);
    } catch (reviewError: unknown) {
      setActionError(reviewError instanceof Error ? reviewError.message : 'تعذر حفظ مراجعة الاستثناء المالي');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-5 font-arabic" dir="rtl" aria-labelledby="gateway-financial-exceptions-title">
      <div className="overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-bl from-orange-50 via-white to-amber-50 shadow-sm">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-800 ring-1 ring-orange-200">
              <ExclamationTriangleIcon className="h-7 w-7" aria-hidden="true" />
              {total > 0 && <span className="absolute -start-2 -top-2 min-w-6 rounded-full bg-rose-700 px-1.5 py-0.5 text-center text-xs font-bold text-white">{total}</span>}
            </span>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 id="gateway-financial-exceptions-title" className="m-0 text-xl font-bold text-slate-900">
                  مراجعة الاستثناءات المالية
                </h2>
                <span className="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-900">
                  تتطلب قراراً بشرياً
                </span>
              </div>
              <p className="m-0 max-w-3xl text-sm leading-7 text-slate-700">
                أدلة دفع جزئية أو غير مكتملة تم عزلها تلقائياً دون تغيير رصيد العضو أو الأقساط. طابق هوية الدفعة والمبالغ قبل توثيق القرار.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadExceptions(true)}
            disabled={loading || refreshing || submitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshing ? 'جارٍ التحديث…' : 'تحديث القائمة'}
          </button>
        </div>
      </div>

      {!loading && (!error || items.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">استثناءات مفتوحة</div>
            <div className="mt-1 text-2xl font-bold text-orange-800">{total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">إجمالي المتوقع في القائمة</div>
            <div className="mt-1 text-base font-bold text-slate-900" dir="ltr">{formatMinorAmount(totals.expected, 'SAR')}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">إجمالي الفعلي في القائمة</div>
            <div className="mt-1 text-base font-bold text-rose-700" dir="ltr">{formatMinorAmount(totals.actual, 'SAR')}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">صلاحيتك الحالية</div>
                <div className={`mt-1 text-sm font-bold ${canReview ? 'text-teal-800' : 'text-slate-700'}`}>
                  {canReview ? 'اتخاذ قرار موثّق' : 'المشاهدة فقط'}
                </div>
              </div>
              <ShieldCheckIcon className={`h-6 w-6 ${canReview ? 'text-teal-700' : 'text-slate-500'}`} aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {!canReview && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-900" role="note">
          يمكنك فحص هوية العضو والدفعة ودليل المزود فقط. تعليم الاستثناء بالمعالجة أو الاستبعاد محصور بدور <strong>المشرف العام</strong>.
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
            <button type="button" onClick={() => loadExceptions()} className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-500/15">
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="جاري تحميل الاستثناءات المالية" aria-busy="true">
          {[0, 1].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-6 h-6 w-1/3 rounded bg-slate-200" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-4/5 rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="rounded-3xl border border-emerald-200 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircleIcon className="h-9 w-9" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-slate-900">لا توجد استثناءات مالية مفتوحة</h3>
          <p className="mt-2 text-sm text-slate-600">لا توجد أدلة جزئية أو غير مكتملة تتطلب مراجعة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {items.map((item) => {
            const kind = exceptionPresentation(item.exception_kind);
            const source = item.evidence.source;
            const maskedNumber = maskEvidenceNumber(source?.number || source?.dpan);
            return (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-orange-300 hover:shadow-md">
                <div className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${kind.className}`}>{kind.label}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          {providerStatusLabel(item.provider_status)}
                        </span>
                      </div>
                      <div className="mt-2 break-all font-mono text-xs font-bold text-slate-700" dir="ltr">
                        {item.reference_number || item.payment_id}
                      </div>
                    </div>
                    <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-center">
                      <div className="text-[10px] font-semibold text-orange-700">تكرار الرصد</div>
                      <div className="text-lg font-bold text-orange-900">{item.occurrence_count}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                        <UserIcon className="h-4 w-4" aria-hidden="true" /> العضو
                      </div>
                      <div className="truncate text-sm font-bold text-slate-900">{item.member_name || 'غير محدد'}</div>
                      <div className="mt-1 text-xs text-slate-600" dir="ltr">{item.member_phone || item.member_id || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                        <IdentificationIcon className="h-4 w-4" aria-hidden="true" /> هوية الدفعة
                      </div>
                      <div className="break-all font-mono text-xs font-bold text-slate-900" dir="ltr">{item.payment_id}</div>
                      <div className="mt-1 break-all font-mono text-[11px] text-slate-600" dir="ltr">{item.gateway_payment_id}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs font-bold text-emerald-800">المبلغ المتوقع</div>
                      <div className="mt-1 text-lg font-bold text-emerald-950" dir="ltr">{formatMinorAmount(item.expected_minor, item.currency)}</div>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <div className="text-xs font-bold text-rose-800">المبلغ الفعلي لدى المزود</div>
                      <div className="mt-1 text-lg font-bold text-rose-950" dir="ltr">{formatMinorAmount(item.actual_minor, item.currency)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border-s-4 border-orange-500 bg-orange-50 px-4 py-3 text-sm leading-7 text-orange-950">
                    <strong>{kind.label}:</strong> {kind.description}
                  </div>

                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                        <CreditCardIcon className="h-4 w-4" aria-hidden="true" /> دليل المزود المُنقّى
                      </div>
                      <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-900">
                        {providerLabel(item.gateway_provider)}
                      </span>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-xs sm:grid-cols-2">
                      <div><dt className="text-teal-700">حالة الدليل</dt><dd className="mt-0.5 font-bold text-teal-950">{providerStatusLabel(item.evidence.status || item.provider_status)}</dd></div>
                      <div><dt className="text-teal-700">وسيلة الدفع</dt><dd className="mt-0.5 font-bold text-teal-950">{source?.company || source?.type || 'غير متاحة'} {maskedNumber && <span dir="ltr">({maskedNumber})</span>}</dd></div>
                      {source?.reference_number && <div className="sm:col-span-2"><dt className="text-teal-700">مرجع المزود المنقّى</dt><dd className="mt-0.5 break-all font-mono font-bold text-teal-950" dir="ltr">{source.reference_number}</dd></div>}
                      {source?.response_code && <div><dt className="text-teal-700">رمز الاستجابة</dt><dd className="mt-0.5 font-mono font-bold text-teal-950" dir="ltr">{source.response_code}</dd></div>}
                      {source?.message && <div className="sm:col-span-2"><dt className="text-teal-700">رسالة المزود المنقّاة</dt><dd className="mt-0.5 break-words font-semibold leading-6 text-teal-950">{source.message}</dd></div>}
                    </dl>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                      <div><div className="font-semibold text-slate-500">أول رصد</div><time className="mt-1 block font-bold text-slate-800" dateTime={item.first_seen_at || undefined}>{formatDate(item.first_seen_at)}</time></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowPathIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                      <div><div className="font-semibold text-slate-500">آخر رصد</div><time className="mt-1 block font-bold text-slate-800" dateTime={item.last_seen_at || undefined}>{formatDate(item.last_seen_at)}</time></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs leading-6 text-slate-500">
                      <BanknotesIcon className="h-4 w-4" aria-hidden="true" />
                      لا يغيّر هذا القرار الرصيد أو حالة الدفع.
                    </div>
                    {canReview ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => openReview(item, 'resolved')}
                          disabled={submitting}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <CheckCircleIcon className="h-4 w-4" aria-hidden="true" /> تمّت المعالجة
                        </button>
                        <button
                          type="button"
                          onClick={() => openReview(item, 'dismissed')}
                          disabled={submitting}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircleIcon className="h-4 w-4" aria-hidden="true" /> استبعاد مع السبب
                        </button>
                      </div>
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

      {selected && (
        <ReviewDialog
          selected={selected}
          submitting={submitting}
          error={actionError}
          onClose={closeReview}
          onConfirm={submitReview}
        />
      )}
    </section>
  );
};

export default GatewayFinancialExceptionsReview;
