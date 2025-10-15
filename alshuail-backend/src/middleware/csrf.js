/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * Uses double-submit cookie pattern for security
 */

const { doubleCsrf } = require('csrf-csrf');
const { config } = require('../config/env.js');

// Configure CSRF protection options
const csrfOptions = {
  getSecret: () => config.csrf.secret,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: false, // Allow frontend to read for header submission
    sameSite: config.isProduction ? 'strict' : 'lax',
    secure: config.isProduction, // HTTPS only in production
    path: '/',
    maxAge: 3600000 // 1 hour
  },
  getTokenFromRequest: (req) => {
    // Check multiple locations for CSRF token
    return req.headers['x-csrf-token'] ||
           req.body._csrf ||
           req.query._csrf;
  }
};

// Initialize CSRF protection
const {
  generateToken,
  validateRequest,
  doubleCsrfProtection
} = doubleCsrf(csrfOptions);

// Middleware to generate and provide CSRF token
const generateCSRFToken = (req, res, next) => {
  try {
    const token = generateToken(req, res);
    req.csrfToken = () => token;
    next();
  } catch (error) {
    console.error('CSRF token generation error:', error);
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
    validateRequest(req);
    next();
  } catch (error) {
    console.error('CSRF validation failed:', error);
    res.status(403).json({
      success: false,
      error: 'Invalid security token. Please refresh and try again.',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }
};

// Combined middleware for easy application
const csrfProtection = doubleCsrfProtection;

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  csrfProtection,
  csrfOptions
};