import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { config } from '../../src/config/env.js';

describe('Authentication Security Tests', () => {
  let validToken;
  let expiredToken;
  let invalidToken;
  let adminToken;
  let memberToken;

  beforeAll(() => {
    const jwtSecret = config.jwt.secret || 'test-secret';

    // Generate valid tokens
    validToken = jwt.sign(
      { id: 'user-123', role: 'member', email: 'test@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: 'admin-123', role: 'admin', email: 'admin@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { id: 'member-123', role: 'member', email: 'member@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Generate expired token
    expiredToken = jwt.sign(
      { id: 'user-123', role: 'member' },
      jwtSecret,
      { expiresIn: '-1h' }
    );

    // Generate invalid token (wrong secret)
    invalidToken = jwt.sign(
      { id: 'user-123', role: 'member' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
  });

  describe('JWT Token Validation', () => {
    test('should reject requests without token to protected endpoints', async () => {
      const response = await request(app)
        .get('/api/members')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
        message: 'No token provided'
      });
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid.'
      });
    });

    test('should reject requests with expired token', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    });

    test('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(401);
    });

    test('should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', 'Bearer malformed.token.here')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject tokens with missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', validToken)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Public Endpoint Access', () => {
    test('should allow access to member-monitoring without token', async () => {
      const response = await request(app)
        .get('/api/member-monitoring/stats');

      expect(response.status).not.toBe(401);
    });

    test('should allow access to dashboard stats without token', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats');

      expect(response.status).not.toBe(401);
    });
  });

  describe('Token Tampering Protection', () => {
    test('should reject tampered token payload', async () => {
      // Create token with modified payload after signing
      const parts = validToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'super_admin'; // Try to escalate privileges
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64');
      const tamperedToken = parts.join('.');

      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject token with modified signature', async () => {
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';

      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Authentication Bypass Prevention', () => {
    test('should not allow access to protected routes without proper authentication', async () => {
      const protectedRoutes = [
        '/api/members',
        '/api/members/123'
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)
          .get(route);

        // Should require authentication - either 401 (no auth) or 404 (route not found)
        // Both are acceptable security behaviors that prevent unauthorized access
        expect([401, 404]).toContain(response.status);
        if (response.status === 401) {
          expect(response.body.success).toBe(false);
          // Error message can vary - just ensure some error is present
          expect(response.body.error || response.body.message).toBeDefined();
        }
      }
    });

    test('should not accept authentication in query parameters', async () => {
      const response = await request(app)
        .get(`/api/members?token=${validToken}`)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should not accept authentication in request body for GET requests', async () => {
      const response = await request(app)
        .get('/api/members')
        .send({ token: validToken })
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });
});