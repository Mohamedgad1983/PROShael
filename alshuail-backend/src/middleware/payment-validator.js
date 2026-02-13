/**
 * Payment Validation Middleware
 * Server-side validation for all payment operations
 *
 * Security Level: HIGH
 * OWASP: Prevents payment tampering, amount manipulation, and fraud
 */

import crypto from 'crypto';

// Payment configuration
const PAYMENT_CONFIG = {
  // Amount limits in SAR
  MIN_AMOUNT: 100,      // Minimum 100 SAR
  MAX_AMOUNT: 50000,    // Maximum 50,000 SAR

  // Allowed payment methods
  ALLOWED_METHODS: ['knet', 'card', 'bank_transfer'],

  // Transaction ID format
  TRANSACTION_PREFIX: 'SAF',

  // Rate limiting (per user per day)
  MAX_PAYMENTS_PER_DAY: 10,
  MAX_AMOUNT_PER_DAY: 100000, // 100,000 SAR
};

// In-memory store for transaction tracking (use Redis in production)
const transactionStore = new Map();
const dailyLimits = new Map();

/**
 * Generate unique transaction ID
 * Format: SAF-YYYYMMDD-HHMMSS-RANDOM
 */
function generateTransactionID() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();

  return `${PAYMENT_CONFIG.TRANSACTION_PREFIX}-${date}-${time}-${random}`;
}

/**
 * Validate payment amount
 */
function validateAmount(amount, res) {
  // Check if amount is a number
  if (typeof amount !== 'number' || isNaN(amount)) {
    res.status(400).json({
      success: false,
      message: 'المبلغ يجب أن يكون رقماً صحيحاً',
      message_en: 'Amount must be a valid number',
      error_code: 'INVALID_AMOUNT_TYPE'
    });
    return false;
  }

  // Check if amount is positive
  if (amount <= 0) {
    res.status(400).json({
      success: false,
      message: 'المبلغ يجب أن يكون أكبر من صفر',
      message_en: 'Amount must be greater than zero',
      error_code: 'AMOUNT_TOO_LOW'
    });
    return false;
  }

  // Check minimum amount
  if (amount < PAYMENT_CONFIG.MIN_AMOUNT) {
    res.status(400).json({
      success: false,
      message: `الحد الأدنى للمبلغ هو ${PAYMENT_CONFIG.MIN_AMOUNT} ريال سعودي`,
      message_en: `Minimum amount is ${PAYMENT_CONFIG.MIN_AMOUNT} SAR`,
      error_code: 'AMOUNT_BELOW_MINIMUM',
      min_amount: PAYMENT_CONFIG.MIN_AMOUNT
    });
    return false;
  }

  // Check maximum amount
  if (amount > PAYMENT_CONFIG.MAX_AMOUNT) {
    res.status(400).json({
      success: false,
      message: `الحد الأقصى للمبلغ هو ${PAYMENT_CONFIG.MAX_AMOUNT} ريال سعودي`,
      message_en: `Maximum amount is ${PAYMENT_CONFIG.MAX_AMOUNT} SAR`,
      error_code: 'AMOUNT_EXCEEDS_MAXIMUM',
      max_amount: PAYMENT_CONFIG.MAX_AMOUNT
    });
    return false;
  }

  return true;
}

/**
 * Validate payment method
 */
function validatePaymentMethod(method, res) {
  if (!method) {
    res.status(400).json({
      success: false,
      message: 'طريقة الدفع مطلوبة',
      message_en: 'Payment method is required',
      error_code: 'PAYMENT_METHOD_MISSING'
    });
    return false;
  }

  if (!PAYMENT_CONFIG.ALLOWED_METHODS.includes(method.toLowerCase())) {
    res.status(400).json({
      success: false,
      message: 'طريقة الدفع غير صالحة',
      message_en: 'Invalid payment method',
      error_code: 'INVALID_PAYMENT_METHOD',
      allowed_methods: PAYMENT_CONFIG.ALLOWED_METHODS
    });
    return false;
  }

  return true;
}

/**
 * Check for duplicate transaction
 */
function checkDuplicateTransaction(transactionId, res) {
  if (transactionStore.has(transactionId)) {
    const existingTx = transactionStore.get(transactionId);

    res.status(409).json({
      success: false,
      message: 'رقم المعاملة مكرر',
      message_en: 'Duplicate transaction ID',
      error_code: 'DUPLICATE_TRANSACTION',
      existing_transaction: {
        id: existingTx.id,
        timestamp: existingTx.timestamp,
        status: existingTx.status
      }
    });
    return false;
  }

  return true;
}

/**
 * Check daily limits for user
 */
function checkDailyLimits(userId, amount, res) {
  const today = new Date().toISOString().slice(0, 10);
  const limitKey = `${userId}_${today}`;

  // Get or create daily limit tracker
  if (!dailyLimits.has(limitKey)) {
    dailyLimits.set(limitKey, {
      count: 0,
      totalAmount: 0,
      date: today
    });
  }

  const limits = dailyLimits.get(limitKey);

  // Check payment count limit
  if (limits.count >= PAYMENT_CONFIG.MAX_PAYMENTS_PER_DAY) {
    res.status(429).json({
      success: false,
      message: 'تجاوزت الحد الأقصى للمعاملات اليومية',
      message_en: 'Daily payment limit exceeded',
      error_code: 'DAILY_PAYMENT_LIMIT_EXCEEDED',
      max_payments: PAYMENT_CONFIG.MAX_PAYMENTS_PER_DAY,
      current_count: limits.count
    });
    return false;
  }

  // Check daily amount limit
  if (limits.totalAmount + amount > PAYMENT_CONFIG.MAX_AMOUNT_PER_DAY) {
    res.status(429).json({
      success: false,
      message: 'تجاوزت الحد الأقصى للمبلغ اليومي',
      message_en: 'Daily amount limit exceeded',
      error_code: 'DAILY_AMOUNT_LIMIT_EXCEEDED',
      max_amount: PAYMENT_CONFIG.MAX_AMOUNT_PER_DAY,
      current_amount: limits.totalAmount,
      requested_amount: amount
    });
    return false;
  }

  return true;
}

