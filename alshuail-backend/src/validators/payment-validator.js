/**
 * Payment Validation Module
 * Ensures payment data integrity and security
 */

import { log } from '../utils/logger.js';

/**
 * Payment validation rules
 */
const PAYMENT_RULES = {
  // Amount limits (in SAR)
  MIN_AMOUNT: 100,
  MAX_AMOUNT: 10000,
  STANDARD_SUBSCRIPTION: 3000,

  // Supported currencies
  ALLOWED_CURRENCIES: ['SAR'],

  // Supported payment methods
  ALLOWED_METHODS: ['knet', 'card', 'bank_transfer'],

  // Description limits
  MAX_DESCRIPTION_LENGTH: 500,

  // Security thresholds
  SUSPICIOUS_AMOUNT_THRESHOLD: 9999,
  RAPID_PAYMENT_WINDOW: 60000, // 1 minute in ms
  MAX_RAPID_PAYMENTS: 3
};

// Track rapid payment attempts
const paymentAttempts = new Map();

/**
 * Validate payment amount
 * @param {number} amount - Payment amount
 * @returns {Object} Validation result
 */
function validateAmount(amount) {
  // Check if amount is a number
  if (typeof amount !== 'number' || isNaN(amount)) {
    return {
      valid: false,
      error: 'Payment amount must be a valid number',
      errorAr: 'مبلغ الدفع يجب أن يكون رقماً صحيحاً'
    };
  }

  // Check if amount is positive
  if (amount <= 0) {
    return {
      valid: false,
      error: 'Payment amount must be greater than zero',
      errorAr: 'مبلغ الدفع يجب أن يكون أكبر من صفر'
    };
  }

  // Check minimum amount
  if (amount < PAYMENT_RULES.MIN_AMOUNT) {
    return {
      valid: false,
      error: `Minimum payment amount is ${PAYMENT_RULES.MIN_AMOUNT} SAR`,
      errorAr: `الحد الأدنى للدفع هو ${PAYMENT_RULES.MIN_AMOUNT} ريال`
    };
  }

  // Check maximum amount
  if (amount > PAYMENT_RULES.MAX_AMOUNT) {
    return {
      valid: false,
      error: `Maximum payment amount is ${PAYMENT_RULES.MAX_AMOUNT} SAR`,
      errorAr: `الحد الأقصى للدفع هو ${PAYMENT_RULES.MAX_AMOUNT} ريال`
    };
  }

  // Check decimal places (max 2 decimal places)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return {
      valid: false,
      error: 'Amount cannot have more than 2 decimal places',
      errorAr: 'المبلغ لا يمكن أن يحتوي على أكثر من منزلتين عشريتين'
    };
  }

  // Log suspicious amounts
  if (amount >= PAYMENT_RULES.SUSPICIOUS_AMOUNT_THRESHOLD) {
    log.warn('Suspicious payment amount detected', { amount });
  }

  return { valid: true };
}

/**
 * Validate payment currency
 * @param {string} currency - Currency code
 * @returns {Object} Validation result
 */
function validateCurrency(currency = 'SAR') {
  if (!PAYMENT_RULES.ALLOWED_CURRENCIES.includes(currency)) {
    return {
      valid: false,
      error: `Currency ${currency} is not supported`,
      errorAr: `العملة ${currency} غير مدعومة`
    };
  }

  return { valid: true };
}

/**
 * Validate payment method
 * @param {string} method - Payment method
 * @returns {Object} Validation result
 */
function validatePaymentMethod(method) {
  if (!method) {
    return {
      valid: false,
      error: 'Payment method is required',
      errorAr: 'طريقة الدفع مطلوبة'
    };
  }

  if (!PAYMENT_RULES.ALLOWED_METHODS.includes(method)) {
    return {
      valid: false,
      error: `Payment method ${method} is not supported`,
      errorAr: `طريقة الدفع ${method} غير مدعومة`
    };
  }

  return { valid: true };
}

/**
 * Validate payment description
 * @param {string} description - Payment description
 * @returns {Object} Validation result
 */
