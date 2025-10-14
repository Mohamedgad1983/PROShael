/**
 * JWT Utilities - Al-Shuail Mobile PWA
 * Phase 1: JWT Helper Functions
 *
 * Features:
 * - JWT encoding/decoding
 * - Token validation
 * - Payload extraction
 * - Security utilities
 */

/**
 * Decode base64url string
 * @param {string} str - Base64url encoded string
 * @returns {string} - Decoded string
 */
function base64urlDecode(str) {
  // Replace base64url chars with base64 chars
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Pad with '=' to make length multiple of 4
  while (base64.length % 4) {
    base64 += '=';
  }

  try {
    // Decode base64 and handle UTF-8
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (error) {
    throw new Error('Invalid base64url string');
  }
}

/**
 * Encode string to base64url
 * @param {string} str - String to encode
 * @returns {string} - Base64url encoded string
 */
function base64urlEncode(str) {
  // Encode to base64
  const base64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );

  // Convert to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Parse JWT token and extract all parts
 * @param {string} token - JWT token
 * @returns {Object} - Token parts (header, payload, signature)
 */
export function parseJwtToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token: must be a non-empty string');
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid token: must have 3 parts');
  }

  try {
    const header = JSON.parse(base64urlDecode(parts[0]));
    const payload = JSON.parse(base64urlDecode(parts[1]));
    const signature = parts[2];

    return {
      header,
      payload,
      signature,
      raw: token
    };
  } catch (error) {
    throw new Error(`Failed to parse token: ${error.message}`);
  }
}

/**
 * Extract payload from JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} - Token payload or null if invalid
 */
export function getTokenPayload(token) {
  try {
    const parsed = parseJwtToken(token);
    return parsed.payload;
  } catch (error) {
    console.error('[JWT Utils] Error extracting payload:', error);
    return null;
  }
}

/**
 * Extract header from JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} - Token header or null if invalid
 */
