import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'alshuail-dev-secret-2024-very-long-and-secure';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in environment. Using fallback for development.');
}

const ADMIN_TOKEN_TTL = process.env.ADMIN_JWT_TTL || '12h';
const MEMBER_TOKEN_TTL = process.env.MEMBER_JWT_TTL || '30d';
const allowTestMemberLogin = process.env.ALLOW_TEST_MEMBER_LOGINS === 'true';

const TEST_MEMBERS = {
  '0501234567': {
    fullName: '???? ???? ??????',
    membershipNumber: 'SH001',
    balance: 2500,
    minimumBalance: 3000
  },
  '0555555555': {
    fullName: '??? ??????',
    membershipNumber: 'SH002',
    balance: 3500,
    minimumBalance: 3000
  },
  '0512345678': {
    fullName: '???? ????????',
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

const signToken = (payload, options = {}) => jwt.sign(payload, JWT_SECRET, options);

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

const parsePermissions = (rawPermissions) => {
  if (!rawPermissions) {
    return {};
  }

  if (typeof rawPermissions === 'object') {
    return rawPermissions;
  }

  try {
    return JSON.parse(rawPermissions);
  } catch (error) {
    console.warn('Unable to parse role permissions payload', error);
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
    console.error('Failed to fetch user role from Supabase', error);
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
      message: 'رقم الهاتف او كلمة المرور غير صحيحة'
    };
  }

  if (user.is_active === false) {
    return {
      ok: false,
      status: 403,
      message: '??? ??????? ????? ?????? ???????'
    };
  }

  if (!user.password_hash) {
    return {
      ok: false,
      status: 400,
      message: '??? ??????? ??? ?????? ??????? ????? ???????'
    };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return {
      ok: false,
      status: 401,
      message: '??? ?????? ?? ???? ?????? ??? ?????'
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
  if (!record || password !== TEST_MEMBER_PASSWORD) {
    return null;
  }

  return {
    id: `test-member-${phone}`,
    full_name: record.fullName,
    phone,
    membership_number: record.membershipNumber,
    membership_status: 'active',
    balance: record.balance,
    minimum_balance: record.minimumBalance
  };
}

async function authenticateMember(phone, password) {
  const cleanPhone = normalizePhone(phone);

  const { data: member, error } = await supabase
    .from('members')
    .select('id, full_name, phone, membership_number, membership_status, password_hash, temp_password, balance, minimum_balance')
    .eq('phone', cleanPhone)
    .single();

  if (error || !member) {
    return {
      ok: false,
      status: 401,
      message: '??? ?????? ?? ???? ?????? ??? ????'
    };
  }

  if (member.membership_status && member.membership_status !== 'active') {
    return {
      ok: false,
      status: 403,
      message: '??? ??????? ?? ???????? ?????? ???????'
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

  if (!passwordMatch) {
    return {
      ok: false,
      status: 401,
      message: '??? ?????? ?? ???? ?????? ??? ????'
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
      console.warn('Failed to persist member password hash', persistError);
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
  minimumBalance: member.minimum_balance || 3000
});

async function handleMemberLogin(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: '??? ?????? ????? ?????? ???????'
      });
    }

    const cleanPhone = normalizePhone(phone);

    const testMember = resolveTestMember(cleanPhone, password);
    if (testMember) {
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
        message: '?? ????? ?????? ?????'
      });
    }

    const result = await authenticateMember(cleanPhone, password);
    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: result.message
      });
    }

    return res.json({
      success: true,
      token: result.token,
      user: buildMemberResponse(result.member),
      message: '?? ????? ?????? ?????'
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return res.status(500).json({
      success: false,
      error: '??? ?? ????? ??????'
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

    return res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: '??? ?? ????? ??????'
    });
  }
});

router.post('/member-login', handleMemberLogin);
router.post('/mobile-login', handleMemberLogin);

router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '??? ??????? ?????'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    return res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '??? ??????? ??? ????'
    });
  }
});

export default router;
