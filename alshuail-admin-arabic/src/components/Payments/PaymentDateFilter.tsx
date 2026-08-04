import {
  CalendarDaysIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import React,{ memo,useEffect,useMemo,useState } from 'react';
import { getPaymentDatePreset } from '../../utils/paymentDateRange';
import './PaymentDateFilter.css';

export interface PaymentDateRange {
  start: string;
  end: string;
}

interface PaymentDateFilterProps {
  value: PaymentDateRange;
  onApply: (range: PaymentDateRange) => void;
  resultCount?: number;
  loading?: boolean;
}

type PresetKey = 'all' | 'today' | 'last7' | 'month' | 'custom';

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'today', label: 'اليوم' },
  { key: 'last7', label: '7 أيام' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'custom', label: 'مخصص' }
];

const compactDateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

const formatDateOnly = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return compactDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
};

const formatRangeSummary = ({ start, end }: PaymentDateRange) => {
  if (!start && !end) return 'كل الفترات';
  if (start && end && start === end) return formatDateOnly(start);
  if (start && end) return `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
  if (start) return `من ${formatDateOnly(start)}`;
  return `حتى ${formatDateOnly(end)}`;
};

const getActivePreset = (range: PaymentDateRange): PresetKey => {
  if (!range.start && !range.end) return 'all';

  for (const key of ['today', 'last7', 'month'] as const) {
    const preset = getPaymentDatePreset(key);
    if (preset.start === range.start && preset.end === range.end) return key;
  }

  return 'custom';
};

const PaymentDateFilter: React.FC<PaymentDateFilterProps> = ({
  value,
  onApply,
  resultCount,
  loading = false
}) => {
  const [showCustom, setShowCustom] = useState(getActivePreset(value) === 'custom');
  const [draft, setDraft] = useState<PaymentDateRange>(value);
  const activePreset = useMemo(() => getActivePreset(value), [value]);
  const selectedPreset = showCustom ? 'custom' : activePreset;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const selectPreset = (key: PresetKey) => {
    if (key === 'custom') {
      setDraft(value);
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    onApply(key === 'all' ? { start: '', end: '' } : getPaymentDatePreset(key));
  };

  const updateStart = (start: string) => {
    setDraft((current) => ({
      start,
      end: current.end && start && current.end < start ? start : current.end
    }));
  };

  const updateEnd = (end: string) => {
    setDraft((current) => ({
      start: current.start && end && current.start > end ? end : current.start,
      end
    }));
  };

  const applyCustomRange = () => {
    onApply(draft);
    setShowCustom(false);
  };

  return (
    <div className="payment-date-filter rounded-xl border border-slate-200 bg-slate-50/80 p-2.5" aria-label="فلتر تاريخ وصول الدفعات">
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-2.5 xl:min-w-56">
          <span className="payment-date-filter__icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <CalendarDaysIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="payment-date-filter__eyebrow text-[11px] font-semibold text-slate-500">تاريخ وصول الدفعة</p>
            <p className="payment-date-filter__summary truncate text-sm font-bold text-slate-900">{formatRangeSummary(value)}</p>
          </div>
        </div>

        <div
          className="flex flex-1 flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
          role="group"
          aria-label="الفترات السريعة"
        >
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => selectPreset(preset.key)}
                aria-pressed={isSelected}
                className={`payment-date-filter__preset min-h-8 rounded-md px-3 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${
                  isSelected
                    ? 'payment-date-filter__preset--active bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {typeof resultCount === 'number' && (
          <span className="payment-date-filter__count inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
            {loading ? 'يتم التحديث…' : `${resultCount.toLocaleString('en-US')} نتيجة`}
          </span>
        )}
      </div>

      {showCustom && (
        <div className="mt-2.5 flex flex-col gap-2.5 border-t border-slate-200 pt-2.5 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="payment-date-filter__field-label mb-1 block text-[11px] font-bold text-slate-500">من تاريخ</span>
            <input
              type="date"
              dir="ltr"
              aria-label="من تاريخ الوصول"
              value={draft.start}
              max={draft.end || undefined}
              onChange={(event) => updateStart(event.target.value)}
              className="payment-date-filter__date h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex-1">
            <span className="payment-date-filter__field-label mb-1 block text-[11px] font-bold text-slate-500">إلى تاريخ</span>
            <input
              type="date"
              dir="ltr"
              aria-label="إلى تاريخ الوصول"
              value={draft.end}
              min={draft.start || undefined}
              onChange={(event) => updateEnd(event.target.value)}
              className="payment-date-filter__date h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyCustomRange}
              disabled={!draft.start && !draft.end}
              className="payment-date-filter__apply inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              <CheckIcon className="h-4 w-4" />
              تطبيق الفترة
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(value);
                setShowCustom(false);
              }}
              aria-label="إغلاق التاريخ المخصص"
              className="payment-date-filter__close inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <span className="sr-only">الفلترة بتوقيت الكويت واليوم الأخير مشمول بالكامل</span>
    </div>
  );
};

export default memo(PaymentDateFilter);
