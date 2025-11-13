import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../middleware/superAdminAuth.js';

const router = express.Router();

// Constants
const BCRYPT_SALT_ROUNDS = 10;
const SEARCH_RESULTS_LIMIT = 20;
const MIN_SEARCH_QUERY_LENGTH = 2;
const USER_SELECT_FIELDS = 'id, email, phone, full_name_ar, full_name_en, role, is_active';

/**
 * Rate limiting for password management endpoints
 * Prevents brute force attacks and excessive password reset attempts
 */
const passwordManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each superadmin to 10 password operations per window
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'تم تجاوز الحد المسموح من محاولات إدارة كلمات المرور',
    message_en: 'Too many password management attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Sanitize user input to prevent injection attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove potentially dangerous characters
  return input.trim().replace(/[<>'"]/g, '');
};

/**
 * Password strength validation
 * Must have: min 8 chars, uppercase, lowercase, number, special char
 */
const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      message_en: 'Password must be at least 8 characters long'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل',
      message_en: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل',
      message_en: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل',
      message_en: 'Password must contain at least one number'
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل',
      message_en: 'Password must contain at least one special character'
    };
  }

  return { valid: true };
};

/**
 * Find user by email, phone, or ID using optimized OR query
 */
const findUser = async (identifier) => {
  const normalizedPhone = identifier.replace(/\s|-/g, '');

  // Use OR condition for efficient single query
  const result = await supabase
    .from('users')
    .select(USER_SELECT_FIELDS)
    .or(`email.eq.${identifier},phone.eq.${normalizedPhone},id.eq.${identifier}`)
    .maybeSingle();

  return result;
};

/**
 * POST /api/password-management/reset
 * Reset password for existing user (superadmin only)
 */
router.post('/reset', authenticateToken, requireSuperAdmin, passwordManagementLimiter, async (req, res) => {
  try {
    let { userIdentifier, newPassword } = req.body;

    // Sanitize inputs
    userIdentifier = sanitizeInput(userIdentifier);

    // Validate inputs
    if (!userIdentifier || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'يرجى تقديم معرف المستخدم وكلمة المرور الجديدة',
        message_en: 'User identifier and new password are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: passwordValidation.message,
        message_en: passwordValidation.message_en
      });
    }

    // Find user
    const { data: user, error: findError } = await findUser(userIdentifier);

    if (findError || !user) {
      log.warn('[PasswordReset] User not found:', { userIdentifier });
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      log.error('[PasswordReset] Failed to update password:', {
        userId: user.id,
        error: updateError
      });
      return res.status(500).json({
        success: false,
        error: 'UPDATE_FAILED',
        message: 'فشل تحديث كلمة المرور',
        message_en: 'Failed to update password'
      });
    }

    // Log audit trail
    const { error: auditError } = await supabase.from('audit_logs').insert({
      action: 'PASSWORD_RESET',
      actor_id: req.superAdmin.id,
      actor_email: req.superAdmin.email,
      target_user_id: user.id,
      target_user_email: user.email,
      details: {
        reset_by: 'superadmin',
        timestamp: new Date().toISOString()
      }
    });

    if (auditError) {
      log.error('[PasswordReset] Failed to create audit log:', auditError);
      // Continue - audit failure shouldn't block password reset
    }

    log.info('[PasswordReset] Password reset successful:', {
      adminId: req.superAdmin.id,
      adminEmail: req.superAdmin.email,
      targetUserId: user.id,
      targetUserEmail: user.email
    });

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
      message_en: 'Password reset successfully',
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name_ar || user.full_name_en
      }
    });
  } catch (error) {
    log.error('[PasswordReset] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم',
      message_en: 'Internal server error'
    });
  }
});

/**
 * POST /api/password-management/create
 * Create initial password for user without password (superadmin only)
 */
