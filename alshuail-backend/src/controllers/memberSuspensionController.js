import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Suspend a member (Super Admin only)
 * POST /api/members/:memberId/suspend
 */
export const suspendMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;
    const superAdmin = req.superAdmin; // From requireSuperAdmin middleware

    // Validate inputs
    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'معرف العضو مطلوب'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'يجب إدخال سبب الإيقاف'
      });
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, membership_status')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
        message: 'العضو غير موجود'
      });
    }

    // Check if already suspended
    if (member.membership_status === 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_SUSPENDED',
        message: 'العضو موقوف بالفعل'
      });
    }

    // Suspend the member
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        membership_status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_by: superAdmin.id,
        suspension_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      log.error('[Suspend] Database error:', { updateError, memberId });
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'خطأ في إيقاف العضو'
      });
    }

    log.info('[Suspend] Member suspended successfully:', {
      memberId,
      memberName: member.full_name,
      suspendedBy: superAdmin.email,
      reason
    });

    // Return success
    res.json({
      success: true,
      message: 'تم إيقاف العضو بنجاح',
      data: {
        member: {
          id: updatedMember.id,
          name: updatedMember.full_name,
          status: updatedMember.membership_status,
          suspended_at: updatedMember.suspended_at,
          suspended_by: superAdmin.email,
          suspension_reason: updatedMember.suspension_reason
        }
      }
    });

  } catch (error) {
    log.error('[Suspend] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Activate a suspended member (Super Admin only)
 * POST /api/members/:memberId/activate
 */
export const activateMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { notes } = req.body;
    const superAdmin = req.superAdmin;

    // Validate inputs
    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'معرف العضو مطلوب'
      });
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, membership_status')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
        message: 'العضو غير موجود'
      });
    }

    // Check if actually suspended
    if (member.membership_status !== 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'NOT_SUSPENDED',
        message: 'العضو غير موقوف'
      });
    }

    // Activate the member
    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update({
        membership_status: 'active',
        reactivated_at: new Date().toISOString(),
        reactivated_by: superAdmin.id,
        reactivation_notes: notes || 'تم التفعيل بواسطة المشرف العام',
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      log.error('[Activate] Database error:', { updateError, memberId });
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'خطأ في تفعيل العضو'
      });
    }

    log.info('[Activate] Member activated successfully:', {
      memberId,
      memberName: member.full_name,
      activatedBy: superAdmin.email,
      notes
    });

    // Return success
    res.json({
      success: true,
      message: 'تم تفعيل العضو بنجاح',
      data: {
        member: {
          id: updatedMember.id,
          name: updatedMember.full_name,
          status: updatedMember.membership_status,
          reactivated_at: updatedMember.reactivated_at,
          reactivated_by: superAdmin.email,
          reactivation_notes: updatedMember.reactivation_notes
        }
      }
    });

  } catch (error) {
    log.error('[Activate] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get suspension history for a member
 * GET /api/members/:memberId/suspension-history
 */
export const getSuspensionHistory = async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select(`
        id,
        full_name,
        membership_status,
        suspended_at,
        suspended_by,
        suspension_reason,
        reactivated_at,
        reactivated_by,
        reactivation_notes
      `)
      .eq('id', memberId)
      .single();

    if (error || !member) {
      return res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
        message: 'العضو غير موجود'
      });
    }

    res.json({
      success: true,
      data: {
        member: {
          id: member.id,
          name: member.full_name,
          current_status: member.membership_status
        },
        suspension_info: member.suspended_at ? {
          suspended_at: member.suspended_at,
          suspended_by: member.suspended_by,
          reason: member.suspension_reason,
          reactivated_at: member.reactivated_at,
          reactivated_by: member.reactivated_by,
          notes: member.reactivation_notes
        } : null
      }
    });

  } catch (error) {
    log.error('[SuspensionHistory] Error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};
