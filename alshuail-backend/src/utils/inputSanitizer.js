/**
 * Input sanitization utilities for preventing SQL injection and XSS attacks
 */

/**
 * Sanitize string for SQL queries
 * Escapes special characters that could be used in SQL injection
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string safe for SQL queries
 */
export const sanitizeSQL = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove dangerous SQL characters and keywords
  let sanitized = input
    // Remove SQL comment characters
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Escape special characters
    .replace(/'/g, "''")  // Escape single quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"')   // Escape double quotes
    .replace(/\x00/g, '')   // Remove null bytes
    .replace(/\x1a/g, '');  // Remove EOF characters

  // Remove dangerous SQL keywords (case-insensitive)
  const dangerousKeywords = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER',
    'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE',
    'SCRIPT', 'UNION', 'SELECT.*FROM', 'DECLARE'
  ];

  dangerousKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  return sanitized.trim();
};

/**
 * Sanitize input for Supabase ILIKE queries
 * Escapes special pattern matching characters
 * @param {string} input - The search term
 * @returns {string} - Sanitized string safe for ILIKE queries
 */
export const sanitizeSearchTerm = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First apply SQL sanitization
  let sanitized = sanitizeSQL(input);

  // Then escape pattern matching characters for ILIKE
  sanitized = sanitized
    .replace(/%/g, '\\%')  // Escape % wildcard
    .replace(/_/g, '\\_');  // Escape _ wildcard

  return sanitized;
};

/**
 * Sanitize numeric input
 * Ensures input is a valid number and within bounds
 * @param {*} input - The input to sanitize
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if input is invalid
 * @returns {number} - Sanitized number
 */
export const sanitizeNumber = (input, min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = 0) => {
  const num = parseInt(input);

  if (isNaN(num)) {
    return defaultValue;
  }

  if (num < min) {
    return min;
  }

  if (num > max) {
    return max;
  }

  return num;
};

/**
 * Sanitize boolean input
 * Converts various input types to boolean
 * @param {*} input - The input to sanitize
 * @returns {boolean} - Sanitized boolean
 */
export const sanitizeBoolean = (input) => {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    return input.toLowerCase() === 'true';
  }

  return Boolean(input);
};

/**
 * Sanitize email input
 * Validates and normalizes email addresses
 * @param {string} email - The email to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Basic email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
};

/**
 * Sanitize phone number - Supports Saudi Arabia and Kuwait formats
 * Removes non-numeric characters and validates format
 * @param {string} phone - The phone number to sanitize
 * @param {string} country - Country code ('SA' or 'KW')
 * @returns {string|null} - Sanitized phone or null if invalid
 */
export const sanitizePhone = (phone, country = 'SA') => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  if (country === 'KW') {
    // Kuwait phone number validation
    // Format: +965 XXXX XXXX (8 digits after country code)
    // Can be entered as: 965XXXXXXXX, XXXXXXXX, or +965XXXXXXXX

    if (cleaned.startsWith('965')) {
      // Has country code
      const localNumber = cleaned.substring(3);
      if (localNumber.length === 8) {
        return cleaned; // Valid: 965XXXXXXXX
      }
    } else if (cleaned.length === 8) {
      // Just local number
      return '965' + cleaned; // Add country code
    }

    return null; // Invalid Kuwait format
  } else {
    // Saudi Arabia phone number validation (default)
    // Format: +966 5X XXX XXXX (9 digits after country code)
    // Can be entered as: 966XXXXXXXXX, 05XXXXXXXX, 5XXXXXXXX

    if (cleaned.startsWith('966')) {
      // Has country code
      const localNumber = cleaned.substring(3);
      if (localNumber.length === 9 && localNumber.startsWith('5')) {
        return cleaned; // Valid: 966XXXXXXXXX
      }
    } else if (cleaned.startsWith('05')) {
      // Format: 05XXXXXXXX
      const localNumber = cleaned.substring(1);
      if (localNumber.length === 9 && localNumber.startsWith('5')) {
        return '966' + localNumber; // Convert to: 966XXXXXXXXX
      }
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      // Format: 5XXXXXXXX
      return '966' + cleaned; // Convert to: 966XXXXXXXXX
    }

    return null; // Invalid Saudi format
  }
};

/**
 * Sanitize object for database insertion
 * Removes undefined, null, and dangerous values
 * @param {Object} obj - The object to sanitize
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined and null values
    if (value === undefined || value === null) {
      continue;
    }

    // Sanitize based on type
    if (typeof value === 'string') {
      sanitized[key] = sanitizeSQL(value);
    } else if (typeof value === 'number') {
      sanitized[key] = sanitizeNumber(value);
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeSQL(item) : item
      );
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
};

export default {
  sanitizeSQL,
  sanitizeSearchTerm,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject
};