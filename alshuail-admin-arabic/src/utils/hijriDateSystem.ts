/**
 * Comprehensive Hijri Date System
 * Premium Islamic Calendar Integration for Al-Shuail Family Management
 * Provides full Hijri-Gregorian conversion and formatting
 * Uses hijri-converter library for accurate date conversion
 */

import * as hijriConverter from 'hijri-converter';

// Hijri Month Names
export const HIJRI_MONTHS = {
  ar: [
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
  ],
  en: [
    'Muharram',
    'Safar',
    'Rabi al-Awwal',
    'Rabi al-Thani',
    'Jumada al-Awwal',
    'Jumada al-Thani',
    'Rajab',
    'Shaban',
    'Ramadan',
    'Shawwal',
    'Dhul Qadah',
    'Dhul Hijjah'
  ]
};

// Arabic Day Names
export const ARABIC_DAYS = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

// Islamic Occasions and Events
export const ISLAMIC_OCCASIONS = [
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

interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  monthNameEn: string;
  dayName: string;
  dayNameEn: string;
}

interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Convert Gregorian date to Hijri
 * Uses hijri-converter library for accurate conversion
 */
export function gregorianToHijri(date: Date): HijriDate {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const dayOfWeek = date.getDay();

  try {
    // Use hijri-converter for accurate conversion
    const hijri = hijriConverter.toHijri(gy, gm, gd);

    const hy = hijri.hy;
    const hm = hijri.hm;
    const hd = hijri.hd;

    return {
      year: hy,
      month: hm,
      day: hd,
      monthName: HIJRI_MONTHS.ar[hm - 1],
      monthNameEn: HIJRI_MONTHS.en[hm - 1],
      dayName: ARABIC_DAYS.ar[dayOfWeek],
      dayNameEn: ARABIC_DAYS.en[dayOfWeek]
    };
  } catch (error) {
    console.error('Error converting to Hijri:', error);
    // Fallback
    return {
      year: 1447,
      month: 1,
      day: 1,
      monthName: HIJRI_MONTHS.ar[0],
      monthNameEn: HIJRI_MONTHS.en[0],
      dayName: ARABIC_DAYS.ar[dayOfWeek],
      dayNameEn: ARABIC_DAYS.en[dayOfWeek]
    };
  }
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
 * Format Hijri date in various styles
 */
export function formatHijriDate(
  date: Date,
  format: 'full' | 'long' | 'medium' | 'short' | 'numeric' = 'long',
  language: 'ar' | 'en' = 'ar'
): string {
  const hijri = gregorianToHijri(date);

  switch (format) {
    case 'full':
      if (language === 'ar') {
        return `${hijri.dayName}، ${hijri.day} ${hijri.monthName} ${hijri.year} هـ`;
      } else {
        return `${hijri.dayNameEn}, ${hijri.day} ${hijri.monthNameEn} ${hijri.year} AH`;
      }

    case 'long':
      if (language === 'ar') {
        return `${hijri.day} ${hijri.monthName} ${hijri.year} هـ`;
      } else {
        return `${hijri.day} ${hijri.monthNameEn} ${hijri.year} AH`;
      }

    case 'medium':
      if (language === 'ar') {
        return `${hijri.day} ${hijri.monthName.substring(0, 3)} ${hijri.year}`;
      } else {
        return `${hijri.day} ${hijri.monthNameEn.substring(0, 3)} ${hijri.year}`;
      }

    case 'short':
      return `${hijri.day}/${hijri.month}/${hijri.year}`;

    case 'numeric':
      return `${String(hijri.day).padStart(2, '0')}-${String(hijri.month).padStart(2, '0')}-${hijri.year}`;

    default:
      return formatHijriDate(date, 'long', language);
  }
}

/**
 * Get current Hijri date
 */
export function getCurrentHijriDate(): HijriDate {
  return gregorianToHijri(new Date());
}

/**
 * Format dual date (Hijri and Gregorian)
 */
export function formatDualDate(
  date: Date,
  format: 'full' | 'long' | 'short' = 'long',
  separator: string = ' | '
): string {
  const hijriDate = formatHijriDate(date, format, 'ar');
  const gregorianDate = date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: format === 'short' ? 'numeric' : 'long',
    day: 'numeric'
  });

  return `${hijriDate}${separator}${gregorianDate}`;
}

/**
 * Check if date is Islamic occasion
 */
