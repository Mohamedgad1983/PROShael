/**
 * Access Control Utilities for Financial Management
 * Handles role-based permissions and financial access logging
 */

import { log } from './logger.js';
import { query } from '../services/database.js';

/**
 * Check if user has financial access privileges
 * @param {string} userRole - User's current role
 * @returns {boolean} Whether user has financial access
 */
export const hasFinancialAccess = (userRole) => {
  const allowedRoles = ['financial_manager', 'super_admin', 'admin', 'operational_manager'];
  return allowedRoles.includes(userRole);
};

/**
 * Log financial access attempts for audit trail
 * @param {string} userId - User ID attempting access
 * @param {string} accessResult - Result of access attempt (GRANTED, DENIED, SUCCESS, FAILED)
 * @param {string} operation - Type of operation attempted
 * @param {string} userRole - User's role
 * @param {Object} metadata - Additional metadata to log
 * @param {string} ipAddress - IP address of request
 */
export const logFinancialAccess = async (userId, accessResult, operation, userRole, metadata = {}, ipAddress = 'unknown') => {
  try {
    await query(
      `INSERT INTO financial_access_logs (user_id, access_result, operation, user_role, metadata, timestamp, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, accessResult, operation, userRole, JSON.stringify(metadata), new Date().toISOString(), ipAddress]
    );
  } catch (error) {
    log.error('Failed to log financial access:', error);
    // Don't throw error to avoid disrupting main flow
  }
};

/**
 * Validate financial operation permissions
 * @param {string} userId - User ID attempting operation
 * @param {string} operation - Operation to validate
 * @param {string} resourceId - Optional resource ID
 * @returns {Object} Validation result
 */
export const validateFinancialOperation = async (userId, operation, resourceId = null) => {
  try {
    // Get user details
    const { rows } = await query(
      'SELECT id, role, status, permissions, full_name FROM users WHERE id = $1',
      [userId]
    );
    const user = rows[0];

    if (!user) {
      return {
        valid: false,
        reason: 'User not found',
        code: 'USER_NOT_FOUND'
      };
    }

    if (user.status !== 'active') {
      return {
        valid: false,
        reason: 'User account not active',
        code: 'USER_INACTIVE'
      };
    }

    // Check general financial access
    if (!hasFinancialAccess(user.role)) {
      return {
        valid: false,
        reason: 'Insufficient role privileges',
        code: 'INSUFFICIENT_PRIVILEGES'
      };
    }

    // Additional validation for specific operations
    if (operation === 'expense_approval' && user.role !== 'financial_manager') {
      return {
        valid: false,
        reason: 'Approval requires Financial Manager role',
        code: 'APPROVAL_UNAUTHORIZED'
      };
    }

    if (operation === 'forensic_report' && user.role !== 'financial_manager') {
      return {
        valid: false,
        reason: 'Forensic reports require Financial Manager role',
        code: 'FORENSIC_UNAUTHORIZED'
      };
    }

    if (operation === 'bulk_expense_update' && user.role !== 'financial_manager') {
      return {
        valid: false,
        reason: 'Bulk operations require Financial Manager role',
        code: 'BULK_OPERATION_UNAUTHORIZED'
      };
    }

    // Check resource-specific permissions if resourceId provided
    if (resourceId) {
      const resourceAccess = await checkResourceAccess(userId, resourceId, operation);
      if (!resourceAccess.valid) {
        return resourceAccess;
      }
    }

    return {
      valid: true,
      user: user,
      message: 'Operation authorized'
    };
  } catch (error) {
    return {
      valid: false,
      reason: 'Validation error',
      error: error.message,
      code: 'VALIDATION_ERROR'
    };
  }
};

/**
 * Check access to specific resource
 * @param {string} userId - User ID
 * @param {string} resourceId - Resource ID
 * @param {string} operation - Operation type
 * @returns {Object} Access result
 */
const checkResourceAccess = async (userId, resourceId, operation) => {
  try {
    // For expense-related resources
    if (operation.startsWith('expense_')) {
      const { rows: expenseRows } = await query(
        'SELECT id, created_by, approved_by, status FROM expenses WHERE id = $1',
        [resourceId]
      );
      const expense = expenseRows[0];

      if (!expense) {
        return {
          valid: false,
          reason: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        };
      }

      // Check if user has permission to access this expense
      // Financial managers can access all expenses
      // Other users can only access expenses they created
      const { rows: userRows } = await query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      const user = userRows[0];

      if (user.role !== 'financial_manager' && expense.created_by !== userId) {
        return {
          valid: false,
          reason: 'Access denied to this resource',
          code: 'RESOURCE_ACCESS_DENIED'
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: 'Resource access check failed',
      error: error.message,
      code: 'RESOURCE_CHECK_ERROR'
    };
  }
};

/**
 * Get user's financial permissions
 * @param {string} userId - User ID
 * @returns {Object} User permissions
 */
export const getUserFinancialPermissions = async (userId) => {
  try {
    const { rows } = await query(
      'SELECT role, permissions FROM users WHERE id = $1',
      [userId]
    );
    const user = rows[0];

    if (!user) {
      return {
        canViewExpenses: false,
        canCreateExpenses: false,
        canApproveExpenses: false,
        canViewReports: false,
        canGenerateReports: false,
        canExportReports: false,
        canViewForensicReports: false,
        canManageBudgets: false
      };
    }

    const isFinancialManager = user.role === 'financial_manager';
    const isSuperAdmin = user.role === 'super_admin';

    return {
      canViewExpenses: isFinancialManager || isSuperAdmin,
      canCreateExpenses: isFinancialManager || isSuperAdmin,
      canApproveExpenses: isFinancialManager,
      canViewReports: isFinancialManager || isSuperAdmin,
      canGenerateReports: isFinancialManager,
      canExportReports: isFinancialManager,
      canViewForensicReports: isFinancialManager,
      canManageBudgets: isFinancialManager
    };
  } catch (error) {
    log.error('Failed to get user permissions:', error);
    return {
      canViewExpenses: false,
      canCreateExpenses: false,
      canApproveExpenses: false,
      canViewReports: false,
      canGenerateReports: false,
      canExportReports: false,
      canViewForensicReports: false,
      canManageBudgets: false
    };
  }
};

/**
 * Create audit trail entry for financial operations
 * @param {Object} auditData - Audit data to log
 */
export const createFinancialAuditTrail = async (auditData) => {
  try {
    const {
      userId,
      operation,
      resourceType,
      resourceId,
      previousValue,
      newValue,
      metadata,
      ipAddress
    } = auditData;

    await query(
      `INSERT INTO financial_audit_trail (user_id, operation, resource_type, resource_id, previous_value, new_value, metadata, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, operation, resourceType, resourceId, JSON.stringify(previousValue), JSON.stringify(newValue), JSON.stringify(metadata), ipAddress, new Date().toISOString()]
    );
  } catch (error) {
    log.error('Failed to create audit trail:', error);
  }
};

