/**
 * JWT Token Validation Tests
 * Phase 2: Authentication Testing - JWT Validation (5 tests)
 */

import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

describe('JWT Token Validation Tests', () => {
  const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

  describe('Token Structure Validation', () => {
    test('should validate correct JWT structure with all required claims', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        role: 'user'
      };

      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
      const decoded = jwt.verify(token, SECRET_KEY);

      expect(decoded).toHaveProperty('userId', '123');
      expect(decoded).toHaveProperty('email', 'test@example.com');
      expect(decoded).toHaveProperty('role', 'user');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });

    test('should reject token with invalid signature', () => {
      const payload = { userId: '123' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      expect(() => {
        jwt.verify(token, SECRET_KEY);
      }).toThrow('invalid signature');
    });

    test('should reject malformed JWT token', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => {
        jwt.verify(malformedToken, SECRET_KEY);
      }).toThrow();
    });

    test('should validate token with custom claims and audience', () => {
      const payload = {
        userId: '123',
        permissions: ['read', 'write'],
        audience: 'alshuail-api'
      };

      const token = jwt.sign(payload, SECRET_KEY, {
        expiresIn: '1h',
        audience: 'alshuail-api'
      });

      const decoded = jwt.verify(token, SECRET_KEY, {
        audience: 'alshuail-api'
      });

      expect(decoded.permissions).toEqual(['read', 'write']);
      expect(decoded.audience).toBe('alshuail-api');
    });

    test('should handle tokens with different algorithms', () => {
      const payload = { userId: '123' };

      // HS256 (default)
      const hs256Token = jwt.sign(payload, SECRET_KEY, {
        algorithm: 'HS256',
        expiresIn: '1h'
      });

      const decoded = jwt.verify(hs256Token, SECRET_KEY, {
        algorithms: ['HS256']
      });

      expect(decoded.userId).toBe('123');

      // Should reject if algorithm doesn't match
      expect(() => {
        jwt.verify(hs256Token, SECRET_KEY, {
          algorithms: ['HS512']
        });
      }).toThrow();
    });
  });
});