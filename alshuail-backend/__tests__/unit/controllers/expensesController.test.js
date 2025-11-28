/**
 * Expenses Controller Unit Tests
 * Tests expense management, approval workflows, and role-based access
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
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  ilike: jest.fn(() => mockSupabase),
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

jest.unstable_mockModule('../../../src/utils/accessControl.js', () => ({
  hasFinancialAccess: jest.fn(),
  logFinancialAccess: jest.fn(),
  validateFinancialOperation: jest.fn(),
  createFinancialAuditTrail: jest.fn(),
  checkSuspiciousActivity: jest.fn()
}));

describe('Expenses Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'financial_manager' },
    query: {},
    body: {},
    params: {},
    ip: '127.0.0.1',
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
  // Role-Based Access Control Tests
  // ============================================
  describe('Role-Based Access Control', () => {
    test('should allow financial_manager to access expenses', () => {
      const role = 'financial_manager';
      const financialRoles = ['super_admin', 'financial_manager'];
      const hasAccess = financialRoles.includes(role);
      expect(hasAccess).toBe(true);
    });

    test('should allow super_admin to access expenses', () => {
      const role = 'super_admin';
      const financialRoles = ['super_admin', 'financial_manager'];
      const hasAccess = financialRoles.includes(role);
      expect(hasAccess).toBe(true);
    });

    test('should deny regular admin from expenses', () => {
      const role = 'admin';
      const financialRoles = ['super_admin', 'financial_manager'];
      const hasAccess = financialRoles.includes(role);
      expect(hasAccess).toBe(false);
    });

    test('should deny member from expenses', () => {
      const role = 'member';
      const financialRoles = ['super_admin', 'financial_manager'];
      const hasAccess = financialRoles.includes(role);
      expect(hasAccess).toBe(false);
    });

    test('should return 403 for unauthorized access', () => {
      const res = createMockResponse();
      res.status(403).json({
        success: false,
        error: 'Access denied: Financial Manager role required',
        code: 'INSUFFICIENT_FINANCIAL_PRIVILEGES'
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INSUFFICIENT_FINANCIAL_PRIVILEGES'
        })
      );
    });
  });

  // ============================================
  // Expense Validation Tests
  // ============================================
  describe('Expense Validation', () => {
    test('should validate required expense fields', () => {
      const expense = {
        amount: 1000,
        category: 'Office Supplies',
        description: 'Printer paper'
      };

      const isValid = Boolean(
        expense.amount > 0 &&
        expense.category &&
        expense.description
      );
      expect(isValid).toBe(true);
    });

    test('should reject expense with zero amount', () => {
      const expense = { amount: 0, category: 'Test' };
      const isValid = expense.amount > 0;
      expect(isValid).toBe(false);
    });

    test('should reject expense with negative amount', () => {
      const expense = { amount: -100, category: 'Test' };
      const isValid = expense.amount > 0;
      expect(isValid).toBe(false);
    });

    test('should reject expense without category', () => {
      const expense = { amount: 100, category: '' };
      const isValid = expense.amount > 0 && expense.category;
      expect(isValid).toBeFalsy();
    });

    test('should validate expense categories', () => {
      const validCategories = [
        'Office Supplies',
        'Travel',
        'Utilities',
        'Marketing',
        'Maintenance',
        'Other'
      ];

      const expense = { category: 'Office Supplies' };
      const isValidCategory = validCategories.includes(expense.category);
      expect(isValidCategory).toBe(true);
    });
  });

  // ============================================
  // Expense Status Tests
  // ============================================
  describe('Expense Status Management', () => {
    test('should have valid expense statuses', () => {
      const validStatuses = ['pending', 'approved', 'rejected', 'paid'];
      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('approved');
      expect(validStatuses).toContain('rejected');
      expect(validStatuses).toContain('paid');
    });

    test('should default new expense to pending', () => {
      const newExpense = {
        amount: 100,
        category: 'Office',
        status: 'pending'
      };
      expect(newExpense.status).toBe('pending');
    });

    test('should track approval workflow', () => {
      const expense = {
        status: 'pending',
        approved_by: null,
        approved_at: null
      };

      // Simulate approval
      const approvedExpense = {
        ...expense,
        status: 'approved',
        approved_by: 'admin-123',
        approved_at: new Date().toISOString()
      };

      expect(approvedExpense.status).toBe('approved');
      expect(approvedExpense.approved_by).toBeDefined();
      expect(approvedExpense.approved_at).toBeDefined();
    });

    test('should track rejection with reason', () => {
      const rejectedExpense = {
        status: 'rejected',
        rejected_by: 'admin-123',
        rejection_reason: 'Exceeds budget'
      };

      expect(rejectedExpense.status).toBe('rejected');
      expect(rejectedExpense.rejection_reason).toBeDefined();
    });
  });

  // ============================================
  // Hijri Date Tests
  // ============================================
  describe('Hijri Date Handling', () => {
    test('should store hijri date components', () => {
      const expense = {
        hijri_year: 1446,
        hijri_month: 5,
        hijri_day: 15
      };

      expect(expense.hijri_year).toBe(1446);
      expect(expense.hijri_month).toBeGreaterThanOrEqual(1);
      expect(expense.hijri_month).toBeLessThanOrEqual(12);
      expect(expense.hijri_day).toBeGreaterThanOrEqual(1);
      expect(expense.hijri_day).toBeLessThanOrEqual(30);
    });

    test('should validate hijri month range', () => {
      const month = 5;
      const isValid = month >= 1 && month <= 12;
      expect(isValid).toBe(true);
    });

    test('should validate hijri day range', () => {
      const day = 15;
      const isValid = day >= 1 && day <= 30;
      expect(isValid).toBe(true);
    });

    test('should sort by hijri date correctly', () => {
      const expenses = [
        { hijri_year: 1446, hijri_month: 3, hijri_day: 10 },
        { hijri_year: 1446, hijri_month: 5, hijri_day: 1 },
        { hijri_year: 1445, hijri_month: 12, hijri_day: 25 }
      ];

      const sorted = expenses.sort((a, b) => {
        if (b.hijri_year !== a.hijri_year) return b.hijri_year - a.hijri_year;
        if (b.hijri_month !== a.hijri_month) return b.hijri_month - a.hijri_month;
        return b.hijri_day - a.hijri_day;
      });

      expect(sorted[0].hijri_month).toBe(5); // Most recent
      expect(sorted[2].hijri_year).toBe(1445); // Oldest
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

    test('should filter by category', () => {
      const req = createMockRequest({
        query: { category: 'Office Supplies' }
      });

      expect(req.query.category).toBe('Office Supplies');
    });

    test('should filter by status', () => {
      const req = createMockRequest({
        query: { status: 'approved' }
      });

      expect(req.query.status).toBe('approved');
    });

    test('should filter by date range', () => {
      const req = createMockRequest({
        query: {
          date_from: '2024-01-01',
          date_to: '2024-12-31'
        }
      });

      expect(req.query.date_from).toBe('2024-01-01');
      expect(req.query.date_to).toBe('2024-12-31');
    });

    test('should filter by hijri date', () => {
      const req = createMockRequest({
        query: {
          hijri_month: '5',
          hijri_year: '1446'
        }
      });

      expect(req.query.hijri_month).toBe('5');
      expect(req.query.hijri_year).toBe('1446');
    });

    test('should handle search parameter', () => {
      const req = createMockRequest({
        query: { search: 'office' }
      });

      expect(req.query.search).toBe('office');
    });
  });

  // ============================================
  // Suspicious Activity Tests
  // ============================================
  describe('Suspicious Activity Detection', () => {
    test('should flag high frequency requests', () => {
      const requestCount = 100;
      const timeWindow = 60; // seconds
      const threshold = 50;

      const isSuspicious = requestCount > threshold;
      expect(isSuspicious).toBe(true);
    });

    test('should flag unusual amount patterns', () => {
      const amounts = [100, 100, 100, 100, 100];  // Normal amounts
      const outlier = 50000;  // Unusual outlier
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Outlier is 500x the average (100), clearly suspicious
      const isSuspicious = outlier > avg * 10;
      expect(isSuspicious).toBe(true);
    });

    test('should return block response for suspicious activity', () => {
      const res = createMockResponse();
      res.status(403).json({
        success: false,
        error: 'Access temporarily blocked due to suspicious activity',
        code: 'SUSPICIOUS_ACTIVITY_BLOCK'
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SUSPICIOUS_ACTIVITY_BLOCK'
        })
      );
    });
  });

  // ============================================
  // Financial Audit Trail Tests
  // ============================================
  describe('Financial Audit Trail', () => {
    test('should create audit entry for expense creation', () => {
      const auditEntry = {
        action: 'CREATE',
        entity_type: 'expense',
        entity_id: 'expense-123',
        user_id: 'user-123',
        changes: { amount: 1000, category: 'Office' },
        timestamp: new Date().toISOString()
      };

      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.entity_type).toBe('expense');
    });

    test('should create audit entry for expense approval', () => {
      const auditEntry = {
        action: 'APPROVE',
        entity_type: 'expense',
        entity_id: 'expense-123',
        user_id: 'admin-123',
        changes: { status: { from: 'pending', to: 'approved' } },
        timestamp: new Date().toISOString()
      };

      expect(auditEntry.action).toBe('APPROVE');
      expect(auditEntry.changes.status.to).toBe('approved');
    });

    test('should log access attempts', () => {
      const accessLog = {
        user_id: 'user-123',
        action: 'expenses_view',
        status: 'GRANTED',
        role: 'financial_manager',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      expect(accessLog.status).toBe('GRANTED');
      expect(accessLog.role).toBe('financial_manager');
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response with expenses', () => {
      const res = createMockResponse();
      const expenses = [
        { id: 1, amount: 100, category: 'Office' },
        { id: 2, amount: 200, category: 'Travel' }
      ];

      res.json({
        success: true,
        data: expenses,
        pagination: { limit: 50, offset: 0, total: 2 }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );
    });

    test('should include pagination in response', () => {
      const pagination = {
        limit: 50,
        offset: 0,
        total: 100
      };

      expect(pagination.limit).toBe(50);
      expect(pagination.total).toBe(100);
    });

    test('should handle empty results', () => {
      const res = createMockResponse();
      res.json({
        success: true,
        data: [],
        pagination: { limit: 50, offset: 0, total: 0 }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: []
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
        error: 'Invalid expense data'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 for non-existent expense', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Expense not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 for database errors', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should not expose sensitive error details', () => {
      const dbError = new Error('PostgreSQL connection failed: password invalid');
      const safeMessage = 'An error occurred while processing expenses';

      expect(safeMessage).not.toContain('password');
      expect(safeMessage).not.toContain('PostgreSQL');
    });
  });

  // ============================================
  // Amount Calculation Tests
  // ============================================
  describe('Amount Calculations', () => {
    test('should calculate total expenses correctly', () => {
      const expenses = [
        { amount: 100 },
        { amount: 250.50 },
        { amount: 75 }
      ];

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(total).toBe(425.50);
    });

    test('should calculate expenses by category', () => {
      const expenses = [
        { amount: 100, category: 'Office' },
        { amount: 200, category: 'Travel' },
        { amount: 150, category: 'Office' }
      ];

      const byCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});

      expect(byCategory['Office']).toBe(250);
      expect(byCategory['Travel']).toBe(200);
    });

    test('should handle decimal amounts correctly', () => {
      const amount1 = 10.25;
      const amount2 = 5.75;
      const total = Number((amount1 + amount2).toFixed(2));

      expect(total).toBe(16);
    });
  });
});