function validateDescription(description) {
  if (description && description.length > PAYMENT_RULES.MAX_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      error: `Description cannot exceed ${PAYMENT_RULES.MAX_DESCRIPTION_LENGTH} characters`,
      errorAr: `الوصف لا يمكن أن يتجاوز ${PAYMENT_RULES.MAX_DESCRIPTION_LENGTH} حرف`
    };
  }

  // Check for suspicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onclick/i,
    /onerror/i,
    /eval\(/i,
    /DROP TABLE/i,
    /INSERT INTO/i,
    /UPDATE.*SET/i
  ];

  if (description && suspiciousPatterns.some(pattern => pattern.test(description))) {
    log.warn('Suspicious content in payment description', { description });
    return {
      valid: false,
      error: 'Invalid characters in description',
      errorAr: 'أحرف غير صالحة في الوصف'
    };
  }

  return { valid: true };
}

/**
 * Check for rapid payment attempts (rate limiting)
 * @param {string} userId - User ID
 * @returns {Object} Validation result
 */
function checkRapidPayments(userId) {
  if (!userId) {
    return { valid: true }; // Skip check if no user ID
  }

  const now = Date.now();
  const userAttempts = paymentAttempts.get(userId) || [];

  // Filter out old attempts
  const recentAttempts = userAttempts.filter(
    timestamp => now - timestamp < PAYMENT_RULES.RAPID_PAYMENT_WINDOW
  );

  if (recentAttempts.length >= PAYMENT_RULES.MAX_RAPID_PAYMENTS) {
    log.warn('Rapid payment attempts detected', { userId, attempts: recentAttempts.length });
    return {
      valid: false,
      error: 'Too many payment attempts. Please wait before trying again.',
      errorAr: 'محاولات دفع كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى.'
    };
  }

  // Update attempts
  recentAttempts.push(now);
  paymentAttempts.set(userId, recentAttempts);

  // Clean up old entries periodically
  if (Math.random() < 0.1) { // 10% chance
    cleanupPaymentAttempts();
  }

  return { valid: true };
}

/**
 * Clean up old payment attempt records
 */
function cleanupPaymentAttempts() {
  const now = Date.now();

  for (const [userId, attempts] of paymentAttempts.entries()) {
    const recentAttempts = attempts.filter(
      timestamp => now - timestamp < PAYMENT_RULES.RAPID_PAYMENT_WINDOW
    );

    if (recentAttempts.length === 0) {
      paymentAttempts.delete(userId);
    } else {
      paymentAttempts.set(userId, recentAttempts);
    }
  }
}

/**
 * Main payment validation function
 * @param {Object} paymentData - Payment data to validate
 * @param {string} userId - User ID for rate limiting
 * @returns {Object} Validation result
 */
function validatePayment(paymentData, userId = null) {
  const errors = [];

  // Validate amount
  const amountValidation = validateAmount(paymentData.amount);
  if (!amountValidation.valid) {
    errors.push(amountValidation);
  }

  // Validate currency
  const currencyValidation = validateCurrency(paymentData.currency);
  if (!currencyValidation.valid) {
    errors.push(currencyValidation);
  }

  // Validate payment method
  const methodValidation = validatePaymentMethod(paymentData.method);
  if (!methodValidation.valid) {
    errors.push(methodValidation);
  }

  // Validate description
  const descriptionValidation = validateDescription(paymentData.description);
  if (!descriptionValidation.valid) {
    errors.push(descriptionValidation);
  }

  // Check rapid payment attempts
  const rapidPaymentCheck = checkRapidPayments(userId);
  if (!rapidPaymentCheck.valid) {
    errors.push(rapidPaymentCheck);
  }

  // Return validation result
  if (errors.length > 0) {
    log.warn('Payment validation failed', {
      userId,
      errors: errors.map(e => e.error),
      amount: paymentData.amount
    });

    return {
      valid: false,
      errors: errors.map(e => ({
        error: e.error,
        errorAr: e.errorAr
      }))
    };
  }

  log.info('Payment validation successful', {
    userId,
    amount: paymentData.amount,
    method: paymentData.method
  });

  return { valid: true };
}

/**
 * Validate subscription payment amount
 * @param {number} amount - Payment amount
 * @returns {Object} Validation result
 */
function validateSubscriptionAmount(amount) {
  const baseValidation = validateAmount(amount);

  if (!baseValidation.valid) {
    return baseValidation;
  }

  // Check if amount matches standard subscription
  if (amount !== PAYMENT_RULES.STANDARD_SUBSCRIPTION) {
    log.warn('Non-standard subscription amount', { amount });
    // Allow but log - can be partial payments
  }

  return { valid: true };
}

export {
  validatePayment,
  validateAmount,
  validateCurrency,
  validatePaymentMethod,
  validateDescription,
  validateSubscriptionAmount,
  checkRapidPayments,
  PAYMENT_RULES
};