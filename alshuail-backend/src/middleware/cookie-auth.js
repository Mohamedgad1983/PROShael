/**
 * Cookie-based Authentication Middleware
 * Handles JWT tokens in secure httpOnly cookies
 */

import jwt from 'jsonwebtoken';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true, // Not accessible via JavaScript (XSS protection)
  secure: config.isProduction, // HTTPS only in production
  sameSite: config.isProduction ? 'strict' : 'lax', // CSRF protection
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

/**
 * Set authentication cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT token
 * @param {Object} options - Additional cookie options
 */
function setAuthCookie(res, token, options = {}) {
  try {
    const cookieOptions = {
      ...COOKIE_CONFIG,
      ...options
    };

    res.cookie('auth_token', token, cookieOptions);

    log.info('Auth cookie set successfully');
    return true;
  } catch (error) {
    log.error('Failed to set auth cookie:', error);
    return false;
  }
}

/**
 * Clear authentication cookie
 * @param {Object} res - Express response object
 */
function clearAuthCookie(res) {
  try {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'strict' : 'lax',
      path: '/'
    });

    log.info('Auth cookie cleared successfully');
    return true;
  } catch (error) {
    log.error('Failed to clear auth cookie:', error);
    return false;
  }
}

/**
 * Extract JWT from cookie or Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
function extractToken(req) {
  // First, check for cookie
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }

  // Fallback to Authorization header for backward compatibility
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  return null;
}

/**
 * Verify JWT token from cookie or header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware
 */
function verifyAuthToken(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorAr: 'المصادقة مطلوبة'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.id || decoded.userId;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Clear expired cookie
      clearAuthCookie(res);

      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.',
        errorAr: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        errorAr: 'رمز غير صالح',
        code: 'INVALID_TOKEN'
      });
    }

    log.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      errorAr: 'خطأ في المصادقة'
    });
  }
}

/**
 * Optional authentication - doesn't fail if token is missing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware
 */
function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        req.userId = decoded.id || decoded.userId;
      } catch (error) {
        // Token is invalid but we don't fail the request
        log.debug('Optional auth: Invalid token provided');
      }
    }

    next();
  } catch (error) {
    log.error('Optional auth error:', error);
    next();
  }
}

/**
 * Refresh authentication cookie
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function refreshAuthCookie(req, res) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token to refresh',
        errorAr: 'لا يوجد رمز للتحديث'
      });
    }

    // Verify existing token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Generate new token with same payload
    const newToken = jwt.sign(
      {
        id: decoded.id,
        userId: decoded.userId,
        phone: decoded.phone,
        role: decoded.role
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    // Set new cookie
    setAuthCookie(res, newToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    log.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Failed to refresh token',
      errorAr: 'فشل تحديث الرمز'
    });
  }
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiry
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

export {
  setAuthCookie,
  clearAuthCookie,
  extractToken,
  verifyAuthToken,
  optionalAuth,
  refreshAuthCookie,
  generateToken,
  COOKIE_CONFIG
};