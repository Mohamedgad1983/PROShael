/**
 * ============================================
 * AL-SHUAIL MOBILE PWA
 * Hijri Calendar Utility Functions
 * ============================================
 * Purpose: Convert and format dates in both Hijri and Gregorian calendars
 * Library: hijri-converter (already installed in package.json)
 * ============================================
 */

import * as hijriConverter from 'hijri-converter';

/**
 * Arabic month names (Hijri calendar)
 */
export const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة'
];

/**
 * Arabic day names
 */
export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

/**
 * Arabic month names (Gregorian calendar)
 */
export const GREGORIAN_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

/**
 * Convert Gregorian date to Hijri
 * @param {Date|string|number} date - Gregorian date
 * @returns {object} Hijri date object
 */
export const toHijri = (date = new Date()) => {
  const gregorianDate = date instanceof Date ? date : new Date(date);

  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1; // JS months are 0-indexed
  const day = gregorianDate.getDate();

  try {
    const hijriDate = hijriConverter.toHijri(year, month, day);

    return {
      day: hijriDate.hd,
      month: hijriDate.hm,
      year: hijriDate.hy,
      monthName: HIJRI_MONTHS[hijriDate.hm - 1],
      formatted: `${hijriDate.hd} ${HIJRI_MONTHS[hijriDate.hm - 1]} ${hijriDate.hy}هـ`
    };
  } catch (error) {
    console.error('Error converting to Hijri:', error);
    return null;
  }
};

/**
 * Get current Hijri date
 * @returns {object} Current Hijri date
 */
export const getCurrentHijri = () => {
  return toHijri(new Date());
};

/**
 * Format date in both calendars
 * @param {Date|string|number} date - Date to format
 * @returns {object} Formatted dates in both calendars
 */
export const formatBothCalendars = (date = new Date()) => {
  const gregorianDate = date instanceof Date ? date : new Date(date);
  const hijriDate = toHijri(gregorianDate);

  const dayName = ARABIC_DAYS[gregorianDate.getDay()];
  const gregorianDay = gregorianDate.getDate();
  const gregorianMonth = GREGORIAN_MONTHS[gregorianDate.getMonth()];
  const gregorianYear = gregorianDate.getFullYear();

  return {
    hijri: hijriDate,
    gregorian: {
      day: gregorianDay,
      month: gregorianDate.getMonth() + 1,
      year: gregorianYear,
      monthName: gregorianMonth,
      dayName: dayName,
      formatted: `${dayName}، ${gregorianDay} ${gregorianMonth} ${gregorianYear}م`
    },
    combined: `${dayName}، ${hijriDate?.day} ${hijriDate?.monthName} ${hijriDate?.year}هـ (${gregorianDay} ${gregorianMonth} ${gregorianYear}م)`
  };
};

/**
 * Format Hijri date for display
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted Hijri date
 */
export const formatHijri = (date = new Date()) => {
  const hijri = toHijri(date);
  if (!hijri) return '';
  return hijri.formatted;
};

/**
 * Format Gregorian date in Arabic
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted Gregorian date
 */
export const formatGregorian = (date = new Date()) => {
  const gregorianDate = date instanceof Date ? date : new Date(date);
  const dayName = ARABIC_DAYS[gregorianDate.getDay()];
  const day = gregorianDate.getDate();
  const month = GREGORIAN_MONTHS[gregorianDate.getMonth()];
  const year = gregorianDate.getFullYear();

  return `${dayName}، ${day} ${month} ${year}م`;
};

/**
 * Get time until next prayer (placeholder - can enhance later)
 * @returns {string} Time until next prayer
 */
export const getTimeUntilNextPrayer = () => {
  const now = new Date();
  const hour = now.getHours();

  // Simple prayer time estimation (should use proper prayer time API in production)
  const prayerTimes = [
    { name: 'الفجر', hour: 5 },
    { name: 'الظهر', hour: 12 },
    { name: 'العصر', hour: 15 },
    { name: 'المغرب', hour: 18 },
    { name: 'العشاء', hour: 20 }
  ];

  for (const prayer of prayerTimes) {
    if (hour < prayer.hour) {
      const hoursUntil = prayer.hour - hour;
      return `${hoursUntil} ساعة حتى ${prayer.name}`;
    }
  }

  return 'الفجر غداً';
};

/**
 * Check if date is in Ramadan
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if in Ramadan
 */
export const isRamadan = (date = new Date()) => {
  const hijri = toHijri(date);
  return hijri ? hijri.month === 9 : false;
};

/**
 * Get Islamic occasion for current date (if any)
 * @param {Date|string|number} date - Date to check
 * @returns {string|null} Occasion name or null
 */
export const getIslamicOccasion = (date = new Date()) => {
  const hijri = toHijri(date);
  if (!hijri) return null;

  const occasions = {
    '1-1': 'رأس السنة الهجرية',
    '1-10': 'عاشوراء',
    '3-12': 'المولد النبوي الشريف',
    '9-1': 'أول رمضان',
    '9-27': 'ليلة القدر',
    '10-1': 'عيد الفطر المبارك',
    '10-2': 'عيد الفطر المبارك',
    '10-3': 'عيد الفطر المبارك',
    '12-9': 'يوم عرفة',
    '12-10': 'عيد الأضحى المبارك',
    '12-11': 'عيد الأضحى المبارك',
    '12-12': 'عيد الأضحى المبارك'
  };

  const key = `${hijri.month}-${hijri.day}`;
  return occasions[key] || null;
};

/**
 * Format date for API (ISO format)
 * @param {Date|string|number} date - Date to format
 * @returns {string} ISO formatted date
 */
export const toISODate = (date = new Date()) => {
  const gregorianDate = date instanceof Date ? date : new Date(date);
  return gregorianDate.toISOString().split('T')[0];
};

/**
 * Get current time in Arabic format
 * @returns {string} Current time (e.g., "٣:٤٥ م")
 */
export const getCurrentTimeArabic = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const period = hours >= 12 ? 'م' : 'ص';

  // Convert to 12-hour format
  hours = hours % 12 || 12;

  // Convert to Arabic numerals
  const arabicHours = hours.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const arabicMinutes = minutes.toString().padStart(2, '0').replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  return `${arabicHours}:${arabicMinutes} ${period}`;
};

/**
 * Convert English numbers to Arabic numerals
 * @param {string|number} number - Number to convert
 * @returns {string} Arabic numerals
 */
export const toArabicNumerals = (number) => {
  return number.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
};

/**
 * Get greeting based on time of day
 * @returns {string} Arabic greeting
 */
export const getTimeGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  if (hour < 21) return 'مساء الخير';
  return 'تصبح على خير';
};

export default {
  toHijri,
  getCurrentHijri,
  formatBothCalendars,
  formatHijri,
  formatGregorian,
  getTimeUntilNextPrayer,
  isRamadan,
  getIslamicOccasion,
  toISODate,
  getCurrentTimeArabic,
  toArabicNumerals,
  getTimeGreeting,
  HIJRI_MONTHS,
  ARABIC_DAYS,
  GREGORIAN_MONTHS
};
