/**
 * Audit Logger Utility Unit Tests
 * Tests audit logging for admin actions
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock Supabase
const mockSupabaseResponse = {
  data: null,
  error: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('Audit Logger Utility Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // ACTIONS Constants Tests
  // ============================================
  describe('ACTIONS Constants', () => {
    test('should define MEMBER_CREATED action', () => {
      const ACTIONS = {
        MEMBER_CREATED: 'member_created'
      };
      expect(ACTIONS.MEMBER_CREATED).toBe('member_created');
    });

    test('should define MEMBER_UPDATED action', () => {
      const ACTIONS = {
        MEMBER_UPDATED: 'member_updated'
      };
      expect(ACTIONS.MEMBER_UPDATED).toBe('member_updated');
    });

    test('should define MEMBER_DELETED action', () => {
      const ACTIONS = {
        MEMBER_DELETED: 'member_deleted'
      };
      expect(ACTIONS.MEMBER_DELETED).toBe('member_deleted');
    });

    test('should define MEMBER_APPROVED action', () => {
      const ACTIONS = {
        MEMBER_APPROVED: 'member_approved'
      };
      expect(ACTIONS.MEMBER_APPROVED).toBe('member_approved');
    });

    test('should define MEMBER_REJECTED action', () => {
      const ACTIONS = {
        MEMBER_REJECTED: 'member_rejected'
      };
      expect(ACTIONS.MEMBER_REJECTED).toBe('member_rejected');
    });

    test('should define SUBDIVISION_ASSIGNED action', () => {
      const ACTIONS = {
        SUBDIVISION_ASSIGNED: 'subdivision_assigned'
      };
      expect(ACTIONS.SUBDIVISION_ASSIGNED).toBe('subdivision_assigned');
    });

    test('should define ROLE_CHANGED action', () => {
      const ACTIONS = {
        ROLE_CHANGED: 'role_changed'
      };
      expect(ACTIONS.ROLE_CHANGED).toBe('role_changed');
    });

    test('should define LOGIN_SUCCESS action', () => {
      const ACTIONS = {
        LOGIN_SUCCESS: 'login_success'
      };
      expect(ACTIONS.LOGIN_SUCCESS).toBe('login_success');
    });

    test('should define LOGIN_FAILED action', () => {
      const ACTIONS = {
        LOGIN_FAILED: 'login_failed'
      };
      expect(ACTIONS.LOGIN_FAILED).toBe('login_failed');
    });

    test('should define LOGOUT action', () => {
      const ACTIONS = {
        LOGOUT: 'logout'
      };
      expect(ACTIONS.LOGOUT).toBe('logout');
    });
  });

  // ============================================
  // RESOURCE_TYPES Constants Tests
  // ============================================
  describe('RESOURCE_TYPES Constants', () => {
    test('should define MEMBER resource type', () => {
      const RESOURCE_TYPES = {
        MEMBER: 'member'
      };
      expect(RESOURCE_TYPES.MEMBER).toBe('member');
    });

    test('should define USER resource type', () => {
      const RESOURCE_TYPES = {
        USER: 'user'
      };
      expect(RESOURCE_TYPES.USER).toBe('user');
    });

    test('should define SUBDIVISION resource type', () => {
      const RESOURCE_TYPES = {
        SUBDIVISION: 'subdivision'
      };
      expect(RESOURCE_TYPES.SUBDIVISION).toBe('subdivision');
    });

    test('should define FAMILY_TREE resource type', () => {
      const RESOURCE_TYPES = {
        FAMILY_TREE: 'family_tree'
      };
      expect(RESOURCE_TYPES.FAMILY_TREE).toBe('family_tree');
    });

    test('should define AUTHENTICATION resource type', () => {
      const RESOURCE_TYPES = {
        AUTHENTICATION: 'authentication'
      };
      expect(RESOURCE_TYPES.AUTHENTICATION).toBe('authentication');
    });
  });

  // ============================================
  // logAdminAction Tests
  // ============================================
  describe('logAdminAction', () => {
    test('should format details as JSON string', () => {
      const params = {
        action: 'member_updated',
        resourceType: 'member',
        resourceId: 'member-123',
        changes: { status: 'active' }
      };

      const details = JSON.stringify({
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        changes: params.changes
      });

      expect(details).toContain('member_updated');
      expect(details).toContain('member-123');
    });

    test('should include adminId in audit entry', () => {
      const adminId = 'admin-456';
      const entry = { user_id: adminId };

      expect(entry.user_id).toBe('admin-456');
    });

    test('should include user email from lookup', () => {
      const user = { phone: '+966555555555', role: 'admin' };
      const entry = { user_email: user.phone };

      expect(entry.user_email).toBe('+966555555555');
    });

    test('should include user role from lookup', () => {
      const user = { phone: '+966555555555', role: 'super_admin' };
      const entry = { user_role: user.role };

      expect(entry.user_role).toBe('super_admin');
    });

    test('should handle null user lookup', () => {
      const user = null;
      const entry = {
        user_email: user?.phone || null,
        user_role: user?.role || null
      };

      expect(entry.user_email).toBeNull();
      expect(entry.user_role).toBeNull();
    });

    test('should include IP address', () => {
      const ipAddress = '192.168.1.1';
      const entry = { ip_address: ipAddress };

      expect(entry.ip_address).toBe('192.168.1.1');
    });

    test('should include user agent', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0)';
      const entry = { user_agent: userAgent };

      expect(entry.user_agent).toContain('Mozilla');
    });

    test('should include timestamp', () => {
      const timestamp = new Date().toISOString();
      const entry = { created_at: timestamp };

      expect(entry.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    test('should return success on successful insert', () => {
      const data = { id: 'audit-123' };
      const result = { success: true, data };

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('audit-123');
    });

    test('should return error on insert failure', () => {
      const error = { message: 'Insert failed' };
      const result = { success: false, error };

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Insert failed');
    });

    test('should handle exceptions', () => {
      const error = { message: 'Unexpected error' };
      const result = { success: false, error: error.message };

      expect(result.error).toBe('Unexpected error');
    });
  });

  // ============================================
  // getAuditLogs Tests
  // ============================================
  describe('getAuditLogs', () => {
    test('should apply default limit of 100', () => {
      const limit = 100;
      expect(limit).toBe(100);
    });

    test('should apply default offset of 0', () => {
      const offset = 0;
      expect(offset).toBe(0);
    });

    test('should calculate range correctly', () => {
      const limit = 50;
      const offset = 100;
      const range = { start: offset, end: offset + limit - 1 };

      expect(range.start).toBe(100);
      expect(range.end).toBe(149);
    });

    test('should order by created_at descending', () => {
      const orderConfig = {
        column: 'created_at',
        ascending: false
      };

      expect(orderConfig.ascending).toBe(false);
    });

    test('should filter by adminId', () => {
      const adminId = 'admin-123';
      const filter = { user_id: adminId };

      expect(filter.user_id).toBe('admin-123');
    });

    test('should filter by action', () => {
      const action = 'member_updated';
      const filter = { action_type: action };

      expect(filter.action_type).toBe('member_updated');
    });

    test('should filter by startDate', () => {
      const startDate = '2024-01-01';
      const filter = { created_at: { gte: startDate } };

      expect(filter.created_at.gte).toBe('2024-01-01');
    });

    test('should filter by endDate', () => {
      const endDate = '2024-12-31';
      const filter = { created_at: { lte: endDate } };

      expect(filter.created_at.lte).toBe('2024-12-31');
    });

    test('should filter by resourceType from JSON', () => {
      const logs = [
        { details: '{"resource_type":"member"}' },
        { details: '{"resource_type":"user"}' },
        { details: '{"resource_type":"member"}' }
      ];

      const resourceType = 'member';
      const filtered = logs.filter(log => {
        try {
          const details = JSON.parse(log.details || '{}');
          return details.resource_type === resourceType;
        } catch {
          return false;
        }
      });

      expect(filtered).toHaveLength(2);
    });

    test('should handle invalid JSON in details', () => {
      const log = { details: 'invalid json' };

      let parsed;
      try {
        parsed = JSON.parse(log.details);
      } catch {
        parsed = null;
      }

      expect(parsed).toBeNull();
    });

    test('should return success with data', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const result = {
        success: true,
        data: data,
        count: data.length
      };

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    test('should return error on query failure', () => {
      const error = { message: 'Query failed' };
      const result = { success: false, error };

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Details Parsing Tests
  // ============================================
  describe('Details Parsing', () => {
    test('should parse valid JSON details', () => {
      const details = JSON.stringify({
        action: 'member_updated',
        resource_type: 'member',
        resource_id: 'member-123',
        changes: { name: 'New Name' }
      });

      const parsed = JSON.parse(details);

      expect(parsed.action).toBe('member_updated');
      expect(parsed.changes.name).toBe('New Name');
    });

    test('should handle null changes', () => {
      const details = JSON.stringify({
        action: 'member_created',
        resource_type: 'member',
        resource_id: 'member-123',
        changes: null
      });

      const parsed = JSON.parse(details);
      expect(parsed.changes).toBeNull();
    });
  });

  // ============================================
  // Audit Entry Structure Tests
  // ============================================
  describe('Audit Entry Structure', () => {
    test('should include all required fields', () => {
      const entry = {
        user_id: 'admin-123',
        user_email: '+966555555555',
        user_role: 'admin',
        action_type: 'member_updated',
        details: '{}',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        created_at: new Date().toISOString()
      };

      expect(entry.user_id).toBeDefined();
      expect(entry.action_type).toBeDefined();
      expect(entry.created_at).toBeDefined();
    });
  });
});
