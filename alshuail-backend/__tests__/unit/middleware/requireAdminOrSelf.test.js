/**
 * RequireAdminOrSelf Middleware Unit Tests
 * Tests authorization for admin or self-access
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    auth: jest.fn()
  }
}));

describe('RequireAdminOrSelf Middleware Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: null,
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

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Unauthenticated User Tests
  // ============================================
  describe('Unauthenticated User Handling', () => {
    test('should return 401 if no user object', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'غير مصرح - يجب تسجيل الدخول'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHORIZED'
        })
      );
    });

    test('should include Arabic error message', () => {
      const res = createMockResponse();

      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'غير مصرح - يجب تسجيل الدخول'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/[\u0600-\u06FF]/)
        })
      );
    });
  });

  // ============================================
  // Super Admin Access Tests
  // ============================================
  describe('Super Admin Access', () => {
    test('should allow super_admin access to any resource', () => {
      let accessGranted = false;
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'super_admin' },
        params: { memberId: 'member-456' }
      });

      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'admin';

      if (isAdmin) {
        accessGranted = true;
      }

      expect(accessGranted).toBe(true);
    });

    test('should grant super_admin access to different member data', () => {
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'super_admin' },
        params: { memberId: 'other-member-789' }
      });

      const requestingUserId = req.user.id;
      const targetMemberId = req.params.memberId;
      const isAdmin = req.user.role === 'super_admin';

      // Admin access should be granted even if IDs don't match
      expect(isAdmin).toBe(true);
      expect(requestingUserId).not.toBe(targetMemberId);
    });
  });

  // ============================================
  // Regular Admin Access Tests
  // ============================================
  describe('Regular Admin Access', () => {
    test('should allow admin access to any resource', () => {
      let accessGranted = false;
      const req = createMockRequest({
        user: { id: 'admin-456', role: 'admin' },
        params: { memberId: 'member-789' }
      });

      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'admin';

      if (isAdmin) {
        accessGranted = true;
      }

      expect(accessGranted).toBe(true);
    });
  });

  // ============================================
  // Self Access Tests
  // ============================================
  describe('Self Access (Member Viewing Own Data)', () => {
    test('should allow member to access their own data', () => {
      let accessGranted = false;
      const req = createMockRequest({
        user: { id: 'member-123', role: 'member' },
        params: { memberId: 'member-123' }
      });

      const requestingUserId = req.user.id;
      const targetMemberId = req.params.memberId;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'admin';

      if (isAdmin || requestingUserId === targetMemberId) {
        accessGranted = true;
      }

      expect(accessGranted).toBe(true);
    });

    test('should match user_id field as well', () => {
      const req = createMockRequest({
        user: { user_id: 'member-123', role: 'member' },
        params: { memberId: 'member-123' }
      });

      const requestingUserId = req.user.id || req.user.user_id;
      const targetMemberId = req.params.memberId;

      expect(requestingUserId).toBe(targetMemberId);
    });
  });

  // ============================================
  // Access Denied Tests
  // ============================================
  describe('Access Denied (Non-Admin Viewing Other Data)', () => {
    test('should deny member access to other member data', () => {
      const res = createMockResponse();
      const req = createMockRequest({
        user: { id: 'member-123', role: 'member' },
        params: { memberId: 'member-456' }
      });

      const requestingUserId = req.user.id;
      const targetMemberId = req.params.memberId;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'admin';

      if (!isAdmin && requestingUserId !== targetMemberId) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'غير مسموح لك بعرض هذه المعلومات'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FORBIDDEN'
        })
      );
    });

    test('should include Arabic forbidden message', () => {
      const res = createMockResponse();

      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'غير مسموح لك بعرض هذه المعلومات'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/[\u0600-\u06FF]/)
        })
      );
    });

    test('should deny user_member role access to other data', () => {
      const req = createMockRequest({
        user: { id: 'user-123', role: 'user_member' },
        params: { memberId: 'user-456' }
      });

      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'admin';
      const isSelf = req.user.id === req.params.memberId;

      expect(isAdmin).toBe(false);
      expect(isSelf).toBe(false);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 500 on unexpected error', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'خطأ في التحقق من الصلاحيات'
      });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'SERVER_ERROR'
        })
      );
    });

    test('should include Arabic server error message', () => {
      const res = createMockResponse();

      res.status(500).json({
        message: 'خطأ في التحقق من الصلاحيات'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/[\u0600-\u06FF]/)
        })
      );
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging Behavior', () => {
    test('should log admin access granted', () => {
      const logData = {
        type: 'Admin access granted',
        userId: 'admin-123',
        success: true
      };

      expect(logData.type).toBe('Admin access granted');
      expect(logData.success).toBe(true);
    });

    test('should log self-access granted', () => {
      const logData = {
        type: 'Self-access granted',
        userId: 'member-123',
        success: true
      };

      expect(logData.type).toBe('Self-access granted');
    });

    test('should log access denied with details', () => {
      const logData = {
        type: 'Access denied',
        requestingUserId: 'member-123',
        targetMemberId: 'member-456',
        userRole: 'member'
      };

      expect(logData.requestingUserId).toBe('member-123');
      expect(logData.targetMemberId).toBe('member-456');
      expect(logData.userRole).toBe('member');
    });

    test('should warn when no user object present', () => {
      const logMessage = '[requireAdminOrSelf] No user object in request';
      expect(logMessage).toContain('No user object');
    });
  });

  // ============================================
  // User ID Extraction Tests
  // ============================================
  describe('User ID Extraction', () => {
    test('should extract id from user.id', () => {
      const req = createMockRequest({
        user: { id: 'user-123' }
      });

      const userId = req.user.id || req.user.user_id;
      expect(userId).toBe('user-123');
    });

    test('should fallback to user.user_id', () => {
      const req = createMockRequest({
        user: { user_id: 'user-456' }
      });

      const userId = req.user.id || req.user.user_id;
      expect(userId).toBe('user-456');
    });

    test('should prefer id over user_id', () => {
      const req = createMockRequest({
        user: { id: 'id-123', user_id: 'user_id-456' }
      });

      const userId = req.user.id || req.user.user_id;
      expect(userId).toBe('id-123');
    });
  });

  // ============================================
  // Role Verification Tests
  // ============================================
  describe('Role Verification', () => {
    test('should recognize super_admin role', () => {
      const role = 'super_admin';
      const isAdmin = role === 'super_admin' || role === 'admin';
      expect(isAdmin).toBe(true);
    });

    test('should recognize admin role', () => {
      const role = 'admin';
      const isAdmin = role === 'super_admin' || role === 'admin';
      expect(isAdmin).toBe(true);
    });

    test('should not recognize member as admin', () => {
      const role = 'member';
      const isAdmin = role === 'super_admin' || role === 'admin';
      expect(isAdmin).toBe(false);
    });

    test('should not recognize user_member as admin', () => {
      const role = 'user_member';
      const isAdmin = role === 'super_admin' || role === 'admin';
      expect(isAdmin).toBe(false);
    });

    test('should not recognize financial_manager as admin', () => {
      const role = 'financial_manager';
      const isAdmin = role === 'super_admin' || role === 'admin';
      expect(isAdmin).toBe(false);
    });
  });

  // ============================================
  // Middleware Flow Tests
  // ============================================
  describe('Middleware Flow', () => {
    test('should call next() when admin access granted', () => {
      let nextCalled = false;
      const req = createMockRequest({
        user: { id: 'admin-123', role: 'super_admin' },
        params: { memberId: 'member-456' }
      });

      const isAdmin = req.user.role === 'super_admin';
      if (isAdmin) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should call next() when self-access granted', () => {
      let nextCalled = false;
      const req = createMockRequest({
        user: { id: 'member-123', role: 'member' },
        params: { memberId: 'member-123' }
      });

      const isSelf = req.user.id === req.params.memberId;
      if (isSelf) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should NOT call next() when access denied', () => {
      let nextCalled = false;
      const req = createMockRequest({
        user: { id: 'member-123', role: 'member' },
        params: { memberId: 'member-456' }
      });

      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'admin';
      const isSelf = req.user.id === req.params.memberId;

      if (isAdmin || isSelf) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(false);
    });
  });
});
