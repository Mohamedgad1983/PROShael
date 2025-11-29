/**
 * Profile Validation Utilities Unit Tests
 * Tests user profile information validation functions
 */

import { jest } from '@jest/globals';

// Import the actual module (no database dependency for main function)
const { validateProfileUpdates } = await import('../../../src/utils/profileValidation.js');

describe('Profile Validation Utilities', () => {
  describe('validateProfileUpdates()', () => {
    describe('full_name validation', () => {
      describe('valid names', () => {
        test('should return no errors for valid English name', () => {
          const errors = validateProfileUpdates({ full_name: 'John Doe' });
          expect(errors).toHaveLength(0);
        });

        test('should return no errors for valid Arabic name', () => {
          const errors = validateProfileUpdates({ full_name: 'محمد أحمد' });
          expect(errors).toHaveLength(0);
        });

        test('should return no errors for 3 character name', () => {
          const errors = validateProfileUpdates({ full_name: 'Ali' });
          expect(errors).toHaveLength(0);
        });

        test('should return no errors for 100 character name', () => {
          const errors = validateProfileUpdates({ full_name: 'a'.repeat(100) });
          expect(errors).toHaveLength(0);
        });

        test('should return no errors when full_name is not provided', () => {
          const errors = validateProfileUpdates({});
          expect(errors.filter(e => e.field === 'full_name')).toHaveLength(0);
        });
      });

      describe('invalid names', () => {
        test('should return error for empty string name', () => {
          const errors = validateProfileUpdates({ full_name: '' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('full_name');
          expect(errors[0].message).toBe('الاسم الكامل مطلوب');
          expect(errors[0].message_en).toBe('Full name is required');
        });

        test('should return error for whitespace only name', () => {
          const errors = validateProfileUpdates({ full_name: '   ' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('full_name');
        });

        test('should return error for name too short (2 chars)', () => {
          const errors = validateProfileUpdates({ full_name: 'Ab' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('full_name');
          expect(errors[0].message_en).toBe('Name must be at least 3 characters');
        });

        test('should return error for name too short (1 char)', () => {
          const errors = validateProfileUpdates({ full_name: 'A' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('full_name');
        });

        test('should return error for name too long (101 chars)', () => {
          const errors = validateProfileUpdates({ full_name: 'a'.repeat(101) });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('full_name');
          expect(errors[0].message_en).toBe('Name must not exceed 100 characters');
        });

        test('should return error for null name', () => {
          const errors = validateProfileUpdates({ full_name: null });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('full_name');
        });
      });
    });

    describe('email validation', () => {
      describe('valid emails', () => {
        test('should return no errors for valid email', () => {
          const errors = validateProfileUpdates({ email: 'test@example.com' });
          expect(errors.filter(e => e.field === 'email')).toHaveLength(0);
        });

        test('should return no errors for email with subdomain', () => {
          const errors = validateProfileUpdates({ email: 'user@mail.example.com' });
          expect(errors.filter(e => e.field === 'email')).toHaveLength(0);
        });

        test('should return no errors for email with plus sign', () => {
          const errors = validateProfileUpdates({ email: 'user+tag@example.com' });
          expect(errors.filter(e => e.field === 'email')).toHaveLength(0);
        });

        test('should return no errors for email with numbers', () => {
          const errors = validateProfileUpdates({ email: 'user123@example123.com' });
          expect(errors.filter(e => e.field === 'email')).toHaveLength(0);
        });

        test('should return no errors when email is not provided', () => {
          const errors = validateProfileUpdates({});
          expect(errors.filter(e => e.field === 'email')).toHaveLength(0);
        });
      });

      describe('invalid emails', () => {
        test('should return error for invalid email (no @)', () => {
          const errors = validateProfileUpdates({ email: 'testexample.com' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
          expect(errors[0].message).toBe('البريد الإلكتروني غير صالح');
          expect(errors[0].message_en).toBe('Invalid email address');
        });

        test('should return error for invalid email (no domain)', () => {
          const errors = validateProfileUpdates({ email: 'test@' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
        });

        test('should return error for invalid email (no user)', () => {
          const errors = validateProfileUpdates({ email: '@example.com' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
        });

        test('should return error for invalid email (spaces)', () => {
          const errors = validateProfileUpdates({ email: 'test @example.com' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
        });

        test('should return error for empty email', () => {
          const errors = validateProfileUpdates({ email: '' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
        });

        test('should return error for null email', () => {
          const errors = validateProfileUpdates({ email: null });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
        });

        test('should return error for email too long', () => {
          const longEmail = 'a'.repeat(250) + '@example.com';
          const errors = validateProfileUpdates({ email: longEmail });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
          expect(errors[0].message_en).toBe('Email must not exceed 255 characters');
        });

        test('should return error for email with multiple @', () => {
          const errors = validateProfileUpdates({ email: 'test@@example.com' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('email');
        });
      });
    });

    describe('phone validation', () => {
      describe('valid phones', () => {
        test('should return no errors for valid Saudi phone with 05', () => {
          const errors = validateProfileUpdates({ phone: '0512345678' });
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });

        test('should return no errors for valid Saudi phone starting with 5', () => {
          const errors = validateProfileUpdates({ phone: '512345678' });
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });

        test('should return no errors for phone 0550000000', () => {
          const errors = validateProfileUpdates({ phone: '0550000000' });
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });

        test('should return no errors for phone 0599999999', () => {
          const errors = validateProfileUpdates({ phone: '0599999999' });
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });

        test('should return no errors when phone is not provided', () => {
          const errors = validateProfileUpdates({});
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });

        test('should return no errors for empty phone (optional)', () => {
          const errors = validateProfileUpdates({ phone: '' });
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });

        test('should return no errors for null phone', () => {
          const errors = validateProfileUpdates({ phone: null });
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });
      });

      describe('invalid phones', () => {
        test('should return error for phone not starting with 05 or 5', () => {
          const errors = validateProfileUpdates({ phone: '0612345678' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('phone');
          expect(errors[0].message_en).toBe('Phone must be a valid Saudi number (05xxxxxxxx)');
        });

        test('should return error for phone too short', () => {
          const errors = validateProfileUpdates({ phone: '0512345' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('phone');
        });

        test('should return error for phone too long', () => {
          const errors = validateProfileUpdates({ phone: '05123456789' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('phone');
        });

        test('should return error for phone with letters', () => {
          const errors = validateProfileUpdates({ phone: '05123abcde' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('phone');
        });

        test('should return error for phone with spaces', () => {
          const errors = validateProfileUpdates({ phone: '05 1234 5678' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('phone');
        });

        test('should return error for phone with dashes', () => {
          const errors = validateProfileUpdates({ phone: '05-1234-5678' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('phone');
        });

        test('should return error for international format', () => {
          const errors = validateProfileUpdates({ phone: '+966512345678' });
          expect(errors).toHaveLength(1);
          expect(errors[0].field).toBe('phone');
        });
      });
    });

    describe('multiple field validation', () => {
      test('should validate all fields when provided', () => {
        const errors = validateProfileUpdates({
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '0512345678'
        });
        expect(errors).toHaveLength(0);
      });

      test('should return multiple errors for multiple invalid fields', () => {
        const errors = validateProfileUpdates({
          full_name: '',
          email: 'invalid',
          phone: '123'
        });
        expect(errors).toHaveLength(3);
        expect(errors.map(e => e.field)).toContain('full_name');
        expect(errors.map(e => e.field)).toContain('email');
        expect(errors.map(e => e.field)).toContain('phone');
      });

      test('should return partial errors', () => {
        const errors = validateProfileUpdates({
          full_name: 'John Doe', // valid
          email: 'invalid', // invalid
          phone: '0512345678' // valid
        });
        expect(errors).toHaveLength(1);
        expect(errors[0].field).toBe('email');
      });
    });

    describe('error message structure', () => {
      test('should have bilingual error messages', () => {
        const errors = validateProfileUpdates({ full_name: '' });
        expect(errors[0]).toHaveProperty('field');
        expect(errors[0]).toHaveProperty('message'); // Arabic
        expect(errors[0]).toHaveProperty('message_en'); // English
      });

      test('Arabic message should be in Arabic', () => {
        const errors = validateProfileUpdates({ full_name: '' });
        // Check for Arabic characters
        expect(/[\u0600-\u06FF]/.test(errors[0].message)).toBe(true);
      });

      test('English message should be in English', () => {
        const errors = validateProfileUpdates({ full_name: '' });
        // Check for Latin characters
        expect(/[a-zA-Z]/.test(errors[0].message_en)).toBe(true);
      });
    });

    describe('edge cases', () => {
      test('should handle empty object', () => {
        const errors = validateProfileUpdates({});
        expect(errors).toHaveLength(0);
      });

      test('should handle undefined fields', () => {
        const errors = validateProfileUpdates({ unknown_field: 'value' });
        expect(errors).toHaveLength(0);
      });

      test('should handle name with leading/trailing spaces', () => {
        const errors = validateProfileUpdates({ full_name: '   John Doe   ' });
        // After trim, should be valid
        expect(errors).toHaveLength(0);
      });

      test('should handle name with only spaces', () => {
        const errors = validateProfileUpdates({ full_name: '      ' });
        // After trim, empty
        expect(errors).toHaveLength(1);
      });

      test('should allow all valid Saudi mobile prefixes', () => {
        const validPrefixes = ['050', '051', '052', '053', '054', '055', '056', '057', '058', '059'];
        validPrefixes.forEach(prefix => {
          const phone = prefix + '1234567';
          const errors = validateProfileUpdates({ phone });
          expect(errors.filter(e => e.field === 'phone')).toHaveLength(0);
        });
      });
    });
  });
});
