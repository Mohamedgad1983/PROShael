const { supabase } = require('../config/database');

// Get all family members
const getAllMembers = async (req, res) => {
  try {
    console.log('Fetching all family members...');

    const { data: members, error } = await supabase
      .from('temp_members')
      .select(`
        *,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Format member data for display
    const formattedMembers = (members || []).map(member => ({
      id: member.id,
      full_name: member.full_name,
      phone: member.phone,
      role: member.role,
      membership_number: member.membership_number,
      is_active: member.is_active !== false, // Default to true if not specified
      created_at: member.created_at
    }));

    res.json({
      status: 'success',
      message_ar: 'تم جلب قائمة الأعضاء بنجاح',
      message_en: 'Members list retrieved successfully',
      data: {
        members: formattedMembers,
        total: formattedMembers.length,
        active: formattedMembers.filter(m => m.is_active).length
      }
    });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في جلب قائمة الأعضاء',
      message_en: 'Error retrieving members list',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new family member
const createMember = async (req, res) => {
  try {
    const { full_name, phone, role, membership_number } = req.body;

    // Validate required fields
    if (!full_name || !phone || !role) {
      return res.status(400).json({
        status: 'error',
        message_ar: 'الاسم ورقم الهاتف والدور مطلوبة',
        message_en: 'Name, phone, and role are required'
      });
    }

    // Check if phone already exists
    const { data: existingMember } = await supabase
      .from('temp_members')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingMember) {
      return res.status(409).json({
        status: 'error',
        message_ar: 'رقم الهاتف مستخدم بالفعل',
        message_en: 'Phone number already exists'
      });
    }

    const { data: member, error } = await supabase
      .from('temp_members')
      .insert([{
        full_name,
        phone,
        role,
        membership_number: membership_number || `SH-${Date.now()}`,
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Create member error:', error);
      throw error;
    }

    res.status(201).json({
      status: 'success',
      message_ar: 'تم إضافة العضو بنجاح',
      message_en: 'Member added successfully',
      data: { member }
    });

  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في إضافة العضو',
      message_en: 'Error adding member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update member information
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.password;
    delete updates.id;
    delete updates.created_at;

    const { data: member, error } = await supabase
      .from('temp_members')
      .update({
        ...updates
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update member error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          status: 'error',
          message_ar: 'العضو غير موجود',
          message_en: 'Member not found'
        });
      }
      throw error;
    }

    res.json({
      status: 'success',
      message_ar: 'تم تحديث بيانات العضو بنجاح',
      message_en: 'Member information updated successfully',
      data: { member }
    });

  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في تحديث بيانات العضو',
      message_en: 'Error updating member information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update member role
const updateMemberRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['super_admin', 'admin', 'financial_manager', 'organizer', 'member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message_ar: 'الدور المحدد غير صحيح',
        message_en: 'Invalid role specified'
      });
    }

    // Prevent users from changing their own role
    if (req.user && req.user.id === id) {
      return res.status(403).json({
        status: 'error',
        message_ar: 'لا يمكنك تغيير دورك بنفسك',
        message_en: 'You cannot change your own role'
      });
    }

    const { data: member, error } = await supabase
      .from('temp_members')
      .update({
        role
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update member role error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          status: 'error',
          message_ar: 'العضو غير موجود',
          message_en: 'Member not found'
        });
      }
      throw error;
    }

    res.json({
      status: 'success',
      message_ar: 'تم تحديث دور العضو بنجاح',
      message_en: 'Member role updated successfully',
      data: { member }
    });

  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في تحديث دور العضو',
      message_en: 'Error updating member role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Soft delete member (deactivate)
const softDeleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent users from deactivating themselves
    if (req.user && req.user.id === id) {
      return res.status(403).json({
        status: 'error',
        message_ar: 'لا يمكنك إلغاء تفعيل حسابك بنفسك',
        message_en: 'You cannot deactivate your own account'
      });
    }

    const { data: member, error } = await supabase
      .from('temp_members')
      .update({
        is_active: false
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Deactivate member error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          status: 'error',
          message_ar: 'العضو غير موجود',
          message_en: 'Member not found'
        });
      }
      throw error;
    }

    res.json({
      status: 'success',
      message_ar: 'تم إلغاء تفعيل العضو بنجاح',
      message_en: 'Member deactivated successfully',
      data: { member }
    });

  } catch (error) {
    console.error('Deactivate member error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في إلغاء تفعيل العضو',
      message_en: 'Error deactivating member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get available roles with Arabic labels
const getRoles = async (req, res) => {
  try {
    const roles = [
      {
        value: 'super_admin',
        label_ar: 'مدير عام',
        label_en: 'Super Admin',
        permissions: ['all'],
        level: 4,
        description_ar: 'صلاحيات كاملة في النظام'
      },
      {
        value: 'admin',
        label_ar: 'مدير',
        label_en: 'Admin',
        permissions: ['manage_activities', 'manage_members', 'view_reports'],
        level: 3,
        description_ar: 'إدارة الأنشطة والأعضاء والتقارير'
      },
      {
        value: 'financial_manager',
        label_ar: 'مدير مالي',
        label_en: 'Financial Manager',
        permissions: ['manage_finances', 'view_reports'],
        level: 2,
        description_ar: 'إدارة الشؤون المالية والتقارير'
      },
      {
        value: 'organizer',
        label_ar: 'منظم',
        label_en: 'Organizer',
        permissions: ['manage_activities', 'view_members'],
        level: 1,
        description_ar: 'تنظيم الأنشطة وعرض الأعضاء'
      },
      {
        value: 'member',
        label_ar: 'عضو',
        label_en: 'Member',
        permissions: ['view_activities'],
        level: 0,
        description_ar: 'عضو عادي في العائلة'
      }
    ];

    res.json({
      status: 'success',
      message_ar: 'تم جلب قائمة الأدوار بنجاح',
      message_en: 'Roles list retrieved successfully',
      data: { roles }
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في جلب قائمة الأدوار',
      message_en: 'Error retrieving roles list',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllMembers,
  createMember,
  updateMember,
  updateMemberRole,
  softDeleteMember,
  getRoles
};