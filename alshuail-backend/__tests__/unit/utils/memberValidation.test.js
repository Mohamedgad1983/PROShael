/**
 * Member Validation Utilities Unit Tests
 * Tests input validation helpers for member management operations
 */

import { jest } from '@jest/globals';

// Mock the member constants
jest.unstable_mockModule('../../../src/constants/memberConstants.js', () => ({
  ERROR_CODES: {
    INVALID_INPUT: 'INVALID_INPUT',
    NOT_FOUND: 'NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN'
  },
  ERROR_MESSAGES: {
    INVALID_INPUT: {
      MEMBER_ID_REQUIRED: 'Member ID is required',
      MEMBER_ID_INVALID: 'Invalid member ID format',
      SUSPENSION_REASON_REQUIRED: 'Suspension reason is required',
      SUSPENSION_REASON_TOO_LONG: 'Suspension reason is too long',
      REACTIVATION_NOTES_TOO_LONG: 'Reactivation notes are too long'
    }
  },
  VALIDATION_LIMITS: {
    SUSPENSION_REASON_MAX_LENGTH: 500,
    REACTIVATION_NOTES_MAX_LENGTH: 1000
  }
}));

// Import the actual module after mocks
const {
  isValidUUID,
  validateMemberId,
  sanitizeText,
  validateSuspensionReason,
  validateReactivationNotes,
  buildErrorResponse,
  buildSuccessResponse
} = await import('../../../src/utils/memberValidation.js');

