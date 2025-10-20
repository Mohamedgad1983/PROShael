// Role-Based Access Control Middleware
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Role hierarchy
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FINANCIAL_MANAGER: 'financial_manager',
  FAMILY_TREE_MANAGER: 'family_tree_manager',
  VIEWER: 'viewer'
};

// Permission sets
export const PERMISSIONS = {
  MANAGE_MEMBERS: 'manage_members',
  APPROVE_MEMBERS: 'approve_members',
  MANAGE_FINANCES: 'manage_finances',
  MANAGE_FAMILY_TREE: 'manage_family_tree',
  VIEW_REPORTS: 'view_reports',
  MANAGE_USERS: 'manage_users'
};

/**
 * Check if user has required role
 */
export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get user role
      const { data: user, error } = await supabase
        .from('users')
        .select('role, permissions, is_active')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'حسابك غير نشط'
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية كافية'
        });
      }

      // Attach role and permissions to request
      req.userRole = user.role;
      req.userPermissions = user.permissions || {};

      next();
    } catch (error) {
      console.error('RBAC Error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات'
      });
    }
  };
};

/**
 * Check if user has specific permission
 */
export const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const permissions = req.userPermissions || {};

      // Super admin has all permissions
      if (req.userRole === ROLES.SUPER_ADMIN) {
        return next();
      }

      // Check if user has all required permissions
      const hasPermission = requiredPermissions.every(
        perm => permissions[perm] === true
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لهذه العملية'
        });
      }

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
