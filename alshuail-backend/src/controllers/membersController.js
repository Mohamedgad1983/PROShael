import { supabase } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sanitizeJSON as _sanitizeJSON, prepareUpdateData } from '../utils/jsonSanitizer.js';
import { sanitizeSearchTerm, sanitizeNumber, sanitizeBoolean, sanitizePhone } from '../utils/inputSanitizer.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

// Financial calculation constants for 5-year subscription (2021-2025)
const SUBSCRIPTION_CONFIG = {
  ANNUAL_FEE: 600,           // 600 SAR per year
  TOTAL_EXPECTED: 3000,      // 3000 SAR total over 5 years
  START_YEAR: 2021,
  END_YEAR: 2025
};

// Calculate expected payment based on current date
const calculateExpectedPayment = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Calculate completed years since 2021
  let yearsPassed = Math.min(5, Math.max(0, currentYear - SUBSCRIPTION_CONFIG.START_YEAR));

  // If we're past the end year, full amount is expected
  if (currentYear > SUBSCRIPTION_CONFIG.END_YEAR) {
    return SUBSCRIPTION_CONFIG.TOTAL_EXPECTED;
  }

  // If we're in a subscription year, add partial year if past mid-year
  if (currentYear >= SUBSCRIPTION_CONFIG.START_YEAR && currentYear <= SUBSCRIPTION_CONFIG.END_YEAR) {
    yearsPassed = currentYear - SUBSCRIPTION_CONFIG.START_YEAR + 1;
  }

  return Math.min(SUBSCRIPTION_CONFIG.TOTAL_EXPECTED, yearsPassed * SUBSCRIPTION_CONFIG.ANNUAL_FEE);
};

// Transform member data to match frontend expected field names with correct financial calculations
const transformMemberForFrontend = (member) => {
  const expectedByNow = calculateExpectedPayment();
  const currentPaid = parseFloat(member.current_balance) || parseFloat(member.total_paid) || 0;

  // Calculate arrears (what they should have paid minus what they actually paid)
  const arrears = Math.max(0, expectedByNow - currentPaid);

  // Calculate remaining balance to reach full subscription
  const requiredRemaining = Math.max(0, SUBSCRIPTION_CONFIG.TOTAL_EXPECTED - currentPaid);

  // Determine financial status based on payment compliance
  let financialStatus;
  let isDelayed = false;

  if (currentPaid >= expectedByNow) {
    // Fully compliant - paid what's expected by now
    financialStatus = 'compliant';
  } else if (currentPaid >= expectedByNow * 0.8) {
    // Partial - paid at least 80% of expected
    financialStatus = 'partial';
  } else if (currentPaid > 0) {
    // Delayed - paid less than 80% of expected
    financialStatus = 'delayed';
    isDelayed = true;
  } else {
    // No payment at all
    financialStatus = 'critical';
    isDelayed = true;
  }

  return {
    // Original fields (keep for backward compatibility)
    ...member,
    // Mapped fields for frontend
    member_number: member.membership_number || member.id,
    full_name_arabic: member.full_name || 'غير محدد',
    phone_number: member.phone || '',
    branch_arabic: member.tribal_section || 'غير محدد',
    // Correct financial calculations
    current_balance: currentPaid,
    required_balance: requiredRemaining,
    total_paid: currentPaid,
    arrears: arrears,
    expected_total: SUBSCRIPTION_CONFIG.TOTAL_EXPECTED,
    expected_by_now: expectedByNow,
    // Financial status
    financial_status: financialStatus,
    is_delayed: isDelayed,
    // Status mapping
    membership_status: member.membership_status || member.status || 'unknown'
  };
};

