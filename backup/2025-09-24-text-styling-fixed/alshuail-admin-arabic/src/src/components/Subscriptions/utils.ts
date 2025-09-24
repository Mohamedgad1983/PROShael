import { PaymentValidationResult } from './types';

/**
 * Payment validation utilities for the flexible payment system
 */

/**
 * Validates a payment amount according to business rules:
 * - Minimum 50 SAR
 * - Must be a multiple of 50
 * - No upper limit
 */
export const validatePaymentAmount = (amount: string | number): PaymentValidationResult => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Check if it's a valid number
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      isValid: false,
      error: "يرجى إدخال رقم صحيح"
    };
  }

  // Check minimum amount (50 SAR)
  if (numAmount < 50) {
    return {
      isValid: false,
      error: "الحد الأدنى للاشتراك 50 ريال"
    };
  }

  // Check if it's a multiple of 50
  if (numAmount % 50 !== 0) {
    return {
      isValid: false,
      error: "المبلغ يجب أن يكون من مضاعفات الـ 50 ريال"
    };
  }

  return {
    isValid: true
  };
};

/**
 * Formats a number to Arabic locale for display
 */
export const formatArabicNumber = (num: number): string => {
  return num.toLocaleString('ar-SA');
};

/**
 * Formats a number to English locale for calculations
 */
export const formatEnglishNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

/**
 * Calculates the total amount based on duration and discounts
 */
export const calculateTotalAmount = (
  baseAmount: number,
  duration: 'monthly' | 'yearly' | 'lifetime'
): number => {
  switch (duration) {
    case 'monthly':
      return baseAmount;
    case 'yearly':
      // 10% discount for yearly payments
      return Math.round(baseAmount * 12 * 0.9);
    case 'lifetime':
      // Equivalent to 2 years
      return Math.round(baseAmount * 24);
    default:
      return baseAmount;
  }
};

/**
 * Calculates savings for yearly payments
 */
export const calculateYearlySavings = (monthlyAmount: number): number => {
  return Math.round(monthlyAmount * 12 * 0.1);
};

/**
 * Generates suggested amounts based on base amount
 */
export const generateSuggestedAmounts = (baseAmount: number = 50): number[] => {
  const suggestions: number[] = [];

  // Always include the base amount
  suggestions.push(baseAmount);

  // Add common multiples
  const multipliers = [2, 4, 10, 20];
  multipliers.forEach(multiplier => {
    const amount = baseAmount * multiplier;
    if (!suggestions.includes(amount)) {
      suggestions.push(amount);
    }
  });

  return suggestions.sort((a, b) => a - b);
};

/**
 * Validates member data
 */
export const validateMember = (member: any): boolean => {
  return member && typeof member === 'object' &&
         typeof member.id === 'string' && member.id.length > 0 &&
         typeof member.name === 'string' && member.name.length > 0;
};

/**
 * Formats currency for display
 */
export const formatCurrency = (amount: number, locale: 'ar' | 'en' = 'ar'): string => {
  const formattedAmount = locale === 'ar' ? formatArabicNumber(amount) : formatEnglishNumber(amount);
  return `${formattedAmount} ريال`;
};

/**
 * Parses Arabic numerals to English numerals for calculations
 */
export const parseArabicNumber = (arabicNumber: string): number => {
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩';
  const englishNumerals = '0123456789';

  let englishNumber = arabicNumber;

  for (let i = 0; i < arabicNumerals.length; i++) {
    const arabicChar = arabicNumerals[i];
    const englishChar = englishNumerals[i];
    englishNumber = englishNumber.replace(new RegExp(arabicChar, 'g'), englishChar);
  }

  return parseFloat(englishNumber);
};

/**
 * Converts English numerals to Arabic numerals for display
 */
export const toArabicNumerals = (englishNumber: string | number): string => {
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩';
  const englishNumerals = '0123456789';

  const numberStr = englishNumber.toString();
  let arabicNumber = numberStr;

  for (let i = 0; i < englishNumerals.length; i++) {
    const englishChar = englishNumerals[i];
    const arabicChar = arabicNumerals[i];
    arabicNumber = arabicNumber.replace(new RegExp(englishChar, 'g'), arabicChar);
  }

  return arabicNumber;
};

/**
 * Checks if an amount is within acceptable limits
 */
export const isAmountWithinLimits = (amount: number): { valid: boolean; message?: string } => {
  if (amount < 50) {
    return {
      valid: false,
      message: "المبلغ أقل من الحد الأدنى المسموح (50 ريال)"
    };
  }

  // For very large amounts, show a warning but allow
  if (amount > 100000) {
    return {
      valid: true,
      message: "تأكد من صحة المبلغ المدخل - إنه مبلغ كبير"
    };
  }

  return { valid: true };
};

/**
 * Generates a unique transaction ID
 */
export const generateTransactionId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9);
  return `TXN-${timestamp}-${random}`.toUpperCase();
};

/**
 * Creates a payment summary object
 */
export const createPaymentSummary = (
  baseAmount: number,
  duration: 'monthly' | 'yearly' | 'lifetime',
  memberName: string
) => {
  const totalAmount = calculateTotalAmount(baseAmount, duration);
  const savings = duration === 'yearly' ? calculateYearlySavings(baseAmount) : 0;

  return {
    baseAmount,
    duration,
    totalAmount,
    savings,
    memberName,
    transactionId: generateTransactionId(),
    createdAt: new Date(),
    formattedAmount: formatCurrency(totalAmount),
    formattedSavings: savings > 0 ? formatCurrency(savings) : null
  };
};

/**
 * Debounce function for input validation
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};