import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  IdentificationIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';

import {
  GatewayReconciliationReviewAction,
  GatewayReconciliationReviewItem,
  gatewayReconciliationReviewService,
  isMeaningfulArabicReconciliationReviewReason,
} from '../../services/gatewayReconciliationReviewService';

interface GatewayReconciliationReviewQueueProps {
  currentUserRole?: string;
  onCountChange?: (count: number) => void;
}

interface SelectedAction {
  item: GatewayReconciliationReviewItem;
  action: GatewayReconciliationReviewAction;
}

const PAGE_SIZE = 24;

const formatDate = (value?: string | null) => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متاح';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatAmount = (item: GatewayReconciliationReviewItem) => {
  try {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: item.currency || 'SAR',
      maximumFractionDigits: 2,
    }).format(item.amount);
  } catch {
    return `${item.amount.toLocaleString('ar-SA')} ${item.currency}`;
  }
};

const categoryLabel = (item: GatewayReconciliationReviewItem) => {
  if (item.is_financing) return 'تمويل عائلي / زواج';
  switch (item.category) {
    case 'subscription': return 'اشتراك عضو';
    case 'initiative': return 'مبادرة';
    case 'diya': return 'دية';
    default: return item.category || 'دفعة';
  }
};

const paymentStatusLabel = (status: string) => {
  switch (status) {
    case 'cancelled': return 'ملغاة محلياً';
    case 'pending': return 'قيد الانتظار';
    case 'pending_verification': return 'بانتظار التحقق';
    case 'paid': return 'مدفوعة';
    case 'pending_refund': return 'بانتظار الاسترداد';
    default: return status || 'غير معروف';
  }
};

const reviewPresentation = (reason: GatewayReconciliationReviewItem['review_reason']) => {
  switch (reason) {
    case 'provider_not_found_bounded':
      return {
        label: 'لم يعثر المزود على العملية',
        description: 'توقفت المحاولات الآلية بعد أربع نتائج 404 متتالية خلال 24 ساعة على الأقل.',
        className: 'border-amber-200 bg-amber-50 text-amber-900',
      };
    case 'gateway_evidence_mismatch':
      return {
        label: 'عدم تطابق بيانات العملية',
        description: 'هوية العملية أو المبلغ أو العملة لدى المزود لا تطابق السجل المحلي.',
        className: 'border-rose-200 bg-rose-50 text-rose-900',
      };
    case 'gateway_financial_exception':
      return {
        label: 'استثناء مالي يحتاج مراجعة',
        description: 'تم عزل دليل مالي غير متوقع لحماية الرصيد ومنع التسوية الآلية.',
        className: 'border-violet-200 bg-violet-50 text-violet-900',
      };
    default:
      return {
        label: 'مراجعة تشغيلية يدوية',
        description: 'سجل قديم يحتاج قراراً موثقاً قبل استئناف المصالحة أو إغلاقها.',
        className: 'border-slate-200 bg-slate-50 text-slate-800',
      };
  }
};

