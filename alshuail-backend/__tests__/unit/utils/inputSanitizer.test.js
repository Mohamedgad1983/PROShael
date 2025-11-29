/**
 * Input Sanitizer Unit Tests
 * Comprehensive tests for SQL injection prevention and input validation
 * Target: 100% coverage for this critical security utility
 */

import {
  sanitizeSQL,
  sanitizeSearchTerm,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject
} from '../../../src/utils/inputSanitizer.js';

describe('Input Sanitizer Utility Tests', () => {

  // ============================================
  // sanitizeSQL() Tests
  // ============================================
  describe('sanitizeSQL()', () => {

    describe('Basic Input Handling', () => {
      test('should return empty string for null input', () => {
        expect(sanitizeSQL(null)).toBe('');
      });

      test('should return empty string for undefined input', () => {
        expect(sanitizeSQL(undefined)).toBe('');
      });

      test('should return empty string for non-string input', () => {
        expect(sanitizeSQL(123)).toBe('');
        expect(sanitizeSQL({})).toBe('');
        expect(sanitizeSQL([])).toBe('');
        expect(sanitizeSQL(true)).toBe('');
      });

      test('should return empty string for empty string input', () => {
        expect(sanitizeSQL('')).toBe('');
      });

      test('should preserve clean input', () => {
        expect(sanitizeSQL('Hello World')).toBe('Hello World');
        expect(sanitizeSQL('محمد عبدالله')).toBe('محمد عبدالله');
      });
    });

    describe('SQL Comment Removal', () => {
      test('should remove single-line comments (--)', () => {
        expect(sanitizeSQL('test -- comment')).toBe('test  comment');
        expect(sanitizeSQL('value--injection')).toBe('valueinjection');
      });

      test('should remove multi-line comment start (/*)', () => {
        expect(sanitizeSQL('test /* comment')).toBe('test  comment');
      });

      test('should remove multi-line comment end (*/)', () => {
        expect(sanitizeSQL('test */ end')).toBe('test  end');
      });
    });

    describe('Character Escaping', () => {
      test('should escape single quotes', () => {
        expect(sanitizeSQL("test'value")).toBe("test''value");
        expect(sanitizeSQL("it's working")).toBe("it''s working");
      });

      test('should escape backslashes', () => {
        expect(sanitizeSQL('test\\value')).toBe('test\\\\value');
      });

      test('should escape double quotes', () => {
        expect(sanitizeSQL('test"value')).toBe('test\\"value');
      });

      test('should remove null bytes', () => {
        expect(sanitizeSQL('test\x00value')).toBe('testvalue');
      });

      test('should remove EOF characters', () => {
        expect(sanitizeSQL('test\x1avalue')).toBe('testvalue');
      });
    });

    describe('Dangerous Keyword Removal', () => {
      test('should remove DROP keyword', () => {
        // Keywords removed + trim() = no leading space
        expect(sanitizeSQL('DROP TABLE members')).toBe('TABLE members');
      });

      test('should remove DELETE keyword', () => {
        expect(sanitizeSQL('DELETE FROM members')).toBe('FROM members');
      });

      test('should remove INSERT keyword', () => {
        expect(sanitizeSQL('INSERT INTO members')).toBe('INTO members');
      });

      test('should remove UPDATE keyword', () => {
        expect(sanitizeSQL('UPDATE members SET')).toBe('members SET');
      });

      test('should remove ALTER keyword', () => {
        expect(sanitizeSQL('ALTER TABLE members')).toBe('TABLE members');
      });

      test('should remove CREATE keyword', () => {
        expect(sanitizeSQL('CREATE TABLE test')).toBe('TABLE test');
      });

      test('should remove TRUNCATE keyword', () => {
        expect(sanitizeSQL('TRUNCATE TABLE members')).toBe('TABLE members');
      });

      test('should remove EXEC keyword', () => {
        expect(sanitizeSQL('EXEC stored_proc')).toBe('stored_proc');
      });

      test('should remove EXECUTE keyword', () => {
        expect(sanitizeSQL('EXECUTE stored_proc')).toBe('stored_proc');
      });

      test('should remove UNION keyword', () => {
        // Note: SELECT alone is NOT removed (only SELECT.*FROM pattern)
        // UNION is removed, result: "SELECT *  SELECT *" trimmed
        const result = sanitizeSQL('SELECT * UNION SELECT *');
        expect(result).not.toContain('UNION');
      });

      test('should remove DECLARE keyword', () => {
        expect(sanitizeSQL('DECLARE @var INT')).toBe('@var INT');
      });

      test('should be case-insensitive for keywords', () => {
        expect(sanitizeSQL('drop table')).toBe('table');
        expect(sanitizeSQL('DrOp TaBlE')).toBe('TaBlE');
        expect(sanitizeSQL('DROP table')).toBe('table');
      });

      test('should handle multiple keywords in one string', () => {
        const malicious = "'; DROP TABLE members; DELETE FROM users; --";
        const result = sanitizeSQL(malicious);
        expect(result).not.toContain('DROP');
        expect(result).not.toContain('DELETE');
        expect(result).not.toContain('--');
      });
    });

    describe('Complex Injection Attempts', () => {
      test('should escape single quotes in SQL injection', () => {
        // Single quotes are escaped (doubled), not removed
        const result = sanitizeSQL("1' OR '1'='1");
        expect(result).toContain("''"); // escaped quotes
      });

      test('should sanitize nested injection attempts', () => {
        const input = "admin'--; DROP TABLE users;";
        const result = sanitizeSQL(input);
        expect(result).not.toContain('DROP');
        expect(result).not.toContain('--');
      });
    });
  });

  // ============================================
  // sanitizeSearchTerm() Tests
  // ============================================
  describe('sanitizeSearchTerm()', () => {

    describe('Basic Input Handling', () => {
      test('should return empty string for null input', () => {
        expect(sanitizeSearchTerm(null)).toBe('');
      });

      test('should return empty string for undefined input', () => {
        expect(sanitizeSearchTerm(undefined)).toBe('');
      });

      test('should return empty string for non-string input', () => {
        expect(sanitizeSearchTerm(123)).toBe('');
      });

      test('should preserve clean search terms', () => {
        expect(sanitizeSearchTerm('محمد')).toBe('محمد');
        expect(sanitizeSearchTerm('John Doe')).toBe('John Doe');
      });
    });

    describe('Pattern Matching Escape', () => {
      test('should escape % wildcard', () => {
        expect(sanitizeSearchTerm('test%value')).toBe('test\\%value');
      });

      test('should escape _ wildcard', () => {
        expect(sanitizeSearchTerm('test_value')).toBe('test\\_value');
      });

      test('should escape both wildcards', () => {
        expect(sanitizeSearchTerm('%test_')).toBe('\\%test\\_');
      });
    });

    describe('Combined SQL and Pattern Sanitization', () => {
      test('should apply SQL sanitization first, then pattern escape', () => {
        const input = "test'; DROP TABLE; %";
        const result = sanitizeSearchTerm(input);
        expect(result).not.toContain('DROP');
        expect(result).toContain('\\%');
      });
    });
  });

  // ============================================
  // sanitizeNumber() Tests
  // ============================================
  describe('sanitizeNumber()', () => {

    describe('Valid Number Input', () => {
      test('should return valid integer', () => {
        expect(sanitizeNumber(5)).toBe(5);
        expect(sanitizeNumber(100)).toBe(100);
        expect(sanitizeNumber('42')).toBe(42);
      });

      test('should parse string numbers', () => {
        expect(sanitizeNumber('123')).toBe(123);
        expect(sanitizeNumber('0')).toBe(0);
      });
    });

    describe('Invalid Input Handling', () => {
      test('should return default for NaN input', () => {
        expect(sanitizeNumber('abc')).toBe(0);
        expect(sanitizeNumber('abc', 0, 100, 50)).toBe(50);
      });

      test('should return default for null/undefined', () => {
        expect(sanitizeNumber(null)).toBe(0);
        expect(sanitizeNumber(undefined)).toBe(0);
      });

      test('should return default for empty string', () => {
        expect(sanitizeNumber('')).toBe(0);
      });

      test('should handle custom default value', () => {
        expect(sanitizeNumber('invalid', 0, 100, 25)).toBe(25);
      });
    });

    describe('Boundary Enforcement', () => {
      test('should enforce minimum value', () => {
        expect(sanitizeNumber(-5, 0, 100)).toBe(0);
        expect(sanitizeNumber(0, 1, 100)).toBe(1);
      });

      test('should enforce maximum value', () => {
        expect(sanitizeNumber(150, 0, 100)).toBe(100);
        expect(sanitizeNumber(1000, 0, 50)).toBe(50);
      });

      test('should return value within bounds', () => {
        expect(sanitizeNumber(50, 0, 100)).toBe(50);
        expect(sanitizeNumber(1, 1, 1)).toBe(1);
      });

      test('should handle default bounds', () => {
        expect(sanitizeNumber(5)).toBe(5);
        expect(sanitizeNumber(-1)).toBe(0); // min defaults to 0
      });
    });
  });

  // ============================================
  // sanitizeBoolean() Tests
  // ============================================
  describe('sanitizeBoolean()', () => {

    describe('Boolean Input', () => {
      test('should return true for boolean true', () => {
        expect(sanitizeBoolean(true)).toBe(true);
      });

      test('should return false for boolean false', () => {
        expect(sanitizeBoolean(false)).toBe(false);
      });
    });

    describe('String Input', () => {
      test('should return true for "true" string', () => {
        expect(sanitizeBoolean('true')).toBe(true);
        expect(sanitizeBoolean('TRUE')).toBe(true);
        expect(sanitizeBoolean('True')).toBe(true);
      });

      test('should return false for other strings', () => {
        expect(sanitizeBoolean('false')).toBe(false);
        expect(sanitizeBoolean('FALSE')).toBe(false);
        expect(sanitizeBoolean('yes')).toBe(false);
        expect(sanitizeBoolean('no')).toBe(false);
        expect(sanitizeBoolean('1')).toBe(false);
        expect(sanitizeBoolean('')).toBe(false);
      });
    });

    describe('Other Input Types', () => {
      test('should convert truthy values', () => {
        expect(sanitizeBoolean(1)).toBe(true);
        expect(sanitizeBoolean({})).toBe(true);
        expect(sanitizeBoolean([])).toBe(true);
      });

      test('should convert falsy values', () => {
        expect(sanitizeBoolean(0)).toBe(false);
        expect(sanitizeBoolean(null)).toBe(false);
        expect(sanitizeBoolean(undefined)).toBe(false);
      });
    });
  });

  // ============================================
  // sanitizeEmail() Tests
  // ============================================
  describe('sanitizeEmail()', () => {

    describe('Valid Email Formats', () => {
      test('should accept valid email', () => {
        expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      });

      test('should lowercase email', () => {
        expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
      });

      test('should trim whitespace', () => {
        expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
      });

      test('should accept emails with dots', () => {
        expect(sanitizeEmail('first.last@example.com')).toBe('first.last@example.com');
      });

      test('should accept emails with plus sign', () => {
        expect(sanitizeEmail('test+tag@example.com')).toBe('test+tag@example.com');
      });

      test('should accept emails with numbers', () => {
        expect(sanitizeEmail('test123@example.com')).toBe('test123@example.com');
      });

      test('should accept emails with subdomains', () => {
        expect(sanitizeEmail('test@sub.example.com')).toBe('test@sub.example.com');
      });
    });

    describe('Invalid Email Formats', () => {
      test('should return null for null input', () => {
        expect(sanitizeEmail(null)).toBeNull();
      });

      test('should return null for undefined input', () => {
        expect(sanitizeEmail(undefined)).toBeNull();
      });

      test('should return null for non-string input', () => {
        expect(sanitizeEmail(123)).toBeNull();
        expect(sanitizeEmail({})).toBeNull();
      });

      test('should return null for missing @', () => {
        expect(sanitizeEmail('testexample.com')).toBeNull();
      });

      test('should return null for missing domain', () => {
        expect(sanitizeEmail('test@')).toBeNull();
      });

      test('should return null for missing local part', () => {
        expect(sanitizeEmail('@example.com')).toBeNull();
      });

      test('should return null for invalid TLD', () => {
        expect(sanitizeEmail('test@example.c')).toBeNull();
      });

      test('should return null for empty string', () => {
        expect(sanitizeEmail('')).toBeNull();
      });
    });
  });

  // ============================================
  // sanitizePhone() Tests - Saudi Arabia
  // ============================================
  describe('sanitizePhone() - Saudi Arabia', () => {

    describe('Valid Saudi Phone Formats', () => {
      test('should accept +966 format', () => {
        expect(sanitizePhone('+966501234567')).toBe('966501234567');
      });

      test('should accept 966 format (no +)', () => {
        expect(sanitizePhone('966501234567')).toBe('966501234567');
      });

      test('should accept 05 format', () => {
        expect(sanitizePhone('0501234567')).toBe('966501234567');
      });

      test('should accept 5X format (9 digits)', () => {
        expect(sanitizePhone('501234567')).toBe('966501234567');
      });

      test('should handle formatted phone numbers', () => {
        expect(sanitizePhone('+966 50 123 4567')).toBe('966501234567');
        expect(sanitizePhone('(966) 501234567')).toBe('966501234567');
      });

      test('should accept various Saudi prefixes', () => {
        expect(sanitizePhone('0551234567')).toBe('966551234567'); // 55 prefix
        expect(sanitizePhone('0561234567')).toBe('966561234567'); // 56 prefix
        expect(sanitizePhone('0591234567')).toBe('966591234567'); // 59 prefix
      });

      test('should accept explicit SA country code', () => {
        expect(sanitizePhone('0501234567', 'SA')).toBe('966501234567');
      });
    });

    describe('Invalid Saudi Phone Formats', () => {
      test('should return null for null input', () => {
        expect(sanitizePhone(null)).toBeNull();
      });

      test('should return null for undefined input', () => {
        expect(sanitizePhone(undefined)).toBeNull();
      });

      test('should return null for non-string input', () => {
        expect(sanitizePhone(123)).toBeNull();
      });

      test('should return null for too short number', () => {
        expect(sanitizePhone('05012345')).toBeNull(); // 8 digits
      });

      test('should return null for too long number', () => {
        expect(sanitizePhone('050123456789')).toBeNull(); // 12 digits
      });

      test('should return null for invalid prefix', () => {
        expect(sanitizePhone('0401234567')).toBeNull(); // 04 prefix
        expect(sanitizePhone('0601234567')).toBeNull(); // 06 prefix
      });
    });
  });

  // ============================================
  // sanitizePhone() Tests - Kuwait
  // ============================================
  describe('sanitizePhone() - Kuwait', () => {

    describe('Valid Kuwait Phone Formats', () => {
      test('should accept +965 format', () => {
        expect(sanitizePhone('+96550012345', 'KW')).toBe('96550012345');
      });

      test('should accept 965 format (no +)', () => {
        expect(sanitizePhone('96550012345', 'KW')).toBe('96550012345');
      });

      test('should accept 8-digit local number', () => {
        expect(sanitizePhone('50012345', 'KW')).toBe('96550012345');
      });

      test('should auto-detect Kuwait from 965 prefix', () => {
        expect(sanitizePhone('96560012345')).toBe('96560012345');
      });
    });

    describe('Invalid Kuwait Phone Formats', () => {
      test('should return null for too short Kuwait number', () => {
        expect(sanitizePhone('5001234', 'KW')).toBeNull(); // 7 digits
      });

      test('should return null for too long Kuwait number', () => {
        expect(sanitizePhone('500123456', 'KW')).toBeNull(); // 9 digits
      });
    });
  });

  // ============================================
  // sanitizeObject() Tests
  // ============================================
  describe('sanitizeObject()', () => {

    describe('Basic Input Handling', () => {
      test('should return empty object for null input', () => {
        expect(sanitizeObject(null)).toEqual({});
      });

      test('should return empty object for undefined input', () => {
        expect(sanitizeObject(undefined)).toEqual({});
      });

      test('should return empty object for non-object input', () => {
        expect(sanitizeObject('string')).toEqual({});
        expect(sanitizeObject(123)).toEqual({});
      });
    });

    describe('Field Filtering', () => {
      test('should remove null values', () => {
        const input = { name: 'test', value: null };
        const result = sanitizeObject(input);
        expect(result).not.toHaveProperty('value');
        expect(result).toHaveProperty('name', 'test');
      });

      test('should remove undefined values', () => {
        const input = { name: 'test', value: undefined };
        const result = sanitizeObject(input);
        expect(result).not.toHaveProperty('value');
      });
    });

    describe('Type-Based Sanitization', () => {
      test('should sanitize string values', () => {
        const input = { name: "test'; DROP TABLE;" };
        const result = sanitizeObject(input);
        expect(result.name).not.toContain('DROP');
      });

      test('should sanitize number values', () => {
        const input = { count: 5 };
        const result = sanitizeObject(input);
        expect(result.count).toBe(5);
      });

      test('should preserve boolean values', () => {
        const input = { active: true, disabled: false };
        const result = sanitizeObject(input);
        expect(result.active).toBe(true);
        expect(result.disabled).toBe(false);
      });

      test('should sanitize array values', () => {
        const input = { tags: ['safe', "unsafe'; DROP TABLE;"] };
        const result = sanitizeObject(input);
        expect(result.tags[0]).toBe('safe');
        expect(result.tags[1]).not.toContain('DROP');
      });

      test('should recursively sanitize nested objects', () => {
        const input = {
          outer: {
            inner: "test'; DROP TABLE;"
          }
        };
        const result = sanitizeObject(input);
        expect(result.outer.inner).not.toContain('DROP');
      });
    });

    describe('Complex Object Sanitization', () => {
      test('should handle mixed types in object', () => {
        const input = {
          name: 'محمد',
          age: 25,
          active: true,
          tags: ['family', 'member'],
          details: {
            phone: '+966501234567',
            email: 'test@example.com'
          },
          empty: null
        };

        const result = sanitizeObject(input);

        expect(result.name).toBe('محمد');
        expect(result.age).toBe(25);
        expect(result.active).toBe(true);
        expect(result.tags).toEqual(['family', 'member']);
        expect(result.details.phone).toBe('+966501234567');
        expect(result).not.toHaveProperty('empty');
      });
    });
  });
});
