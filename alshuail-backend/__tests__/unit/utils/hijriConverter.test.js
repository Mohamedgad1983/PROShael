/**
 * Hijri Converter Utilities Unit Tests
 * Tests conversion between Gregorian and Hijri dates
 */

import { jest } from '@jest/globals';

// Import the actual module
const {
  gregorianToHijri,
  hijriToGregorian,
  getCurrentDates,
  formatHijriDateArabic,
  isValidHijriDate,
  getHijriMonthNames,
  convertDateRange
} = await import('../../../src/utils/hijriConverter.js');

describe('Hijri Converter Utilities', () => {
  describe('gregorianToHijri()', () => {
    test('should convert Date object to Hijri string', () => {
      const gregorian = new Date('2024-01-15');
      const result = gregorianToHijri(gregorian);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should convert string date to Hijri', () => {
      const result = gregorianToHijri('2024-06-15');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return null for null input', () => {
      expect(gregorianToHijri(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(gregorianToHijri(undefined)).toBeNull();
    });

    test('should return null for invalid date', () => {
      expect(gregorianToHijri('not-a-date')).toBeNull();
    });

    test('should pad month and day with zeros', () => {
      const result = gregorianToHijri(new Date('2024-01-05'));
      const parts = result.split('-');
      expect(parts[1]).toHaveLength(2);
      expect(parts[2]).toHaveLength(2);
    });

    test('should handle different years', () => {
      const result2020 = gregorianToHijri('2020-01-01');
      const result2024 = gregorianToHijri('2024-01-01');
      expect(result2020).not.toBe(result2024);
    });
  });

  describe('hijriToGregorian()', () => {
    test('should convert Hijri string to Date', () => {
      const result = hijriToGregorian('1445-06-15');
      expect(result instanceof Date).toBe(true);
    });

    test('should return null for null input', () => {
      expect(hijriToGregorian(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(hijriToGregorian(undefined)).toBeNull();
    });

    test('should return null for invalid format', () => {
      expect(hijriToGregorian('invalid')).toBeNull();
    });

    test('should return null for incomplete date', () => {
      expect(hijriToGregorian('1445-06')).toBeNull();
    });

    test('should handle round-trip conversion', () => {
      const original = new Date('2024-06-15');
      const hijri = gregorianToHijri(original);
      const backToGregorian = hijriToGregorian(hijri);
      // Allow for 1 day difference due to timezone handling
      const diffDays = Math.abs(original.getTime() - backToGregorian.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThanOrEqual(1);
    });
  });

  describe('getCurrentDates()', () => {
    test('should return object with gregorian and hijri properties', () => {
      const result = getCurrentDates();
      expect(result).toHaveProperty('gregorian');
      expect(result).toHaveProperty('hijri');
    });

    test('should return Date for gregorian property', () => {
      const result = getCurrentDates();
      expect(result.gregorian instanceof Date).toBe(true);
    });

    test('should return string for hijri property', () => {
      const result = getCurrentDates();
      expect(typeof result.hijri).toBe('string');
    });

    test('should return valid Hijri format', () => {
      const result = getCurrentDates();
      expect(result.hijri).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return current date', () => {
      const now = new Date();
      const result = getCurrentDates();
      // Check that the dates are within 1 second of each other
      const diff = Math.abs(now.getTime() - result.gregorian.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('formatHijriDateArabic()', () => {
    test('should format Hijri date with Arabic month name', () => {
      const result = formatHijriDateArabic('1445-09-15');
      expect(result).toContain('رمضان');
      expect(result).toContain('15');
      expect(result).toContain('1445');
      expect(result).toContain('هـ');
    });

    test('should return empty string for null', () => {
      expect(formatHijriDateArabic(null)).toBe('');
    });

    test('should return empty string for undefined', () => {
      expect(formatHijriDateArabic(undefined)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(formatHijriDateArabic('')).toBe('');
    });

    test('should format first month correctly', () => {
      const result = formatHijriDateArabic('1445-01-01');
      expect(result).toContain('محرم');
    });

    test('should format last month correctly', () => {
      const result = formatHijriDateArabic('1445-12-15');
      expect(result).toContain('ذو الحجة');
    });

    test('should handle all 12 months', () => {
      const months = [
        'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
        'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
        'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
      ];
      for (let i = 1; i <= 12; i++) {
        const monthStr = String(i).padStart(2, '0');
        const result = formatHijriDateArabic(`1445-${monthStr}-15`);
        expect(result).toContain(months[i - 1]);
      }
    });

    test('should handle invalid format gracefully', () => {
      const result = formatHijriDateArabic('invalid');
      expect(typeof result).toBe('string');
    });
  });

  describe('isValidHijriDate()', () => {
    describe('valid dates', () => {
      test('should return true for valid Hijri date', () => {
        expect(isValidHijriDate('1445-06-15')).toBe(true);
      });

      test('should return true for first day of year', () => {
        expect(isValidHijriDate('1445-01-01')).toBe(true);
      });

      test('should return true for last month', () => {
        expect(isValidHijriDate('1445-12-30')).toBe(true);
      });

      test('should return true for year 1300', () => {
        expect(isValidHijriDate('1300-01-01')).toBe(true);
      });

      test('should return true for year 1500', () => {
        expect(isValidHijriDate('1500-12-30')).toBe(true);
      });
    });

    describe('invalid dates', () => {
      test('should return false for null', () => {
        expect(isValidHijriDate(null)).toBe(false);
      });

      test('should return false for undefined', () => {
        expect(isValidHijriDate(undefined)).toBe(false);
      });

      test('should return false for empty string', () => {
        expect(isValidHijriDate('')).toBe(false);
      });

      test('should return false for non-string', () => {
        expect(isValidHijriDate(12345)).toBe(false);
      });

      test('should return false for wrong format', () => {
        expect(isValidHijriDate('1445/06/15')).toBe(false);
      });

      test('should return false for incomplete date', () => {
        expect(isValidHijriDate('1445-06')).toBe(false);
      });

      test('should return false for year out of range (too low)', () => {
        expect(isValidHijriDate('1299-06-15')).toBe(false);
      });

      test('should return false for year out of range (too high)', () => {
        expect(isValidHijriDate('1501-06-15')).toBe(false);
      });

      test('should return false for month 0', () => {
        expect(isValidHijriDate('1445-00-15')).toBe(false);
      });

      test('should return false for month 13', () => {
        expect(isValidHijriDate('1445-13-15')).toBe(false);
      });

      test('should return false for day 0', () => {
        expect(isValidHijriDate('1445-06-00')).toBe(false);
      });

      test('should return false for day 31', () => {
        expect(isValidHijriDate('1445-06-31')).toBe(false);
      });

      test('should return false for text', () => {
        expect(isValidHijriDate('not-a-date')).toBe(false);
      });
    });
  });

  describe('getHijriMonthNames()', () => {
    test('should return array of 12 months', () => {
      const months = getHijriMonthNames();
      expect(months).toHaveLength(12);
    });

    test('should have Muharram as first month', () => {
      const months = getHijriMonthNames();
      expect(months[0]).toBe('محرم');
    });

    test('should have Dhul Hijjah as last month', () => {
      const months = getHijriMonthNames();
      expect(months[11]).toBe('ذو الحجة');
    });

    test('should have Ramadan as ninth month', () => {
      const months = getHijriMonthNames();
      expect(months[8]).toBe('رمضان');
    });

    test('all months should be strings', () => {
      const months = getHijriMonthNames();
      months.forEach(month => {
        expect(typeof month).toBe('string');
      });
    });

    test('all months should contain Arabic characters', () => {
      const months = getHijriMonthNames();
      months.forEach(month => {
        expect(/[\u0600-\u06FF]/.test(month)).toBe(true);
      });
    });
  });

  describe('convertDateRange()', () => {
    test('should convert date range with both dates', () => {
      const range = {
        start_hijri: '1445-01-01',
        end_hijri: '1445-12-30'
      };
      const result = convertDateRange(range);
      expect(result.start_gregorian instanceof Date).toBe(true);
      expect(result.end_gregorian instanceof Date).toBe(true);
      expect(result.start_hijri).toBe('1445-01-01');
      expect(result.end_hijri).toBe('1445-12-30');
    });

    test('should handle null start date', () => {
      const range = {
        start_hijri: null,
        end_hijri: '1445-12-30'
      };
      const result = convertDateRange(range);
      expect(result.start_gregorian).toBeNull();
      expect(result.end_gregorian instanceof Date).toBe(true);
    });

    test('should handle null end date', () => {
      const range = {
        start_hijri: '1445-01-01',
        end_hijri: null
      };
      const result = convertDateRange(range);
      expect(result.start_gregorian instanceof Date).toBe(true);
      expect(result.end_gregorian).toBeNull();
    });

    test('should handle both dates null', () => {
      const range = {
        start_hijri: null,
        end_hijri: null
      };
      const result = convertDateRange(range);
      expect(result.start_gregorian).toBeNull();
      expect(result.end_gregorian).toBeNull();
    });

    test('should preserve original Hijri dates', () => {
      const range = {
        start_hijri: '1445-06-01',
        end_hijri: '1445-06-30'
      };
      const result = convertDateRange(range);
      expect(result.start_hijri).toBe(range.start_hijri);
      expect(result.end_hijri).toBe(range.end_hijri);
    });

    test('should have correct properties', () => {
      const range = {
        start_hijri: '1445-01-01',
        end_hijri: '1445-12-30'
      };
      const result = convertDateRange(range);
      expect(result).toHaveProperty('start_gregorian');
      expect(result).toHaveProperty('end_gregorian');
      expect(result).toHaveProperty('start_hijri');
      expect(result).toHaveProperty('end_hijri');
    });
  });
});