export function getIslamicOccasion(date: Date): { nameAr: string; nameEn: string } | null {
  const hijri = gregorianToHijri(date);

  const occasion = ISLAMIC_OCCASIONS.find(
    occ => occ.month === hijri.month && occ.day === hijri.day
  );

  return occasion ? { nameAr: occasion.nameAr, nameEn: occasion.nameEn } : null;
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
 * Generate Hijri calendar for a month
 */
export function generateHijriCalendar(year: number, month: number) {
  const monthDays = getHijriMonthDays(year, month);
  const firstDay = hijriToGregorian(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();

  const calendar = [];
  let week = new Array(7).fill(null);

  for (let day = 1; day <= monthDays; day++) {
    const dayIndex = (firstDayOfWeek + day - 1) % 7;
    week[dayIndex] = {
      hijriDay: day,
      gregorianDate: hijriToGregorian(year, month, day),
      occasion: getIslamicOccasion(hijriToGregorian(year, month, day))
    };

    if (dayIndex === 6 || day === monthDays) {
      calendar.push([...week]);
      week = new Array(7).fill(null);
    }
  }

  return calendar;
}

/**
 * Parse Hijri date string
 */
export function parseHijriDate(dateString: string): HijriDate | null {
  // Parse various formats: "1445-01-15", "15/1/1445", "15 محرم 1445"
  const numericPattern = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/;
  const match = dateString.match(numericPattern);

  if (match) {
    const [_, day, month, year] = match;
    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      monthName: HIJRI_MONTHS.ar[parseInt(month) - 1],
      monthNameEn: HIJRI_MONTHS.en[parseInt(month) - 1],
      dayName: '',
      dayNameEn: ''
    };
  }

  return null;
}

/**
 * Calculate age in Hijri years
 */
export function calculateHijriAge(birthDate: Date): number {
  const today = getCurrentHijriDate();
  const birth = gregorianToHijri(birthDate);

  let age = today.year - birth.year;

  if (today.month < birth.month ||
      (today.month === birth.month && today.day < birth.day)) {
    age--;
  }

  return age;
}

/**
 * Get Hijri date range for filtering
 */
export function getHijriDateRange(
  rangeType: 'today' | 'week' | 'month' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date
): { start: HijriDate; end: HijriDate } {
  const today = getCurrentHijriDate();

  switch (rangeType) {
    case 'today':
      return { start: today, end: today };

    case 'week':
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return {
        start: gregorianToHijri(weekStart),
        end: gregorianToHijri(weekEnd)
      };

    case 'month':
      return {
        start: { ...today, day: 1 },
        end: { ...today, day: getHijriMonthDays(today.year, today.month) }
      };

    case 'year':
      return {
        start: { ...today, month: 1, day: 1, monthName: HIJRI_MONTHS.ar[0], monthNameEn: HIJRI_MONTHS.en[0] },
        end: { ...today, month: 12, day: getHijriMonthDays(today.year, 12), monthName: HIJRI_MONTHS.ar[11], monthNameEn: HIJRI_MONTHS.en[11] }
      };

    case 'custom':
      if (customStart && customEnd) {
        return {
          start: gregorianToHijri(customStart),
          end: gregorianToHijri(customEnd)
        };
      }
      return { start: today, end: today };

    default:
      return { start: today, end: today };
  }
}

/**
 * Format relative Hijri date
 */
export function formatRelativeHijriDate(date: Date, language: 'ar' | 'en' = 'ar'): string {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (language === 'ar') {
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return date > today ? 'غداً' : 'أمس';
    if (diffDays <= 7) return `${date > today ? 'بعد' : 'قبل'} ${diffDays} أيام`;
    if (diffDays <= 30) return `${date > today ? 'بعد' : 'قبل'} ${Math.ceil(diffDays / 7)} أسابيع`;
    if (diffDays <= 365) return `${date > today ? 'بعد' : 'قبل'} ${Math.ceil(diffDays / 30)} شهور`;
    return `${date > today ? 'بعد' : 'قبل'} ${Math.ceil(diffDays / 365)} سنوات`;
  } else {
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return date > today ? 'Tomorrow' : 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ${date > today ? 'from now' : 'ago'}`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ${date > today ? 'from now' : 'ago'}`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ${date > today ? 'from now' : 'ago'}`;
    return `${Math.ceil(diffDays / 365)} years ${date > today ? 'from now' : 'ago'}`;
  }
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

/**
 * Get prayer times for a given date
 */
export function getPrayerTimes(date: Date, latitude: number = 24.7136, longitude: number = 46.6753) {
  // Simplified prayer time calculation for Riyadh
  // In production, use a proper prayer times API or library
  const times = {
    fajr: '04:45',
    sunrise: '06:02',
    dhuhr: '11:52',
    asr: '15:08',
    maghrib: '17:41',
    isha: '19:11'
  };

  return times;
}

/**
 * Export all utilities
 */
export default {
  HIJRI_MONTHS,
  ARABIC_DAYS,
  ISLAMIC_OCCASIONS,
  gregorianToHijri,
  hijriToGregorian,
  formatHijriDate,
  getCurrentHijriDate,
  formatDualDate,
  getIslamicOccasion,
  getHijriMonthDays,
  generateHijriCalendar,
  parseHijriDate,
  calculateHijriAge,
  getHijriDateRange,
  formatRelativeHijriDate,
  isValidHijriDate,
  getPrayerTimes
};