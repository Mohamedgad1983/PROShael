/**
 * Authentication Edge Cases Tests
 * Phase 2: Authentication Testing - Edge Cases (6 tests)
 */

import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

describe('Authentication Edge Cases Tests', () => {
  const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';

  describe('Edge Case Scenarios', () => {
    test('should handle concurrent token generation for same user', () => {
      const userId = 'user123';
      const tokens = [];

      // Generate multiple tokens concurrently
      for (let i = 0; i < 5; i++) {
        const token = jwt.sign(
          { userId, sessionId: `session-${i}`, timestamp: Date.now() },
          SECRET_KEY,
          { expiresIn: '1h' }
        );
        tokens.push(token);
      }

      // All tokens should be valid and different
      const decodedTokens = tokens.map(token => jwt.verify(token, SECRET_KEY));

      expect(decodedTokens).toHaveLength(5);
      decodedTokens.forEach(decoded => {
        expect(decoded.userId).toBe(userId);
      });

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5);
    });

    test('should handle token with special characters in payload', () => {
      const payload = {
        userId: 'user-123-@#$%',
        email: 'test+user@example.com',
        name: 'أحمد محمد', // Arabic name
        role: 'admin/user',
        metadata: {
          'key-with-dash': 'value',
          'key.with.dots': 'value',
          'key@with#special': 'value'
        }
      };

      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
      const decoded = jwt.verify(token, SECRET_KEY);

      expect(decoded.userId).toBe('user-123-@#$%');
      expect(decoded.name).toBe('أحمد محمد');
      expect(decoded.metadata['key@with#special']).toBe('value');
    });

    test('should handle very large payload in token', () => {
      const largePayload = {
        userId: 'user123',
        permissions: Array(100).fill(0).map((_, i) => `permission_${i}`),
        metadata: {
          description: 'x'.repeat(1000), // 1KB string
          tags: Array(50).fill(0).map((_, i) => `tag_${i}`)
        }
      };

      const token = jwt.sign(largePayload, SECRET_KEY, { expiresIn: '1h' });
      expect(token.length).toBeGreaterThan(1000);

      const decoded = jwt.verify(token, SECRET_KEY);
      expect(decoded.permissions).toHaveLength(100);
      expect(decoded.metadata.description.length).toBe(1000);
    });

    test('should handle token verification with wrong secret variations', () => {
      const payload = { userId: '123' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      const wrongSecrets = [
        SECRET_KEY.toUpperCase(),
        SECRET_KEY.toLowerCase(),
        SECRET_KEY + ' ',
        ' ' + SECRET_KEY,
        SECRET_KEY.substring(0, SECRET_KEY.length - 1),
        ''
      ];

      wrongSecrets.forEach(wrongSecret => {
        if (wrongSecret !== SECRET_KEY) {
          expect(() => {
            jwt.verify(token, wrongSecret);
          }).toThrow();
        }
      });
    });

    test('should handle rapid token refresh scenario', () => {
      jest.useFakeTimers();
      const userId = 'user123';
      const refreshHistory = [];

      // Simulate rapid token refresh
      for (let i = 0; i < 10; i++) {
        const token = jwt.sign(
          { userId, refreshCount: i, timestamp: Date.now() },
          SECRET_KEY,
          { expiresIn: '15m' }
        );

        refreshHistory.push({
          token,
          refreshedAt: Date.now(),
          refreshCount: i
        });

        // Advance time by 1 minute
        jest.advanceTimersByTime(60 * 1000);
      }

      // Verify all tokens in history
      refreshHistory.forEach((item, index) => {
        const decoded = jwt.decode(item.token); // Using decode since tokens might be expired
        expect(decoded.refreshCount).toBe(index);
        expect(decoded.userId).toBe(userId);
      });

      expect(refreshHistory).toHaveLength(10);
      jest.useRealTimers();
    });

    test('should handle token with missing optional claims gracefully', () => {
      // Minimal payload
      const minimalPayload = { userId: '123' };
      const minimalToken = jwt.sign(minimalPayload, SECRET_KEY, { expiresIn: '1h' });

      // Full payload
      const fullPayload = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
        metadata: { key: 'value' }
      };
      const fullToken = jwt.sign(fullPayload, SECRET_KEY, { expiresIn: '1h' });

      // Both should verify successfully
      const minimalDecoded = jwt.verify(minimalToken, SECRET_KEY);
      const fullDecoded = jwt.verify(fullToken, SECRET_KEY);

      expect(minimalDecoded.userId).toBe('123');
      expect(minimalDecoded.email).toBeUndefined();
      expect(minimalDecoded.role).toBeUndefined();

      expect(fullDecoded.userId).toBe('123');
      expect(fullDecoded.email).toBe('test@example.com');
      expect(fullDecoded.role).toBe('admin');
    });
  });
});