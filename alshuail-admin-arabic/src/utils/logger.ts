/**
 * Environment-Aware Logger Utility
 * Replaces console.log statements with production-safe logging
 *
 * Features:
 * - Environment-aware (debug/info only in development)
 * - Structured log format with timestamps
 * - Error tracking integration ready
 * - Zero overhead in production for debug/info logs
 *
 * @version 1.0.0
 * @date 2025-01-13
 */


type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Format timestamp for logs
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Debug logging - only in development
   * Use for detailed debugging information
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info logging - only in development
   * Use for general informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  /**
   * Warning logging - always logged
   * Use for recoverable issues that need attention
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  /**
   * Error logging - always logged
   * Use for errors that need immediate attention
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };

    console.error(this.formatMessage('error', message, errorContext));

    // Integration point for error tracking services (Sentry, LogRocket, etc.)
    if (this.isProduction && typeof window !== 'undefined') {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error, { extra: errorContext });
    }
  }

  /**
   * Group logging - for organizing related logs
   */
  group(label: string, collapsed: boolean = false): void {
    if (this.isDevelopment) {
      if (collapsed) {
        console.groupCollapsed(`[GROUP] ${label}`);
      } else {
        console.group(`[GROUP] ${label}`);
      }
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Table logging - for structured data visualization
   */
  table(data: any[], columns?: string[]): void {
    if (this.isDevelopment) {
      if (columns) {
        console.table(data, columns);
      } else {
        console.table(data);
      }
    }
  }

  /**
   * Performance timing
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(`[TIMER] ${label}`);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(`[TIMER] ${label}`);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for context
export type { LogContext };

// Default export
export default logger;
