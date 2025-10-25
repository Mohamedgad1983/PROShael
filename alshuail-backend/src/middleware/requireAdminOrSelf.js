import { log } from '../utils/logger.js';

/**
 * Authorization middleware: Allow super admins OR members viewing their own data
 *
 * This middleware ensures privacy by allowing:
 * 1. Super admins to access any member's data
 * 2. Regular members to access only their own data
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requireAdminOrSelf = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      log.warn('[requireAdminOrSelf] No user object in request');
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'غير مصرح - يجب تسجيل الدخول'
      });
    }

    const requestingUserId = req.user.id || req.user.user_id;
    const targetMemberId = req.params.memberId;
    const userRole = req.user.role;

    // Super admins and admins can access anyone's suspension history
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';

    if (isAdmin) {
      log.auth('Admin access granted', requestingUserId, true);
      return next();
    }

    // Members can only access their own suspension history
    if (requestingUserId === targetMemberId) {
      log.auth('Self-access granted', requestingUserId, true);
      return next();
    }

    // Access denied - trying to view another member's data
    log.warn('[requireAdminOrSelf] Access denied:', {
      requestingUserId,
      targetMemberId,
      userRole
    });

    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'غير مسموح لك بعرض هذه المعلومات'
    });

  } catch (error) {
    log.error('[requireAdminOrSelf] Error:', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'خطأ في التحقق من الصلاحيات'
    });
  }
};
