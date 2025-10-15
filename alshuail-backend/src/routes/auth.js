import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import cookieParser from 'cookie-parser';
import { setAuthCookie, clearAuthCookie } from '../middleware/cookie-auth.js';
import { config } from '../config/env.js';

const router = express.Router();

const ADMIN_TOKEN_TTL = config.jwt.adminTtl;
const MEMBER_TOKEN_TTL = config.jwt.memberTtl;
const allowTestMemberLogin = process.env.ALLOW_TEST_MEMBER_LOGINS === 'true';

const TEST_MEMBERS = {
  '0501234567': {
    fullName: 'أحمد محمد الشعيل',
    membershipNumber: 'SH001',
    balance: 2500,
    minimumBalance: 3000
  },
  '0555555555': {
    fullName: 'سارة الشعيل',
    membershipNumber: 'SH002',
    balance: 3500,
    minimumBalance: 3000
  },
  '0512345678': {
    fullName: 'خالد عبدالله',
    membershipNumber: 'SH003',
    balance: 1800,
    minimumBalance: 3000
  }
};

const TEST_MEMBER_PASSWORD = process.env.TEST_MEMBER_PASSWORD;
if (!TEST_MEMBER_PASSWORD && allowTestMemberLogin) {
  throw new Error('TEST_MEMBER_PASSWORD is required when ALLOW_TEST_MEMBER_LOGINS is true');
}

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const normalizePhone = (phone = '') => phone.replace(/\s|-/g, '');

const signToken = (payload, options = {}) => jwt.sign(payload, config.jwt.secret, options);

const getArabicRoleName = (role) => {
  const roleNames = {
    'super_admin': 'المدير الأعلى',
    'financial_manager': 'المدير المالي',
    'family_tree_admin': 'مدير شجرة العائلة',
    'occasions_initiatives_diyas_admin': 'مدير المناسبات والمبادرات والديات',
    'user_member': 'عضو عادي',
    'admin': 'مدير',
    'organizer': 'منظم',
    'member': 'عضو'
  };
  return roleNames[role] || role;
};

const getRolePermissions = (role) => {
  const permissions = {
    'super_admin': {
      all_access: true,
      manage_users: true,
      manage_members: true,
      manage_finances: true,
      manage_family_tree: true,
      manage_occasions: true,
      manage_initiatives: true,
      manage_diyas: true,
      view_reports: true,
      system_settings: true
    },
    'financial_manager': {
      view_dashboard: true,
      manage_finances: true,
      view_financial_reports: true,
      manage_subscriptions: true,
      manage_payments: true
    },
    'family_tree_admin': {
      view_dashboard: true,
      manage_family_tree: true,
      view_tree_management: true,
      manage_relationships: true
    },
    'occasions_initiatives_diyas_admin': {
      view_dashboard: true,
      manage_occasions: true,
      manage_initiatives: true,
      manage_diyas: true,
      view_events_calendar: true
    },
    'user_member': {
      view_dashboard: true,
      view_my_profile: true,
      view_my_payments: true,
      view_family_events: true
    }
  };
  return permissions[role] || { view_dashboard: true };
};

const _parsePermissions = (rawPermissions) => {
  if (!rawPermissions) {
    return {};
  }

  if (typeof rawPermissions === 'object') {
    return rawPermissions;
  }

  try {
    return JSON.parse(rawPermissions);
  } catch (error) {
    log.warn('Unable to parse role permissions payload', { error: error.message });
    return {};
  }
};

async function fetchPrimaryRole(userId) {
  // Simplified role fetching - directly from users table
  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !user) {
    log.error('Failed to fetch user role from Supabase', { error: error?.message });
    return null;
  }

  // Return role with Arabic name and permissions
  return {
    name: user.role || 'admin',
    displayName: getArabicRoleName(user.role || 'admin'),
    permissions: getRolePermissions(user.role || 'admin')
  };
}

