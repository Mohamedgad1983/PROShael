import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/__tests__/integration-setup.js'],
  testMatch: [
    '<rootDir>/__tests__/integration/**/*.test.js',
    '<rootDir>/__tests__/e2e/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/__mocks__/',
    '/__tests__/setup.js',
    '/__tests__/security/run-security-tests.js'
  ],
  testTimeout: 30000
};
