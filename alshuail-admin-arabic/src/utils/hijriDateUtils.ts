// Hijri Date Utilities for Al-Shuail Admin Dashboard

// Basic Hijri date conversion utilities
// Note: For production, consider using a more comprehensive library like moment-hijri or hijri-converter

interface HijriDate {
  year: number;
  month: number;
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
  };
}

/**
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
 */
export function getCurrentHijriDate(): HijriDate {
  return gregorianToHijri(new Date());
}

/**
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