/**
 * Member Validation Utilities
 * Input validation helpers for member management operations
 */

import { ERROR_CODES, ERROR_MESSAGES, VALIDATION_LIMITS } from '../constants/memberConstants.js';

/**
 * Validate if a string is a valid UUID v4 format
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid UUID, false otherwise
 */
export const isValidUUID = (id) => {
  if (!id || typeof id !== 'string') return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Validate member ID parameter
 * @param {string} memberId - The member ID to validate
 * @returns {Object} Validation result { valid: boolean, error?: Object }
 */
export const validateMemberId = (memberId) => {
  if (!memberId) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: ERROR_MESSAGES.INVALID_INPUT.MEMBER_ID_REQUIRED
      }
    };
  }

  if (!isValidUUID(memberId)) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: ERROR_MESSAGES.INVALID_INPUT.MEMBER_ID_INVALID
      }
    };
  }

  return { valid: true };
};

/**
 * Sanitize text input to prevent XSS attacks
 * @param {string} text - The text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';

  // Remove HTML tags and trim whitespace
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

/**
 * Validate suspension reason
 * @param {string} reason - The suspension reason to validate
 * @returns {Object} Validation result { valid: boolean, error?: Object, sanitized?: string }
 */
export const validateSuspensionReason = (reason) => {
  if (!reason || typeof reason !== 'string') {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: ERROR_MESSAGES.INVALID_INPUT.SUSPENSION_REASON_REQUIRED
      }
    };
  }

  const sanitized = sanitizeText(reason);

  if (sanitized.length === 0) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: ERROR_MESSAGES.INVALID_INPUT.SUSPENSION_REASON_REQUIRED
      }
    };
  }

  if (sanitized.length > VALIDATION_LIMITS.SUSPENSION_REASON_MAX_LENGTH) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: ERROR_MESSAGES.INVALID_INPUT.SUSPENSION_REASON_TOO_LONG
      }
    };
  }

  return { valid: true, sanitized };
};

/**
 * Validate reactivation notes (optional field)
 * @param {string} notes - The reactivation notes to validate
 * @returns {Object} Validation result { valid: boolean, error?: Object, sanitized?: string }
 */
export const validateReactivationNotes = (notes) => {
  // Notes are optional
  if (!notes) {
    return { valid: true, sanitized: '' };
  }

  const sanitized = sanitizeText(notes);

  if (sanitized.length > VALIDATION_LIMITS.REACTIVATION_NOTES_MAX_LENGTH) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: ERROR_MESSAGES.INVALID_INPUT.REACTIVATION_NOTES_TOO_LONG
      }
    };
  }

  return { valid: true, sanitized };
};

/**
 * Build standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Error code constant
 * @param {string} message - Error message
 * @returns {Object} Error response object
 */
export const buildErrorResponse = (statusCode, errorCode, message) => {
  return {
    status: statusCode,
    body: {
      success: false,
      error: errorCode,
      message
    }
  };
};

/**
 * Build standardized success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response object
 */
export const buildSuccessResponse = (data, message) => {
  return {
    success: true,
    message,
    data
  };
};
