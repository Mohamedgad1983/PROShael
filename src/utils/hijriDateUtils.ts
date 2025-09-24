/**
 * Comprehensive Hijri Date Utilities for Al-Shuail Admin Dashboard
 * Provides conversion and formatting functions for Hijri dates
 */

interface HijriDate {
  year: number;
  month: number;
  monthName: string;
  day: number;
  formatted: string;
  gregorian: string;
}

// Hijri month names
const HIJRI_MONTHS = [
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
 * This is a simplified conversion - for production use a proper library like hijri-converter
 */
export function gregorianToHijri(date: Date): HijriDate {
  // Get date components
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Simplified conversion (approximate)
  // Hijri year ≈ Gregorian year - 579 + (month-1)/12
  const hijriYear = Math.floor(year - 579 + (month - 1) / 12);

  // Map Gregorian months to approximate Hijri months
  // This is simplified - actual conversion requires astronomical calculations
  const hijriMonthIndex = date.getMonth();
  const hijriMonth = hijriMonthIndex + 1;
  const hijriMonthName = HIJRI_MONTHS[hijriMonthIndex];

  // Day stays approximately the same (simplified)
  const hijriDay = day;

  return {
    year: hijriYear,
    month: hijriMonth,
    monthName: hijriMonthName,
    day: hijriDay,
    formatted: `${hijriDay} ${hijriMonthName} ${hijriYear}هـ`,
    gregorian: date.toLocaleDateString('ar-SA')
  };
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

export default {
  gregorianToHijri,
  formatHijriDate,
  getCurrentHijriDate,
  formatDualDate,
  getHijriMonthName,
  getPreviousHijriMonth,
  formatTimeAgo,
  isOverdue,
  getDaysUntil,
  formatForDateInput,
  HIJRI_MONTHS
};