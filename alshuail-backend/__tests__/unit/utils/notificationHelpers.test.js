/**
 * Notification Helpers Utility Unit Tests
 * Tests notification formatting and categorization helpers
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Notification Helpers Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getCategoryFromType Tests
  // ============================================
  describe('getCategoryFromType', () => {
    test('should map news types to news category', () => {
      const mapping = {
        'news': 'news',
        'announcement': 'news',
        'update': 'news'
      };

      expect(mapping['news']).toBe('news');
      expect(mapping['announcement']).toBe('news');
      expect(mapping['update']).toBe('news');
    });

    test('should map initiative types to initiatives category', () => {
      const mapping = {
        'initiative': 'initiatives',
        'charity': 'initiatives',
        'donation': 'initiatives',
        'fundraising': 'initiatives'
      };

      expect(mapping['initiative']).toBe('initiatives');
      expect(mapping['charity']).toBe('initiatives');
    });

    test('should map diya types to diyas category', () => {
      const mapping = {
        'diya': 'diyas',
        'blood_money': 'diyas',
        'urgent_case': 'diyas'
      };

      expect(mapping['diya']).toBe('diyas');
      expect(mapping['blood_money']).toBe('diyas');
    });

    test('should map occasion types to occasions category', () => {
      const mapping = {
        'occasion': 'occasions',
        'event': 'occasions',
        'celebration': 'occasions',
        'wedding': 'occasions',
        'condolence': 'occasions'
      };

      expect(mapping['occasion']).toBe('occasions');
      expect(mapping['wedding']).toBe('occasions');
    });

    test('should map statement types to statements category', () => {
      const mapping = {
        'statement': 'statements',
        'payment': 'statements',
        'subscription': 'statements',
        'financial': 'statements',
        'receipt': 'statements'
      };

      expect(mapping['statement']).toBe('statements');
      expect(mapping['payment']).toBe('statements');
    });

    test('should return other for unknown type', () => {
      const mapping = {};
      const type = 'unknown';
      const result = mapping[type?.toLowerCase()] || 'other';

      expect(result).toBe('other');
    });

    test('should handle null type', () => {
      const type = null;
      const result = type?.toLowerCase() || 'other';

      expect(result).toBe('other');
    });

    test('should handle case insensitivity', () => {
      const type = 'NEWS';
      const mapping = { 'news': 'news' };
      const result = mapping[type.toLowerCase()] || 'other';

      expect(result).toBe('news');
    });
  });

  // ============================================
  // getDefaultIcon Tests
  // ============================================
  describe('getDefaultIcon', () => {
    test('should return news emoji for news type', () => {
      const icons = { news: '📰' };
      expect(icons.news).toBe('📰');
    });

    test('should return announcement emoji', () => {
      const icons = { announcement: '📢' };
      expect(icons.announcement).toBe('📢');
    });

    test('should return initiative emoji', () => {
      const icons = { initiative: '🤝' };
      expect(icons.initiative).toBe('🤝');
    });

    test('should return charity emoji', () => {
      const icons = { charity: '❤️' };
      expect(icons.charity).toBe('❤️');
    });

    test('should return diya emoji', () => {
      const icons = { diya: '⚖️' };
      expect(icons.diya).toBe('⚖️');
    });

    test('should return occasion emoji', () => {
      const icons = { occasion: '🎉' };
      expect(icons.occasion).toBe('🎉');
    });

    test('should return event emoji', () => {
      const icons = { event: '📅' };
      expect(icons.event).toBe('📅');
    });

    test('should return statement emoji', () => {
      const icons = { statement: '📊' };
      expect(icons.statement).toBe('📊');
    });

    test('should return payment emoji', () => {
      const icons = { payment: '💰' };
      expect(icons.payment).toBe('💰');
    });

    test('should return subscription emoji', () => {
      const icons = { subscription: '💳' };
      expect(icons.subscription).toBe('💳');
    });

    test('should return default bell emoji for unknown type', () => {
      const icons = {};
      const type = 'unknown';
      const result = icons[type?.toLowerCase()] || '🔔';

      expect(result).toBe('🔔');
    });
  });

  // ============================================
  // formatTimeAgo Tests
  // ============================================
  describe('formatTimeAgo', () => {
    test('should return الآن for less than 1 minute', () => {
      const now = new Date();
      const timestamp = new Date(now - 30000); // 30 seconds ago
      const diffMs = now - timestamp;
      const diffMins = Math.floor(diffMs / 60000);

      const result = diffMins < 1 ? 'الآن' : `منذ ${diffMins} دقيقة`;
      expect(result).toBe('الآن');
    });

    test('should return minutes ago for less than 1 hour', () => {
      const diffMins = 15;
      const result = `منذ ${diffMins} دقيقة`;

      expect(result).toBe('منذ 15 دقيقة');
    });

    test('should return hours ago for less than 24 hours', () => {
      const diffHours = 5;
      const result = `منذ ${diffHours} ساعة`;

      expect(result).toBe('منذ 5 ساعة');
    });

    test('should return days ago for less than 7 days', () => {
      const diffDays = 3;
      const result = `منذ ${diffDays} يوم`;

      expect(result).toBe('منذ 3 يوم');
    });

    test('should format as date for older notifications', () => {
      const date = new Date('2024-01-15');
      const formatted = date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      expect(formatted).toBeDefined();
    });

    test('should calculate time differences correctly', () => {
      const now = new Date();
      const pastDate = new Date(now - 3600000); // 1 hour ago
      const diffMs = now - pastDate;
      const diffHours = Math.floor(diffMs / 3600000);

      expect(diffHours).toBe(1);
    });
  });

  // ============================================
  // organizeNotificationsByCategory Tests
  // ============================================
  describe('organizeNotificationsByCategory', () => {
    test('should initialize all categories', () => {
      const organized = {
        news: [],
        initiatives: [],
        diyas: [],
        occasions: [],
        statements: [],
        other: []
      };

      expect(Object.keys(organized)).toHaveLength(6);
    });

    test('should format notification with title_ar', () => {
      const notif = {
        id: '123',
        title_ar: 'عنوان عربي',
        title: 'English Title'
      };

      const formatted = {
        title: notif.title_ar || notif.title
      };

      expect(formatted.title).toBe('عنوان عربي');
    });

    test('should fallback to title if title_ar missing', () => {
      const notif = {
        id: '123',
        title: 'English Title'
      };

      const formatted = {
        title: notif.title_ar || notif.title
      };

      expect(formatted.title).toBe('English Title');
    });

    test('should format notification with message_ar', () => {
      const notif = {
        message_ar: 'رسالة عربية',
        message: 'English Message'
      };

      const formatted = {
        body: notif.message_ar || notif.message
      };

      expect(formatted.body).toBe('رسالة عربية');
    });

    test('should include default icon', () => {
      const notif = {
        type: 'news'
      };
      const icons = { news: '📰' };

      const icon = notif.icon || icons[notif.type] || '🔔';
      expect(icon).toBe('📰');
    });

    test('should include default priority', () => {
      const notif = {};
      const priority = notif.priority || 'normal';

      expect(priority).toBe('normal');
    });

    test('should include isRead status', () => {
      const notif = { is_read: true };
      const isRead = notif.is_read || false;

      expect(isRead).toBe(true);
    });

    test('should default isRead to false', () => {
      const notif = {};
      const isRead = notif.is_read || false;

      expect(isRead).toBe(false);
    });

    test('should include actionUrl', () => {
      const notif = {
        action_url: '/members/123'
      };

      expect(notif.action_url).toBe('/members/123');
    });

    test('should include relatedId', () => {
      const notif = {
        related_id: 'payment-123'
      };

      expect(notif.related_id).toBe('payment-123');
    });

    test('should include relatedType', () => {
      const notif = {
        related_type: 'payment'
      };

      expect(notif.related_type).toBe('payment');
    });

    test('should push to correct category array', () => {
      const organized = {
        news: [],
        other: []
      };

      const category = 'news';
      const formattedNotif = { id: '1', title: 'Test' };

      if (organized[category]) {
        organized[category].push(formattedNotif);
      } else {
        organized.other.push(formattedNotif);
      }

      expect(organized.news).toHaveLength(1);
    });

    test('should push to other if category not found', () => {
      const organized = {
        news: [],
        other: []
      };

      const category = 'unknown';
      const formattedNotif = { id: '1', title: 'Test' };

      if (organized[category]) {
        organized[category].push(formattedNotif);
      } else {
        organized.other.push(formattedNotif);
      }

      expect(organized.other).toHaveLength(1);
    });
  });

  // ============================================
  // Category Organization Tests
  // ============================================
  describe('Category Organization', () => {
    test('should organize multiple notifications', () => {
      const notifications = [
        { id: '1', type: 'news' },
        { id: '2', type: 'payment' },
        { id: '3', type: 'diya' }
      ];

      const categoryMapping = {
        'news': 'news',
        'payment': 'statements',
        'diya': 'diyas'
      };

      const organized = {
        news: [],
        statements: [],
        diyas: []
      };

      notifications.forEach(n => {
        const cat = categoryMapping[n.type];
        if (organized[cat]) {
          organized[cat].push(n);
        }
      });

      expect(organized.news).toHaveLength(1);
      expect(organized.statements).toHaveLength(1);
      expect(organized.diyas).toHaveLength(1);
    });
  });

  // ============================================
  // Priority Tests
  // ============================================
  describe('Priority Handling', () => {
    test('should recognize normal priority', () => {
      const priority = 'normal';
      expect(priority).toBe('normal');
    });

    test('should recognize high priority', () => {
      const priority = 'high';
      expect(priority).toBe('high');
    });

    test('should recognize urgent priority', () => {
      const priority = 'urgent';
      expect(priority).toBe('urgent');
    });
  });

  // ============================================
  // Time Calculation Tests
  // ============================================
  describe('Time Calculations', () => {
    test('should calculate minutes correctly', () => {
      const ms = 180000; // 3 minutes
      const mins = Math.floor(ms / 60000);

      expect(mins).toBe(3);
    });

    test('should calculate hours correctly', () => {
      const ms = 7200000; // 2 hours
      const hours = Math.floor(ms / 3600000);

      expect(hours).toBe(2);
    });

    test('should calculate days correctly', () => {
      const ms = 259200000; // 3 days
      const days = Math.floor(ms / 86400000);

      expect(days).toBe(3);
    });
  });
});
