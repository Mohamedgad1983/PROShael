/**
 * Audit Log Controller
 * Handles audit trail logging and retrieval
 * 
 * @module audit.controller
 */

import { supabase } from '../config/database.js';
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
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        changes,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      });

    if (error) {
      log.error('Failed to log audit action:', { error: error.message, action });
    }
  } catch (error) {
    log.error('Audit log error:', { error: error.message });
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

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        admin:users!audit_logs_admin_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `, { count: 'exact' });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (search) {
      query = query.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%`);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      log.error('Error fetching audit logs:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب سجل التدقيق'
      });
    }

    res.json({
      success: true,
      data: logs,
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

    const { data: log, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        admin:users!audit_logs_admin_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error || !log) {
      return res.status(404).json({
        success: false,
        message: 'السجل غير موجود'
      });
    }

    res.json({
      success: true,
      data: log
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
    const { count: totalLogs } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Actions by type
    const { data: actionStats } = await supabase
      .from('audit_logs')
      .select('action')
      .gte('created_at', startDate.toISOString());

    const actionCounts = {};
    actionStats?.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    // Resource types
    const { data: resourceStats } = await supabase
      .from('audit_logs')
      .select('resource_type')
      .gte('created_at', startDate.toISOString());

    const resourceCounts = {};
    resourceStats?.forEach(log => {
      resourceCounts[log.resource_type] = (resourceCounts[log.resource_type] || 0) + 1;
    });

    // Most active admins
    const { data: adminStats } = await supabase
      .from('audit_logs')
      .select(`
        admin_id,
        admin:users!audit_logs_admin_id_fkey (
          full_name
        )
      `)
      .gte('created_at', startDate.toISOString());

    const adminCounts = {};
    adminStats?.forEach(log => {
      const name = log.admin?.full_name || 'Unknown';
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
    const { data: actions } = await supabase
      .from('audit_logs')
      .select('action')
      .limit(1000);

    const uniqueActions = [...new Set(actions?.map(a => a.action) || [])];

    res.json({
      success: true,
      data: uniqueActions.sort()
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

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        admin:users!audit_logs_admin_id_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query.limit(10000);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في تصدير البيانات'
      });
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['التاريخ', 'المستخدم', 'الإجراء', 'نوع المورد', 'معرف المورد', 'IP'];
      const rows = logs.map(log => [
        new Date(log.created_at).toLocaleString('ar-SA'),
        log.admin?.full_name || '-',
        log.action,
        log.resource_type,
        log.resource_id || '-',
        log.ip_address || '-'
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      return res.send('\ufeff' + csv); // BOM for Arabic support
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
  return async (req, res, next) => {
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
