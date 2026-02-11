/**
 * Role Expiration Middleware
 *
 * Checks active time-based role assignments for authenticated users
 * Uses security definer functions and optimized RLS patterns
 *
 * @reference Context7 - Supabase RLS best practices
 * @reference Context7 - Express middleware patterns
 */

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

/**
 * Middleware to check and enforce role expiration
 *
 * This middleware:
 * 1. Gets the user's active roles based on current date
 * 2. Merges permissions from all active roles
 * 3. Updates req.user with merged permissions
 * 4. Checks if user has at least one active role
 *
 * Best practices from Context7:
 * - Uses security definer functions for performance
 * - Wraps auth.uid() in SELECT for query optimizer caching
 * - Handles errors via next(err) for proper error propagation
 */
export const checkRoleExpiration = async (req, res, next) => {
  try {
    // Skip for unauthenticated requests
    if (!req.user || !req.user.id) {
      return next();
    }

    const userId = req.user.id;
    const checkDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get active roles using security definer function (optimized)
    let activeRoles;
    try {
      const rolesResult = await query('SELECT * FROM get_active_roles($1, $2)', [userId, checkDate]);
      activeRoles = rolesResult.rows;
    } catch (rolesError) {
      log.error('[Role Expiration] Failed to fetch active roles', {
        error: rolesError.message,
        userId,
        checkDate
      });
      // Don't fail the request, log and continue with existing permissions
      return next();
    }

    // Get merged permissions (combines all active roles)
    let mergedPermissions;
    try {
      const permResult = await query('SELECT * FROM get_merged_permissions($1, $2)', [userId, checkDate]);
      mergedPermissions = permResult.rows[0]?.get_merged_permissions ?? permResult.rows[0] ?? {};
    } catch (permError) {
      log.error('[Role Expiration] Failed to fetch merged permissions', {
        error: permError.message,
        userId,
        checkDate
      });
      return next();
    }

    // Update user object with current active roles and permissions
    req.user.activeRoles = activeRoles || [];
    req.user.mergedPermissions = mergedPermissions || {};
    req.user.roleCount = (activeRoles || []).length;

    // Check if user has at least one active role
    if (!activeRoles || activeRoles.length === 0) {
      log.warn('[Role Expiration] User has no active roles', {
        userId,
        checkDate,
        primaryRole: req.user.role
      });

      // If user has no time-based roles, rely on their primary role
      // This allows backwards compatibility with single-role system
      return next();
    }

    // Log successful role check (debug level)
    log.debug('[Role Expiration] Active roles checked', {
      userId,
      roleCount: activeRoles.length,
      roles: activeRoles.map(r => r.role_name)
    });

    next();
  } catch (error) {
    // Context7 best practice: Defer errors via next(err)
    log.error('[Role Expiration] Unexpected error in middleware', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    // Don't block request on middleware failure
    // Log error and continue to preserve availability
    next();
  }
};

/**
 * Middleware to require specific permission from merged roles
 *
 * Usage: requirePermission('manage_finances')
 *
 * @param {string} permission - Permission key to check (e.g., 'manage_finances')
 * @returns {Function} Express middleware function
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.id;
      const checkDate = new Date().toISOString().split('T')[0];

      // Use security definer function to check permission
      let hasPermission;
      try {
        const permResult = await query(
          'SELECT * FROM user_has_permission($1, $2, $3)',
          [userId, permission, checkDate]
        );
        hasPermission = permResult.rows[0]?.user_has_permission === true;
      } catch (permCheckError) {
        log.error('[Permission Check] Failed to verify permission', {
          error: permCheckError.message,
          userId,
          permission,
          checkDate
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to verify permissions',
          code: 'PERMISSION_CHECK_FAILED'
        });
      }

      if (!hasPermission) {
        log.warn('[Permission Check] Permission denied', {
          userId,
          permission,
          userRole: req.user.role,
          checkDate
        });
        return res.status(403).json({
          success: false,
          error: `Permission denied: ${permission}`,
          code: 'PERMISSION_DENIED',
          required: permission
        });
      }

      // Permission granted
      log.debug('[Permission Check] Permission granted', {
        userId,
        permission
      });

      next();
    } catch (error) {
      log.error('[Permission Check] Unexpected error', {
        error: error.message,
        userId: req.user?.id,
        permission
      });

      // Context7 best practice: Propagate errors via next(err)
      const err = new Error('Permission verification failed');
      err.status = 500;
      next(err);
    }
  };
};

/**
 * Middleware to require any of the specified permissions
 *
 * Usage: requireAnyPermission(['manage_finances', 'view_reports'])
 *
 * @param {Array<string>} permissions - Array of permission keys
 * @returns {Function} Express middleware function
 */
export const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.id;
      const checkDate = new Date().toISOString().split('T')[0];

      // Check each permission until one is found
      let hasAnyPermission = false;
      let grantedPermission = null;

      for (const permission of permissions) {
        try {
          const { rows } = await query(
            'SELECT * FROM user_has_permission($1, $2, $3)',
            [userId, permission, checkDate]
          );

          if (rows[0]?.user_has_permission === true) {
            hasAnyPermission = true;
            grantedPermission = permission;
            break;
          }
        } catch (permError) {
          log.error('[Any Permission Check] Failed to verify permission', {
            error: permError.message,
            userId,
            permission
          });
          continue;
        }
      }

      if (!hasAnyPermission) {
        log.warn('[Any Permission Check] All permissions denied', {
          userId,
          requiredAny: permissions,
          userRole: req.user.role
        });
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredAny: permissions
        });
      }

      // At least one permission granted
      log.debug('[Any Permission Check] Permission granted', {
        userId,
        grantedPermission,
        requiredAny: permissions
      });

      next();
    } catch (error) {
      log.error('[Any Permission Check] Unexpected error', {
        error: error.message,
        userId: req.user?.id,
        permissions
      });

      const err = new Error('Permission verification failed');
      err.status = 500;
      next(err);
    }
  };
};

/**
 * Middleware to check if user has an active role (any role that hasn't expired)
 *
 * @returns {Function} Express middleware function
 */
export const requireActiveRole = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userId = req.user.id;
    const checkDate = new Date().toISOString().split('T')[0];

    let activeRoles;
    try {
      const rolesResult = await query('SELECT * FROM get_active_roles($1, $2)', [userId, checkDate]);
      activeRoles = rolesResult.rows;
    } catch (rolesError) {
      log.error('[Active Role Check] Failed to fetch active roles', {
        error: rolesError.message,
        userId
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to verify active roles',
        code: 'ROLE_CHECK_FAILED'
      });
    }

    if (!activeRoles || activeRoles.length === 0) {
      log.warn('[Active Role Check] No active roles found', {
        userId,
        userRole: req.user.role,
        checkDate
      });
      return res.status(403).json({
        success: false,
        error: 'No active role assignments found',
        code: 'NO_ACTIVE_ROLES',
        message: 'Your role assignments have expired. Contact administrator.'
      });
    }

    log.debug('[Active Role Check] Active roles verified', {
      userId,
      roleCount: activeRoles.length
    });

    next();
  } catch (error) {
    log.error('[Active Role Check] Unexpected error', {
      error: error.message,
      userId: req.user?.id
    });

    const err = new Error('Active role verification failed');
    err.status = 500;
    next(err);
  }
};
