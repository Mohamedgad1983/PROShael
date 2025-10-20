// Admin Management Controller
import { createClient } from '@supabase/supabase-js';
import { logAdminAction, ACTIONS, RESOURCE_TYPES } from '../utils/audit-logger.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Generate unique member ID
 */
async function generateMemberId() {
  const { count } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true });

  return `SH-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Add new member (Admin only)
 * POST /api/admin/members
 */
export const addMember = async (req, res) => {
  try {
    const {
      full_name_ar,
      full_name_en,
      phone,
      family_branch_id
    } = req.body;

    const adminId = req.user.id;

    // Validate required fields
    if (!full_name_ar || !phone || !family_branch_id) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والهاتف والفخذ مطلوبة'
      });
    }

    // Validate phone format (Saudi or Kuwaiti)
    const phoneRegex = /^(\+966|966)?5[0-9]{8}$|^(\+965|965)?[569][0-9]{7}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح. يجب أن يكون سعودي (+966) أو كويتي (+965)'
      });
    }

    // Check if phone already exists
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    // Generate unique member ID
    const memberId = await generateMemberId();

    // Insert member
    const { data: member, error: insertError } = await supabase
      .from('members')
      .insert({
        member_id: memberId,
        full_name_ar,
        full_name_en: full_name_en || full_name_ar,
        phone,
        family_branch_id,
        registration_status: 'pending_approval',
        is_active: false,
        created_by: adminId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert Error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في إضافة العضو'
      });
    }

    // Log audit event
    await logAdminAction({
      adminId,
      action: ACTIONS.MEMBER_CREATED,
      resourceType: RESOURCE_TYPES.MEMBER,
      resourceId: member.id,
      changes: {
        member_id: memberId,
        full_name_ar,
        phone,
        family_branch_id
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // TODO: Send WhatsApp invite with OTP (File 07)

    res.status(201).json({
      success: true,
      message: 'تمت إضافة العضو بنجاح',
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
 * Assign subdivision to member
 * PUT /api/admin/members/:memberId/subdivision
 */
export const assignSubdivision = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { family_branch_id } = req.body;
    const adminId = req.user.id;

    if (!family_branch_id) {
      return res.status(400).json({
        success: false,
        message: 'الفخذ مطلوب'
      });
    }

    // Update member
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        family_branch_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Update Error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في تعيين الفخذ'
      });
    }

    // Log audit event
    await logAdminAction({
      adminId,
      action: ACTIONS.SUBDIVISION_ASSIGNED,
      resourceType: RESOURCE_TYPES.MEMBER,
      resourceId: memberId,
      changes: {
        family_branch_id,
        member_name: member.full_name_ar
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'تم تعيين الفخذ بنجاح',
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
 * Get all subdivisions (family branches)
 * GET /api/admin/subdivisions
 */
export const getSubdivisions = async (req, res) => {
  try {
    const { data: subdivisions, error } = await supabase
      .from('family_branches')
      .select('*')
      .order('branch_name');

    if (error) {
      console.error('Get Subdivisions Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الفخوذ'
      });
    }

    res.json({
      success: true,
      count: subdivisions.length,
      data: subdivisions
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
 * Get dashboard statistics
 * GET /api/admin/dashboard/stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Total members count
    const { count: totalMembers } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true });

    // Active members count
    const { count: activeMembers } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // Pending approvals count
    const { count: pendingApprovals } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('registration_status', 'pending_approval');

    // Subdivisions count
    const { count: subdivisions } = await supabase
      .from('family_branches')
      .select('id', { count: 'exact', head: true });

    res.json({
      success: true,
      data: {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        pendingApprovals: pendingApprovals || 0,
        subdivisions: subdivisions || 0
      }
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};
