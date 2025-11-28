/**
 * Integration Test Setup
 * Loads real database credentials for integration tests
 */

import { jest } from '@jest/globals';
import { config } from 'dotenv';

// Load real .env file for integration tests
config({ path: '.env' });

// Override test environment
process.env.NODE_ENV = 'test';

// Keep real Supabase credentials from .env (don't override them)
// Just ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'alshuail-super-secure-jwt-secret-key-2024-production-ready-32chars';
}

// Test config
process.env.PORT = '5555';
process.env.ALLOW_TEST_MEMBER_LOGINS = 'true';

// Reduce console noise but keep important messages
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  // Keep info, warn, and error for integration test debugging
  info: originalConsole.info,
  warn: originalConsole.warn,
  error: originalConsole.error,
};

// Longer timeout for database operations
jest.setTimeout(30000);

// Setup and teardown
beforeAll(async () => {
  console.info('🔌 Integration tests starting with real database...');
});

afterAll(async () => {
  console.info('✅ Integration tests completed');
});

beforeEach(() => {
  jest.clearAllMocks();
});
