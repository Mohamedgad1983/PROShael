// Jest Configuration for Al-Shuail Backend Tests
export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testTimeout: 30000,
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  }
};
