/**
 * Payment Validation Service - Al-Shuail Family Admin Dashboard
 * Complete backend logic for flexible payment amount validation
 * Business rules: Minimum 50 SAR, amounts must be multiples of 50
 */
import { logger } from '../utils/logger';


// ====================
// PAYMENT VALIDATION SERVICE
// ====================

class PaymentValidationService {
  // Validation constants
  static MIN_AMOUNT = 50;
  static AMOUNT_MULTIPLE = 50;
  static CURRENCY = 'SAR';

  // Supported duration types
  static DURATION_TYPES = {
    monthly: { months: 1, label_ar: 'شهرياً', label_en: 'Monthly' },
    yearly: { months: 12, label_ar: 'سنوياً', label_en: 'Yearly' },
    lifetime: { months: -1, label_ar: 'مدى الحياة', label_en: 'Lifetime' }
  };

  /**
   * Main validation method for subscription amounts
   * @param {number} amount - Amount to validate
   * @returns {Object} Validation result
   */
  static validateSubscriptionAmount(amount) {
    try {
      // Type and basic validation
      if (amount === undefined || amount === null) {
        return {
          isValid: false,
          error: 'AMOUNT_REQUIRED',
          message: 'المبلغ مطلوب',
          code: 'VALIDATION_ERROR'
        };
      }

      // Convert string to number if needed
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

      // Type check
      if (typeof numericAmount !== 'number' || isNaN(numericAmount)) {
        return {
          isValid: false,
          error: 'INVALID_TYPE',
          message: 'المبلغ يجب أن يكون رقماً صحيحاً',
          code: 'INVALID_FORMAT'
        };
      }

      // Minimum amount check (includes zero and negative)
      if (numericAmount < this.MIN_AMOUNT) {
        return {
          isValid: false,
          error: 'BELOW_MINIMUM',
          message: `الحد الأدنى للاشتراك ${this.MIN_AMOUNT} ريال سعودي`,
          code: 'BELOW_MINIMUM',
          minimumRequired: this.MIN_AMOUNT
        };
      }

      // Multiple validation check
      if (numericAmount % this.AMOUNT_MULTIPLE !== 0) {
        const nearestLower = Math.floor(numericAmount / this.AMOUNT_MULTIPLE) * this.AMOUNT_MULTIPLE;
        const nearestHigher = nearestLower + this.AMOUNT_MULTIPLE;

        return {
          isValid: false,
          error: 'INVALID_MULTIPLE',
          message: `المبلغ يجب أن يكون من مضاعفات الـ ${this.AMOUNT_MULTIPLE} ريال`,
          code: 'INVALID_MULTIPLE',
          suggestions: {
            lower: nearestLower >= this.MIN_AMOUNT ? nearestLower : this.MIN_AMOUNT,
            higher: nearestHigher
          }
        };
      }

      // All validations passed
      return {
        isValid: true,
        amount: numericAmount,
        formatted: this.formatAmount(numericAmount),
        validation_passed: true,
        code: 'VALID'
      };
    } catch (error) {
      logger.error('Payment validation error:', { error });
      return {
        isValid: false,
        error: 'VALIDATION_FAILED',
        message: 'حدث خطأ أثناء التحقق من المبلغ',
        code: 'SYSTEM_ERROR'
      };
    }
  }

