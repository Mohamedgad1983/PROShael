/**
 * Jest Configuration for Al-Shuail Backend API
 * ES Modules support with comprehensive coverage settings
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // ES Modules support
  transform: {},

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverage: false, // Enable with --coverage flag
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/scripts/',
    'jest.config.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],

  // Coverage thresholds (aspirational - start low, increase gradually)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 50,
      statements: 50
    }
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // Module name mapper for mocking
  moduleNameMapper: {
    '^../utils/accessControl.js$': '<rootDir>/__tests__/__mocks__/accessControlMocks.js',
    '^../../utils/accessControl.js$': '<rootDir>/__tests__/__mocks__/accessControlMocks.js',
    '^../../../utils/accessControl.js$': '<rootDir>/__tests__/__mocks__/accessControlMocks.js'
  },
};
