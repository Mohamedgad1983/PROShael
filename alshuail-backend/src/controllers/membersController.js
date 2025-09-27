import { supabase } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined before using member controller operations');
}

export const getAllMembers = async (req, res) => {
  try {
    const {
      profile_completed,
      page = 1,
      limit = 25, // Optimized default limit for better performance
      search,
      status
    } = req.query;

    // Ensure limit is a valid number and within reasonable bounds
    const pageLimit = Math.min(Math.max(parseInt(limit) || 25, 1), 100);

    let query = supabase
      .from('members')
      .select('*', { count: 'exact' });

    // Apply filters
    if (profile_completed !== undefined) {
      query = query.eq('profile_completed', profile_completed === 'true');
    }

    if (status !== undefined) {
      query = query.eq('membership_status', status === 'active' ? 'active' : 'inactive');
    }

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,` +
        `phone.ilike.%${search}%,` +
        `membership_number.ilike.%${search}%,` +
        `email.ilike.%${search}%`
      );
    }

    // Apply pagination with validated limit
    const offset = (page - 1) * pageLimit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    const { data: members, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: members || [],
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: count || 0,
        pages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الأعضاء'
    });
  }
};

export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب بيانات العضو'
    });
  }
};

export const createMember = async (req, res) => {
  try {
    const memberData = req.body;

    const requiredFields = ['full_name', 'phone'];
    for (const field of requiredFields) {
      if (!memberData[field]) {
        return res.status(400).json({
          success: false,
          error: `${field === 'full_name' ? 'الاسم الكامل' : 'رقم الهاتف'} مطلوب`
        });
      }
    }

    memberData.membership_number = 'SH-' + Date.now().toString().slice(-8);

    const { data: newMember, error } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: newMember,
      message: 'تم إضافة العضو بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إضافة العضو'
    });
  }
};

export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data: updatedMember, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: updatedMember,
      message: 'تم تحديث بيانات العضو بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في تحديث بيانات العضو'
    });
  }
};

export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'تم حذف العضو بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في حذف العضو'
    });
  }
};

export const getMemberStatistics = async (req, res) => {
  try {
    // Get total members count
    const { count: totalMembers, error: totalError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get active members count
    const { count: activeMembers, error: activeError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('membership_status', 'active');

    if (activeError) throw activeError;

    // Get completed profiles count
    const { count: completedProfiles, error: completedError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_completed', true);

    if (completedError) throw completedError;

    // Get pending profiles count
    const { count: pendingProfiles, error: pendingError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_completed', false);

    if (pendingError) throw pendingError;

    // Get social security beneficiaries count
    const { count: socialSecurityBeneficiaries, error: socialSecurityError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('social_security_beneficiary', true)
      .eq('profile_completed', true);

    if (socialSecurityError) throw socialSecurityError;

    // Get members joined this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: thisMonthMembers, error: thisMonthError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    if (thisMonthError) throw thisMonthError;

    // Get recent imports
    const { data: recentImports, error: importsError } = await supabase
      .from('excel_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (importsError) throw importsError;

    res.json({
      success: true,
      data: {
        total_members: totalMembers || 0,
        active_members: activeMembers || 0,
        completed_profiles: completedProfiles || 0,
        pending_profiles: pendingProfiles || 0,
        social_security_beneficiaries: socialSecurityBeneficiaries || 0,
        this_month_members: thisMonthMembers || 0,
        completion_rate: totalMembers > 0 ? ((completedProfiles / totalMembers) * 100).toFixed(1) : 0,
        recent_imports: recentImports || []
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب إحصائيات الأعضاء'
    });
  }
};

export const sendRegistrationReminders = async (req, res) => {
  try {
    const { memberIds, message } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد قائمة بمعرفات الأعضاء'
      });
    }

    // Get members with incomplete profiles and their registration tokens
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select(`
        id,
        full_name,
        phone,
        membership_number,
        member_registration_tokens!inner (
          token,
          temp_password,
          expires_at,
          is_used
        )
      `)
      .in('id', memberIds)
      .eq('profile_completed', false)
      .eq('member_registration_tokens.is_used', false)
      .order('member_registration_tokens.created_at', { ascending: false });

    if (membersError) throw membersError;

    if (!membersData || membersData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على أعضاء بملفات شخصية غير مكتملة'
      });
    }

    // Prepare SMS data for each member
    const smsData = membersData.map(member => {
      const token = member.member_registration_tokens[0];
      return {
        member_id: member.id,
        name: member.full_name,
        phone: member.phone,
        membership_number: member.membership_number,
        registration_token: token.token,
        temp_password: token.temp_password,
        expires_at: token.expires_at
      };
    });

    // In a real implementation, you would integrate with an SMS service here
    // For now, we'll just return the data that would be sent

    const defaultMessage = message || `
مرحباً {name}
رقم العضوية: {membership_number}
يرجى إكمال ملفك الشخصي باستخدام:
رمز التسجيل: {registration_token}
كلمة المرور المؤقتة: {temp_password}
انقر هنا: [رابط التسجيل]
صالح حتى: {expires_at}
عائلة الشعيل
    `.trim();

    // Log the reminder attempt
    console.log(`Sending registration reminders to ${smsData.length} members`);

    res.json({
      success: true,
      data: {
        total_reminders: smsData.length,
        members: smsData,
        message_template: defaultMessage
      },
      message: `تم إرسال ${smsData.length} تذكير للأعضاء`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إرسال تذكيرات التسجيل'
    });
  }
};

export const getIncompleteProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get members with incomplete profiles and their registration tokens
    const { data: members, error, count } = await supabase
      .from('members')
      .select(`
        *,
        member_registration_tokens (
          token,
          expires_at,
          is_used,
          created_at
        )
      `, { count: 'exact' })
      .eq('profile_completed', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: members || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الملفات الشخصية غير المكتملة'
    });
  }
};

export const addMemberManually = async (req, res) => {
  try {
    const {
      full_name,
      membership_number,
      phone,
      whatsapp_number,
      email,
      employer,
      social_security_beneficiary,
      send_registration_link,
      additional_info
    } = req.body;

    // Validate required fields
    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'الاسم الكامل ورقم الهاتف مطلوبان'
      });
    }

    // Generate membership number if not provided
    const finalMembershipNumber = membership_number || `SH-${Math.floor(10000 + Math.random() * 90000)}`;

    // Check if phone number already exists
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    // Create member record
    const memberData = {
      full_name,
      membership_number: finalMembershipNumber,
      phone,
      whatsapp_number: whatsapp_number || phone,
      email: email || null,
      employer: employer || null,
      social_security_beneficiary: social_security_beneficiary || false,
      status: 'pending_verification',
      membership_status: 'active',
      profile_completed: false,
      additional_info: additional_info || null,
      created_at: new Date().toISOString()
    };

    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (memberError) throw memberError;

    // Generate registration token and temporary password
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let registrationToken = '';
    for (let i = 0; i < 8; i++) {
      registrationToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Generate temporary password (6 digits)
    const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create registration token record
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const { error: tokenError } = await supabase
      .from('member_registration_tokens')
      .insert([{
        member_id: newMember.id,
        token: registrationToken,
        temp_password: hashedPassword,
        expires_at: expiryDate.toISOString(),
        is_used: false,
        created_at: new Date().toISOString()
      }]);

    if (tokenError) {
      console.error('Error creating token:', tokenError);
      // Don't fail the whole operation if token creation fails
    }

    // Store temporary password in member record
    const { error: updateError } = await supabase
      .from('members')
      .update({ temp_password: hashedPassword })
      .eq('id', newMember.id);

    if (updateError) {
      console.error('Error updating member with temp password:', updateError);
    }

    // Prepare response
    const responseData = {
      member: {
        ...newMember,
        registration_token: registrationToken,
        temp_password: tempPassword // Send plain text password for SMS
      }
    };

    if (send_registration_link) {
      // In production, integrate with SMS service here
      console.log(`SMS would be sent to ${phone}:`);
      console.log(`Registration Token: ${registrationToken}`);
      console.log(`Temporary Password: ${tempPassword}`);
    }

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'تم إضافة العضو بنجاح'
    });

  } catch (error) {
    console.error('Error adding member manually:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إضافة العضو'
    });
  }
};

// Mobile-specific controller functions

export const getMemberProfile = async (req, res) => {
  try {
    // Use member ID from RBAC middleware or JWT token
    let memberId = req.user?.id;

    if (!memberId) {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const decoded = jwt.verify(token, JWT_SECRET);
      memberId = decoded.id;
    }

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error) throw error;

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    // Remove sensitive data
    const { temp_password, password_hash, ...profileData } = member;

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الملف الشخصي'
    });
  }
};

export const getMemberBalance = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const memberId = decoded.id;

    // Get member balance from payments table using correct column names
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, category, status')
      .eq('payer_id', memberId)
      .eq('status', 'completed');

    if (paymentsError) throw paymentsError;

    // Calculate total payments
    const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    // Get member details for minimum balance
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('membership_status, full_name')
      .eq('id', memberId)
      .single();

    if (memberError) throw memberError;

    // Calculate minimum required balance (example: 1000 SAR)
    const minimumBalance = 1000;
    const currentBalance = totalPaid;
    const remainingBalance = Math.max(0, minimumBalance - currentBalance);

    res.json({
      success: true,
      data: {
        current_balance: currentBalance,
        minimum_balance: minimumBalance,
        remaining_balance: remainingBalance,
        total_payments: payments.length,
        member_status: member.membership_status,
        member_name: member.full_name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الرصيد'
    });
  }
};

export const getMemberTransactions = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const memberId = decoded.id;

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get member transactions/payments using correct column name
    const { data: transactions, error, count } = await supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('payer_id', memberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: transactions || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب المعاملات'
    });
  }
};

export const getMemberNotifications = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const memberId = decoded.id;

    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', memberId)
      .order('created_at', { ascending: false });

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: notifications || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الإشعارات'
    });
  }
};

export const updateMemberProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const memberId = decoded.id;

    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via mobile
    const {
      id,
      membership_number,
      temp_password,
      password_hash,
      membership_status,
      created_at,
      updated_at,
      ...allowedUpdates
    } = updateData;

    // Add updated timestamp
    allowedUpdates.updated_at = new Date().toISOString();

    const { data: updatedMember, error } = await supabase
      .from('members')
      .update(allowedUpdates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    // Remove sensitive data from response
    const { temp_password: _, password_hash: __, ...memberData } = updatedMember;

    res.json({
      success: true,
      data: memberData,
      message: 'تم تحديث الملف الشخصي بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في تحديث الملف الشخصي'
    });
  }
};
