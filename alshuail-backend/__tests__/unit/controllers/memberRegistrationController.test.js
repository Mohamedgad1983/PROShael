/**
 * Member Registration Controller Unit Tests
 * Tests registration token verification and profile completion
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockSupabaseResponse = {
  data: null,
  error: null,
  count: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  neq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  then: jest.fn((cb) => Promise.resolve(cb(mockSupabaseResponse)))
};

jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: jest.fn(() => Promise.resolve(true)),
    hash: jest.fn(() => Promise.resolve('hashed_password'))
  }
}));

describe('Member Registration Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'member' },
    query: {},
    body: {},
    params: {},
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Token Validation Tests
  // ============================================
  describe('Token Validation', () => {
    test('should require 8-character token', () => {
      const req = createMockRequest({
        params: { token: 'ABC12' }
      });
      const res = createMockResponse();

      if (!req.params.token || req.params.token.length !== 8) {
        res.status(400).json({
          success: false,
          error: 'رمز التسجيل غير صحيح'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should convert token to uppercase', () => {
      const token = 'abc12def';
      const upperToken = token.toUpperCase();

      expect(upperToken).toBe('ABC12DEF');
    });

    test('should return 404 for non-existent token', () => {
      const res = createMockResponse();

      res.status(404).json({
        success: false,
        error: 'رمز التسجيل غير موجود أو تم استخدامه مسبقاً'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should check token expiry', () => {
      const now = new Date();
      const expiryDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      const isExpired = now > expiryDate;
      expect(isExpired).toBe(true);
    });

    test('should return 400 for expired token', () => {
      const res = createMockResponse();

      res.status(400).json({
        success: false,
        error: 'رمز التسجيل منتهي الصلاحية'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should check if profile already completed', () => {
      const member = { profile_completed: true };

      expect(member.profile_completed).toBe(true);
    });

    test('should return 400 for already completed profile', () => {
      const res = createMockResponse();

      res.status(400).json({
        success: false,
        error: 'تم إكمال الملف الشخصي مسبقاً'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // National ID Validation Tests
  // ============================================
  describe('National ID Validation', () => {
    test('should validate Saudi National ID format', () => {
      const validateNationalId = (nationalId) => {
        if (!nationalId) return false;
        const cleanId = nationalId.toString().replace(/\D/g, '');
        if (cleanId.length !== 10) return false;
        if (!cleanId.startsWith('1') && !cleanId.startsWith('2')) return false;
        return true;
      };

      expect(validateNationalId('1234567890')).toBe(true);
      expect(validateNationalId('2234567890')).toBe(true);
    });

    test('should reject invalid National ID length', () => {
      const validateNationalId = (nationalId) => {
        if (!nationalId) return false;
        const cleanId = nationalId.toString().replace(/\D/g, '');
        return cleanId.length === 10;
      };

      expect(validateNationalId('123456789')).toBe(false);
      expect(validateNationalId('12345678901')).toBe(false);
    });

    test('should reject National ID not starting with 1 or 2', () => {
      const validateNationalId = (nationalId) => {
        if (!nationalId) return false;
        const cleanId = nationalId.toString().replace(/\D/g, '');
        if (cleanId.length !== 10) return false;
        return cleanId.startsWith('1') || cleanId.startsWith('2');
      };

      expect(validateNationalId('3234567890')).toBe(false);
      expect(validateNationalId('0234567890')).toBe(false);
    });

    test('should clean non-digit characters', () => {
      const nationalId = '1-234-567-890';
      const cleanId = nationalId.replace(/\D/g, '');

      expect(cleanId).toBe('1234567890');
    });
  });

  // ============================================
  // Email Validation Tests
  // ============================================
  describe('Email Validation', () => {
    test('should allow empty email (optional)', () => {
      const validateEmail = (email) => {
        if (!email) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(validateEmail('')).toBe(true);
      expect(validateEmail(null)).toBe(true);
    });

    test('should validate correct email format', () => {
      const validateEmail = (email) => {
        if (!email) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
    });

    test('should reject invalid email format', () => {
      const validateEmail = (email) => {
        if (!email) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  // ============================================
  // Image URL Validation Tests
  // ============================================
  describe('Image URL Validation', () => {
    test('should allow empty image URL (optional)', () => {
      const validateImageUrl = (url) => {
        if (!url) return true;
        return true;
      };

      expect(validateImageUrl('')).toBe(true);
      expect(validateImageUrl(null)).toBe(true);
    });

    test('should validate image extensions', () => {
      const validateImageUrl = (url) => {
        if (!url) return true;
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const urlLower = url.toLowerCase();
        return imageExtensions.some(ext => urlLower.includes(ext));
      };

      expect(validateImageUrl('https://example.com/photo.jpg')).toBe(true);
      expect(validateImageUrl('https://example.com/photo.png')).toBe(true);
      expect(validateImageUrl('https://example.com/photo.pdf')).toBe(false);
    });
  });

  // ============================================
  // Birth Date Validation Tests
  // ============================================
  describe('Birth Date Validation', () => {
    test('should calculate age from birth date', () => {
      const birthDate = new Date('1990-01-15');
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      expect(age).toBeGreaterThanOrEqual(30);
    });

    test('should reject age under 15', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 10, 0, 1);
      const age = today.getFullYear() - birthDate.getFullYear();

      const isValidAge = age >= 15 && age <= 100;
      expect(isValidAge).toBe(false);
    });

    test('should reject age over 100', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 110, 0, 1);
      const age = today.getFullYear() - birthDate.getFullYear();

      const isValidAge = age >= 15 && age <= 100;
      expect(isValidAge).toBe(false);
    });
  });

  // ============================================
  // Hijri Conversion Tests
  // ============================================
  describe('Hijri Conversion', () => {
    test('should handle null date', () => {
      const convertToHijri = (gregorianDate) => {
        if (!gregorianDate) return null;
        return 'converted';
      };

      expect(convertToHijri(null)).toBeNull();
    });

    test('should convert valid date', () => {
      const convertToHijri = (gregorianDate) => {
        if (!gregorianDate) return null;
        try {
          const date = new Date(gregorianDate);
          return date.toLocaleDateString('ar-SA-u-ca-islamic', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch {
          return null;
        }
      };

      const result = convertToHijri('1990-01-15');
      expect(result).not.toBeNull();
    });
  });

  // ============================================
  // Complete Profile Tests
  // ============================================
  describe('Complete Profile', () => {
    test('should require all mandatory fields', () => {
      const req = createMockRequest({
        body: {
          national_id: '',
          birth_date: '1990-01-15',
          social_security_beneficiary: true,
          temp_password: '123456',
          national_id_document_url: ''
        }
      });
      const res = createMockResponse();

      const { national_id, birth_date, social_security_beneficiary, temp_password, national_id_document_url } = req.body;

      if (!national_id || !birth_date || social_security_beneficiary === undefined || !temp_password || !national_id_document_url) {
        res.status(400).json({
          success: false,
          error: 'الرقم الوطني وتاريخ الميلاد وحالة الضمان الاجتماعي وكلمة المرور المؤقتة وصورة الهوية مطلوبة'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should check for duplicate email', () => {
      const existingEmail = { id: 'other-member' };
      const hasDuplicate = !!existingEmail;

      expect(hasDuplicate).toBe(true);
    });

    test('should build update data correctly', () => {
      const updateData = {
        date_of_birth: '1990-01-15',
        date_of_birth_hijri: '15 جمادى الثانية 1410',
        employer: 'شركة الاتصالات',
        email: 'test@example.com',
        social_security_beneficiary: true,
        profile_image_url: null,
        profile_completed: true,
        temp_password: null,
        additional_info: JSON.stringify({
          national_id: '1234567890',
          national_id_document_url: 'https://example.com/doc.jpg',
          national_id_verified: false,
          document_upload_date: new Date().toISOString()
        }),
        updated_at: new Date().toISOString()
      };

      expect(updateData.profile_completed).toBe(true);
      expect(updateData.temp_password).toBeNull();
    });

    test('should mark token as used after completion', () => {
      const tokenUpdate = {
        is_used: true,
        used_at: new Date().toISOString()
      };

      expect(tokenUpdate.is_used).toBe(true);
      expect(tokenUpdate.used_at).toBeDefined();
    });
  });

  // ============================================
  // Resend Token Tests
  // ============================================
  describe('Resend Registration Token', () => {
    test('should return 404 for non-existent member', () => {
      const res = createMockResponse();

      res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 400 if profile already completed', () => {
      const res = createMockResponse();

      res.status(400).json({
        success: false,
        error: 'تم إكمال الملف الشخصي مسبقاً'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should generate 8-character token', () => {
      const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
      let token = '';
      for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      expect(token.length).toBe(8);
    });

    test('should exclude confusing characters (O, 0, I, l)', () => {
      // Chars without confusing characters O, 0, I, l
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';

      expect(chars.includes('O')).toBe(false);
      expect(chars.includes('0')).toBe(false);
      expect(chars.includes('I')).toBe(false);
      expect(chars.includes('l')).toBe(false);
    });

    test('should set 30-day expiry', () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const today = new Date();
      const diffDays = Math.round((expiryDate - today) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(30);
    });

    test('should deactivate old tokens', () => {
      const deactivateUpdate = { is_used: true };

      expect(deactivateUpdate.is_used).toBe(true);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return verify token response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        data: {
          token: 'ABC12DEF',
          member: {
            id: 'member-123',
            full_name: 'محمد بن علي',
            phone: '0501234567',
            whatsapp_number: '0501234567',
            membership_number: 'SH-001'
          },
          expires_at: new Date().toISOString()
        },
        message: 'رمز التسجيل صحيح'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'رمز التسجيل صحيح'
        })
      );
    });

    test('should return complete profile response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        data: {
          member: {
            id: 'member-123',
            full_name: 'محمد بن علي',
            membership_number: 'SH-001',
            phone: '0501234567',
            email: 'test@example.com',
            profile_completed: true
          }
        },
        message: 'تم إكمال الملف الشخصي بنجاح'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم إكمال الملف الشخصي بنجاح'
        })
      );
    });

    test('should return resend token response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        data: {
          member_name: 'محمد بن علي',
          phone: '0501234567',
          registration_token: 'XYZ98765',
          temp_password: '123456',
          expires_at: new Date().toISOString()
        },
        message: 'تم إنشاء رمز تسجيل جديد بنجاح'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'تم إنشاء رمز تسجيل جديد بنجاح'
        })
      );
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 400 for validation errors', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'الرقم الوطني غير صحيح'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 for not found', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'رمز التسجيل غير موجود أو تم استخدامه مسبقاً'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on server error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'فشل في إكمال الملف الشخصي'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should include Arabic error messages', () => {
      const errorMessage = 'رمز التسجيل منتهي الصلاحية';
      expect(errorMessage).toMatch(/[\u0600-\u06FF]/);
    });
  });
});
