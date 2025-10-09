import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// Authentication middleware
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

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'رمز وصول غير صحيح'
      });
    }
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الهوية'
    });
  }
};

// Helper function to check role permissions
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        required_role: allowedRoles,
        user_role: req.user?.role
      });
    }
    next();
  };
};

// Helper function to log activities
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
        ip_address: ipAddress
      });
  } catch (error) {
    log.error('Failed to log activity', { error: error.message });
  }
};

// Get system settings - Super Admin only
router.get('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings found, return defaults
      return res.json({
        system_name: 'نظام إدارة عائلة الشعيل',
        default_language: 'ar',
        hijri_calendar_primary: true,
        session_timeout: 1440,
        max_login_attempts: 5,
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

    if (error) {throw error;}
    res.json(settings);
  } catch (error) {
    log.error('Failed to fetch system settings', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Update system settings - Super Admin only
router.put('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .single();

    let result;
    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          ...req.body,
          updated_at: new Date().toISOString(),
          updated_by: req.user.id
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {throw error;}
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('system_settings')
        .insert({
          ...req.body,
          updated_by: req.user.id
        })
        .select()
        .single();

      if (error) {throw error;}
      result = data;
    }

    // Log the settings change
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'settings_update',
      'System settings updated',
      req.ip
    );

    res.json(result);
  } catch (error) {
    log.error('Failed to update system settings', { error: error.message });
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// Get all users - Super Admin only
router.get('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { role, status, search } = req.query;

    let query = supabase
      .from('members')
      .select('id, full_name, email, phone, role, is_active, created_at, last_login')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {throw error;}
    res.json(users || []);
  } catch (error) {
    log.error('Failed to fetch users', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user - Super Admin only
router.post('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { full_name, email, phone, role, temporary_password } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
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
        membership_number: `MEM${Date.now()}`
      })
      .select()
      .single();

    if (error) {throw error;}

    // Log user creation
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'user_create',
      `Created user: ${email} with role: ${role}`,
      req.ip
    );

    res.status(201).json(newUser);
  } catch (error) {
    log.error('Failed to create user', { error: error.message });
    res.status(500).json({ error: 'Failed to create user' });
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

    const { data: updatedUser, error } = await supabase
      .from('members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {throw error;}

    // Log user update
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'user_update',
      `Updated user: ${updatedUser.email}`,
      req.ip
    );

    res.json(updatedUser);
  } catch (error) {
    log.error('Failed to update user', { error: error.message });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user - Super Admin only
router.delete('/users/:userId', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user info before deletion
    const { data: userInfo } = await supabase
      .from('members')
      .select('email')
      .eq('id', userId)
      .single();

    // Delete user
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', userId);

    if (error) {throw error;}

    // Log user deletion
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'user_delete',
      `Deleted user: ${userInfo?.email}`,
      req.ip
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    log.error('Failed to delete user', { error: error.message });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

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

    if (error) {throw error;}

    res.json({
      logs: logs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    log.error('Failed to fetch audit logs', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get user preferences by role
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role || 'user_member';

    // Define preferences based on role
    const preferencesByRole = {
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

    res.json(preferencesByRole[userRole] || preferencesByRole.user_member);
  } catch (error) {
    log.error('Failed to fetch preferences', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    // Here you would update user-specific preferences in database
    // For now, return success
    res.json({ message: 'Preferences updated successfully', preferences: req.body });
  } catch (error) {
    log.error('Failed to update preferences', { error: error.message });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;