import React, { memo,  useState, useEffect } from 'react';
import { toHijri, toGregorian } from 'hijri-converter';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import CustomDropdown from './CustomDropdown';

const HijriDatePicker = ({ value, onChange, required = false, label = "التاريخ" }) => {
  const [hijriDay, setHijriDay] = useState('');
  const [hijriMonth, setHijriMonth] = useState('');
  const [hijriYear, setHijriYear] = useState('');
  const [gregorianDate, setGregorianDate] = useState('');
  const [isValid, setIsValid] = useState(true);

  // Hijri months
  const hijriMonths = [
    { value: 1, label: 'محرم' },
    { value: 2, label: 'صفر' },
    { value: 3, label: 'ربيع الأول' },
    { value: 4, label: 'ربيع الآخر' },
    { value: 5, label: 'جمادى الأولى' },
    { value: 6, label: 'جمادى الآخرة' },
    { value: 7, label: 'رجب' },
    { value: 8, label: 'شعبان' },
    { value: 9, label: 'رمضان' },
    { value: 10, label: 'شوال' },
    { value: 11, label: 'ذو القعدة' },
    { value: 12, label: 'ذو الحجة' }
  ];

  // Initialize with current Hijri date
  useEffect(() => {
    if (!value) {
      const today = new Date();
      const hijri = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
      setHijriDay(hijri.hd.toString());
      setHijriMonth(hijri.hm.toString());
      setHijriYear(hijri.hy.toString());
    } else {
      // If value exists (Gregorian date), convert to Hijri
      const date = new Date(value);
      const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      setHijriDay(hijri.hd.toString());
      setHijriMonth(hijri.hm.toString());
      setHijriYear(hijri.hy.toString());
      setGregorianDate(value);
    }
  }, [value]);

  // Convert Hijri to Gregorian when Hijri date changes
  const handleHijriChange = (day, month, year) => {
    const d = parseInt(day) || 1;
    const m = parseInt(month) || 1;
    const y = parseInt(year) || 1446;

    // Update state
    setHijriDay(day);
    setHijriMonth(month);
    setHijriYear(year);

    // Validate Hijri date
    if (d < 1 || d > 30 || m < 1 || m > 12 || y < 1300 || y > 1500) {
      setIsValid(false);
      setGregorianDate('');
      onChange('');
      return;
    }

    try {
      // Convert to Gregorian
      const greg = toGregorian(y, m, d);
      const gregorianDateString = `${greg.gy}-${String(greg.gm).padStart(2, '0')}-${String(greg.gd).padStart(2, '0')}`;
      setGregorianDate(gregorianDateString);
      setIsValid(true);

      // Call onChange with Gregorian date
      onChange(gregorianDateString);
    } catch (error) {
      setIsValid(false);
      setGregorianDate('');
      onChange('');
    }
  };

  // Generate year options (current year ± 10)
  const currentHijriYear = new Date().getFullYear() - 579; // Approximate current Hijri year
  const yearOptions = [];
  for (let i = currentHijriYear - 10; i <= currentHijriYear + 10; i++) {
    yearOptions.push({ value: i, label: `${i} هـ` });
  }

  // Generate day options
  const dayOptions = [];
  for (let i = 1; i <= 30; i++) {
    dayOptions.push({ value: i, label: i.toString() });
  }

  return (
    <div>
      <label style={{
        display: 'block',
        marginBottom: '12px',
        fontSize: '18px',
        color: '#000080',
        fontWeight: '900'
      }}>
        {label} (التقويم الهجري) {required && <span style={{ color: '#FF0000' }}>*</span>}
      </label>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '90px 150px 110px',
        gap: '10px',
        marginBottom: '10px',
        padding: '15px',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        borderRadius: '12px',
        border: '2px solid #60A5FA',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Day */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '16px',
            color: '#000080',
            fontWeight: '800',
            textAlign: 'center'
          }}>
            اليوم
          </label>
          <CustomDropdown
            value={hijriDay ? parseInt(hijriDay) : ''}
            onChange={(val) => handleHijriChange(val.toString(), hijriMonth, hijriYear)}
            options={dayOptions}
            placeholder="--"
            required={required}
          />
        </div>

        {/* Month */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '16px',
            color: '#000080',
            fontWeight: '800',
            textAlign: 'center'
          }}>
            الشهر
          </label>
          <CustomDropdown
            value={hijriMonth ? parseInt(hijriMonth) : ''}
            onChange={(val) => handleHijriChange(hijriDay, val.toString(), hijriYear)}
            options={hijriMonths}
            placeholder="اختر الشهر"
            required={required}
          />
        </div>

        {/* Year */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '16px',
            color: '#000080',
            fontWeight: '800',
            textAlign: 'center'
          }}>
            السنة
          </label>
          <CustomDropdown
            value={hijriYear ? parseInt(hijriYear) : ''}
            onChange={(val) => handleHijriChange(hijriDay, hijriMonth, val.toString())}
            options={yearOptions}
            placeholder="----"
            required={required}
          />
        </div>
      </div>

      {/* Show Gregorian date below */}
      {gregorianDate && isValid && (
        <div style={{
          marginTop: '8px',
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)',
          borderRadius: '10px',
          fontSize: '15px',
          color: '#0C4A6E',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #7DD3FC',
          fontWeight: '600'
        }}>
          <CalendarDaysIcon style={{ width: '18px', height: '18px', color: '#0284C7' }} />
          <span>التاريخ الميلادي: {new Date(gregorianDate).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
        </div>
      )}

      {/* Error message */}
      {!isValid && hijriDay && hijriMonth && hijriYear && (
        <div style={{
          marginTop: '8px',
          padding: '10px 14px',
          background: '#FEF2F2',
          borderRadius: '10px',
          fontSize: '14px',
          color: '#991B1B',
          fontWeight: '600',
          border: '1px solid #FCA5A5'
        }}>
          ⚠️ التاريخ الهجري غير صحيح
        </div>
      )}
    </div>
  );
};

export default memo(HijriDatePicker);