  /**
   * Calculate subscription details based on amount and duration
   * @param {number} amount - Validated amount
   * @param {string} duration - Duration type (monthly, yearly, lifetime)
   * @returns {Object} Subscription calculation details
   */
  static calculateSubscriptionDetails(amount, duration = 'monthly') {
    try {
      const durationInfo = this.DURATION_TYPES[duration];
      if (!durationInfo) {
        throw new Error(`نوع المدة غير مدعوم: ${duration}`);
      }

      const now = new Date();
      const startDate = new Date(now);
      let endDate = null;

      // Calculate end date based on duration
      if (durationInfo.months === -1) {
        // Lifetime subscription has no end date
        endDate = null;
      } else {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationInfo.months);
      }

      // Calculate total cost and monthly breakdown
      const totalAmount = amount;
      const monthlyEquivalent = durationInfo.months === -1
        ? 0  // Lifetime is one-time payment
        : Math.round(totalAmount / durationInfo.months * 100) / 100;

      return {
        amount: totalAmount,
        currency: this.CURRENCY,
        duration: duration,
        duration_info: durationInfo,
        duration_months: durationInfo.months,
        start_date: startDate,
        end_date: endDate,
        payment_due: new Date(startDate), // Immediate payment
        total_amount: totalAmount,
        monthly_equivalent: monthlyEquivalent,
        is_lifetime: durationInfo.months === -1,
        formatted_details: {
          amount: this.formatAmount(totalAmount),
          duration: durationInfo.label_ar,
          start_date: this.formatDate(startDate),
          end_date: endDate ? this.formatDate(endDate) : 'لا نهاية'
        }
      };
    } catch (error) {
      logger.error('Subscription calculation error:', { error });
      throw new Error('حدث خطأ في حساب تفاصيل الاشتراك');
    }
  }

  /**
   * Format amount for display in different languages
   * @param {number} amount - Amount to format
   * @returns {Object} Formatted amount object
   */
  static formatAmount(amount) {
    try {
      return {
        arabic: amount.toLocaleString('ar-SA') + ' ريال سعودي',
        english: amount.toLocaleString('en-US') + ' SAR',
        raw: amount,
        currency: this.CURRENCY,
        formatted_raw: amount.toFixed(2)
      };
    } catch (error) {
      logger.error('Amount formatting error:', { error });
      return {
        arabic: `${amount} ريال سعودي`,
        english: `${amount} SAR`,
        raw: amount,
        currency: this.CURRENCY,
        formatted_raw: amount.toString()
      };
    }
  }

  /**
   * Format date for Arabic display
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  static formatDate(date) {
    try {
      return new Date(date).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Generate quick amount suggestions based on multiples of 50
   * @returns {Array} Array of suggested amounts
   */
  static getQuickAmountSuggestions() {
    const suggestions = [];
    const baseSuggestions = [1, 2, 4, 10, 20, 50, 100]; // Multiples of MIN_AMOUNT

    baseSuggestions.forEach(multiplier => {
      const amount = this.MIN_AMOUNT * multiplier;
      suggestions.push({
        amount,
        formatted: this.formatAmount(amount),
        recommended: multiplier <= 4, // First few options are recommended
        description: this.getAmountDescription(amount)
      });
    });

    return suggestions;
  }

  /**
   * Get description for common amount ranges
   * @param {number} amount - Amount to describe
   * @returns {string} Description in Arabic
   */
  static getAmountDescription(amount) {
    if (amount <= 100) {
      return 'اشتراك أساسي';
    } else if (amount <= 500) {
      return 'اشتراك متوسط';
    } else if (amount <= 1000) {
      return 'اشتراك متقدم';
    } else {
      return 'اشتراك مميز';
    }
  }

  /**
   * Validate multiple amounts in batch
   * @param {Array} amounts - Array of amounts to validate
   * @returns {Array} Array of validation results
   */
  static validateBulkAmounts(amounts) {
    if (!Array.isArray(amounts)) {
      return [{
        isValid: false,
        error: 'INVALID_INPUT',
        message: 'المدخل يجب أن يكون مصفوفة من المبالغ'
      }];
    }

    return amounts.map((amount, index) => ({
      index,
      amount,
      result: this.validateSubscriptionAmount(amount)
    }));
  }

  /**
   * Check if amount represents a valid subscription upgrade
   * @param {number} currentAmount - Current subscription amount
   * @param {number} newAmount - New subscription amount
   * @returns {Object} Upgrade validation result
   */
  static validateSubscriptionUpgrade(currentAmount, newAmount) {
    try {
      // First validate the new amount
      const newAmountValidation = this.validateSubscriptionAmount(newAmount);
      if (!newAmountValidation.isValid) {
        return {
          isValid: false,
          error: 'INVALID_NEW_AMOUNT',
          message: newAmountValidation.message,
          details: newAmountValidation
        };
      }

      // Validate current amount (should be valid but double-check)
      const currentAmountValidation = this.validateSubscriptionAmount(currentAmount);
      if (!currentAmountValidation.isValid) {
        return {
          isValid: false,
          error: 'INVALID_CURRENT_AMOUNT',
          message: 'المبلغ الحالي غير صحيح'
        };
      }

      // Check if it's actually an upgrade
      if (newAmount <= currentAmount) {
        return {
          isValid: false,
          error: 'NOT_AN_UPGRADE',
          message: 'المبلغ الجديد يجب أن يكون أكبر من المبلغ الحالي',
          current: currentAmount,
          proposed: newAmount
        };
      }

      // Calculate upgrade details
      const upgradeDifference = newAmount - currentAmount;
      const upgradePercentage = Math.round((upgradeDifference / currentAmount) * 100);

      return {
        isValid: true,
        upgrade_valid: true,
        current_amount: currentAmount,
        new_amount: newAmount,
        upgrade_difference: upgradeDifference,
        upgrade_percentage: upgradePercentage,
        formatted_difference: this.formatAmount(upgradeDifference),
        message: `ترقية الاشتراك بزيادة ${this.formatAmount(upgradeDifference).arabic}`
      };
    } catch (error) {
      logger.error('Upgrade validation error:', { error });
      return {
        isValid: false,
        error: 'UPGRADE_VALIDATION_FAILED',
        message: 'حدث خطأ أثناء التحقق من ترقية الاشتراك'
      };
    }
  }

  /**
   * Calculate prorated amount for mid-cycle changes
   * @param {number} newAmount - New subscription amount
   * @param {Date} currentPeriodStart - Start of current billing period
   * @param {Date} currentPeriodEnd - End of current billing period
   * @param {Date} changeDate - Date of the change (defaults to now)
   * @returns {Object} Prorated calculation
   */
  static calculateProratedAmount(newAmount, currentPeriodStart, currentPeriodEnd, changeDate = new Date()) {
    try {
      const validation = this.validateSubscriptionAmount(newAmount);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      const totalDays = Math.ceil((currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((currentPeriodEnd - changeDate) / (1000 * 60 * 60 * 24));

      if (remainingDays <= 0) {
        return {
          prorated_amount: 0,
          remaining_days: 0,
          total_days: totalDays,
          message: 'الفترة الحالية انتهت، المبلغ الكامل يطبق من الفترة القادمة'
        };
      }

      const proratedAmount = Math.round((newAmount * remainingDays / totalDays) * 100) / 100;

      return {
        prorated_amount: proratedAmount,
        full_amount: newAmount,
        remaining_days: Math.max(0, remainingDays),
        total_days: totalDays,
        proration_percentage: Math.round((remainingDays / totalDays) * 100),
        formatted_prorated: this.formatAmount(proratedAmount),
        period_start: currentPeriodStart,
        period_end: currentPeriodEnd,
        change_date: changeDate
      };
    } catch (error) {
      logger.error('Proration calculation error:', { error });
      throw new Error('حدث خطأ في حساب المبلغ المتناسب');
    }
  }

  /**
   * Get payment method validation rules
   * @returns {Object} Payment method rules and options
   */
  static getPaymentMethodRules() {
    return {
      supported_methods: [
        {
          method: 'credit_card',
          name_ar: 'بطاقة ائتمان',
          name_en: 'Credit Card',
          min_amount: this.MIN_AMOUNT,
          max_amount: 50000,
          processing_fee: 0,
          instant_activation: true
        },
        {
          method: 'bank_transfer',
          name_ar: 'تحويل بنكي',
          name_en: 'Bank Transfer',
          min_amount: this.MIN_AMOUNT,
          max_amount: 100000,
          processing_fee: 0,
          instant_activation: false,
          processing_time: '1-3 أيام عمل'
        },
        {
          method: 'cash',
          name_ar: 'دفع نقدي',
          name_en: 'Cash Payment',
          min_amount: this.MIN_AMOUNT,
          max_amount: 10000,
          processing_fee: 0,
          instant_activation: true,
          note: 'متاح في المكاتب المعتمدة فقط'
        }
      ],
      default_method: 'credit_card',
      requires_verification: ['bank_transfer']
    };
  }
}

// ====================
// EXPORT
// ====================

export default PaymentValidationService;

// Named exports for convenience
export {
  PaymentValidationService
};

// Utility exports
export const {
  MIN_AMOUNT,
  AMOUNT_MULTIPLE,
  CURRENCY,
  DURATION_TYPES
} = PaymentValidationService;