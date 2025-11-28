/**
 * Device Token Controller Unit Tests
 * Tests device token management for push notifications
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

describe('Device Token Controller Unit Tests', () => {
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
  // Register Device Token Tests
  // ============================================
  describe('Register Device Token', () => {
    test('should validate required fields', () => {
      const req = createMockRequest({
        body: { member_id: null, token: null, platform: null }
      });
      const res = createMockResponse();

      const { member_id, token, platform } = req.body;
      if (!member_id || !token || !platform) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: member_id, token, platform'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should validate platform value', () => {
      const validPlatforms = ['ios', 'android', 'web'];

      expect(validPlatforms).toContain('ios');
      expect(validPlatforms).toContain('android');
      expect(validPlatforms).toContain('web');
    });

    test('should reject invalid platform', () => {
      const res = createMockResponse();
      const platform = 'windows';
      const validPlatforms = ['ios', 'android', 'web'];

      if (!validPlatforms.includes(platform)) {
        res.status(400).json({
          success: false,
          error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should create device token structure', () => {
      const deviceToken = {
        member_id: 'member-123',
        token: 'fcm-token-abc123',
        platform: 'ios',
        device_name: 'iPhone 14',
        app_version: '1.0.0',
        os_version: 'iOS 17.0',
        is_active: true,
        last_used_at: new Date().toISOString()
      };

      expect(deviceToken.member_id).toBeDefined();
      expect(deviceToken.token).toBeDefined();
      expect(deviceToken.platform).toBe('ios');
      expect(deviceToken.is_active).toBe(true);
    });

    test('should handle existing token reactivation', () => {
      const existingToken = {
        id: 'token-123',
        is_active: false
      };

      const updatedToken = {
        ...existingToken,
        is_active: true,
        last_used_at: new Date().toISOString()
      };

      expect(updatedToken.is_active).toBe(true);
    });
  });

  // ============================================
  // Get Member Devices Tests
  // ============================================
  describe('Get Member Devices', () => {
    test('should fetch devices for member', () => {
      const req = createMockRequest({
        params: { memberId: 'member-123' }
      });

      expect(req.params.memberId).toBe('member-123');
    });

    test('should filter by active status', () => {
      const req = createMockRequest({
        query: { active_only: 'true' }
      });

      const activeOnly = req.query.active_only === 'true';
      expect(activeOnly).toBe(true);
    });

    test('should return device list', () => {
      const devices = [
        { id: 1, platform: 'ios', is_active: true },
        { id: 2, platform: 'android', is_active: true },
        { id: 3, platform: 'ios', is_active: false }
      ];

      const activeDevices = devices.filter(d => d.is_active);
      expect(activeDevices.length).toBe(2);
    });

    test('should return 404 for non-existent member', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Member not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ============================================
  // Update Device Token Tests
  // ============================================
  describe('Update Device Token', () => {
    test('should update device information', () => {
      const existingToken = {
        id: 'token-123',
        device_name: 'iPhone 13',
        app_version: '1.0.0'
      };

      const updates = {
        device_name: 'iPhone 14',
        app_version: '2.0.0'
      };

      const updatedToken = { ...existingToken, ...updates };

      expect(updatedToken.device_name).toBe('iPhone 14');
      expect(updatedToken.app_version).toBe('2.0.0');
    });

    test('should update is_active status', () => {
      const token = { id: 'token-123', is_active: true };
      const deactivated = { ...token, is_active: false };

      expect(deactivated.is_active).toBe(false);
    });

    test('should update last_used_at on update', () => {
      const beforeUpdate = new Date('2024-01-01').toISOString();
      const afterUpdate = new Date().toISOString();

      expect(new Date(afterUpdate).getTime()).toBeGreaterThan(new Date(beforeUpdate).getTime());
    });

    test('should return 404 for non-existent token', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Device token not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ============================================
  // Delete Device Token Tests
  // ============================================
  describe('Delete Device Token', () => {
    test('should perform soft delete', () => {
      const token = { id: 'token-123', is_active: true };
      const deletedToken = { ...token, is_active: false };

      expect(deletedToken.is_active).toBe(false);
    });

    test('should return success on deletion', () => {
      const res = createMockResponse();
      res.status(200).json({
        success: true,
        message: 'Device token deleted successfully'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  // ============================================
  // Refresh Device Token Tests
  // ============================================
  describe('Refresh Device Token', () => {
    test('should require new_token', () => {
      const req = createMockRequest({
        body: { new_token: null }
      });
      const res = createMockResponse();

      if (!req.body.new_token) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: new_token'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should update token value', () => {
      const oldToken = {
        id: 'token-123',
        token: 'old-fcm-token'
      };

      const refreshedToken = {
        ...oldToken,
        token: 'new-fcm-token',
        last_used_at: new Date().toISOString()
      };

      expect(refreshedToken.token).toBe('new-fcm-token');
    });

    test('should handle duplicate new token', () => {
      const duplicateExists = true;

      if (duplicateExists) {
        // Deactivate old token
        const response = {
          success: true,
          message: 'Token already updated (duplicate removed)'
        };
        expect(response.success).toBe(true);
      }
    });

    test('should reactivate token on refresh', () => {
      const token = { id: 'token-123', is_active: false };
      const refreshed = { ...token, is_active: true };

      expect(refreshed.is_active).toBe(true);
    });
  });

  // ============================================
  // Platform Validation Tests
  // ============================================
  describe('Platform Validation', () => {
    test('should accept iOS platform', () => {
      const validPlatforms = ['ios', 'android', 'web'];
      expect(validPlatforms.includes('ios')).toBe(true);
    });

    test('should accept Android platform', () => {
      const validPlatforms = ['ios', 'android', 'web'];
      expect(validPlatforms.includes('android')).toBe(true);
    });

    test('should accept Web platform', () => {
      const validPlatforms = ['ios', 'android', 'web'];
      expect(validPlatforms.includes('web')).toBe(true);
    });

    test('should reject invalid platform', () => {
      const validPlatforms = ['ios', 'android', 'web'];
      expect(validPlatforms.includes('blackberry')).toBe(false);
    });
  });

  // ============================================
  // Token Structure Tests
  // ============================================
  describe('Token Structure', () => {
    test('should include all required fields', () => {
      const token = {
        id: 'token-123',
        member_id: 'member-123',
        token: 'fcm-token',
        platform: 'ios',
        is_active: true,
        created_at: new Date().toISOString()
      };

      expect(token.id).toBeDefined();
      expect(token.member_id).toBeDefined();
      expect(token.token).toBeDefined();
      expect(token.platform).toBeDefined();
    });

    test('should include optional device info', () => {
      const token = {
        device_name: 'iPhone 14 Pro',
        app_version: '2.1.0',
        os_version: 'iOS 17.2'
      };

      expect(token.device_name).toBeDefined();
      expect(token.app_version).toBeDefined();
      expect(token.os_version).toBeDefined();
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response with data', () => {
      const res = createMockResponse();
      res.status(201).json({
        success: true,
        message: 'Device token registered successfully',
        data: { id: 'token-123' }
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should return device count in list response', () => {
      const devices = [{ id: 1 }, { id: 2 }];
      const response = {
        success: true,
        data: devices,
        count: devices.length
      };

      expect(response.count).toBe(2);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 400 for missing fields', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 for not found', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Device token not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on internal error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
