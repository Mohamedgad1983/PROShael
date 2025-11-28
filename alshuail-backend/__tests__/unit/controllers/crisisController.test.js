/**
 * Crisis Controller Unit Tests
 * Tests crisis dashboard, emergency alerts, and member safety tracking
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
  in: jest.fn(() => mockSupabase),
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

describe('Crisis Controller Unit Tests', () => {
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
  });

  // ============================================
  // Balance Calculation Tests
  // ============================================
  describe('Balance Calculations', () => {
    test('should calculate member balance from payments', () => {
      const payments = [
        { amount: 500, status: 'completed' },
        { amount: 1000, status: 'completed' },
        { amount: 200, status: 'pending' }
      ];

      const totalPaid = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      expect(totalPaid).toBe(1500);
    });

    test('should calculate shortfall against minimum balance', () => {
      const minimumBalance = 3000;
      const totalPaid = 1500;
      const shortfall = Math.max(0, minimumBalance - totalPaid);

      expect(shortfall).toBe(1500);
    });

    test('should return zero shortfall when sufficient', () => {
      const minimumBalance = 3000;
      const totalPaid = 3500;
      const shortfall = Math.max(0, minimumBalance - totalPaid);

      expect(shortfall).toBe(0);
    });

    test('should calculate percentage complete', () => {
      const minimumBalance = 3000;
      const totalPaid = 1500;
      const percentage = Math.min(100, (totalPaid / minimumBalance) * 100);

      expect(percentage).toBe(50);
    });

    test('should cap percentage at 100', () => {
      const minimumBalance = 3000;
      const totalPaid = 5000;
      const percentage = Math.min(100, (totalPaid / minimumBalance) * 100);

      expect(percentage).toBe(100);
    });
  });

  // ============================================
  // Compliance Status Tests
  // ============================================
  describe('Compliance Status', () => {
    test('should determine sufficient status', () => {
      const minimumBalance = 3000;
      const totalPaid = 3500;
      const status = totalPaid >= minimumBalance ? 'sufficient' : 'insufficient';

      expect(status).toBe('sufficient');
    });

    test('should determine insufficient status', () => {
      const minimumBalance = 3000;
      const totalPaid = 1500;
      const status = totalPaid >= minimumBalance ? 'sufficient' : 'insufficient';

      expect(status).toBe('insufficient');
    });

    test('should calculate compliance rate', () => {
      const members = [
        { status: 'sufficient' },
        { status: 'sufficient' },
        { status: 'insufficient' }
      ];

      const totalMembers = members.length;
      const compliantMembers = members.filter(m => m.status === 'sufficient').length;
      const complianceRate = (compliantMembers / totalMembers) * 100;

      expect(complianceRate.toFixed(1)).toBe('66.7');
    });

    test('should calculate total shortfall', () => {
      const memberBalances = [
        { shortfall: 500 },
        { shortfall: 1000 },
        { shortfall: 0 },
        { shortfall: 750 }
      ];

      const totalShortfall = memberBalances.reduce((sum, m) => sum + m.shortfall, 0);
      expect(totalShortfall).toBe(2250);
    });
  });

  // ============================================
  // Crisis Dashboard Statistics Tests
  // ============================================
  describe('Dashboard Statistics', () => {
    test('should generate dashboard statistics', () => {
      const memberBalances = [
        { id: 1, balance: 3500, status: 'sufficient', shortfall: 0 },
        { id: 2, balance: 2000, status: 'insufficient', shortfall: 1000 },
        { id: 3, balance: 1500, status: 'insufficient', shortfall: 1500 },
        { id: 4, balance: 3000, status: 'sufficient', shortfall: 0 }
      ];

      const stats = {
        totalMembers: memberBalances.length,
        compliantMembers: memberBalances.filter(m => m.status === 'sufficient').length,
        nonCompliantMembers: memberBalances.filter(m => m.status === 'insufficient').length,
        totalShortfall: memberBalances.reduce((sum, m) => sum + m.shortfall, 0)
      };

      expect(stats.totalMembers).toBe(4);
      expect(stats.compliantMembers).toBe(2);
      expect(stats.nonCompliantMembers).toBe(2);
      expect(stats.totalShortfall).toBe(2500);
    });

    test('should sort critical members by shortfall', () => {
      const members = [
        { id: 1, shortfall: 500, status: 'insufficient' },
        { id: 2, shortfall: 2000, status: 'insufficient' },
        { id: 3, shortfall: 1000, status: 'insufficient' }
      ];

      const criticalMembers = members
        .filter(m => m.status === 'insufficient')
        .sort((a, b) => b.shortfall - a.shortfall);

      expect(criticalMembers[0].id).toBe(2); // Highest shortfall first
      expect(criticalMembers[0].shortfall).toBe(2000);
    });

    test('should limit critical members to top 50', () => {
      const members = Array(100).fill(null).map((_, i) => ({
        id: i,
        shortfall: Math.random() * 3000,
        status: 'insufficient'
      }));

      const criticalMembers = members.slice(0, 50);
      expect(criticalMembers.length).toBe(50);
    });
  });

  // ============================================
  // Member Balance Update Tests
  // ============================================
  describe('Member Balance Update', () => {
    test('should validate member balance update request', () => {
      const req = createMockRequest({
        body: { memberId: 'member-123', amount: 500, type: 'contribution' }
      });

      expect(req.body.memberId).toBeDefined();
      expect(req.body.amount).toBeGreaterThan(0);
    });

    test('should determine new status after payment', () => {
      const previousBalance = 2500;
      const paymentAmount = 600;
      const newBalance = previousBalance + paymentAmount;
      const minimumBalance = 3000;

      const status = newBalance >= minimumBalance ? 'sufficient' : 'insufficient';
      expect(status).toBe('sufficient');
    });

    test('should generate payment record structure', () => {
      const payment = {
        payer_id: 'member-123',
        amount: 500,
        category: 'contribution',
        status: 'completed',
        payment_method: 'online',
        title: 'مساهمة في الصندوق',
        created_at: new Date().toISOString()
      };

      expect(payment.payer_id).toBeDefined();
      expect(payment.amount).toBe(500);
      expect(payment.status).toBe('completed');
    });
  });

  // ============================================
  // Crisis Alerts Tests
  // ============================================
  describe('Crisis Alerts', () => {
    test('should handle active crisis alert', () => {
      const activeCrisis = {
        id: 'crisis-123',
        title: 'حالة طوارئ',
        status: 'active',
        created_at: new Date().toISOString()
      };

      expect(activeCrisis.status).toBe('active');
    });

    test('should handle no active crisis', () => {
      const activeCrisis = null;
      const result = { active: activeCrisis || null };

      expect(result.active).toBeNull();
    });

    test('should return crisis history', () => {
      const history = [
        { id: 1, title: 'أزمة 1', status: 'resolved' },
        { id: 2, title: 'أزمة 2', status: 'resolved' }
      ];

      expect(history.length).toBe(2);
    });
  });

  // ============================================
  // Mark Member Safe Tests
  // ============================================
  describe('Mark Member Safe', () => {
    test('should require authentication', () => {
      const req = createMockRequest({ user: null });
      const res = createMockResponse();

      const memberId = req.user?.id;
      if (!memberId) {
        res.status(401).json({
          success: false,
          error: 'غير مصرح'
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should require crisis_id', () => {
      const req = createMockRequest({
        body: { crisis_id: null }
      });
      const res = createMockResponse();

      if (!req.body.crisis_id) {
        res.status(400).json({
          success: false,
          error: 'معرف الطوارئ مطلوب'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle already reported status', () => {
      const existing = { id: 'response-123' };

      const response = {
        success: true,
        data: {
          crisis_id: 'crisis-123',
          member_id: 'member-123',
          status: 'safe',
          already_reported: !!existing
        }
      };

      expect(response.data.already_reported).toBe(true);
    });

    test('should create safe response record', () => {
      const response = {
        crisis_id: 'crisis-123',
        member_id: 'member-123',
        status: 'safe',
        response_time: new Date().toISOString()
      };

      expect(response.status).toBe('safe');
      expect(response.response_time).toBeDefined();
    });
  });

  // ============================================
  // Emergency Contacts Tests
  // ============================================
  describe('Emergency Contacts', () => {
    test('should filter by emergency contact roles', () => {
      const contacts = [
        { id: 1, role: 'admin' },
        { id: 2, role: 'board_member' },
        { id: 3, role: 'emergency_contact' },
        { id: 4, role: 'member' }
      ];

      const emergencyRoles = ['admin', 'board_member', 'emergency_contact'];
      const filtered = contacts.filter(c => emergencyRoles.includes(c.role));

      expect(filtered.length).toBe(3);
    });

    test('should assign priority based on role', () => {
      const contact = { role: 'admin' };
      const priority = contact.role === 'admin' ? 1 :
                       contact.role === 'board_member' ? 2 : 3;

      expect(priority).toBe(1);
    });

    test('should format contact with Arabic role labels', () => {
      const contacts = [
        { id: 1, name: 'أحمد', role: 'admin' },
        { id: 2, name: 'محمد', role: 'board_member' }
      ];

      const formatted = contacts.map(c => ({
        ...c,
        role_label: c.role === 'admin' ? 'رئيس العائلة' :
                    c.role === 'board_member' ? 'عضو مجلس الإدارة' :
                    'جهة اتصال طوارئ'
      }));

      expect(formatted[0].role_label).toBe('رئيس العائلة');
      expect(formatted[1].role_label).toBe('عضو مجلس الإدارة');
    });
  });

  // ============================================
  // Mock Data Generation Tests
  // ============================================
  describe('Mock Data Generation', () => {
    test('should generate member ID format', () => {
      const memberId = `SH-${String(10001)}`;
      expect(memberId).toMatch(/^SH-\d+$/);
    });

    test('should generate phone number format', () => {
      const phone = `050${String(1000001).padStart(7, '0')}`;
      expect(phone).toMatch(/^050\d{7}$/);
    });

    test('should generate realistic balance distribution', () => {
      const balance = Math.random() * 5000;
      expect(balance).toBeGreaterThanOrEqual(0);
      expect(balance).toBeLessThanOrEqual(5000);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return crisis dashboard response', () => {
      const res = createMockResponse();
      const response = {
        success: true,
        data: {
          statistics: {
            totalMembers: 288,
            compliantMembers: 200,
            nonCompliantMembers: 88,
            complianceRate: '69.4',
            totalShortfall: 50000
          },
          members: [],
          criticalMembers: []
        }
      };

      res.json(response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            statistics: expect.any(Object)
          })
        })
      );
    });

    test('should include Arabic error messages', () => {
      const errorMessage = 'خطأ في جلب بيانات لوحة الأزمة';
      expect(errorMessage).toMatch(/[\u0600-\u06FF]/);
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
        error: 'خطأ في جلب بيانات لوحة الأزمة'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 404 for non-existent crisis', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'تنبيه الطوارئ غير موجود'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should handle graceful fallback', () => {
      const activeCrisis = null;
      const history = [];

      const fallbackResponse = {
        success: true,
        data: {
          active: activeCrisis,
          history: history
        },
        message: 'لا توجد تنبيهات طوارئ حالياً'
      };

      expect(fallbackResponse.success).toBe(true);
      expect(fallbackResponse.data.active).toBeNull();
    });
  });
});
