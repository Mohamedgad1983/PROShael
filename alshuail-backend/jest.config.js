// Jest Configuration for Al-Shuail Backend Tests
export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  // Use integration setup for integration tests (loads real .env)
  setupFilesAfterEnv: ['<rootDir>/__tests__/integration-setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!src/scripts/**', // Exclude standalone scripts from coverage
    '!src/app.js' // Exclude app entry point
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/__mocks__/',
    '/__tests__/setup.js',
    '/__tests__/security/run-security-tests.js'
  ],
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testTimeout: 30000,
  verbose: true,
  // Run tests sequentially to avoid port conflicts (EADDRINUSE)
  maxWorkers: 1,
  // Force exit after tests complete to clean up hanging connections
  forceExit: true,
  // Detect open handles to help debug port issues
  detectOpenHandles: false,
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 20,
      statements: 20
    }
  }
};
