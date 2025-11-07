import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const systemSettingsSchema = Joi.object({
  system_name: Joi.string().min(3).max(200).optional(),
  system_version: Joi.string().max(20).optional(),
  default_language: Joi.string().valid('ar', 'en').optional(),
  hijri_calendar_primary: Joi.boolean().optional(),
  session_timeout: Joi.number().integer().min(5).max(10080).optional(), // 5 min to 7 days
  max_login_attempts: Joi.number().integer().min(1).max(10).optional(),
  max_upload_size_mb: Joi.number().integer().min(1).max(100).optional(),
  enable_notifications: Joi.boolean().optional(),
  maintenance_mode: Joi.boolean().optional(),
  debug_mode: Joi.boolean().optional(),
  api_url: Joi.string().uri().optional().allow('', null),
  password_requirements: Joi.object({
    min_length: Joi.number().integer().min(6).max(32).optional(),
    require_uppercase: Joi.boolean().optional(),
    require_numbers: Joi.boolean().optional(),
    require_special_chars: Joi.boolean().optional()
  }).optional(),
  backup_settings: Joi.object({
    auto_backup: Joi.boolean().optional(),
    backup_frequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').optional(),
    retention_days: Joi.number().integer().min(1).max(365).optional()
  }).optional(),
  security_settings: Joi.object({
    two_factor_required: Joi.boolean().optional(),
    ip_whitelisting: Joi.boolean().optional(),
    audit_logging: Joi.boolean().optional()
  }).optional()
});

const userPreferencesSchema = Joi.object({
  dashboard_widgets: Joi.array().items(Joi.string()).optional(),
  notifications: Joi.array().items(Joi.string()).optional(),
  theme: Joi.string().valid('light', 'dark', 'auto').optional(),
  language: Joi.string().valid('ar', 'en').optional(),
  custom_settings: Joi.object().optional()
});

const createUserSchema = Joi.object({
  full_name: Joi.string().required().min(3).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().required().pattern(/^05\d{8}$/),
  role: Joi.string().valid('super_admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin', 'user_member').required(),
  temporary_password: Joi.string().required().min(8)
});

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'رمز الوصول مطلوب'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', decoded.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو غير نشط'
      });
    }

    // Check if member is suspended
    if (user.suspended_at && !user.reactivated_at) {
      return res.status(403).json({
        success: false,
        message: 'الحساب موقوف مؤقتاً',
        suspension_reason: user.suspension_reason,
        suspended_at: user.suspended_at
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'رمز وصول غير صحيح'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية رمز الوصول'
      });
    }
    log.error('Authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الهوية'
    });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
        required_role: allowedRoles,
        user_role: req.user?.role
      });
    }
    next();
  };
};

// =====================================================
// AUDIT LOGGING HELPER
// =====================================================

const logActivity = async (userId, userEmail, userRole, actionType, details, ipAddress) => {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_role: userRole,
        action_type: actionType,
        details: details,
        ip_address: ipAddress,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    log.error('Failed to log activity', { error: error.message });
  }
};

// =====================================================
// SYSTEM SETTINGS ENDPOINTS
// =====================================================

// Get system settings - Super Admin only
router.get('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings found, return defaults
      log.warn('No system settings found in database, returning defaults');
      return res.json({
        system_name: 'نظام إدارة عائلة الشعيل',
        system_version: '2.0.1',
        default_language: 'ar',
        hijri_calendar_primary: true,
        session_timeout: 1440,
        max_login_attempts: 5,
        max_upload_size_mb: 10,
        enable_notifications: true,
        maintenance_mode: false,
        debug_mode: false,
        password_requirements: {
          min_length: 8,
          require_uppercase: true,
          require_numbers: true,
          require_special_chars: true
        },
        backup_settings: {
          auto_backup: true,
          backup_frequency: 'daily',
          retention_days: 30
        },
        security_settings: {
          two_factor_required: false,
          ip_whitelisting: false,
          audit_logging: true
        }
      });
    }

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    log.error('Failed to fetch system settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system settings',
      message: error.message
    });
  }
});

// Update system settings - Super Admin only with validation
router.put('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    // Validate input
    const { error: validationError, value } = systemSettingsSchema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    // Check if settings exist
    const { data: existing, error: fetchError } = await supabase
      .from('system_settings')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          ...value,
          updated_at: new Date().toISOString(),
          updated_by: req.user.id
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('system_settings')
        .insert({
          ...value,
          updated_by: req.user.id
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Log the settings change
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'settings_update',
      `System settings updated: ${Object.keys(value).join(', ')}`,
      req.ip
    );

    res.json({
      success: true,
      message: 'تم تحديث إعدادات النظام بنجاح',
      data: result
    });
  } catch (error) {
    log.error('Failed to update system settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update system settings',
      message: error.message
    });
  }
});

