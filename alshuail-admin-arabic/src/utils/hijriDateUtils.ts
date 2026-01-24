/**
 * Comprehensive Hijri Date Utilities for Al-Shuail Admin Dashboard
 * Provides conversion and formatting functions for Hijri dates
 * Uses hijri-converter library for accurate date conversion
 */

import * as hijriConverter from 'hijri-converter';

interface HijriDate {
  year: number;
  month: number;
  monthName: string;
  day: number;
  formatted: string;
  gregorian: string;
}

// Hijri month names
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
 * Convert Gregorian date to Hijri date
 * Uses hijri-converter library for accurate conversion
 */
export function gregorianToHijri(date: Date): HijriDate {
  // Get date components
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-indexed
  const day = date.getDate();

  try {
    // Use hijri-converter for accurate conversion
    const hijri = hijriConverter.toHijri(year, month, day);

    const hijriYear = hijri.hy;
    const hijriMonth = hijri.hm;
    const hijriDay = hijri.hd;
    const hijriMonthName = HIJRI_MONTHS[hijriMonth - 1];

    return {
      year: hijriYear,
      month: hijriMonth,
      monthName: hijriMonthName,
      day: hijriDay,
      formatted: `${hijriDay} ${hijriMonthName} ${hijriYear}هـ`,
      gregorian: date.toLocaleDateString('ar-SA')
    };
  } catch (error) {
    console.error('Error converting to Hijri:', error);
    // Fallback to current date if conversion fails
    return {
      year: 1447,
      month: 1,
      monthName: HIJRI_MONTHS[0],
      day: 1,
      formatted: '1 محرم 1447هـ',
      gregorian: date.toLocaleDateString('ar-SA')
    };
  }
}

/**
 * Format a date in Hijri format
 */
export function formatHijriDate(date: Date | string | undefined): string {
  if (!date) return 'غير محدد';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'تاريخ غير صالح';

  const hijri = gregorianToHijri(dateObj);
  return hijri.formatted;
}

/**
 * Get current Hijri date
 */
export function getCurrentHijriDate(): HijriDate {
  return gregorianToHijri(new Date());
}

/**
 * Format date with both Hijri and Gregorian
 */
export function formatDualDate(date: Date | string | undefined): {
  hijri: string;
  gregorian: string;
} {
  if (!date) {
    return { hijri: 'غير محدد', gregorian: 'غير محدد' };
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return { hijri: 'تاريخ غير صالح', gregorian: 'تاريخ غير صالح' };
  }

  const hijri = gregorianToHijri(dateObj);
  return {
    hijri: hijri.formatted,
    gregorian: dateObj.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/**
 * Get Hijri month name
 */
export function getHijriMonthName(monthIndex: number): string {
  return HIJRI_MONTHS[monthIndex] || '';
}

/**
 * Get previous Hijri month name
 */
export function getPreviousHijriMonth(currentMonth: string): string {
  const index = HIJRI_MONTHS.indexOf(currentMonth);
  if (index === -1) return 'الشهر السابق';
  if (index === 0) return HIJRI_MONTHS[11]; // ذو الحجة
  return HIJRI_MONTHS[index - 1];
}

/**
 * Format time difference in Arabic
 */
export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'الآن';
  if (minutes === 1) return 'منذ دقيقة';
  if (minutes === 2) return 'منذ دقيقتين';
  if (minutes < 60) return `منذ ${minutes} دقائق`;

  if (hours === 1) return 'منذ ساعة';
  if (hours === 2) return 'منذ ساعتين';
  if (hours < 24) return `منذ ${hours} ساعات`;

  if (days === 1) return 'منذ يوم';
  if (days === 2) return 'منذ يومين';
  if (days < 30) return `منذ ${days} أيام`;

  // Return Hijri date for older dates
  return formatHijriDate(dateObj);
}

/**
 * Check if date is overdue
 */
export function isOverdue(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Get days until date
 */
export function getDaysUntil(date: Date | string): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();
  return Math.ceil(diff / 86400000);
}

/**
 * Format for date input (YYYY-MM-DD)
 */
export function formatForDateInput(date: Date | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Calculate age in Hijri years
 */
export function calculateHijriAge(birthDate: Date | string): number {
  const birthDateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();

  const birthHijri = gregorianToHijri(birthDateObj);
  const todayHijri = gregorianToHijri(today);

  let age = todayHijri.year - birthHijri.year;

  // Adjust if birthday hasn't occurred this year
  if (todayHijri.month < birthHijri.month ||
      (todayHijri.month === birthHijri.month && todayHijri.day < birthHijri.day)) {
    age--;
  }

  return age;
}

/**
 * Islamic Occasions and Events
 */
const ISLAMIC_OCCASIONS = [
  { month: 1, day: 1, nameAr: 'رأس السنة الهجرية', nameEn: 'Islamic New Year' },
  { month: 1, day: 10, nameAr: 'عاشوراء', nameEn: 'Ashura' },
  { month: 3, day: 12, nameAr: 'المولد النبوي', nameEn: 'Mawlid al-Nabi' },
  { month: 7, day: 27, nameAr: 'الإسراء والمعراج', nameEn: 'Isra and Miraj' },
  { month: 9, day: 1, nameAr: 'أول رمضان', nameEn: 'First day of Ramadan' },
  { month: 9, day: 27, nameAr: 'ليلة القدر', nameEn: 'Laylat al-Qadr' },
  { month: 10, day: 1, nameAr: 'عيد الفطر', nameEn: 'Eid al-Fitr' },
  { month: 12, day: 9, nameAr: 'يوم عرفة', nameEn: 'Day of Arafah' },
  { month: 12, day: 10, nameAr: 'عيد الأضحى', nameEn: 'Eid al-Adha' }
];

/**
 * Check if date is Islamic occasion
 */
export function getIslamicOccasion(date: Date | string): { nameAr: string; nameEn: string } | null {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const hijri = gregorianToHijri(dateObj);

  const occasion = ISLAMIC_OCCASIONS.find(
    occ => occ.month === hijri.month && occ.day === hijri.day
  );

  return occasion ? { nameAr: occasion.nameAr, nameEn: occasion.nameEn } : null;
}

/**
 * Convert Hijri date to Gregorian
 * Uses hijri-converter library for accurate conversion
 */
export function hijriToGregorian(hy: number, hm: number, hd: number): Date {
  try {
    // Use hijri-converter for accurate conversion
    const gregorian = hijriConverter.toGregorian(hy, hm, hd);
    return new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
  } catch (error) {
    console.error('Error converting to Gregorian:', error);
    return new Date();
  }
}

/**
 * Get Hijri month days
 */
export function getHijriMonthDays(year: number, month: number): number {
  // Hijri months alternate between 29 and 30 days
  // with adjustments for leap years
  const isLeapYear = ((year * 11 + 14) % 30) < 11;

  if (month === 12 && isLeapYear) {
    return 30;
  }

  return month % 2 === 1 ? 30 : 29;
}

/**
 * Validate Hijri date
 */
export function isValidHijriDate(year: number, month: number, day: number): boolean {
  if (year < 1 || year > 1500) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > getHijriMonthDays(year, month)) return false;
  return true;
}

const hijriDateUtils = {
  gregorianToHijri,
  hijriToGregorian,
  formatHijriDate,
  getCurrentHijriDate,
  formatDualDate,
  getHijriMonthName,
  getPreviousHijriMonth,
  formatTimeAgo,
  isOverdue,
  getDaysUntil,
  formatForDateInput,
  calculateHijriAge,
  getIslamicOccasion,
  getHijriMonthDays,
  isValidHijriDate
};

export default hijriDateUtils;