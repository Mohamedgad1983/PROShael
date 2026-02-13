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
import winston from 'winston';

// Minimal logger for config module (cannot import from logger.js due to circular dependency)
const configLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [new winston.transports.Console()],
});

// Load environment variables from .env file
dotenv.config();

/**
 * Required environment variables for production
 * NOTE: SUPABASE_* variables are DEPRECATED - system uses VPS PostgreSQL (213.199.62.185)
 *       Database connection uses DB_* variables via pgQueryBuilder
 */
const REQUIRED_PRODUCTION_VARS = [
  'JWT_SECRET'
  // DB_HOST, DB_NAME, DB_USER, DB_PASSWORD are used by pgQueryBuilder.js
  // but have sensible defaults for development
];

/**
 * Required environment variables for all environments
 * NOTE: No variables strictly required - pgQueryBuilder has defaults for development
 */
const REQUIRED_VARS = [
  // Previously required SUPABASE_URL and SUPABASE_ANON_KEY
  // Now using VPS PostgreSQL via pgQueryBuilder - no Supabase requirements
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
      configLogger.error(`FATAL ERROR: ${errorMessage}`);
      configLogger.error('Application cannot start in production without these variables.');
      throw new Error(errorMessage);
    } else {
      configLogger.warn(`WARNING: ${errorMessage}`);
      configLogger.warn('Some features may not work correctly in development mode.');
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

  // Database Configuration (VPS PostgreSQL via services/database.js)
  // Prefer DATABASE_URL; DB_* vars are deprecated fallbacks
  database: {
    url: getString('DATABASE_URL', ''),
  },

  // DEPRECATED: Individual DB_* vars (use DATABASE_URL instead)
  // Kept temporarily for backward compatibility during migration
  postgres: {
    host: getString('DB_HOST', 'localhost'),
    port: getInt('DB_PORT', 5432),
    database: getString('DB_NAME', 'alshuail_db'),
    user: getString('DB_USER', 'alshuail'),
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

  // Feature Flags
  featureFlags: {
    // Password authentication feature flag - allows instant rollback without deployment
    passwordAuthEnabled: getBoolean('PASSWORD_AUTH_ENABLED', true),
    // OTP-only mode (legacy) - always available as fallback
    otpAuthEnabled: getBoolean('OTP_AUTH_ENABLED', true),
  },

  // Firebase Cloud Messaging (Push Notifications)
  firebase: {
    projectId: getString('FIREBASE_PROJECT_ID'),
    clientEmail: getString('FIREBASE_CLIENT_EMAIL'),
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    enabled: !!(getString('FIREBASE_PROJECT_ID') && getString('FIREBASE_CLIENT_EMAIL') && getString('FIREBASE_PRIVATE_KEY')),
  },

  // Twilio (WhatsApp Notifications)
  twilio: {
    accountSid: getString('TWILIO_ACCOUNT_SID'),
    authToken: getString('TWILIO_AUTH_TOKEN'),
    phoneNumber: getString('TWILIO_PHONE_NUMBER'),
    enabled: !!(getString('TWILIO_ACCOUNT_SID') && getString('TWILIO_AUTH_TOKEN') && getString('TWILIO_PHONE_NUMBER')),
  },

  // Ultramsg (Easy WhatsApp API - Recommended)
  // Sign up: https://ultramsg.com
  // $39/month - Unlimited messages - No Docker needed
  ultramsg: {
    instanceId: getString('ULTRAMSG_INSTANCE_ID'),
    token: getString('ULTRAMSG_TOKEN'),
    enabled: !!(getString('ULTRAMSG_INSTANCE_ID') && getString('ULTRAMSG_TOKEN')),
  },
};

// Log configuration on startup (non-sensitive info only)
if (isDevelopment) {
  configLogger.info(`Environment Configuration Loaded: env=${config.env} port=${config.port} db=${config.database.url ? 'DATABASE_URL' : 'DB_* variables'} postgresHost=${config.postgres.host} jwtConfigured=${!!config.jwt.secret} redisEnabled=${config.redis.enabled} frontendUrl=${config.frontend.url} firebaseEnabled=${config.firebase.enabled} twilioEnabled=${config.twilio.enabled} ultramsgEnabled=${config.ultramsg.enabled} passwordAuthEnabled=${config.featureFlags.passwordAuthEnabled}`);
}

// Warn about missing optional but recommended variables
if (isProduction) {
  if (!config.redis.url) {
    configLogger.warn('REDIS_URL not configured. Caching will be disabled.');
  }
  if (!config.frontend.corsOrigin) {
    configLogger.warn('CORS_ORIGIN not configured. Using permissive CORS settings.');
  }
  if (!config.firebase.enabled) {
    configLogger.warn('Firebase credentials not configured. Push notifications will be disabled.');
  }
  if (!config.twilio.enabled && !config.ultramsg.enabled) {
    configLogger.warn('No WhatsApp service configured. OTP and notifications will be disabled.');
    configLogger.warn('Options: Set ULTRAMSG_INSTANCE_ID + ULTRAMSG_TOKEN (recommended) or: Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER');
  }
}

export default config;
