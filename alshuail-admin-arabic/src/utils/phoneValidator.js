/**
 * Phone Number Validation and Formatting Utilities
 * Supports Saudi Arabia and Kuwait phone formats
 */

/**
 * Phone number formats supported:
 *
 * Saudi Arabia (SA):
 * - +966 5X XXX XXXX (9 digits after country code)
 * - Examples: +966501234567, 966501234567, 0501234567, 501234567
 *
 * Kuwait (KW):
 * - +965 XXXX XXXX (8 digits after country code)
 * - Examples: +96512345678, 96512345678, 12345678
 */

export const COUNTRY_CODES = {
  SA: {
    code: '966',
    name: 'Saudi Arabia',
    nameAr: 'السعودية',
    flag: '🇸🇦',
    localDigits: 9,
    startsWithDigits: ['5'], // Mobile numbers start with 5
    format: '+966 5X XXX XXXX',
    placeholder: '5XXXXXXXX',
    example: '501234567'
  },
  KW: {
    code: '965',
    name: 'Kuwait',
    nameAr: 'الكويت',
    flag: '🇰🇼',
    localDigits: 8,
    startsWithDigits: ['2', '5', '6', '9'], // Valid Kuwait prefixes
    format: '+965 XXXX XXXX',
    placeholder: 'XXXXXXXX',
    example: '12345678'
  }
};

/**
 * Validate phone number for specific country
 * @param {string} phone - Phone number to validate
 * @param {string} country - Country code ('SA' or 'KW')
 * @returns {boolean} - True if valid
 */
export const validatePhone = (phone, country = 'SA') => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const countryConfig = COUNTRY_CODES[country];
  if (!countryConfig) {
    return false;
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if starts with country code
  if (cleaned.startsWith(countryConfig.code)) {
    const localNumber = cleaned.substring(countryConfig.code.length);

    // Check length
    if (localNumber.length !== countryConfig.localDigits) {
      return false;
    }

    // Check if starts with valid digits
    const firstDigit = localNumber.charAt(0);
    return countryConfig.startsWithDigits.includes(firstDigit);
  } else {
    // Local number without country code
    if (cleaned.length !== countryConfig.localDigits) {
      return false;
    }

    // Check if starts with valid digits
    const firstDigit = cleaned.charAt(0);
    return countryConfig.startsWithDigits.includes(firstDigit);
  }
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @param {string} country - Country code ('SA' or 'KW')
 * @param {boolean} includeCountryCode - Include country code in output
 * @returns {string} - Formatted phone number
 */
export const formatPhone = (phone, country = 'SA', includeCountryCode = true) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  const countryConfig = COUNTRY_CODES[country];
  if (!countryConfig) {
    return phone;
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Extract local number
  let localNumber = cleaned;
  if (cleaned.startsWith(countryConfig.code)) {
    localNumber = cleaned.substring(countryConfig.code.length);
  } else if (country === 'SA' && cleaned.startsWith('0')) {
    localNumber = cleaned.substring(1);
  }

  // Format based on country
  let formatted = '';

  if (country === 'SA') {
    // Saudi format: +966 5XX XXX XXX
    if (localNumber.length === 9) {
      formatted = `${localNumber.substring(0, 3)} ${localNumber.substring(3, 6)} ${localNumber.substring(6)}`;
      if (includeCountryCode) {
        formatted = `+${countryConfig.code} ${formatted}`;
      } else {
        formatted = `0${formatted}`;
      }
    } else {
      formatted = localNumber;
    }
  } else if (country === 'KW') {
    // Kuwait format: +965 XXXX XXXX
    if (localNumber.length === 8) {
      formatted = `${localNumber.substring(0, 4)} ${localNumber.substring(4)}`;
      if (includeCountryCode) {
        formatted = `+${countryConfig.code} ${formatted}`;
      }
    } else {
      formatted = localNumber;
    }
  }

  return formatted;
};

/**
 * Normalize phone number to international format
 * @param {string} phone - Phone number to normalize
 * @param {string} country - Country code ('SA' or 'KW')
 * @returns {string|null} - Normalized phone (e.g., '966501234567') or null if invalid
 */
export const normalizePhone = (phone, country = 'SA') => {
  if (!validatePhone(phone, country)) {
    return null;
  }

  const countryConfig = COUNTRY_CODES[country];
  const cleaned = phone.replace(/\D/g, '');

  // Already has country code
  if (cleaned.startsWith(countryConfig.code)) {
    return cleaned;
  }

  // Add country code
  let localNumber = cleaned;
  if (country === 'SA' && cleaned.startsWith('0')) {
    localNumber = cleaned.substring(1);
  }

  return countryConfig.code + localNumber;
};

/**
 * Detect country from phone number
 * @param {string} phone - Phone number
 * @returns {string|null} - Country code ('SA' or 'KW') or null
 */
export const detectCountry = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const cleaned = phone.replace(/\D/g, '');

  // Check for country codes
  if (cleaned.startsWith('966')) {
    return 'SA';
  } else if (cleaned.startsWith('965')) {
    return 'KW';
  }

  // Try to detect from length and format
  if (cleaned.length === 9 && cleaned.startsWith('5')) {
    return 'SA'; // Likely Saudi without country code
  } else if (cleaned.length === 10 && cleaned.startsWith('05')) {
    return 'SA'; // Saudi with leading zero
  } else if (cleaned.length === 8) {
    return 'KW'; // Likely Kuwait without country code
  }

  return null;
};

/**
 * Format phone for WhatsApp link
 * @param {string} phone - Phone number
 * @param {string} country - Country code ('SA' or 'KW')
 * @returns {string|null} - WhatsApp URL or null
 */
export const formatWhatsAppLink = (phone, country = 'SA') => {
  const normalized = normalizePhone(phone, country);
  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized}`;
};

/**
 * Get phone input placeholder based on country
 * @param {string} country - Country code ('SA' or 'KW')
 * @returns {string} - Placeholder text
 */
export const getPhonePlaceholder = (country = 'SA') => {
  const config = COUNTRY_CODES[country];
  return config ? config.placeholder : '5XXXXXXXX';
};

/**
 * Get phone format description
 * @param {string} country - Country code ('SA' or 'KW')
 * @returns {string} - Format description in Arabic
 */
export const getPhoneFormatDescription = (country = 'SA') => {
  if (country === 'KW') {
    return 'رقم كويتي (8 أرقام): مثال 12345678 أو 96512345678';
  } else {
    return 'رقم سعودي (9 أرقام): مثال 501234567 أو 0501234567';
  }
};

export default {
  validatePhone,
  formatPhone,
  normalizePhone,
  detectCountry,
  formatWhatsAppLink,
  getPhonePlaceholder,
  getPhoneFormatDescription,
  COUNTRY_CODES
};