/**
 * Check if operation should be logged for compliance
 * @param {string} operation - Operation type
 * @returns {boolean} Whether to log
 */
export const shouldLogOperation = (operation) => {
  const alwaysLogOperations = [
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

  return alwaysLogOperations.includes(operation);
};

/**
 * Get recent financial access logs for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of logs to retrieve
 * @returns {Array} Recent access logs
 */
export const getRecentFinancialLogs = async (userId, limit = 10) => {
  try {
    const { rows } = await query(
      'SELECT * FROM financial_access_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [userId, limit]
    );

    return rows || [];
  } catch (error) {
    log.error('Failed to get financial logs:', error);
    return [];
  }
};

/**
 * Check for suspicious financial activity
 * @param {string} userId - User ID
 * @returns {Object} Suspicious activity result
 */
export const checkSuspiciousActivity = async (userId) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Check for excessive failed attempts
    const { rows: failedAttempts } = await query(
      'SELECT * FROM financial_access_logs WHERE user_id = $1 AND access_result = $2 AND timestamp >= $3',
      [userId, 'DENIED', oneHourAgo]
    );

    // Check for unusual patterns
    const { rows: recentActivity } = await query(
      'SELECT * FROM financial_access_logs WHERE user_id = $1 AND timestamp >= $2 ORDER BY timestamp DESC',
      [userId, oneHourAgo]
    );

    const isSuspicious = (failedAttempts?.length || 0) > 5 ||
                        (recentActivity?.length || 0) > 50;

    if (isSuspicious) {
      // Log suspicious activity
      await logFinancialAccess(
        userId,
        'SUSPICIOUS',
        'suspicious_activity_detected',
        'system',
        {
          failed_attempts: failedAttempts?.length || 0,
          total_attempts: recentActivity?.length || 0,
          time_window: '1 hour'
        }
      );
    }

    return {
      is_suspicious: isSuspicious,
      failed_attempts: failedAttempts?.length || 0,
      recent_activity_count: recentActivity?.length || 0,
      should_block: (failedAttempts?.length || 0) > 10
    };
  } catch (error) {
    log.error('Failed to check suspicious activity:', error);
    return {
      is_suspicious: false,
      failed_attempts: 0,
      recent_activity_count: 0,
      should_block: false
    };
  }
};

export default {
  hasFinancialAccess,
  logFinancialAccess,
  validateFinancialOperation,
  getUserFinancialPermissions,
  createFinancialAuditTrail,
  shouldLogOperation,
  getRecentFinancialLogs,
  checkSuspiciousActivity
};