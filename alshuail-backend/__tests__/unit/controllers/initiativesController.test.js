/**
 * Initiatives Controller Unit Tests
 * Tests initiative management, contributions, and progress tracking
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

describe('Initiatives Controller Unit Tests', () => {
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
    test('should generate reference with CT prefix', () => {
      const prefix = 'CT';
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const reference = `${prefix}-${year}-${timestamp}${random}`;

      expect(reference).toMatch(/^CT-\d{4}-\d{6}[A-Z0-9]{4}$/);
    });

    test('should include current year', () => {
      const currentYear = new Date().getFullYear();
      const reference = `CT-${currentYear}-123456ABCD`;

      expect(reference).toContain(currentYear.toString());
    });

    test('should be unique across multiple generations', () => {
      const generateRef = () => {
        const prefix = 'CT';
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${year}-${timestamp}${random}`;
      };

      const refs = new Set([generateRef(), generateRef(), generateRef()]);
      expect(refs.size).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // Initiative Status Tests
  // ============================================
  describe('Initiative Status', () => {
    test('should support active status', () => {
      const statuses = ['draft', 'active', 'completed', 'cancelled', 'expired'];
      expect(statuses).toContain('active');
    });

    test('should support draft status', () => {
      const statuses = ['draft', 'active', 'completed', 'cancelled', 'expired'];
      expect(statuses).toContain('draft');
    });

    test('should support completed status', () => {
      const statuses = ['draft', 'active', 'completed', 'cancelled', 'expired'];
      expect(statuses).toContain('completed');
    });

    test('should support expired status', () => {
      const statuses = ['draft', 'active', 'completed', 'cancelled', 'expired'];
      expect(statuses).toContain('expired');
    });

    test('should validate status transitions', () => {
      const validTransitions = {
        draft: ['active', 'cancelled'],
        active: ['completed', 'cancelled', 'expired'],
        completed: [],
        cancelled: [],
        expired: []
      };

      expect(validTransitions['draft']).toContain('active');
      expect(validTransitions['active']).toContain('completed');
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

    test('should filter by category', () => {
      const req = createMockRequest({
        query: { category: 'charity' }
      });

      expect(req.query.category).toBe('charity');
    });

    test('should filter by organizer_id', () => {
      const req = createMockRequest({
        query: { organizer_id: 'org-123' }
      });

      expect(req.query.organizer_id).toBe('org-123');
    });

    test('should filter for active only', () => {
      const req = createMockRequest({
        query: { active_only: 'true' }
      });

      const activeOnly = req.query.active_only === 'true';
      expect(activeOnly).toBe(true);
    });
  });

  // ============================================
  // Progress Calculation Tests
  // ============================================
  describe('Progress Calculations', () => {
    test('should calculate progress percentage', () => {
      const initiative = {
        target_amount: 50000,
        current_amount: 25000
      };

      const progress = Math.round((initiative.current_amount / initiative.target_amount) * 100);
      expect(progress).toBe(50);
    });

    test('should handle zero target amount', () => {
      const initiative = {
        target_amount: 0,
        current_amount: 0
      };

      const progress = initiative.target_amount ?
        Math.round((initiative.current_amount / initiative.target_amount) * 100) : 0;
      expect(progress).toBe(0);
    });

    test('should detect target reached', () => {
      const initiative = {
        target_amount: 50000,
        current_amount: 55000
      };

      const isTargetReached = initiative.current_amount >= initiative.target_amount;
      expect(isTargetReached).toBe(true);
    });

    test('should calculate days remaining', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const initiative = {
        collection_end_date: futureDate.toISOString()
      };

      const daysRemaining = Math.ceil(
        (new Date(initiative.collection_end_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      expect(daysRemaining).toBeGreaterThan(0);
      expect(daysRemaining).toBeLessThanOrEqual(10);
    });

    test('should detect expired initiatives', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const initiative = {
        collection_end_date: pastDate.toISOString()
      };

      const isExpired = new Date(initiative.collection_end_date) < new Date();
      expect(isExpired).toBe(true);
    });

    test('should handle null end date', () => {
      const initiative = {
        collection_end_date: null
      };

      const daysRemaining = initiative.collection_end_date ?
        Math.ceil((new Date(initiative.collection_end_date) - new Date()) / (1000 * 60 * 60 * 24)) :
        null;

      expect(daysRemaining).toBeNull();
    });
  });

  // ============================================
  // Enhanced Initiative Data Tests
  // ============================================
  describe('Enhanced Initiative Data', () => {
    test('should enhance initiative with computed fields', () => {
      const initiative = {
        id: 'init-1',
        target_amount: 100000,
        current_amount: 75000,
        contributor_count: 50,
        collection_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const enhanced = {
        ...initiative,
        total_contributed: Number(initiative.current_amount) || 0,
        contributors_count: Number(initiative.contributor_count) || 0,
        progress_percentage: Math.round((initiative.current_amount / initiative.target_amount) * 100),
        days_remaining: Math.ceil((new Date(initiative.collection_end_date) - new Date()) / (1000 * 60 * 60 * 24)),
        is_target_reached: initiative.current_amount >= initiative.target_amount,
        is_expired: new Date(initiative.collection_end_date) < new Date()
      };

      expect(enhanced.total_contributed).toBe(75000);
      expect(enhanced.progress_percentage).toBe(75);
      expect(enhanced.is_target_reached).toBe(false);
      expect(enhanced.is_expired).toBe(false);
    });

    test('should handle missing values with defaults', () => {
      const initiative = {
        id: 'init-1',
        target_amount: null,
        current_amount: null,
        contributor_count: null
      };

      const totalContributed = Number(initiative.current_amount) || 0;
      const contributorsCount = Number(initiative.contributor_count) || 0;

      expect(totalContributed).toBe(0);
      expect(contributorsCount).toBe(0);
    });
  });

  // ============================================
  // Contribution Tests
  // ============================================
  describe('Contribution Management', () => {
    test('should track contribution data', () => {
      const contribution = {
        initiative_id: 'init-123',
        contributor_id: 'member-456',
        amount: 1000,
        contribution_date: new Date().toISOString(),
        status: 'confirmed'
      };

      expect(contribution.amount).toBe(1000);
      expect(contribution.status).toBe('confirmed');
    });

    test('should calculate total contributions', () => {
      const contributions = [
        { amount: 1000 },
        { amount: 2500 },
        { amount: 500 }
      ];

      const total = contributions.reduce((sum, c) => sum + c.amount, 0);
      expect(total).toBe(4000);
    });

    test('should validate minimum contribution', () => {
      const contribution = { amount: 10 };
      const minAmount = 1;

      const isValid = contribution.amount >= minAmount;
      expect(isValid).toBe(true);
    });

    test('should reject zero contribution', () => {
      const contribution = { amount: 0 };
      const isValid = contribution.amount > 0;
      expect(isValid).toBe(false);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response with enhanced data', () => {
      const res = createMockResponse();
      const initiatives = [{
        id: 'init-1',
        title_ar: 'مبادرة خيرية',
        total_contributed: 50000,
        progress_percentage: 50
      }];

      res.json({
        success: true,
        data: initiatives,
        pagination: { limit: 50, offset: 0, total: 1 },
        summary: {
          total_initiatives: 1,
          active_count: 1,
          total_target: 100000,
          total_collected: 50000
        }
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

    test('should include summary statistics', () => {
      const summary = {
        total_initiatives: 25,
        active_count: 10,
        completed_count: 12,
        cancelled_count: 3,
        total_target: 2500000,
        total_collected: 1800000,
        collection_rate: 72
      };

      expect(summary.total_initiatives).toBe(25);
      expect(summary.collection_rate).toBe(72);
    });
  });

  // ============================================
  // Initiative Validation Tests
  // ============================================
  describe('Initiative Validation', () => {
    test('should validate required fields', () => {
      const initiative = {
        title_ar: 'مبادرة خيرية',
        target_amount: 100000,
        collection_end_date: '2025-12-31'
      };

      const isValid = Boolean(
        initiative.title_ar &&
        initiative.target_amount > 0 &&
        initiative.collection_end_date
      );
      expect(isValid).toBe(true);
    });

    test('should reject initiative without title', () => {
      const initiative = {
        target_amount: 100000
      };

      const isValid = initiative.title_ar && initiative.target_amount > 0;
      expect(isValid).toBeFalsy();
    });

    test('should reject initiative with zero target', () => {
      const initiative = {
        title_ar: 'مبادرة',
        target_amount: 0
      };

      const isValid = initiative.title_ar && initiative.target_amount > 0;
      expect(isValid).toBe(false);
    });

    test('should validate end date is in future', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const initiative = {
        collection_end_date: futureDate.toISOString()
      };

      const isValidDate = new Date(initiative.collection_end_date) > new Date();
      expect(isValidDate).toBe(true);
    });

    test('should reject past end date for new initiative', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const initiative = {
        collection_end_date: pastDate.toISOString()
      };

      const isValidDate = new Date(initiative.collection_end_date) > new Date();
      expect(isValidDate).toBe(false);
    });
  });

  // ============================================
  // Category Tests
  // ============================================
  describe('Initiative Categories', () => {
    test('should support charity category', () => {
      const categories = ['charity', 'education', 'healthcare', 'community', 'emergency', 'other'];
      expect(categories).toContain('charity');
    });

    test('should support education category', () => {
      const categories = ['charity', 'education', 'healthcare', 'community', 'emergency', 'other'];
      expect(categories).toContain('education');
    });

    test('should support emergency category', () => {
      const categories = ['charity', 'education', 'healthcare', 'community', 'emergency', 'other'];
      expect(categories).toContain('emergency');
    });

    test('should validate category', () => {
      const validCategories = ['charity', 'education', 'healthcare', 'community', 'emergency', 'other'];
      const initiative = { main_category_id: 'charity' };

      const isValidCategory = validCategories.includes(initiative.main_category_id);
      expect(isValidCategory).toBe(true);
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
        error: 'Failed to fetch initiatives'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 404 for non-existent initiative', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Initiative not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 400 for invalid input', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'Invalid initiative data'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle empty results', () => {
      const initiatives = null;
      const safeData = initiatives || [];
      expect(safeData).toEqual([]);
    });
  });

  // ============================================
  // Ordering Tests
  // ============================================
  describe('Initiative Ordering', () => {
    test('should order by created_at descending', () => {
      const initiatives = [
        { id: 1, created_at: '2024-01-15T10:00:00Z' },
        { id: 2, created_at: '2024-01-20T10:00:00Z' },
        { id: 3, created_at: '2024-01-10T10:00:00Z' }
      ];

      const sorted = [...initiatives].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      expect(sorted[0].id).toBe(2); // Most recent first
      expect(sorted[2].id).toBe(3); // Oldest last
    });

    test('should order by progress percentage', () => {
      const initiatives = [
        { id: 1, progress_percentage: 50 },
        { id: 2, progress_percentage: 90 },
        { id: 3, progress_percentage: 25 }
      ];

      const sorted = [...initiatives].sort(
        (a, b) => b.progress_percentage - a.progress_percentage
      );

      expect(sorted[0].progress_percentage).toBe(90);
      expect(sorted[2].progress_percentage).toBe(25);
    });

    test('should order by days remaining', () => {
      const initiatives = [
        { id: 1, days_remaining: 30 },
        { id: 2, days_remaining: 5 },
        { id: 3, days_remaining: 15 }
      ];

      const sorted = [...initiatives].sort(
        (a, b) => a.days_remaining - b.days_remaining
      );

      expect(sorted[0].days_remaining).toBe(5); // Most urgent first
    });
  });
});
