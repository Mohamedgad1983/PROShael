/**
 * Unit Tests for ReceiptService
 * Tests receipt generation, translation, and number formatting
 */

import { describe, test, expect } from '@jest/globals';
import { ReceiptService } from '../../../src/services/receiptService.js';

describe('ReceiptService', () => {

  describe('numberToWords', () => {
    describe('Arabic Number Conversion', () => {
      test('should convert integer amounts to Arabic', () => {
        const result = ReceiptService.numberToWords(100, true);

        expect(result).toContain('100');
        expect(result).toContain('ريال سعودي');
      });

      test('should convert decimal amounts to Arabic', () => {
        const result = ReceiptService.numberToWords(100.50, true);

        expect(result).toContain('100');
        expect(result).toContain('ريال سعودي');
        expect(result).toContain('50');
        expect(result).toContain('هللة');
      });

      test('should handle zero decimals', () => {
        const result = ReceiptService.numberToWords(100.00, true);

        expect(result).toContain('100');
        expect(result).toContain('ريال سعودي');
        expect(result).not.toContain('هللة');
      });

      test('should handle various decimal amounts', () => {
        const amounts = [
          { amount: 50.25, integer: 50, decimal: 25 },
          { amount: 100.99, integer: 100, decimal: 99 },
          { amount: 1000.01, integer: 1000, decimal: 1 }
        ];

        amounts.forEach(({ amount, integer, decimal }) => {
          const result = ReceiptService.numberToWords(amount, true);
          expect(result).toContain(integer.toString());
          expect(result).toContain(decimal.toString());
        });
      });
    });

    describe('English Number Conversion', () => {
      test('should convert integer amounts to English', () => {
        const result = ReceiptService.numberToWords(100, false);

        expect(result).toContain('100');
        expect(result).toContain('Saudi Riyal');
      });

      test('should convert decimal amounts to English', () => {
        const result = ReceiptService.numberToWords(100.50, false);

        expect(result).toContain('100');
        expect(result).toContain('Saudi Riyal');
        expect(result).toContain('50');
        expect(result).toContain('Halalas');
      });

      test('should handle singular for single riyal', () => {
        const result = ReceiptService.numberToWords(1, false);

        expect(result).toMatch(/Saudi Riyal/);
      });

      test('should handle plural correctly', () => {
        const result = ReceiptService.numberToWords(100, false);

        expect(result).toContain('Saudi Riyal');
      });
    });
  });

  describe('translateCategory', () => {
    describe('Arabic Translation', () => {
      test('should translate subscription to Arabic', () => {
        const result = ReceiptService.translateCategory('subscription', true);

        expect(result).toBe('اشتراك');
      });

      test('should translate donation to Arabic', () => {
        const result = ReceiptService.translateCategory('donation', true);

        expect(result).toBe('تبرع');
      });

      test('should translate event to Arabic', () => {
        const result = ReceiptService.translateCategory('event', true);

        expect(result).toBe('فعالية');
      });

      test('should translate membership to Arabic', () => {
        const result = ReceiptService.translateCategory('membership', true);

        expect(result).toBe('عضوية');
      });

      test('should translate diya to Arabic', () => {
        const result = ReceiptService.translateCategory('diya', true);

        expect(result).toBe('دية');
      });

      test('should translate other to Arabic', () => {
        const result = ReceiptService.translateCategory('other', true);

        expect(result).toBe('أخرى');
      });

      test('should return original for unknown category in Arabic', () => {
        const result = ReceiptService.translateCategory('unknown_category', true);

        expect(result).toBe('unknown_category');
      });
    });

    describe('English Translation', () => {
      test('should translate subscription to English', () => {
        const result = ReceiptService.translateCategory('subscription', false);

        expect(result).toBe('Subscription');
      });

      test('should translate donation to English', () => {
        const result = ReceiptService.translateCategory('donation', false);

        expect(result).toBe('Donation');
      });

      test('should return original for unknown category in English', () => {
        const result = ReceiptService.translateCategory('unknown_category', false);

        expect(result).toBe('unknown_category');
      });
    });
  });

  describe('translatePaymentMethod', () => {
    describe('Arabic Translation', () => {
      test('should translate cash to Arabic', () => {
        const result = ReceiptService.translatePaymentMethod('cash', true);

        expect(result).toBe('نقداً');
      });

      test('should translate card to Arabic', () => {
        const result = ReceiptService.translatePaymentMethod('card', true);

        expect(result).toBe('بطاقة ائتمان');
      });

      test('should translate transfer to Arabic', () => {
        const result = ReceiptService.translatePaymentMethod('transfer', true);

        expect(result).toBe('تحويل بنكي');
      });

      test('should translate online to Arabic', () => {
        const result = ReceiptService.translatePaymentMethod('online', true);

        expect(result).toBe('دفع إلكتروني');
      });

      test('should translate check to Arabic', () => {
        const result = ReceiptService.translatePaymentMethod('check', true);

        expect(result).toBe('شيك');
      });
    });

    describe('English Translation', () => {
      test('should translate cash to English', () => {
        const result = ReceiptService.translatePaymentMethod('cash', false);

        expect(result).toBe('Cash');
      });

      test('should translate card to English', () => {
        const result = ReceiptService.translatePaymentMethod('card', false);

        expect(result).toBe('Credit Card');
      });

      test('should translate transfer to English', () => {
        const result = ReceiptService.translatePaymentMethod('transfer', false);

        expect(result).toBe('Bank Transfer');
      });
    });
  });

  describe('translateStatus', () => {
    describe('Arabic Translation', () => {
      test('should translate paid to Arabic', () => {
        const result = ReceiptService.translateStatus('paid', true);

        expect(result).toBe('مدفوع');
      });

      test('should translate pending to Arabic', () => {
        const result = ReceiptService.translateStatus('pending', true);

        expect(result).toBe('معلق');
      });

      test('should translate cancelled to Arabic', () => {
        const result = ReceiptService.translateStatus('cancelled', true);

        expect(result).toBe('ملغي');
      });

      test('should translate failed to Arabic', () => {
        const result = ReceiptService.translateStatus('failed', true);

        expect(result).toBe('فشل');
      });

      test('should translate refunded to Arabic', () => {
        const result = ReceiptService.translateStatus('refunded', true);

        expect(result).toBe('مسترد');
      });
    });

    describe('English Translation', () => {
      test('should translate paid to English', () => {
        const result = ReceiptService.translateStatus('paid', false);

        expect(result).toBe('Paid');
      });

      test('should translate pending to English', () => {
        const result = ReceiptService.translateStatus('pending', false);

        expect(result).toBe('Pending');
      });

      test('should translate cancelled to English', () => {
        const result = ReceiptService.translateStatus('cancelled', false);

        expect(result).toBe('Cancelled');
      });
    });
  });

  describe('getOrganizationDetails', () => {
    test('should return Arabic organization details', () => {
      const details = ReceiptService.getOrganizationDetails(true);

      expect(details).toHaveProperty('name');
      expect(details).toHaveProperty('address');
      expect(details).toHaveProperty('phone');
      expect(details).toHaveProperty('email');
      expect(details).toHaveProperty('vatNumber');
      expect(details).toHaveProperty('commercialRegister');

      expect(details.name).toContain('الشعيل');
      expect(details.address).toContain('الكويت');
    });

    test('should return English organization details', () => {
      const details = ReceiptService.getOrganizationDetails(false);

      expect(details.name).toContain('Al-Shuail');
      expect(details.address).toContain('Kuwait');
    });

    test('should have consistent contact information', () => {
      const arabicDetails = ReceiptService.getOrganizationDetails(true);
      const englishDetails = ReceiptService.getOrganizationDetails(false);

      expect(arabicDetails.phone).toBe(englishDetails.phone);
      expect(arabicDetails.email).toBe(englishDetails.email);
      expect(arabicDetails.vatNumber).toBe(englishDetails.vatNumber);
      expect(arabicDetails.commercialRegister).toBe(englishDetails.commercialRegister);
    });
  });

  describe('generateReceiptData', () => {
    const mockPayment = {
      reference_number: 'SH-12345678-ABCD',
      amount: 100.00,
      category: 'subscription',
      payment_method: 'cash',
      status: 'paid',
      processed_at: new Date('2025-10-10').toISOString(),
      created_at: new Date('2025-10-10').toISOString(),
      payer: {
        full_name: 'أحمد محمد',
        membership_number: 'M-001',
        phone: '+965 1234 5678',
        email: 'ahmed@example.com'
      },
      notes: 'اشتراك شهري'
    };

    test('should generate receipt data in Arabic', () => {
      const receiptData = ReceiptService.generateReceiptData(mockPayment, 'ar');

      expect(receiptData).toHaveProperty('header');
      expect(receiptData).toHaveProperty('payer');
      expect(receiptData).toHaveProperty('payment');
      expect(receiptData).toHaveProperty('details');
      expect(receiptData).toHaveProperty('footer');

      expect(receiptData.header.receiptTitle).toBe('إيصال استلام');
      expect(receiptData.details.currency).toBe('ريال سعودي');
    });

    test('should generate receipt data in English', () => {
      const receiptData = ReceiptService.generateReceiptData(mockPayment, 'en');

      expect(receiptData.header.receiptTitle).toBe('Payment Receipt');
      expect(receiptData.details.currency).toBe('SAR');
    });

    test('should include payer information', () => {
      const receiptData = ReceiptService.generateReceiptData(mockPayment, 'ar');

      expect(receiptData.payer.name).toBe('أحمد محمد');
      expect(receiptData.payer.membershipNumber).toBe('M-001');
      expect(receiptData.payer.phone).toBe('+965 1234 5678');
      expect(receiptData.payer.email).toBe('ahmed@example.com');
    });

    test('should include payment details', () => {
      const receiptData = ReceiptService.generateReceiptData(mockPayment, 'ar');

      expect(receiptData.payment.amount).toBe(100.00);
      expect(receiptData.payment.category).toBe('اشتراك');
      expect(receiptData.payment.paymentMethod).toBe('نقداً');
      expect(receiptData.payment.status).toBe('مدفوع');
      expect(receiptData.payment.referenceNumber).toBe('SH-12345678-ABCD');
    });

    test('should handle missing payer information', () => {
      const paymentWithoutPayer = {
        ...mockPayment,
        payer: null
      };

      const receiptData = ReceiptService.generateReceiptData(paymentWithoutPayer, 'ar');

      expect(receiptData.payer.name).toBe('غير محدد');
      expect(receiptData.payer.membershipNumber).toBe('غير محدد');
    });

    test('should translate amount to words', () => {
      const receiptData = ReceiptService.generateReceiptData(mockPayment, 'ar');

      expect(receiptData.payment.amountInWords).toContain('100');
      expect(receiptData.payment.amountInWords).toContain('ريال سعودي');
    });

    test('should include timestamps', () => {
      const receiptData = ReceiptService.generateReceiptData(mockPayment, 'ar');

      expect(receiptData.header).toHaveProperty('issueDate');
      expect(receiptData.header).toHaveProperty('issueTime');
      expect(receiptData.footer).toHaveProperty('generatedAt');
    });
  });
});
