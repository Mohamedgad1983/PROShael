// Member Approval Controller
import { query } from '../services/database.js';
import { logAdminAction, ACTIONS, RESOURCE_TYPES } from '../utils/audit-logger.js';


/**
 * Get all pending member approvals
 * GET /api/approvals/pending
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const { rows: members } = await query(
      `SELECT * FROM members
       WHERE membership_status = $1
       ORDER BY created_at DESC`,
      ['pending_approval']
    );

    res.json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get member details for approval review
 * GET /api/approvals/:memberId
 */
export const getMemberForApproval = async (req, res) => {
  try {
    const { memberId } = req.params;

    const { rows: memberRows } = await query(
      'SELECT * FROM members WHERE id = $1',
      [memberId]
    );

    if (!memberRows || memberRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    res.json({
      success: true,
      data: memberRows[0]
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Approve a member
 * POST /api/approvals/:memberId/approve
 */
export const approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;
    const { notes } = req.body;

    // Update member status
    const { rows: memberRows } = await query(
      `UPDATE members
       SET membership_status = $1,
           is_active = $2,
           approved_by = $3,
           approved_at = $4,
           approval_notes = $5,
           updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        'active',
        true,
        adminId,
        new Date().toISOString(),
        notes || null,
        new Date().toISOString(),
        memberId
      ]
    );

    if (!memberRows || memberRows.length === 0) {
      console.error('Approval Error: No rows returned');
      return res.status(500).json({
        success: false,
        message: 'خطأ في الموافقة على العضو'
      });
    }

    const member = memberRows[0];

    // Log audit event
    await logAdminAction({
      adminId: adminId,
      action: ACTIONS.MEMBER_APPROVED,
      resourceType: RESOURCE_TYPES.MEMBER,
      resourceId: memberId,
      changes: {
        member_name: member.full_name_ar,
        notes: notes
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // TODO: Send WhatsApp notification to member (File 07)

    res.json({
      success: true,
      message: 'تمت الموافقة على العضو بنجاح',
      data: member
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Reject a member
 * POST /api/approvals/:memberId/reject
 */
export const rejectMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال سبب الرفض'
      });
    }

    // Update member status
    const { rows: memberRows } = await query(
      `UPDATE members
       SET membership_status = $1,
           is_active = $2,
           rejected_by = $3,
           rejected_at = $4,
           rejection_reason = $5,
           updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        'rejected',
        false,
        adminId,
        new Date().toISOString(),
        reason,
        new Date().toISOString(),
        memberId
      ]
    );

    if (!memberRows || memberRows.length === 0) {
      console.error('Rejection Error: No rows returned');
      return res.status(500).json({
        success: false,
        message: 'خطأ في رفض العضو'
      });
    }

    const member = memberRows[0];

    // Log audit event
    await logAdminAction({
      adminId: adminId,
      action: ACTIONS.MEMBER_REJECTED,
      resourceType: RESOURCE_TYPES.MEMBER,
      resourceId: memberId,
      changes: {
        member_name: member.full_name_ar,
        reason: reason
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // TODO: Send WhatsApp notification to member (File 07)

    res.json({
      success: true,
      message: 'تم رفض العضو',
      data: member
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get approval statistics
 * GET /api/approvals/stats
 */
export const getApprovalStats = async (req, res) => {
  try {
    // Count by status
    const { rows: stats } = await query(
      'SELECT membership_status FROM members WHERE membership_status IS NOT NULL'
    );

    // Group by status
    const statusCounts = {
      pending_approval: 0,
      active: 0,
      rejected: 0,
      incomplete: 0
    };

    stats.forEach(member => {
      const status = member.membership_status || 'incomplete';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    res.json({
      success: true,
      data: statusCounts
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};
