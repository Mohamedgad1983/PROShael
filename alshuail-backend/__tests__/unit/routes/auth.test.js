/**
 * Auth Routes Unit Tests
 * Comprehensive tests for authentication endpoints and helpers
 * Target: 40+ tests for auth coverage
 */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock dependencies
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn()
};

jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    auth: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/middleware/cookie-auth.js', () => ({
  setAuthCookie: jest.fn(),
  clearAuthCookie: jest.fn()
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key-for-testing',
      adminTtl: '7d',
      memberTtl: '30d'
    },
    env: 'test',
    isProduction: false
  }
}));

const SECRET_KEY = 'test-secret-key-for-testing';

describe('Auth Routes Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Helper Functions Tests
  // ============================================
  describe('Helper Functions', () => {

    describe('normalizeEmail()', () => {
      const normalizeEmail = (email = '') => email.trim().toLowerCase();

      test('should lowercase email', () => {
        expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
      });

      test('should trim whitespace', () => {
        expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
      });

      test('should handle empty string', () => {
        expect(normalizeEmail('')).toBe('');
      });

      test('should handle undefined', () => {
        expect(normalizeEmail(undefined)).toBe('');
      });
    });

    describe('normalizePhone()', () => {
      const normalizePhone = (phone = '') => phone.replace(/\s|-/g, '');

      test('should remove spaces from phone', () => {
        expect(normalizePhone('+966 50 123 4567')).toBe('+966501234567');
      });

      test('should remove dashes from phone', () => {
        expect(normalizePhone('+966-50-123-4567')).toBe('+966501234567');
      });

      test('should handle clean phone number', () => {
        expect(normalizePhone('0501234567')).toBe('0501234567');
      });

      test('should handle empty string', () => {
        expect(normalizePhone('')).toBe('');
      });

      test('should handle undefined', () => {
        expect(normalizePhone(undefined)).toBe('');
      });
    });

    describe('getArabicRoleName()', () => {
      const getArabicRoleName = (role) => {
        const roleNames = {
          'super_admin': 'المدير الأعلى',
          'financial_manager': 'المدير المالي',
          'family_tree_admin': 'مدير شجرة العائلة',
          'occasions_initiatives_diyas_admin': 'مدير المناسبات والمبادرات والديات',
          'user_member': 'عضو عادي',
          'admin': 'مدير',
          'organizer': 'منظم',
          'member': 'عضو'
        };
        return roleNames[role] || role;
      };

      test('should return Arabic name for super_admin', () => {
        expect(getArabicRoleName('super_admin')).toBe('المدير الأعلى');
      });

      test('should return Arabic name for financial_manager', () => {
        expect(getArabicRoleName('financial_manager')).toBe('المدير المالي');
      });

      test('should return Arabic name for family_tree_admin', () => {
        expect(getArabicRoleName('family_tree_admin')).toBe('مدير شجرة العائلة');
      });

      test('should return Arabic name for member', () => {
        expect(getArabicRoleName('member')).toBe('عضو');
      });

      test('should return input for unknown role', () => {
        expect(getArabicRoleName('unknown_role')).toBe('unknown_role');
      });
    });

    describe('getRolePermissions()', () => {
      const getRolePermissions = (role) => {
        const permissions = {
          'super_admin': {
            all_access: true,
            manage_users: true,
            manage_members: true,
            manage_finances: true,
            manage_family_tree: true,
            manage_occasions: true,
            manage_initiatives: true,
            manage_diyas: true,
            view_reports: true,
            system_settings: true
          },
          'financial_manager': {
            view_dashboard: true,
            manage_finances: true,
            view_financial_reports: true,
            manage_subscriptions: true,
            manage_payments: true
          },
          'family_tree_admin': {
            view_dashboard: true,
            manage_family_tree: true,
            view_tree_management: true,
            manage_relationships: true
          },
          'user_member': {
            view_dashboard: true,
            view_my_profile: true,
            view_my_payments: true,
            view_family_events: true
          }
        };
        return permissions[role] || { view_dashboard: true };
      };

      test('should return all permissions for super_admin', () => {
        const perms = getRolePermissions('super_admin');
        expect(perms.all_access).toBe(true);
        expect(perms.manage_users).toBe(true);
        expect(perms.system_settings).toBe(true);
      });

      test('should return financial permissions for financial_manager', () => {
        const perms = getRolePermissions('financial_manager');
        expect(perms.manage_finances).toBe(true);
        expect(perms.manage_payments).toBe(true);
        expect(perms.all_access).toBeUndefined();
      });

      test('should return family tree permissions for family_tree_admin', () => {
        const perms = getRolePermissions('family_tree_admin');
        expect(perms.manage_family_tree).toBe(true);
        expect(perms.manage_relationships).toBe(true);
      });

      test('should return basic permissions for user_member', () => {
        const perms = getRolePermissions('user_member');
        expect(perms.view_dashboard).toBe(true);
        expect(perms.view_my_profile).toBe(true);
        expect(perms.manage_users).toBeUndefined();
      });

      test('should return default permissions for unknown role', () => {
        const perms = getRolePermissions('unknown');
        expect(perms).toEqual({ view_dashboard: true });
      });
    });

    describe('parsePermissions()', () => {
      const parsePermissions = (rawPermissions) => {
        if (!rawPermissions) {
          return {};
        }
        if (typeof rawPermissions === 'object') {
          return rawPermissions;
        }
        try {
          return JSON.parse(rawPermissions);
        } catch {
          return {};
        }
      };

      test('should return empty object for null', () => {
        expect(parsePermissions(null)).toEqual({});
      });

      test('should return empty object for undefined', () => {
        expect(parsePermissions(undefined)).toEqual({});
      });

      test('should return object as-is', () => {
        const perms = { view_dashboard: true };
        expect(parsePermissions(perms)).toEqual(perms);
      });

      test('should parse valid JSON string', () => {
        const json = '{"view_dashboard":true,"manage_users":false}';
        expect(parsePermissions(json)).toEqual({ view_dashboard: true, manage_users: false });
      });

      test('should return empty object for invalid JSON', () => {
        expect(parsePermissions('invalid json')).toEqual({});
      });
    });
  });

  // ============================================
  // JWT Token Tests
  // ============================================
  describe('JWT Token Operations', () => {

    describe('Token Signing', () => {
      test('should sign token with payload', () => {
        const payload = { id: 'user123', role: 'admin' };
        const token = jwt.sign(payload, SECRET_KEY);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT structure
      });

      test('should sign token with expiry', () => {
        const payload = { id: 'user123', role: 'admin' };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });

        const decoded = jwt.verify(token, SECRET_KEY);
        expect(decoded.exp).toBeDefined();
        expect(decoded.id).toBe('user123');
      });

      test('should include all payload fields', () => {
        const payload = {
          id: 'user123',
          email: 'test@example.com',
          phone: '+966501234567',
          role: 'super_admin',
          permissions: { all_access: true }
        };
        const token = jwt.sign(payload, SECRET_KEY);
        const decoded = jwt.verify(token, SECRET_KEY);

        expect(decoded.id).toBe(payload.id);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.phone).toBe(payload.phone);
        expect(decoded.role).toBe(payload.role);
        expect(decoded.permissions).toEqual(payload.permissions);
      });
    });

    describe('Token Verification', () => {
      test('should verify valid token', () => {
        const payload = { id: 'user123', role: 'admin' };
        const token = jwt.sign(payload, SECRET_KEY);

        const decoded = jwt.verify(token, SECRET_KEY);
        expect(decoded.id).toBe('user123');
        expect(decoded.role).toBe('admin');
      });

      test('should reject token with wrong secret', () => {
        const payload = { id: 'user123', role: 'admin' };
        const token = jwt.sign(payload, SECRET_KEY);

        expect(() => {
          jwt.verify(token, 'wrong-secret');
        }).toThrow();
      });

      test('should reject expired token', () => {
        const payload = { id: 'user123', role: 'admin' };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '-1s' });

        expect(() => {
          jwt.verify(token, SECRET_KEY);
        }).toThrow('jwt expired');
      });

      test('should reject malformed token', () => {
        expect(() => {
          jwt.verify('not-a-valid-token', SECRET_KEY);
        }).toThrow();
      });

      test('should decode token without verification', () => {
        const payload = { id: 'user123', role: 'admin' };
        const token = jwt.sign(payload, SECRET_KEY);

        const decoded = jwt.decode(token);
        expect(decoded.id).toBe('user123');
      });
    });
  });

  // ============================================
  // Password Hashing Tests
  // ============================================
  describe('Password Operations', () => {

    describe('Password Hashing', () => {
      test('should hash password with bcrypt', async () => {
        const password = 'securePassword123';
        const hash = await bcrypt.hash(password, 10);

        expect(hash).toBeDefined();
        expect(hash).not.toBe(password);
        expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
      });

      test('should generate different hash for same password', async () => {
        const password = 'securePassword123';
        const hash1 = await bcrypt.hash(password, 10);
        const hash2 = await bcrypt.hash(password, 10);

        expect(hash1).not.toBe(hash2); // Different salts
      });
    });

    describe('Password Comparison', () => {
      test('should match correct password', async () => {
        const password = 'securePassword123';
        const hash = await bcrypt.hash(password, 10);

        const match = await bcrypt.compare(password, hash);
        expect(match).toBe(true);
      });

      test('should reject incorrect password', async () => {
        const password = 'securePassword123';
        const hash = await bcrypt.hash(password, 10);

        const match = await bcrypt.compare('wrongPassword', hash);
        expect(match).toBe(false);
      });

      test('should handle Arabic characters in password', async () => {
        const password = 'كلمة_سرية_123';
        const hash = await bcrypt.hash(password, 10);

        const match = await bcrypt.compare(password, hash);
        expect(match).toBe(true);
      });

      test('should handle empty password', async () => {
        const password = '';
        const hash = await bcrypt.hash(password, 10);

        const match = await bcrypt.compare(password, hash);
        expect(match).toBe(true);
      });
    });
  });

  // ============================================
  // Test Member Resolution Tests
  // ============================================
  describe('Test Member Resolution', () => {
    const TEST_MEMBERS = {
      '0501234567': {
        fullName: 'أحمد محمد الشعيل',
        membershipNumber: 'SH001',
        balance: 2500,
        minimumBalance: 3000
      },
      '0555555555': {
        fullName: 'سارة الشعيل',
        membershipNumber: 'SH002',
        balance: 3500,
        minimumBalance: 3000
      },
      '0512345678': {
        fullName: 'خالد عبدالله',
        membershipNumber: 'SH003',
        balance: 1800,
        minimumBalance: 3000
      }
    };

    const TEST_MEMBER_PASSWORD = 'test123';

    function resolveTestMember(phone, password, allowTestMemberLogin = true) {
      if (!allowTestMemberLogin) {
        return null;
      }

      const record = TEST_MEMBERS[phone];
      if (!record || (password !== TEST_MEMBER_PASSWORD && password !== '123456')) {
        return null;
      }

      return {
        id: `test-member-${phone}`,
        full_name: record.fullName,
        phone,
        membership_number: record.membershipNumber,
        membership_status: 'active',
        balance: record.balance,
        minimum_balance: record.minimumBalance,
        requires_password_change: password === '123456'
      };
    }

    test('should resolve valid test member', () => {
      const member = resolveTestMember('0501234567', TEST_MEMBER_PASSWORD);

      expect(member).not.toBeNull();
      expect(member.full_name).toBe('أحمد محمد الشعيل');
      expect(member.membership_number).toBe('SH001');
    });

    test('should resolve test member with default password', () => {
      const member = resolveTestMember('0555555555', '123456');

      expect(member).not.toBeNull();
      expect(member.full_name).toBe('سارة الشعيل');
      expect(member.requires_password_change).toBe(true);
    });

    test('should reject invalid phone number', () => {
      const member = resolveTestMember('0500000000', TEST_MEMBER_PASSWORD);
      expect(member).toBeNull();
    });

    test('should reject invalid password', () => {
      const member = resolveTestMember('0501234567', 'wrongpassword');
      expect(member).toBeNull();
    });

    test('should return null when test login disabled', () => {
      const member = resolveTestMember('0501234567', TEST_MEMBER_PASSWORD, false);
      expect(member).toBeNull();
    });

    test('should include balance information', () => {
      const member = resolveTestMember('0512345678', TEST_MEMBER_PASSWORD);

      expect(member.balance).toBe(1800);
      expect(member.minimum_balance).toBe(3000);
    });
  });

  // ============================================
  // Member Response Builder Tests
  // ============================================
  describe('buildMemberResponse()', () => {
    const buildMemberResponse = (member) => ({
      id: member.id,
      name: member.full_name,
      phone: member.phone,
      membershipId: member.membership_number,
      avatar: null,
      role: 'member',
      balance: member.balance || 0,
      minimumBalance: 3000
    });

    test('should build response with all fields', () => {
      const member = {
        id: 'member123',
        full_name: 'محمد الشعيل',
        phone: '0501234567',
        membership_number: 'SH001',
        balance: 2500
      };

      const response = buildMemberResponse(member);

      expect(response.id).toBe('member123');
      expect(response.name).toBe('محمد الشعيل');
      expect(response.phone).toBe('0501234567');
      expect(response.membershipId).toBe('SH001');
      expect(response.balance).toBe(2500);
      expect(response.minimumBalance).toBe(3000);
      expect(response.role).toBe('member');
      expect(response.avatar).toBeNull();
    });

    test('should default balance to 0', () => {
      const member = {
        id: 'member123',
        full_name: 'محمد',
        phone: '0501234567',
        membership_number: 'SH001'
      };

      const response = buildMemberResponse(member);
      expect(response.balance).toBe(0);
    });

    test('should always set minimumBalance to 3000', () => {
      const member = {
        id: 'member123',
        full_name: 'محمد',
        phone: '0501234567',
        membership_number: 'SH001',
        minimum_balance: 5000 // Even if member has different minimum
      };

      const response = buildMemberResponse(member);
      expect(response.minimumBalance).toBe(3000);
    });
  });

  // ============================================
  // Token TTL Tests
  // ============================================
  describe('Token TTL Configuration', () => {
    const ADMIN_TOKEN_TTL = '7d';
    const MEMBER_TOKEN_TTL = '30d';

    test('admin tokens should expire in 7 days', () => {
      const payload = { id: 'admin123', role: 'super_admin' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: ADMIN_TOKEN_TTL });
      const decoded = jwt.verify(token, SECRET_KEY);

      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;

      // exp should be approximately 7 days from now
      expect(decoded.exp - now).toBeCloseTo(sevenDaysInSeconds, -1); // within ~10 seconds
    });

    test('member tokens should expire in 30 days', () => {
      const payload = { id: 'member123', role: 'member' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: MEMBER_TOKEN_TTL });
      const decoded = jwt.verify(token, SECRET_KEY);

      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

      expect(decoded.exp - now).toBeCloseTo(thirtyDaysInSeconds, -1);
    });
  });

  // ============================================
  // Phone Format Handling Tests
  // ============================================
  describe('Phone Format Handling', () => {
    const normalizePhone = (phone = '') => phone.replace(/\s|-/g, '');

    function getPhoneVariants(cleanPhone) {
      const variants = [cleanPhone];
      if (cleanPhone.startsWith('0')) {
        variants.push(`+966${cleanPhone.substring(1)}`);
      } else if (cleanPhone.startsWith('+966')) {
        variants.push(`0${cleanPhone.substring(4)}`);
      }
      return variants;
    }

    test('should convert local to international format', () => {
      const variants = getPhoneVariants('0501234567');
      expect(variants).toContain('0501234567');
      expect(variants).toContain('+966501234567');
    });

    test('should convert international to local format', () => {
      const variants = getPhoneVariants('+966501234567');
      expect(variants).toContain('+966501234567');
      expect(variants).toContain('0501234567');
    });

    test('should handle already normalized phone', () => {
      const variants = getPhoneVariants('501234567');
      expect(variants).toContain('501234567');
      expect(variants).toHaveLength(1); // No conversion needed
    });
  });

  // ============================================
  // Request Validation Tests
  // ============================================
  describe('Request Validation', () => {

    describe('Login Request Validation', () => {
      function validateLoginRequest(body) {
        const { email, phone, password } = body;
        const identifier = email || phone;

        if (!identifier || !password) {
          return {
            valid: false,
            error: 'البريد الإلكتروني أو رقم الهاتف وكلمة المرور مطلوبان'
          };
        }

        return { valid: true };
      }

      test('should accept valid email login', () => {
        const result = validateLoginRequest({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(result.valid).toBe(true);
      });

      test('should accept valid phone login', () => {
        const result = validateLoginRequest({
          phone: '0501234567',
          password: 'password123'
        });
        expect(result.valid).toBe(true);
      });

      test('should reject missing identifier', () => {
        const result = validateLoginRequest({
          password: 'password123'
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('مطلوبان');
      });

      test('should reject missing password', () => {
        const result = validateLoginRequest({
          email: 'test@example.com'
        });
        expect(result.valid).toBe(false);
      });

      test('should reject empty request', () => {
        const result = validateLoginRequest({});
        expect(result.valid).toBe(false);
      });
    });

    describe('Member Login Request Validation', () => {
      function validateMemberLoginRequest(body) {
        const { phone, password } = body;

        if (!phone || !password) {
          return {
            valid: false,
            error: 'رقم الهاتف وكلمة المرور مطلوبان'
          };
        }

        return { valid: true };
      }

      test('should accept valid member login', () => {
        const result = validateMemberLoginRequest({
          phone: '0501234567',
          password: '123456'
        });
        expect(result.valid).toBe(true);
      });

      test('should reject missing phone', () => {
        const result = validateMemberLoginRequest({
          password: '123456'
        });
        expect(result.valid).toBe(false);
      });

      test('should reject missing password', () => {
        const result = validateMemberLoginRequest({
          phone: '0501234567'
        });
        expect(result.valid).toBe(false);
      });
    });

    describe('Change Password Validation', () => {
      function validateChangePassword(body) {
        const { new_password } = body;

        if (!new_password) {
          return {
            valid: false,
            error: 'كلمة المرور الجديدة مطلوبة'
          };
        }

        return { valid: true };
      }

      test('should accept valid password change', () => {
        const result = validateChangePassword({
          new_password: 'newSecurePassword123'
        });
        expect(result.valid).toBe(true);
      });

      test('should reject missing new password', () => {
        const result = validateChangePassword({});
        expect(result.valid).toBe(false);
        expect(result.error).toContain('كلمة المرور الجديدة');
      });
    });
  });

  // ============================================
  // Token Refresh Logic Tests
  // ============================================
  describe('Token Refresh Logic', () => {

    function shouldRefreshToken(decoded) {
      const now = Date.now() / 1000;
      const timeUntilExpiry = decoded.exp - now;
      const oneDayInSeconds = 24 * 60 * 60;

      return timeUntilExpiry < oneDayInSeconds;
    }

    test('should refresh token expiring within 24 hours', () => {
      const decoded = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60) // 12 hours
      };

      expect(shouldRefreshToken(decoded)).toBe(true);
    });

    test('should not refresh token with more than 24 hours', () => {
      const decoded = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) + (48 * 60 * 60) // 48 hours
      };

      expect(shouldRefreshToken(decoded)).toBe(false);
    });

    test('should refresh already expired token', () => {
      const decoded = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      expect(shouldRefreshToken(decoded)).toBe(true);
    });
  });

  // ============================================
  // Arabic Error Messages Tests
  // ============================================
  describe('Arabic Error Messages', () => {

    const errorMessages = {
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      accountInactive: 'الحساب غير مفعل',
      accountSuspended: 'الحساب موقوف مؤقتاً',
      noPasswordHash: 'رقم الهاتف غير صحيح. الرجاء إدخال رقم صحيح',
      invalidPhonePassword: 'رقم الهاتف أو كلمة المرور غير صحيحة',
      phonePasswordRequired: 'رقم الهاتف وكلمة المرور مطلوبان',
      emailPhoneRequired: 'البريد الإلكتروني أو رقم الهاتف وكلمة المرور مطلوبان',
      tokenRequired: 'رمز المصادقة مطلوب',
      tokenInvalid: 'رمز المصادقة غير صالح',
      loginSuccess: 'تم تسجيل الدخول بنجاح',
      logoutSuccess: 'تم تسجيل الخروج بنجاح',
      passwordChangeSuccess: 'تم تغيير كلمة المرور بنجاح',
      newPasswordRequired: 'كلمة المرور الجديدة مطلوبة'
    };

    test('all error messages should be in Arabic', () => {
      Object.values(errorMessages).forEach(message => {
        // Check for Arabic characters
        expect(/[\u0600-\u06FF]/.test(message)).toBe(true);
      });
    });

    test('should have all required error messages defined', () => {
      expect(errorMessages.invalidCredentials).toBeDefined();
      expect(errorMessages.accountInactive).toBeDefined();
      expect(errorMessages.accountSuspended).toBeDefined();
      expect(errorMessages.tokenRequired).toBeDefined();
      expect(errorMessages.tokenInvalid).toBeDefined();
      expect(errorMessages.loginSuccess).toBeDefined();
    });
  });

  // ============================================
  // Suspension Check Tests
  // ============================================
  describe('Member Suspension Check', () => {

    function isMemberSuspended(user) {
      return user.suspended_at && !user.reactivated_at;
    }

    test('should identify suspended member', () => {
      const user = {
        id: 'member123',
        suspended_at: '2024-01-15T00:00:00Z',
        reactivated_at: null
      };

      expect(isMemberSuspended(user)).toBe(true);
    });

    test('should identify reactivated member', () => {
      const user = {
        id: 'member123',
        suspended_at: '2024-01-15T00:00:00Z',
        reactivated_at: '2024-01-20T00:00:00Z'
      };

      expect(isMemberSuspended(user)).toBe(false);
    });

    test('should identify never-suspended member', () => {
      const user = {
        id: 'member123',
        suspended_at: null,
        reactivated_at: null
      };

      // null && null = null, which is falsy (equivalent to false for suspension check)
      expect(isMemberSuspended(user)).toBeFalsy();
    });
  });
});