router.post('/create', authenticateToken, requireSuperAdmin, passwordManagementLimiter, async (req, res) => {
  try {
    let { userIdentifier, newPassword, forceOverwrite } = req.body;

    // Sanitize inputs
    userIdentifier = sanitizeInput(userIdentifier);

    // Validate inputs
    if (!userIdentifier || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'يرجى تقديم معرف المستخدم وكلمة المرور',
        message_en: 'User identifier and password are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: passwordValidation.message,
        message_en: passwordValidation.message_en
      });
    }

    // Find user
    const { data: user, error: findError } = await findUser(userIdentifier);

    if (findError || !user) {
      log.warn('[PasswordCreate] User not found:', { userIdentifier });
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    // Check if user already has password (unless forceOverwrite is true)
    const { data: existingUser } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    if (existingUser?.password_hash && !forceOverwrite) {
      return res.status(409).json({
        success: false,
        error: 'PASSWORD_EXISTS',
        message: 'المستخدم لديه كلمة مرور بالفعل. استخدم وظيفة إعادة التعيين بدلاً من ذلك.',
        message_en: 'User already has a password. Use reset function instead.',
        hint: 'Set forceOverwrite=true to overwrite existing password'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and activate account
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      log.error('[PasswordCreate] Failed to create password:', {
        userId: user.id,
        error: updateError
      });
      return res.status(500).json({
        success: false,
        error: 'UPDATE_FAILED',
        message: 'فشل إنشاء كلمة المرور',
        message_en: 'Failed to create password'
      });
    }

    // Log audit trail
    const { error: auditError } = await supabase.from('audit_logs').insert({
      action: 'PASSWORD_CREATED',
      actor_id: req.superAdmin.id,
      actor_email: req.superAdmin.email,
      target_user_id: user.id,
      target_user_email: user.email,
      details: {
        created_by: 'superadmin',
        account_activated: true,
        timestamp: new Date().toISOString()
      }
    });

    if (auditError) {
      log.error('[PasswordCreate] Failed to create audit log:', auditError);
      // Continue - audit failure shouldn't block password creation
    }

    log.info('[PasswordCreate] Password created successfully:', {
      adminId: req.superAdmin.id,
      adminEmail: req.superAdmin.email,
      targetUserId: user.id,
      targetUserEmail: user.email
    });

    res.json({
      success: true,
      message: 'تم إنشاء كلمة المرور وتفعيل الحساب بنجاح',
      message_en: 'Password created and account activated successfully',
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name_ar || user.full_name_en,
        accountActivated: true
      }
    });
  } catch (error) {
    log.error('[PasswordCreate] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم',
      message_en: 'Internal server error'
    });
  }
});

/**
 * GET /api/password-management/search-users
 * Search users for password management (superadmin only)
 */
router.get('/search-users', authenticateToken, requireSuperAdmin, passwordManagementLimiter, async (req, res) => {
  try {
    let { query } = req.query;

    // Sanitize search query
    query = sanitizeInput(query);

    if (!query || query.length < MIN_SEARCH_QUERY_LENGTH) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_QUERY',
        message: 'يرجى إدخال حرفين على الأقل للبحث',
        message_en: 'Please enter at least 2 characters to search'
      });
    }

    // Search in both users and members tables using parameterized queries
    const searchPattern = `%${query}%`;

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, phone, full_name_ar, full_name_en, role, is_active, password_hash')
      .or(`email.ilike.${searchPattern},phone.ilike.${searchPattern},full_name_ar.ilike.${searchPattern},full_name_en.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .limit(SEARCH_RESULTS_LIMIT);

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, email, phone, full_name, user_id, status')
      .or(`email.ilike.${searchPattern},phone.ilike.${searchPattern},full_name.ilike.${searchPattern}`)
      .is('user_id', null) // Only members without auth accounts
      .order('created_at', { ascending: false })
      .limit(SEARCH_RESULTS_LIMIT);

    if (usersError) {
      log.error('[UserSearch] Users search failed:', usersError);
      return res.status(500).json({
        success: false,
        error: 'SEARCH_FAILED',
        message: 'فشل البحث عن المستخدمين',
        message_en: 'Failed to search users'
      });
    }

    if (membersError) {
      log.error('[UserSearch] Members search failed:', membersError);
      // Continue with users results even if members search fails
    }

    // Map users results
    const userResults = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name_ar || user.full_name_en,
      role: user.role,
      isActive: user.is_active,
      hasPassword: !!user.password_hash,
      source: 'user' // Indicates this is an existing auth user
    }));

    // Map members results (members without auth accounts)
    const memberResults = (members || []).map(member => ({
      id: member.id,
      email: member.email,
      phone: member.phone,
      fullName: member.full_name,
      role: 'member',
      isActive: member.status === 'active',
      hasPassword: false, // Members without user_id have no password
      source: 'member' // Indicates this is a member needing auth account
    }));

    // Combine results (users first, then members)
    const results = [...userResults, ...memberResults];

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    log.error('[UserSearch] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم',
      message_en: 'Internal server error'
    });
  }
});

export default router;
