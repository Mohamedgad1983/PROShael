/**
 * Optimized Member Monitoring Controller
 * Enhanced performance with advanced filtering and caching
 */

import {
  buildMemberMonitoringQuery,
  getMemberStatistics,
  exportMemberData,
  getMemberDetails,
  searchMembersAutocomplete,
  getTribalSectionStats
} from '../services/memberMonitoringQueryService.js';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Get member monitoring dashboard with advanced filters
 *
 * Query Parameters:
 * - memberId: Member ID search (partial match)
 * - fullName: Full name search (Arabic support)
 * - phone: Phone number search
 * - tribalSection: Tribal section filter
 * - balanceOperator: <, >, =, between, compliant, non-compliant, critical, excellent
 * - balanceAmount: Amount for balance comparison
 * - balanceMin/Max: Range for between operator
 * - status: active, suspended
 * - page: Page number (default 1)
 * - limit: Items per page (default 50)
 * - sortBy: Field to sort by
 * - sortOrder: asc or desc
 */
export const getMemberMonitoring = async (req, res) => {
  try {
    const startTime = Date.now();

    // Extract and validate filters
    const filters = {
      memberId: req.query.memberId,
      fullName: req.query.fullName,
      phone: req.query.phone,
      tribalSection: req.query.tribalSection,
      balanceOperator: req.query.balanceOperator,
      balanceAmount: req.query.balanceAmount ? parseFloat(req.query.balanceAmount) : undefined,
      balanceMin: req.query.balanceMin ? parseFloat(req.query.balanceMin) : undefined,
      balanceMax: req.query.balanceMax ? parseFloat(req.query.balanceMax) : undefined,
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sortBy || 'full_name',
      sortOrder: req.query.sortOrder || 'asc'
    };

    // Validate limit to prevent abuse
    if (filters.limit > 100) {
      filters.limit = 100;
    }

    // Execute optimized query
    const result = await buildMemberMonitoringQuery(filters);

    // Calculate query time
    const queryTime = Date.now() - startTime;

    // Set proper headers for Arabic text and CORS
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Query-Time', `${queryTime}ms`);

    res.json({
      success: true,
      members: result.data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.metadata.total,
        totalPages: result.metadata.totalPages,
        filtered: result.metadata.filtered
      },
      statistics: result.metadata.statistics,
      performance: {
        queryTime: `${queryTime}ms`,
        cached: false
      }
    });

  } catch (error) {
    log.error('Error in getMemberMonitoring', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Get dashboard statistics with caching
 */
export const getDashboardStatistics = async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const result = await getMemberStatistics(forceRefresh);

    res.json({
      success: true,
      statistics: result.data,
      cached: result.cached,
      cacheAge: result.cacheAge
    });

  } catch (error) {
    log.error('Error in getDashboardStatistics', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
};

/**
 * Export filtered members to Excel/CSV
 */
export const exportMembers = async (req, res) => {
  try {
    // Use same filters as monitoring
    const filters = {
      memberId: req.query.memberId,
      fullName: req.query.fullName,
      phone: req.query.phone,
      tribalSection: req.query.tribalSection,
      balanceOperator: req.query.balanceOperator,
      balanceAmount: req.query.balanceAmount ? parseFloat(req.query.balanceAmount) : undefined,
      balanceMin: req.query.balanceMin ? parseFloat(req.query.balanceMin) : undefined,
      balanceMax: req.query.balanceMax ? parseFloat(req.query.balanceMax) : undefined,
      status: req.query.status
    };

    const result = await exportMemberData(filters);

    // Set headers for file download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="members-export-${timestamp}.json"`);

    res.json(result);

  } catch (error) {
    log.error('Error in exportMembers', { error: error.message });
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
};

/**
 * Get detailed member information
 */
export const getMemberDetailsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Member ID is required'
      });
    }

    const result = await getMemberDetails(id);

    res.json(result);

  } catch (error) {
    log.error('Error in getMemberDetailsById', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch member details',
      message: error.message
    });
  }
};

/**
 * Search members with autocomplete
 */
export const searchMembers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const result = await searchMembersAutocomplete(q, parseInt(limit));

    res.json(result);

  } catch (error) {
    log.error('Error in searchMembers', { error: error.message });
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
};

/**
 * Get tribal section statistics
 */
export const getTribalSections = async (req, res) => {
  try {
    const result = await getTribalSectionStats();

    res.json(result);

  } catch (error) {
    log.error('Error in getTribalSections', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch tribal sections',
      message: error.message
    });
  }
};

/**
 * Suspend a member (إيقاف)
 */
