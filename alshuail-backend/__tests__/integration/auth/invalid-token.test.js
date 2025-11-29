/**
 * Invalid Token Scenarios Tests
 * Phase 2: Authentication Testing - Invalid Tokens (3 tests)
 */

import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

describe('Invalid Token Scenarios Tests', () => {
  const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';

  describe('Invalid Token Handling', () => {
    test('should reject empty or null token', () => {
      expect(() => jwt.verify('', SECRET_KEY)).toThrow();
      expect(() => jwt.verify(null, SECRET_KEY)).toThrow();
      expect(() => jwt.verify(undefined, SECRET_KEY)).toThrow();
    });

    test('should reject token with tampered payload', () => {
      const payload = { userId: '123', role: 'user' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      // Tamper with the token by changing payload
      const parts = token.split('.');
      const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      decodedPayload.role = 'admin'; // Tamper: change role
      parts[1] = Buffer.from(JSON.stringify(decodedPayload)).toString('base64');
      const tamperedToken = parts.join('.');

      expect(() => {
        jwt.verify(tamperedToken, SECRET_KEY);
      }).toThrow(/invalid (signature|token)/); // JWT library may return either message
    });

    test('should reject token with invalid format', () => {
      const invalidTokens = [
        'invalid.token',
        'a.b',
        'too.many.parts.in.token',
        '.',
        'notavalidtoken',
        btoa('{"userId":"123"}'), // Base64 but not JWT
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' // Only header
      ];

      invalidTokens.forEach(invalidToken => {
        expect(() => {
          jwt.verify(invalidToken, SECRET_KEY);
        }).toThrow();
      });
    });
  });
});