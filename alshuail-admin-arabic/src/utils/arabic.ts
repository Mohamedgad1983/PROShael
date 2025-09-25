<<<<<<< HEAD
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
=======
// Arabic language utilities and formatting functions

/**
 * Converts English numbers to Arabic-Indic numerals
 * @param text - String containing English numbers
 * @returns String with Arabic-Indic numerals
 */
export const toArabicNumerals = (text: string | number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
};

/**
 * Converts Arabic-Indic numerals to English numbers
 * @param text - String containing Arabic-Indic numerals
 * @returns String with English numbers
 */
export const toEnglishNumerals = (text: string): string => {
  const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  let result = text;
  arabicNumerals.forEach((arabic, index) => {
    result = result.replace(new RegExp(arabic, 'g'), englishNumerals[index]);
  });
  
  return result;
};

/**
 * Formats numbers with Arabic thousand separators
 * @param number - Number to format
 * @param useArabicNumerals - Whether to use Arabic-Indic numerals
 * @returns Formatted number string
 */
export const formatArabicNumber = (number: number, useArabicNumerals = false): string => {
  const formatted = new Intl.NumberFormat('ar-SA').format(number);
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Formats currency in Saudi Riyal with Arabic formatting
 * @param amount - Amount to format
 * @param useArabicNumerals - Whether to use Arabic-Indic numerals
 * @returns Formatted currency string
 */
export const formatSaudiCurrency = (amount: number, useArabicNumerals = false): string => {
  const formatted = new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
  
  return useArabicNumerals ? toArabicNumerals(formatted) : formatted;
};

/**
 * Gets Arabic ordinal for numbers (first, second, etc.)
 * @param number - Number to get ordinal for
 * @returns Arabic ordinal string
 */
export const getArabicOrdinal = (number: number): string => {
  const ordinals: { [key: number]: string } = {
    1: 'الأول',
    2: 'الثاني',
    3: 'الثالث',
    4: 'الرابع',
    5: 'الخامس',
    6: 'السادس',
    7: 'السابع',
    8: 'الثامن',
    9: 'التاسع',
    10: 'العاشر',
  };
  
  return ordinals[number] || `${toArabicNumerals(number)}`;
};

/**
 * Formats Arabic names properly (capitalizes first letter of each word)
 * @param name - Name to format
 * @returns Properly formatted Arabic name
 */
export const formatArabicName = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Validates Saudi phone number format
 * @param phone - Phone number to validate
 * @returns Boolean indicating if phone number is valid
 */
export const validateSaudiPhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it matches Saudi phone number patterns
  const patterns = [
    /^(966)(5[0-9]{8})$/, // +966 5XXXXXXXX
    /^(05[0-9]{8})$/, // 05XXXXXXXX
    /^(5[0-9]{8})$/, // 5XXXXXXXX
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
};

/**
 * Formats Saudi phone number for display
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export const formatSaudiPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.startsWith('966')) {
    // +966 format
    const localNumber = cleanPhone.substring(3);
    return `+966 ${localNumber.substring(0, 2)} ${localNumber.substring(2, 5)} ${localNumber.substring(5)}`;
  } else if (cleanPhone.startsWith('05')) {
    // 05 format
    return `${cleanPhone.substring(0, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6)}`;
  } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
    // 5 format
    return `05${cleanPhone.substring(1, 2)} ${cleanPhone.substring(2, 5)} ${cleanPhone.substring(5)}`;
  }
  
  return phone; // Return original if no pattern matches
};

/**
 * Validates Saudi National ID (Iqama) number
 * @param nationalId - National ID to validate
 * @returns Boolean indicating if National ID is valid
 */
export const validateSaudiNationalId = (nationalId: string): boolean => {
  const cleanId = nationalId.replace(/\D/g, '');
  
  // Must be 10 digits and start with 1 or 2
  if (!/^[12]\d{9}$/.test(cleanId)) {
    return false;
  }
  
  // Luhn algorithm validation
  const digits = cleanId.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      const doubled = digits[i] * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += digits[i];
    }
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[9];
};

/**
 * Formats Saudi National ID for display
 * @param nationalId - National ID to format
 * @returns Formatted National ID
 */
export const formatSaudiNationalId = (nationalId: string): string => {
  const cleanId = nationalId.replace(/\D/g, '');
  
  if (cleanId.length === 10) {
    return `${cleanId.substring(0, 1)}-${cleanId.substring(1, 5)}-${cleanId.substring(5, 9)}-${cleanId.substring(9)}`;
  }
  
  return nationalId;
};

/**
 * Gets Arabic month names
 * @returns Array of Arabic month names
 */
export const getArabicMonths = (): string[] => {
  return [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
};

/**
 * Gets Arabic day names
 * @returns Array of Arabic day names
 */
export const getArabicDays = (): string[] => {
  return [
    'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
  ];
};

/**
 * Formats date in Arabic
 * @param date - Date to format
 * @param includeDay - Whether to include day name
 * @returns Formatted Arabic date string
 */
export const formatArabicDate = (date: Date, includeDay = false): string => {
  const arabicMonths = getArabicMonths();
  const arabicDays = getArabicDays();
  
  const day = date.getDate();
  const month = arabicMonths[date.getMonth()];
  const year = date.getFullYear();
  const dayName = arabicDays[date.getDay()];
  
  const dateString = `${toArabicNumerals(day)} ${month} ${toArabicNumerals(year)}`;
  
  return includeDay ? `${dayName}, ${dateString}` : dateString;
};

/**
 * Pluralizes Arabic nouns based on count
 * @param count - Number for pluralization
 * @param singular - Singular form
 * @param dual - Dual form
 * @param plural - Plural form
 * @returns Appropriate form based on count
 */
export const arabicPlural = (
  count: number,
  singular: string,
  dual: string,
  plural: string
): string => {
  if (count === 1) {
    return singular;
  } else if (count === 2) {
    return dual;
  } else if (count >= 3 && count <= 10) {
    return plural;
  } else {
    return singular; // For 11+ in Arabic grammar
  }
};

/**
 * Removes diacritics from Arabic text for searching
 * @param text - Arabic text with diacritics
 * @returns Text without diacritics
 */
export const removeDiacritics = (text: string): string => {
  return text.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
};

/**
 * Normalizes Arabic text for search (removes diacritics, normalizes characters)
 * @param text - Text to normalize
 * @returns Normalized text
 */
export const normalizeArabicText = (text: string): string => {
  return removeDiacritics(text)
    .replace(/[أإآ]/g, 'ا') // Normalize Alef variants
    .replace(/[ةه]/g, 'ه') // Normalize Teh Marbuta and Heh
    .replace(/ي/g, 'ى') // Normalize Yeh variants
    .toLowerCase();
};

export default {
  toArabicNumerals,
  toEnglishNumerals,
  formatArabicNumber,
  formatSaudiCurrency,
  getArabicOrdinal,
  formatArabicName,
  validateSaudiPhone,
  formatSaudiPhone,
  validateSaudiNationalId,
  formatSaudiNationalId,
  getArabicMonths,
  getArabicDays,
  formatArabicDate,
  arabicPlural,
  removeDiacritics,
  normalizeArabicText,
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
};