export function getTokenHeader(token) {
  try {
    const parsed = parseJwtToken(token);
    return parsed.header;
  } catch (error) {
    console.error('[JWT Utils] Error extracting header:', error);
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @param {number} bufferSeconds - Buffer time in seconds (default: 0)
 * @returns {boolean} - True if expired
 */
export function isTokenExpired(token, bufferSeconds = 0) {
  try {
    const payload = getTokenPayload(token);

    if (!payload || !payload.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTime = payload.exp - bufferSeconds;

    return currentTime >= expiryTime;
  } catch (error) {
    console.error('[JWT Utils] Error checking expiry:', error);
    return true;
  }
}

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiry date or null
 */
export function getTokenExpiryDate(token) {
  try {
    const payload = getTokenPayload(token);

    if (!payload || !payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  } catch (error) {
    console.error('[JWT Utils] Error getting expiry date:', error);
    return null;
  }
}

/**
 * Get time remaining until token expires
 * @param {string} token - JWT token
 * @returns {number} - Seconds remaining, 0 if expired or invalid
 */
export function getTimeUntilExpiry(token) {
  try {
    const payload = getTokenPayload(token);

    if (!payload || !payload.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = payload.exp - currentTime;

    return Math.max(0, remaining);
  } catch (error) {
    console.error('[JWT Utils] Error calculating time until expiry:', error);
    return 0;
  }
}

/**
 * Format time remaining as human-readable string
 * @param {number} seconds - Seconds remaining
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {string} - Formatted time string
 */
export function formatTimeRemaining(seconds, lang = 'en') {
  if (seconds <= 0) {
    return lang === 'ar' ? 'منتهي الصلاحية' : 'Expired';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (lang === 'ar') {
    if (days > 0) return `${days} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    if (minutes > 0) return `${minutes} دقيقة`;
    return `${secs} ثانية`;
  } else {
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${secs}s`;
  }
}

/**
 * Extract user information from token
 * @param {string} token - JWT token
 * @returns {Object|null} - User info or null
 */
export function getUserFromToken(token) {
  try {
    const payload = getTokenPayload(token);

    if (!payload) {
      return null;
    }

    // Extract common user fields
    return {
      id: payload.id || payload.sub || payload.user_id || null,
      phone: payload.phone || payload.mobile || null,
      email: payload.email || null,
      name: payload.name || payload.full_name || null,
      role: payload.role || payload.user_role || 'member',
      ...payload // Include all other fields
    };
  } catch (error) {
    console.error('[JWT Utils] Error extracting user:', error);
    return null;
  }
}

/**
 * Check if token has specific role
 * @param {string} token - JWT token
 * @param {string} role - Role to check
 * @returns {boolean} - True if has role
 */
export function hasRole(token, role) {
  try {
    const user = getUserFromToken(token);

    if (!user || !user.role) {
      return false;
    }

    // Handle both single role and array of roles
    if (Array.isArray(user.role)) {
      return user.role.includes(role);
    }

    return user.role === role;
  } catch (error) {
    console.error('[JWT Utils] Error checking role:', error);
    return false;
  }
}

/**
 * Validate token structure (does not verify signature)
 * @param {string} token - JWT token
 * @returns {Object} - Validation result
 */
export function validateTokenStructure(token) {
  const result = {
    valid: false,
    errors: []
  };

  try {
    // Check token exists
    if (!token || typeof token !== 'string') {
      result.errors.push('Token must be a non-empty string');
      return result;
    }

    // Check token has 3 parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      result.errors.push('Token must have 3 parts (header.payload.signature)');
      return result;
    }

    // Parse token
    const parsed = parseJwtToken(token);

    // Validate header
    if (!parsed.header.alg) {
      result.errors.push('Header missing algorithm (alg)');
    }

    if (!parsed.header.typ || parsed.header.typ !== 'JWT') {
      result.errors.push('Header type (typ) must be JWT');
    }

    // Validate payload
    if (!parsed.payload.exp) {
      result.errors.push('Payload missing expiry (exp)');
    }

    if (!parsed.payload.iat) {
      result.errors.push('Payload missing issued-at (iat)');
    }

    // Check if expired
    if (isTokenExpired(token)) {
      result.errors.push('Token is expired');
    }

    // Valid if no errors
    result.valid = result.errors.length === 0;

    return result;

  } catch (error) {
    result.errors.push(`Parsing error: ${error.message}`);
    return result;
  }
}

/**
 * Create mock JWT token (for development/testing)
 * @param {Object} payload - Token payload
 * @param {number} expiryDays - Days until expiry
 * @returns {string} - Mock JWT token
 */
export function createMockToken(payload, expiryDays = 7) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const fullPayload = {
    iat: now,
    exp: now + (expiryDays * 24 * 60 * 60),
    mock: true,
    ...payload
  };

  const headerEncoded = base64urlEncode(JSON.stringify(header));
  const payloadEncoded = base64urlEncode(JSON.stringify(fullPayload));
  const signature = base64urlEncode('mock_signature_' + Date.now());

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Sanitize token for logging (hides signature)
 * @param {string} token - JWT token
 * @returns {string} - Sanitized token
 */
export function sanitizeTokenForLogging(token) {
  if (!token || typeof token !== 'string') {
    return '[Invalid Token]';
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    return '[Malformed Token]';
  }

  return `${parts[0]}.${parts[1]}.[SIGNATURE_HIDDEN]`;
}

/**
 * Compare two tokens
 * @param {string} token1 - First token
 * @param {string} token2 - Second token
 * @returns {boolean} - True if tokens are identical
 */
export function compareTokens(token1, token2) {
  if (!token1 || !token2) {
    return false;
  }

  return token1 === token2;
}

// Default export with all utilities
export default {
  parseJwtToken,
  getTokenPayload,
  getTokenHeader,
  isTokenExpired,
  getTokenExpiryDate,
  getTimeUntilExpiry,
  formatTimeRemaining,
  getUserFromToken,
  hasRole,
  validateTokenStructure,
  createMockToken,
  sanitizeTokenForLogging,
  compareTokens
};
