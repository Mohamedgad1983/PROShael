/**
 * Payment Validation Edge Cases Tests
 * Phase 2: Payment Processing Testing - Validation Edge Cases (5 tests)
 */

import { jest } from '@jest/globals';

describe('Payment Validation Edge Cases Tests', () => {
  class PaymentValidator {
    constructor() {
      this.validationRules = {
        amount: {
          min: 0.01,
          max: 999999.99,
          decimals: 2
        },
        description: {
          maxLength: 500,
          allowedChars: /^[\u0600-\u06FF\u0750-\u077F\w\s\-.,!?@#$%&()*+=/:;'"]+$/u
        },
        metadata: {
          maxKeys: 20,
          maxValueLength: 1000
        }
      };
    }

    validateAmount(amount) {
      const errors = [];

      if (typeof amount !== 'number') {
        errors.push('Amount must be a number');
        return errors;
      }

      if (isNaN(amount) || !isFinite(amount)) {
        errors.push('Amount must be a valid finite number');
      }

      if (amount < this.validationRules.amount.min) {
        errors.push(`Amount must be at least ${this.validationRules.amount.min}`);
      }

      if (amount > this.validationRules.amount.max) {
        errors.push(`Amount cannot exceed ${this.validationRules.amount.max}`);
      }

      // Check decimal places
      const decimalPlaces = (amount.toString().split('.')[1] || '').length;
      if (decimalPlaces > this.validationRules.amount.decimals) {
        errors.push(`Amount can have maximum ${this.validationRules.amount.decimals} decimal places`);
      }

      return errors;
    }

    validateDescription(description) {
      const errors = [];

      if (!description) {
        return errors; // Description is optional
      }

      if (typeof description !== 'string') {
        errors.push('Description must be a string');
        return errors;
      }

      if (description.length > this.validationRules.description.maxLength) {
        errors.push(`Description cannot exceed ${this.validationRules.description.maxLength} characters`);
      }

      // Check for allowed characters (including Arabic)
      if (!this.validationRules.description.allowedChars.test(description)) {
        errors.push('Description contains invalid characters');
      }

      return errors;
    }

    validateMetadata(metadata) {
      const errors = [];

      if (!metadata) {
        return errors; // Metadata is optional
      }

      if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        errors.push('Metadata must be an object');
        return errors;
      }

      const keys = Object.keys(metadata);

      if (keys.length > this.validationRules.metadata.maxKeys) {
        errors.push(`Metadata cannot have more than ${this.validationRules.metadata.maxKeys} keys`);
      }

      keys.forEach(key => {
        const value = metadata[key];

        if (typeof value === 'string' && value.length > this.validationRules.metadata.maxValueLength) {
          errors.push(`Metadata value for '${key}' exceeds maximum length`);
        }

        if (value === null || value === undefined) {
          errors.push(`Metadata value for '${key}' cannot be null or undefined`);
        }
      });

      return errors;
    }

    validateCurrencyConversion(amount, fromCurrency, toCurrency) {
      const rates = {
        'SAR': { 'USD': 0.27, 'EUR': 0.25, 'KWD': 0.082 },
        'KWD': { 'USD': 3.26, 'EUR': 3.01, 'SAR': 12.19 },
        'USD': { 'SAR': 3.75, 'EUR': 0.92, 'KWD': 0.31 },
        'EUR': { 'SAR': 4.08, 'USD': 1.09, 'KWD': 0.33 }
      };

      if (!rates[fromCurrency]) {
        throw new Error(`Unsupported source currency: ${fromCurrency}`);
      }

      if (!rates[fromCurrency][toCurrency]) {
        throw new Error(`Unsupported conversion: ${fromCurrency} to ${toCurrency}`);
      }

      const rate = rates[fromCurrency][toCurrency];
      const convertedAmount = amount * rate;

      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: Number(convertedAmount.toFixed(2)),
        targetCurrency: toCurrency,
        exchangeRate: rate,
        timestamp: new Date().toISOString()
      };
    }

    validateBatchPayments(payments) {
      const results = {
        valid: [],
        invalid: [],
        summary: {
          totalAmount: 0,
          currencies: new Set(),
          members: new Set()
        }
      };

      payments.forEach((payment, index) => {
        const errors = [];

        // Validate amount
        errors.push(...this.validateAmount(payment.amount));

        // Validate description
        errors.push(...this.validateDescription(payment.description));

        // Validate metadata
        errors.push(...this.validateMetadata(payment.metadata));

        // Check for required fields
        if (!payment.memberId) {
          errors.push('Member ID is required');
        }

        if (!payment.currency) {
          errors.push('Currency is required');
        }

        if (errors.length === 0) {
          results.valid.push({ index, payment });
          results.summary.totalAmount += payment.amount;
          results.summary.currencies.add(payment.currency);
          results.summary.members.add(payment.memberId);
        } else {
          results.invalid.push({ index, payment, errors });
        }
      });

      results.summary.currencies = Array.from(results.summary.currencies);
      results.summary.members = Array.from(results.summary.members);
      results.summary.validCount = results.valid.length;
      results.summary.invalidCount = results.invalid.length;

      return results;
    }
  }

  describe('Payment Validation Operations', () => {
    let validator;

    beforeEach(() => {
      validator = new PaymentValidator();
    });

    test('should validate amount edge cases correctly', () => {
      // Valid amounts
      expect(validator.validateAmount(100.50)).toEqual([]);
      expect(validator.validateAmount(0.01)).toEqual([]);
      expect(validator.validateAmount(999999.99)).toEqual([]);

      // Invalid amounts
      expect(validator.validateAmount(0)).toContain('Amount must be at least 0.01');
      expect(validator.validateAmount(-100)).toContain('Amount must be at least 0.01');
      expect(validator.validateAmount(1000000)).toContain('Amount cannot exceed 999999.99');
      expect(validator.validateAmount(100.999)).toContain('Amount can have maximum 2 decimal places');
      expect(validator.validateAmount(NaN)).toContain('Amount must be a valid finite number');
      expect(validator.validateAmount(Infinity)).toContain('Amount must be a valid finite number');
      expect(validator.validateAmount('100')).toContain('Amount must be a number');
    });

    test('should validate Arabic and special characters in description', () => {
      // Valid descriptions
      const validDescriptions = [
        'Monthly subscription payment',
        'دفعة الاشتراك الشهري', // Arabic
        'Payment for عضوية العائلة', // Mixed
        'Invoice #12345 - Special offer!',
        'Payment @ 50% discount: $100.00'
      ];

      validDescriptions.forEach(desc => {
        expect(validator.validateDescription(desc)).toEqual([]);
      });

      // Invalid descriptions
      const longDescription = 'x'.repeat(501);
      expect(validator.validateDescription(longDescription))
        .toContain('Description cannot exceed 500 characters');

      // Invalid characters
      const invalidChars = 'Payment with emoji 😊';
      expect(validator.validateDescription(invalidChars))
        .toContain('Description contains invalid characters');
    });

    test('should validate metadata constraints', () => {
      // Valid metadata
      const validMetadata = {
        orderId: 'ORD-123',
        customerId: 'CUST-456',
        notes: 'Special handling required'
      };
      expect(validator.validateMetadata(validMetadata)).toEqual([]);

      // Too many keys
      const tooManyKeys = {};
      for (let i = 0; i < 25; i++) {
        tooManyKeys[`key${i}`] = `value${i}`;
      }
      expect(validator.validateMetadata(tooManyKeys))
        .toContain('Metadata cannot have more than 20 keys');

      // Value too long
      const longValue = { note: 'x'.repeat(1001) };
      expect(validator.validateMetadata(longValue))
        .toContain("Metadata value for 'note' exceeds maximum length");

      // Null/undefined values
      const nullValues = { key1: null, key2: undefined };
      const errors = validator.validateMetadata(nullValues);
      expect(errors).toContain("Metadata value for 'key1' cannot be null or undefined");
      expect(errors).toContain("Metadata value for 'key2' cannot be null or undefined");
    });

    test('should handle currency conversion correctly', () => {
      // SAR to USD
      const sarToUsd = validator.validateCurrencyConversion(100, 'SAR', 'USD');
      expect(sarToUsd.convertedAmount).toBe(27.00);
      expect(sarToUsd.exchangeRate).toBe(0.27);

      // KWD to SAR
      const kwdToSar = validator.validateCurrencyConversion(50, 'KWD', 'SAR');
      expect(kwdToSar.convertedAmount).toBe(609.50);
      expect(kwdToSar.exchangeRate).toBe(12.19);

      // Invalid currency
      expect(() => {
        validator.validateCurrencyConversion(100, 'BTC', 'USD');
      }).toThrow('Unsupported source currency: BTC');

      expect(() => {
        validator.validateCurrencyConversion(100, 'USD', 'BTC');
      }).toThrow('Unsupported conversion: USD to BTC');
    });

    test('should validate batch payments with mixed validity', () => {
      const batch = [
        {
          memberId: 'MEM-001',
          amount: 100.50,
          currency: 'SAR',
          description: 'Valid payment'
        },
        {
          memberId: 'MEM-002',
          amount: -50, // Invalid
          currency: 'KWD',
          description: 'Invalid amount'
        },
        {
          // Missing memberId
          amount: 200,
          currency: 'USD',
          description: 'Missing member'
        },
        {
          memberId: 'MEM-003',
          amount: 150.75,
          currency: 'EUR',
          description: 'Valid payment 2',
          metadata: { invoiceId: 'INV-789' }
        }
      ];

      const results = validator.validateBatchPayments(batch);

      expect(results.valid).toHaveLength(2);
      expect(results.invalid).toHaveLength(2);
      expect(results.summary.validCount).toBe(2);
      expect(results.summary.invalidCount).toBe(2);
      expect(results.summary.totalAmount).toBe(251.25); // 100.50 + 150.75
      expect(results.summary.currencies).toEqual(['SAR', 'EUR']);
      expect(results.summary.members).toEqual(['MEM-001', 'MEM-003']);

      // Check specific errors
      expect(results.invalid[0].errors).toContain('Amount must be at least 0.01');
      expect(results.invalid[1].errors).toContain('Member ID is required');
    });
  });
});