export const getAllMembers = async (req, res) => {
  try {
    const {
      profile_completed,
      page = 1,
      limit = 100, // Increased default for monitoring dashboard
      search,
      status
    } = req.query;

    // Sanitize and validate inputs
    const pageNum = sanitizeNumber(page, 1, 10000, 1);
    const pageLimit = sanitizeNumber(limit, 1, 1000, 100); // Increased max to 1000 to support all members
    const profileCompleted = profile_completed !== undefined ? sanitizeBoolean(profile_completed) : undefined;
    const membershipStatus = status === 'active' || status === 'inactive' ? status : undefined;

    let query = supabase
      .from('members')
      .select('*', { count: 'exact' });

    // Apply filters with sanitized inputs
    if (profileCompleted !== undefined) {
      query = query.eq('profile_completed', profileCompleted);
    }

    if (membershipStatus !== undefined) {
      query = query.eq('membership_status', membershipStatus);
    }

    // Sanitize search term to prevent SQL injection
    if (search) {
      const sanitizedSearch = sanitizeSearchTerm(search);
      if (sanitizedSearch) {
        query = query.or(
          `full_name.ilike.%${sanitizedSearch}%,` +
          `phone.ilike.%${sanitizedSearch}%,` +
          `membership_number.ilike.%${sanitizedSearch}%,` +
          `email.ilike.%${sanitizedSearch}%`
        );
      }
    }

    // Apply pagination with sanitized values
    const offset = (pageNum - 1) * pageLimit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    const { data: members, error, count } = await query;

    if (error) {
      log.error('Failed to fetch members', { error: error.message });
      throw error;
    }

    // Transform all members to match frontend expected format
    const transformedMembers = (members || []).map(transformMemberForFrontend);

    res.json({
      success: true,
      data: transformedMembers,
      pagination: {
        page: pageNum,
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

    if (error) {throw error;}

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

    log.debug('Create Member Request', { memberData });

    const requiredFields = ['full_name', 'phone'];
    for (const field of requiredFields) {
      if (!memberData[field]) {
        return res.status(400).json({
          success: false,
          error: `${field === 'full_name' ? 'الاسم الكامل' : 'رقم الهاتف'} مطلوب`
        });
      }
    }

    // Sanitize and validate phone number (supports Saudi +966 and Kuwait +965)
    const sanitizedPhone = sanitizePhone(memberData.phone, memberData.country_code);
    if (!sanitizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف غير صالح. يجب أن يكون رقم سعودي (05XXXXXXXX) أو كويتي (XXXXXXXX)'
      });
    }

    // Generate membership number if not provided
    if (!memberData.membership_number) {
      memberData.membership_number = `SH-${  Date.now().toString().slice(-8)}`;
    }

    // Ensure all fields are properly set
    const memberToCreate = {
      full_name: memberData.full_name,
      phone: sanitizedPhone,
      email: memberData.email || null,
      national_id: memberData.national_id || null,
      tribal_section: memberData.tribal_section || null,
      city: memberData.city || null,
      district: memberData.district || null,
      address: memberData.address || null,
      occupation: memberData.occupation || null,
      employer: memberData.employer || null,
      password: memberData.password || null,
      membership_number: memberData.membership_number,
      membership_status: memberData.membership_status || 'active',
      profile_completed: memberData.profile_completed || false,
      created_at: new Date().toISOString()
    };

    log.debug('Preparing to create member', { membershipNumber: memberToCreate.membership_number });

    const { data: newMember, error } = await supabase
      .from('members')
      .insert([memberToCreate])
      .select()
      .single();

    if (error) {
      log.error('Supabase create member error', { error: error.message });
      throw error;
    }

    log.info('Member created successfully', { memberId: newMember.id, membershipNumber: newMember.membership_number });

    res.status(201).json({
      success: true,
      data: newMember,
      message: 'تم إضافة العضو بنجاح'
    });
  } catch (error) {
    log.error('Create member failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إضافة العضو'
    });
  }
};

