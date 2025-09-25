<<<<<<< HEAD
/**
 * Comprehensive Hijri Date Utilities for Al-Shuail Admin Dashboard
 * Provides conversion and formatting functions for Hijri dates
 */
=======
// Hijri Date Utilities for Al-Shuail Admin Dashboard

// Basic Hijri date conversion utilities
// Note: For production, consider using a more comprehensive library like moment-hijri or hijri-converter
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409

interface HijriDate {
  year: number;
  month: number;
<<<<<<< HEAD
  monthName: string;
  day: number;
  formatted: string;
  gregorian: string;
}

// Hijri month names
export const HIJRI_MONTHS = [
  'محرم',
  'صفر',
=======
  day: number;
  monthName: string;
  formatted: string;
}

interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

// Hijri month names in Arabic
const HIJRI_MONTHS = [
  'محرم',
  'صفر', 
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
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

<<<<<<< HEAD
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
=======
// Simplified Hijri conversion (approximation)
// For precise conversion, use a dedicated library
const HIJRI_EPOCH = 1948439.5; // Julian day of Hijri epoch (16 July 622 CE)
const GREGORIAN_EPOCH = 1721425.5; // Julian day of Gregorian epoch (1 January 1 CE)

/**
 * Converts a Gregorian date to Julian day number
 */
function gregorianToJulian(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * Converts Julian day number to Gregorian date
 */
function julianToGregorian(julianDay: number): GregorianDate {
  const a = julianDay + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  
  return { year, month, day };
}

/**
 * Converts Gregorian date to Hijri date (approximation)
 */
export function gregorianToHijri(gregorianDate: Date): HijriDate {
  const julianDay = gregorianToJulian(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );
  
  const hijriDays = Math.floor(julianDay - HIJRI_EPOCH);
  const hijriYears = Math.floor(hijriDays / 354.36708);
  const remainingDays = hijriDays - Math.floor(hijriYears * 354.36708);
  
  let month = 1;
  let day = remainingDays;
  
  // Simplified month calculation (assumes 29.5 days per month average)
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  
  for (let i = 0; i < 12; i++) {
    if (day <= monthLengths[i]) {
      month = i + 1;
      break;
    }
    day -= monthLengths[i];
  }
  
  const year = hijriYears + 1;
  const monthName = HIJRI_MONTHS[month - 1];
  const formatted = `${day} ${monthName} ${year}هـ`;
  
  return {
    year,
    month,
    day: Math.max(1, Math.floor(day)),
    monthName,
    formatted
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
  };
}

/**
<<<<<<< HEAD
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
=======
 * Converts Hijri date to Gregorian date (approximation)
 */
export function hijriToGregorian(hijriYear: number, hijriMonth: number, hijriDay: number): Date {
  const totalDays = (hijriYear - 1) * 354.36708 + (hijriMonth - 1) * 29.5 + hijriDay;
  const julianDay = Math.floor(HIJRI_EPOCH + totalDays);
  const gregorian = julianToGregorian(julianDay);
  
  return new Date(gregorian.year, gregorian.month - 1, gregorian.day);
}

/**
 * Gets current Hijri date
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
 */
export function getCurrentHijriDate(): HijriDate {
  return gregorianToHijri(new Date());
}

/**
<<<<<<< HEAD
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
 */
export function hijriToGregorian(hy: number, hm: number, hd: number): Date {
  // Simplified conversion algorithm
  let jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
    Math.floor((hm - 1) / 2) + hd + 1948440 - 385;

  let l = jd + 68569;
  let n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  let i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  let j = Math.floor((80 * l) / 2447);
  let d = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  let m = j + 2 - (12 * l);
  let y = 100 * (n - 49) + i + l;

  return new Date(y, m - 1, d);
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
=======
 * Formats a Hijri date for display
 */
export function formatHijriDate(hijriDate: HijriDate, includeHijriIndicator = true): string {
  const indicator = includeHijriIndicator ? 'هـ' : '';
  return `${hijriDate.day} ${hijriDate.monthName} ${hijriDate.year}${indicator}`;
}

/**
 * Formats a dual date (Gregorian and Hijri)
 */
export function formatDualDate(gregorianDate: Date): string {
  const hijriDate = gregorianToHijri(gregorianDate);
  const gregorianFormatted = gregorianDate.toLocaleDateString('ar-SA');
  const hijriFormatted = formatHijriDate(hijriDate);
  
  return `${gregorianFormatted} (${hijriFormatted})`;
}

/**
 * Gets Hijri month names
 */
export function getHijriMonths(): string[] {
  return [...HIJRI_MONTHS];
}

/**
 * Gets the name of a Hijri month by number (1-12)
 */
export function getHijriMonthName(monthNumber: number): string {
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error('Month number must be between 1 and 12');
  }
  return HIJRI_MONTHS[monthNumber - 1];
}

/**
 * Validates a Hijri date
 */
export function isValidHijriDate(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  
  // Basic validation - Hijri months are either 29 or 30 days
  if (day > 30) {
    return false;
  }
  
  return true;
}

/**
 * Creates a Hijri date object from a string
 */
export function parseHijriDate(dateString: string): HijriDate | null {
  // Try to parse formats like "15 رمضان 1445" or "15-09-1445"
  const arabicMatch = dateString.match(/(\d+)\s+(\S+)\s+(\d+)/);
  if (arabicMatch) {
    const day = parseInt(arabicMatch[1]);
    const monthName = arabicMatch[2];
    const year = parseInt(arabicMatch[3]);
    const month = HIJRI_MONTHS.indexOf(monthName) + 1;
    
    if (month > 0 && isValidHijriDate(year, month, day)) {
      return {
        year,
        month,
        day,
        monthName,
        formatted: formatHijriDate({ year, month, day, monthName, formatted: '' })
      };
    }
  }
  
  // Try numeric format like "15-09-1445"
  const numericMatch = dateString.match(/(\d+)[-\/](\d+)[-\/](\d+)/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]);
    const year = parseInt(numericMatch[3]);
    
    if (isValidHijriDate(year, month, day)) {
      const monthName = getHijriMonthName(month);
      return {
        year,
        month,
        day,
        monthName,
        formatted: formatHijriDate({ year, month, day, monthName, formatted: '' })
      };
    }
  }
  
  return null;
}

