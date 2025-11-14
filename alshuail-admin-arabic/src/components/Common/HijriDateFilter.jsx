import React, { memo,  useState, useEffect } from 'react';
import { logger } from '../../utils/logger';

import './HijriDateFilter.css';

const HijriDateFilter = ({ onFilterChange, selectedMonth, selectedYear }) => {
  const [hijriMonths, setHijriMonths] = useState([]);
  const [currentHijri, setCurrentHijri] = useState({});
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHijriCalendarData();
  }, []);

  const fetchHijriCalendarData = async () => {
    try {
      const response = await fetch('/api/payments/hijri-calendar', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setHijriMonths(data.data.months);
        setCurrentHijri(data.data.current_date);
        setYears(data.data.years);
      }
    } catch (error) {
      logger.error('Error fetching Hijri calendar:', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleMonthClick = (month) => {
    onFilterChange({
      hijri_month: month.number,
      hijri_month_name: month.name_ar
    });
  };

  const handleYearChange = (e) => {
    onFilterChange({ hijri_year: parseInt(e.target.value) });
  };

  if (loading) {
    return (
      <div className="hijri-calendar-container" dir="rtl">
        <div className="loading-spinner">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="hijri-calendar-container" dir="rtl">
      {/* Current Hijri Date Display */}
      <div className="current-hijri-date">
        <h3 className="hijri-title">التقويم الهجري</h3>
        <div className="current-date-display">
          <div className="hijri-date-primary">
            {currentHijri.hijri_date_string}
          </div>
          <div className="gregorian-date-secondary">
            ({new Date().toLocaleDateString('ar-SA')})
          </div>
        </div>
      </div>

      {/* Hijri Year Selector */}
      <div className="hijri-year-selector">
        <label htmlFor="hijri-year">السنة الهجرية:</label>
        <select
          id="hijri-year"
          value={selectedYear || currentHijri.hijri_year}
          onChange={handleYearChange}
          className="year-select"
        >
          {years.map(year => (
            <option key={year.value} value={year.value}>
              {year.label}
              {year.is_current && ' (الحالية)'}
            </option>
          ))}
        </select>
      </div>

      {/* Hijri Months Grid */}
      <div className="hijri-months-grid">
        {hijriMonths.map(month => {
          const isSelected = selectedMonth === month.number;
          const isCurrent = month.number === currentHijri.hijri_month &&
                           (!selectedYear || selectedYear === currentHijri.hijri_year);
          const isSpecial = month.is_special;
          const isSacred = month.is_sacred;

          return (
            <button
              key={month.number}
              onClick={() => handleMonthClick(month)}
              className={`
                hijri-month-button
                ${isSelected ? 'selected' : ''}
                ${isCurrent ? 'current' : ''}
                ${isSpecial ? 'special' : ''}
                ${isSacred ? 'sacred' : ''}
                ${month.number === 9 ? 'ramadan' : ''}
                ${month.number === 12 ? 'dhul-hijjah' : ''}
              `}
            >
              <div className="month-name-ar">{month.name_ar}</div>
              <div className="month-name-en">{month.name_en}</div>
              {isCurrent && (
                <div className="current-month-indicator">الشهر الحالي</div>
              )}
              {isSpecial && !isCurrent && (
                <div className="special-month-indicator">✨</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Filter Buttons */}
      <div className="quick-filters">
        <button
          className="quick-filter-btn"
          onClick={() => onFilterChange({
            hijri_month: currentHijri.hijri_month,
            hijri_year: currentHijri.hijri_year
          })}
        >
          الشهر الحالي
        </button>
        <button
          className="quick-filter-btn"
          onClick={() => onFilterChange({
            hijri_month: null,
            hijri_year: currentHijri.hijri_year
          })}
        >
          كل أشهر السنة
        </button>
        <button
          className="quick-filter-btn reset"
          onClick={() => onFilterChange({
            hijri_month: null,
            hijri_year: null
          })}
        >
          إلغاء التصفية
        </button>
      </div>
    </div>
  );
};

export default memo(HijriDateFilter);