/**
 * Arabic utilities for number formatting, calendar display, and RTL support
 */

// Arabic numerals mapping
const arabicNumeralsMap: { [key: string]: string } = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩'
};

// Western numerals mapping (reverse)
const westernNumeralsMap: { [key: string]: string } = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9'
};

// Arabic month names
export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// Arabic day names
export const ARABIC_DAYS = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

// Arabic day names (short)
export const ARABIC_DAYS_SHORT = [
  'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'
];

// Hijri month names
export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

/**
 * Convert Western numerals to Arabic numerals
 */
export const toArabicNumerals = (str: string | number): string => {
  const stringValue = str.toString();
  return stringValue.replace(/[0-9]/g, (digit) => arabicNumeralsMap[digit] || digit);
};

/**
 * Convert Arabic numerals to Western numerals
 */
export const toWesternNumerals = (str: string): string => {
  return str.replace(/[٠-٩]/g, (digit) => westernNumeralsMap[digit] || digit);
};

/**
 * Format number with Arabic thousand separators
 */
export const formatArabicNumber = (num: number): string => {
  const formatted = new Intl.NumberFormat('ar-SA').format(num);
  return toArabicNumerals(formatted);
};

/**
 * Format currency in Arabic
 */
export const formatArabicCurrency = (amount: number, currency: string = 'ريال'): string => {
  const formatted = formatArabicNumber(amount);
  return `${formatted} ${currency}`;
};

/**
 * Format date in Arabic
 */
export const formatArabicDate = (date: Date): string => {
  const day = toArabicNumerals(date.getDate());
  const month = ARABIC_MONTHS[date.getMonth()];
  const year = toArabicNumerals(date.getFullYear());

  return `${day} ${month} ${year}`;
};

/**
 * Format time in Arabic (12-hour format)
 */
export const formatArabicTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour24 = parseInt(hours);
  const isPM = hour24 >= 12;
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;

  const arabicHour = toArabicNumerals(hour12);
  const arabicMinutes = toArabicNumerals(minutes);
  const period = isPM ? 'مساءً' : 'صباحاً';

  return `${arabicHour}:${arabicMinutes} ${period}`;
};

/**
 * Format date and time together in Arabic
 */
export const formatArabicDateTime = (date: Date, time: string): string => {
  const arabicDate = formatArabicDate(date);
  const arabicTime = formatArabicTime(time);

  return `${arabicDate} - ${arabicTime}`;
};

/**
 * Get Arabic day name
 */
export const getArabicDayName = (date: Date): string => {
  return ARABIC_DAYS[date.getDay()];
};

/**
 * Get Arabic day name (short)
 */
export const getArabicDayNameShort = (date: Date): string => {
  return ARABIC_DAYS_SHORT[date.getDay()];
};

/**
 * Convert Gregorian date to Hijri (approximation)
 * Note: This is a simplified conversion. For accurate conversion, use a proper Hijri calendar library
 */
export const toHijriDate = (gregorianDate: Date): { year: number; month: number; day: number } => {
  // Simple approximation: Hijri epoch is July 16, 622 CE
  const hijriEpoch = new Date(622, 6, 16);
  const diffTime = gregorianDate.getTime() - hijriEpoch.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Average Hijri year is about 354.367 days
  const hijriYear = Math.floor(diffDays / 354.367) + 1;
  const remainingDays = diffDays % 354.367;
  const hijriMonth = Math.floor(remainingDays / 29.5) + 1;
  const hijriDay = Math.floor(remainingDays % 29.5) + 1;

  return {
    year: hijriYear,
    month: Math.min(hijriMonth, 12),
    day: Math.min(hijriDay, 30)
  };
};

/**
 * Format Hijri date in Arabic
 */
export const formatHijriDate = (date: Date): string => {
  const hijri = toHijriDate(date);
  const day = toArabicNumerals(hijri.day);
  const month = HIJRI_MONTHS[hijri.month - 1];
  const year = toArabicNumerals(hijri.year);

  return `${day} ${month} ${year} هـ`;
};

/**
 * Format both Gregorian and Hijri dates
 */
export const formatDualDate = (date: Date): string => {
  const gregorian = formatArabicDate(date);
  const hijri = formatHijriDate(date);

  return `${gregorian} (${hijri})`;
};

/**
 * Calculate relative time in Arabic
 */
export const getRelativeTimeArabic = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes < 60) return `منذ ${toArabicNumerals(diffMinutes)} ${diffMinutes === 1 ? 'دقيقة' : 'دقائق'}`;
  if (diffHours < 24) return `منذ ${toArabicNumerals(diffHours)} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
  if (diffDays < 7) return `منذ ${toArabicNumerals(diffDays)} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
  if (diffWeeks < 4) return `منذ ${toArabicNumerals(diffWeeks)} ${diffWeeks === 1 ? 'أسبوع' : 'أسابيع'}`;
  if (diffMonths < 12) return `منذ ${toArabicNumerals(diffMonths)} ${diffMonths === 1 ? 'شهر' : 'شهور'}`;
  return `منذ ${toArabicNumerals(diffYears)} ${diffYears === 1 ? 'سنة' : 'سنوات'}`;
};

/**
 * Get upcoming time in Arabic
 */
export const getUpcomingTimeArabic = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return getRelativeTimeArabic(date);

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 60) return `خلال ${toArabicNumerals(diffMinutes)} ${diffMinutes === 1 ? 'دقيقة' : 'دقائق'}`;
  if (diffHours < 24) return `خلال ${toArabicNumerals(diffHours)} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
  if (diffDays < 7) return `خلال ${toArabicNumerals(diffDays)} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
  if (diffWeeks < 4) return `خلال ${toArabicNumerals(diffWeeks)} ${diffWeeks === 1 ? 'أسبوع' : 'أسابيع'}`;
  if (diffMonths < 12) return `خلال ${toArabicNumerals(diffMonths)} ${diffMonths === 1 ? 'شهر' : 'شهور'}`;
  return `خلال ${toArabicNumerals(diffYears)} ${diffYears === 1 ? 'سنة' : 'سنوات'}`;
};

/**
 * Format percentage in Arabic
 */
export const formatArabicPercentage = (value: number): string => {
  const rounded = Math.round(value);
  return `${toArabicNumerals(rounded)}%`;
};

/**
 * RTL-aware text truncation
 */
export const truncateArabicText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Check if text contains Arabic characters
 */
export const hasArabicCharacters = (text: string): boolean => {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
};

/**
 * Get text direction based on content
 */
export const getTextDirection = (text: string): 'rtl' | 'ltr' => {
  return hasArabicCharacters(text) ? 'rtl' : 'ltr';
};

/**
 * Format Arabic phone number
 */
export const formatArabicPhoneNumber = (phone: string): string => {
  // Remove any non-numeric characters
  const cleaned = toWesternNumerals(phone).replace(/\D/g, '');

  // Format as Saudi phone number if it matches the pattern
  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    const formatted = `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    return toArabicNumerals(formatted);
  }

  // Format as international number
  if (cleaned.length > 10) {
    const country = cleaned.substring(0, cleaned.length - 9);
    const number = cleaned.substring(cleaned.length - 9);
    const formatted = `+${country} ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    return toArabicNumerals(formatted);
  }

  return toArabicNumerals(cleaned);
};