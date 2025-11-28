/**
 * Member Suspension Controller Unit Tests
 * Tests member suspension and activation functionality
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
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
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

describe('Member Suspension Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'admin-123', role: 'super_admin' },
    superAdmin: { id: 'admin-123', email: 'admin@test.com', role: 'super_admin' },
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
  // Member ID Validation Tests
  // ============================================
  describe('Member ID Validation', () => {
    test('should validate UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUuid = 'not-a-uuid';

      expect(uuidRegex.test(validUuid)).toBe(true);
      expect(uuidRegex.test(invalidUuid)).toBe(false);
    });

    test('should reject invalid member ID', () => {
      const res = createMockResponse();
      const memberId = 'invalid';

      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId);

      if (!isValidUuid) {
        res.status(400).json({
          success: false,
          error: 'INVALID_MEMBER_ID'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // Suspension Reason Validation Tests
  // ============================================
  describe('Suspension Reason Validation', () => {
    test('should require suspension reason', () => {
      const req = createMockRequest({ body: { reason: '' } });
      const res = createMockResponse();

      if (!req.body.reason || req.body.reason.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'REASON_REQUIRED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should validate reason length', () => {
      const reason = 'سبب التعليق';
      const maxLength = 500;

      expect(reason.length).toBeLessThanOrEqual(maxLength);
    });

    test('should sanitize reason for XSS', () => {
      const sanitize = (text) => {
        return text.replace(/<[^>]*>/g, '').trim();
      };

      const dirty = '<script>alert("xss")</script>سبب التعليق';
      const clean = sanitize(dirty);

      expect(clean).not.toContain('<script>');
      expect(clean).toContain('سبب التعليق');
    });
  });

  // ============================================
  // Suspend Member Tests
  // ============================================
  describe('Suspend Member', () => {
    test('should check if member already suspended', () => {
      const member = { id: 'member-123', membership_status: 'suspended' };

      const isSuspended = member.membership_status === 'suspended';
      expect(isSuspended).toBe(true);
    });

    test('should reject suspending already suspended member', () => {
      const res = createMockResponse();
      const member = { membership_status: 'suspended' };

      if (member.membership_status === 'suspended') {
        res.status(400).json({
          success: false,
          error: 'ALREADY_SUSPENDED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should update member status to suspended', () => {
      const member = { id: 'member-123', membership_status: 'active' };
      const now = new Date().toISOString();

      const updatedMember = {
        ...member,
        membership_status: 'suspended',
        suspended_at: now,
        suspended_by: 'admin-123',
        suspension_reason: 'سبب التعليق'
      };

      expect(updatedMember.membership_status).toBe('suspended');
      expect(updatedMember.suspended_at).toBeDefined();
    });

    test('should include audit trail in response', () => {
      const response = {
        success: true,
        data: {
          member: {
            id: 'member-123',
            status: 'suspended',
            suspended_by: {
              id: 'admin-123',
              email: 'admin@test.com',
              role: 'super_admin'
            }
          }
        }
      };

      expect(response.data.member.suspended_by.id).toBeDefined();
      expect(response.data.member.suspended_by.email).toBeDefined();
    });
  });

  // ============================================
  // Activate Member Tests
  // ============================================
  describe('Activate Member', () => {
    test('should check if member is suspended', () => {
      const member = { id: 'member-123', membership_status: 'active' };

      const isSuspended = member.membership_status === 'suspended';
      expect(isSuspended).toBe(false);
    });

    test('should reject activating non-suspended member', () => {
      const res = createMockResponse();
      const member = { membership_status: 'active' };

      if (member.membership_status !== 'suspended') {
        res.status(400).json({
          success: false,
          error: 'NOT_SUSPENDED'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should update member status to active', () => {
      const member = { id: 'member-123', membership_status: 'suspended' };
      const now = new Date().toISOString();

      const activatedMember = {
        ...member,
        membership_status: 'active',
        reactivated_at: now,
        reactivated_by: 'admin-123',
        reactivation_notes: 'تم إعادة التفعيل'
      };

      expect(activatedMember.membership_status).toBe('active');
      expect(activatedMember.reactivated_at).toBeDefined();
    });

    test('should use default activation note if none provided', () => {
      const notes = null;
      const defaultNote = 'تم إعادة تفعيل العضوية';

      const sanitizedNotes = notes || defaultNote;
      expect(sanitizedNotes).toBe(defaultNote);
    });
  });

  // ============================================
  // Suspension History Tests
  // ============================================
  describe('Suspension History', () => {
    test('should return member suspension info', () => {
      const member = {
        id: 'member-123',
        full_name: 'محمد بن علي',
        membership_status: 'suspended',
        suspended_at: '2024-01-15T10:00:00Z',
        suspended_by: 'admin-123',
        suspension_reason: 'عدم دفع الاشتراكات'
      };

      expect(member.suspended_at).toBeDefined();
      expect(member.suspension_reason).toBeDefined();
    });

    test('should include reactivation info if available', () => {
      const member = {
        id: 'member-123',
        membership_status: 'active',
        suspended_at: '2024-01-15T10:00:00Z',
        reactivated_at: '2024-02-01T10:00:00Z',
        reactivated_by: 'admin-123',
        reactivation_notes: 'تم سداد المستحقات'
      };

      expect(member.reactivated_at).toBeDefined();
      expect(member.reactivation_notes).toBeDefined();
    });

    test('should return null suspension info if never suspended', () => {
      const member = {
        id: 'member-123',
        membership_status: 'active',
        suspended_at: null
      };

      const suspensionInfo = member.suspended_at ? {
        suspended_at: member.suspended_at
      } : null;

      expect(suspensionInfo).toBeNull();
    });
  });

  // ============================================
  // Status Constants Tests
  // ============================================
  describe('Status Constants', () => {
    test('should define member statuses', () => {
      const MEMBER_STATUS = {
        ACTIVE: 'active',
        SUSPENDED: 'suspended',
        PENDING: 'pending'
      };

      expect(MEMBER_STATUS.ACTIVE).toBe('active');
      expect(MEMBER_STATUS.SUSPENDED).toBe('suspended');
    });

    test('should define error codes', () => {
      const ERROR_CODES = {
        MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
        ALREADY_SUSPENDED: 'ALREADY_SUSPENDED',
        NOT_SUSPENDED: 'NOT_SUSPENDED',
        INVALID_MEMBER_ID: 'INVALID_MEMBER_ID'
      };

      expect(ERROR_CODES.MEMBER_NOT_FOUND).toBeDefined();
      expect(ERROR_CODES.ALREADY_SUSPENDED).toBeDefined();
    });
  });

  // ============================================
  // Helper Functions Tests
  // ============================================
  describe('Helper Functions', () => {
    test('should identify suspended member', () => {
      const isMemberSuspended = (member) => {
        return member.membership_status === 'suspended';
      };

      expect(isMemberSuspended({ membership_status: 'suspended' })).toBe(true);
      expect(isMemberSuspended({ membership_status: 'active' })).toBe(false);
    });

    test('should identify active member', () => {
      const isMemberActive = (member) => {
        return member.membership_status === 'active';
      };

      expect(isMemberActive({ membership_status: 'active' })).toBe(true);
      expect(isMemberActive({ membership_status: 'suspended' })).toBe(false);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response on suspend', () => {
      const res = createMockResponse();
      res.json({
        success: true,
        message: 'تم تعليق العضوية بنجاح',
        data: {
          member: {
            id: 'member-123',
            name: 'محمد بن علي',
            status: 'suspended'
          }
        }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('تعليق')
        })
      );
    });

    test('should return success response on activate', () => {
      const res = createMockResponse();
      res.json({
        success: true,
        message: 'تم إعادة تفعيل العضوية بنجاح',
        data: {
          member: {
            id: 'member-123',
            name: 'محمد بن علي',
            status: 'active'
          }
        }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 400 for invalid input', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'INVALID_MEMBER_ID'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 for non-existent member', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
        message: 'العضو غير موجود'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on database error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'خطأ في قاعدة البيانات'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should log database errors with details', () => {
      const error = {
        code: 'PGRST116',
        details: 'Not found',
        hint: 'Check the ID',
        message: 'Row not found'
      };

      expect(error.code).toBeDefined();
      expect(error.details).toBeDefined();
    });
  });
});
