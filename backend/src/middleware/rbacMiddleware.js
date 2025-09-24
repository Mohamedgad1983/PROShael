/**
 * RBAC (Role-Based Access Control) Middleware
 * Handles role checking and permission validation
 */

import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';

/**
 * Role hierarchy for permission inheritance
 */
const ROLE_HIERARCHY = {
  super_admin: 100,
  financial_manager: 80,
  family_tree_admin: 70,
  occasions_initiatives_diyas_admin: 60,
  user_member: 10
};

/**
 * Get user's role from database
 */
async function getUserRole(userId) {
  try {
    const { data, error } = await supabase.rpc('get_user_role', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Error in getUserRole:', err);
    return null;
  }
}

/**
 * Check if user has specific permission
 */
async function hasPermission(userId, permissionName) {
  try {
    const { data, error } = await supabase.rpc('has_permission', {
      p_user_id: userId,
      p_permission_name: permissionName
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in hasPermission:', err);
    return false;
  }
}

/**
 * Main RBAC middleware
 */
export const requireRole = (allowedRoles) => {
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
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');
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
      const userRole = await getUserRole(decoded.userId || decoded.id);
      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'لم يتم تحديد صلاحيات المستخدم'
        });
      }

      // Check if user's role is in allowed roles
      const isAllowed = allowedRoles.includes(userRole.role_name) ||
                       userRole.role_name === 'super_admin'; // Super admin always allowed

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية للوصول إلى هذا المورد'
        });
      }

      // Attach admin user info and role to request
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: userRole.role_name,
        roleAr: userRole.role_name_ar,
        permissions: userRole.permissions
      };

      // Log access for audit
      await logAccess(req);

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check permission
      const hasUserPermission = await hasPermission(decoded.userId, permissionName);

      if (!hasUserPermission) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية لتنفيذ هذا الإجراء',
          requiredPermission: permissionName
        });
      }

      // Get full user info
      const userRole = await getUserRole(decoded.userId);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: userRole?.role_name,
        roleAr: userRole?.role_name_ar,
        permissions: userRole?.permissions
      };

      next();
    } catch (error) {
      console.error('Permission Check Error:', error);
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
      console.error('Ownership Check Error:', error);
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
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user.id,
        action: `${req.method} ${req.path}`,
        module: extractModule(req.path),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

    if (error) {
      console.error('Error logging access:', error);
    }
  } catch (err) {
    console.error('Error in logAccess:', err);
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
    console.error('Role Assignment Validation Error:', error);
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