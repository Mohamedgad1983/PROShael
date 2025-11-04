import React, { useState, useEffect } from 'react';
import { toHijri, toGregorian } from 'hijri-converter';

const HIJRI_MONTHS = [
  { value: 1, label: 'محرم' },
  { value: 2, label: 'صفر' },
  { value: 3, label: 'ربيع الأول' },
  { value: 4, label: 'ربيع الثاني' },
  { value: 5, label: 'جمادى الأولى' },
  { value: 6, label: 'جمادى الآخرة' },
  { value: 7, label: 'رجب' },
  { value: 8, label: 'شعبان' },
  { value: 9, label: 'رمضان' },
  { value: 10, label: 'شوال' },
  { value: 11, label: 'ذو القعدة' },
  { value: 12, label: 'ذو الحجة' }
];

const HijriDateInput = ({ label, value, onChange, className = 'form-input' }) => {
  const [gregorianDate, setGregorianDate] = useState('');
  const [hijriYear, setHijriYear] = useState('');
  const [hijriMonth, setHijriMonth] = useState('');
  const [hijriDay, setHijriDay] = useState('');

  // Initialize dates from value prop
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // Set Gregorian date
        setGregorianDate(value);

        // Convert to Hijri
        const hijri = toHijri(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        );
        setHijriYear(hijri.hy.toString());
        setHijriMonth(hijri.hm.toString());
        setHijriDay(hijri.hd.toString());
      }
    } else {
      // Clear all fields if no value
      setGregorianDate('');
      setHijriYear('');
      setHijriMonth('');
      setHijriDay('');
    }
  }, [value]);

  // Handle Gregorian date change
  const handleGregorianChange = (e) => {
    const newDate = e.target.value;
    setGregorianDate(newDate);

    if (newDate) {
      const date = new Date(newDate);
      // Convert to Hijri
      const hijri = toHijri(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );
      setHijriYear(hijri.hy.toString());
      setHijriMonth(hijri.hm.toString());
      setHijriDay(hijri.hd.toString());

      // Notify parent with Gregorian date
      onChange(newDate);
    } else {
      // Clear Hijri fields
      setHijriYear('');
      setHijriMonth('');
      setHijriDay('');
      onChange('');
    }
  };

  // Handle Hijri date change
  const handleHijriChange = (field, newValue) => {
    let year = hijriYear;
    let month = hijriMonth;
    let day = hijriDay;

    if (field === 'year') year = newValue;
    if (field === 'month') month = newValue;
    if (field === 'day') day = newValue;

    // Update state
    if (field === 'year') setHijriYear(newValue);
    if (field === 'month') setHijriMonth(newValue);
    if (field === 'day') setHijriDay(newValue);

    // If all fields are filled, convert to Gregorian
    if (year && month && day) {
      try {
        const gregorian = toGregorian(
          parseInt(year),
          parseInt(month),
          parseInt(day)
        );

        // Format as YYYY-MM-DD
        const gregDate = `${gregorian.gy}-${String(gregorian.gm).padStart(2, '0')}-${String(gregorian.gd).padStart(2, '0')}`;
        setGregorianDate(gregDate);

        // Notify parent with Gregorian date
        onChange(gregDate);
      } catch (error) {
        console.error('Invalid Hijri date:', error);
      }
    }
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
        {/* Gregorian Date Input */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            التاريخ الميلادي
          </label>
          <input
            type="date"
            value={gregorianDate}
            onChange={handleGregorianChange}
            className={className}
            style={{ width: '100%' }}
          />
        </div>

        {/* Hijri Date Input */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            التاريخ الهجري
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '4px' }}>
            {/* Day */}
            <input
              type="number"
              min="1"
              max="30"
              value={hijriDay}
              onChange={(e) => handleHijriChange('day', e.target.value)}
              placeholder="يوم"
              className={className}
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '14px',
                textAlign: 'center'
              }}
            />

            {/* Month */}
            <select
              value={hijriMonth}
              onChange={(e) => handleHijriChange('month', e.target.value)}
              className={className}
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '13px'
              }}
            >
              <option value="">الشهر</option>
              {HIJRI_MONTHS.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            {/* Year */}
            <input
              type="number"
              min="1300"
              max="1500"
              value={hijriYear}
              onChange={(e) => handleHijriChange('year', e.target.value)}
              placeholder="سنة"
              className={className}
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '14px',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HijriDateInput;
