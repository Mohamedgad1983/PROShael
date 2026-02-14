/**
 * Audit Log Controller
 * Handles audit trail logging and retrieval
 *
 * @module audit.controller
 */

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

/**
 * Log an audit action
 * @param {object} params - Audit parameters
 */
export const logAuditAction = async ({
  adminId,
  action,
  resourceType,
  resourceId = null,
  changes = {},
  ipAddress = null,
  userAgent = null
}) => {
  try {
    await query(
      `INSERT INTO audit_logs (
        admin_id, action, resource_type, resource_id, changes,
        ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        adminId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(changes),
        ipAddress,
        userAgent,
        new Date().toISOString()
      ]
    );
  } catch (error) {
    log.error('Failed to log audit action:', { error: error.message, action });
  }
};

/**
 * Get audit logs with filtering
 * GET /api/audit/logs
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resourceType,
      adminId,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query with filters
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }
    if (resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }
    if (adminId) {
      conditions.push(`admin_id = $${paramIndex++}`);
      params.push(adminId);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }
    if (search) {
      conditions.push(`(action ILIKE $${paramIndex} OR resource_type ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params
    );
    const count = parseInt(countRows[0].count);

    // Get logs with user join
    params.push(limit);
    params.push(offset);
    const { rows: logs } = await query(
      `SELECT
        al.*,
        u.id as admin_user_id,
        u.full_name as admin_full_name,
        u.email as admin_email,
        u.role as admin_role
       FROM audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Format logs with nested admin object
    const formattedLogs = logs.map(logRow => ({
      ...logRow,
      admin: logRow.admin_user_id ? {
        id: logRow.admin_user_id,
        full_name: logRow.admin_full_name,
        email: logRow.admin_email,
        role: logRow.admin_role
      } : null
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    log.error('Audit logs error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get audit log by ID
 * GET /api/audit/logs/:id
 */
export const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: logRows } = await query(
      `SELECT
        al.*,
        u.id as admin_user_id,
        u.full_name as admin_full_name,
        u.email as admin_email,
        u.role as admin_role
       FROM audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       WHERE al.id = $1`,
      [id]
    );

    if (!logRows || logRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'السجل غير موجود'
      });
    }

    const logRow = logRows[0];
    const formattedLog = {
      ...logRow,
      admin: logRow.admin_user_id ? {
        id: logRow.admin_user_id,
        full_name: logRow.admin_full_name,
        email: logRow.admin_email,
        role: logRow.admin_role
      } : null
    };

    res.json({
      success: true,
      data: formattedLog
    });

  } catch (error) {
    log.error('Audit log detail error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get audit statistics
 * GET /api/audit/stats
 */
export const getAuditStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total logs count
    const { rows: totalRows } = await query(
      'SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= $1',
      [startDate.toISOString()]
    );
    const totalLogs = parseInt(totalRows[0].count);

    // Actions by type
    const { rows: actionStats } = await query(
      'SELECT action FROM audit_logs WHERE created_at >= $1',
      [startDate.toISOString()]
    );

    const actionCounts = {};
    actionStats?.forEach(logRow => {
      actionCounts[logRow.action] = (actionCounts[logRow.action] || 0) + 1;
    });

    // Resource types
    const { rows: resourceStats } = await query(
      'SELECT resource_type FROM audit_logs WHERE created_at >= $1',
      [startDate.toISOString()]
    );

    const resourceCounts = {};
    resourceStats?.forEach(logRow => {
      resourceCounts[logRow.resource_type] = (resourceCounts[logRow.resource_type] || 0) + 1;
    });

    // Most active admins
    const { rows: adminStats } = await query(
      `SELECT
        al.admin_id,
        u.full_name
       FROM audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       WHERE al.created_at >= $1`,
      [startDate.toISOString()]
    );

    const adminCounts = {};
    adminStats?.forEach(logRow => {
      const name = logRow.full_name || 'Unknown';
      adminCounts[name] = (adminCounts[name] || 0) + 1;
    });

    // Sort and get top 5 admins
    const topAdmins = Object.entries(adminCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      data: {
        totalLogs,
        period: `${days} days`,
        actionCounts,
        resourceCounts,
        topAdmins
      }
    });

  } catch (error) {
    log.error('Audit stats error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get available action types
 * GET /api/audit/actions
 */
export const getActionTypes = async (req, res) => {
  try {
    const { rows: actions } = await query(
      'SELECT DISTINCT action FROM audit_logs LIMIT 1000'
    );

    const uniqueActions = actions.map(a => a.action).sort();

    res.json({
      success: true,
      data: uniqueActions
    });

  } catch (error) {
    log.error('Action types error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Export audit logs to CSV/Excel
 * GET /api/audit/export
 */
export const exportAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    // Build query with filters
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: logs } = await query(
      `SELECT
        al.*,
        u.full_name,
        u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT 10000`,
      params
    );

    if (format === 'csv') {
      // Generate CSV
      const headers = ['التاريخ', 'المستخدم', 'الإجراء', 'نوع المورد', 'معرف المورد', 'IP'];
      const rows = logs.map(logRow => [
        new Date(logRow.created_at).toLocaleString('ar-SA'),
        logRow.full_name || '-',
        logRow.action,
        logRow.resource_type,
        logRow.resource_id || '-',
        logRow.ip_address || '-'
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      return res.send(`\ufeff${csv}`); // BOM for Arabic support
    }

    res.json({
      success: true,
      data: logs,
      count: logs.length
    });

  } catch (error) {
    log.error('Export error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في التصدير'
    });
  }
};

// Middleware to automatically log actions
export const auditMiddleware = (action, resourceType) => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Log successful actions
      if (data?.success) {
        await logAuditAction({
          adminId: req.user?.id,
          action,
          resourceType,
          resourceId: req.params?.id || data?.data?.id,
          changes: req.body,
          ipAddress: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent']
        });
      }

      return originalJson(data);
    };

    next();
  };
};

export default {
  logAuditAction,
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  getActionTypes,
  exportAuditLogs,
  auditMiddleware
};