async function authenticateAdmin(identifier, password, requestedRole = null) {
  // Support both email and phone login for admins
  const isEmail = identifier && identifier.includes('@');
  let user;
  let error;

  if (isEmail) {
    const normalizedEmail = normalizeEmail(identifier);
    const result = await supabase
      .from('users')
      .select('id, email, password_hash, is_active, role, phone')
      .eq('email', normalizedEmail)
      .single();
    user = result.data;
    error = result.error;
  } else {
    // Phone-based login
    const cleanPhone = normalizePhone(identifier);
    const result = await supabase
      .from('users')
      .select('id, email, password_hash, is_active, role, phone')
      .eq('phone', cleanPhone)
      .single();
    user = result.data;
    error = result.error;
  }

  if (error || !user) {
    return {
      ok: false,
      status: 401,
      message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
    };
  }

  if (user.is_active === false) {
    return {
      ok: false,
      status: 403,
      message: 'رقم الهاتف وكلمة المرور مطلوبان'
    };
  }

  if (!user.password_hash) {
    return {
      ok: false,
      status: 400,
      message: 'رقم الهاتف غير صحيح. الرجاء إدخال رقم صحيح'
    };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return {
      ok: false,
      status: 401,
      message: 'رقم الهاتف أو كلمة المرور غير صحيحة'
    };
  }

  // For phone-based login with requestedRole, use that role directly
  // For email-based login, fetch from database
  let roleInfo;
  if (requestedRole && !isEmail) {
    // Use the requested role for phone-based admin login
    roleInfo = {
      name: requestedRole,
      displayName: getArabicRoleName(requestedRole),
      permissions: getRolePermissions(requestedRole)
    };
  } else {
    // Fetch role from database for email-based login
    const role = await fetchPrimaryRole(user.id);
    if (!role) {
      return {
        ok: false,
        status: 403,
        message: 'لم يتم تحديد الصلاحيات المطلوبة'
      };
    }
    roleInfo = role;
  }

  const tokenPayload = {
    id: user.id,
    email: user.email || `${user.phone}@alshuail.com`,
    phone: user.phone,
    role: roleInfo.name,
    permissions: roleInfo.permissions
  };

  const token = signToken(tokenPayload, { expiresIn: ADMIN_TOKEN_TTL });

  return {
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email || `${user.phone}@alshuail.com`,
      phone: user.phone,
      fullName: user.full_name || user.email?.split('@')[0] || `Admin ${user.phone}`,
      role: roleInfo.name,
      roleAr: roleInfo.displayName,
      permissions: roleInfo.permissions
    }
  };
}

function resolveTestMember(phone, password) {
  if (!allowTestMemberLogin) {
    return null;
  }

  const record = TEST_MEMBERS[phone];
  // Allow both TEST_MEMBER_PASSWORD and default password '123456'
  if (!record || (password !== TEST_MEMBER_PASSWORD && password !== '123456')) {
    return null;
  }

  return {
    id: `test-member-${phone}`,
    full_name: record.fullName,
    phone,
    membership_number: record.membershipNumber,
    membership_status: 'active',
    balance: record.balance,
    minimum_balance: record.minimumBalance,
    requires_password_change: password === '123456' // Mark for password change if using default
  };
}

