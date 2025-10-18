/**
 * Currency Handling Tests
 * Phase 2: Payment Processing Testing - Currency Operations (2 tests)
 */

import { jest } from '@jest/globals';

describe('Currency Handling Tests', () => {
  class CurrencyHandler {
    constructor() {
      this.supportedCurrencies = ['SAR', 'KWD', 'USD', 'EUR'];
      this.baseCurrency = 'SAR';
      this.exchangeRates = {
        'SAR': 1.00,
        'KWD': 0.082,
        'USD': 0.27,
        'EUR': 0.25
      };
      this.currencyFormats = {
        'SAR': { symbol: 'ر.س', decimals: 2, position: 'suffix' },
        'KWD': { symbol: 'د.ك', decimals: 3, position: 'suffix' },
        'USD': { symbol: '$', decimals: 2, position: 'prefix' },
        'EUR': { symbol: '€', decimals: 2, position: 'prefix' }
      };
    }

    formatCurrency(amount, currency) {
      if (!this.supportedCurrencies.includes(currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      const format = this.currencyFormats[currency];
      const formatted = amount.toFixed(format.decimals);

      if (format.position === 'prefix') {
        return `${format.symbol}${formatted}`;
      } else {
        return `${formatted} ${format.symbol}`;
      }
    }

    convertToBaseCurrency(amount, fromCurrency) {
      if (!this.supportedCurrencies.includes(fromCurrency)) {
        throw new Error(`Unsupported currency: ${fromCurrency}`);
      }

      if (fromCurrency === this.baseCurrency) {
        return amount;
      }

      const rate = this.exchangeRates[fromCurrency];
      return Number((amount / rate).toFixed(2));
    }

    normalizeMultiCurrencyPayments(payments) {
      const normalized = {
        payments: [],
        totals: {},
        baseCurrencyTotal: 0
      };

      payments.forEach(payment => {
        const baseAmount = this.convertToBaseCurrency(payment.amount, payment.currency);

        const normalizedPayment = {
          ...payment,
          originalAmount: payment.amount,
          originalCurrency: payment.currency,
          baseAmount: baseAmount,
          baseCurrency: this.baseCurrency
        };

        normalized.payments.push(normalizedPayment);

        // Track totals by currency
        if (!normalized.totals[payment.currency]) {
          normalized.totals[payment.currency] = {
            count: 0,
            originalTotal: 0,
            baseTotal: 0
          };
        }

        normalized.totals[payment.currency].count++;
        normalized.totals[payment.currency].originalTotal += payment.amount;
        normalized.totals[payment.currency].baseTotal += baseAmount;

        normalized.baseCurrencyTotal += baseAmount;
      });

      // Round totals
      Object.keys(normalized.totals).forEach(currency => {
        normalized.totals[currency].originalTotal =
          Number(normalized.totals[currency].originalTotal.toFixed(2));
        normalized.totals[currency].baseTotal =
          Number(normalized.totals[currency].baseTotal.toFixed(2));
      });

      normalized.baseCurrencyTotal = Number(normalized.baseCurrencyTotal.toFixed(2));

      return normalized;
    }
  }

  describe('Currency Operations', () => {
    let handler;

    beforeEach(() => {
      handler = new CurrencyHandler();
    });

    test('should format currencies correctly with proper symbols', () => {
      // SAR - Saudi Riyal (suffix)
      expect(handler.formatCurrency(1234.50, 'SAR')).toBe('1234.50 ر.س');

      // KWD - Kuwaiti Dinar (suffix, 3 decimals)
      expect(handler.formatCurrency(456.789, 'KWD')).toBe('456.789 د.ك');
      expect(handler.formatCurrency(456.1, 'KWD')).toBe('456.100 د.ك');

      // USD - US Dollar (prefix)
      expect(handler.formatCurrency(999.99, 'USD')).toBe('$999.99');

      // EUR - Euro (prefix)
      expect(handler.formatCurrency(750.00, 'EUR')).toBe('€750.00');

      // Unsupported currency
      expect(() => {
        handler.formatCurrency(100, 'GBP');
      }).toThrow('Unsupported currency: GBP');
    });

    test('should normalize multi-currency payments to base currency', () => {
      const payments = [
        { id: 'PAY-001', amount: 100, currency: 'SAR', memberId: 'MEM-001' },
        { id: 'PAY-002', amount: 50, currency: 'KWD', memberId: 'MEM-002' },
        { id: 'PAY-003', amount: 200, currency: 'USD', memberId: 'MEM-003' },
        { id: 'PAY-004', amount: 150, currency: 'EUR', memberId: 'MEM-004' },
        { id: 'PAY-005', amount: 75, currency: 'SAR', memberId: 'MEM-005' }
      ];

      const normalized = handler.normalizeMultiCurrencyPayments(payments);

      // Check individual conversions
      expect(normalized.payments[0].baseAmount).toBe(100); // SAR to SAR
      expect(normalized.payments[1].baseAmount).toBe(609.76); // 50 KWD to SAR
      expect(normalized.payments[2].baseAmount).toBe(740.74); // 200 USD to SAR
      expect(normalized.payments[3].baseAmount).toBe(600.00); // 150 EUR to SAR

      // Check totals
      expect(normalized.totals.SAR.count).toBe(2);
      expect(normalized.totals.SAR.originalTotal).toBe(175); // 100 + 75
      expect(normalized.totals.SAR.baseTotal).toBe(175);

      expect(normalized.totals.KWD.count).toBe(1);
      expect(normalized.totals.KWD.originalTotal).toBe(50);
      expect(normalized.totals.KWD.baseTotal).toBe(609.76);

      expect(normalized.totals.USD.count).toBe(1);
      expect(normalized.totals.USD.originalTotal).toBe(200);
      expect(normalized.totals.USD.baseTotal).toBe(740.74);

      expect(normalized.totals.EUR.count).toBe(1);
      expect(normalized.totals.EUR.originalTotal).toBe(150);
      expect(normalized.totals.EUR.baseTotal).toBe(600.00);

      // Check grand total in base currency
      expect(normalized.baseCurrencyTotal).toBe(2125.50);
    });
  });
});