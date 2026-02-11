import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../services/database.js';
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

    const { rows } = await query(
      'SELECT * FROM members WHERE id = $1 AND is_active = true',
      [decoded.id]
    );
    const user = rows[0];

    if (!user) {
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
    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, userEmail, userRole, actionType, details, ipAddress, new Date().toISOString()]
    );
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
    const { rows } = await query('SELECT * FROM system_settings LIMIT 1');
    const settings = rows[0];

    if (!settings) {
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
    const { rows: existingRows } = await query('SELECT id FROM system_settings LIMIT 1');
    const existing = existingRows[0];

    let result;
    if (existing) {
      // Update existing settings - build dynamic SET clause
      const fieldsToUpdate = { ...value, updated_at: new Date().toISOString(), updated_by: req.user.id };
      const keys = Object.keys(fieldsToUpdate);
      const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
      const values = keys.map(key => {
        const val = fieldsToUpdate[key];
        // Serialize objects/arrays to JSON for jsonb columns
        return (val !== null && typeof val === 'object' && !(val instanceof Date)) ? JSON.stringify(val) : val;
      });

      const { rows } = await query(
        `UPDATE system_settings SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, existing.id]
      );
      result = rows[0];
    } else {
      // Create new settings
      const fieldsToInsert = { ...value, updated_by: req.user.id };
      const keys = Object.keys(fieldsToInsert);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const values = keys.map(key => {
        const val = fieldsToInsert[key];
        return (val !== null && typeof val === 'object' && !(val instanceof Date)) ? JSON.stringify(val) : val;
      });

      const { rows } = await query(
        `INSERT INTO system_settings (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      result = rows[0];
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

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    if (status === 'active') {
      conditions.push(`is_active = true`);
      conditions.push(`suspended_at IS NULL`);
    } else if (status === 'inactive') {
      conditions.push(`is_active = false`);
    } else if (status === 'suspended') {
      conditions.push(`suspended_at IS NOT NULL`);
    }

    if (search) {
      conditions.push(`(full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;

    // Query with count(*) OVER() for total
    const { rows } = await query(
      `SELECT id, full_name, email, phone, role, is_active, created_at, last_login, suspended_at, suspension_reason,
              count(*) OVER() AS total_count
       FROM members
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parsedLimit, offset]
    );

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    // Remove the total_count field from each row
    const users = rows.map(({ total_count, ...rest }) => rest);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: totalCount,
        pages: Math.ceil(totalCount / parsedLimit)
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
    const { rows: existingRows } = await query(
      'SELECT id FROM members WHERE email = $1',
      [email]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporary_password, 10);

    // Create new user
    const { rows: newUserRows } = await query(
      `INSERT INTO members (full_name, email, phone, role, password_hash, is_active, membership_number, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [full_name, email, phone, role || 'user_member', hashedPassword, true, `MEM${Date.now()}`, new Date().toISOString()]
    );
    const newUser = newUserRows[0];

    if (!newUser) {
      throw new Error('Failed to insert new user');
    }

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
    const updates = { ...req.body };

    // Remove sensitive fields
    delete updates.password_hash;
    delete updates.id;
    delete updates.created_at;

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Build dynamic SET clause
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    const values = keys.map(key => {
      const val = updates[key];
      return (val !== null && typeof val === 'object' && !(val instanceof Date)) ? JSON.stringify(val) : val;
    });

    const { rows } = await query(
      `UPDATE members SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, userId]
    );
    const updatedUser = rows[0];

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

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
    const { rows: infoRows } = await query(
      'SELECT email, full_name FROM members WHERE id = $1',
      [userId]
    );
    const userInfo = infoRows[0];

    // Delete user
    const { rowCount } = await query(
      'DELETE FROM members WHERE id = $1',
      [userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

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

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (user_role) {
      conditions.push(`user_role = $${paramIndex++}`);
      params.push(user_role);
    }

    if (action_type) {
      conditions.push(`action_type = $${paramIndex++}`);
      params.push(action_type);
    }

    if (date_from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(date_from);
    }

    if (date_to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(date_to);
    }

    if (search) {
      conditions.push(`(details ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;

    // Query with count(*) OVER() for total
    const { rows } = await query(
      `SELECT *, count(*) OVER() AS total_count
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parsedLimit, offset]
    );

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const logs = rows.map(({ total_count, ...rest }) => rest);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: totalCount,
        pages: Math.ceil(totalCount / parsedLimit)
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
    const { rows } = await query(
      'SELECT * FROM user_preferences WHERE user_id = $1 AND role = $2',
      [req.user.id, userRole]
    );
    const userPrefs = rows[0];

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
    const { rows: existingRows } = await query(
      'SELECT id FROM user_preferences WHERE user_id = $1 AND role = $2',
      [req.user.id, userRole]
    );
    const existing = existingRows[0];

    let result;
    if (existing) {
      // Update existing preferences - build dynamic SET clause
      const fieldsToUpdate = { ...value, updated_at: new Date().toISOString() };
      const keys = Object.keys(fieldsToUpdate);
      const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
      const values = keys.map(key => {
        const val = fieldsToUpdate[key];
        return (val !== null && typeof val === 'object' && !(val instanceof Date)) ? JSON.stringify(val) : val;
      });

      const { rows } = await query(
        `UPDATE user_preferences SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, existing.id]
      );
      result = rows[0];
    } else {
      // Create new preferences
      const fieldsToInsert = { user_id: req.user.id, role: userRole, ...value };
      const keys = Object.keys(fieldsToInsert);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const values = keys.map(key => {
        const val = fieldsToInsert[key];
        return (val !== null && typeof val === 'object' && !(val instanceof Date)) ? JSON.stringify(val) : val;
      });

      const { rows } = await query(
        `INSERT INTO user_preferences (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      result = rows[0];
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