describe('Member Validation Utilities', () => {
  describe('isValidUUID()', () => {
    describe('valid UUIDs', () => {
      test('should return true for valid UUID v4', () => {
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      test('should return true for another valid UUID v4', () => {
        expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
      });

      test('should return true for lowercase UUID', () => {
        expect(isValidUUID('abcdef12-3456-4789-abcd-ef1234567890')).toBe(true);
      });

      test('should return true for uppercase UUID', () => {
        expect(isValidUUID('ABCDEF12-3456-4789-ABCD-EF1234567890')).toBe(true);
      });

      test('should return true for mixed case UUID', () => {
        expect(isValidUUID('AbCdEf12-3456-4789-AbCd-Ef1234567890')).toBe(true);
      });
    });

    describe('invalid UUIDs', () => {
      test('should return false for empty string', () => {
        expect(isValidUUID('')).toBe(false);
      });

      test('should return false for null', () => {
        expect(isValidUUID(null)).toBe(false);
      });

      test('should return false for undefined', () => {
        expect(isValidUUID(undefined)).toBe(false);
      });

      test('should return false for number', () => {
        expect(isValidUUID(12345)).toBe(false);
      });

      test('should return false for object', () => {
        expect(isValidUUID({})).toBe(false);
      });

      test('should return false for array', () => {
        expect(isValidUUID([])).toBe(false);
      });

      test('should return false for non-UUID string', () => {
        expect(isValidUUID('not-a-uuid')).toBe(false);
      });

      test('should return false for UUID v1 format', () => {
        expect(isValidUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
      });

      test('should return false for UUID without hyphens', () => {
        expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
      });

      test('should return false for UUID with extra characters', () => {
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
      });

      test('should return false for too short UUID', () => {
        expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      });

      test('should return false for UUID with invalid characters', () => {
        expect(isValidUUID('550g8400-e29b-41d4-a716-446655440000')).toBe(false);
      });

      test('should return false for UUID with spaces', () => {
        expect(isValidUUID('550e8400 e29b 41d4 a716 446655440000')).toBe(false);
      });
    });
  });

  describe('validateMemberId()', () => {
    describe('valid member IDs', () => {
      test('should return valid:true for valid UUID', () => {
        const result = validateMemberId('550e8400-e29b-41d4-a716-446655440000');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('missing member IDs', () => {
      test('should return valid:false for empty string', () => {
        const result = validateMemberId('');
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe('INVALID_INPUT');
        expect(result.error.message).toBe('Member ID is required');
      });

      test('should return valid:false for null', () => {
        const result = validateMemberId(null);
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe('INVALID_INPUT');
      });

      test('should return valid:false for undefined', () => {
        const result = validateMemberId(undefined);
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe('INVALID_INPUT');
      });
    });

    describe('invalid member ID format', () => {
      test('should return valid:false for non-UUID string', () => {
        const result = validateMemberId('invalid-id');
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe('INVALID_INPUT');
        expect(result.error.message).toBe('Invalid member ID format');
      });

      test('should return valid:false for number', () => {
        const result = validateMemberId(12345);
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe('INVALID_INPUT');
      });
    });
  });

  describe('sanitizeText()', () => {
    describe('basic sanitization', () => {
      test('should return empty string for null', () => {
        expect(sanitizeText(null)).toBe('');
      });

      test('should return empty string for undefined', () => {
        expect(sanitizeText(undefined)).toBe('');
      });

      test('should return empty string for number', () => {
        expect(sanitizeText(123)).toBe('');
      });

      test('should return empty string for object', () => {
        expect(sanitizeText({})).toBe('');
      });

      test('should trim whitespace', () => {
        expect(sanitizeText('  hello  ')).toBe('hello');
      });

      test('should preserve normal text', () => {
        expect(sanitizeText('normal text')).toBe('normal text');
      });
    });

    describe('HTML removal', () => {
      test('should remove HTML tags', () => {
        expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
      });

      test('should remove angle brackets', () => {
        // First regex removes <...> as HTML tag, then second regex removes remaining < or >
        // 'text with < and > brackets' -> HTML tag regex matches '< and >' -> 'text with  brackets'
        expect(sanitizeText('text with < and > brackets')).toBe('text with  brackets');
      });

      test('should remove bold tags', () => {
        expect(sanitizeText('<b>bold</b>')).toBe('bold');
      });

      test('should remove nested tags', () => {
        expect(sanitizeText('<div><span>nested</span></div>')).toBe('nested');
      });

      test('should handle multiple tags', () => {
        expect(sanitizeText('<p>para1</p><p>para2</p>')).toBe('para1para2');
      });
    });

    describe('Arabic text', () => {
      test('should preserve Arabic characters', () => {
        expect(sanitizeText('محمد أحمد العلي')).toBe('محمد أحمد العلي');
      });

      test('should trim Arabic text', () => {
        expect(sanitizeText('  محمد  ')).toBe('محمد');
      });

      test('should remove HTML from Arabic text', () => {
        expect(sanitizeText('<script>محمد</script>')).toBe('محمد');
      });
    });
  });

  describe('validateSuspensionReason()', () => {
    describe('valid reasons', () => {
      test('should return valid:true for valid reason', () => {
        const result = validateSuspensionReason('Non-payment of dues');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('Non-payment of dues');
      });

      test('should sanitize HTML from reason', () => {
        const result = validateSuspensionReason('<b>Important</b> reason');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('Important reason');
      });

      test('should trim whitespace', () => {
        const result = validateSuspensionReason('  reason with spaces  ');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('reason with spaces');
      });

      test('should accept Arabic reasons', () => {
        const result = validateSuspensionReason('عدم دفع الاشتراكات');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('عدم دفع الاشتراكات');
      });
    });

    describe('invalid reasons', () => {
      test('should return valid:false for empty string', () => {
        const result = validateSuspensionReason('');
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe('INVALID_INPUT');
      });

      test('should return valid:false for null', () => {
        const result = validateSuspensionReason(null);
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe('INVALID_INPUT');
      });

      test('should return valid:false for undefined', () => {
        const result = validateSuspensionReason(undefined);
        expect(result.valid).toBe(false);
      });

      test('should return valid:false for number', () => {
        const result = validateSuspensionReason(123);
        expect(result.valid).toBe(false);
      });

      test('should return valid:false for whitespace only', () => {
        const result = validateSuspensionReason('   ');
        expect(result.valid).toBe(false);
      });

      test('should return valid:false for HTML tags only', () => {
        const result = validateSuspensionReason('<script></script>');
        expect(result.valid).toBe(false);
      });

      test('should return valid:false for reason too long', () => {
        const longReason = 'a'.repeat(501);
        const result = validateSuspensionReason(longReason);
        expect(result.valid).toBe(false);
        expect(result.error.message).toBe('Suspension reason is too long');
      });
    });

    describe('boundary cases', () => {
      test('should accept reason at max length', () => {
        const maxReason = 'a'.repeat(500);
        const result = validateSuspensionReason(maxReason);
        expect(result.valid).toBe(true);
      });

      test('should accept single character reason', () => {
        const result = validateSuspensionReason('x');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateReactivationNotes()', () => {
    describe('valid notes', () => {
      test('should return valid:true for valid notes', () => {
        const result = validateReactivationNotes('Dues paid in full');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('Dues paid in full');
      });

      test('should return valid:true with empty sanitized for null', () => {
        const result = validateReactivationNotes(null);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('');
      });

      test('should return valid:true with empty sanitized for undefined', () => {
        const result = validateReactivationNotes(undefined);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('');
      });

      test('should return valid:true with empty sanitized for empty string', () => {
        const result = validateReactivationNotes('');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('');
      });

      test('should sanitize HTML from notes', () => {
        const result = validateReactivationNotes('<b>Notes</b> here');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('Notes here');
      });
    });

    describe('invalid notes', () => {
      test('should return valid:false for notes too long', () => {
        const longNotes = 'a'.repeat(1001);
        const result = validateReactivationNotes(longNotes);
        expect(result.valid).toBe(false);
        expect(result.error.message).toBe('Reactivation notes are too long');
      });
    });

    describe('boundary cases', () => {
      test('should accept notes at max length', () => {
        const maxNotes = 'a'.repeat(1000);
        const result = validateReactivationNotes(maxNotes);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('buildErrorResponse()', () => {
    test('should build correct error structure', () => {
      const result = buildErrorResponse(400, 'INVALID_INPUT', 'Invalid data');
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe('INVALID_INPUT');
      expect(result.body.message).toBe('Invalid data');
    });

    test('should handle 404 status', () => {
      const result = buildErrorResponse(404, 'NOT_FOUND', 'Resource not found');
      expect(result.status).toBe(404);
      expect(result.body.error).toBe('NOT_FOUND');
    });

    test('should handle 403 status', () => {
      const result = buildErrorResponse(403, 'FORBIDDEN', 'Access denied');
      expect(result.status).toBe(403);
      expect(result.body.error).toBe('FORBIDDEN');
    });

    test('should handle 500 status', () => {
      const result = buildErrorResponse(500, 'SERVER_ERROR', 'Internal error');
      expect(result.status).toBe(500);
      expect(result.body.error).toBe('SERVER_ERROR');
    });
  });

  describe('buildSuccessResponse()', () => {
    test('should build correct success structure', () => {
      const data = { id: '123', name: 'Test' };
      const result = buildSuccessResponse(data, 'Operation successful');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation successful');
      expect(result.data).toEqual(data);
    });

    test('should handle null data', () => {
      const result = buildSuccessResponse(null, 'Deleted');
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = buildSuccessResponse(data, 'List retrieved');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should handle empty object data', () => {
      const result = buildSuccessResponse({}, 'Empty result');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });
  });
});
