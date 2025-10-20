// Member Approval Controller
import { createClient } from '@supabase/supabase-js';
import { logAdminAction, ACTIONS, RESOURCE_TYPES } from '../utils/audit-logger.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get all pending member approvals
 * GET /api/approvals/pending
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select(`
        *,
        family_branches (
          id,
          branch_name
        )
      `)
      .eq('registration_status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get Pending Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الطلبات المعلقة'
      });
    }

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

    const { data: member, error } = await supabase
      .from('members')
      .select(`
        *,
        family_branches (
          id,
          branch_name
        ),
        member_photos (
          id,
          photo_url,
          photo_type
        )
      `)
      .eq('id', memberId)
      .single();

    if (error || !member) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    res.json({
      success: true,
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
 * Approve a member
 * POST /api/approvals/:memberId/approve
 */
export const approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;
    const { notes } = req.body;

    // Update member status
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        registration_status: 'approved',
        is_active: true,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        approval_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Approval Error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في الموافقة على العضو'
      });
    }

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
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        registration_status: 'rejected',
        is_active: false,
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Rejection Error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في رفض العضو'
      });
    }

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
    const { data: stats, error } = await supabase
      .from('members')
      .select('registration_status', { count: 'exact' });

    if (error) {
      console.error('Stats Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الإحصائيات'
      });
    }

    // Group by status
    const statusCounts = {
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      incomplete: 0
    };

    stats.forEach(member => {
      const status = member.registration_status || 'incomplete';
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
