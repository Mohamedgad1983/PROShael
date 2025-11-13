/**
 * Language & Region Settings Type Definitions
 * Complete type-safe structure for user language/region preferences
 *
 * Database Storage: users.language_settings JSONB field
 * Feature 5 Phase 3 - Feature 5.3
 * Last Modified: 2025-11-13
 */

/**
 * Language options
 */
export type Language = 'ar' | 'en' | 'both';

/**
 * Date format options
 */
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

/**
 * Time format options
 */
export type TimeFormat = '12h' | '24h';

/**
 * Number format options
 */
export type NumberFormat = 'western' | 'arabic';

/**
 * Week start options
 */
export type WeekStart = 'saturday' | 'sunday' | 'monday';

/**
 * Complete language settings structure
 * Stored in users.language_settings JSONB field
 */
export interface LanguageSettings {
  /**
   * Interface language (Arabic/English/Both)
   * @default "ar"
   */
  language: Language;

  /**
   * Region/Country (ISO 3166-1 alpha-2 code)
   * @default "SA" (Saudi Arabia)
   */
  region: string;

  /**
   * Timezone (IANA timezone identifier)
   * @default "Asia/Riyadh"
   */
  timezone: string;

  /**
   * Date display format
   * @default "DD/MM/YYYY"
   */
  date_format: DateFormat;

  /**
   * Time display format (12-hour or 24-hour)
   * @default "12h"
   */
  time_format: TimeFormat;

  /**
   * Number notation (Western: 0-9, Arabic: ٠-٩)
   * @default "western"
   */
  number_format: NumberFormat;

  /**
   * Currency (ISO 4217 code)
   * @default "SAR" (Saudi Riyal)
   */
  currency: string;

  /**
   * First day of the week
   * @default "saturday"
   */
  week_start: WeekStart;

  /**
   * Last updated timestamp (ISO 8601)
   * Auto-updated on every settings change
   */
  updated_at?: string;
}

/**
 * Default language settings for new users (Arabic/Saudi Arabia)
 */
export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  language: 'ar',
  region: 'SA',
  timezone: 'Asia/Riyadh',
  date_format: 'DD/MM/YYYY',
  time_format: '12h',
  number_format: 'western',
  currency: 'SAR',
  week_start: 'saturday'
};

/**
 * Validation helper: Check if language is valid
 */
export function isValidLanguage(lang: unknown): lang is Language {
  const validLanguages: Language[] = ['ar', 'en', 'both'];
  return validLanguages.includes(lang as Language);
}

/**
 * Validation helper: Check if date format is valid
 */
export function isValidDateFormat(format: unknown): format is DateFormat {
  const validFormats: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
  return validFormats.includes(format as DateFormat);
}

/**
 * Validation helper: Check if time format is valid
 */
export function isValidTimeFormat(format: unknown): format is TimeFormat {
  const validFormats: TimeFormat[] = ['12h', '24h'];
  return validFormats.includes(format as TimeFormat);
}

/**
 * Validation helper: Check if number format is valid
 */
export function isValidNumberFormat(format: unknown): format is NumberFormat {
  const validFormats: NumberFormat[] = ['western', 'arabic'];
  return validFormats.includes(format as NumberFormat);
}

/**
 * Validation helper: Check if week start is valid
 */
export function isValidWeekStart(day: unknown): day is WeekStart {
  const validDays: WeekStart[] = ['saturday', 'sunday', 'monday'];
  return validDays.includes(day as WeekStart);
}

/**
 * Validation helper: Check if region code is valid ISO 3166-1 alpha-2
 */
export function isValidRegion(region: unknown): boolean {
  if (typeof region !== 'string') return false;
  const regionRegex = /^[A-Z]{2}$/;
  return regionRegex.test(region);
}

/**
 * Validation helper: Check if currency code is valid ISO 4217
 */
export function isValidCurrency(currency: unknown): boolean {
  if (typeof currency !== 'string') return false;
  const currencyRegex = /^[A-Z]{3}$/;
  return currencyRegex.test(currency);
}

/**
 * Validation helper: Validate entire language settings object
 */
