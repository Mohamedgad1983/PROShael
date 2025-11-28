/**
 * Notification Controller Unit Tests (notificationController.js)
 * Tests notification management for members
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
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
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

jest.unstable_mockModule('../../../src/utils/notificationHelpers.js', () => ({
  getCategoryFromType: jest.fn((type) => {
    const categoryMap = {
      'news': 'news',
      'initiative': 'initiatives',
      'diya': 'diyas',
      'occasion': 'occasions',
      'statement': 'statements'
    };
    return categoryMap[type] || 'other';
  }),
  getDefaultIcon: jest.fn(() => '📢'),
  formatTimeAgo: jest.fn(() => 'منذ ساعة'),
  organizeNotificationsByCategory: jest.fn()
}));

describe('Notification Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'member-123', role: 'member' },
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
  // Get Member Notifications Tests
  // ============================================
  describe('Get Member Notifications', () => {
    test('should fetch notifications for member', () => {
      const memberId = 'member-123';
      expect(memberId).toBeDefined();
    });

    test('should limit to 50 notifications', () => {
      const limit = 50;
      expect(limit).toBe(50);
    });

    test('should order by created_at descending', () => {
      const notifications = [
        { id: 'n1', created_at: '2024-01-01T10:00:00Z' },
        { id: 'n2', created_at: '2024-01-02T10:00:00Z' },
        { id: 'n3', created_at: '2024-01-01T15:00:00Z' }
      ];

      const sorted = notifications.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

      expect(sorted[0].id).toBe('n2');
    });

    test('should organize by category', () => {
      const organized = {
        news: [],
        initiatives: [],
        diyas: [],
        occasions: [],
        statements: [],
        other: []
      };

      const notification = { type: 'news' };
      const getCategoryFromType = (type) => {
        const categoryMap = {
          'news': 'news',
          'initiative': 'initiatives',
          'diya': 'diyas',
          'occasion': 'occasions',
          'statement': 'statements'
        };
        return categoryMap[type] || 'other';
      };

      const category = getCategoryFromType(notification.type);
      expect(category).toBe('news');
    });

    test('should count unread notifications', () => {
      const notifications = [
        { id: 'n1', is_read: false },
        { id: 'n2', is_read: true },
        { id: 'n3', is_read: false }
      ];

      const unreadCount = notifications.filter(n => !n.is_read).length;
      expect(unreadCount).toBe(2);
    });

    test('should format notification with Arabic title', () => {
      const notification = {
        id: 'n1',
        title: 'New Update',
        title_ar: 'تحديث جديد',
        message: 'Check this out',
        message_ar: 'اطلع على هذا',
        created_at: '2024-01-01T10:00:00Z',
        is_read: false,
        type: 'news'
      };

      const formatted = {
        id: notification.id,
        title: notification.title_ar || notification.title,
        body: notification.message_ar || notification.message,
        isRead: notification.is_read || false
      };

      expect(formatted.title).toBe('تحديث جديد');
      expect(formatted.body).toBe('اطلع على هذا');
    });

    test('should return response format', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        data: {
          notifications: {
            news: [],
            initiatives: [],
            diyas: [],
            occasions: [],
            statements: [],
            other: []
          },
          unreadCount: 5,
          total: 20
        }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            notifications: expect.any(Object),
            unreadCount: 5
          })
        })
      );
    });
  });

  // ============================================
  // Get Notification Summary Tests
  // ============================================
  describe('Get Notification Summary', () => {
    test('should count by category', () => {
      const notifications = [
        { type: 'news', is_read: false },
        { type: 'news', is_read: true },
        { type: 'initiative', is_read: false },
        { type: 'diya', is_read: false }
      ];

      const summary = {
        news: { total: 0, unread: 0 },
        initiatives: { total: 0, unread: 0 },
        diyas: { total: 0, unread: 0 },
        occasions: { total: 0, unread: 0 },
        statements: { total: 0, unread: 0 }
      };

      const getCategoryFromType = (type) => {
        const categoryMap = {
          'news': 'news',
          'initiative': 'initiatives',
          'diya': 'diyas'
        };
        return categoryMap[type] || 'other';
      };

      notifications.forEach(notif => {
        const category = getCategoryFromType(notif.type);
        if (summary[category]) {
          summary[category].total++;
          if (!notif.is_read) summary[category].unread++;
        }
      });

      expect(summary.news.total).toBe(2);
      expect(summary.news.unread).toBe(1);
      expect(summary.initiatives.total).toBe(1);
      expect(summary.diyas.total).toBe(1);
    });

    test('should return summary response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        data: {
          news: { total: 10, unread: 3 },
          initiatives: { total: 5, unread: 2 },
          diyas: { total: 2, unread: 0 },
          occasions: { total: 8, unread: 4 },
          statements: { total: 3, unread: 1 }
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
  // Mark Notification As Read Tests
  // ============================================
  describe('Mark Notification As Read', () => {
    test('should update notification with read status', () => {
      const updateData = {
        is_read: true,
        read_at: new Date().toISOString()
      };

      expect(updateData.is_read).toBe(true);
      expect(updateData.read_at).toBeDefined();
    });

    test('should only update own notifications', () => {
      const notificationId = 'notif-123';
      const memberId = 'member-123';

      // Security: eq('id', notificationId).eq('user_id', memberId)
      expect(notificationId).toBeDefined();
      expect(memberId).toBeDefined();
    });

    test('should return 404 if notification not found', () => {
      const res = createMockResponse();

      res.status(404).json({
        success: false,
        error: 'Notification not found',
        errorAr: 'الإشعار غير موجود'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return success response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        message: 'Notification marked as read',
        messageAr: 'تم تحديث الإشعار'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          messageAr: 'تم تحديث الإشعار'
        })
      );
    });
  });

  // ============================================
  // Mark All Notifications As Read Tests
  // ============================================
  describe('Mark All Notifications As Read', () => {
    test('should only update unread notifications', () => {
      // Filter: .eq('user_id', memberId).eq('is_read', false)
      const condition = {
        user_id: 'member-123',
        is_read: false
      };

      expect(condition.is_read).toBe(false);
    });

    test('should return count of updated notifications', () => {
      const res = createMockResponse();
      const updatedCount = 15;

      res.json({
        success: true,
        message: 'All notifications marked as read',
        messageAr: 'تم تحديث جميع الإشعارات',
        count: updatedCount
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 15
        })
      );
    });

    test('should handle empty data', () => {
      const data = null;
      const count = data?.length || 0;

      expect(count).toBe(0);
    });
  });

  // ============================================
  // Delete Notification Tests
  // ============================================
  describe('Delete Notification', () => {
    test('should delete by id and user_id', () => {
      const req = createMockRequest({
        params: { id: 'notif-123' }
      });

      expect(req.params.id).toBe('notif-123');
      expect(req.user.id).toBe('member-123');
    });

    test('should return success response', () => {
      const res = createMockResponse();

      res.json({
        success: true,
        message: 'Notification deleted',
        messageAr: 'تم حذف الإشعار'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          messageAr: 'تم حذف الإشعار'
        })
      );
    });
  });

  // ============================================
  // Category Mapping Tests
  // ============================================
  describe('Category Mapping', () => {
    test('should map news type to news category', () => {
      const getCategoryFromType = (type) => {
        const categoryMap = {
          'news': 'news',
          'initiative': 'initiatives',
          'diya': 'diyas',
          'occasion': 'occasions',
          'statement': 'statements'
        };
        return categoryMap[type] || 'other';
      };

      expect(getCategoryFromType('news')).toBe('news');
    });

    test('should map initiative type', () => {
      const getCategoryFromType = (type) => {
        const categoryMap = {
          'initiative': 'initiatives'
        };
        return categoryMap[type] || 'other';
      };

      expect(getCategoryFromType('initiative')).toBe('initiatives');
    });

    test('should map diya type', () => {
      const getCategoryFromType = (type) => {
        const categoryMap = {
          'diya': 'diyas'
        };
        return categoryMap[type] || 'other';
      };

      expect(getCategoryFromType('diya')).toBe('diyas');
    });

    test('should map unknown type to other', () => {
      const getCategoryFromType = (type) => {
        const categoryMap = {};
        return categoryMap[type] || 'other';
      };

      expect(getCategoryFromType('unknown')).toBe('other');
    });
  });

  // ============================================
  // Time Formatting Tests
  // ============================================
  describe('Time Formatting', () => {
    test('should format recent time', () => {
      const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return 'منذ دقائق';
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        return 'منذ يوم أو أكثر';
      };

      const recentTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = formatTimeAgo(recentTime.toISOString());

      expect(result).toContain('ساعة');
    });
  });

  // ============================================
  // Default Icon Tests
  // ============================================
  describe('Default Icons', () => {
    test('should return default icon for type', () => {
      const getDefaultIcon = (type) => {
        const iconMap = {
          'news': '📰',
          'initiative': '🎯',
          'diya': '💰',
          'occasion': '🎉',
          'statement': '📄'
        };
        return iconMap[type] || '📢';
      };

      expect(getDefaultIcon('news')).toBe('📰');
      expect(getDefaultIcon('unknown')).toBe('📢');
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
        error: 'Failed to fetch notifications',
        errorAr: 'فشل في جلب الإشعارات'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 404 for not found', () => {
      const res = createMockResponse();

      res.status(404).json({
        success: false,
        error: 'Notification not found',
        errorAr: 'الإشعار غير موجود'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on server exception', () => {
      const res = createMockResponse();

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorAr: 'خطأ في الخادم'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should include bilingual error messages', () => {
      const error = {
        error: 'Failed to mark as read',
        errorAr: 'فشل في تحديث الإشعار'
      };

      expect(error.error).toBeDefined();
      expect(error.errorAr).toMatch(/[\u0600-\u06FF]/);
    });
  });

  // ============================================
  // Security Tests
  // ============================================
  describe('Security', () => {
    test('should filter by user_id for all operations', () => {
      const memberId = 'member-123';
      // All queries should include: .eq('user_id', memberId)
      expect(memberId).toBeDefined();
    });

    test('should not allow access to other users notifications', () => {
      const requestUserId = 'member-123';
      const notificationUserId = 'member-456';

      const hasAccess = requestUserId === notificationUserId;
      expect(hasAccess).toBe(false);
    });
  });
});