/**
 * Update daily limits after successful payment
 */
function updateDailyLimits(userId, amount) {
  const today = new Date().toISOString().slice(0, 10);
  const limitKey = `${userId}_${today}`;

  const limits = dailyLimits.get(limitKey) || {
    count: 0,
    totalAmount: 0,
    date: today
  };

  limits.count += 1;
  limits.totalAmount += amount;

  dailyLimits.set(limitKey, limits);
}

/**
 * Register transaction
 */
function registerTransaction(transactionId, userId, amount, method, metadata = {}) {
  transactionStore.set(transactionId, {
    id: transactionId,
    userId,
    amount,
    method,
    status: 'pending',
    timestamp: new Date().toISOString(),
    metadata
  });
}

/**
 * Payment Initiation Validation Middleware
 * Validates payment requests before processing
 */
async function validatePaymentInitiation(req, res, next) {
  try {
    const { amount, method, userId, memberId } = req.body;

    // Get user ID from JWT token or request body
    const userIdentifier = userId || memberId || req.user?.id;

    if (!userIdentifier) {
      return res.status(401).json({
        success: false,
        message: 'معرّف المستخدم مطلوب',
        message_en: 'User identification required',
        error_code: 'USER_ID_MISSING'
      });
    }

    // Validate amount
    if (!validateAmount(amount, res)) {
      return;
    }

    // Validate payment method
    if (!validatePaymentMethod(method, res)) {
      return;
    }

    // Check daily limits
    if (!checkDailyLimits(userIdentifier, amount, res)) {
      return;
    }

    // Generate unique transaction ID
    const transactionId = generateTransactionID();

    // Attach validated data to request
    req.validatedPayment = {
      transactionId,
      userId: userIdentifier,
      amount,
      method: method.toLowerCase(),
      timestamp: new Date().toISOString()
    };

    // Register transaction
    registerTransaction(transactionId, userIdentifier, amount, method, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    next();

  } catch (error) {
    console.error('Payment validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الدفع',
      message_en: 'Payment validation error',
      error_code: 'VALIDATION_ERROR'
    });
  }
}

/**
 * Payment Verification Middleware
 * Verifies payment gateway responses
 */
async function validatePaymentVerification(req, res, next) {
  try {
    const { transactionId, status, gatewayResponse } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'رقم المعاملة مطلوب',
        message_en: 'Transaction ID required',
        error_code: 'TRANSACTION_ID_MISSING'
      });
    }

    // Check if transaction exists
    const transaction = transactionStore.get(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'المعاملة غير موجودة',
        message_en: 'Transaction not found',
        error_code: 'TRANSACTION_NOT_FOUND'
      });
    }

    // Validate status
    const validStatuses = ['success', 'failed', 'pending', 'cancelled'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'حالة الدفع غير صالحة',
        message_en: 'Invalid payment status',
        error_code: 'INVALID_STATUS'
      });
    }

    // Update transaction status
    transaction.status = status.toLowerCase();
    transaction.verifiedAt = new Date().toISOString();
    transaction.gatewayResponse = gatewayResponse;

    transactionStore.set(transactionId, transaction);

    // Update daily limits if payment successful
    if (status.toLowerCase() === 'success') {
      updateDailyLimits(transaction.userId, transaction.amount);
    }

    // Attach transaction to request
    req.verifiedPayment = transaction;

    next();

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الدفع',
      message_en: 'Payment verification error',
      error_code: 'VERIFICATION_ERROR'
    });
  }
}

/**
 * Bank Transfer Validation
 * Additional validation for bank transfer receipts
 */
async function validateBankTransfer(req, res, next) {
  try {
    const { accountNumber, receiptImage, referenceNumber } = req.body;

    // Validate account number
    if (!accountNumber || accountNumber.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'رقم الحساب غير صالح',
        message_en: 'Invalid account number',
        error_code: 'INVALID_ACCOUNT_NUMBER'
      });
    }

    // Validate receipt image (optional but recommended)
    if (receiptImage && !receiptImage.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'صورة الإيصال غير صالحة',
        message_en: 'Invalid receipt image',
        error_code: 'INVALID_RECEIPT_IMAGE'
      });
    }

    // Validate reference number
    if (referenceNumber && referenceNumber.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'الرقم المرجعي غير صالح',
        message_en: 'Invalid reference number',
        error_code: 'INVALID_REFERENCE_NUMBER'
      });
    }

    next();

  } catch (error) {
    console.error('Bank transfer validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من التحويل البنكي',
      message_en: 'Bank transfer validation error',
      error_code: 'BANK_TRANSFER_VALIDATION_ERROR'
    });
  }
}

/**
 * Clean up old transactions (run periodically)
 */
function cleanupOldTransactions() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [id, transaction] of transactionStore.entries()) {
    const age = now - new Date(transaction.timestamp).getTime();
    if (age > maxAge) {
      transactionStore.delete(id);
    }
  }

  // Clean up old daily limits (older than 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const [key, limits] of dailyLimits.entries()) {
    if (new Date(limits.date) < thirtyDaysAgo) {
      dailyLimits.delete(key);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldTransactions, 60 * 60 * 1000);

export {
  validatePaymentInitiation,
  validatePaymentVerification,
  validateBankTransfer,
  generateTransactionID,
  PAYMENT_CONFIG
};