export function validateLanguageSettings(settings: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return { valid: false, errors: ['Settings must be an object'] };
  }

  const s = settings as Partial<LanguageSettings>;

  // Validate language
  if (!isValidLanguage(s.language)) {
    errors.push('language must be one of: ar, en, both');
  }

  // Validate region
  if (!isValidRegion(s.region)) {
    errors.push('region must be a valid 2-letter ISO 3166-1 alpha-2 code (e.g., SA, AE, US)');
  }

  // Validate timezone
  if (typeof s.timezone !== 'string' || s.timezone.length === 0) {
    errors.push('timezone must be a valid IANA timezone identifier');
  }

  // Validate date_format
  if (!isValidDateFormat(s.date_format)) {
    errors.push('date_format must be one of: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD');
  }

  // Validate time_format
  if (!isValidTimeFormat(s.time_format)) {
    errors.push('time_format must be one of: 12h, 24h');
  }

  // Validate number_format
  if (!isValidNumberFormat(s.number_format)) {
    errors.push('number_format must be one of: western, arabic');
  }

  // Validate currency
  if (!isValidCurrency(s.currency)) {
    errors.push('currency must be a valid 3-letter ISO 4217 code (e.g., SAR, USD, AED)');
  }

  // Validate week_start
  if (!isValidWeekStart(s.week_start)) {
    errors.push('week_start must be one of: saturday, sunday, monday');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Bilingual labels for language options
 */
export const LANGUAGE_LABELS: Record<Language, { ar: string; en: string }> = {
  ar: {
    ar: 'العربية',
    en: 'Arabic'
  },
  en: {
    ar: 'الإنجليزية',
    en: 'English'
  },
  both: {
    ar: 'العربية والإنجليزية',
    en: 'Arabic & English'
  }
};

/**
 * Bilingual labels for date formats
 */
export const DATE_FORMAT_LABELS: Record<DateFormat, { ar: string; en: string; example: string }> = {
  'DD/MM/YYYY': {
    ar: 'يوم/شهر/سنة',
    en: 'Day/Month/Year',
    example: '15/03/2025'
  },
  'MM/DD/YYYY': {
    ar: 'شهر/يوم/سنة',
    en: 'Month/Day/Year',
    example: '03/15/2025'
  },
  'YYYY-MM-DD': {
    ar: 'سنة-شهر-يوم',
    en: 'Year-Month-Day',
    example: '2025-03-15'
  }
};

/**
 * Bilingual labels for time formats
 */
export const TIME_FORMAT_LABELS: Record<TimeFormat, { ar: string; en: string; example: string }> = {
  '12h': {
    ar: '12 ساعة (صباحاً/مساءً)',
    en: '12-hour (AM/PM)',
    example: '3:30 PM'
  },
  '24h': {
    ar: '24 ساعة',
    en: '24-hour',
    example: '15:30'
  }
};

/**
 * Bilingual labels for number formats
 */
export const NUMBER_FORMAT_LABELS: Record<NumberFormat, { ar: string; en: string; example: string }> = {
  western: {
    ar: 'أرقام غربية',
    en: 'Western Numbers',
    example: '0123456789'
  },
  arabic: {
    ar: 'أرقام عربية',
    en: 'Arabic Numbers',
    example: '٠١٢٣٤٥٦٧٨٩'
  }
};

/**
 * Bilingual labels for week start
 */
export const WEEK_START_LABELS: Record<WeekStart, { ar: string; en: string }> = {
  saturday: {
    ar: 'السبت',
    en: 'Saturday'
  },
  sunday: {
    ar: 'الأحد',
    en: 'Sunday'
  },
  monday: {
    ar: 'الاثنين',
    en: 'Monday'
  }
};

/**
 * Common regions/countries for quick selection
 */
export const COMMON_REGIONS = [
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', currency: 'EGP', timezone: 'Africa/Cairo' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', currency: 'JOD', timezone: 'Asia/Amman' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', currency: 'KWD', timezone: 'Asia/Kuwait' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', currency: 'QAR', timezone: 'Asia/Qatar' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', currency: 'BHD', timezone: 'Asia/Bahrain' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان', currency: 'OMR', timezone: 'Asia/Muscat' }
];

/**
 * Common currencies for quick selection
 */
export const COMMON_CURRENCIES = [
  { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€' },
  { code: 'GBP', name: 'British Pound', nameAr: 'جنيه إسترليني', symbol: '£' },
  { code: 'EGP', name: 'Egyptian Pound', nameAr: 'جنيه مصري', symbol: 'ج.م' },
  { code: 'JOD', name: 'Jordanian Dinar', nameAr: 'دينار أردني', symbol: 'د.ا' },
  { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'د.ك' }
];

/**
 * Apply language settings to document (for preview)
 */
export function applyLanguageSettings(settings: LanguageSettings): void {
  const root = document.documentElement;

  // Apply language direction
  if (settings.language === 'ar' || settings.language === 'both') {
    root.setAttribute('dir', 'rtl');
    root.setAttribute('lang', 'ar');
  } else {
    root.setAttribute('dir', 'ltr');
    root.setAttribute('lang', 'en');
  }

  // Store settings in data attributes for CSS access
  root.setAttribute('data-language', settings.language);
  root.setAttribute('data-date-format', settings.date_format);
  root.setAttribute('data-time-format', settings.time_format);
  root.setAttribute('data-number-format', settings.number_format);
}
