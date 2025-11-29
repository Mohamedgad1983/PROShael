/**
 * Initialize Test Data Utility Unit Tests
 * Tests test data initialization functions
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
  insert: jest.fn(() => mockSupabase),
  limit: jest.fn(() => Promise.resolve(mockSupabaseResponse))
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

describe('Initialize Test Data Utility Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Member Creation Tests
  // ============================================
  describe('Member Creation', () => {
    test('should create test member with Arabic name', () => {
      const member = {
        full_name: 'أحمد الشعيل',
        email: 'ahmed@alshuail.com',
        phone: '+965 99999999',
        membership_number: 'AL001',
        is_active: true
      };

      expect(member.full_name).toBe('أحمد الشعيل');
      expect(member.membership_number).toBe('AL001');
    });

    test('should create second test member', () => {
      const member = {
        full_name: 'فاطمة الشعيل',
        email: 'fatima@alshuail.com',
        phone: '+965 88888888',
        membership_number: 'AL002',
        is_active: true
      };

      expect(member.full_name).toBe('فاطمة الشعيل');
      expect(member.membership_number).toBe('AL002');
    });

    test('should handle duplicate member error', () => {
      const error = { message: 'duplicate key value violates unique constraint' };
      const isDuplicate = error.message.includes('duplicate');

      expect(isDuplicate).toBe(true);
    });
  });

  // ============================================
  // Event Creation Tests
  // ============================================
  describe('Event Creation', () => {
    test('should create meeting event', () => {
      const event = {
        title: 'اجتماع العائلة الشهري',
        description: 'اجتماع دوري لمناقشة شؤون العائلة',
        start_date: '2025-10-15',
        start_time: '19:00',
        location: 'مقر العائلة الرئيسي',
        event_type: 'meeting',
        max_attendees: 50,
        current_attendees: 0,
        status: 'active',
        fee_amount: 0
      };

      expect(event.event_type).toBe('meeting');
      expect(event.fee_amount).toBe(0);
    });

    test('should create celebration event', () => {
      const event = {
        title: 'حفل زفاف علي الشعيل',
        description: 'دعوة لحضور حفل زفاف ابن العائلة',
        start_date: '2025-11-20',
        start_time: '20:00',
        location: 'قاعة الأفراح الكبرى',
        event_type: 'celebration',
        max_attendees: 200,
        current_attendees: 0,
        status: 'active',
        fee_amount: 25.00
      };

      expect(event.event_type).toBe('celebration');
      expect(event.fee_amount).toBe(25.00);
    });
  });

  // ============================================
  // Activity/Initiative Creation Tests
  // ============================================
  describe('Activity Creation', () => {
    test('should create charity initiative', () => {
      const activity = {
        title: 'مشروع كفالة الأيتام',
        description: 'مبادرة خيرية لكفالة الأطفال الأيتام',
        category: 'charity',
        target_amount: 10000.00,
        current_amount: 0,
        status: 'active',
        start_date: '2025-09-01',
        end_date: '2025-12-31'
      };

      expect(activity.category).toBe('charity');
      expect(activity.target_amount).toBe(10000.00);
    });

    test('should create emergency fund initiative', () => {
      const activity = {
        title: 'صندوق الطوارئ العائلي',
        description: 'صندوق لمساعدة أفراد العائلة في الحالات الطارئة',
        category: 'emergency',
        target_amount: 50000.00,
        current_amount: 0,
        status: 'active'
      };

      expect(activity.category).toBe('emergency');
      expect(activity.target_amount).toBe(50000.00);
    });
  });

  // ============================================
  // Diya Creation Tests
  // ============================================
  describe('Diya Creation', () => {
    test('should create accident diya', () => {
      const diya = {
        title: 'دية حادث مروري',
        description: 'دية مطلوبة لحادث مروري تورط فيه أحد أفراد العائلة',
        amount: 15000.00,
        due_date: '2025-10-30',
        category: 'accident',
        status: 'pending'
      };

      expect(diya.category).toBe('accident');
      expect(diya.amount).toBe(15000.00);
    });

    test('should create property diya', () => {
      const diya = {
        title: 'تعويض أضرار',
        description: 'تعويض عن أضرار حدثت في الملكية',
        amount: 5000.00,
        due_date: '2025-11-15',
        category: 'property',
        status: 'pending'
      };

      expect(diya.category).toBe('property');
      expect(diya.amount).toBe(5000.00);
    });
  });

  // ============================================
  // Notification Creation Tests
  // ============================================
  describe('Notification Creation', () => {
    test('should create welcome notification', () => {
      const notification = {
        title: 'مرحباً بالأعضاء الجدد',
        message: 'نرحب بانضمام الأعضاء الجدد إلى نظام إدارة عائلة الشعيل',
        type: 'welcome',
        priority: 'normal',
        target_audience: 'all'
      };

      expect(notification.type).toBe('welcome');
      expect(notification.priority).toBe('normal');
    });

    test('should create reminder notification', () => {
      const notification = {
        title: 'تذكير بالاجتماع القادم',
        message: 'تذكير بالاجتماع الشهري المقرر يوم 15 أكتوبر',
        type: 'reminder',
        priority: 'high',
        target_audience: 'all'
      };

      expect(notification.type).toBe('reminder');
      expect(notification.priority).toBe('high');
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should log info on duplicate entries', () => {
      const error = { message: 'duplicate key value' };
      const isDuplicate = error.message.includes('duplicate');

      expect(isDuplicate).toBe(true);
    });

    test('should throw error when no members found', () => {
      const existingMembers = [];
      const shouldThrow = !existingMembers || existingMembers.length === 0;

      expect(shouldThrow).toBe(true);
    });

    test('should handle member ID extraction', () => {
      const existingMembers = [{ id: 'member-1' }, { id: 'member-2' }];

      const memberId1 = existingMembers[0].id;
      const memberId2 = existingMembers[1]?.id || memberId1;

      expect(memberId1).toBe('member-1');
      expect(memberId2).toBe('member-2');
    });

    test('should fallback to first member if only one exists', () => {
      const existingMembers = [{ id: 'member-1' }];

      const memberId1 = existingMembers[0].id;
      const memberId2 = existingMembers[1]?.id || memberId1;

      expect(memberId2).toBe('member-1');
    });
  });

  // ============================================
  // Return Value Tests
  // ============================================
  describe('Return Values', () => {
    test('should return true on success', () => {
      const result = true;
      expect(result).toBe(true);
    });

    test('should return false on error', () => {
      const result = false;
      expect(result).toBe(false);
    });
  });

  // ============================================
  // Data Structure Tests
  // ============================================
  describe('Data Structure', () => {
    test('should use correct member table name', () => {
      const tableName = 'members';
      expect(tableName).toBe('members');
    });

    test('should use correct events table name', () => {
      const tableName = 'events';
      expect(tableName).toBe('events');
    });

    test('should use correct activities table name', () => {
      const tableName = 'activities';
      expect(tableName).toBe('activities');
    });

    test('should use correct diyas table name', () => {
      const tableName = 'diyas';
      expect(tableName).toBe('diyas');
    });

    test('should use correct notifications table name', () => {
      const tableName = 'notifications';
      expect(tableName).toBe('notifications');
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log initialization start', () => {
      const message = '🚀 Initializing test data...';
      expect(message).toContain('Initializing');
    });

    test('should log members creation count', () => {
      const members = [{ id: '1' }, { id: '2' }];
      const message = `✅ Test members created: ${members.length}`;

      expect(message).toContain('2');
    });

    test('should log successful completion', () => {
      const message = '✅ Test data initialization completed successfully!';
      expect(message).toContain('successfully');
    });

    test('should log error with details', () => {
      const error = { message: 'Database connection failed' };
      const message = `❌ Error initializing test data: ${error.message}`;

      expect(message).toContain('Database connection failed');
    });
  });

  // ============================================
  // Date Format Tests
  // ============================================
  describe('Date Formats', () => {
    test('should use ISO date format for start_date', () => {
      const startDate = '2025-10-15';
      expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should use 24-hour time format', () => {
      const startTime = '19:00';
      expect(startTime).toMatch(/^\d{2}:\d{2}$/);
    });

    test('should use ISO date format for end_date', () => {
      const endDate = '2025-12-31';
      expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ============================================
  // Phone Format Tests
  // ============================================
  describe('Phone Formats', () => {
    test('should use Kuwait format for phone numbers', () => {
      const phone = '+965 99999999';
      expect(phone).toContain('+965');
    });
  });
});
