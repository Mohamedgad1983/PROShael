/**
 * Jest Test Setup
 * Configures test environment, mocks, and global test utilities
 */

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.PORT = '5555';
process.env.ALLOW_TEST_MEMBER_LOGINS = 'true';
process.env.TEST_MEMBER_PASSWORD = 'test123';

// Suppress console logs during tests (except errors)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error and other methods
  error: console.error,
};

// Global test timeout
jest.setTimeout(10000);

// Setup and teardown hooks
beforeAll(() => {
  // Global setup before all tests
});

afterAll(() => {
  // Global cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});
