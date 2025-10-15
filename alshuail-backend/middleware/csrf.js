/**
 * CSRF Protection Middleware
 * Implements token-based CSRF protection for all state-changing operations
 *
 * Security Level: CRITICAL
 * OWASP A8: Cross-Site Request Forgery (CSRF) Protection
 */

const crypto = require('crypto');

// Store for CSRF tokens (in production, use Redis or session store)
const tokenStore = new Map();

// Token expiry time (15 minutes)
const TOKEN_EXPIRY = 15 * 60 * 1000;

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} CSRF token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create CSRF token for a session
 * @param {string} sessionId - Session identifier (user ID or session token)
 * @returns {string} CSRF token
 */
function getOrCreateToken(sessionId) {
  const existing = tokenStore.get(sessionId);

  if (existing && existing.expiry > Date.now()) {
    return existing.token;
  }

  // Generate new token
  const token = generateToken();
  tokenStore.set(sessionId, {
    token,
    expiry: Date.now() + TOKEN_EXPIRY
  });

  return token;
}

/**
 * Validate CSRF token
 * @param {string} sessionId - Session identifier
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid
 */
function validateToken(sessionId, token) {
  const stored = tokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  // Check expiry
  if (stored.expiry < Date.now()) {
    tokenStore.delete(sessionId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
}

/**
 * Clean up expired tokens (run periodically)
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [sessionId, data] of tokenStore.entries()) {
    if (data.expiry < now) {
      tokenStore.delete(sessionId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

/**
 * Middleware to provide CSRF token to client
 */
function csrfTokenProvider(req, res, next) {
  // Get session ID from JWT token or create temporary ID
  const authHeader = req.headers.authorization;
  const sessionId = authHeader
    ? authHeader.replace('Bearer ', '')
    : `anonymous_${req.ip}_${Date.now()}`;

  // Generate or retrieve token
  const csrfToken = getOrCreateToken(sessionId);

  // Attach to response locals for access in routes
  res.locals.csrfToken = csrfToken;
  res.locals.sessionId = sessionId;

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 */
function csrfProtection(req, res, next) {
  // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get session ID
  const authHeader = req.headers.authorization;
  const sessionId = authHeader
    ? authHeader.replace('Bearer ', '')
    : `anonymous_${req.ip}_${Date.now()}`;

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'رمز CSRF مفقود',
      message_en: 'CSRF token missing',
      error_code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Validate token
  if (!validateToken(sessionId, token)) {
    return res.status(403).json({
      success: false,
      message: 'رمز CSRF غير صالح أو منتهي الصلاحية',
      message_en: 'Invalid or expired CSRF token',
      error_code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
}

/**
 * Route handler to get CSRF token
 */
function getCsrfToken(req, res) {
  res.json({
    success: true,
    csrfToken: res.locals.csrfToken,
    message: 'رمز CSRF تم إنشاؤه بنجاح',
    message_en: 'CSRF token generated successfully'
  });
}

module.exports = {
  csrfTokenProvider,
  csrfProtection,
  getCsrfToken,
  generateToken,
  validateToken
};
