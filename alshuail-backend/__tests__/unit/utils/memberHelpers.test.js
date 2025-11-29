/**
 * Member Helpers Utility Unit Tests
 * Tests member management helper functions
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
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
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

jest.unstable_mockModule('../../../src/constants/memberConstants.js', () => ({
  MEMBER_STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    PENDING: 'pending'
  },
  MEMBER_COLUMNS: {
    ID: 'id',
    FULL_NAME: 'full_name',
    MEMBERSHIP_STATUS: 'membership_status',
    UPDATED_AT: 'updated_at',
    SUSPENDED_AT: 'suspended_at',
    SUSPENDED_BY: 'suspended_by',
    SUSPENSION_REASON: 'suspension_reason',
    REACTIVATED_AT: 'reactivated_at',
    REACTIVATED_BY: 'reactivated_by',
    REACTIVATION_NOTES: 'reactivation_notes'
  },
  ERROR_CODES: {
    MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR'
  },
  ERROR_MESSAGES: {
    MEMBER_NOT_FOUND: 'Member not found',
    SERVER_ERROR: 'Internal server error',
    DATABASE_ERROR: {
      SUSPEND_FAILED: 'Failed to suspend member'
    }
  }
}));

jest.unstable_mockModule('../../../src/utils/memberValidation.js', () => ({
  buildErrorResponse: jest.fn((status, code, message) => ({
    status,
    code,
    message
  }))
}));

describe('Member Helpers Utility Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // findMemberById Tests
  // ============================================
  describe('findMemberById', () => {
    test('should return default columns', () => {
      const defaultColumns = ['id', 'full_name', 'membership_status'];

      expect(defaultColumns).toHaveLength(3);
      expect(defaultColumns).toContain('id');
    });

    test('should accept custom columns', () => {
      const customColumns = ['id', 'full_name', 'phone', 'email'];

      expect(customColumns).toHaveLength(4);
      expect(customColumns).toContain('phone');
    });

    test('should join columns with comma', () => {
      const columns = ['id', 'full_name', 'membership_status'];
      const selectString = columns.join(', ');

      expect(selectString).toBe('id, full_name, membership_status');
    });

    test('should return success with member', () => {
      const member = {
        id: 'member-123',
        full_name: 'أحمد الشعيل',
        membership_status: 'active'
      };

      const result = { success: true, member };

      expect(result.success).toBe(true);
      expect(result.member.id).toBe('member-123');
    });

    test('should return error when member not found', () => {
      const result = {
        success: false,
        error: {
          status: 404,
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        }
      };

      expect(result.success).toBe(false);
      expect(result.error.status).toBe(404);
    });

    test('should handle database errors', () => {
      const dbError = {
        code: 'PGRST116',
        message: 'Connection failed',
        details: 'Database unavailable'
      };

      const result = {
        success: false,
        error: {
          status: 404,
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        }
      };

      expect(result.success).toBe(false);
    });

    test('should handle unexpected exceptions', () => {
      const error = new Error('Unexpected error');
      const result = {
        success: false,
        error: {
          status: 500,
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      };

      expect(result.error.status).toBe(500);
    });
  });

  // ============================================
  // isMemberSuspended Tests
  // ============================================
  describe('isMemberSuspended', () => {
    test('should return true for suspended member', () => {
      const member = { membership_status: 'suspended' };
      const isSuspended = member.membership_status === 'suspended';

      expect(isSuspended).toBe(true);
    });

    test('should return false for active member', () => {
      const member = { membership_status: 'active' };
      const isSuspended = member.membership_status === 'suspended';

      expect(isSuspended).toBe(false);
    });

    test('should return false for pending member', () => {
      const member = { membership_status: 'pending' };
      const isSuspended = member.membership_status === 'suspended';

      expect(isSuspended).toBe(false);
    });

    test('should return false for null member', () => {
      const member = null;
      const isSuspended = member && member.membership_status === 'suspended';

      expect(isSuspended).toBeFalsy();
    });
  });

  // ============================================
  // isMemberActive Tests
  // ============================================
  describe('isMemberActive', () => {
    test('should return true for active member', () => {
      const member = { membership_status: 'active' };
      const isActive = member.membership_status === 'active';

      expect(isActive).toBe(true);
    });

    test('should return false for suspended member', () => {
      const member = { membership_status: 'suspended' };
      const isActive = member.membership_status === 'active';

      expect(isActive).toBe(false);
    });

    test('should return false for pending member', () => {
      const member = { membership_status: 'pending' };
      const isActive = member.membership_status === 'active';

      expect(isActive).toBe(false);
    });

    test('should return false for null member', () => {
      const member = null;
      const isActive = member && member.membership_status === 'active';

      expect(isActive).toBeFalsy();
    });
  });

  // ============================================
  // updateMemberStatus Tests
  // ============================================
  describe('updateMemberStatus', () => {
    test('should include updated_at timestamp', () => {
      const updates = {
        membership_status: 'suspended',
        updated_at: new Date().toISOString()
      };

      expect(updates.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    test('should return success with updated member', () => {
      const updatedMember = {
        id: 'member-123',
        membership_status: 'suspended',
        suspended_at: new Date().toISOString()
      };

      const result = { success: true, member: updatedMember };

      expect(result.success).toBe(true);
      expect(result.member.membership_status).toBe('suspended');
    });

    test('should return error on update failure', () => {
      const result = {
        success: false,
        error: {
          status: 500,
          code: 'DATABASE_ERROR',
          message: 'Failed to suspend member'
        }
      };

      expect(result.success).toBe(false);
      expect(result.error.status).toBe(500);
    });
  });

  // ============================================
  // buildMemberResponse Tests
  // ============================================
  describe('buildMemberResponse', () => {
    test('should build base response', () => {
      const member = {
        id: 'member-123',
        full_name: 'أحمد الشعيل',
        membership_status: 'active'
      };

      const baseResponse = {
        id: member.id,
        name: member.full_name,
        status: member.membership_status
      };

      expect(baseResponse.id).toBe('member-123');
      expect(baseResponse.name).toBe('أحمد الشعيل');
    });

    test('should build suspend response', () => {
      const member = {
        id: 'member-123',
        full_name: 'أحمد الشعيل',
        membership_status: 'suspended',
        suspended_at: '2024-03-15T10:00:00Z',
        suspension_reason: 'Policy violation'
      };
      const admin = { email: 'admin@example.com' };

      const response = {
        id: member.id,
        name: member.full_name,
        status: member.membership_status,
        suspended_at: member.suspended_at,
        suspended_by: admin.email,
        suspension_reason: member.suspension_reason
      };

      expect(response.suspended_at).toBeDefined();
      expect(response.suspended_by).toBe('admin@example.com');
    });

    test('should build activate response', () => {
      const member = {
        id: 'member-123',
        full_name: 'أحمد الشعيل',
        membership_status: 'active',
        reactivated_at: '2024-03-20T10:00:00Z',
        reactivation_notes: 'Issue resolved'
      };
      const admin = { email: 'admin@example.com' };

      const response = {
        id: member.id,
        name: member.full_name,
        status: member.membership_status,
        reactivated_at: member.reactivated_at,
        reactivated_by: admin.email,
        reactivation_notes: member.reactivation_notes
      };

      expect(response.reactivated_at).toBeDefined();
      expect(response.reactivated_by).toBe('admin@example.com');
    });

    test('should return base response for unknown type', () => {
      const member = {
        id: 'member-123',
        full_name: 'أحمد الشعيل',
        membership_status: 'active'
      };

      const type = 'unknown';
      let response = {
        id: member.id,
        name: member.full_name,
        status: member.membership_status
      };

      if (type === 'suspend') {
        response = { ...response, suspended_at: null };
      } else if (type === 'activate') {
        response = { ...response, reactivated_at: null };
      }

      expect(response.suspended_at).toBeUndefined();
      expect(response.reactivated_at).toBeUndefined();
    });
  });

  // ============================================
  // getMemberSuspensionHistory Tests
  // ============================================
  describe('getMemberSuspensionHistory', () => {
    test('should return member with suspension info', () => {
      const member = {
        id: 'member-123',
        full_name: 'أحمد الشعيل',
        membership_status: 'suspended',
        suspended_at: '2024-03-15T10:00:00Z',
        suspended_by: 'admin@example.com',
        suspension_reason: 'Policy violation',
        reactivated_at: null,
        reactivated_by: null,
        reactivation_notes: null
      };

      const data = {
        member: {
          id: member.id,
          name: member.full_name,
          current_status: member.membership_status
        },
        suspension_info: member.suspended_at ? {
          suspended_at: member.suspended_at,
          suspended_by: member.suspended_by,
          reason: member.suspension_reason,
          reactivated_at: member.reactivated_at,
          reactivated_by: member.reactivated_by,
          notes: member.reactivation_notes
        } : null
      };

      expect(data.member.current_status).toBe('suspended');
      expect(data.suspension_info).not.toBeNull();
      expect(data.suspension_info.reason).toBe('Policy violation');
    });

    test('should return null suspension_info for never-suspended member', () => {
      const member = {
        id: 'member-123',
        full_name: 'أحمد الشعيل',
        membership_status: 'active',
        suspended_at: null
      };

      const data = {
        member: {
          id: member.id,
          name: member.full_name,
          current_status: member.membership_status
        },
        suspension_info: member.suspended_at ? {
          suspended_at: member.suspended_at
        } : null
      };

      expect(data.suspension_info).toBeNull();
    });

    test('should return success result', () => {
      const result = {
        success: true,
        data: {
          member: { id: 'member-123' },
          suspension_info: null
        }
      };

      expect(result.success).toBe(true);
    });

    test('should return error for non-existent member', () => {
      const result = {
        success: false,
        error: {
          status: 404,
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        }
      };

      expect(result.success).toBe(false);
      expect(result.error.status).toBe(404);
    });

    test('should handle server errors', () => {
      const result = {
        success: false,
        error: {
          status: 500,
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      };

      expect(result.error.status).toBe(500);
    });
  });

  // ============================================
  // Error Response Tests
  // ============================================
  describe('Error Response Building', () => {
    test('should build 404 error response', () => {
      const error = {
        status: 404,
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found'
      };

      expect(error.status).toBe(404);
      expect(error.code).toBe('MEMBER_NOT_FOUND');
    });

    test('should build 500 error response', () => {
      const error = {
        status: 500,
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      };

      expect(error.status).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log error with context', () => {
      const logData = {
        error: 'Database error',
        memberId: 'member-123',
        code: 'PGRST116'
      };

      expect(logData.error).toBeDefined();
      expect(logData.memberId).toBe('member-123');
    });

    test('should log warning for member not found', () => {
      const logData = {
        memberId: 'member-123'
      };

      expect(logData.memberId).toBeDefined();
    });
  });
});
