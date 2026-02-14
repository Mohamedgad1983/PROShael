// Audit Logger for tracking admin actions
import { query } from "../services/database.js";
import { log } from './logger.js';


/**
 * Log admin action to audit_logs table
 * Adapted to work with existing schema: user_id, action_type, details
 */
export async function logAdminAction({
  adminId,
  action,
  resourceType,
  resourceId,
  changes = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    // Get user details for the audit log
    const { rows: userRows } = await query(
      'SELECT phone, role FROM users WHERE id = $1',
      [adminId]
    );
    const user = userRows[0];

    // Format details as JSON string combining all metadata
    const details = JSON.stringify({
      action: action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes: changes
    });

    const { rows } = await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [adminId, user?.phone || null, user?.role || null, action, details, ipAddress, userAgent, new Date().toISOString()]
    );
    const data = rows[0];

    return { success: true, data };
  } catch (error) {
    log.error('Audit log exception', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

/**
 * Get audit logs with filters
 * Adapted to work with existing schema: user_id, action_type, details
 */
export async function getAuditLogs({
  adminId = null,
  resourceType = null,
  action = null,
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0
}) {
  try {
    // Build dynamic WHERE clauses
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (adminId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(adminId);
    }
    if (action) {
      conditions.push(`action_type = $${paramIndex++}`);
      params.push(action);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);
    const limitParam = paramIndex++;
    params.push(offset);
    const offsetParam = paramIndex++;

    const { rows: data } = await query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    // Parse details JSON for resource_type filtering if needed
    let filteredData = data;
    if (resourceType && data) {
      filteredData = data.filter(log => {
        try {
          const details = JSON.parse(log.details || '{}');
          return details.resource_type === resourceType;
        } catch {
          return false;
        }
      });
    }

    return {
      success: true,
      data: filteredData,
      count: filteredData.length
    };
  } catch (error) {
    log.error('Get audit logs exception', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

/**
 * Action types constants
 */
export const ACTIONS = {
  MEMBER_CREATED: 'member_created',
  MEMBER_UPDATED: 'member_updated',
  MEMBER_DELETED: 'member_deleted',
  MEMBER_APPROVED: 'member_approved',
  MEMBER_REJECTED: 'member_rejected',
  SUBDIVISION_ASSIGNED: 'subdivision_assigned',
  ROLE_CHANGED: 'role_changed',
  PERMISSIONS_UPDATED: 'permissions_updated',
  USER_CREATED: 'user_created',
  USER_DELETED: 'user_deleted',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout'
};

/**
 * Resource types constants
 */
export const RESOURCE_TYPES = {
  MEMBER: 'member',
  USER: 'user',
  SUBDIVISION: 'subdivision',
  FAMILY_TREE: 'family_tree',
  AUTHENTICATION: 'authentication'
};
