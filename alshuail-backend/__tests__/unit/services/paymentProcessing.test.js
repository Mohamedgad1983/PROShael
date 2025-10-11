/**
 * Unit Tests for PaymentProcessingService
 * Tests critical business logic: validation, amount checking, reference generation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PaymentProcessingService } from '../../../src/services/paymentProcessingService.js';

describe('PaymentProcessingService', () => {

  describe('generateReferenceNumber', () => {
    test('should generate reference number with SH prefix', () => {
      const refNumber = PaymentProcessingService.generateReferenceNumber();

      expect(refNumber).toMatch(/^SH-\d{8}-[A-Z0-9]{4}$/);
      expect(refNumber).toContain('SH-');
    });

    test('should generate unique reference numbers', () => {
      const ref1 = PaymentProcessingService.generateReferenceNumber();
      const ref2 = PaymentProcessingService.generateReferenceNumber();

      expect(ref1).not.toBe(ref2);
    });

    test('should include timestamp in reference number', () => {
      const refNumber = PaymentProcessingService.generateReferenceNumber();
      const parts = refNumber.split('-');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('SH');
      expect(parts[1]).toHaveLength(8); // Timestamp part
      expect(parts[2]).toHaveLength(4); // Random part
    });
  });

  describe('validatePaymentAmount', () => {

    describe('Basic Validation', () => {
      test('should accept valid positive amounts', () => {
        const result = PaymentProcessingService.validatePaymentAmount(100, 'donation');

        expect(result.isValid).toBe(true);
        expect(result.message).toBe('المبلغ صالح');
      });

      test('should reject zero amount', () => {
        const result = PaymentProcessingService.validatePaymentAmount(0, 'donation');

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('موجب');
      });

      test('should reject negative amounts', () => {
        const result = PaymentProcessingService.validatePaymentAmount(-100, 'donation');

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('موجب');
      });

      test('should reject non-numeric amounts', () => {
        const result = PaymentProcessingService.validatePaymentAmount('abc', 'donation');

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('موجب');
      });

      test('should reject amounts exceeding maximum (100,000 SAR)', () => {
        const result = PaymentProcessingService.validatePaymentAmount(100001, 'donation');

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('100,000');
      });

      test('should accept maximum amount (100,000 SAR)', () => {
        const result = PaymentProcessingService.validatePaymentAmount(100000, 'donation');

        expect(result.isValid).toBe(true);
      });
    });

    describe('Subscription Category Validation', () => {
      test('should accept minimum subscription amount (50 SAR)', () => {
        const result = PaymentProcessingService.validatePaymentAmount(50, 'subscription');

        expect(result.isValid).toBe(true);
        expect(result.message).toBe('المبلغ صالح');
      });

      test('should reject subscription below minimum (50 SAR)', () => {
        const result = PaymentProcessingService.validatePaymentAmount(49, 'subscription');

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('50');
      });

      test('should accept subscription multiples of 50', () => {
        const amounts = [50, 100, 150, 200, 500, 1000];

        amounts.forEach(amount => {
          const result = PaymentProcessingService.validatePaymentAmount(amount, 'subscription');
          expect(result.isValid).toBe(true);
        });
      });

      test('should reject subscription not multiple of 50', () => {
        const amounts = [51, 75, 125, 175];

        amounts.forEach(amount => {
          const result = PaymentProcessingService.validatePaymentAmount(amount, 'subscription');
          expect(result.isValid).toBe(false);
          expect(result.message).toContain('مضاعفات');
        });
      });

      test('should handle decimal subscriptions correctly', () => {
        const result = PaymentProcessingService.validatePaymentAmount(50.5, 'subscription');

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('مضاعفات');
      });
    });

    describe('Event Category Validation', () => {
      test('should accept minimum event amount (10 SAR)', () => {
        const result = PaymentProcessingService.validatePaymentAmount(10, 'event');

        expect(result.isValid).toBe(true);
      });

      test('should reject event below minimum (10 SAR)', () => {
        const result = PaymentProcessingService.validatePaymentAmount(9, 'event');

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('10');
      });

      test('should accept various event amounts', () => {
        const amounts = [10, 15, 25, 50, 100];

        amounts.forEach(amount => {
          const result = PaymentProcessingService.validatePaymentAmount(amount, 'event');
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('Other Categories', () => {
      test('should accept any valid amount for donation category', () => {
        const amounts = [1, 5, 10, 50, 100, 1000];

        amounts.forEach(amount => {
          const result = PaymentProcessingService.validatePaymentAmount(amount, 'donation');
          expect(result.isValid).toBe(true);
        });
      });

      test('should accept any valid amount for membership category', () => {
        const result = PaymentProcessingService.validatePaymentAmount(75, 'membership');

        expect(result.isValid).toBe(true);
      });

      test('should accept any valid amount for diya category', () => {
        const result = PaymentProcessingService.validatePaymentAmount(5000, 'diya');

        expect(result.isValid).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      test('should handle string numbers correctly', () => {
        const result = PaymentProcessingService.validatePaymentAmount('100', 'donation');

        expect(result.isValid).toBe(true);
      });

      test('should handle decimal amounts', () => {
        const result = PaymentProcessingService.validatePaymentAmount(99.99, 'donation');

        expect(result.isValid).toBe(true);
      });

      test('should return error for validation exception', () => {
        const result = PaymentProcessingService.validatePaymentAmount(undefined, 'donation');

        expect(result.isValid).toBe(false);
        expect(result.message).toBeTruthy(); // Should have an error message
      });
    });
  });

  describe('sanitizeDescription', () => {
    test('should remove HTML tags', () => {
      const input = '<p>This is a <strong>test</strong></p>';
      const result = PaymentProcessingService.sanitizeDescription(input);

      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
      expect(result).toBe('This is a test');
    });

    test('should remove script tags and content', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      const result = PaymentProcessingService.sanitizeDescription(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toBe('Hello  World');
    });

    test('should remove dangerous characters', () => {
      const input = "Test <>&'\" characters";
      const result = PaymentProcessingService.sanitizeDescription(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('&');
      expect(result).not.toContain("'");
      expect(result).not.toContain('"');
    });

    test('should trim whitespace', () => {
      const input = '   Test description   ';
      const result = PaymentProcessingService.sanitizeDescription(input);

      expect(result).toBe('Test description');
    });

    test('should limit length to 500 characters', () => {
      const input = 'a'.repeat(600);
      const result = PaymentProcessingService.sanitizeDescription(input);

      expect(result.length).toBe(500);
    });

    test('should return empty string for null/undefined', () => {
      expect(PaymentProcessingService.sanitizeDescription(null)).toBe('');
      expect(PaymentProcessingService.sanitizeDescription(undefined)).toBe('');
      expect(PaymentProcessingService.sanitizeDescription('')).toBe('');
    });

    test('should preserve Arabic text', () => {
      const input = 'دفع اشتراك شهري';
      const result = PaymentProcessingService.sanitizeDescription(input);

      expect(result).toBe('دفع اشتراك شهري');
    });

    test('should handle mixed Arabic and English', () => {
      const input = 'Payment دفع for subscription اشتراك';
      const result = PaymentProcessingService.sanitizeDescription(input);

      expect(result).toContain('Payment');
      expect(result).toContain('دفع');
      expect(result).toContain('subscription');
      expect(result).toContain('اشتراك');
    });
  });

  describe('Integration Scenarios', () => {
    test('should validate complete payment workflow', () => {
      // Generate reference
      const refNumber = PaymentProcessingService.generateReferenceNumber();
      expect(refNumber).toMatch(/^SH-/);

      // Validate amount
      const validation = PaymentProcessingService.validatePaymentAmount(100, 'subscription');
      expect(validation.isValid).toBe(true);

      // Sanitize description
      const description = PaymentProcessingService.sanitizeDescription('Monthly <b>subscription</b>');
      expect(description).toBe('Monthly subscription');
    });

    test('should handle subscription calculation correctly', () => {
      // 50 SAR = 1 month, 100 SAR = 2 months, etc.
      const amounts = [
        { amount: 50, months: 1 },
        { amount: 100, months: 2 },
        { amount: 150, months: 3 },
        { amount: 500, months: 10 },
        { amount: 600, months: 12 }
      ];

      amounts.forEach(({ amount, months }) => {
        const validation = PaymentProcessingService.validatePaymentAmount(amount, 'subscription');
        expect(validation.isValid).toBe(true);

        // Calculate months (50 SAR per month)
        const calculatedMonths = Math.floor(amount / 50);
        expect(calculatedMonths).toBe(months);
      });
    });
  });
});
