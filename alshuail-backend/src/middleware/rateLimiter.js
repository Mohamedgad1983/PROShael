/**
 * Rate Limiting Middleware
 * Protects report endpoints from abuse
 */

import { createErrorResponse } from '../utils/errorCodes.js';
import { log } from '../utils/logger.js';

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.blacklist = new Set();

    // Configuration for different endpoint types
    this.limits = {
      // Report generation: 10 requests per hour per user
      reportGeneration: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10,
        message: 'Report generation limit exceeded. Maximum 10 reports per hour'
      },
      // Report export: 20 requests per hour per user
      reportExport: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 20,
        message: 'Report export limit exceeded. Maximum 20 exports per hour'
      },
      // Financial summary: 30 requests per hour per user
      financialSummary: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 30,
        message: 'Financial summary limit exceeded. Maximum 30 requests per hour'
      },
      // General API: 100 requests per minute
      general: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        message: 'Too many requests. Please try again later'
      },
      // Forensic reports: 5 requests per hour (sensitive data)
      forensic: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5,
        message: 'Forensic report limit exceeded. Maximum 5 forensic reports per hour'
      }
    };

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get client identifier
   */
  getClientId(req) {
    // Prioritize authenticated user ID
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }

    // Fallback to IP address
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ip_${ip}`;
  }

  /**
   * Check if client is blacklisted
   */
  isBlacklisted(clientId) {
    return this.blacklist.has(clientId);
  }

  /**
   * Add client to blacklist
   */
  blacklistClient(clientId, duration = 24 * 60 * 60 * 1000) {
    this.blacklist.add(clientId);

    // Auto-remove from blacklist after duration
    setTimeout(() => {
      this.blacklist.delete(clientId);
    }, duration);
  }

  /**
   * Track request and check limits
   */
  checkLimit(clientId, limitType = 'general') {
    const limit = this.limits[limitType] || this.limits.general;
    const now = Date.now();
    const key = `${clientId}_${limitType}`;

    if (!this.requests.has(key)) {
      this.requests.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now
      });
      return { allowed: true, remaining: limit.maxRequests - 1 };
    }

    const clientRequests = this.requests.get(key);
    const timeElapsed = now - clientRequests.firstRequest;

    // Reset if window has passed
    if (timeElapsed > limit.windowMs) {
      this.requests.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now
      });
      return { allowed: true, remaining: limit.maxRequests - 1 };
    }

    // Increment request count
    clientRequests.count++;
    clientRequests.lastRequest = now;

    // Check if limit exceeded
    if (clientRequests.count > limit.maxRequests) {
      // Check for potential abuse (3x over limit)
      if (clientRequests.count > limit.maxRequests * 3) {
        this.blacklistClient(clientId);
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(clientRequests.firstRequest + limit.windowMs)
      };
    }

    return {
      allowed: true,
      remaining: limit.maxRequests - clientRequests.count
    };
  }

  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();

    for (const [key, data] of this.requests.entries()) {
      // Find the limit type from the key
      const limitType = key.split('_').slice(-1)[0];
      const limit = this.limits[limitType] || this.limits.general;

      // Remove entries older than their window
      if (now - data.firstRequest > limit.windowMs) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Get rate limit stats for monitoring
   */
  getStats() {
    return {
      activeClients: this.requests.size,
      blacklistedClients: this.blacklist.size,
      memoryUsage: JSON.stringify([...this.requests.entries()]).length
    };
  }

  /**
   * Reset limits for a specific client (admin function)
   */
  resetClient(clientId) {
    for (const key of this.requests.keys()) {
      if (key.startsWith(clientId)) {
        this.requests.delete(key);
      }
    }
    this.blacklist.delete(clientId);
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

/**
 * Express middleware factory for rate limiting
 */
export const createRateLimitMiddleware = (limitType = 'general') => {
  return (req, res, next) => {
    const clientId = rateLimiter.getClientId(req);

    // Check if client is blacklisted
    if (rateLimiter.isBlacklisted(clientId)) {
      return res.status(403).json(createErrorResponse('RATE_LIMIT_EXCEEDED', {
        message: 'Access temporarily blocked due to excessive requests',
        messageAr: 'تم حظر الوصول مؤقتاً بسبب الطلبات المفرطة'
      }));
    }

    // Check rate limit
    const limitCheck = rateLimiter.checkLimit(clientId, limitType);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimiter.limits[limitType].maxRequests,
      'X-RateLimit-Remaining': Math.max(0, limitCheck.remaining),
      'X-RateLimit-Reset': limitCheck.resetTime?.toISOString()
    });

    if (!limitCheck.allowed) {
      // Log potential abuse
      log.warn('Rate limit exceeded', { clientId, limitType });

      return res.status(429).json(createErrorResponse('RATE_LIMIT_EXCEEDED', {
        message: rateLimiter.limits[limitType].message,
        resetTime: limitCheck.resetTime,
        limitType: limitType
      }));
    }

    next();
  };
};

/**
 * Advanced rate limiting with dynamic limits based on user role
 */
export const createDynamicRateLimitMiddleware = (baseType = 'general') => {
  return (req, res, next) => {
    const _clientId = rateLimiter.getClientId(req);
    const userRole = req.user?.role;

    // Adjust limits based on user role
    const limitType = baseType;
    let multiplier = 1;

    switch (userRole) {
      case 'super_admin':
        multiplier = 5; // 5x higher limits
        break;
      case 'financial_manager':
        multiplier = 3; // 3x higher limits
        break;
      case 'operational_manager':
        multiplier = 2; // 2x higher limits
        break;
      case 'administrative_member':
        multiplier = 1.5; // 1.5x higher limits
        break;
      default:
        multiplier = 1; // Standard limits
    }

    // Apply multiplier to limits
    const originalLimit = rateLimiter.limits[limitType].maxRequests;
    rateLimiter.limits[limitType].maxRequests = Math.floor(originalLimit * multiplier);

    // Apply rate limiting
    const middleware = createRateLimitMiddleware(limitType);
    middleware(req, res, () => {
      // Reset to original limit
      rateLimiter.limits[limitType].maxRequests = originalLimit;
      next();
    });
  };
};

/**
 * IP-based rate limiting for unauthenticated endpoints
 */
export const createIPRateLimitMiddleware = (requestsPerMinute = 10) => {
  const ipLimiter = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    if (!ipLimiter.has(ip)) {
      ipLimiter.set(ip, {
        count: 1,
        firstRequest: now
      });
      return next();
    }

    const ipData = ipLimiter.get(ip);
    const timeElapsed = now - ipData.firstRequest;

    if (timeElapsed > windowMs) {
      ipLimiter.set(ip, {
        count: 1,
        firstRequest: now
      });
      return next();
    }

    ipData.count++;

    if (ipData.count > requestsPerMinute) {
      return res.status(429).json(createErrorResponse('RATE_LIMIT_EXCEEDED'));
    }

    next();
  };
};

/**
 * Endpoint-specific rate limits
 */
export const rateLimits = {
  reportGeneration: createRateLimitMiddleware('reportGeneration'),
  reportExport: createRateLimitMiddleware('reportExport'),
  financialSummary: createRateLimitMiddleware('financialSummary'),
  forensicReport: createRateLimitMiddleware('forensic'),
  general: createRateLimitMiddleware('general')
};

// Export for monitoring and admin functions
export const getRateLimiterStats = () => rateLimiter.getStats();
export const resetClientLimits = (clientId) => rateLimiter.resetClient(clientId);

export default {
  createRateLimitMiddleware,
  createDynamicRateLimitMiddleware,
  createIPRateLimitMiddleware,
  rateLimits,
  getRateLimiterStats,
  resetClientLimits
};