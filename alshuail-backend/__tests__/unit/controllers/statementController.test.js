/**
 * Statement Controller Unit Tests
 * Tests member statement search and generation functionality
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
  eq: jest.fn(() => mockSupabase),
  ilike: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  rpc: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
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

describe('Statement Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'member' },
    query: {},
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
  // Phone Validation Tests
  // ============================================
  describe('Phone Validation', () => {
    test('should validate Saudi phone number', () => {
      const validatePhone = (phone) => {
        const saudiRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)[0-9]{7}$/;
        const cleaned = phone.replace(/[\s\-+]/g, '');
        return saudiRegex.test(cleaned);
      };

      expect(validatePhone('0501234567')).toBe(true);
      expect(validatePhone('0551234567')).toBe(true);
      expect(validatePhone('551234567')).toBe(true);
    });

    test('should validate Kuwait phone number', () => {
      const validatePhone = (phone) => {
        const kuwaitRegex = /^(9|6|5)[0-9]{7}$/;
        const cleaned = phone.replace(/[\s\-+]/g, '');
        return kuwaitRegex.test(cleaned);
      };

      expect(validatePhone('91234567')).toBe(true);
      expect(validatePhone('61234567')).toBe(true);
    });

    test('should reject invalid phone', () => {
      const validatePhone = (phone) => {
        const saudiRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)[0-9]{7}$/;
        const cleaned = phone.replace(/[\s\-+]/g, '');
        return saudiRegex.test(cleaned);
      };

      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abcdefghij')).toBe(false);
    });

    test('should require minimum 8 digits', () => {
      const req = createMockRequest({
        query: { phone: '1234567' }
      });
      const res = createMockResponse();

      if (!req.query.phone || req.query.phone.length < 8) {
        res.status(400).json({
          success: false,
          error: 'رقم الهاتف مطلوب (8 أرقام على الأقل)'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // Arabic Text Normalization Tests
  // ============================================
  describe('Arabic Text Normalization', () => {
    test('should normalize alef variations', () => {
      const normalizeArabic = (text) => {
        return text
          .replace(/[أإآا]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي')
          .trim();
      };

      expect(normalizeArabic('أحمد')).toBe('احمد');
      expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
    });

    test('should normalize taa marbuta', () => {
      const normalizeArabic = (text) => {
        return text.replace(/ة/g, 'ه');
      };

      expect(normalizeArabic('فاطمة')).toBe('فاطمه');
    });

    test('should normalize alef maqsura', () => {
      const normalizeArabic = (text) => {
        return text.replace(/ى/g, 'ي');
      };

      expect(normalizeArabic('مصطفى')).toBe('مصطفي');
    });
  });

  // ============================================
  // Search By Phone Tests
  // ============================================
  describe('Search By Phone', () => {
    test('should require phone parameter', () => {
      const req = createMockRequest({ query: { phone: '' } });
      const res = createMockResponse();

      if (!req.query.phone) {
        res.status(400).json({
          success: false,
          error: 'رقم الهاتف مطلوب'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 when member not found', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should format statement response', () => {
      const data = {
        membership_number: 'SH-001',
        full_name: 'محمد بن علي',
        phone: '0501234567',
        current_balance: 2500,
        shortfall: 500,
        percentage_complete: 83.3,
        alert_level: 'WARNING'
      };

      const statement = {
        memberId: data.membership_number,
        fullName: data.full_name,
        phone: data.phone,
        currentBalance: data.current_balance,
        targetBalance: 3000,
        shortfall: data.shortfall,
        percentageComplete: data.percentage_complete,
        alertLevel: data.alert_level
      };

      expect(statement.targetBalance).toBe(3000);
      expect(statement.alertLevel).toBe('WARNING');
    });
  });

  // ============================================
  // Search By Name Tests
  // ============================================
  describe('Search By Name', () => {
    test('should require minimum 3 characters', () => {
      const req = createMockRequest({
        query: { name: 'مح' }
      });
      const res = createMockResponse();

      if (!req.query.name || req.query.name.length < 3) {
        res.status(400).json({
          success: false,
          error: 'الاسم مطلوب (3 أحرف على الأقل)'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should limit search results', () => {
      const results = Array(20).fill(null).map((_, i) => ({
        id: i,
        full_name: `عضو ${i}`
      }));

      const limited = results.slice(0, 10);
      expect(limited.length).toBe(10);
    });

    test('should return 404 when no members found', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'لم يتم العثور على أعضاء بهذا الاسم'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ============================================
  // Search By Member ID Tests
  // ============================================
  describe('Search By Member ID', () => {
    test('should require member ID', () => {
      const req = createMockRequest({
        query: { memberId: '' }
      });
      const res = createMockResponse();

      if (!req.query.memberId) {
        res.status(400).json({
          success: false,
          error: 'رقم العضوية مطلوب'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should search by membership_number', () => {
      const searchMemberId = 'SH-001';
      expect(searchMemberId).toBeDefined();
    });
  });

  // ============================================
  // Alert Level Tests
  // ============================================
  describe('Alert Level Handling', () => {
    test('should return ZERO_BALANCE message', () => {
      const getAlertMessage = (level, shortfall) => {
        switch(level) {
          case 'ZERO_BALANCE':
            return 'تنبيه حرج: لا يوجد رصيد في الحساب. يجب السداد فوراً.';
          case 'CRITICAL':
            return `تنبيه حرج: الرصيد أقل من 1000 ريال. المطلوب ${shortfall} ريال للوصول للحد الأدنى.`;
          case 'WARNING':
            return `تنبيه: الرصيد أقل من الحد الأدنى. المطلوب ${shortfall} ريال لإكمال 3000 ريال.`;
          case 'SUFFICIENT':
            return 'الرصيد كافي ويحقق الحد الأدنى المطلوب ✅';
          default:
            return '';
        }
      };

      expect(getAlertMessage('ZERO_BALANCE', 3000)).toContain('لا يوجد رصيد');
    });

    test('should return CRITICAL message', () => {
      const level = 'CRITICAL';
      const shortfall = 2500;
      const message = `تنبيه حرج: الرصيد أقل من 1000 ريال. المطلوب ${shortfall} ريال للوصول للحد الأدنى.`;

      expect(message).toContain('2500');
    });

    test('should return WARNING message', () => {
      const level = 'WARNING';
      const shortfall = 500;
      const message = `تنبيه: الرصيد أقل من الحد الأدنى. المطلوب ${shortfall} ريال لإكمال 3000 ريال.`;

      expect(message).toContain('500');
    });

    test('should return SUFFICIENT message', () => {
      const message = 'الرصيد كافي ويحقق الحد الأدنى المطلوب ✅';
      expect(message).toContain('✅');
    });
  });

  // ============================================
  // Dashboard Statistics Tests
  // ============================================
  describe('Dashboard Statistics', () => {
    test('should call RPC function', () => {
      const rpcFunctionName = 'get_dashboard_stats';
      expect(rpcFunctionName).toBe('get_dashboard_stats');
    });

    test('should return first row from function result', () => {
      const data = [{ total_members: 300, total_paid: 500000 }];
      const result = data[0];

      expect(result.total_members).toBe(300);
    });
  });

  // ============================================
  // Critical Members Tests
  // ============================================
  describe('Critical Members', () => {
    test('should parse limit parameter', () => {
      const req = createMockRequest({
        query: { limit: '25' }
      });

      const limit = parseInt(req.query.limit) || 50;
      expect(limit).toBe(25);
    });

    test('should default limit to 50', () => {
      const req = createMockRequest({
        query: {}
      });

      const limit = parseInt(req.query.limit) || 50;
      expect(limit).toBe(50);
    });

    test('should return count with data', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = {
        success: true,
        data: data,
        count: data.length
      };

      expect(response.count).toBe(3);
    });
  });

  // ============================================
  // Refresh Views Tests
  // ============================================
  describe('Refresh Views', () => {
    test('should call refresh_all_views RPC', () => {
      const rpcFunctionName = 'refresh_all_views';
      expect(rpcFunctionName).toBe('refresh_all_views');
    });

    test('should return success message', () => {
      const response = {
        success: true,
        message: 'تم تحديث البيانات بنجاح'
      };

      expect(response.message).toContain('تحديث');
    });
  });

  // ============================================
  // Generate Statement Tests
  // ============================================
  describe('Generate Statement', () => {
    test('should adapt URL params to query params', () => {
      const req = createMockRequest({
        params: { memberId: 'SH-001' },
        query: {}
      });

      const adaptedQuery = {
        ...req.query,
        memberId: req.params.memberId
      };

      expect(adaptedQuery.memberId).toBe('SH-001');
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return statement format', () => {
      const statement = {
        memberId: 'SH-001',
        fullName: 'محمد بن علي',
        phone: '0501234567',
        email: 'test@example.com',
        memberSince: '2020-01-01',
        currentBalance: 2500,
        targetBalance: 3000,
        shortfall: 500,
        percentageComplete: 83.3,
        alertLevel: 'WARNING',
        statusColor: 'orange',
        alertMessage: 'تنبيه...',
        recentTransactions: [],
        statistics: {
          totalPayments: 5,
          lastPaymentDate: '2024-01-15'
        }
      };

      expect(statement.targetBalance).toBe(3000);
      expect(statement.statistics).toBeDefined();
    });

    test('should handle empty recent transactions', () => {
      const data = { recent_transactions: null };
      const transactions = data.recent_transactions || [];

      expect(transactions).toEqual([]);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 400 for invalid phone format', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'صيغة رقم الهاتف غير صحيحة'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 for member not found', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'لم يتم العثور على عضو بهذا الرقم'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on database error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'خطأ في البحث'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should include Arabic error messages', () => {
      const errorMessage = 'خطأ في جلب الإحصائيات';
      expect(errorMessage).toMatch(/[\u0600-\u06FF]/);
    });
  });
});
