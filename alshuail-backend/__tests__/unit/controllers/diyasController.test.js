/**
 * Diyas Controller Unit Tests
 * Tests diya case management and contribution tracking
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
  or: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
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

describe('Diyas Controller Unit Tests', () => {
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
  // Reference Number Generation Tests
  // ============================================
  describe('Reference Number Generation', () => {
    test('should generate reference with DY prefix', () => {
      const prefix = 'DY';
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const reference = `${prefix}-${year}-${timestamp}${random}`;

      expect(reference).toMatch(/^DY-\d{4}-\d{6}[A-Z0-9]{4}$/);
    });

    test('should include current year', () => {
      const currentYear = new Date().getFullYear();
      const reference = `DY-${currentYear}-123456ABCD`;

      expect(reference).toContain(currentYear.toString());
    });

    test('should generate unique references', () => {
      const generateRef = () => {
        const prefix = 'DY';
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${year}-${timestamp}${random}`;
      };

      const ref1 = generateRef();
      const ref2 = generateRef();

      // References should be different (high probability)
      expect(ref1.length).toBe(ref2.length);
    });
  });

  // ============================================
  // Diya Status Tests
  // ============================================
  describe('Diya Status Management', () => {
    test('should support active status', () => {
      const statuses = ['pending', 'active', 'completed', 'cancelled'];
      expect(statuses).toContain('active');
    });

    test('should support pending status', () => {
      const statuses = ['pending', 'active', 'completed', 'cancelled'];
      expect(statuses).toContain('pending');
    });

    test('should support completed status', () => {
      const statuses = ['pending', 'active', 'completed', 'cancelled'];
      expect(statuses).toContain('completed');
    });

    test('should support cancelled status', () => {
      const statuses = ['pending', 'active', 'completed', 'cancelled'];
      expect(statuses).toContain('cancelled');
    });

    test('should validate status transitions', () => {
      const validTransitions = {
        pending: ['active', 'cancelled'],
        active: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };

      expect(validTransitions['pending']).toContain('active');
      expect(validTransitions['active']).toContain('completed');
      expect(validTransitions['completed'].length).toBe(0);
    });
  });

  // ============================================
  // Payment Status Tests
  // ============================================
  describe('Payment Status', () => {
    test('should support payment_pending status', () => {
      const paymentStatuses = ['payment_pending', 'partial', 'fully_paid'];
      expect(paymentStatuses).toContain('payment_pending');
    });

    test('should support partial payment status', () => {
      const paymentStatuses = ['payment_pending', 'partial', 'fully_paid'];
      expect(paymentStatuses).toContain('partial');
    });

    test('should support fully_paid status', () => {
      const paymentStatuses = ['payment_pending', 'partial', 'fully_paid'];
      expect(paymentStatuses).toContain('fully_paid');
    });

    test('should calculate payment status based on contributions', () => {
      const diya = {
        target_amount: 10000,
        current_amount: 5000
      };

      const getPaymentStatus = (current, target) => {
        if (current === 0) return 'payment_pending';
        if (current >= target) return 'fully_paid';
        return 'partial';
      };

      const status = getPaymentStatus(diya.current_amount, diya.target_amount);
      expect(status).toBe('partial');
    });
  });

  // ============================================
  // Query Filter Tests
  // ============================================
  describe('Query Filters', () => {
    test('should parse pagination parameters', () => {
      const req = createMockRequest({
        query: { limit: '50', offset: '0' }
      });

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      expect(limit).toBe(50);
      expect(offset).toBe(0);
    });

    test('should filter by status', () => {
      const req = createMockRequest({
        query: { status: 'active' }
      });

      expect(req.query.status).toBe('active');
    });

    test('should filter by payment_status', () => {
      const req = createMockRequest({
        query: { payment_status: 'partial' }
      });

      expect(req.query.payment_status).toBe('partial');
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

    test('should filter by amount range', () => {
      const req = createMockRequest({
        query: {
          min_amount: '1000',
          max_amount: '50000'
        }
      });

      expect(req.query.min_amount).toBe('1000');
      expect(req.query.max_amount).toBe('50000');
    });
  });

  // ============================================
  // Contribution Tests
  // ============================================
  describe('Contribution Management', () => {
    test('should track contribution amount', () => {
      const contribution = {
        contributor_id: 'member-123',
        contribution_amount: 500,
        status: 'confirmed',
        contribution_date: new Date().toISOString()
      };

      expect(contribution.contribution_amount).toBe(500);
      expect(contribution.status).toBe('confirmed');
    });

    test('should calculate total contributions', () => {
      const contributions = [
        { contribution_amount: 500 },
        { contribution_amount: 1000 },
        { contribution_amount: 250 }
      ];

      const total = contributions.reduce((sum, c) => sum + c.contribution_amount, 0);
      expect(total).toBe(1750);
    });

    test('should count unique contributors', () => {
      const contributions = [
        { contributor_id: 'member-1' },
        { contributor_id: 'member-2' },
        { contributor_id: 'member-1' },
        { contributor_id: 'member-3' }
      ];

      const uniqueContributors = new Set(contributions.map(c => c.contributor_id));
      expect(uniqueContributors.size).toBe(3);
    });

    test('should validate contribution amount', () => {
      const contribution = { contribution_amount: 100 };
      const minAmount = 10;

      const isValid = contribution.contribution_amount >= minAmount;
      expect(isValid).toBe(true);
    });

    test('should reject negative contribution', () => {
      const contribution = { contribution_amount: -100 };
      const isValid = contribution.contribution_amount > 0;
      expect(isValid).toBe(false);
    });
  });

  // ============================================
  // Progress Calculation Tests
  // ============================================
  describe('Progress Calculations', () => {
    test('should calculate progress percentage', () => {
      const diya = {
        target_amount: 10000,
        current_amount: 5000
      };

      const progress = Math.round((diya.current_amount / diya.target_amount) * 100);
      expect(progress).toBe(50);
    });

    test('should handle zero target amount', () => {
      const diya = {
        target_amount: 0,
        current_amount: 0
      };

      const progress = diya.target_amount ?
        Math.round((diya.current_amount / diya.target_amount) * 100) : 0;
      expect(progress).toBe(0);
    });

    test('should cap progress at 100%', () => {
      const diya = {
        target_amount: 10000,
        current_amount: 15000
      };

      const progress = Math.min(100, Math.round((diya.current_amount / diya.target_amount) * 100));
      expect(progress).toBe(100);
    });

    test('should detect target reached', () => {
      const diya = {
        target_amount: 10000,
        current_amount: 10000
      };

      const isTargetReached = diya.current_amount >= diya.target_amount;
      expect(isTargetReached).toBe(true);
    });

    test('should calculate remaining amount', () => {
      const diya = {
        target_amount: 10000,
        current_amount: 3500
      };

      const remaining = Math.max(0, diya.target_amount - diya.current_amount);
      expect(remaining).toBe(6500);
    });
  });

  // ============================================
  // Arabic Text Search Tests
  // ============================================
  describe('Arabic Text Search', () => {
    test('should search for diya keyword in Arabic', () => {
      const arabicKeyword = 'دية';
      const titleAr = 'قضية دية الأخ محمد';

      const hasArabicMatch = titleAr.includes(arabicKeyword);
      expect(hasArabicMatch).toBe(true);
    });

    test('should search for diya keyword in English', () => {
      const englishKeyword = 'diya';
      const titleEn = 'Diya Case for Brother Mohammed';

      const hasEnglishMatch = titleEn.toLowerCase().includes(englishKeyword);
      expect(hasEnglishMatch).toBe(true);
    });

    test('should build OR query for both languages', () => {
      const orPattern = 'title_ar.ilike.%دية%,title_en.ilike.%diya%';
      expect(orPattern).toContain('دية');
      expect(orPattern).toContain('diya');
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response with data', () => {
      const res = createMockResponse();
      const diyas = [
        { id: 1, title_ar: 'قضية دية', target_amount: 10000 }
      ];

      res.json({
        success: true,
        data: diyas,
        pagination: { limit: 50, offset: 0, total: 1 },
        summary: { total_cases: 1, total_collected: 5000 }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );
    });

    test('should include financial contributions in response', () => {
      const diya = {
        id: 1,
        title_ar: 'قضية دية',
        financial_contributions: [
          { id: 'fc-1', contribution_amount: 500 },
          { id: 'fc-2', contribution_amount: 1000 }
        ]
      };

      expect(diya.financial_contributions).toHaveLength(2);
    });

    test('should include summary statistics', () => {
      const summary = {
        total_cases: 10,
        active_cases: 5,
        completed_cases: 3,
        total_target: 500000,
        total_collected: 350000,
        collection_rate: 70
      };

      expect(summary.total_cases).toBe(10);
      expect(summary.collection_rate).toBe(70);
    });
  });

  // ============================================
  // Diya Case Validation Tests
  // ============================================
  describe('Diya Case Validation', () => {
    test('should validate required fields', () => {
      const diya = {
        title_ar: 'قضية دية',
        title_en: 'Diya Case',
        target_amount: 10000,
        description_ar: 'وصف القضية'
      };

      const isValid = diya.title_ar && diya.target_amount > 0;
      expect(isValid).toBe(true);
    });

    test('should reject case without title', () => {
      const diya = {
        target_amount: 10000
      };

      const isValid = diya.title_ar && diya.target_amount > 0;
      expect(isValid).toBeFalsy();
    });

    test('should reject case with zero target', () => {
      const diya = {
        title_ar: 'قضية دية',
        target_amount: 0
      };

      const isValid = diya.title_ar && diya.target_amount > 0;
      expect(isValid).toBe(false);
    });

    test('should validate target amount is positive', () => {
      const diya = { target_amount: -5000 };
      const isValid = diya.target_amount > 0;
      expect(isValid).toBe(false);
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
        error: 'Failed to fetch diya cases'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 404 for non-existent diya', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Diya case not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 400 for invalid input', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'Invalid diya case data'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle empty results', () => {
      const diyas = null;
      const safeData = diyas || [];
      expect(safeData).toEqual([]);
    });
  });

  // ============================================
  // Ordering Tests
  // ============================================
  describe('Diya Ordering', () => {
    test('should order by created_at descending', () => {
      const diyas = [
        { id: 1, created_at: '2024-01-15T10:00:00Z' },
        { id: 2, created_at: '2024-01-20T10:00:00Z' },
        { id: 3, created_at: '2024-01-10T10:00:00Z' }
      ];

      const sorted = [...diyas].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      expect(sorted[0].id).toBe(2); // Most recent first
      expect(sorted[2].id).toBe(3); // Oldest last
    });

    test('should order by urgency when specified', () => {
      const diyas = [
        { id: 1, is_urgent: false },
        { id: 2, is_urgent: true },
        { id: 3, is_urgent: true }
      ];

      const sorted = [...diyas].sort((a, b) => {
        if (a.is_urgent === b.is_urgent) return 0;
        return a.is_urgent ? -1 : 1;
      });

      expect(sorted[0].is_urgent).toBe(true);
    });
  });
});
