// Phone Number Validators - File 06 Integration
// Saudi Arabia (+966) and Kuwait (+965) phone validation

/**
 * Validate Saudi phone number
 * Format: +966 5X XXX XXXX (mobile) or +966 1X XXX XXXX (landline)
 */
export const validateSaudiPhone = (phone) => {
  if (!phone) return false;

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check for +966 or 00966 or 966 prefix
  const saudiPattern = /^(\+966|00966|966)?([5][0-9]{8}|[1-9][0-9]{7})$/;

  return saudiPattern.test(cleaned);
};

/**
 * Validate Kuwaiti phone number
 * Format: +965 XXXX XXXX (8 digits)
 */
export const validateKuwaitPhone = (phone) => {
  if (!phone) return false;

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check for +965 or 00965 or 965 prefix
  const kuwaitPattern = /^(\+965|00965|965)?([2456789][0-9]{7})$/;

  return kuwaitPattern.test(cleaned);
};

/**
 * Validate phone for both Saudi and Kuwait
 */
export const validateGCCPhone = (phone) => {
  return validateSaudiPhone(phone) || validateKuwaitPhone(phone);
};

/**
 * Format phone number with country code
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Saudi number
  if (cleaned.startsWith('+966') || cleaned.startsWith('966')) {
    const number = cleaned.replace(/^(\+966|966)/, '');
    if (number.length === 9) {
      return `+966 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
    }
    if (number.length === 8) {
      return `+966 ${number.slice(0, 1)} ${number.slice(1, 4)} ${number.slice(4)}`;
    }
  }

  // Kuwait number
  if (cleaned.startsWith('+965') || cleaned.startsWith('965')) {
    const number = cleaned.replace(/^(\+965|965)/, '');
    if (number.length === 8) {
      return `+965 ${number.slice(0, 4)} ${number.slice(4)}`;
    }
  }

  return phone;
};

/**
 * Get country code from phone number
 */
export const getCountryCode = (phone) => {
  if (!phone) return null;

  const cleaned = phone.replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('+966') || cleaned.startsWith('966')) {
    return '+966';
  }
  if (cleaned.startsWith('+965') || cleaned.startsWith('965')) {
    return '+965';
  }

  return null;
};

/**
 * Normalize phone to international format (+XXX)
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';

  const cleaned = phone.replace(/[^\d+]/g, '');

  // Add + if missing
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('966')) {
      return '+' + cleaned;
    }
    if (cleaned.startsWith('965')) {
      return '+' + cleaned;
    }
    // Default to Saudi if no country code
    if (cleaned.length === 9 || cleaned.length === 8) {
      return '+966' + cleaned;
    }
  }

  return cleaned;
};

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email) return false;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

/**
 * Validate National ID (Saudi Iqama or Kuwait Civil ID)
 * Saudi: 10 digits starting with 1 or 2
 * Kuwait: 12 digits
 */
export const validateNationalId = (id, country = 'saudi') => {
  if (!id) return false;

  const cleaned = id.replace(/\D/g, '');

  if (country === 'saudi') {
    // Saudi National ID: 10 digits, starts with 1 (Saudi) or 2 (Iqama)
    return /^[12]\d{9}$/.test(cleaned);
  }

  if (country === 'kuwait') {
    // Kuwait Civil ID: 12 digits
    return /^\d{12}$/.test(cleaned);
  }

  return false;
};

/**
 * Validate Arabic text (required for names)
 */
export const validateArabicText = (text) => {
  if (!text) return false;

  // Check if contains at least one Arabic character
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text);
};

/**
 * Validate date (YYYY-MM-DD format)
 */
export const validateDate = (date) => {
  if (!date) return false;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(date)) return false;

  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate);
};

/**
 * Validate age range (for birth dates)
 */
export const validateAge = (birthDate, minAge = 0, maxAge = 150) => {
  if (!birthDate) return false;

  const today = new Date();
  const birth = new Date(birthDate);

  if (isNaN(birth.getTime())) return false;

  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())
    ? age - 1
    : age;

  return actualAge >= minAge && actualAge <= maxAge;
};
