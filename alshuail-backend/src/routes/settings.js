import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// Authentication middleware - checks both users and members tables
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

    // First try to find user in 'users' table (admin users)
    const { rows: userRows } = await query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );
    let user = userRows[0];

    // If not found in users table, try members table
    if (!user) {
      const { rows: memberRows } = await query(
        'SELECT * FROM members WHERE id = $1 AND is_active = true',
        [decoded.id]
      );
      user = memberRows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'المستخدم غير موجود أو غير نشط'
        });
      }
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
    await query(
      'INSERT INTO audit_logs (user_id, user_email, user_role, action_type, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, userEmail, userRole, actionType, details, ipAddress]
    );
  } catch (error) {
    log.error('Failed to log activity', { error: error.message });
  }
};

// Get system settings - Super Admin only
router.get('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM system_settings LIMIT 1');

    if (rows.length === 0) {
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

    res.json(rows[0]);
  } catch (error) {
    log.error('Failed to fetch system settings', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Update system settings - Super Admin only
router.put('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { rows: existingRows } = await query('SELECT id FROM system_settings LIMIT 1');
    const existing = existingRows[0];

    let result;
    if (existing) {
      // Update existing settings - build dynamic SET clause from req.body
      const body = { ...req.body, updated_at: new Date().toISOString(), updated_by: req.user.id };
      const keys = Object.keys(body);
      const setClauses = keys.map((key, i) => `"${key}" = $${i + 1}`);
      const values = keys.map(key => body[key]);
      values.push(existing.id);

      const { rows } = await query(
        `UPDATE system_settings SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      result = rows[0];
    } else {
      // Create new settings
      const body = { ...req.body, updated_by: req.user.id };
      const keys = Object.keys(body);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const values = keys.map(key => body[key]);

      const { rows } = await query(
        `INSERT INTO system_settings (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
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
      'System settings updated',
      req.ip
    );

    res.json(result);
  } catch (error) {
    log.error('Failed to update system settings', { error: error.message });
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// Get all users - Super Admin only (queries both users and members tables)
router.get('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { role, status, search } = req.query;

    // Admin roles stored in 'users' table
    const adminRoles = ['super_admin', 'admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin', 'operational_manager'];

    // Build users query dynamically
    const usersConditions = [];
    const usersParams = [];
    let usersParamIdx = 1;

    if (role) {
      usersConditions.push(`role = $${usersParamIdx++}`);
      usersParams.push(role);
    }

    if (status === 'active') {
      usersConditions.push(`is_active = true`);
    } else if (status === 'inactive') {
      usersConditions.push(`is_active = false`);
    }

    if (search) {
      usersConditions.push(`(full_name_ar ILIKE $${usersParamIdx} OR full_name_en ILIKE $${usersParamIdx} OR email ILIKE $${usersParamIdx} OR phone ILIKE $${usersParamIdx})`);
      usersParams.push(`%${search}%`);
      usersParamIdx++;
    }

    const usersWhere = usersConditions.length > 0 ? 'WHERE ' + usersConditions.join(' AND ') : '';
    const usersSql = `SELECT id, full_name_ar, full_name_en, email, phone, role, is_active, created_at, last_login FROM users ${usersWhere} ORDER BY created_at DESC`;

    // Build members query dynamically
    const membersConditions = [];
    const membersParams = [];
    let membersParamIdx = 1;

    // Members must have one of the known roles
    const allRoles = ['super_admin', 'admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin', 'operational_manager', 'member'];
    const rolePlaceholders = allRoles.map((_, i) => `$${membersParamIdx + i}`);
    membersConditions.push(`role IN (${rolePlaceholders.join(', ')})`);
    membersParams.push(...allRoles);
    membersParamIdx += allRoles.length;

    if (role) {
      membersConditions.push(`role = $${membersParamIdx++}`);
      membersParams.push(role);
    }

    if (status === 'active') {
      membersConditions.push(`is_active = true`);
    } else if (status === 'inactive') {
      membersConditions.push(`is_active = false`);
    }

    if (search) {
      membersConditions.push(`(full_name ILIKE $${membersParamIdx} OR email ILIKE $${membersParamIdx} OR phone ILIKE $${membersParamIdx})`);
      membersParams.push(`%${search}%`);
      membersParamIdx++;
    }

    const membersWhere = membersConditions.length > 0 ? 'WHERE ' + membersConditions.join(' AND ') : '';
    const membersSql = `SELECT id, full_name, email, phone, role, is_active, created_at, last_login FROM members ${membersWhere} ORDER BY created_at DESC`;

    // Execute both queries in parallel
    const [usersResult, membersResult] = await Promise.all([
      query(usersSql, usersParams),
      query(membersSql, membersParams)
    ]);

    // Combine results from both tables
    const adminUsers = (usersResult.rows || []).map(u => ({
      id: u.id,
      full_name: u.full_name_ar || u.full_name_en || u.email,
      email: u.email,
      phone: u.phone,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at,
      last_login: u.last_login,
      source: 'users'
    }));

    const memberUsers = (membersResult.rows || [])
      .filter(m => adminRoles.includes(m.role)) // Only include members with admin roles
      .map(m => ({
        id: m.id,
        full_name: m.full_name,
        email: m.email,
        phone: m.phone,
        role: m.role,
        is_active: m.is_active,
        created_at: m.created_at,
        last_login: m.last_login,
        source: 'members'
      }));

    // Combine and deduplicate by email
    const allUsers = [...adminUsers];
    const existingEmails = new Set(adminUsers.map(u => u.email?.toLowerCase()));

    memberUsers.forEach(m => {
      if (m.email && !existingEmails.has(m.email.toLowerCase())) {
        allUsers.push(m);
        existingEmails.add(m.email.toLowerCase());
      }
    });

    // Sort by created_at descending
    allUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allUsers);
  } catch (error) {
    log.error('Failed to fetch users', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user - Super Admin only
router.post('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { full_name, email, phone, role, temporary_password } = req.body;

    // Determine if this is an admin role or a member role
    const adminRoles = ['super_admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin'];
    const isAdminRole = adminRoles.includes(role);
    const targetTable = isAdminRole ? 'users' : 'members';

    // Check if user already exists in both tables
    const [{ rows: existingInUsers }, { rows: existingInMembers }] = await Promise.all([
      query('SELECT id FROM users WHERE email = $1', [email]),
      query('SELECT id FROM members WHERE email = $1', [email])
    ]);

    if (existingInUsers.length > 0 || existingInMembers.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporary_password, 10);

    // Build insert for appropriate table
    const assignedRole = role || (isAdminRole ? 'super_admin' : 'member');
    let insertSql;
    let insertParams;

    if (targetTable === 'members') {
      insertSql = `INSERT INTO members (full_name, email, phone, role, password_hash, is_active, membership_number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
      insertParams = [full_name, email, phone, assignedRole, hashedPassword, true, `MEM${Date.now()}`];
    } else {
      insertSql = `INSERT INTO users (full_name, email, phone, role, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
      insertParams = [full_name, email, phone, assignedRole, hashedPassword, true];
    }

    const { rows } = await query(insertSql, insertParams);
    const newUser = rows[0];

    // Log user creation
    await logActivity(
      req.user.id,
      req.user.email,
      req.user.role,
      'user_create',
      `Created user: ${email} with role: ${role} in ${targetTable} table`,
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
    const updates = { ...req.body };

    // Remove sensitive fields
    delete updates.password_hash;
    delete updates.id;

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Build dynamic SET clause
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClauses = keys.map((key, i) => `"${key}" = $${i + 1}`);
    const values = keys.map(key => updates[key]);
    values.push(userId);

    const { rows } = await query(
      `UPDATE members SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = rows[0];

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
    const { rows: infoRows } = await query(
      'SELECT email FROM members WHERE id = $1',
      [userId]
    );
    const userInfo = infoRows[0];

    // Delete user
    const { rowCount } = await query(
      'DELETE FROM members WHERE id = $1',
      [userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (user_role) {
      conditions.push(`user_role = $${paramIdx++}`);
      params.push(user_role);
    }

    if (action_type) {
      conditions.push(`action_type = $${paramIdx++}`);
      params.push(action_type);
    }

    if (date_from) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(date_from);
    }

    if (date_to) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(date_to);
    }

    if (search) {
      conditions.push(`(details ILIKE $${paramIdx} OR user_email ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Use window function for total count alongside data
    const sql = `SELECT *, count(*) OVER() AS total_count FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limitNum, offset);

    const { rows } = await query(sql, params);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    // Strip the total_count field from each row before returning
    const logs = rows.map(({ total_count, ...rest }) => rest);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    log.error('Failed to fetch audit logs', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get user preferences by role
router.get('/preferences', authenticateToken, (req, res) => {
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
router.put('/preferences', authenticateToken, (req, res) => {
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
