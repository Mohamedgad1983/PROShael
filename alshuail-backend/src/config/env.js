/**
 * Centralized Environment Configuration
 *
 * This module provides a single source of truth for all environment variables
 * with validation, type conversion, and sensible defaults.
 *
 * Benefits:
 * - Type safety and validation
 * - Easy testing and mocking
 * - Clear documentation of required variables
 * - Fail-fast on missing critical configuration
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Required environment variables for production
 */
const REQUIRED_PRODUCTION_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET'
];

/**
 * Required environment variables for all environments
 */
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

/**
 * Validate environment variables
 * @param {boolean} isProduction - Whether running in production
 */
function validateEnvironment(isProduction) {
  const requiredVars = isProduction ? REQUIRED_PRODUCTION_VARS : REQUIRED_VARS;
  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;

    if (isProduction) {
      console.error(`🚨 FATAL ERROR: ${errorMessage}`);
      console.error('Application cannot start in production without these variables.');
      throw new Error(errorMessage);
    } else {
      console.warn(`⚠️  WARNING: ${errorMessage}`);
      console.warn('Some features may not work correctly in development mode.');
    }
  }
}

/**
 * Get integer from environment variable with default
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not set
 * @returns {number}
 */
function getInt(key, defaultValue) {
  const value = process.env[key];
  if (!value) {return defaultValue;}
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get boolean from environment variable with default
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean}
 */
function getBoolean(key, defaultValue) {
  const value = process.env[key];
  if (!value) {return defaultValue;}
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get string from environment variable with default
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not set
 * @returns {string}
 */
function getString(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

// Determine environment
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isDevelopment = nodeEnv === 'development';
const isTest = nodeEnv === 'test';

// Validate before exporting
validateEnvironment(isProduction);

/**
 * Centralized configuration object
 */
export const config = {
  // Environment
  env: nodeEnv,
  isProduction,
  isDevelopment,
  isTest,

  // Server
  port: getInt('PORT', 5001),

  // Supabase Configuration
  supabase: {
    url: getString('SUPABASE_URL'),
    anonKey: getString('SUPABASE_ANON_KEY'),
    serviceKey: getString('SUPABASE_SERVICE_KEY'),
    // Legacy support for alternative key names
    serviceRoleKey: getString('SUPABASE_SERVICE_ROLE_KEY') || getString('SUPABASE_SERVICE_KEY'),
    key: getString('SUPABASE_KEY') || getString('SUPABASE_ANON_KEY'),
  },

  // JWT Configuration
  jwt: {
    secret: getString('JWT_SECRET', isDevelopment ? 'alshuail-dev-secret-2024-very-long-and-secure' : ''),
    adminTtl: getString('ADMIN_JWT_TTL', '7d'),
    memberTtl: getString('MEMBER_JWT_TTL', '30d'),
    secretKey: getString('SECRET_KEY') || getString('JWT_SECRET'), // Legacy support
  },

  // Frontend Configuration
  frontend: {
    url: getString('FRONTEND_URL', 'http://localhost:3002'),
    corsOrigin: getString('CORS_ORIGIN', isDevelopment ? '*' : ''),
  },

  // Database
  database: {
    url: getString('DATABASE_URL', ''), // For PostgreSQL direct connection if needed
  },

  // Redis (optional)
  redis: {
    url: getString('REDIS_URL', ''),
    enabled: !!getString('REDIS_URL'),
  },

  // Platform Detection
  platform: {
    isRender: getBoolean('RENDER', false),
  },

  // API Configuration
  api: {
    key: getString('API_KEY', ''),
  },

  // CSRF Configuration
  csrf: {
    secret: getString('CSRF_SECRET', isDevelopment ? 'alshuail-csrf-secret-dev-2024' : 'alshuail-csrf-secret-2025-secure-key'),
  },

  // Testing Configuration
  testing: {
    allowTestMemberLogins: getBoolean('ALLOW_TEST_MEMBER_LOGINS', isDevelopment),
    testMemberPassword: getString('TEST_MEMBER_PASSWORD', isDevelopment ? 'test123' : ''),
    password: getString('PASSWORD', ''), // Generic test password
  },
};

// Log configuration on startup (non-sensitive info only)
if (isDevelopment) {
  console.log('📋 Environment Configuration Loaded', {
    env: config.env,
    port: config.port,
    supabaseConfigured: !!config.supabase.url,
    jwtConfigured: !!config.jwt.secret,
    redisEnabled: config.redis.enabled,
    frontendUrl: config.frontend.url,
  });
}

// Warn about missing optional but recommended variables
if (isProduction) {
  if (!config.redis.url) {
    console.warn('⚠️  REDIS_URL not configured. Caching will be disabled.');
  }
  if (!config.frontend.corsOrigin) {
    console.warn('⚠️  CORS_ORIGIN not configured. Using permissive CORS settings.');
  }
}

export default config;
