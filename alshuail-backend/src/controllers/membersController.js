import { query } from '../services/database.js';
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

    // Build dynamic WHERE clauses
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (profileCompleted !== undefined) {
      conditions.push(`profile_completed = $${paramIndex++}`);
      params.push(profileCompleted);
    }

    if (membershipStatus !== undefined) {
      conditions.push(`membership_status = $${paramIndex++}`);
      params.push(membershipStatus);
    }

    // Sanitize search term to prevent SQL injection
    if (search) {
      const sanitizedSearch = sanitizeSearchTerm(search);
      if (sanitizedSearch) {
        const searchPattern = `%${sanitizedSearch}%`;
        conditions.push(`(full_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex + 1} OR membership_number ILIKE $${paramIndex + 2} OR email ILIKE $${paramIndex + 3})`);
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        paramIndex += 4;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Apply pagination with sanitized values
    const offset = (pageNum - 1) * pageLimit;

    // Use COUNT(*) OVER() window function for total count with pagination
    const sql = `SELECT *, COUNT(*) OVER() AS total_count FROM members ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(pageLimit, offset);

    const { rows } = await query(sql, params);

    const count = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    // Remove the total_count column from each row before transforming
    const members = rows.map(({ total_count, ...member }) => member);

    // Transform all members to match frontend expected format
    const transformedMembers = members.map(transformMemberForFrontend);

    res.json({
      success: true,
      data: transformedMembers,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: count,
        pages: Math.ceil(count / pageLimit)
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

    const { rows } = await query('SELECT * FROM members WHERE id = $1', [id]);
    const member = rows[0];

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

    const { rows } = await query(
      `INSERT INTO members (full_name, phone, email, national_id, tribal_section, city, district, address, occupation, employer, password, membership_number, membership_status, profile_completed, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        memberToCreate.full_name, memberToCreate.phone, memberToCreate.email,
        memberToCreate.national_id, memberToCreate.tribal_section, memberToCreate.city,
        memberToCreate.district, memberToCreate.address, memberToCreate.occupation,
        memberToCreate.employer, memberToCreate.password, memberToCreate.membership_number,
        memberToCreate.membership_status, memberToCreate.profile_completed, memberToCreate.created_at
      ]
    );

    const newMember = rows[0];

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

    // Build dynamic UPDATE query
    const keys = Object.keys(fieldsToUpdate);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    const values = keys.map(key => fieldsToUpdate[key]);
    values.push(id);

    const { rows } = await query(
      `UPDATE members SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
      values
    );

    const updatedMember = rows[0];

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

    // Provide more specific error messages for PostgreSQL error codes
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

    await query('DELETE FROM members WHERE id = $1', [id]);

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
    // Get all counts in a single query for efficiency
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { rows: statsRows } = await query(`
      SELECT
        COUNT(*) AS total_members,
        COUNT(*) FILTER (WHERE membership_status = 'active') AS active_members,
        COUNT(*) FILTER (WHERE profile_completed = true) AS completed_profiles,
        COUNT(*) FILTER (WHERE profile_completed = false) AS pending_profiles,
        COUNT(*) FILTER (WHERE social_security_beneficiary = true AND profile_completed = true) AS social_security_beneficiaries,
        COUNT(*) FILTER (WHERE created_at >= $1) AS this_month_members
      FROM members
    `, [startOfMonth.toISOString()]);

    const stats = statsRows[0];

    // Get recent imports
    const { rows: recentImports } = await query(
      'SELECT * FROM excel_import_batches ORDER BY created_at DESC LIMIT 5'
    );

    const totalMembers = parseInt(stats.total_members) || 0;
    const completedProfiles = parseInt(stats.completed_profiles) || 0;

    res.json({
      success: true,
      data: {
        total_members: totalMembers,
        active_members: parseInt(stats.active_members) || 0,
        completed_profiles: completedProfiles,
        pending_profiles: parseInt(stats.pending_profiles) || 0,
        social_security_beneficiaries: parseInt(stats.social_security_beneficiaries) || 0,
        this_month_members: parseInt(stats.this_month_members) || 0,
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
    const { rows: membersData } = await query(`
      SELECT
        m.id, m.full_name, m.phone, m.membership_number,
        mrt.token, mrt.temp_password, mrt.expires_at, mrt.is_used
      FROM members m
      INNER JOIN member_registration_tokens mrt ON mrt.member_id = m.id
      WHERE m.id = ANY($1)
        AND m.profile_completed = false
        AND mrt.is_used = false
      ORDER BY mrt.created_at DESC
    `, [memberIds]);

    if (!membersData || membersData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على أعضاء بملفات شخصية غير مكتملة'
      });
    }

    // Group by member to get the latest token per member (first row per member due to ORDER BY DESC)
    const memberMap = new Map();
    for (const row of membersData) {
      if (!memberMap.has(row.id)) {
        memberMap.set(row.id, row);
      }
    }

    // Prepare SMS data for each member
    const smsData = Array.from(memberMap.values()).map(member => ({
      member_id: member.id,
      name: member.full_name,
      phone: member.phone,
      membership_number: member.membership_number,
      registration_token: member.token,
      temp_password: member.temp_password,
      expires_at: member.expires_at
    }));

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
    const { rows } = await query(`
      SELECT m.*, COUNT(*) OVER() AS total_count,
        COALESCE(
          json_agg(
            json_build_object(
              'token', mrt.token,
              'expires_at', mrt.expires_at,
              'is_used', mrt.is_used,
              'created_at', mrt.created_at
            )
          ) FILTER (WHERE mrt.id IS NOT NULL),
          '[]'::json
        ) AS member_registration_tokens
      FROM members m
      LEFT JOIN member_registration_tokens mrt ON mrt.member_id = m.id
      WHERE m.profile_completed = false
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const count = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    // Remove total_count from each row
    const members = rows.map(({ total_count, ...member }) => member);

    res.json({
      success: true,
      data: members || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
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
    const { rows: existingRows } = await query(
      'SELECT id FROM members WHERE phone = $1',
      [phone]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    // Create member record
    const { rows: insertRows } = await query(
      `INSERT INTO members (full_name, membership_number, phone, whatsapp_number, email, employer, social_security_beneficiary, status, membership_status, profile_completed, additional_info, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        full_name, finalMembershipNumber, phone,
        whatsapp_number || phone, email || null, employer || null,
        social_security_beneficiary || false, 'pending_verification', 'active',
        false, additional_info || null, new Date().toISOString()
      ]
    );

    const newMember = insertRows[0];

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

    try {
      await query(
        `INSERT INTO member_registration_tokens (member_id, token, temp_password, expires_at, is_used, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newMember.id, registrationToken, hashedPassword, expiryDate.toISOString(), false, new Date().toISOString()]
      );
    } catch (tokenErr) {
      log.error('Error creating registration token', { error: tokenErr.message });
      // Don't fail the whole operation if token creation fails
    }

    // Store temporary password in member record
    try {
      await query(
        'UPDATE members SET temp_password = $1 WHERE id = $2',
        [hashedPassword, newMember.id]
      );
    } catch (updateErr) {
      log.error('Error updating member with temp password', { error: updateErr.message });
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

    const { rows } = await query('SELECT * FROM members WHERE id = $1', [memberId]);
    const member = rows[0];

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
    const { rows: payments } = await query(
      "SELECT amount, category, status FROM payments WHERE payer_id = $1 AND status = 'completed'",
      [memberId]
    );

    // Calculate total payments
    const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    // Get member details for minimum balance
    const { rows: memberRows } = await query(
      'SELECT membership_status, full_name FROM members WHERE id = $1',
      [memberId]
    );
    const member = memberRows[0];

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

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
    const { rows } = await query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM payments
       WHERE payer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [memberId, parseInt(limit), parseInt(offset)]
    );

    const count = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const transactions = rows.map(({ total_count, ...row }) => row);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
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

    // Build dynamic WHERE clause
    const conditions = ['user_id = $1'];
    const params = [memberId];
    let paramIndex = 2;

    if (unread_only === 'true') {
      conditions.push(`is_read = $${paramIndex++}`);
      params.push(false);
    }

    const whereClause = conditions.join(' AND ');
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const count = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const notifications = rows.map(({ total_count, ...row }) => row);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
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

    // Build dynamic UPDATE query
    const keys = Object.keys(allowedUpdates);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    const values = keys.map(key => allowedUpdates[key]);
    values.push(memberId);

    const { rows } = await query(
      `UPDATE members SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
      values
    );

    const updatedMember = rows[0];

    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

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

/**
 * Search members for pay-on-behalf feature
 * GET /api/members/search?q={query}&limit=10
 * Returns minimal member data for selection in payment flow
 */
export const searchMembers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    // Validate search query
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن يحتوي البحث على حرفين على الأقل'
      });
    }

    const searchTerm = sanitizeSearchTerm(q.trim());
    const searchLimit = Math.min(sanitizeNumber(limit, 10), 20); // Max 20 results
    const searchPattern = `%${searchTerm}%`;

    // Search by membership_number, full_name, or phone
    // Using ILIKE for case-insensitive partial matching
    const { rows: members } = await query(
      `SELECT id, membership_number, full_name, phone, current_balance, balance, total_paid, membership_status
       FROM members
       WHERE (membership_number ILIKE $1 OR full_name ILIKE $1 OR phone ILIKE $1)
         AND membership_status = 'active'
       LIMIT $2`,
      [searchPattern, searchLimit]
    );

    // Transform results to expected format
    const transformedMembers = (members || []).map(member => {
      const balance = parseFloat(member.current_balance) || parseFloat(member.balance) || parseFloat(member.total_paid) || 0;
      const expectedByNow = calculateExpectedPayment();

      return {
        id: member.id,
        membership_number: member.membership_number,
        full_name_ar: member.full_name,
        phone: member.phone,
        balance: balance,
        is_below_minimum: balance < expectedByNow
      };
    });

    res.json({
      success: true,
      data: transformedMembers
    });
  } catch (error) {
    log.error('Member search error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في البحث عن الأعضاء'
    });
  }
};
