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
import { query } from '../services/database.js';
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
 * Suspend a member
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
    const performedBy = adminId || req.user?.id || 'admin';
    const { rows } = await query(
      `UPDATE members
       SET is_suspended = $1,
           suspension_reason = $2,
           suspended_at = $3,
           suspended_by = $4
       WHERE id = $5
       RETURNING *`,
      [true, reason, new Date().toISOString(), performedBy, id]
    );

    const updatedMember = rows[0];

    if (!updatedMember) {
      log.error('Error suspending member', { memberId: id });
      return res.status(500).json({ error: 'Failed to suspend member' });
    }

    // Log the action in audit_log
    await logAuditAction({
      action_type: 'member_suspended',
      target_id: id,
      target_type: 'member',
      performed_by: performedBy,
      details: {
        reason: reason,
        member_name: updatedMember.full_name,
        member_id: updatedMember.membership_number
      }
    });

    res.json({
      success: true,
      message: '\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u0639\u0636\u0648 \u0628\u0646\u062c\u0627\u062d',
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
    const performedBy = adminId || req.user?.id || 'admin';
    const { rows } = await query(
      `UPDATE members
       SET is_suspended = $1,
           suspension_reason = $2,
           suspended_at = $3,
           suspended_by = $4,
           reactivated_at = $5,
           reactivated_by = $6
       WHERE id = $7
       RETURNING *`,
      [false, null, null, null, new Date().toISOString(), performedBy, id]
    );

    const updatedMember = rows[0];

    if (!updatedMember) {
      log.error('Error reactivating member', { memberId: id });
      return res.status(500).json({ error: 'Failed to reactivate member' });
    }

    // Log the action
    await logAuditAction({
      action_type: 'member_reactivated',
      target_id: id,
      target_type: 'member',
      performed_by: performedBy,
      details: {
        notes: notes,
        member_name: updatedMember.full_name,
        member_id: updatedMember.membership_number
      }
    });

    res.json({
      success: true,
      message: '\u062a\u0645 \u0625\u0639\u0627\u062f\u0629 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0639\u0636\u0648 \u0628\u0646\u062c\u0627\u062d',
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
        const { rows: memberRows } = await query(
          'SELECT * FROM members WHERE id = $1',
          [memberId]
        );

        const member = memberRows[0];

        if (!member) {
          results.failed.push({
            memberId,
            reason: 'Member not found'
          });
          continue;
        }

        // Create notification record
        if (channel === 'app' || channel === 'both') {
          try {
            await query(
              `INSERT INTO notifications (member_id, type, title, message, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [memberId, type || 'general', title || '\u0625\u0634\u0639\u0627\u0631', message, 'pending', new Date().toISOString()]
            );
          } catch (notifErr) {
            log.error('Notification creation failed', { memberId, error: notifErr.message });
          }
        }

        // Add to SMS queue if requested
        if ((channel === 'sms' || channel === 'both') && (member.phone || member.mobile)) {
          const phoneNumber = member.phone || member.mobile;

          try {
            await query(
              `INSERT INTO sms_queue (phone_number, message, status, member_id, created_at)
               VALUES ($1, $2, $3, $4, $5)`,
              [phoneNumber, message, 'pending', memberId, new Date().toISOString()]
            );
          } catch (smsErr) {
            log.error('SMS queue failed', { memberId, error: smsErr.message });
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
      message: `\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 ${results.sent.length} \u0625\u0634\u0639\u0627\u0631 \u0628\u0646\u062c\u0627\u062d`,
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

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (action_type) {
      conditions.push(`action_type = $${paramIndex++}`);
      params.push(action_type);
    }

    if (target_type) {
      conditions.push(`target_type = $${paramIndex++}`);
      params.push(target_type);
    }

    if (performed_by) {
      conditions.push(`performed_by = $${paramIndex++}`);
      params.push(performed_by);
    }

    if (start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM audit_log ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataParams = [...params, limitNum, offset];
    const { rows: logs } = await query(
      `SELECT * FROM audit_log ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

    res.json({
      success: true,
      logs: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        totalPages: Math.ceil(total / limitNum)
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
    await query(
      `INSERT INTO audit_log (action_type, target_id, target_type, performed_by, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        auditData.action_type,
        auditData.target_id,
        auditData.target_type,
        auditData.performed_by,
        JSON.stringify(auditData.details),
        new Date().toISOString()
      ]
    );
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