// =====================================================
// USER MANAGEMENT ENDPOINTS
// =====================================================

// Get all users - Super Admin only
router.get('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;

    let query = supabase
      .from('members')
      .select('id, full_name, email, phone, role, is_active, created_at, last_login, suspended_at, suspension_reason', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_active', true).is('suspended_at', null);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    } else if (status === 'suspended') {
      query = query.not('suspended_at', 'is', null);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: users, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: users || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    log.error('Failed to fetch users', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// Create new user - Super Admin only with validation
router.post('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    // Validate input
    const { error: validationError, value } = createUserSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const { full_name, email, phone, role, temporary_password } = value;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporary_password, 10);

    // Create new user
    const { data: newUser, error } = await supabase
      .from('members')
      .insert({
        full_name,
        email,
        phone,
        role: role || 'user_member',
        password_hash: hashedPassword,
        is_active: true,
        membership_number: `MEM${Date.now()}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Log user creation
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'user_create',
      `Created user: ${email} with role: ${role}`,
      req.ip
    );

    // Remove password from response
    delete newUser.password_hash;

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: newUser
    });
  } catch (error) {
    log.error('Failed to create user', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

// Update user - Super Admin only
router.put('/users/:userId', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.password_hash;
    delete updates.id;
    delete updates.created_at;

    const { data: updatedUser, error } = await supabase
      .from('members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log user update
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'user_update',
      `Updated user: ${updatedUser.email}`,
      req.ip
    );

    // Remove password from response
    delete updatedUser.password_hash;

    res.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: updatedUser
    });
  } catch (error) {
    log.error('Failed to update user', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
});

// Delete user - Super Admin only
router.delete('/users/:userId', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Get user info before deletion
    const { data: userInfo } = await supabase
      .from('members')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Delete user
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    // Log user deletion
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'user_delete',
      `Deleted user: ${userInfo?.email} (${userInfo?.full_name})`,
      req.ip
    );

    res.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    log.error('Failed to delete user', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

// =====================================================
// AUDIT LOGS ENDPOINTS
// =====================================================

// Get audit logs - Super Admin only
router.get('/audit-logs', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { user_role, action_type, date_from, date_to, search, page = 1, limit = 50 } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (user_role) {
      query = query.eq('user_role', user_role);
    }

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    if (search) {
      query = query.or(`details.ilike.%${search}%,user_email.ilike.%${search}%`);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: logs, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: logs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    log.error('Failed to fetch audit logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

// =====================================================
// USER PREFERENCES ENDPOINTS
// =====================================================

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role || 'user_member';

    // Try to get user-specific preferences
    const { data: userPrefs, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('role', userRole)
      .single();

    if (userPrefs) {
      return res.json({
        success: true,
        data: userPrefs
      });
    }

    // Return role-based defaults if no user preferences found
    const defaultPreferencesByRole = {
      super_admin: {
        dashboard_widgets: ['stats', 'users', 'activity', 'system'],
        notifications: ['all'],
        theme: 'dark',
        language: 'ar'
      },
      financial_manager: {
        dashboard_widgets: ['payments', 'revenue', 'subscriptions'],
        notifications: ['payments', 'subscriptions'],
        theme: 'dark',
        language: 'ar'
      },
      family_tree_admin: {
        dashboard_widgets: ['members', 'tree', 'relationships'],
        notifications: ['members', 'tree_updates'],
        theme: 'dark',
        language: 'ar'
      },
      occasions_initiatives_diyas_admin: {
        dashboard_widgets: ['events', 'initiatives', 'diyas'],
        notifications: ['events', 'initiatives'],
        theme: 'dark',
        language: 'ar'
      },
      user_member: {
        dashboard_widgets: ['profile', 'payments', 'events'],
        notifications: ['personal'],
        theme: 'dark',
        language: 'ar'
      }
    };

    res.json({
      success: true,
      data: defaultPreferencesByRole[userRole] || defaultPreferencesByRole.user_member,
      isDefault: true
    });
  } catch (error) {
    log.error('Failed to fetch preferences', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
      message: error.message
    });
  }
});

// Update user preferences with persistence
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error: validationError, value } = userPreferencesSchema.validate(req.body, {
      stripUnknown: true
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const userRole = req.user.role || 'user_member';

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('role', userRole)
      .single();

    let result;
    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...value,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: req.user.id,
          role: userRole,
          ...value
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json({
      success: true,
      message: 'تم تحديث التفضيلات بنجاح',
      data: result
    });
  } catch (error) {
    log.error('Failed to update preferences', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

export default router;