/**
 * Calculates the difference between two Hijri dates in days
 */
export function hijriDateDifference(date1: HijriDate, date2: HijriDate): number {
  const gregorian1 = hijriToGregorian(date1.year, date1.month, date1.day);
  const gregorian2 = hijriToGregorian(date2.year, date2.month, date2.day);
  
  const timeDiff = gregorian2.getTime() - gregorian1.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Adds days to a Hijri date
 */
export function addDaysToHijriDate(hijriDate: HijriDate, days: number): HijriDate {
  const gregorianDate = hijriToGregorian(hijriDate.year, hijriDate.month, hijriDate.day);
  gregorianDate.setDate(gregorianDate.getDate() + days);
  return gregorianToHijri(gregorianDate);
}

/**
 * Gets the start and end of a Hijri month
 */
export function getHijriMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = hijriToGregorian(year, month, 1);
  const end = hijriToGregorian(year, month + 1, 1);
  end.setDate(end.getDate() - 1); // Last day of the month
  
  return { start, end };
}

/**
 * Checks if a year is a leap year in the Hijri calendar
 */
export function isHijriLeapYear(year: number): boolean {
  // In the Hijri calendar, leap years follow a 30-year cycle
  // Years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 are leap years
  const leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
  const cycleYear = year % 30;
  return leapYears.includes(cycleYear);
}

/**
 * Gets the number of days in a Hijri month
 */
export function getHijriMonthDays(year: number, month: number): number {
  // In the Hijri calendar, months alternate between 30 and 29 days
  // In leap years, the last month (Dhul Hijjah) has 30 days instead of 29
  if (month % 2 === 1) {
    return 30; // Odd months have 30 days
  } else if (month === 12 && isHijriLeapYear(year)) {
    return 30; // Dhul Hijjah in leap years has 30 days
  } else {
    return 29; // Even months have 29 days
  }
}

export default {
  gregorianToHijri,
  hijriToGregorian,
  getCurrentHijriDate,
  formatHijriDate,
  formatDualDate,
  getHijriMonths,
  getHijriMonthName,
  isValidHijriDate,
  parseHijriDate,
  hijriDateDifference,
  addDaysToHijriDate,
  getHijriMonthRange,
  isHijriLeapYear,
  getHijriMonthDays,
};
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
