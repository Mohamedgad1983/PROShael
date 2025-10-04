// Role-Based Access Control Middleware for Al-Shuail System
// This middleware ensures members can only access their own data
// and admins have full access to the system

/**
 * Middleware to require admin role
 * Blocks access if user is not an admin
 */
const requireAdmin = (req, res, next) => {
  try {
    // Check if user exists and has been authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - يرجى تسجيل الدخول',
        error_en: 'Unauthorized - Please login'
      });
    }

    // Check if user has admin role
    const adminRoles = ['admin', 'super_admin', 'moderator'];
    if (!adminRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح - صلاحيات المشرف مطلوبة',
        error_en: 'Forbidden - Admin privileges required',
        userRole: req.user.role
      });
    }

    // Admin verified, proceed to next middleware
    next();
  } catch (error) {
    console.error('RequireAdmin middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من الصلاحيات',
      error_en: 'Error checking permissions'
    });
  }
};

/**
 * Middleware to require member role
 * Ensures user is at least a member
 */
const requireMember = (req, res, next) => {
  try {
    // Check if user exists and has been authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - يرجى تسجيل الدخول',
        error_en: 'Unauthorized - Please login'
      });
    }

    // Check if user has at least member role
    const validRoles = ['member', 'admin', 'super_admin', 'moderator'];
    if (!validRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح - صلاحيات العضو مطلوبة',
        error_en: 'Forbidden - Member privileges required',
        userRole: req.user.role
      });
    }

    // Member verified, proceed to next middleware
    next();
  } catch (error) {
    console.error('RequireMember middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من الصلاحيات',
      error_en: 'Error checking permissions'
    });
  }
};

/**
 * Middleware to ensure member can only access their own data
 * Compares member_id in request with authenticated user's member_id
 */
const requireOwnData = (req, res, next) => {
  try {
    // Check if user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - يرجى تسجيل الدخول',
        error_en: 'Unauthorized - Please login'
      });
    }

    // Admins can access any data
    if (['admin', 'super_admin', 'moderator'].includes(req.user.role)) {
      return next();
    }

    // For members, check if accessing own data
    const requestedMemberId = req.params.member_id || req.body.member_id || req.query.member_id;

    // If no member_id specified, assume accessing own data
    if (!requestedMemberId) {
      return next();
    }

    // Check if member is accessing their own data
    if (req.user.member_id && req.user.member_id !== parseInt(requestedMemberId)) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح - يمكنك الوصول إلى بياناتك فقط',
        error_en: 'Forbidden - You can only access your own data'
      });
    }

    // Member accessing own data, proceed
    next();
  } catch (error) {
    console.error('RequireOwnData middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من الصلاحيات',
      error_en: 'Error checking permissions'
    });
  }
};

/**
 * Middleware to check specific permissions
 * @param {string} permission - The permission to check
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح - يرجى تسجيل الدخول',
          error_en: 'Unauthorized - Please login'
        });
      }

      // Define permissions for each role
      const rolePermissions = {
        super_admin: ['*'], // All permissions
        admin: [
          'view_members', 'edit_members', 'delete_members',
          'view_payments', 'approve_payments',
          'view_notifications', 'send_notifications',
          'view_reports', 'generate_reports'
        ],
        moderator: [
          'view_members', 'edit_members',
          'view_payments', 'approve_payments',
          'view_notifications'
        ],
        member: [
          'view_own_profile', 'edit_own_profile',
          'view_own_payments', 'make_payment',
          'view_notifications'
        ]
      };

      // Check if user's role has the required permission
      const userPermissions = rolePermissions[req.user.role] || [];

      // Super admin has all permissions
      if (userPermissions.includes('*') || userPermissions.includes(permission)) {
        return next();
      }

      // Permission denied
      return res.status(403).json({
        success: false,
        error: `غير مصرح - الصلاحية المطلوبة: ${permission}`,
        error_en: `Forbidden - Required permission: ${permission}`,
        userRole: req.user.role,
        requiredPermission: permission
      });
    } catch (error) {
      console.error('RequirePermission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من الصلاحيات',
        error_en: 'Error checking permissions'
      });
    }
  };
};

/**
 * Middleware to log all access attempts
 * Useful for security auditing
 */
const logAccess = (req, res, next) => {
  const accessLog = {
    timestamp: new Date().toISOString(),
    user: req.user ? req.user.email : 'anonymous',
    role: req.user ? req.user.role : 'none',
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  console.log('[ACCESS LOG]', JSON.stringify(accessLog));
  next();
};

module.exports = {
  requireAdmin,
  requireMember,
  requireOwnData,
  requirePermission,
  logAccess
};