// Admin Management Controller
import { query } from '../services/database.js';
import { logAdminAction, ACTIONS, RESOURCE_TYPES } from '../utils/audit-logger.js';

/**
 * Generate unique member ID
 */
async function generateMemberId() {
  const { rows } = await query('SELECT COUNT(*) as count FROM members');
  const count = parseInt(rows[0].count);

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
    const { rows: existing } = await query(
      'SELECT id FROM members WHERE phone = $1',
      [phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    // Generate unique member ID
    const memberId = await generateMemberId();

    // Insert member
    const { rows: memberRows } = await query(
      `INSERT INTO members (
        member_id, full_name_ar, full_name_en, phone, family_branch_id,
        registration_status, is_active, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        memberId,
        full_name_ar,
        full_name_en || full_name_ar,
        phone,
        family_branch_id,
        'pending_approval',
        false,
        adminId,
        new Date().toISOString()
      ]
    );

    if (!memberRows || memberRows.length === 0) {
      console.error('Insert Error: No rows returned');
      return res.status(500).json({
        success: false,
        message: 'خطأ في إضافة العضو'
      });
    }

    const member = memberRows[0];

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
    const { rows: memberRows } = await query(
      `UPDATE members
       SET family_branch_id = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [family_branch_id, new Date().toISOString(), memberId]
    );

    if (!memberRows || memberRows.length === 0) {
      console.error('Update Error: No rows returned');
      return res.status(500).json({
        success: false,
        message: 'خطأ في تعيين الفخذ'
      });
    }

    const member = memberRows[0];

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
    const { rows: subdivisions } = await query(
      'SELECT * FROM family_branches ORDER BY branch_name'
    );

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
    const { rows: totalRows } = await query('SELECT COUNT(*) as count FROM members');
    const totalMembers = parseInt(totalRows[0].count);

    // Active members count
    const { rows: activeRows } = await query(
      'SELECT COUNT(*) as count FROM members WHERE is_active = $1',
      [true]
    );
    const activeMembers = parseInt(activeRows[0].count);

    // Pending approvals count
    const { rows: pendingRows } = await query(
      'SELECT COUNT(*) as count FROM members WHERE membership_status = $1',
      ['pending_approval']
    );
    const pendingApprovals = parseInt(pendingRows[0].count);

    // Subdivisions count
    const { rows: subdivisionRows } = await query('SELECT COUNT(*) as count FROM family_branches');
    const subdivisions = parseInt(subdivisionRows[0].count);

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