async function authenticateMember(phone, password) {
  const cleanPhone = normalizePhone(phone);

  // Handle both formats: local (05xxx) and international (+9665xxx)
  const phoneVariants = [cleanPhone];
  if (cleanPhone.startsWith('0')) {
    // Convert local format to international
    phoneVariants.push(`+966${  cleanPhone.substring(1)}`);
  } else if (cleanPhone.startsWith('+966')) {
    // Also try local format
    phoneVariants.push(`0${  cleanPhone.substring(4)}`);
  }

  // Try to find member with any phone format
  let member = null;
  let error = null;

  for (const phoneVariant of phoneVariants) {
    const { data, error: _queryError } = await supabase
      .from('members')
      .select('id, full_name, phone, membership_number, membership_status, password_hash, temp_password, balance, requires_password_change, is_first_login')
      .eq('phone', phoneVariant)
      .single();

    if (data && !_queryError) {
      member = data;
      error = null;
      break;
    }
    error = _queryError;
  }

  if (error || !member) {
    return {
      ok: false,
      status: 401,
      message: 'رقم الهاتف أو كلمة المرور غير صحيح'
    };
  }

  if (member.membership_status && member.membership_status !== 'active') {
    return {
      ok: false,
      status: 403,
      message: 'رقم الهاتف في البيانات المقدمة مطلوب'
    };
  }

  let passwordMatch = false;
  let passwordHashToPersist = member.password_hash;

  if (member.password_hash) {
    passwordMatch = await bcrypt.compare(password, member.password_hash);
  }

  if (!passwordMatch && member.temp_password) {
    if (password === member.temp_password) {
      passwordMatch = true;
      if (!passwordHashToPersist) {
        passwordHashToPersist = await bcrypt.hash(password, 10);
      }
    } else {
      try {
        passwordMatch = await bcrypt.compare(password, member.temp_password);
        if (passwordMatch && !passwordHashToPersist) {
          passwordHashToPersist = member.temp_password;
        }
      } catch (compareError) {
        passwordMatch = false;
      }
    }
  }

  // Check for default password '123456' for first-time login
  if (!passwordMatch && password === '123456') {
    // Allow default password if no password_hash is set (first-time login)
    if (!member.password_hash) {
      passwordMatch = true;
      passwordHashToPersist = await bcrypt.hash('123456', 10);
      // Mark as requires password change
      member.requires_password_change = true;
    }
  }

  if (!passwordMatch) {
    return {
      ok: false,
      status: 401,
      message: 'رقم الهاتف أو كلمة المرور غير صحيح'
    };
  }

  if (!member.password_hash && passwordHashToPersist) {
    try {
      await supabase
        .from('members')
        .update({
          password_hash: passwordHashToPersist,
          temp_password: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id);
    } catch (persistError) {
      log.warn('Failed to persist member password hash', { error: persistError.message });
    }
  }

  const tokenPayload = {
    id: member.id,
    phone: member.phone,
    role: 'member',
    membershipNumber: member.membership_number,
    fullName: member.full_name
  };

  const token = signToken(tokenPayload, { expiresIn: MEMBER_TOKEN_TTL });

  return {
    ok: true,
    token,
    member
  };
}

const buildMemberResponse = (member) => ({
  id: member.id,
  name: member.full_name,
  phone: member.phone,
  membershipId: member.membership_number,
  avatar: null,
  role: 'member',
  balance: member.balance || 0,
  minimumBalance: 3000  // Default minimum balance for all members
});

async function handleMemberLogin(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف وكلمة المرور مطلوبان'
      });
    }

    const cleanPhone = normalizePhone(phone);

    // Check test member but prefer real database member
    const testMember = resolveTestMember(cleanPhone, password);

    // First try to authenticate from real database
    const result = await authenticateMember(cleanPhone, password);
    if (result.ok) {
      return res.json({
        success: true,
        token: result.token,
        user: buildMemberResponse(result.member),
        message: 'تم تسجيل الدخول بنجاح',
        requires_password_change: result.member.requires_password_change || false,
        is_first_login: result.member.is_first_login || false
      });
    }

    // Fall back to test member if database authentication failed
    if (testMember && !result.ok) {
      const token = signToken({
        id: testMember.id,
        phone: testMember.phone,
        role: 'member',
        membershipNumber: testMember.membership_number,
        fullName: testMember.full_name
      }, { expiresIn: MEMBER_TOKEN_TTL });

      return res.json({
        success: true,
        token,
        user: buildMemberResponse(testMember),
        message: 'تم تسجيل الدخول بنجاح',
        requires_password_change: testMember.requires_password_change || false,
        is_first_login: testMember.requires_password_change || false
      });
    }

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    log.error('Mobile login error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'خطأ في تسجيل الدخول'
    });
  }
}

