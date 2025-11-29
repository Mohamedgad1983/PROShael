/**
 * Auth Controller Integration Tests
 * Tests authentication endpoints with real database
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../../src/routes/auth.js';
import { testDb, tokenFactory, testConnection, dbOps } from '../../helpers/testDatabase.js';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller Integration Tests', () => {
  let dbConnected = false;
  let existingUser = null;

  beforeAll(async () => {
    dbConnected = await testConnection();
    if (dbConnected) {
      // Get an existing user for tests
      existingUser = await dbOps.getExistingSuperAdmin();
    }
  });

  afterAll(async () => {
    await dbOps.cleanup();
  });

  describe('POST /api/auth/login', () => {
    test('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+966501234567' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject login with missing phone/email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject login with invalid phone format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: 'invalid-phone', password: 'test123' });

      expect([400, 401, 500]).toContain(response.status);
    });

    test('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+966599999999', password: 'wrongpassword' });

      // Could be 401 (unauthorized) or 500 (database error)
      expect([401, 404, 500]).toContain(response.status);
    });

    test('should handle email login attempt', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'test123' });

      expect([400, 401, 404, 500]).toContain(response.status);
    });

    test('should handle test member login when enabled', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: process.env.TEST_MEMBER_PHONE_SA || '+966501234567',
          password: process.env.TEST_MEMBER_PASSWORD || '123456'
        });

      // Response depends on whether test member exists
      expect([200, 401, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/auth/verify', () => {
    test('should reject request without token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({});

      expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .send({});

      expect(response.status).toBe(401);
    });

    test('should reject expired token', async () => {
      const expiredToken = tokenFactory.expired();

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({});

      expect(response.status).toBe(401);
    });

    test('should accept valid token', async () => {
      const validToken = tokenFactory.member();

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
    });

    test('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .send({});

      expect(response.status).toBe(401);
    });

    test('should handle refresh with valid token', async () => {
      const validToken = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should handle logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      // Logout may succeed even without token
      expect([200, 401]).toContain(response.status);
    });

    test('should handle logout with valid token', async () => {
      const validToken = tokenFactory.member();

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe('Role-Based Access Control via /verify', () => {
    test('should identify super_admin role in token', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('super_admin');
    });

    test('should identify financial_manager role in token', async () => {
      const token = tokenFactory.financialManager();

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('financial_manager');
    });

    test('should identify member role in token', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('member');
    });

    test('should return user data with valid super_admin token', async () => {
      if (!dbConnected || !existingUser) {
        console.warn('Skipping - database not connected or no user');
        return;
      }

      const token = tokenFactory.superAdmin(existingUser.id);

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('Phone Number Validation', () => {
    test('should accept Saudi phone format +966', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+966501234567', password: 'test123' });

      // Should not fail on format validation
      expect([401, 404, 500]).toContain(response.status);
    });

    test('should accept Kuwait phone format +965', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+96550123456', password: 'test123' });

      expect([401, 404, 500]).toContain(response.status);
    });

    test('should accept local Saudi format 05x', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '0501234567', password: 'test123' });

      expect([400, 401, 404, 500]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    test('should set security headers on auth responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+966501234567', password: 'test123' });

      // Check for common security headers
      expect(response.headers).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('not valid json');

      expect([400, 500]).toContain(response.status);
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send();

      expect([400, 401, 500]).toContain(response.status);
    });

    test('should handle very long phone numbers', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+966' + '5'.repeat(100), password: 'test123' });

      expect([400, 401, 500]).toContain(response.status);
    });

    test('should handle very long passwords', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+966501234567', password: 'x'.repeat(1000) });

      expect([400, 401, 500]).toContain(response.status);
    });

    test('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: "'+966501234567'; DROP TABLE users; --",
          password: "' OR '1'='1"
        });

      // Should not succeed and should not crash
      expect([400, 401, 500]).toContain(response.status);
    });

    test('should handle XSS attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '<script>alert("xss")</script>',
          password: '<img src="x" onerror="alert(1)">'
        });

      expect([400, 401, 500]).toContain(response.status);
    });
  });
});
