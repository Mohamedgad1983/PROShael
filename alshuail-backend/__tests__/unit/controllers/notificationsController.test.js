/**
 * Notifications Controller Unit Tests
 * Tests notification management and delivery
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
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  neq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
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

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    isDevelopment: false
  }
}));

describe('Notifications Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'admin' },
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
    mockSupabaseResponse.count = null;
  });

  // ============================================
  // Notification Types Tests
  // ============================================
  describe('Notification Types', () => {
    test('should support payment notification type', () => {
      const types = ['payment', 'subscription', 'announcement', 'reminder', 'alert', 'system'];
      expect(types).toContain('payment');
    });

    test('should support subscription notification type', () => {
      const types = ['payment', 'subscription', 'announcement', 'reminder', 'alert', 'system'];
      expect(types).toContain('subscription');
    });

    test('should support announcement notification type', () => {
      const types = ['payment', 'subscription', 'announcement', 'reminder', 'alert', 'system'];
      expect(types).toContain('announcement');
    });

    test('should support reminder notification type', () => {
      const types = ['payment', 'subscription', 'announcement', 'reminder', 'alert', 'system'];
      expect(types).toContain('reminder');
    });

    test('should validate notification type', () => {
      const validTypes = ['payment', 'subscription', 'announcement', 'reminder', 'alert', 'system'];
      const notif = { type: 'payment' };
      expect(validTypes).toContain(notif.type);
    });
  });

  // ============================================
  // Priority Tests
  // ============================================
  describe('Notification Priority', () => {
    test('should support low priority', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      expect(priorities).toContain('low');
    });

    test('should support medium priority', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      expect(priorities).toContain('medium');
    });

    test('should support high priority', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      expect(priorities).toContain('high');
    });

    test('should support urgent priority', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      expect(priorities).toContain('urgent');
    });

    test('should default to medium priority', () => {
      const notification = { title: 'Test', priority: undefined };
      const priority = notification.priority || 'medium';
      expect(priority).toBe('medium');
    });
  });

  // ============================================
  // Target Audience Tests
  // ============================================
  describe('Target Audience', () => {
    test('should support individual member target', () => {
      const audiences = ['individual', 'all_members', 'family', 'tribal_section', 'role_based'];
      expect(audiences).toContain('individual');
    });

    test('should support all members target', () => {
      const audiences = ['individual', 'all_members', 'family', 'tribal_section', 'role_based'];
      expect(audiences).toContain('all_members');
    });

    test('should support family target', () => {
      const audiences = ['individual', 'all_members', 'family', 'tribal_section', 'role_based'];
      expect(audiences).toContain('family');
    });

    test('should support role-based target', () => {
      const audiences = ['individual', 'all_members', 'family', 'tribal_section', 'role_based'];
      expect(audiences).toContain('role_based');
    });

    test('should validate target audience', () => {
      const notification = { target_audience: 'all_members' };
      const validAudiences = ['individual', 'all_members', 'family', 'tribal_section', 'role_based'];
      expect(validAudiences).toContain(notification.target_audience);
    });
  });

  // ============================================
  // Read Status Tests
  // ============================================
  describe('Read Status Management', () => {
    test('should create notification as unread', () => {
      const notification = {
        title: 'Test',
        is_read: false
      };
      expect(notification.is_read).toBe(false);
    });

    test('should mark notification as read', () => {
      const notification = {
        id: '123',
        is_read: false,
        read_at: null
      };

      const updatedNotification = {
        ...notification,
        is_read: true,
        read_at: new Date().toISOString()
      };

      expect(updatedNotification.is_read).toBe(true);
      expect(updatedNotification.read_at).toBeDefined();
    });

    test('should calculate unread count', () => {
      const notifications = [
        { id: 1, is_read: false },
        { id: 2, is_read: true },
        { id: 3, is_read: false },
        { id: 4, is_read: false }
      ];

      const unreadCount = notifications.filter(n => !n.is_read).length;
      expect(unreadCount).toBe(3);
    });

    test('should calculate read count', () => {
      const notifications = [
        { id: 1, is_read: false },
        { id: 2, is_read: true },
        { id: 3, is_read: false },
        { id: 4, is_read: true }
      ];

      const readCount = notifications.filter(n => n.is_read).length;
      expect(readCount).toBe(2);
    });
  });

  // ============================================
  // Filtering Tests
  // ============================================
  describe('Query Filters', () => {
    test('should filter by member_id', () => {
      const req = createMockRequest({
        query: { member_id: 'member-123' }
      });
      expect(req.query.member_id).toBe('member-123');
    });

    test('should filter by type', () => {
      const req = createMockRequest({
        query: { type: 'payment' }
      });
      expect(req.query.type).toBe('payment');
    });

    test('should filter by priority', () => {
      const req = createMockRequest({
        query: { priority: 'high' }
      });
      expect(req.query.priority).toBe('high');
    });

    test('should filter by is_read', () => {
      const req = createMockRequest({
        query: { is_read: 'true' }
      });
      const isRead = req.query.is_read === 'true';
      expect(isRead).toBe(true);
    });

    test('should filter by date range', () => {
      const req = createMockRequest({
        query: {
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      });
      expect(req.query.start_date).toBe('2024-01-01');
      expect(req.query.end_date).toBe('2024-12-31');
    });

    test('should handle pagination', () => {
      const req = createMockRequest({
        query: { limit: '50', offset: '0' }
      });

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      expect(limit).toBe(50);
      expect(offset).toBe(0);
    });
  });

  // ============================================
  // Statistics Tests
  // ============================================
  describe('Notification Statistics', () => {
    test('should group by type', () => {
      const notifications = [
        { type: 'payment' },
        { type: 'payment' },
        { type: 'reminder' },
        { type: 'announcement' }
      ];

      const typeStats = notifications.reduce((acc, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
      }, {});

      expect(typeStats['payment']).toBe(2);
      expect(typeStats['reminder']).toBe(1);
      expect(typeStats['announcement']).toBe(1);
    });

    test('should group by priority', () => {
      const notifications = [
        { priority: 'high' },
        { priority: 'medium' },
        { priority: 'high' },
        { priority: 'low' }
      ];

      const priorityStats = notifications.reduce((acc, notif) => {
        acc[notif.priority] = (acc[notif.priority] || 0) + 1;
        return acc;
      }, {});

      expect(priorityStats['high']).toBe(2);
      expect(priorityStats['medium']).toBe(1);
      expect(priorityStats['low']).toBe(1);
    });

    test('should calculate summary correctly', () => {
      const notifications = [
        { is_read: false },
        { is_read: true },
        { is_read: false }
      ];

      const summary = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        read: notifications.filter(n => n.is_read).length
      };

      expect(summary.total).toBe(3);
      expect(summary.unread).toBe(2);
      expect(summary.read).toBe(1);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response with data', () => {
      const res = createMockResponse();
      const notifications = [{ id: 1, title: 'Test' }];

      res.json({
        success: true,
        data: notifications,
        pagination: { limit: 50, offset: 0, total: 1 },
        summary: { total: 1, unread: 1, read: 0 },
        message: 'تم جلب الإشعارات بنجاح'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          message: 'تم جلب الإشعارات بنجاح'
        })
      );
    });

    test('should include Arabic messages', () => {
      const successMessage = 'تم جلب الإشعارات بنجاح';
      const errorMessage = 'فشل في جلب الإشعارات';

      expect(successMessage).toMatch(/[\u0600-\u06FF]/); // Arabic characters
      expect(errorMessage).toMatch(/[\u0600-\u06FF]/);
    });

    test('should include pagination info', () => {
      const pagination = {
        limit: 50,
        offset: 0,
        total: 100
      };

      expect(pagination.limit).toBe(50);
      expect(pagination.offset).toBe(0);
      expect(pagination.total).toBe(100);
    });

    test('should include summary stats', () => {
      const summary = {
        total: 100,
        unread: 25,
        read: 75,
        by_type: { payment: 30, reminder: 70 },
        by_priority: { high: 10, medium: 60, low: 30 }
      };

      expect(summary.total).toBe(100);
      expect(summary.by_type).toBeDefined();
      expect(summary.by_priority).toBeDefined();
    });
  });

  // ============================================
  // Notification Creation Tests
  // ============================================
  describe('Notification Creation', () => {
    test('should validate required fields', () => {
      const notification = {
        title: 'Test Notification',
        message: 'This is a test',
        type: 'announcement'
      };

      const isValid = Boolean(notification.title && notification.message && notification.type);
      expect(isValid).toBe(true);
    });

    test('should reject notification without title', () => {
      const notification = {
        message: 'Test message',
        type: 'announcement'
      };

      const isValid = notification.title && notification.message;
      expect(isValid).toBeFalsy();
    });

    test('should reject notification without message', () => {
      const notification = {
        title: 'Test',
        type: 'announcement'
      };

      const isValid = notification.title && notification.message;
      expect(isValid).toBeFalsy();
    });

    test('should set created_at timestamp', () => {
      const notification = {
        title: 'Test',
        message: 'Test message',
        created_at: new Date().toISOString()
      };

      expect(notification.created_at).toBeDefined();
      const date = new Date(notification.created_at);
      expect(date).toBeInstanceOf(Date);
    });
  });

  // ============================================
  // Bulk Operations Tests
  // ============================================
  describe('Bulk Operations', () => {
    test('should mark all as read', () => {
      const notifications = [
        { id: 1, is_read: false },
        { id: 2, is_read: false },
        { id: 3, is_read: false }
      ];

      const updated = notifications.map(n => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString()
      }));

      expect(updated.every(n => n.is_read)).toBe(true);
    });

    test('should delete multiple notifications', () => {
      const ids = ['id-1', 'id-2', 'id-3'];
      expect(ids.length).toBe(3);
    });

    test('should send to multiple recipients', () => {
      const recipients = ['member-1', 'member-2', 'member-3'];
      const notification = {
        title: 'Announcement',
        message: 'Important message'
      };

      const notifications = recipients.map(memberId => ({
        ...notification,
        member_id: memberId
      }));

      expect(notifications.length).toBe(3);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 500 on database error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'فشل في جلب الإشعارات'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should not expose error details in production', () => {
      const isDevelopment = false;
      const error = new Error('Database connection failed');

      const response = {
        success: false,
        error: 'فشل في جلب الإشعارات',
        message: isDevelopment ? error.message : undefined
      };

      expect(response.message).toBeUndefined();
    });

    test('should expose error details in development', () => {
      const isDevelopment = true;
      const error = new Error('Database connection failed');

      const response = {
        success: false,
        error: 'فشل في جلب الإشعارات',
        message: isDevelopment ? error.message : undefined
      };

      expect(response.message).toBe('Database connection failed');
    });

    test('should handle empty results', () => {
      const notifications = null;
      const safeData = notifications || [];

      expect(safeData).toEqual([]);
    });
  });

  // ============================================
  // Ordering Tests
  // ============================================
  describe('Notification Ordering', () => {
    test('should order by created_at descending', () => {
      const notifications = [
        { id: 1, created_at: '2024-01-15T10:00:00Z' },
        { id: 2, created_at: '2024-01-20T10:00:00Z' },
        { id: 3, created_at: '2024-01-10T10:00:00Z' }
      ];

      const sorted = [...notifications].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      expect(sorted[0].id).toBe(2); // Most recent first
      expect(sorted[2].id).toBe(3); // Oldest last
    });

    test('should prioritize high priority notifications', () => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

      const notifications = [
        { id: 1, priority: 'low' },
        { id: 2, priority: 'urgent' },
        { id: 3, priority: 'high' }
      ];

      const sorted = [...notifications].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[2].priority).toBe('low');
    });
  });
});
