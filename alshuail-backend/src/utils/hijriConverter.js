import moment from 'moment-hijri';
import { log } from './logger.js';

/**
 * Hijri Calendar Conversion Utility
 * Provides conversion between Gregorian and Hijri dates
 */

/**
 * Convert Gregorian date to Hijri
 * @param {Date|string} gregorianDate - Gregorian date
 * @returns {string} Hijri date in format YYYY-MM-DD
 */
export function gregorianToHijri(gregorianDate) {
  if (!gregorianDate) return null;

  try {
    const m = moment(gregorianDate);
    if (!m.isValid()) return null;

    const hijriYear = m.iYear();
    const hijriMonth = m.iMonth() + 1; // moment-hijri months are 0-indexed
    const hijriDay = m.iDate();

    return `${hijriYear}-${String(hijriMonth).padStart(2, '0')}-${String(hijriDay).padStart(2, '0')}`;
  } catch (error) {
    log.error('Error converting Gregorian to Hijri', { error: error.message });
    return null;
  }
}

/**
 * Convert Hijri date to Gregorian
 * @param {string} hijriDate - Hijri date in format YYYY-MM-DD
 * @returns {Date} Gregorian date
 */
export function hijriToGregorian(hijriDate) {
  if (!hijriDate) return null;

  try {
    const [year, month, day] = hijriDate.split('-').map(Number);
    if (!year || !month || !day) return null;

    const m = moment(`${year}/${month}/${day}`, 'iYYYY/iM/iD');
    if (!m.isValid()) return null;

    return m.toDate();
  } catch (error) {
    log.error('Error converting Hijri to Gregorian', { error: error.message });
    return null;
  }
}

/**
 * Get current date in both Gregorian and Hijri formats
 * @returns {Object} { gregorian: Date, hijri: string }
 */
export function getCurrentDates() {
  const now = new Date();
  return {
    gregorian: now,
    hijri: gregorianToHijri(now)
  };
}

/**
 * Format Hijri date for display (Arabic)
 * @param {string} hijriDate - Hijri date YYYY-MM-DD
 * @returns {string} Formatted Hijri date in Arabic
 */
export function formatHijriDateArabic(hijriDate) {
  if (!hijriDate) return '';

  try {
    const [year, month, day] = hijriDate.split('-').map(Number);

    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
      'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
      'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];

    const monthName = hijriMonths[month - 1] || month;

    return `${day} ${monthName} ${year} هـ`;
  } catch (error) {
    return hijriDate;
  }
}

/**
 * Validate Hijri date format and range
 * @param {string} hijriDate - Hijri date YYYY-MM-DD
 * @returns {boolean} true if valid
 */
export function isValidHijriDate(hijriDate) {
  if (!hijriDate || typeof hijriDate !== 'string') return false;

  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(hijriDate)) return false;

  const [year, month, day] = hijriDate.split('-').map(Number);

  if (year < 1300 || year > 1500) return false; // Reasonable range
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 30) return false; // Hijri months are 29-30 days

  return true;
}

/**
 * Get Hijri month names in Arabic
 * @returns {Array<string>} Array of Hijri month names
 */
export function getHijriMonthNames() {
  return [
    'محرم',
    'صفر',
    'ربيع الأول',
    'ربيع الثاني',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذو القعدة',
    'ذو الحجة'
  ];
}

/**
 * Convert date range from Hijri to Gregorian
 * @param {Object} range - { start_hijri, end_hijri }
 * @returns {Object} { start_gregorian, end_gregorian }
 */
export function convertDateRange(range) {
  return {
    start_gregorian: range.start_hijri ? hijriToGregorian(range.start_hijri) : null,
    end_gregorian: range.end_hijri ? hijriToGregorian(range.end_hijri) : null,
    start_hijri: range.start_hijri,
    end_hijri: range.end_hijri
  };
}
