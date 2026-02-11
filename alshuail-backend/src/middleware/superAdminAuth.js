import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

/**
 * Middleware to check if authenticated user is a super admin
 * Must be used AFTER authenticateToken middleware
 */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    // Get user info from authenticateToken middleware
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId && !userEmail) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'يجب تسجيل الدخول أولاً',
        message_en: 'Authentication required'
      });
    }

    // Check if user has super_admin role
    const { rows } = await query('SELECT role, email FROM users WHERE id = $1', [userId]);
    const user = rows[0];

    if (!user) {
      log.warn('[SuperAdmin] User not found:', { userId });
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'المستخدم غير موجود',
        message_en: 'User not found'
      });
    }

    if (user.role !== 'super_admin') {
      log.warn('[SuperAdmin] Access denied:', {
        userId,
        email: user.email,
        role: user.role,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'هذه العملية متاحة للمشرف العام فقط',
        message_en: 'Super admin access required',
        requiredRole: 'super_admin',
        currentRole: user.role
      });
    }

    // User is super admin, attach to request
    req.superAdmin = {
      id: userId,
      email: user.email,
      role: user.role
    };

    log.info('[SuperAdmin] Access granted:', {
      userId,
      email: user.email,
      path: req.path
    });

    next();
  } catch (error) {
    log.error('[SuperAdmin] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Check if a user email is super admin (utility function)
 */
export const isSuperAdmin = async (email) => {
  try {
    const { rows } = await query('SELECT role FROM users WHERE email = $1', [email]);
    return rows[0]?.role === 'super_admin';
  } catch (error) {
    log.error('[SuperAdmin] Check error:', error);
    return false;
  }
};
