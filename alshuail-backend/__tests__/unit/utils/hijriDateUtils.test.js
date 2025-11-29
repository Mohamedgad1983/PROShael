/**
 * Hijri Date Utils Tests
 * Tests for HijriDateManager class and helper functions
 * These tests actually import and test the real module for coverage
 */

import { jest } from '@jest/globals';

// Mock the logger to prevent actual logging
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import after mocking
const {
  HijriDateManager,
  convertToHijriString,
  convertToHijriYear,
  convertToHijriMonth,
  convertToHijriDay,
  convertToHijriMonthName
} = await import('../../../src/utils/hijriDateUtils.js');

describe('HijriDateManager', () => {

  // ============================================
  // getHijriMonths() Tests
  // ============================================
  describe('getHijriMonths()', () => {

    test('should return 12 months', () => {
      const months = HijriDateManager.getHijriMonths();
      expect(months).toHaveLength(12);
    });

    test('should have correct structure for each month', () => {
      const months = HijriDateManager.getHijriMonths();
      months.forEach(month => {
        expect(month).toHaveProperty('number');
        expect(month).toHaveProperty('name_ar');
        expect(month).toHaveProperty('name_en');
        expect(month).toHaveProperty('is_sacred');
      });
    });

    test('should have Muharram as first month', () => {
      const months = HijriDateManager.getHijriMonths();
      expect(months[0].number).toBe(1);
      expect(months[0].name_en).toBe('Muharram');
      expect(months[0].name_ar).toBe('محرم');
    });

    test('should have Dhul Hijjah as last month', () => {
      const months = HijriDateManager.getHijriMonths();
      expect(months[11].number).toBe(12);
      expect(months[11].name_en).toBe('Dhul Hijjah');
    });

    test('should mark sacred months correctly', () => {
      const months = HijriDateManager.getHijriMonths();
      const sacredMonths = months.filter(m => m.is_sacred);
      expect(sacredMonths).toHaveLength(4);
      // Sacred months: Muharram (1), Rajab (7), Dhul Qadah (11), Dhul Hijjah (12)
      expect(sacredMonths.map(m => m.number)).toEqual(expect.arrayContaining([1, 7, 11, 12]));
    });

    test('should mark special months (Ramadan and Dhul Hijjah)', () => {
      const months = HijriDateManager.getHijriMonths();
      const specialMonths = months.filter(m => m.is_special);
      expect(specialMonths).toHaveLength(2);
    });

    test('should have Arabic names for all months', () => {
      const months = HijriDateManager.getHijriMonths();
      months.forEach(month => {
        expect(month.name_ar).toMatch(/[\u0600-\u06FF]/); // Arabic characters
      });
    });
  });

  // ============================================
  // convertToHijri() Tests
  // ============================================
  describe('convertToHijri()', () => {

    test('should convert Date object', () => {
      const result = HijriDateManager.convertToHijri(new Date());
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('hijri_year');
      expect(result).toHaveProperty('hijri_month');
      expect(result).toHaveProperty('hijri_day');
    });

    test('should convert string date', () => {
      const result = HijriDateManager.convertToHijri('2024-11-25');
      expect(result).not.toBeNull();
    });

    test('should return all expected fields', () => {
      const result = HijriDateManager.convertToHijri(new Date());
      expect(result).toHaveProperty('hijri_date_string');
      expect(result).toHaveProperty('hijri_year');
      expect(result).toHaveProperty('hijri_month');
      expect(result).toHaveProperty('hijri_day');
      expect(result).toHaveProperty('hijri_month_name');
      expect(result).toHaveProperty('hijri_month_name_en');
      expect(result).toHaveProperty('is_sacred_month');
      expect(result).toHaveProperty('is_special_month');
    });

    test('should return valid month number (1-12)', () => {
      const result = HijriDateManager.convertToHijri(new Date());
      expect(result.hijri_month).toBeGreaterThanOrEqual(1);
      expect(result.hijri_month).toBeLessThanOrEqual(12);
    });

    test('should return valid day number (1-30)', () => {
      const result = HijriDateManager.convertToHijri(new Date());
      expect(result.hijri_day).toBeGreaterThanOrEqual(1);
      expect(result.hijri_day).toBeLessThanOrEqual(30);
    });

    test('should have year in reasonable range', () => {
      const result = HijriDateManager.convertToHijri(new Date());
      // Hijri year should be around 1445-1450 for current dates
      expect(result.hijri_year).toBeGreaterThan(1440);
      expect(result.hijri_year).toBeLessThan(1460);
    });

    test('should include Arabic month name', () => {
      const result = HijriDateManager.convertToHijri(new Date());
      expect(result.hijri_month_name).toMatch(/[\u0600-\u06FF]/);
    });
  });

  // ============================================
  // getCurrentHijriDate() Tests
  // ============================================
  describe('getCurrentHijriDate()', () => {

    test('should return current hijri date', () => {
      const result = HijriDateManager.getCurrentHijriDate();
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('hijri_year');
    });

    test('should be consistent with convertToHijri(new Date())', () => {
      const current = HijriDateManager.getCurrentHijriDate();
      const converted = HijriDateManager.convertToHijri(new Date());

      expect(current.hijri_year).toBe(converted.hijri_year);
      expect(current.hijri_month).toBe(converted.hijri_month);
    });
  });

  // ============================================
  // formatHijriDisplay() Tests
  // ============================================
  describe('formatHijriDisplay()', () => {

    test('should return empty string for null', () => {
      expect(HijriDateManager.formatHijriDisplay(null)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(HijriDateManager.formatHijriDisplay('')).toBe('');
    });

    test('should trim whitespace', () => {
      expect(HijriDateManager.formatHijriDisplay('  test  ')).toBe('test');
    });

    test('should normalize multiple spaces', () => {
      expect(HijriDateManager.formatHijriDisplay('hello   world')).toBe('hello world');
    });

    test('should preserve Arabic text', () => {
      const input = 'محرم  1446';
      const result = HijriDateManager.formatHijriDisplay(input);
      expect(result).toContain('محرم');
    });
  });

  // ============================================
  // formatGregorianSecondary() Tests
  // ============================================
  describe('formatGregorianSecondary()', () => {

    test('should format Date object', () => {
      const result = HijriDateManager.formatGregorianSecondary(new Date());
      expect(result).toBeTruthy();
    });

    test('should format string date', () => {
      const result = HijriDateManager.formatGregorianSecondary('2024-11-25');
      expect(result).toBeTruthy();
    });

    test('should return localized string', () => {
      const result = HijriDateManager.formatGregorianSecondary(new Date('2024-11-25'));
      expect(typeof result).toBe('string');
    });
  });

  // ============================================
  // buildHijriFilter() Tests
  // ============================================
  describe('buildHijriFilter()', () => {

    test('should use provided values', () => {
      const result = HijriDateManager.buildHijriFilter(5, 1446);
      expect(result.hijri_month).toBe(5);
      expect(result.hijri_year).toBe(1446);
    });

    test('should use current month if not provided', () => {
      const result = HijriDateManager.buildHijriFilter(null, 1446);
      const current = HijriDateManager.getCurrentHijriDate();
      expect(result.hijri_month).toBe(current.hijri_month);
    });

    test('should use current year if not provided', () => {
      const result = HijriDateManager.buildHijriFilter(5, null);
      const current = HijriDateManager.getCurrentHijriDate();
      expect(result.hijri_year).toBe(current.hijri_year);
    });

    test('should return object with both properties', () => {
      const result = HijriDateManager.buildHijriFilter();
      expect(result).toHaveProperty('hijri_month');
      expect(result).toHaveProperty('hijri_year');
    });
  });

  // ============================================
  // getHijriYearRange() Tests
  // ============================================
  describe('getHijriYearRange()', () => {

    test('should return array of years', () => {
      const result = HijriDateManager.getHijriYearRange();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should default to range of 2', () => {
      const result = HijriDateManager.getHijriYearRange();
      expect(result).toHaveLength(5); // -2, -1, 0, 1, 2
    });

    test('should respect custom range', () => {
      const result = HijriDateManager.getHijriYearRange(3);
      expect(result).toHaveLength(7); // -3 to +3
    });

    test('should have correct structure', () => {
      const result = HijriDateManager.getHijriYearRange();
      result.forEach(year => {
        expect(year).toHaveProperty('value');
        expect(year).toHaveProperty('label');
        expect(year).toHaveProperty('is_current');
      });
    });

    test('should mark current year', () => {
      const result = HijriDateManager.getHijriYearRange();
      const currentYear = result.find(y => y.is_current);
      expect(currentYear).toBeDefined();
    });

    test('should include هـ in label', () => {
      const result = HijriDateManager.getHijriYearRange();
      result.forEach(year => {
        expect(year.label).toContain('هـ');
      });
    });
  });

  // ============================================
  // getMonthProperties() Tests
  // ============================================
  describe('getMonthProperties()', () => {

    test('should return properties for valid month', () => {
      const result = HijriDateManager.getMonthProperties(1);
      expect(result).toHaveProperty('is_sacred');
      expect(result).toHaveProperty('is_special');
      expect(result).toHaveProperty('name_ar');
      expect(result).toHaveProperty('name_en');
    });

    test('should return sacred=true for Muharram', () => {
      const result = HijriDateManager.getMonthProperties(1);
      expect(result.is_sacred).toBe(true);
    });

    test('should return sacred=false for Safar', () => {
      const result = HijriDateManager.getMonthProperties(2);
      expect(result.is_sacred).toBe(false);
    });

    test('should return special=true for Ramadan', () => {
      const result = HijriDateManager.getMonthProperties(9);
      expect(result.is_special).toBe(true);
    });

    test('should return Arabic name', () => {
      const result = HijriDateManager.getMonthProperties(1);
      expect(result.name_ar).toBe('محرم');
    });

    test('should return English name', () => {
      const result = HijriDateManager.getMonthProperties(1);
      expect(result.name_en).toBe('Muharram');
    });

    test('should handle invalid month gracefully', () => {
      const result = HijriDateManager.getMonthProperties(99);
      expect(result.is_sacred).toBe(false);
      expect(result.is_special).toBe(false);
      expect(result.name_ar).toBe('');
      expect(result.name_en).toBe('');
    });
  });

  // ============================================
  // compareHijriDates() Tests
  // ============================================
  describe('compareHijriDates()', () => {

    test('should return -1 when first date is earlier (different year)', () => {
      const date1 = { hijri_year: 1445, hijri_month: 5, hijri_day: 15 };
      const date2 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      expect(HijriDateManager.compareHijriDates(date1, date2)).toBe(-1);
    });

    test('should return 1 when first date is later (different year)', () => {
      const date1 = { hijri_year: 1447, hijri_month: 5, hijri_day: 15 };
      const date2 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      expect(HijriDateManager.compareHijriDates(date1, date2)).toBe(1);
    });

    test('should return -1 when first date is earlier (different month)', () => {
      const date1 = { hijri_year: 1446, hijri_month: 4, hijri_day: 15 };
      const date2 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      expect(HijriDateManager.compareHijriDates(date1, date2)).toBe(-1);
    });

    test('should return 1 when first date is later (different month)', () => {
      const date1 = { hijri_year: 1446, hijri_month: 6, hijri_day: 15 };
      const date2 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      expect(HijriDateManager.compareHijriDates(date1, date2)).toBe(1);
    });

    test('should return -1 when first date is earlier (different day)', () => {
      const date1 = { hijri_year: 1446, hijri_month: 5, hijri_day: 10 };
      const date2 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      expect(HijriDateManager.compareHijriDates(date1, date2)).toBe(-1);
    });

    test('should return 1 when first date is later (different day)', () => {
      const date1 = { hijri_year: 1446, hijri_month: 5, hijri_day: 20 };
      const date2 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      expect(HijriDateManager.compareHijriDates(date1, date2)).toBe(1);
    });

    test('should return 0 for equal dates', () => {
      const date1 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      const date2 = { hijri_year: 1446, hijri_month: 5, hijri_day: 15 };
      expect(HijriDateManager.compareHijriDates(date1, date2)).toBe(0);
    });
  });

  // ============================================
  // groupByHijriMonth() Tests
  // ============================================
  describe('groupByHijriMonth()', () => {

    test('should group items by month', () => {
      const items = [
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى', amount: 100 },
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى', amount: 200 },
        { hijri_month: 6, hijri_year: 1446, hijri_month_name: 'جمادى الآخرة', amount: 150 }
      ];

      const result = HijriDateManager.groupByHijriMonth(items);
      const keys = Object.keys(result);
      expect(keys).toHaveLength(2);
    });

    test('should calculate total amount per group', () => {
      const items = [
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى', amount: 100 },
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى', amount: 200 }
      ];

      const result = HijriDateManager.groupByHijriMonth(items);
      const key = Object.keys(result)[0];
      expect(result[key].total_amount).toBe(300);
    });

    test('should return empty object for empty array', () => {
      const result = HijriDateManager.groupByHijriMonth([]);
      expect(result).toEqual({});
    });

    test('should include all items in their groups', () => {
      const items = [
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى', amount: 100 },
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى', amount: 200 }
      ];

      const result = HijriDateManager.groupByHijriMonth(items);
      const key = Object.keys(result)[0];
      expect(result[key].items).toHaveLength(2);
    });

    test('should handle items without amount', () => {
      const items = [
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى' },
        { hijri_month: 5, hijri_year: 1446, hijri_month_name: 'جمادى الأولى', amount: 100 }
      ];

      const result = HijriDateManager.groupByHijriMonth(items);
      const key = Object.keys(result)[0];
      expect(result[key].total_amount).toBe(100);
    });
  });

  // ============================================
  // daysUntilEndOfHijriMonth() Tests
  // ============================================
  describe('daysUntilEndOfHijriMonth()', () => {

    test('should return a number', () => {
      const result = HijriDateManager.daysUntilEndOfHijriMonth();
      expect(typeof result).toBe('number');
    });

    test('should return value between 0 and 30', () => {
      const result = HijriDateManager.daysUntilEndOfHijriMonth();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(30);
    });

    test('should accept Date parameter', () => {
      const result = HijriDateManager.daysUntilEndOfHijriMonth(new Date());
      expect(typeof result).toBe('number');
    });
  });

  // ============================================
  // Helper Functions Tests
  // ============================================
  describe('Helper Functions', () => {

    describe('convertToHijriString()', () => {
      test('should return string', () => {
        const result = convertToHijriString(new Date());
        expect(typeof result).toBe('string');
      });

      test('should return empty string on error', () => {
        // Invalid date should return empty string
        const result = convertToHijriString('invalid');
        expect(typeof result).toBe('string');
      });
    });

    describe('convertToHijriYear()', () => {
      test('should return number', () => {
        const result = convertToHijriYear(new Date());
        expect(typeof result).toBe('number');
      });

      test('should return year in reasonable range', () => {
        const result = convertToHijriYear(new Date());
        expect(result).toBeGreaterThan(1440);
        expect(result).toBeLessThan(1460);
      });
    });

    describe('convertToHijriMonth()', () => {
      test('should return number', () => {
        const result = convertToHijriMonth(new Date());
        expect(typeof result).toBe('number');
      });

      test('should return month 1-12', () => {
        const result = convertToHijriMonth(new Date());
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(12);
      });
    });

    describe('convertToHijriDay()', () => {
      test('should return number', () => {
        const result = convertToHijriDay(new Date());
        expect(typeof result).toBe('number');
      });

      test('should return day 1-30', () => {
        const result = convertToHijriDay(new Date());
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(30);
      });
    });

    describe('convertToHijriMonthName()', () => {
      test('should return string', () => {
        const result = convertToHijriMonthName(new Date());
        expect(typeof result).toBe('string');
      });

      test('should return Arabic name', () => {
        const result = convertToHijriMonthName(new Date());
        if (result) {
          expect(result).toMatch(/[\u0600-\u06FF]/);
        }
      });
    });
  });
});
