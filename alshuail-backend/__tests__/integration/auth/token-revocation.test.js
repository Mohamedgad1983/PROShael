/**
 * Token Revocation Tests
 * Phase 2: Authentication Testing - Token Revocation (3 tests)
 */

import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

describe('Token Revocation Tests', () => {
  const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';
  const revokedTokens = new Set();

  const isTokenRevoked = (token) => {
    const decoded = jwt.decode(token);
    return revokedTokens.has(decoded?.jti) || revokedTokens.has(token);
  };

  const revokeToken = (token) => {
    const decoded = jwt.decode(token);
    if (decoded?.jti) {
      revokedTokens.add(decoded.jti);
    } else {
      revokedTokens.add(token);
    }
  };

  beforeEach(() => {
    revokedTokens.clear();
  });

  describe('Token Revocation Scenarios', () => {
    test('should revoke token by JTI (JWT ID)', () => {
      const payload = {
        userId: '123',
        jti: 'unique-token-id-123'
      };

      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      // Token should be valid initially
      expect(isTokenRevoked(token)).toBe(false);

      // Revoke the token
      revokeToken(token);

      // Token should now be revoked
      expect(isTokenRevoked(token)).toBe(true);
    });

    test('should handle revocation of tokens without JTI', () => {
      const payload = { userId: '123' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      expect(isTokenRevoked(token)).toBe(false);

      // Revoke token by full token string
      revokeToken(token);

      expect(isTokenRevoked(token)).toBe(true);
    });

    test('should maintain revocation list for multiple tokens', () => {
      const tokens = [];

      // Create multiple tokens
      for (let i = 0; i < 5; i++) {
        const token = jwt.sign(
          { userId: `user${i}`, jti: `token-${i}` },
          SECRET_KEY,
          { expiresIn: '1h' }
        );
        tokens.push(token);
      }

      // Revoke specific tokens
      revokeToken(tokens[1]);
      revokeToken(tokens[3]);

      // Check revocation status
      expect(isTokenRevoked(tokens[0])).toBe(false);
      expect(isTokenRevoked(tokens[1])).toBe(true);
      expect(isTokenRevoked(tokens[2])).toBe(false);
      expect(isTokenRevoked(tokens[3])).toBe(true);
      expect(isTokenRevoked(tokens[4])).toBe(false);

      // Verify revocation list size
      expect(revokedTokens.size).toBe(2);
    });
  });
});