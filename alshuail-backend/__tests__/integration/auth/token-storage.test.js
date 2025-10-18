/**
 * Token Storage and Retrieval Tests
 * Phase 2: Authentication Testing - Token Storage (4 tests)
 */

import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

describe('Token Storage and Retrieval Tests', () => {
  const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';

  // Simulate token storage
  class TokenStore {
    constructor() {
      this.store = new Map();
      this.sessionStore = new Map();
    }

    saveToken(userId, token, type = 'access') {
      if (!this.store.has(userId)) {
        this.store.set(userId, {});
      }
      this.store.get(userId)[type] = {
        token,
        savedAt: Date.now()
      };
    }

    getToken(userId, type = 'access') {
      return this.store.get(userId)?.[type];
    }

    saveSession(sessionId, tokenData) {
      this.sessionStore.set(sessionId, {
        ...tokenData,
        createdAt: Date.now()
      });
    }

    getSession(sessionId) {
      return this.sessionStore.get(sessionId);
    }

    clearUserTokens(userId) {
      this.store.delete(userId);
    }

    clearExpiredTokens() {
      for (const [userId, tokens] of this.store.entries()) {
        for (const [type, tokenData] of Object.entries(tokens)) {
          try {
            jwt.verify(tokenData.token, SECRET_KEY);
          } catch (err) {
            if (err.name === 'TokenExpiredError') {
              delete tokens[type];
            }
          }
        }
        if (Object.keys(tokens).length === 0) {
          this.store.delete(userId);
        }
      }
    }
  }

  describe('Token Storage Operations', () => {
    let tokenStore;

    beforeEach(() => {
      tokenStore = new TokenStore();
    });

    test('should store and retrieve access token', () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });

      tokenStore.saveToken(userId, token, 'access');

      const retrieved = tokenStore.getToken(userId, 'access');
      expect(retrieved.token).toBe(token);
      expect(retrieved.savedAt).toBeDefined();

      // Verify the retrieved token
      const decoded = jwt.verify(retrieved.token, SECRET_KEY);
      expect(decoded.userId).toBe(userId);
    });

    test('should store multiple token types for same user', () => {
      const userId = 'user123';
      const accessToken = jwt.sign({ userId, type: 'access' }, SECRET_KEY, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ userId, type: 'refresh' }, SECRET_KEY, { expiresIn: '7d' });

      tokenStore.saveToken(userId, accessToken, 'access');
      tokenStore.saveToken(userId, refreshToken, 'refresh');

      const retrievedAccess = tokenStore.getToken(userId, 'access');
      const retrievedRefresh = tokenStore.getToken(userId, 'refresh');

      expect(retrievedAccess.token).toBe(accessToken);
      expect(retrievedRefresh.token).toBe(refreshToken);

      // Verify both tokens
      const accessDecoded = jwt.verify(retrievedAccess.token, SECRET_KEY);
      const refreshDecoded = jwt.verify(retrievedRefresh.token, SECRET_KEY);

      expect(accessDecoded.type).toBe('access');
      expect(refreshDecoded.type).toBe('refresh');
    });

    test('should handle session-based token storage', () => {
      const sessionId = 'session-abc-123';
      const userId = 'user123';
      const token = jwt.sign({ userId, sessionId }, SECRET_KEY, { expiresIn: '1h' });

      tokenStore.saveSession(sessionId, {
        userId,
        token,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      const session = tokenStore.getSession(sessionId);
      expect(session.userId).toBe(userId);
      expect(session.token).toBe(token);
      expect(session.ipAddress).toBe('192.168.1.1');
      expect(session.createdAt).toBeDefined();

      // Verify session token
      const decoded = jwt.verify(session.token, SECRET_KEY);
      expect(decoded.sessionId).toBe(sessionId);
    });

    test('should clear expired tokens from storage', () => {
      jest.useFakeTimers();

      const user1 = 'user1';
      const user2 = 'user2';

      // Create tokens with different expiration times
      const expiredToken = jwt.sign({ userId: user1 }, SECRET_KEY, { expiresIn: '1s' });
      const validToken = jwt.sign({ userId: user2 }, SECRET_KEY, { expiresIn: '1h' });

      tokenStore.saveToken(user1, expiredToken, 'access');
      tokenStore.saveToken(user2, validToken, 'access');

      // Advance time to expire first token
      jest.advanceTimersByTime(2000);

      // Clear expired tokens
      tokenStore.clearExpiredTokens();

      // Check that expired token is removed
      expect(tokenStore.getToken(user1, 'access')).toBeUndefined();
      expect(tokenStore.getToken(user2, 'access')).toBeDefined();

      jest.useRealTimers();
    });
  });
});