/**
 * RBAC (Role-Based Access Control) Middleware
 * Handles role checking and permission validation
 * FIXED: Authentication API Request Failures - Updated 2025-09-29
 */

import jwt from 'jsonwebtoken';
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

const JWT_SECRET = config.jwt.secret;

/**
 * Get Arabic role name
 */
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

/**
 * Get role permissions
 */
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


/**
 * Role hierarchy for permission inheritance
 */
const _ROLE_HIERARCHY = {
  super_admin: 100,
  financial_manager: 80,
  family_tree_admin: 70,
  occasions_initiatives_diyas_admin: 60,
  user_member: 10
};

/**
 * Get user's role from database
 */
async function _getUserRole(userId) {
  try {
    const { rows } = await query('SELECT * FROM get_user_role($1)', [userId]);
    return rows[0] || null;
  } catch (err) {
    log.error('Error in getUserRole', { error: err.message });
    return null;
  }
}

/**
 * Check if user has specific permission
 */
async function _hasPermission(userId, permissionName) {
  try {
    const { rows } = await query('SELECT * FROM has_permission($1, $2)', [userId, permissionName]);
    return rows[0]?.has_permission === true;
  } catch (err) {
    log.error('Error in hasPermission', { error: err.message });
    return false;
  }
}

/**
 * Main RBAC middleware
 */
export const requireRole = (allowedRoles) => {
  /* eslint-disable require-await */
  return async (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'الرجاء تسجيل الدخول للمتابعة'
        });
      }

      const token = authHeader.substring(7);

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'جلسة غير صالحة، الرجاء تسجيل الدخول مجدداً'
        });
      }

      // Handle member role (from mobile login)
      if (decoded.role === 'member') {
        if (!allowedRoles.includes('member')) {
          return res.status(403).json({
            success: false,
            message: 'ليس لديك الصلاحية للوصول إلى هذا المورد'
          });
        }

        // Attach member info to request
        req.user = {
          id: decoded.id,
          phone: decoded.phone,
          role: 'member',
          membershipNumber: decoded.membershipNumber,
          fullName: decoded.fullName
        };

        next();
        return;
      }

      // Handle admin roles (from admin login)
      // Use role and permissions directly from token instead of fetching from database
      const userRole = decoded.role || 'super_admin';
      const userPermissions = decoded.permissions || getRolePermissions(userRole);

      // Check if user's role is in allowed roles
      const isAllowed = allowedRoles.includes(userRole) ||
                       userRole === 'super_admin'; // Super admin always allowed

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية للوصول إلى هذا المورد',
          debug: {
            userRole,
            allowedRoles,
            tokenPayload: decoded
          }
        });
      }

      // Attach admin user info and role to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        role: userRole,
        roleAr: getArabicRoleName(userRole),
        permissions: userPermissions
      };

      // Log access for audit (simplified - no await to prevent blocking)
      logAccess(req).catch(err => log.error('Audit log error', { error: err.message }));

      next();
    } catch (error) {
      log.error('RBAC Middleware Error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });
    }
  };
};

/**
 * Middleware to check specific permission
 */
export const requirePermission = (permissionName) => {
  /* eslint-disable require-await */
  return async (req, res, next) => {
    try {
      // First check if user is authenticated
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'الرجاء تسجيل الدخول للمتابعة'
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      // Use permissions directly from token
      const userPermissions = decoded.permissions || getRolePermissions(decoded.role || 'super_admin');

      // Check if user has the specific permission
      const hasUserPermission = userPermissions[permissionName] === true ||
                               userPermissions.all_access === true ||
                               decoded.role === 'super_admin';

      if (!hasUserPermission) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية لتنفيذ هذا الإجراء',
          requiredPermission: permissionName
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        role: decoded.role || 'super_admin',
        roleAr: getArabicRoleName(decoded.role || 'super_admin'),
        permissions: userPermissions
      };

      next();
    } catch (error) {
      log.error('Permission Check Error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });
    }
  };
};

/**
 * Check if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // Get user from previous auth middleware
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'الرجاء تسجيل الدخول للمتابعة'
        });
      }

      // Super admin always allowed
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Get resource owner ID
      const resourceOwnerId = await getResourceOwnerId(req);

      // Check if user owns the resource
      if (req.user.id === resourceOwnerId) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'ليس لديك الصلاحية للوصول إلى هذا المورد'
      });
    } catch (error) {
      log.error('Ownership Check Error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });
    }
  };
};

/**
 * Role-specific middleware shortcuts
 */
export const requireSuperAdmin = requireRole(['super_admin']);
export const requireFinancialManager = requireRole(['super_admin', 'financial_manager']);
export const requireFamilyTreeAdmin = requireRole(['super_admin', 'family_tree_admin']);
export const requireOccasionsAdmin = requireRole(['super_admin', 'occasions_initiatives_diyas_admin']);
export const requireMember = requireRole(['member']);
export const requireAnyAuthenticated = requireRole([
  'super_admin',
  'financial_manager',
  'family_tree_admin',
  'occasions_initiatives_diyas_admin',
  'user_member',
  'member'
]);

/**
 * Log access for audit trail
 */
async function logAccess(req) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        req.user.email || null,
        req.user.role || null,
        `${req.method} ${req.path}`,
        `Module: ${extractModule(req.path)}`,
        req.ip,
        req.headers['user-agent']
      ]
    );
  } catch (err) {
    log.error('Error in logAccess', { error: err.message });
  }
}

/**
 * Extract module from request path
 */
function extractModule(path) {
  const pathParts = path.split('/').filter(Boolean);
  if (pathParts[0] === 'api' && pathParts[1]) {
    return pathParts[1];
  }
  return 'unknown';
}

/**
 * Get role-based data filter
 * Returns query conditions based on user role
 */
export function getRoleDataFilter(user) {
  const filters = {};

  switch (user.role) {
    case 'super_admin':
      // No filters - can see everything
      break;

    case 'financial_manager':
      // Only financial data
      filters.dataType = 'financial';
      break;

    case 'family_tree_admin':
      // Only family tree related
      filters.dataType = 'family_tree';
      break;

    case 'occasions_initiatives_diyas_admin':
      // Only occasions, initiatives, diyas
      filters.dataType = ['occasions', 'initiatives', 'diyas'];
      break;

    case 'user_member':
      // Only own data
      filters.userId = user.id;
      break;

    default:
      // Restrict everything by default
      filters.blocked = true;
  }

  return filters;
}

/**
 * Validate role assignment
 * Only super admin can assign roles, and they must be valid
 */
/* eslint-disable require-await */
export const validateRoleAssignment = async (req, res, next) => {
  try {
    // Check if user is super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المدير الأعلى يمكنه تعيين الأدوار'
      });
    }

    // Validate role name
    const { roleName } = req.body;
    const validRoles = [
      'super_admin',
      'financial_manager',
      'family_tree_admin',
      'occasions_initiatives_diyas_admin',
      'user_member'
    ];

    if (!validRoles.includes(roleName)) {
      return res.status(400).json({
        success: false,
        message: 'اسم الدور غير صالح',
        validRoles
      });
    }

    next();
  } catch (error) {
    log.error('Role Assignment Validation Error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية تعيين الدور'
    });
  }
};

export default {
  requireRole,
  requirePermission,
  requireOwnershipOrAdmin,
  requireSuperAdmin,
  requireFinancialManager,
  requireFamilyTreeAdmin,
  requireOccasionsAdmin,
  requireMember,
  requireAnyAuthenticated,
  validateRoleAssignment,
  getRoleDataFilter
};


