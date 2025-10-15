/**
 * Professional Logging Service using Winston
 * Replaces console.log statements across the backend
 */
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  return config.isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define transports based on environment
const transports = [
  // Console transport for all environments (Render captures this)
  new winston.transports.Console(),
];

// Only add file transports in development (not in production to improve performance)
if (config.isDevelopment) {
  transports.push(
    // File transport for errors
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create logs directory only in development (file logging disabled in production for performance)
if (config.isDevelopment) {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * Logging utility functions with context
 */
export const log = {
  // Error logging
  error: (message, meta = {}) => {
    logger.error(message, meta);
  },

  // Warning logging
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  // Info logging
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  // HTTP request logging
  http: (message, meta = {}) => {
    logger.http(message, meta);
  },

  // Debug logging (only in development)
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },

  // API request/response logging
  api: (method, url, status, duration) => {
    const message = `${method} ${url} ${status} - ${duration}ms`;
    if (status >= 500) {
      logger.error(message);
    } else if (status >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  },

  // Database query logging
  db: (operation, table, duration) => {
    logger.debug(`DB ${operation} on ${table} - ${duration}ms`);
  },

  // Authentication logging
  auth: (action, user, success) => {
    const status = success ? '✅' : '❌';
    logger.info(`${status} Auth: ${action} - User: ${user || 'unknown'}`);
  },
};

// Export default logger for direct access
export default logger;
