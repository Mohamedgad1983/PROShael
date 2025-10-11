/**
 * Mock implementations for accessControl utility functions
 * Used in controller integration tests to avoid database calls
 */

// Mock hasFinancialAccess - returns true for financial_manager role
export const hasFinancialAccess = (role) => {
  return role === 'financial_manager';
};

// Mock logFinancialAccess - returns Promise resolving to true
export const logFinancialAccess = async () => {
  return Promise.resolve(true);
};

// Mock validateFinancialOperation - returns valid for financial_manager
export const validateFinancialOperation = async (userId, operation, resourceId) => {
  return Promise.resolve({ valid: true });
};

// Mock createFinancialAuditTrail - returns Promise resolving to object
export const createFinancialAuditTrail = async (data) => {
  return Promise.resolve({ id: 'mock-audit-id', ...data });
};

// Mock checkSuspiciousActivity - returns no suspicious activity
export const checkSuspiciousActivity = async () => {
  return Promise.resolve({ should_block: false });
};

export default {
  hasFinancialAccess,
  logFinancialAccess,
  validateFinancialOperation,
  createFinancialAuditTrail,
  checkSuspiciousActivity
};
