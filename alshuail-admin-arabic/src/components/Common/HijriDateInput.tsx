/**
 * Hijri Date Input Component
 * Apple-inspired Hijri date picker with day/month/year dropdowns
 */

import React, { memo,  useState, useEffect } from 'react';
import { toGregorian, toHijri } from 'hijri-converter';

import { logger } from '../../utils/logger';

interface HijriDateInputProps {
  value?: string; // Hijri date in format: YYYY-MM-DD
  onChange?: (hijriDate: string, gregorianDate: string) => void;
  label?: string;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export const HijriDateInput: React.FC<HijriDateInputProps> = ({
  value = '',
  onChange,
  label = 'التاريخ الهجري',
  placeholder = 'اختر التاريخ',
  minYear = 1440,
  maxYear = 1450,
  className = ''
}) => {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Hijri months in Arabic
  const hijriMonths = [
    { value: '01', label: 'محرم' },
    { value: '02', label: 'صفر' },
    { value: '03', label: 'ربيع الأول' },
    { value: '04', label: 'ربيع الآخر' },
    { value: '05', label: 'جمادى الأولى' },
    { value: '06', label: 'جمادى الآخرة' },
    { value: '07', label: 'رجب' },
    { value: '08', label: 'شعبان' },
    { value: '09', label: 'رمضان' },
    { value: '10', label: 'شوال' },
    { value: '11', label: 'ذو القعدة' },
    { value: '12', label: 'ذو الحجة' }
  ];

  // Generate days (1-30 for Hijri calendar)
  const days = Array.from({ length: 30 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: String(i + 1)
  }));

  // Generate years
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    value: String(minYear + i),
    label: String(minYear + i)
  }));

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    }
  }, [value]);

  // Handle date change
  useEffect(() => {
    if (day && month && year && onChange) {
      const hijriDate = `${year}-${month}-${day}`;

      // Convert to Gregorian
      try {
        const gregorian = toGregorian(parseInt(year), parseInt(month), parseInt(day));
        const gregorianDate = `${gregorian.gy}-${String(gregorian.gm).padStart(2, '0')}-${String(gregorian.gd).padStart(2, '0')}`;
        onChange(hijriDate, gregorianDate);
      } catch (error) {
        logger.error('Error converting Hijri to Gregorian:', { error });
      }
    }
  }, [day, month, year, onChange]);

  return (
    <div className={`hijri-date-input ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {label}
        </label>
      )}

      <div className="grid grid-cols-3 gap-2">
        {/* Day Dropdown */}
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center"
        >
          <option value="">اليوم</option>
          {days.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        {/* Month Dropdown */}
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center"
        >
          <option value="">الشهر</option>
          {hijriMonths.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Year Dropdown */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center"
        >
          <option value="">السنة</option>
          {years.map(y => (
            <option key={y.value} value={y.value}>{y.label} هـ</option>
          ))}
        </select>
      </div>

      {/* Display selected date in both calendars */}
      {day && month && year && (
        <div className="mt-2 text-xs text-gray-600 text-center">
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
            {day} {hijriMonths.find(m => m.value === month)?.label} {year} هـ
          </span>
          <span className="mx-2">•</span>
          <span className="text-gray-500">
            {(() => {
              try {
                const greg = toGregorian(parseInt(year), parseInt(month), parseInt(day));
                return `${greg.gd}/${greg.gm}/${greg.gy}م`;
              } catch {
                return '';
              }
            })()}
          </span>
        </div>
      )}
    </div>
  );
};

export default memo(HijriDateInput);
