/**
 * Universal Hijri Date Display Component
 * Premium Apple-inspired date display with Hijri-Gregorian dual format
 * Used across all Al-Shuail Family Management System components
 */

import React, { useState, useEffect } from 'react';
import { CalendarIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import { formatHijriDate, formatDualDate, getCurrentHijriDate, formatTimeAgo } from '../../utils/hijriDateUtils';
import '../../styles/ultra-premium-islamic-design.css';

interface HijriDateDisplayProps {
  date?: Date | string;
  format?: 'full' | 'long' | 'medium' | 'short' | 'relative';
  showIcon?: boolean;
  showBoth?: boolean;
  className?: string;
  style?: React.CSSProperties;
  highlightToday?: boolean;
  showTime?: boolean;
  locale?: 'ar' | 'en';
}

export const HijriDateDisplay: React.FC<HijriDateDisplayProps> = ({
  date = new Date(),
  format = 'long',
  showIcon = true,
  showBoth = true,
  className = '',
  style = {},
  highlightToday = false,
  showTime = false,
  locale = 'ar'
}) => {
  const [hijriDate, setHijriDate] = useState<string>('');
  const [gregorianDate, setGregorianDate] = useState<string>('');
  const [isToday, setIsToday] = useState(false);
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if it's today
    const today = new Date();
    setIsToday(
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );

    // Format based on selected format
    switch (format) {
      case 'full':
        const dualDates = formatDualDate(dateObj);
        setHijriDate(dualDates.hijri);
        setGregorianDate(dualDates.gregorian);
        break;

      case 'long':
        setHijriDate(formatHijriDate(dateObj));
        setGregorianDate(dateObj.toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
        break;

      case 'medium':
        setHijriDate(formatHijriDate(dateObj));
        setGregorianDate(dateObj.toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }));
        break;

      case 'short':
        const hijri = formatHijriDate(dateObj).split(' ');
        setHijriDate(`${hijri[0]} ${hijri[1].substring(0, 3)}`);
        setGregorianDate(dateObj.toLocaleDateString('ar-SA'));
        break;

      case 'relative':
        setHijriDate(formatTimeAgo(dateObj));
        setGregorianDate('');
        break;

      default:
        setHijriDate(formatHijriDate(dateObj));
        setGregorianDate(dateObj.toLocaleDateString('ar-SA'));
    }

    // Set time if needed
    if (showTime) {
      setTimeString(dateObj.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
  }, [date, format, showTime]);

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: isToday && highlightToday
      ? 'linear-gradient(135deg, rgba(0, 168, 107, 0.1), rgba(88, 86, 214, 0.1))'
      : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    border: isToday && highlightToday
      ? '1px solid rgba(0, 168, 107, 0.3)'
      : '1px solid rgba(229, 231, 235, 0.5)',
    transition: 'all 0.3s ease',
    ...style
  };

  return (
    <div
      className={`hijri-date-display ${className}`}
      style={containerStyle}
    >
      {showIcon && (
        <div className="icon-wrapper" style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: isToday && highlightToday
            ? 'linear-gradient(135deg, #00A86B, #06B6D4)'
            : 'linear-gradient(135deg, #007AFF, #5856D6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <CalendarIcon className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="date-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Hijri Date */}
        <div className="hijri-date" style={{
          fontSize: format === 'full' ? '16px' : '14px',
          fontWeight: isToday && highlightToday ? '600' : '500',
          color: isToday && highlightToday ? '#00A86B' : '#1e3a8a',
          fontFamily: 'Cairo, Tajawal, sans-serif'
        }}>
          {isToday && highlightToday && format !== 'relative' && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 6px',
              background: 'linear-gradient(135deg, #00A86B, #06B6D4)',
              color: 'white',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              اليوم
            </span>
          )}
          {hijriDate}
          {showTime && timeString && (
            <span style={{
              marginRight: '8px',
              opacity: 0.7,
              fontSize: '12px'
            }}>
              <ClockIcon className="inline w-3 h-3 ml-1" />
              {timeString}
            </span>
          )}
        </div>

        {/* Gregorian Date */}
        {showBoth && gregorianDate && format !== 'relative' && (
          <div className="gregorian-date" style={{
            fontSize: '12px',
            color: '#6B7280',
            fontFamily: 'Inter, SF Pro Display, sans-serif'
          }}>
            {gregorianDate}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hijri Date Range Picker Component
 */
interface HijriDateRangeProps {
  startDate?: Date | string;
  endDate?: Date | string;
  onChange?: (start: Date, end: Date) => void;
  className?: string;
}

export const HijriDateRange: React.FC<HijriDateRangeProps> = ({
  startDate = new Date(),
  endDate = new Date(),
  onChange,
  className = ''
}) => {
  return (
    <div className={`hijri-date-range ${className}`} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(40px)',
      borderRadius: '16px',
      border: '1px solid rgba(229, 231, 235, 0.5)'
    }}>
      <HijriDateDisplay
        date={startDate}
        format="medium"
        showBoth={false}
        showIcon={false}
      />
      <span style={{ color: '#9CA3AF' }}>إلى</span>
      <HijriDateDisplay
        date={endDate}
        format="medium"
        showBoth={false}
        showIcon={false}
      />
    </div>
  );
};

/**
 * Hijri Calendar Widget Component
 */
interface HijriCalendarWidgetProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  showEvents?: boolean;
  events?: Array<{ date: Date; title: string; type: string }>;
}

export const HijriCalendarWidget: React.FC<HijriCalendarWidgetProps> = ({
  selectedDate = new Date(),
  onDateSelect,
  showEvents = false,
  events = []
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  const hijriInfo = getCurrentHijriDate();

  return (
    <div className="hijri-calendar-widget glass-card-premium" style={{
      padding: '20px',
      minWidth: '300px'
    }}>
      {/* Calendar Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <button className="btn-gradient-premium" style={{
          padding: '8px 12px',
          fontSize: '14px'
        }}>
          السابق
        </button>

        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e3a8a'
        }}>
          {hijriInfo.formatted}
        </div>

        <button className="btn-gradient-premium" style={{
          padding: '8px 12px',
          fontSize: '14px'
        }}>
          التالي
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px'
      }}>
        {/* Day headers */}
        {['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((day, index) => (
          <div key={index} style={{
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: '600',
            color: '#6B7280',
            padding: '8px 0'
          }}>
            {day}
          </div>
        ))}

        {/* Calendar days - simplified for example */}
        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
          <button
            key={day}
            onClick={() => onDateSelect && onDateSelect(new Date(currentYear, currentMonth, day))}
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: day === selectedDate.getDate()
                ? 'linear-gradient(135deg, #007AFF, #5856D6)'
                : 'transparent',
              color: day === selectedDate.getDate() ? 'white' : '#1e3a8a',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Hijri Date Filter Component
 */
interface HijriDateFilterProps {
  onFilterChange?: (filter: { start: Date; end: Date; type: string }) => void;
  quickFilters?: boolean;
}

export const HijriDateFilter: React.FC<HijriDateFilterProps> = ({
  onFilterChange,
  quickFilters = true
}) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'الكل', icon: CalendarIcon },
    { id: 'today', label: 'اليوم', icon: CalendarDaysIcon },
    { id: 'week', label: 'هذا الأسبوع', icon: CalendarIcon },
    { id: 'month', label: 'هذا الشهر', icon: CalendarIcon },
    { id: 'year', label: 'هذه السنة', icon: CalendarIcon }
  ];

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);

    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (filterId) {
      case 'today':
        start = end = today;
        break;
      case 'week':
        start = new Date(today.setDate(today.getDate() - today.getDay()));
        end = new Date(today.setDate(today.getDate() + 6));
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
    }

    if (onFilterChange) {
      onFilterChange({ start, end, type: filterId });
    }
  };

  return (
    <div className="hijri-date-filter" style={{
      display: 'flex',
      gap: '8px',
      padding: '12px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(40px)',
      borderRadius: '16px',
      border: '1px solid rgba(229, 231, 235, 0.5)'
    }}>
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => handleFilterSelect(filter.id)}
          className={selectedFilter === filter.id ? 'active' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: selectedFilter === filter.id
              ? 'linear-gradient(135deg, #007AFF, #5856D6)'
              : 'transparent',
            color: selectedFilter === filter.id ? 'white' : '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontFamily: 'Cairo, sans-serif',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <filter.icon className="w-4 h-4" />
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default HijriDateDisplay;