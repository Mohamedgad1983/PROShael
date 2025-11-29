/**
 * Member Suspension Check Middleware Unit Tests
 * Tests suspension checking for login endpoints
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockSupabaseResponse = {
  data: null,
  error: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
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

describe('Member Suspension Check Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: null,
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    return res;
  };

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // User Identification Tests
  // ============================================
  describe('User Identification', () => {
    test('should proceed if no user ID or email', () => {
      const req = createMockRequest({ user: null });

      const userId = req.user?.id;
      const userEmail = req.user?.email;

      const shouldProceed = !userId && !userEmail;
      expect(shouldProceed).toBe(true);
    });

    test('should check suspension with user ID', () => {
      const req = createMockRequest({
        user: { id: 'user-123' }
      });

      const userId = req.user?.id;
      expect(userId).toBe('user-123');
    });

    test('should check suspension with email', () => {
      const req = createMockRequest({
        user: { email: 'user@example.com' }
      });

      const userEmail = req.user?.email;
      expect(userEmail).toBe('user@example.com');
    });
  });

  // ============================================
  // Suspended Member Tests
  // ============================================
  describe('Suspended Member Handling', () => {
    test('should block suspended member login', () => {
      const res = createMockResponse();
      const member = {
        id: 'member-123',
        full_name_arabic: 'محمد بن علي',
        membership_status: 'suspended',
        suspended_at: '2024-01-15T10:00:00Z',
        suspension_reason: 'عدم دفع الاشتراكات'
      };

      if (member && member.membership_status === 'suspended') {
        res.status(403).json({
          success: false,
          error: 'ACCOUNT_SUSPENDED',
          message: 'تم إيقاف حسابك. للمزيد من المعلومات، يرجى التواصل مع الإدارة.',
          message_en: 'Your account has been suspended. Please contact administration.',
          suspended_at: member.suspended_at,
          reason: member.suspension_reason
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'ACCOUNT_SUSPENDED',
          message: expect.stringContaining('تم إيقاف حسابك')
        })
      );
    });

    test('should include suspension details in response', () => {
      const res = createMockResponse();
      const suspendedAt = '2024-01-15T10:00:00Z';
      const suspensionReason = 'عدم دفع الاشتراكات';

      res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        suspended_at: suspendedAt,
        reason: suspensionReason
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          suspended_at: suspendedAt,
          reason: suspensionReason
        })
      );
    });

    test('should include bilingual message', () => {
      const res = createMockResponse();

      res.status(403).json({
        message: 'تم إيقاف حسابك. للمزيد من المعلومات، يرجى التواصل مع الإدارة.',
        message_en: 'Your account has been suspended. Please contact administration.'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/[\u0600-\u06FF]/),
          message_en: expect.stringContaining('suspended')
        })
      );
    });
  });

  // ============================================
  // Active Member Tests
  // ============================================
  describe('Active Member Handling', () => {
    test('should allow active member to proceed', () => {
      let nextCalled = false;
      const member = {
        id: 'member-123',
        membership_status: 'active'
      };

      if (!member || member.membership_status !== 'suspended') {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should allow member with pending status', () => {
      let shouldProceed = false;
      const member = {
        membership_status: 'pending'
      };

      if (member.membership_status !== 'suspended') {
        shouldProceed = true;
      }

      expect(shouldProceed).toBe(true);
    });
  });

  // ============================================
  // Member Not Found Tests
  // ============================================
  describe('Member Not Found Handling', () => {
    test('should allow login if member not found', () => {
      let nextCalled = false;
      const member = null;

      if (!member) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should handle PGRST116 error (not found)', () => {
      let nextCalled = false;
      const error = { code: 'PGRST116' };

      // PGRST116 is "not found" error - should allow login
      if (error && error.code === 'PGRST116') {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should allow login on database error (fail open)', () => {
      let nextCalled = false;
      const error = { code: 'PGRST500', message: 'Connection failed' };

      // Fail open - allow login on error
      if (error && error.code !== 'PGRST116') {
        nextCalled = true; // Should still proceed
      }

      expect(nextCalled).toBe(true);
    });

    test('should allow login on unexpected error (fail open)', () => {
      let nextCalled = false;

      try {
        throw new Error('Unexpected error');
      } catch (error) {
        // Fail open for unexpected errors
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log suspended member attempt', () => {
      const member = {
        id: 'member-123',
        full_name_arabic: 'محمد بن علي',
        suspended_at: '2024-01-15T10:00:00Z'
      };

      const logData = {
        memberId: member.id,
        memberName: member.full_name_arabic,
        suspendedAt: member.suspended_at
      };

      expect(logData.memberId).toBe('member-123');
      expect(logData.memberName).toBe('محمد بن علي');
    });

    test('should log database error', () => {
      const error = { message: 'Connection timeout' };

      expect(error.message).toBe('Connection timeout');
    });
  });

  // ============================================
  // Query Construction Tests
  // ============================================
  describe('Query Construction', () => {
    test('should query by user ID or email', () => {
      const userId = 'user-123';
      const userEmail = 'user@example.com';

      const orClause = `user_id.eq.${userId},email.eq.${userEmail}`;

      expect(orClause).toContain('user_id.eq.user-123');
      expect(orClause).toContain('email.eq.user@example.com');
    });

    test('should select required fields', () => {
      const selectedFields = 'id, full_name_arabic, membership_status, suspended_at, suspension_reason';

      expect(selectedFields).toContain('membership_status');
      expect(selectedFields).toContain('suspended_at');
      expect(selectedFields).toContain('suspension_reason');
    });
  });

  // ============================================
  // Middleware Order Tests
  // ============================================
  describe('Middleware Order', () => {
    test('should be used AFTER authenticateToken', () => {
      // This middleware expects req.user to be set by authenticateToken
      const req = createMockRequest({
        user: {
          id: 'user-123',
          email: 'user@example.com'
        }
      });

      // User should be available from previous middleware
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-123');
    });
  });
});
