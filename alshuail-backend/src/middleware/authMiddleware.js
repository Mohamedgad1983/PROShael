import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';

/**
 * Authenticate JWT token middleware
 * Validates JWT tokens and attaches user data to request
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Allow public access to specific read-only endpoints
    const publicEndpoints = [
      '/api/member-monitoring',
      '/api/dashboard/stats'
    ];

    const isPublicEndpoint = publicEndpoints.some(endpoint =>
      req.originalUrl.includes(endpoint)
    );

    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Allow public endpoints without token
    if (isPublicEndpoint && !token) {
      req.user = { id: 'public-access', role: 'viewer' };
      return next();
    }

    // Require token for all other endpoints
    if (!token) {
      log.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const jwtSecret = config.jwt.secret;

    if (!jwtSecret) {
      log.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        log.error('Token verification failed', {
          error: err.message,
          type: err.name
        });

        // Handle specific JWT errors
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token expired',
            message: 'Your session has expired. Please login again.'
          });
        }

        if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            error: 'Invalid token',
            message: 'The provided token is invalid.'
          });
        }

        // Generic token error
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          message: 'Token verification failed'
        });
      }

      // Successfully decoded - attach user to request
      req.user = {
        id: decoded.id || decoded.user_id,
        role: decoded.role || 'member',
        email: decoded.email,
        phone: decoded.phone,
        fullName: decoded.fullName || decoded.full_name,
        membershipNumber: decoded.membershipNumber || decoded.membership_number
      };

      log.auth('Authentication successful', req.user.id, true);
      next();
    });
  } catch (error) {
    log.error('Unexpected authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An unexpected error occurred during authentication'
    });
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role(s)
 */
export const authorize = (roles) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        log.warn('Authorization failed: No user in request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Convert single role to array for consistency
      const requiredRoles = Array.isArray(roles) ? roles : [roles];

      // Check if user has one of the required roles
      const userRole = req.user.role || 'member';

      // Super admin has access to everything
      if (userRole === 'super_admin') {
        log.auth('Authorization successful', req.user.id, true);
        return next();
      }

      // Check if user's role is in required roles
      if (!requiredRoles.includes(userRole)) {
        log.warn('Authorization failed: Insufficient privileges', {
          userRole,
          requiredRoles,
          userId: req.user.id
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `This action requires one of these roles: ${requiredRoles.join(', ')}`
        });
      }

      log.auth('Authorization successful', req.user.id, true);
      next();
    } catch (error) {
      log.error('Unexpected authorization error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'An unexpected error occurred during authorization'
      });
    }
  };
};

// Helper middleware for common role requirements
export const requireAdmin = authorize(['admin', 'super_admin', 'financial_manager']);
export const requireSuperAdmin = authorize(['super_admin']);
export const requireFinancialManager = authorize(['financial_manager', 'admin', 'super_admin']);

export default {
  authenticateToken,
  authorize,
  requireAdmin,
  requireSuperAdmin,
  requireFinancialManager
};