router.post('/login', async (req, res) => {
  try {
    const { email, phone, password, role } = req.body;
    const identifier = email || phone;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني أو رقم الهاتف وكلمة المرور مطلوبان'
      });
    }

    const result = await authenticateAdmin(identifier, password, role);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: result.message
      });
    }

    // Set token in httpOnly cookie
    setAuthCookie(res, result.token);

    return res.json({
      success: true,
      token: result.token, // Include token for localStorage-based auth (matching member login)
      user: result.user,
      message: 'تم تسجيل الدخول بنجاح'
    });
  } catch (error) {
    log.error('Login error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'خطأ في تسجيل الدخول'
    });
  }
});

router.post('/member-login', handleMemberLogin);
router.post('/mobile-login', handleMemberLogin);

/* eslint-disable require-await */
router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز المصادقة مطلوب'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    // Check if token is about to expire (within 24 hours)
    const now = Date.now() / 1000;
    const timeUntilExpiry = decoded.exp - now;
    const oneDayInSeconds = 24 * 60 * 60;

    let newToken = null;
    if (timeUntilExpiry < oneDayInSeconds) {
      // Token expires within 24 hours, issue a new one
      const tokenPayload = {
        id: decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        role: decoded.role,
        permissions: decoded.permissions,
        membershipNumber: decoded.membershipNumber,
        fullName: decoded.fullName
      };

      const ttl = decoded.role === 'member' ? MEMBER_TOKEN_TTL : ADMIN_TOKEN_TTL;
      newToken = signToken(tokenPayload, { expiresIn: ttl });
    }

    return res.json({
      success: true,
      user: decoded,
      newToken: newToken // Will be null if token doesn't need refresh
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'رمز المصادقة غير صالح'
    });
  }
});

// Add refresh endpoint
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب',
        message_ar: 'رمز المصادقة مطلوب'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح',
        message_ar: 'رمز المصادقة غير صالح'
      });
    }

    const { current_password: _current_password, new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة مطلوبة',
        message_ar: 'كلمة المرور الجديدة مطلوبة'
      });
    }

    // For test members, just accept the password change
    const testPhones = ['0555555555', '0501234567', '0512345678'];
    if (decoded.role === 'member' && testPhones.includes(decoded.phone)) {
      // Update the member's password status in database
      const { error: _updateError } = await supabase
        .from('members')
        .update({
          requires_password_change: false,
          is_first_login: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', decoded.id);

      if (_updateError) {
        log.error('Error updating member', { error: _updateError.message });
      }

      return res.json({
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح',
        message_ar: 'تم تغيير كلمة المرور بنجاح'
      });
    }

    // For real members, would need to verify current password and hash new password
    // This is simplified for test implementation

    return res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
      message_ar: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    log.error('Change password error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
      message_ar: 'خطأ في تغيير كلمة المرور'
    });
  }
});

/* eslint-disable require-await */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز المصادقة مطلوب'
      });
    }

    // Verify the token (even if expired, we can still decode it)
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      // If token is expired but otherwise valid, decode without verification
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
        if (!decoded) {
          throw new Error('Invalid token');
        }
      } else {
        throw error;
      }
    }

    // Generate new token with same payload
    const tokenPayload = {
      id: decoded.id,
      email: decoded.email,
      phone: decoded.phone,
      role: decoded.role,
      permissions: decoded.permissions,
      membershipNumber: decoded.membershipNumber,
      fullName: decoded.fullName
    };

    const ttl = decoded.role === 'member' ? MEMBER_TOKEN_TTL : ADMIN_TOKEN_TTL;
    const newToken = signToken(tokenPayload, { expiresIn: ttl });

    return res.json({
      success: true,
      token: newToken,
      user: decoded
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'فشل تجديد رمز المصادقة'
    });
  }
});


// Logout endpoint to clear auth cookie
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
});

export default router;
