// Audit Logger for tracking admin actions
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    const { data: user } = await supabase
      .from('users')
      .select('phone, role')
      .eq('id', adminId)
      .single();

    // Format details as JSON string combining all metadata
    const details = JSON.stringify({
      action: action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes: changes
    });

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: adminId,
        user_email: user?.phone || null,
        user_role: user?.role || null,
        action_type: action,
        details: details,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Audit log error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Audit log exception:', error);
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
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (adminId) {
      query = query.eq('user_id', adminId);
    }
    if (action) {
      query = query.eq('action_type', action);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Get audit logs error:', error);
      return { success: false, error };
    }

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
    console.error('Get audit logs exception:', error);
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
