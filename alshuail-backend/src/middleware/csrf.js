/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * Uses double-submit cookie pattern for security
 */

import { doubleCsrf } from 'csrf-csrf';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';

// Configure CSRF protection options
const csrfOptions = {
  getSecret: () => config.csrf.secret,
  // Bind the token to the browser's authentication session. Public requests
  // do not have an auth cookie, so use a stable anonymous identifier until
  // authentication is established and the client fetches a fresh token.
  getSessionIdentifier: (req) => {
    const authToken = req.cookies?.auth_token;
    return typeof authToken === 'string' && authToken.length > 0
      ? authToken
      : 'anonymous';
  },
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: false, // Allow frontend to read for header submission
    sameSite: config.isProduction ? 'strict' : 'lax',
    secure: config.isProduction, // HTTPS only in production
    path: '/',
    maxAge: 3600000 // 1 hour
  },
  // csrf-csrf v4 expects getCsrfTokenFromRequest. Accept the token only from
  // the dedicated header so it cannot leak through URLs or ambiguous bodies.
  getCsrfTokenFromRequest: (req) => {
    const token = req.headers['x-csrf-token'];
    return typeof token === 'string' ? token : undefined;
  }
};

// Initialize CSRF protection
const {
  generateCsrfToken,
  validateRequest,
  doubleCsrfProtection
} = doubleCsrf(csrfOptions);

// Middleware to generate and provide CSRF token
const generateCSRFToken = (req, res, next) => {
  try {
    const token = generateCsrfToken(req, res);
    req.csrfToken = () => token;
    next();
  } catch (error) {
    log.error('CSRF token generation error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Security token generation failed'
    });
  }
};

// Middleware to validate CSRF token for state-changing operations
const validateCSRFToken = (req, res, next) => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for certain public endpoints
  const publicEndpoints = [
    '/api/auth/login',
    '/api/auth/verify-otp',
    '/api/health',
    '/api/csrf-token'
  ];

  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  try {
    if (validateRequest(req)) {
      return next();
    }

    log.warn('CSRF validation failed', { path: req.originalUrl || req.path });
    return res.status(403).json({
      success: false,
      error: 'Invalid security token. Please refresh and try again.',
      code: 'CSRF_VALIDATION_FAILED'
    });
  } catch (error) {
    log.error('CSRF validation failed', { error: error.message });
    return res.status(403).json({
      success: false,
      error: 'Invalid security token. Please refresh and try again.',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }
};

// Combined middleware for easy application
const csrfProtection = doubleCsrfProtection;

export {
  generateCSRFToken,
  validateCSRFToken,
  csrfProtection,
  csrfOptions
};
