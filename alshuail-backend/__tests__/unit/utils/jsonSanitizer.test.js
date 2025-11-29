/**
 * JSON Sanitizer Utilities Unit Tests
 * Tests JSON parsing and data preparation functions
 */

import { jest } from '@jest/globals';

// Mock the logger
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import the actual module after mocks
const { sanitizeJSON, prepareUpdateData } = await import('../../../src/utils/jsonSanitizer.js');

describe('JSON Sanitizer Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeJSON()', () => {
    describe('object input', () => {
      test('should return object as-is', () => {
        const obj = { name: 'Test', value: 123 };
        expect(sanitizeJSON(obj)).toBe(obj);
      });

      test('should return empty object as-is', () => {
        const obj = {};
        expect(sanitizeJSON(obj)).toBe(obj);
      });

      test('should return array as-is', () => {
        const arr = [1, 2, 3];
        expect(sanitizeJSON(arr)).toBe(arr);
      });

      test('should return nested object as-is', () => {
        const obj = { level1: { level2: { level3: 'value' } } };
        expect(sanitizeJSON(obj)).toBe(obj);
      });
    });

    describe('string input', () => {
      test('should parse valid JSON string', () => {
        const jsonStr = '{"name":"Test","value":123}';
        const result = sanitizeJSON(jsonStr);
        expect(result).toEqual({ name: 'Test', value: 123 });
      });

      test('should parse JSON array string', () => {
        const jsonStr = '[1,2,3]';
        const result = sanitizeJSON(jsonStr);
        expect(result).toEqual([1, 2, 3]);
      });

      test('should return empty object for invalid JSON', () => {
        const result = sanitizeJSON('invalid json');
        expect(result).toEqual({});
      });

      test('should return empty object for incomplete JSON', () => {
        const result = sanitizeJSON('{"name": "Test"');
        expect(result).toEqual({});
      });

      test('should handle empty string', () => {
        const result = sanitizeJSON('');
        expect(result).toEqual({});
      });
    });

    describe('null/undefined input', () => {
      test('should return null as-is', () => {
        expect(sanitizeJSON(null)).toBeNull();
      });

      test('should return undefined as-is', () => {
        expect(sanitizeJSON(undefined)).toBeUndefined();
      });
    });

    describe('other types', () => {
      test('should return number as-is', () => {
        expect(sanitizeJSON(123)).toBe(123);
      });

      test('should return boolean as-is', () => {
        expect(sanitizeJSON(true)).toBe(true);
      });
    });
  });

  describe('prepareUpdateData()', () => {
    describe('valid fields', () => {
      test('should include full_name field', () => {
        const result = prepareUpdateData({ full_name: 'John Doe' });
        expect(result.full_name).toBe('John Doe');
      });

      test('should include phone field', () => {
        const result = prepareUpdateData({ phone: '0501234567' });
        expect(result.phone).toBe('0501234567');
      });

      test('should include email field', () => {
        const result = prepareUpdateData({ email: 'test@example.com' });
        expect(result.email).toBe('test@example.com');
      });

      test('should include national_id field', () => {
        const result = prepareUpdateData({ national_id: '1234567890' });
        expect(result.national_id).toBe('1234567890');
      });

      test('should include membership_status field', () => {
        const result = prepareUpdateData({ membership_status: 'active' });
        expect(result.membership_status).toBe('active');
      });

      test('should include membership_type field', () => {
        const result = prepareUpdateData({ membership_type: 'regular' });
        expect(result.membership_type).toBe('regular');
      });

      test('should include city field', () => {
        const result = prepareUpdateData({ city: 'Riyadh' });
        expect(result.city).toBe('Riyadh');
      });

      test('should include address field', () => {
        const result = prepareUpdateData({ address: '123 Main St' });
        expect(result.address).toBe('123 Main St');
      });

      test('should include occupation field', () => {
        const result = prepareUpdateData({ occupation: 'Engineer' });
        expect(result.occupation).toBe('Engineer');
      });

      test('should include employer field', () => {
        const result = prepareUpdateData({ employer: 'ACME Corp' });
        expect(result.employer).toBe('ACME Corp');
      });

      test('should include notes field', () => {
        const result = prepareUpdateData({ notes: 'Some notes' });
        expect(result.notes).toBe('Some notes');
      });

      test('should include profile_completed field', () => {
        const result = prepareUpdateData({ profile_completed: true });
        expect(result.profile_completed).toBe(true);
      });

      test('should include membership_number field', () => {
        const result = prepareUpdateData({ membership_number: 'MEM001' });
        expect(result.membership_number).toBe('MEM001');
      });

      test('should include nationality field', () => {
        const result = prepareUpdateData({ nationality: 'Saudi' });
        expect(result.nationality).toBe('Saudi');
      });

      test('should include tribal_section field', () => {
        const result = prepareUpdateData({ tribal_section: 'Section A' });
        expect(result.tribal_section).toBe('Section A');
      });
    });

    describe('invalid fields', () => {
      test('should exclude district field (not in schema)', () => {
        const result = prepareUpdateData({ district: 'Test District' });
        expect(result.district).toBeUndefined();
      });

      test('should exclude random fields', () => {
        const result = prepareUpdateData({ random_field: 'value' });
        expect(result.random_field).toBeUndefined();
      });

      test('should exclude id field', () => {
        const result = prepareUpdateData({ id: 'some-id' });
        expect(result.id).toBeUndefined();
      });

      test('should exclude created_at field', () => {
        const result = prepareUpdateData({ created_at: '2023-01-01' });
        expect(result.created_at).toBeUndefined();
      });
    });

    describe('date field handling', () => {
      test('should include valid date_of_birth', () => {
        const result = prepareUpdateData({ date_of_birth: '1990-01-15' });
        expect(result.date_of_birth).toBe('1990-01-15');
      });

      test('should include valid membership_date', () => {
        const result = prepareUpdateData({ membership_date: '2020-05-01' });
        expect(result.membership_date).toBe('2020-05-01');
      });

      test('should exclude empty date_of_birth', () => {
        const result = prepareUpdateData({ date_of_birth: '' });
        expect(result.date_of_birth).toBeUndefined();
      });

      test('should exclude null date_of_birth', () => {
        const result = prepareUpdateData({ date_of_birth: null });
        expect(result.date_of_birth).toBeUndefined();
      });

      test('should exclude undefined date_of_birth', () => {
        const result = prepareUpdateData({ date_of_birth: undefined });
        expect(result.date_of_birth).toBeUndefined();
      });

      test('should exclude empty membership_date', () => {
        const result = prepareUpdateData({ membership_date: '' });
        expect(result.membership_date).toBeUndefined();
      });
    });

    describe('gender field handling', () => {
      test('should lowercase gender', () => {
        const result = prepareUpdateData({ gender: 'MALE' });
        expect(result.gender).toBe('male');
      });

      test('should trim gender', () => {
        const result = prepareUpdateData({ gender: '  female  ' });
        expect(result.gender).toBe('female');
      });

      test('should handle null gender', () => {
        const result = prepareUpdateData({ gender: null });
        expect(result.gender).toBeNull();
      });

      test('should handle empty gender', () => {
        const result = prepareUpdateData({ gender: '' });
        expect(result.gender).toBeNull();
      });
    });

    describe('tribal_section field handling', () => {
      test('should trim tribal_section', () => {
        const result = prepareUpdateData({ tribal_section: '  Section B  ' });
        expect(result.tribal_section).toBe('Section B');
      });

      test('should handle null tribal_section', () => {
        const result = prepareUpdateData({ tribal_section: null });
        expect(result.tribal_section).toBeNull();
      });
    });

    describe('phone field handling', () => {
      test('should include valid phone', () => {
        const result = prepareUpdateData({ phone: '0501234567' });
        expect(result.phone).toBe('0501234567');
      });

      test('should trim phone', () => {
        const result = prepareUpdateData({ phone: '  0501234567  ' });
        expect(result.phone).toBe('0501234567');
      });

      test('should set phone to null for empty string', () => {
        const result = prepareUpdateData({ phone: '' });
        expect(result.phone).toBeNull();
      });

      test('should set phone to null for null value', () => {
        const result = prepareUpdateData({ phone: null });
        expect(result.phone).toBeNull();
      });
    });

    describe('string trimming', () => {
      test('should trim full_name', () => {
        const result = prepareUpdateData({ full_name: '  John Doe  ' });
        expect(result.full_name).toBe('John Doe');
      });

      test('should trim email', () => {
        const result = prepareUpdateData({ email: '  test@example.com  ' });
        expect(result.email).toBe('test@example.com');
      });

      test('should set to null for empty trimmed string', () => {
        const result = prepareUpdateData({ city: '   ' });
        expect(result.city).toBeNull();
      });
    });

    describe('null/empty handling', () => {
      test('should convert empty string to null for most fields', () => {
        const result = prepareUpdateData({ address: '' });
        expect(result.address).toBeNull();
      });

      test('should convert undefined to null', () => {
        const result = prepareUpdateData({ city: undefined });
        expect(result.city).toBeNull();
      });

      test('should convert null to null', () => {
        const result = prepareUpdateData({ occupation: null });
        expect(result.occupation).toBeNull();
      });
    });

    describe('timestamp handling', () => {
      test('should always include updated_at timestamp', () => {
        const result = prepareUpdateData({ full_name: 'Test' });
        expect(result.updated_at).toBeDefined();
        expect(typeof result.updated_at).toBe('string');
      });

      test('should include updated_at even for empty data', () => {
        const result = prepareUpdateData({});
        expect(result.updated_at).toBeDefined();
      });

      test('should have valid ISO timestamp', () => {
        const result = prepareUpdateData({});
        const timestamp = new Date(result.updated_at);
        expect(timestamp instanceof Date).toBe(true);
        expect(isNaN(timestamp.getTime())).toBe(false);
      });
    });

    describe('non-string values', () => {
      test('should preserve boolean values', () => {
        const result = prepareUpdateData({ profile_completed: true });
        expect(result.profile_completed).toBe(true);
      });

      test('should preserve false boolean', () => {
        const result = prepareUpdateData({ profile_completed: false });
        expect(result.profile_completed).toBe(false);
      });
    });

    describe('multiple fields', () => {
      test('should process multiple valid fields', () => {
        const data = {
          full_name: 'John Doe',
          phone: '0501234567',
          email: 'john@example.com',
          city: 'Riyadh'
        };
        const result = prepareUpdateData(data);
        expect(result.full_name).toBe('John Doe');
        expect(result.phone).toBe('0501234567');
        expect(result.email).toBe('john@example.com');
        expect(result.city).toBe('Riyadh');
      });

      test('should filter out invalid fields from mixed data', () => {
        const data = {
          full_name: 'John Doe',
          invalid_field: 'should not appear',
          city: 'Riyadh'
        };
        const result = prepareUpdateData(data);
        expect(result.full_name).toBe('John Doe');
        expect(result.city).toBe('Riyadh');
        expect(result.invalid_field).toBeUndefined();
      });
    });

    describe('Arabic text handling', () => {
      test('should preserve Arabic full_name', () => {
        const result = prepareUpdateData({ full_name: 'محمد أحمد' });
        expect(result.full_name).toBe('محمد أحمد');
      });

      test('should preserve Arabic city', () => {
        const result = prepareUpdateData({ city: 'الرياض' });
        expect(result.city).toBe('الرياض');
      });

      test('should preserve Arabic address', () => {
        const result = prepareUpdateData({ address: 'شارع الملك فهد' });
        expect(result.address).toBe('شارع الملك فهد');
      });

      test('should preserve Arabic tribal_section', () => {
        const result = prepareUpdateData({ tribal_section: 'فرع الشمال' });
        expect(result.tribal_section).toBe('فرع الشمال');
      });
    });
  });
});
