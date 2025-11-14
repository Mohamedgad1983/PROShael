import React, { memo,  useState, useEffect } from 'react';
import { toHijri, toGregorian } from 'hijri-converter';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const SimpleHijriDatePicker = ({ value, onChange, required = false, label = "التاريخ" }) => {
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
    yearOptions.push(i);
  }

  // Select style with MAXIMUM visibility
  const selectStyle = {
    width: '100%',
    padding: '8px',
    border: '2px solid #000080',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#000080',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'Arial, sans-serif'
  };

  return (
    <div>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontSize: '15px',
        color: '#000080',
        fontWeight: '700'
      }}>
        {label} (التقويم الهجري) {required && <span style={{ color: '#FF0000' }}>*</span>}
      </label>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 140px 100px',
        gap: '8px',
        marginBottom: '8px',
        padding: '12px',
        background: '#F0F8FF',
        borderRadius: '8px',
        border: '2px solid #000080',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Day */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px',
            color: '#000080',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            اليوم
          </label>
          <select
            value={hijriDay}
            onChange={(e) => handleHijriChange(e.target.value, hijriMonth, hijriYear)}
            required={required}
            style={selectStyle}
          >
            <option value="" style={{ color: '#000080', fontWeight: '700' }}>--</option>
            {[...Array(30)].map((_, i) => (
              <option key={i + 1} value={i + 1} style={{ color: '#000080', fontWeight: '700', fontSize: '16px' }}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px',
            color: '#000080',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            الشهر
          </label>
          <select
            value={hijriMonth}
            onChange={(e) => handleHijriChange(hijriDay, e.target.value, hijriYear)}
            required={required}
            style={selectStyle}
          >
            <option value="" style={{ color: '#000080', fontWeight: '700' }}>اختر</option>
            {hijriMonths.map(month => (
              <option key={month.value} value={month.value} style={{ color: '#000080', fontWeight: '700', fontSize: '16px' }}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px',
            color: '#000080',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            السنة
          </label>
          <select
            value={hijriYear}
            onChange={(e) => handleHijriChange(hijriDay, hijriMonth, e.target.value)}
            required={required}
            style={selectStyle}
          >
            <option value="" style={{ color: '#000080', fontWeight: '700' }}>----</option>
            {yearOptions.map(year => (
              <option key={year} value={year} style={{ color: '#000080', fontWeight: '700', fontSize: '16px' }}>
                {year} هـ
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Show Gregorian date below */}
      {gregorianDate && isValid && (
        <div style={{
          marginTop: '8px',
          padding: '10px 14px',
          background: '#E6F2FF',
          borderRadius: '10px',
          fontSize: '15px',
          color: '#000080',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '2px solid #000080',
          fontWeight: '700'
        }}>
          <CalendarDaysIcon style={{ width: '18px', height: '18px', color: '#000080' }} />
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
          background: '#FFE4E4',
          borderRadius: '10px',
          fontSize: '14px',
          color: '#CC0000',
          fontWeight: '700',
          border: '2px solid #CC0000'
        }}>
          ⚠️ التاريخ الهجري غير صحيح
        </div>
      )}
    </div>
  );
};

export default memo(SimpleHijriDatePicker);