const ActionDialog: React.FC<{
  selected: SelectedAction;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}> = ({ selected, submitting, error, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const normalizedReason = reason.trim().replace(/\s+/g, ' ');
  const reasonIsValid = isMeaningfulArabicReconciliationReviewReason(reason);
  const isRequeue = selected.action === 'requeue';

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
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
        aria-labelledby="gateway-reconciliation-action-title"
        className={`max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-white shadow-2xl ${
          isRequeue ? 'border-sky-200' : 'border-emerald-200'
        }`}
        dir="rtl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isRequeue ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isRequeue
                ? <ArrowPathIcon className="h-6 w-6" aria-hidden="true" />
                : <CheckBadgeIcon className="h-6 w-6" aria-hidden="true" />}
            </span>
            <div>
              <h2 id="gateway-reconciliation-action-title" className="m-0 text-lg font-bold text-slate-950">
                {isRequeue ? 'إعادة المصالحة إلى الطابور الآمن' : 'إغلاق المراجعة التشغيلية'}
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                {isRequeue
                  ? 'ستُعاد محاولة قراءة الحالة من مزود الدفع. لن يتغير رصيد العضو أو حالة الدفعة من هذا القرار.'
                  : 'ستتوقف المصالحة الآلية نهائياً لهذا السجل. لا يُعد هذا الإجراء استرداداً أو تسوية مالية.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            aria-label="إغلاق نافذة قرار المصالحة"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">السجل المحدد تلقائياً</div>
            <div className="mt-1 text-sm font-bold text-slate-950">
              {selected.item.member_name || 'عضو غير محدد'} — {formatAmount(selected.item)}
            </div>
            <div className="mt-1 font-mono text-xs text-slate-600" dir="ltr">
              {selected.item.payment_reference || selected.item.gateway_payment_id_masked || 'مرجع محجوب'}
            </div>
          </div>

          <div>
            <label htmlFor="gateway-reconciliation-review-reason" className="mb-2 block text-sm font-bold text-slate-800">
              سبب القرار بالعربية <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <textarea
              id="gateway-reconciliation-review-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={5}
              maxLength={500}
              disabled={submitting}
              autoFocus
              placeholder={isRequeue
                ? 'مثال: تمت مطابقة المرجع مع لوحة ميسر والتأكد من جاهزية إعادة التحقق الآمن.'
                : 'مثال: تمت مراجعة كشف ميسر والسجل البنكي وتوثيق سبب إغلاق المتابعة الآلية.'}
              className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-950 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-600/10 disabled:bg-slate-100"
              aria-invalid={reason.length > 0 && !reasonIsValid}
              aria-describedby="gateway-reconciliation-review-reason-help"
            />
            <div id="gateway-reconciliation-review-reason-help" className="mt-1 flex items-center justify-between gap-3 text-xs">
              <span className={reason.length > 0 && !reasonIsValid ? 'text-rose-700' : 'text-slate-500'}>
                من 12 إلى 500 حرف، مع وصف عربي فعلي وقابل للتدقيق.
              </span>
              <span className="text-slate-500" dir="ltr">{reason.length}/500</span>
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
            onClick={() => onConfirm(normalizedReason)}
            disabled={!reasonIsValid || submitting}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
              isRequeue ? 'bg-sky-700 hover:bg-sky-800' : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {submitting && <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {submitting ? 'جارٍ حفظ القرار…' : isRequeue ? 'تأكيد إعادة المحاولة' : 'تأكيد إغلاق المراجعة'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            رجوع
          </button>
        </footer>
      </section>
    </div>
  );
};

const GatewayReconciliationReviewQueue: React.FC<GatewayReconciliationReviewQueueProps> = ({
  currentUserRole,
  onCountChange,
}) => {
  const [items, setItems] = useState<GatewayReconciliationReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canRead = ['super_admin', 'financial_manager'].includes(currentUserRole || '');
  const canAct = currentUserRole === 'super_admin';

  const load = useCallback(async (requestedPage = page) => {
    if (!canRead) return;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await gatewayReconciliationReviewService.listReviewRequired(requestedPage, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.total_pages);
      setPage(result.page);
      onCountChange?.(result.total);
    } catch (error) {
      setItems([]);
      setLoadError(error instanceof Error ? error.message : 'تعذر تحميل قائمة مراجعة المصالحة');
    } finally {
      setLoading(false);
    }
  }, [canRead, onCountChange, page]);

  useEffect(() => {
    load(1);
    // The queue owns its initial page. Subsequent paging is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const reasonCounts = useMemo(() => items.reduce<Record<string, number>>((counts, item) => {
    counts[item.review_reason] = (counts[item.review_reason] || 0) + 1;
    return counts;
  }, {}), [items]);

  const submitAction = async (reason: string) => {
    if (!selected || !canAct) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await gatewayReconciliationReviewService.act(selected.item.payment_id, selected.action, reason);
      const actionLabel = selected.action === 'requeue' ? 'إعادة العملية إلى طابور المصالحة' : 'إغلاق المراجعة';
      setSuccessMessage(`تم ${actionLabel} وتسجيل القرار في سجل التدقيق دون تغيير الرصيد.`);
      setSelected(null);
      const targetPage = items.length === 1 && page > 1 ? page - 1 : page;
      await load(targetPage);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'تعذر حفظ قرار المراجعة');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canRead) {
    return (
      <div dir="rtl" className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900">
        <LockClosedIcon className="mx-auto h-9 w-9" aria-hidden="true" />
        <h3 className="mt-3 text-lg font-bold">غير مصرح بعرض قائمة مراجعة المصالحة</h3>
      </div>
    );
  }

  return (
    <section dir="rtl" className="space-y-5" aria-labelledby="gateway-reconciliation-review-heading">
      <header className="overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-l from-sky-950 via-slate-900 to-teal-950 p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <ShieldCheckIcon className="h-7 w-7 text-sky-200" aria-hidden="true" />
            </span>
            <div>
              <h2 id="gateway-reconciliation-review-heading" className="m-0 text-xl font-black sm:text-2xl">
                مراجعة مصالحة بوابة الدفع
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-sky-100">
                عمليات أوقفتها قواعد الأمان بعد تعذر التحقق الآلي. العرض يخفي المعرفات الحساسة، وكل قرار إداري موثق ولا يغيّر الرصيد أو الدفعة.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20">
              <div className="text-xs text-sky-100">بانتظار المراجعة</div>
              <div className="text-2xl font-black" dir="ltr">{total}</div>
            </div>
            <button
              type="button"
              onClick={() => load(page)}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-sky-50 disabled:opacity-60"
              aria-label="تحديث قائمة مراجعة المصالحة"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              تحديث
            </button>
          </div>
        </div>
      </header>

      {!canAct && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-950">
          <EyeIcon className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <div><strong>وضع القراءة فقط:</strong> المدير المالي يستطيع فحص السجلات، بينما إعادة المحاولة أو الإغلاق متاحان للمشرف العام فقط.</div>
        </div>
      )}

      {successMessage && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-7 text-emerald-900">
          <CheckBadgeIcon className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      {loadError && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <div className="font-bold">تعذر تحميل قائمة المصالحة</div>
              <p className="mt-1 text-sm leading-7">{loadError}</p>
              <button type="button" onClick={() => load(page)} className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && !loadError && (
        <div aria-label="جارٍ تحميل قائمة مراجعة المصالحة" className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((index) => <div key={index} className="h-64 animate-pulse rounded-3xl bg-slate-200" />)}
        </div>
      )}

      {!loading && !loadError && items.length === 0 && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-950">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-black">لا توجد عمليات مصالحة تحتاج مراجعة</h3>
          <p className="mt-2 text-sm leading-7">جميع هويات بوابة الدفع إما قيد المتابعة الآلية أو وصلت إلى حالة نهائية موثقة.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2" aria-label="ملخص أسباب المراجعة">
            {Object.entries(reasonCounts).map(([reason, count]) => (
              <span key={reason} className={`rounded-full border px-3 py-1 text-xs font-bold ${
                reviewPresentation(reason as GatewayReconciliationReviewItem['review_reason']).className
              }`}>
                {reviewPresentation(reason as GatewayReconciliationReviewItem['review_reason']).label}: {count}
              </span>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => {
              const presentation = reviewPresentation(item.review_reason);
              return (
                <article key={item.payment_id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="border-b border-slate-100 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${presentation.className}`}>
                          {presentation.label}
                        </span>
                        <h3 className="mt-3 truncate text-lg font-black text-slate-950">
                          {item.member_name || 'عضو غير محدد'}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{presentation.description}</p>
                      </div>
                      <div className="shrink-0 text-start sm:text-end">
                        <div className="text-xl font-black text-slate-950" dir="ltr">{formatAmount(item)}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{categoryLabel(item)}</div>
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2">
                    <div className="bg-slate-50 p-4">
                      <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><IdentificationIcon className="h-4 w-4" />مرجع الدفعة</dt>
                      <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-900" dir="ltr">{item.payment_reference || 'غير متاح'}</dd>
                    </div>
                    <div className="bg-slate-50 p-4">
                      <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CreditCardIcon className="h-4 w-4" />معرف المزود المحجوب</dt>
                      <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-900" dir="ltr">{item.gateway_payment_id_masked || 'غير متاح'}</dd>
                    </div>
                    <div className="bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">حالة الدفعة المحلية</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900">{paymentStatusLabel(item.payment_status)}</dd>
                    </div>
                    <div className="bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">نتيجة المزود الأخيرة</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900" dir="ltr">
                        {item.last_provider_status || (item.last_provider_http_status ? `HTTP ${item.last_provider_http_status}` : 'غير متاح')}
                      </dd>
                    </div>
                    <div className="bg-slate-50 p-4">
                      <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ArrowRightIcon className="h-4 w-4" />محاولات التحقق</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900" dir="ltr">{item.check_count}</dd>
                    </div>
                    <div className="bg-slate-50 p-4">
                      <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ClockIcon className="h-4 w-4" />آخر فحص</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900">{formatDate(item.last_checked_at)}</dd>
                    </div>
                  </dl>

                  <footer className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="text-xs leading-6 text-slate-500">
                      {item.member_phone_masked && <div dir="ltr">{item.member_phone_masked}</div>}
                      {item.evidence_hash_masked && <div className="font-mono" dir="ltr">دليل: {item.evidence_hash_masked}</div>}
                    </div>
                    {canAct ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => { setSelected({ item, action: 'requeue' }); setActionError(null); }}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800"
                        >
                          <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                          إعادة المحاولة الآمنة
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelected({ item, action: 'resolve' }); setActionError(null); }}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100"
                        >
                          <CheckBadgeIcon className="h-4 w-4" aria-hidden="true" />
                          إغلاق المراجعة
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 sm:self-center">
                        <EyeIcon className="h-4 w-4" aria-hidden="true" />للعرض فقط
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav aria-label="صفحات قائمة مراجعة المصالحة" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
              >
                <ChevronRightIcon className="h-4 w-4" />السابق
              </button>
              <span className="text-sm font-bold text-slate-700">صفحة {page} من {totalPages}</span>
              <button
                type="button"
                onClick={() => load(page + 1)}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
              >
                التالي<ChevronLeftIcon className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}

      {selected && (
        <ActionDialog
          selected={selected}
          submitting={submitting}
          error={actionError}
          onClose={() => { if (!submitting) { setSelected(null); setActionError(null); } }}
          onConfirm={submitAction}
        />
      )}
    </section>
  );
};

export default GatewayReconciliationReviewQueue;
