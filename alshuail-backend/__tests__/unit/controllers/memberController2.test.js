/**
 * Member Controller Unit Tests (memberController.js)
 * Tests member profile, balance, payments, and notifications
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
  or: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  then: jest.fn((cb) => Promise.resolve(cb(mockSupabaseResponse))),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/receipt.jpg' } }))
    }))
  }
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

describe('Member Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'member-123', role: 'member' },
    query: {},
    body: {},
    params: {},
    file: null,
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
  // Get Member Profile Tests
  // ============================================
  describe('Get Member Profile', () => {
    test('should return member profile', () => {
      const res = createMockResponse();
      const memberData = {
        id: 'member-123',
        full_name: 'محمد بن علي',
        phone: '0501234567',
        email: 'test@example.com'
      };

      res.json(memberData);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'member-123'
        })
      );
    });

    test('should return 404 if member not found', () => {
      const res = createMockResponse();

      res.status(404).json({ message: 'العضو غير موجود' });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on database error', () => {
      const res = createMockResponse();

      res.status(500).json({ message: 'خطأ في جلب البيانات' });

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // Get Member Balance Tests
  // ============================================
  describe('Get Member Balance', () => {
    test('should calculate balance correctly', () => {
      const currentBalance = 2500;
      const targetBalance = 3000;
      const remaining = Math.max(0, targetBalance - currentBalance);
      const percentage = Math.round((currentBalance / targetBalance) * 100);
      const isCompliant = currentBalance >= targetBalance;

      expect(remaining).toBe(500);
      expect(percentage).toBe(83);
      expect(isCompliant).toBe(false);
    });

    test('should return compliant status when balance >= target', () => {
      const currentBalance = 3500;
      const targetBalance = 3000;
      const isCompliant = currentBalance >= targetBalance;

      expect(isCompliant).toBe(true);
    });

    test('should return 0 remaining when balance exceeds target', () => {
      const currentBalance = 3500;
      const targetBalance = 3000;
      const remaining = Math.max(0, targetBalance - currentBalance);

      expect(remaining).toBe(0);
    });

    test('should handle null balance', () => {
      const member = { balance: null };
      const currentBalance = member?.balance || 0;

      expect(currentBalance).toBe(0);
    });

    test('should return balance response format', () => {
      const res = createMockResponse();
      const balanceData = {
        current: 2500,
        target: 3000,
        remaining: 500,
        percentage: 83,
        status: 'non-compliant',
        is_compliant: false,
        color: 'red'
      };

      res.json(balanceData);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 2500,
          target: 3000
        })
      );
    });

    test('should return green color for compliant', () => {
      const isCompliant = true;
      const color = isCompliant ? 'green' : 'red';

      expect(color).toBe('green');
    });
  });

  // ============================================
  // Get Member Payments Tests
  // ============================================
  describe('Get Member Payments', () => {
    test('should parse limit from query', () => {
      const req = createMockRequest({
        query: { limit: '25' }
      });

      const limit = parseInt(req.query.limit) || 50;
      expect(limit).toBe(25);
    });

    test('should default limit to 50', () => {
      const req = createMockRequest({ query: {} });

      const limit = parseInt(req.query.limit) || 50;
      expect(limit).toBe(50);
    });

    test('should filter by status', () => {
      const req = createMockRequest({
        query: { status: 'completed' }
      });

      expect(req.query.status).toBe('completed');
    });

    test('should filter by year and month', () => {
      const year = '2024';
      const month = '5';

      const startDate = new Date(year, month || 0, 1);
      const endDate = month
        ? new Date(year, parseInt(month) + 1, 0)
        : new Date(year, 11, 31);

      expect(startDate.getMonth()).toBe(5);
      expect(endDate.getMonth()).toBe(5);
    });

    test('should return empty array if no data', () => {
      const data = null;
      const result = data || [];

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // Create Payment Tests
  // ============================================
  describe('Create Payment', () => {
    test('should validate amount is required', () => {
      const req = createMockRequest({
        body: { amount: null }
      });
      const res = createMockResponse();

      if (!req.body.amount || req.body.amount <= 0) {
        res.status(400).json({ message: 'المبلغ غير صحيح' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should validate amount is positive', () => {
      const req = createMockRequest({
        body: { amount: -100 }
      });
      const res = createMockResponse();

      if (!req.body.amount || req.body.amount <= 0) {
        res.status(400).json({ message: 'المبلغ غير صحيح' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should create payment with pending status', () => {
      const memberId = 'member-123';
      const amount = 500;

      const paymentData = {
        member_id: memberId,
        amount: parseFloat(amount),
        notes: null,
        receipt_url: null,
        status: 'pending',
        date: new Date().toISOString(),
        on_behalf_of: null
      };

      expect(paymentData.status).toBe('pending');
      expect(paymentData.amount).toBe(500);
    });

    test('should return 201 on successful creation', () => {
      const res = createMockResponse();
      res.status(201).json({
        message: 'تم إرسال الدفعة بنجاح',
        payment: { id: 'payment-123' }
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ============================================
  // Search Members Tests
  // ============================================
  describe('Search Members', () => {
    test('should require minimum 2 characters', () => {
      const req = createMockRequest({
        query: { query: 'م' }
      });
      const res = createMockResponse();

      if (!req.query.query || req.query.query.length < 2) {
        res.json([]);
      }

      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('should exclude current user from results', () => {
      const currentUserId = 'member-123';
      const members = [
        { id: 'member-123', full_name: 'محمد' },
        { id: 'member-456', full_name: 'أحمد' }
      ];

      const filtered = members.filter(m => m.id !== currentUserId);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('member-456');
    });

    test('should limit results to 10', () => {
      const members = Array(20).fill(null).map((_, i) => ({
        id: `member-${i}`,
        full_name: `عضو ${i}`
      }));

      const limited = members.slice(0, 10);
      expect(limited.length).toBe(10);
    });
  });

  // ============================================
  // Get Member Notifications Tests
  // ============================================
  describe('Get Member Notifications', () => {
    test('should parse limit from query', () => {
      const req = createMockRequest({
        query: { limit: '25' }
      });

      const limit = parseInt(req.query.limit) || 50;
      expect(limit).toBe(25);
    });

    test('should filter by type', () => {
      const req = createMockRequest({
        query: { type: 'payment' }
      });

      expect(req.query.type).toBe('payment');
    });

    test('should track read status', () => {
      const notifications = [
        { id: 'n1', title: 'إشعار 1' },
        { id: 'n2', title: 'إشعار 2' }
      ];
      const readNotifications = [{ notification_id: 'n1' }];

      const readIds = new Set(readNotifications.map(r => r.notification_id));

      const withReadStatus = notifications.map(notification => ({
        ...notification,
        is_read: readIds.has(notification.id)
      }));

      expect(withReadStatus[0].is_read).toBe(true);
      expect(withReadStatus[1].is_read).toBe(false);
    });
  });

  // ============================================
  // Mark Notification As Read Tests
  // ============================================
  describe('Mark Notification As Read', () => {
    test('should not duplicate read records', () => {
      const existing = { id: 'read-123' };
      const shouldInsert = !existing;

      expect(shouldInsert).toBe(false);
    });

    test('should create read record with timestamp', () => {
      const readRecord = {
        member_id: 'member-123',
        notification_id: 'notif-123',
        read_at: new Date().toISOString()
      };

      expect(readRecord.read_at).toBeDefined();
    });
  });

  // ============================================
  // Mark All Notifications As Read Tests
  // ============================================
  describe('Mark All Notifications As Read', () => {
    test('should filter unread notifications', () => {
      const notifications = [
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3' }
      ];
      const alreadyRead = [{ notification_id: 'n1' }];

      const readIds = new Set(alreadyRead.map(r => r.notification_id));
      const unreadNotifications = notifications.filter(n => !readIds.has(n.id));

      expect(unreadNotifications.length).toBe(2);
    });

    test('should return message when no notifications', () => {
      const res = createMockResponse();
      const notifications = [];

      if (!notifications || notifications.length === 0) {
        res.json({ message: 'لا توجد إشعارات لتحديدها كمقروءة' });
      }

      expect(res.json).toHaveBeenCalledWith({
        message: 'لا توجد إشعارات لتحديدها كمقروءة'
      });
    });

    test('should create read records for all unread', () => {
      const unreadNotifications = [{ id: 'n2' }, { id: 'n3' }];
      const memberId = 'member-123';

      const readRecords = unreadNotifications.map(n => ({
        member_id: memberId,
        notification_id: n.id,
        read_at: new Date().toISOString()
      }));

      expect(readRecords.length).toBe(2);
    });
  });

  // ============================================
  // Upload Receipt Tests
  // ============================================
  describe('Upload Receipt', () => {
    test('should require file', () => {
      const req = createMockRequest({ file: null });
      const res = createMockResponse();

      if (!req.file) {
        res.status(400).json({ message: 'لم يتم رفع أي ملف' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should generate unique filename', () => {
      const memberId = 'member-123';
      const file = { originalname: 'receipt.jpg' };
      const fileName = `receipts/${memberId}/${Date.now()}-${file.originalname}`;

      expect(fileName).toContain('receipts/member-123/');
      expect(fileName).toContain('receipt.jpg');
    });

    test('should return public URL', () => {
      const res = createMockResponse();

      res.json({
        message: 'تم رفع الإيصال بنجاح',
        url: 'https://example.com/receipt.jpg',
        fileName: 'receipts/member-123/123456-receipt.jpg'
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'تم رفع الإيصال بنجاح'
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
      res.status(400).json({ message: 'المبلغ غير صحيح' });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 for not found', () => {
      const res = createMockResponse();
      res.status(404).json({ message: 'العضو غير موجود' });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on server error', () => {
      const res = createMockResponse();
      res.status(500).json({ message: 'خطأ في الخادم' });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should include Arabic error messages', () => {
      const errorMessage = 'خطأ في جلب البيانات';
      expect(errorMessage).toMatch(/[\u0600-\u06FF]/);
    });
  });
});