export const suspendMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, adminId } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Suspension reason is required'
      });
    }

    // Update member status
    const { data: updatedMember, error: _updateError } = await supabase
      .from('members')
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminId || req.user?.id || 'admin'
      })
      .eq('id', id)
      .select()
      .single();

    if (_updateError) {
      log.error('Error suspending member', { error: _updateError.message });
      return res.status(500).json({ error: 'Failed to suspend member' });
    }

    // Log the action in audit_log
    await logAuditAction({
      action_type: 'member_suspended',
      target_id: id,
      target_type: 'member',
      performed_by: adminId || req.user?.id || 'admin',
      details: {
        reason: reason,
        member_name: updatedMember.full_name,
        member_id: updatedMember.membership_number
      }
    });

    res.json({
      success: true,
      message: 'تم إيقاف العضو بنجاح',
      member: updatedMember
    });

  } catch (error) {
    log.error('Error in suspendMember', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Reactivate a suspended member
 */
export const reactivateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, notes } = req.body;

    // Update member status
    const { data: updatedMember, error: _updateError } = await supabase
      .from('members')
      .update({
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null,
        suspended_by: null,
        reactivated_at: new Date().toISOString(),
        reactivated_by: adminId || req.user?.id || 'admin'
      })
      .eq('id', id)
      .select()
      .single();

    if (_updateError) {
      log.error('Error reactivating member', { error: _updateError.message });
      return res.status(500).json({ error: 'Failed to reactivate member' });
    }

    // Log the action
    await logAuditAction({
      action_type: 'member_reactivated',
      target_id: id,
      target_type: 'member',
      performed_by: adminId || req.user?.id || 'admin',
      details: {
        notes: notes,
        member_name: updatedMember.full_name,
        member_id: updatedMember.membership_number
      }
    });

    res.json({
      success: true,
      message: 'تم إعادة تفعيل العضو بنجاح',
      member: updatedMember
    });

  } catch (error) {
    log.error('Error in reactivateMember', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Send notification to member(s)
 */
export const notifyMembers = async (req, res) => {
  try {
    const { memberIds, type, title, message, channel = 'both' } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Member IDs are required'
      });
    }

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    const results = {
      sent: [],
      failed: []
    };

    // Process notifications for each member
    for (const memberId of memberIds) {
      try {
        // Get member details
        const { data: member, error: _memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', memberId)
          .single();

        if (_memberError || !member) {
          results.failed.push({
            memberId,
            reason: 'Member not found'
          });
          continue;
        }

        // Create notification record
        if (channel === 'app' || channel === 'both') {
          const { error: _notifError } = await supabase
            .from('notifications')
            .insert({
              member_id: memberId,
              type: type || 'general',
              title: title || 'إشعار',
              message: message,
              status: 'pending',
              created_at: new Date().toISOString()
            });

          if (_notifError) {
            log.error('Notification creation failed', { memberId, error: _notifError.message });
          }
        }

        // Add to SMS queue if requested
        if ((channel === 'sms' || channel === 'both') && (member.phone || member.mobile)) {
          const phoneNumber = member.phone || member.mobile;

          const { error: _smsError } = await supabase
            .from('sms_queue')
            .insert({
              phone_number: phoneNumber,
              message: message,
              status: 'pending',
              member_id: memberId,
              created_at: new Date().toISOString()
            });

          if (_smsError) {
            log.error('SMS queue failed', { memberId, error: _smsError.message });
          }
        }

        results.sent.push({
          memberId,
          memberName: member.full_name
        });

      } catch (error) {
        log.error('Failed to notify member', { memberId, error: error.message });
        results.failed.push({
          memberId,
          reason: error.message
        });
      }
    }

    // Log the bulk action
    await logAuditAction({
      action_type: 'bulk_notification',
      target_id: memberIds.join(','),
      target_type: 'members',
      performed_by: req.user?.id || 'admin',
      details: {
        type: type,
        channel: channel,
        message: message,
        sent_count: results.sent.length,
        failed_count: results.failed.length
      }
    });

    res.json({
      success: true,
      message: `تم إرسال ${results.sent.length} إشعار بنجاح`,
      results: results
    });

  } catch (error) {
    log.error('Error in notifyMembers', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Get audit log with filtering
 */
export const getAuditLog = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action_type,
      target_type,
      performed_by,
      start_date,
      end_date
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    if (performed_by) {
      query = query.eq('performed_by', performed_by);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      log.error('Error fetching audit logs', { error: error.message });
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    res.json({
      success: true,
      logs: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    log.error('Error in getAuditLog', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Helper function to log audit actions
 */
async function logAuditAction(auditData) {
  try {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        ...auditData,
        created_at: new Date().toISOString()
      });

    if (error) {
      log.error('Error logging audit action', { error: error.message });
    }
  } catch (error) {
    log.error('Failed to log audit action', { error: error.message });
  }
}

// Export all controller functions
export default {
  getMemberMonitoring,
  getDashboardStatistics,
  exportMembers,
  getMemberDetailsById,
  searchMembers,
  getTribalSections,
  suspendMember,
  reactivateMember,
  notifyMembers,
  getAuditLog
};