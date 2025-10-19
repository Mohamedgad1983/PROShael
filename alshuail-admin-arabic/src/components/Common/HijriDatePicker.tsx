/**
 * Hijri Date Picker Component
 * Custom date picker that displays and accepts Hijri dates
 * Provides both manual input and calendar selection
 */

import React, { useState, useEffect, useRef } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  gregorianToHijri,
  hijriToGregorian,
  formatHijriDate,
  formatDualDate,
  getHijriMonthDays,
  isValidHijriDate,
  getCurrentHijriDate,
  HIJRI_MONTHS
} from '../../utils/hijriDateUtils';
import '../../styles/ultra-premium-islamic-design.css';

interface HijriDatePickerProps {
  value?: string; // Gregorian date in YYYY-MM-DD format
  onChange: (gregorianDate: string, hijriDate: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  showGregorian?: boolean;
  className?: string;
}

export const HijriDatePicker: React.FC<HijriDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'اختر التاريخ الهجري',
  required = false,
  minDate,
  maxDate,
  showGregorian = true,
  className = ''
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedHijriYear, setSelectedHijriYear] = useState(1446);
  const [selectedHijriMonth, setSelectedHijriMonth] = useState(1);
  const [selectedHijriDay, setSelectedHijriDay] = useState<number | null>(null);
  const [hijriInputValue, setHijriInputValue] = useState('');
  const [gregorianDisplay, setGregorianDisplay] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const calendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with current Hijri date
  useEffect(() => {
    const currentHijri = getCurrentHijriDate();
    setSelectedHijriYear(currentHijri.year);
    setSelectedHijriMonth(currentHijri.month);

    if (value) {
      const date = new Date(value);
      const hijri = gregorianToHijri(date);
      setSelectedHijriYear(hijri.year);
      setSelectedHijriMonth(hijri.month);
      setSelectedHijriDay(hijri.day);
      setHijriInputValue(`${hijri.day} ${hijri.monthName} ${hijri.year}`);
      setGregorianDisplay(date.toLocaleDateString('ar-SA'));
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle manual input
  const handleManualInput = (inputValue: string) => {
    setHijriInputValue(inputValue);
    setErrorMessage('');

    // Parse input like "15 رمضان 1446" or "15/9/1446"
    const patterns = [
      /(\d{1,2})\s+(.+?)\s+(\d{4})/,  // 15 رمضان 1446
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/  // 15/9/1446
    ];

    for (const pattern of patterns) {
      const match = inputValue.match(pattern);
      if (match) {
        let day = parseInt(match[1]);
        let month: number;
        let year = parseInt(match[3] || match[4]);

        if (patterns.indexOf(pattern) === 0) {
          // Text month format
          const monthName = match[2];
          month = HIJRI_MONTHS.indexOf(monthName) + 1;
          if (month === 0) continue; // Invalid month name
        } else {
          // Numeric format
          month = parseInt(match[2]);
        }

        if (isValidHijriDate(year, month, day)) {
          const gregorianDate = hijriToGregorian(year, month, day);
          const gregorianString = gregorianDate.toISOString().split('T')[0];

          setSelectedHijriYear(year);
          setSelectedHijriMonth(month);
          setSelectedHijriDay(day);
          setGregorianDisplay(gregorianDate.toLocaleDateString('ar-SA'));

          onChange(gregorianString, `${day} ${HIJRI_MONTHS[month - 1]} ${year}`);
          setErrorMessage('');
          return;
        } else {
          setErrorMessage('التاريخ الهجري غير صحيح');
        }
      }
    }
  };

  // Handle date selection from calendar
  const handleDateSelect = (day: number) => {
    setSelectedHijriDay(day);
    const gregorianDate = hijriToGregorian(selectedHijriYear, selectedHijriMonth, day);
    const gregorianString = gregorianDate.toISOString().split('T')[0];
    const hijriString = `${day} ${HIJRI_MONTHS[selectedHijriMonth - 1]} ${selectedHijriYear}`;

    setHijriInputValue(hijriString);
    setGregorianDisplay(gregorianDate.toLocaleDateString('ar-SA'));
    onChange(gregorianString, hijriString);
    setShowCalendar(false);
    setErrorMessage('');
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedHijriMonth === 1) {
        setSelectedHijriMonth(12);
        setSelectedHijriYear(selectedHijriYear - 1);
      } else {
        setSelectedHijriMonth(selectedHijriMonth - 1);
      }
    } else {
      if (selectedHijriMonth === 12) {
        setSelectedHijriMonth(1);
        setSelectedHijriYear(selectedHijriYear + 1);
      } else {
        setSelectedHijriMonth(selectedHijriMonth + 1);
      }
    }
  };

  // Generate calendar days
  const generateCalendarDays = (): (number | null)[] => {
    const daysInMonth = getHijriMonthDays(selectedHijriYear, selectedHijriMonth);
    const firstDayGregorian = hijriToGregorian(selectedHijriYear, selectedHijriMonth, 1);
    const firstDayOfWeek = firstDayGregorian.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  return (
    <div className={`hijri-date-picker-container ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={hijriInputValue}
            onChange={(e) => handleManualInput(e.target.value)}
            onFocus={() => setShowCalendar(true)}
            placeholder={placeholder}
            className={`input-premium w-full pr-10 ${errorMessage ? 'border-red-500' : ''}`}
            required={required}
            dir="rtl"
          />
          <CalendarIcon
            className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
            onClick={() => setShowCalendar(!showCalendar)}
          />
        </div>

        {/* Error Message */}
        {errorMessage && (
          <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
        )}

        {/* Gregorian Date Display */}
        {showGregorian && gregorianDisplay && (
          <div className="mt-2 text-sm text-gray-600">
            التاريخ الميلادي: {gregorianDisplay}
          </div>
        )}

        {/* Calendar Dropdown */}
        {showCalendar && (
          <div
            ref={calendarRef}
            className="absolute z-50 mt-2 p-4 bg-white rounded-xl shadow-2xl border border-gray-200"
            style={{
              minWidth: '320px',
              backdropFilter: 'blur(20px)',
              background: 'rgba(255, 255, 255, 0.98)'
            }}
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              <div className="text-center">
                <select
                  value={selectedHijriMonth}
                  onChange={(e) => setSelectedHijriMonth(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg ml-2 text-sm"
                >
                  {HIJRI_MONTHS.map((month: string, index: number) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>

                <input
                  type="number"
                  value={selectedHijriYear}
                  onChange={(e) => setSelectedHijriYear(parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                  min="1400"
                  max="1500"
                />
              </div>

              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((day, index) => (
                <div key={index} className="text-center text-xs font-medium text-gray-600 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, index) => (
                <div key={index}>
                  {day ? (
                    <button
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      className={`w-full py-2 px-1 text-sm rounded-lg transition-all
                        ${selectedHijriDay === day
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'hover:bg-gray-100'}`}
                    >
                      {day}
                    </button>
                  ) : (
                    <div className="w-full py-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Today Button */}
            <div className="mt-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  const today = getCurrentHijriDate();
                  setSelectedHijriYear(today.year);
                  setSelectedHijriMonth(today.month);
                  setSelectedHijriDay(today.day);
                  handleDateSelect(today.day);
                }}
                className="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                اليوم
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hijri Date Range Picker Component
 */
interface HijriDateRangePickerProps {
  startValue?: string;
  endValue?: string;
  onStartChange: (gregorianDate: string, hijriDate: string) => void;
  onEndChange: (gregorianDate: string, hijriDate: string) => void;
  startLabel?: string;
  endLabel?: string;
  required?: boolean;
}

export const HijriDateRangePicker: React.FC<HijriDateRangePickerProps> = ({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = 'تاريخ البداية',
  endLabel = 'تاريخ النهاية',
  required = false
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <HijriDatePicker
        value={startValue}
        onChange={onStartChange}
        label={startLabel}
        required={required}
      />
      <HijriDatePicker
        value={endValue}
        onChange={onEndChange}
        label={endLabel}
        required={required}
        minDate={startValue}
      />
    </div>
  );
};

export default HijriDatePicker;