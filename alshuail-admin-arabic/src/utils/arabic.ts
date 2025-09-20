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
};