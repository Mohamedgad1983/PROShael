/**
 * Access Control Utilities Unit Tests
 * Tests role-based permissions and financial access functions
 */

import { jest } from '@jest/globals';

// Mock the database before importing
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          limit: jest.fn(() => ({
            data: [],
            error: null
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [], error: null }))
          })),
          gte: jest.fn(() => ({
            order: jest.fn(() => ({ data: [], error: null })),
            data: [],
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({ error: null }))
    }))
  }
}));

// Mock the logger
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Now import the actual module
const {
  hasFinancialAccess,
  shouldLogOperation
} = await import('../../../src/utils/accessControl.js');

describe('Access Control Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasFinancialAccess()', () => {
    describe('with allowed roles', () => {
      test('should return true for financial_manager role', () => {
        expect(hasFinancialAccess('financial_manager')).toBe(true);
      });

      test('should return true for super_admin role', () => {
        expect(hasFinancialAccess('super_admin')).toBe(true);
      });
    });

    describe('with restricted roles', () => {
      test('should return false for member role', () => {
        expect(hasFinancialAccess('member')).toBe(false);
      });

      test('should return false for family_head role', () => {
        expect(hasFinancialAccess('family_head')).toBe(false);
      });

      test('should return false for admin role', () => {
        expect(hasFinancialAccess('admin')).toBe(false);
      });

      test('should return false for viewer role', () => {
        expect(hasFinancialAccess('viewer')).toBe(false);
      });

      test('should return false for editor role', () => {
        expect(hasFinancialAccess('editor')).toBe(false);
      });
    });

    describe('with invalid inputs', () => {
      test('should return false for empty string', () => {
        expect(hasFinancialAccess('')).toBe(false);
      });

      test('should return false for null', () => {
        expect(hasFinancialAccess(null)).toBe(false);
      });

      test('should return false for undefined', () => {
        expect(hasFinancialAccess(undefined)).toBe(false);
      });

      test('should return false for random string', () => {
        expect(hasFinancialAccess('random_role')).toBe(false);
      });

      test('should return false for number', () => {
        expect(hasFinancialAccess(123)).toBe(false);
      });

      test('should return false for object', () => {
        expect(hasFinancialAccess({})).toBe(false);
      });
    });

    describe('case sensitivity', () => {
      test('should return false for uppercase FINANCIAL_MANAGER', () => {
        expect(hasFinancialAccess('FINANCIAL_MANAGER')).toBe(false);
      });

      test('should return false for mixed case Financial_Manager', () => {
        expect(hasFinancialAccess('Financial_Manager')).toBe(false);
      });

      test('should return false for uppercase SUPER_ADMIN', () => {
        expect(hasFinancialAccess('SUPER_ADMIN')).toBe(false);
      });
    });
  });

  describe('shouldLogOperation()', () => {
    describe('operations that should be logged', () => {
      test('should return true for expense_approval', () => {
        expect(shouldLogOperation('expense_approval')).toBe(true);
      });

      test('should return true for expense_rejection', () => {
        expect(shouldLogOperation('expense_rejection')).toBe(true);
      });

      test('should return true for expense_creation', () => {
        expect(shouldLogOperation('expense_creation')).toBe(true);
      });

      test('should return true for expense_deletion', () => {
        expect(shouldLogOperation('expense_deletion')).toBe(true);
      });

      test('should return true for report_generation', () => {
        expect(shouldLogOperation('report_generation')).toBe(true);
      });

      test('should return true for forensic_report', () => {
        expect(shouldLogOperation('forensic_report')).toBe(true);
      });

      test('should return true for bulk_update', () => {
        expect(shouldLogOperation('bulk_update')).toBe(true);
      });

      test('should return true for financial_export', () => {
        expect(shouldLogOperation('financial_export')).toBe(true);
      });

      test('should return true for budget_modification', () => {
        expect(shouldLogOperation('budget_modification')).toBe(true);
      });
    });

    describe('operations that should not be logged', () => {
      test('should return false for view_dashboard', () => {
        expect(shouldLogOperation('view_dashboard')).toBe(false);
      });

      test('should return false for view_members', () => {
        expect(shouldLogOperation('view_members')).toBe(false);
      });

      test('should return false for login', () => {
        expect(shouldLogOperation('login')).toBe(false);
      });

      test('should return false for logout', () => {
        expect(shouldLogOperation('logout')).toBe(false);
      });

      test('should return false for profile_update', () => {
        expect(shouldLogOperation('profile_update')).toBe(false);
      });

      test('should return false for random operation', () => {
        expect(shouldLogOperation('random_operation')).toBe(false);
      });
    });

    describe('edge cases', () => {
      test('should return false for empty string', () => {
        expect(shouldLogOperation('')).toBe(false);
      });

      test('should return false for null', () => {
        expect(shouldLogOperation(null)).toBe(false);
      });

      test('should return false for undefined', () => {
        expect(shouldLogOperation(undefined)).toBe(false);
      });

      test('should be case sensitive', () => {
        expect(shouldLogOperation('EXPENSE_APPROVAL')).toBe(false);
        expect(shouldLogOperation('Expense_Approval')).toBe(false);
      });

      test('should not match partial strings', () => {
        expect(shouldLogOperation('expense')).toBe(false);
        expect(shouldLogOperation('approval')).toBe(false);
      });
    });
  });

  describe('Role Access Matrix', () => {
    const roles = [
      'super_admin',
      'financial_manager',
      'admin',
      'family_head',
      'member',
      'viewer',
      'editor'
    ];

    test('should have exactly 2 roles with financial access', () => {
      const accessibleRoles = roles.filter(role => hasFinancialAccess(role));
      expect(accessibleRoles).toHaveLength(2);
      expect(accessibleRoles).toContain('financial_manager');
      expect(accessibleRoles).toContain('super_admin');
    });

    test('should deny access to 5 roles', () => {
      const deniedRoles = roles.filter(role => !hasFinancialAccess(role));
      expect(deniedRoles).toHaveLength(5);
    });
  });

  describe('Operations Logging Matrix', () => {
    const sensitiveOperations = [
      'expense_approval',
      'expense_rejection',
      'expense_creation',
      'expense_deletion',
      'report_generation',
      'forensic_report',
      'bulk_update',
      'financial_export',
      'budget_modification'
    ];

    test('should have 9 operations that require logging', () => {
      const loggedOperations = sensitiveOperations.filter(op => shouldLogOperation(op));
      expect(loggedOperations).toHaveLength(9);
    });

    test('all sensitive operations should be logged', () => {
      sensitiveOperations.forEach(operation => {
        expect(shouldLogOperation(operation)).toBe(true);
      });
    });
  });
});
