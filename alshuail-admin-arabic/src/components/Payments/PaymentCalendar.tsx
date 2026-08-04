import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import React,{ memo,useMemo,useState } from 'react';
import { getPaymentDatePreset } from '../../utils/paymentDateRange';
import type { PaymentDateRange } from './PaymentDateFilter';

type ActiveField = 'start' | 'end';

interface PaymentCalendarProps {
  value: PaymentDateRange;
  onChange: (range: PaymentDateRange) => void;
}

const WEEKDAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

const monthFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

const fieldDateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

const accessibleDateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const toDateOnly = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateOnly = (value: string) => fieldDateFormatter.format(parseDateOnly(value));

const getInitialViewMonth = (range: PaymentDateRange) => {
  const anchor = range.start || range.end || getPaymentDatePreset('today').start;
  const date = parseDateOnly(anchor);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

const PaymentCalendar: React.FC<PaymentCalendarProps> = ({ value, onChange }) => {
  const [activeField, setActiveField] = useState<ActiveField>(value.start ? 'end' : 'start');
  const [viewMonth, setViewMonth] = useState(() => getInitialViewMonth(value));
  const today = getPaymentDatePreset('today').start;

  const calendarDays = useMemo(() => {
    const year = viewMonth.getUTCFullYear();
    const month = viewMonth.getUTCMonth();
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();

    return Array.from({ length: 42 }, (_, index) => (
      new Date(Date.UTC(year, month, index - firstWeekday + 1))
    ));
  }, [viewMonth]);

  const changeMonth = (offset: number) => {
    setViewMonth((current) => new Date(Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth() + offset,
      1
    )));
  };

  const selectDate = (date: Date) => {
    const selected = toDateOnly(date);

    if (activeField === 'start') {
      onChange({
        start: selected,
        end: value.end && value.end >= selected ? value.end : ''
      });
      setActiveField('end');
    } else if (value.start && selected < value.start) {
      onChange({ start: selected, end: value.start });
    } else {
      onChange({ start: value.start, end: selected });
    }

    if (date.getUTCMonth() !== viewMonth.getUTCMonth()) {
      setViewMonth(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
    }
  };

  const clearRange = () => {
    onChange({ start: '', end: '' });
    setActiveField('start');
    setViewMonth(getInitialViewMonth({ start: '', end: '' }));
  };

  return (
    <div className="payment-calendar" aria-label="تقويم اختيار فترة وصول الدفعات">
      <div className="payment-calendar__fields">
        <button
          type="button"
          onClick={() => setActiveField('start')}
          aria-pressed={activeField === 'start'}
          className={`payment-calendar__field ${activeField === 'start' ? 'payment-calendar__field--active' : ''}`}
        >
          <span>من تاريخ</span>
          <strong>{value.start ? formatDateOnly(value.start) : 'اختر من التقويم'}</strong>
        </button>
        <span className="payment-calendar__connector" aria-hidden="true">←</span>
        <button
          type="button"
          onClick={() => setActiveField('end')}
          aria-pressed={activeField === 'end'}
          className={`payment-calendar__field ${activeField === 'end' ? 'payment-calendar__field--active' : ''}`}
        >
          <span>إلى تاريخ</span>
          <strong>{value.end ? formatDateOnly(value.end) : 'اختر من التقويم'}</strong>
        </button>
      </div>

      <div className="payment-calendar__panel">
        <div className="payment-calendar__header">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="الشهر السابق"
            className="payment-calendar__nav"
          >
            <ChevronRightIcon />
          </button>
          <div className="payment-calendar__month">
            <CalendarDaysIcon />
            <span>{monthFormatter.format(viewMonth)}</span>
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="الشهر التالي"
            className="payment-calendar__nav"
          >
            <ChevronLeftIcon />
          </button>
        </div>

        <div className="payment-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>

        <div className="payment-calendar__grid" role="grid" aria-label={monthFormatter.format(viewMonth)}>
          {calendarDays.map((date) => {
            const dateOnly = toDateOnly(date);
            const outsideMonth = date.getUTCMonth() !== viewMonth.getUTCMonth();
            const isStart = dateOnly === value.start;
            const isEnd = dateOnly === value.end;
            const inRange = Boolean(value.start && value.end && dateOnly > value.start && dateOnly < value.end);
            const isToday = dateOnly === today;
            const fieldName = activeField === 'start' ? 'البداية' : 'النهاية';

            return (
              <button
                key={dateOnly}
                type="button"
                role="gridcell"
                onClick={() => selectDate(date)}
                data-payment-date={dateOnly}
                aria-label={`اختيار ${accessibleDateFormatter.format(date)} كتاريخ ${fieldName}`}
                aria-selected={isStart || isEnd}
                className={`payment-calendar__day ${outsideMonth ? 'payment-calendar__day--outside' : ''} ${
                  inRange ? 'payment-calendar__day--in-range' : ''
                } ${isStart || isEnd ? 'payment-calendar__day--selected' : ''} ${
                  isToday ? 'payment-calendar__day--today' : ''
                }`}
              >
                {date.getUTCDate().toLocaleString('ar-SA')}
              </button>
            );
          })}
        </div>

        <div className="payment-calendar__footer">
          <span>
            {activeField === 'start' ? 'اختر تاريخ البداية' : 'الآن اختر تاريخ النهاية'}
          </span>
          {(value.start || value.end) && (
            <button type="button" onClick={clearRange} className="payment-calendar__clear">
              <TrashIcon />
              مسح الاختيار
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(PaymentCalendar);