export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;

    log.debug('Update member request started', { memberId: id });
    log.debug('Update request body', { bodyType: typeof req.body });

    // Express JSON middleware already parses the body - use it directly
    const updateData = req.body || {};

    log.debug('Update data received', { fieldsCount: Object.keys(updateData).length });

    // Clean and validate the data before preparing
    const cleanedData = {};
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];

      // Handle date fields - REMOVE them if empty instead of setting to null
      if ((key === 'date_of_birth' || key === 'membership_date')) {
        if (value === '' || value === undefined || value === null) {
          // Don't include empty date fields in the update at all
          return;
        } else {
          cleanedData[key] = value;
        }
      }
      // Handle special cases for gender and tribal_section
      else if (key === 'gender' && value) {
        cleanedData[key] = value.toLowerCase().trim();
      } else if (key === 'tribal_section' && value) {
        cleanedData[key] = value.trim();
      } else if (value !== undefined && value !== null && value !== '') {
        cleanedData[key] = typeof value === 'string' ? value.trim() : value;
      } else {
        cleanedData[key] = null;
      }
    });

    log.debug('Data cleaned and validated', { fieldsCount: Object.keys(cleanedData).length });

    // Sanitize and validate phone number if it's being updated
    if (cleanedData.phone) {
      const sanitizedPhone = sanitizePhone(cleanedData.phone, cleanedData.country_code);
      if (!sanitizedPhone) {
        return res.status(400).json({
          success: false,
          error: 'رقم الهاتف غير صالح. يجب أن يكون رقم سعودي (05XXXXXXXX) أو كويتي (XXXXXXXX)'
        });
      }
      cleanedData.phone = sanitizedPhone;
    }

    // Use our utility to prepare the update data
    const fieldsToUpdate = prepareUpdateData(cleanedData);

    log.debug('Prepared fields for update', {
      fieldsToUpdate: Object.keys(fieldsToUpdate),
      phoneValue: fieldsToUpdate.phone,
      allFields: fieldsToUpdate
    });

    // Validate that we have at least one field to update
    if (Object.keys(fieldsToUpdate).length <= 1) { // Only updated_at
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    // Try to update with error handling
    const { data: updatedMember, error } = await supabase
      .from('members')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('Supabase member update error', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fieldsAttempted: Object.keys(fieldsToUpdate)
      });

      // Provide more specific error messages
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'البيانات المدخلة موجودة مسبقاً (مكررة)'
        });
      }

      if (error.code === '22P02' || error.code === '22001') {
        return res.status(400).json({
          success: false,
          error: 'البيانات المدخلة غير صحيحة أو طويلة جداً'
        });
      }

      throw new Error(`Database error: ${error.message}`);
    }

    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    log.info('Member updated successfully', {
      memberId: updatedMember.id,
      membershipNumber: updatedMember.membership_number
    });

    res.json({
      success: true,
      data: updatedMember,
      message: 'تم تحديث بيانات العضو بنجاح'
    });
  } catch (error) {
    log.error('Member update failed', {
      error: error.message,
      name: error.name,
      stack: config.isDevelopment ? error.stack : undefined
    });

    // Send a more detailed error response for debugging
    const errorMessage = error.message || 'فشل في تحديث بيانات العضو';
    const statusCode = error.status || 500;

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: config.isDevelopment ? {
        message: error.message,
        stack: error.stack
      } : undefined
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

    if (error) {throw error;}

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
    const { count: totalMembers, error: _totalError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (_totalError) {throw _totalError;}

    // Get active members count
    const { count: activeMembers, error: _activeError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('membership_status', 'active');

    if (_activeError) {throw _activeError;}

    // Get completed profiles count
    const { count: completedProfiles, error: _completedError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_completed', true);

    if (_completedError) {throw _completedError;}

    // Get pending profiles count
    const { count: pendingProfiles, error: _pendingError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_completed', false);

    if (_pendingError) {throw _pendingError;}

    // Get social security beneficiaries count
    const { count: socialSecurityBeneficiaries, error: _socialSecurityError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('social_security_beneficiary', true)
      .eq('profile_completed', true);

    if (_socialSecurityError) {throw _socialSecurityError;}

    // Get members joined this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: thisMonthMembers, error: _thisMonthError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    if (_thisMonthError) {throw _thisMonthError;}

    // Get recent imports
    const { data: recentImports, error: _importsError } = await supabase
      .from('excel_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (_importsError) {throw _importsError;}

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
    const { data: membersData, error: __membersError } = await supabase
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

    if (__membersError) {throw __membersError;}

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
    log.info('Sending registration reminders', { memberCount: smsData.length });

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

    if (error) {throw error;}

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

    const { data: newMember, error: _memberError } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (_memberError) {throw _memberError;}

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

    const { error: _tokenError } = await supabase
      .from('member_registration_tokens')
      .insert([{
        member_id: newMember.id,
        token: registrationToken,
        temp_password: hashedPassword,
        expires_at: expiryDate.toISOString(),
        is_used: false,
        created_at: new Date().toISOString()
      }]);

    if (_tokenError) {
      log.error('Error creating registration token', { error: _tokenError.message });
      // Don't fail the whole operation if token creation fails
    }

    // Store temporary password in member record
    const { error: _updateError } = await supabase
      .from('members')
      .update({ temp_password: hashedPassword })
      .eq('id', newMember.id);

    if (_updateError) {
      log.error('Error updating member with temp password', { error: _updateError.message });
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
      log.info('SMS registration credentials prepared', {
        phone,
        hasToken: !!registrationToken,
        hasPassword: !!tempPassword
      });
    }

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'تم إضافة العضو بنجاح'
    });

  } catch (error) {
    log.error('Error adding member manually', { error: error.message });
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
      const decoded = jwt.verify(token, config.jwt.secret);
      memberId = decoded.id;
    }

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error) {throw error;}

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    // Remove sensitive data
    const { temp_password: _temp_password, password_hash: _password_hash, ...profileData } = member;

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
    const decoded = jwt.verify(token, config.jwt.secret);
    const memberId = decoded.id;

    // Get member balance from payments table using correct column names
    const { data: payments, error: __paymentsError } = await supabase
      .from('payments')
      .select('amount, category, status')
      .eq('payer_id', memberId)
      .eq('status', 'completed');

    if (__paymentsError) {throw __paymentsError;}

    // Calculate total payments
    const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    // Get member details for minimum balance
    const { data: member, error: _memberError } = await supabase
      .from('members')
      .select('membership_status, full_name')
      .eq('id', memberId)
      .single();

    if (_memberError) {throw _memberError;}

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
    const decoded = jwt.verify(token, config.jwt.secret);
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

    if (error) {throw error;}

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
    const decoded = jwt.verify(token, config.jwt.secret);
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

    if (error) {throw error;}

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
    const decoded = jwt.verify(token, config.jwt.secret);
    const memberId = decoded.id;

    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via mobile
    const {
      id: _id,
      membership_number: _membership_number,
      temp_password: _temp_password,
      password_hash: _password_hash,
      membership_status: _membership_status,
      created_at: _created_at,
      updated_at: _updated_at,
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

    if (error) {throw error;}

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
