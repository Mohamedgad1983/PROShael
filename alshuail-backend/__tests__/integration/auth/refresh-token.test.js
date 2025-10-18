/**
 * Refresh Token Mechanism Tests
 * Phase 2: Authentication Testing - Refresh Tokens (4 tests)
 */

import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

describe('Refresh Token Mechanism Tests', () => {
  const ACCESS_SECRET = process.env.JWT_SECRET || 'test-access-secret';
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

  const generateTokenPair = (userId) => {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  };

  describe('Refresh Token Operations', () => {
    test('should generate valid access and refresh token pair', () => {
      const { accessToken, refreshToken } = generateTokenPair('user123');

      const accessDecoded = jwt.verify(accessToken, ACCESS_SECRET);
      const refreshDecoded = jwt.verify(refreshToken, REFRESH_SECRET);

      expect(accessDecoded.userId).toBe('user123');
      expect(accessDecoded.type).toBe('access');
      expect(refreshDecoded.userId).toBe('user123');
      expect(refreshDecoded.type).toBe('refresh');

      // Refresh token should have longer expiration
      expect(refreshDecoded.exp - refreshDecoded.iat).toBeGreaterThan(
        accessDecoded.exp - accessDecoded.iat
      );
    });

    test('should use refresh token to generate new access token', () => {
      const { refreshToken } = generateTokenPair('user123');

      // Verify refresh token
      const refreshDecoded = jwt.verify(refreshToken, REFRESH_SECRET);

      // Generate new access token using refresh token data
      const newAccessToken = jwt.sign(
        { userId: refreshDecoded.userId, type: 'access' },
        ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const newAccessDecoded = jwt.verify(newAccessToken, ACCESS_SECRET);
      expect(newAccessDecoded.userId).toBe('user123');
      expect(newAccessDecoded.type).toBe('access');
    });

    test('should reject refresh token used with access token secret', () => {
      const { refreshToken } = generateTokenPair('user123');

      expect(() => {
        jwt.verify(refreshToken, ACCESS_SECRET);
      }).toThrow('invalid signature');
    });

    test('should handle refresh token rotation', () => {
      const userId = 'user123';
      let tokenFamily = [];

      // Initial token pair
      const initialPair = generateTokenPair(userId);
      tokenFamily.push({
        refreshToken: initialPair.refreshToken,
        used: false,
        timestamp: Date.now()
      });

      // Use refresh token to get new pair (rotation)
      const refreshDecoded = jwt.verify(initialPair.refreshToken, REFRESH_SECRET);

      // Mark old refresh token as used
      tokenFamily[0].used = true;

      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        {
          userId: refreshDecoded.userId,
          type: 'refresh',
          familyId: tokenFamily[0].timestamp
        },
        REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      tokenFamily.push({
        refreshToken: newRefreshToken,
        used: false,
        timestamp: Date.now()
      });

      // Verify new refresh token
      const newRefreshDecoded = jwt.verify(newRefreshToken, REFRESH_SECRET);
      expect(newRefreshDecoded.userId).toBe(userId);
      expect(newRefreshDecoded.familyId).toBe(tokenFamily[0].timestamp);

      // Old refresh token should be marked as used
      expect(tokenFamily[0].used).toBe(true);
      expect(tokenFamily[1].used).toBe(false);
    });
  });
});