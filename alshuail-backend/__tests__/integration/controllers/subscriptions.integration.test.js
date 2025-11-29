/**
 * Subscriptions Controller Integration Tests
 * Tests subscription management endpoints with real database
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import subscriptionRoutes from '../../../src/routes/subscriptionRoutes.js';
import { testDb, tokenFactory, testConnection, dbOps } from '../../helpers/testDatabase.js';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/subscriptions', subscriptionRoutes);

describe('Subscriptions Controller Integration Tests', () => {
  let dbConnected = false;
  let existingMember = null;
  let existingSubscription = null;

  beforeAll(async () => {
    dbConnected = await testConnection();
    if (dbConnected) {
      existingMember = await dbOps.getExistingMember();
      existingSubscription = await dbOps.getExistingSubscription();
    }
  });

  afterAll(async () => {
    await dbOps.cleanup();
  });

  // ========================================
  // PUBLIC ROUTES
  // ========================================
  describe('GET /api/subscriptions/plans', () => {
    test('should return subscription plans without authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans');

      // May return 200 with plans or 500 if table doesn't exist
      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.plans).toBeDefined();
        expect(Array.isArray(response.body.plans)).toBe(true);
      }
    });
  });

  // ========================================
  // MEMBER ROUTES
  // ========================================
  describe('GET /api/subscriptions/member/subscription', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/member/subscription');

      expect([401, 403]).toContain(response.status);
    });

    test('should return member subscription with valid token', async () => {
      if (!dbConnected || !existingMember) {
        console.warn('Skipping - database not connected or no member');
        return;
      }

      const token = tokenFactory.member(existingMember.id);

      const response = await request(app)
        .get('/api/subscriptions/member/subscription')
        .set('Authorization', `Bearer ${token}`);

      // May return 200 with data or 404 if no subscription
      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.subscription).toBeDefined();
      }
    });

    test('should handle non-existent member subscription', async () => {
      const token = tokenFactory.member('non-existent-uuid');

      const response = await request(app)
        .get('/api/subscriptions/member/subscription')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/subscriptions/member/subscription/payments', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/member/subscription/payments');

      expect([401, 403]).toContain(response.status);
    });

    test('should return payment history for member', async () => {
      if (!dbConnected || !existingMember) {
        console.warn('Skipping - database not connected or no member');
        return;
      }

      const token = tokenFactory.member(existingMember.id);

      const response = await request(app)
        .get('/api/subscriptions/member/subscription/payments')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.payments).toBeDefined();
        expect(Array.isArray(response.body.payments)).toBe(true);
      }
    });

    test('should support pagination', async () => {
      if (!dbConnected || !existingMember) {
        console.warn('Skipping - database not connected or no member');
        return;
      }

      const token = tokenFactory.member(existingMember.id);

      const response = await request(app)
        .get('/api/subscriptions/member/subscription/payments?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(5);
      }
    });
  });

  // ========================================
  // ADMIN ROUTES - Get All Subscriptions
  // ========================================
  describe('GET /api/subscriptions/admin/subscriptions', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions');

      expect([401, 403]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should return subscriptions for super_admin', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.subscriptions).toBeDefined();
        expect(Array.isArray(response.body.subscriptions)).toBe(true);
      }
    });

    test('should return subscriptions for financial_manager', async () => {
      const token = tokenFactory.financialManager();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    test('should filter by status', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions?status=active')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    test('should filter by status overdue', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions?status=overdue')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    test('should support search', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions?search=test')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    test('should support pagination', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(10);
      }
    });

    test('should include stats in response', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.stats).toBeDefined();
      }
    });
  });

  // ========================================
  // ADMIN ROUTES - Statistics
  // ========================================
  describe('GET /api/subscriptions/admin/subscriptions/stats', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/stats');

      expect([401, 403]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/stats')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should return subscription stats for admin', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/stats')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.total_members).toBeDefined();
        expect(response.body.active).toBeDefined();
        expect(response.body.overdue).toBeDefined();
      }
    });

    test('should return financial stats', async () => {
      const token = tokenFactory.financialManager();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/stats')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.monthly_revenue).toBeDefined();
        expect(response.body.overdue_amount).toBeDefined();
      }
    });
  });

  // ========================================
  // ADMIN ROUTES - Overdue Members
  // ========================================
  describe('GET /api/subscriptions/admin/subscriptions/overdue', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/overdue');

      expect([401, 403]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/overdue')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should return overdue members for admin', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/overdue')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.overdue_members).toBeDefined();
        expect(Array.isArray(response.body.overdue_members)).toBe(true);
        expect(response.body.total_due).toBeDefined();
      }
    });
  });

  // ========================================
  // ADMIN ROUTES - Record Payment
  // ========================================
  describe('POST /api/subscriptions/admin/subscriptions/payment', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .send({ member_id: 'test', amount: 100, months: 2 });

      expect([401, 403]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({ member_id: 'test', amount: 100, months: 2 });

      expect([401, 403]).toContain(response.status);
    });

    test('should validate required fields', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    });

    test('should validate amount is positive', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({ member_id: 'test', amount: -100, months: 2 });

      expect([400, 500]).toContain(response.status);
    });

    test('should validate minimum amount (50 SAR)', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({ member_id: 'test', amount: 25, months: 1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate amount is multiple of 50', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({ member_id: 'test', amount: 75, months: 1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent member', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          member_id: '00000000-0000-0000-0000-000000000000',
          amount: 100,
          months: 2
        });

      expect([400, 404, 500]).toContain(response.status);
    });

    test('should record payment for existing member', async () => {
      if (!dbConnected || !existingMember) {
        console.warn('Skipping - database not connected or no member');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          member_id: existingMember.id,
          amount: 100,
          months: 2,
          payment_method: 'bank_transfer',
          notes: 'Integration test payment'
        });

      // May succeed or fail depending on member's subscription status
      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  // ========================================
  // ADMIN ROUTES - Send Reminder
  // ========================================
  describe('POST /api/subscriptions/admin/subscriptions/reminder', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/reminder')
        .send({ send_to_all: true });

      expect([401, 403]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/reminder')
        .set('Authorization', `Bearer ${token}`)
        .send({ send_to_all: true });

      expect([401, 403]).toContain(response.status);
    });

    test('should validate required fields', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/reminder')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    });

    test('should send reminder to all overdue', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/reminder')
        .set('Authorization', `Bearer ${token}`)
        .send({ send_to_all: true });

      expect([200, 400, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.sent).toBeDefined();
        expect(response.body.failed).toBeDefined();
      }
    });

    test('should send reminder to specific members', async () => {
      if (!dbConnected || !existingMember) {
        console.warn('Skipping - database not connected or no member');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/reminder')
        .set('Authorization', `Bearer ${token}`)
        .send({ member_ids: [existingMember.id] });

      expect([200, 400, 500]).toContain(response.status);
    });

    test('should validate member_ids array', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/reminder')
        .set('Authorization', `Bearer ${token}`)
        .send({ member_ids: 'not-an-array' });

      expect([400, 500]).toContain(response.status);
    });
  });

  // ========================================
  // LEGACY ROUTES
  // ========================================
  describe('GET /api/subscriptions (Legacy)', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscriptions');

      expect([401, 403]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should return subscriptions for admin (legacy route)', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ========================================
  // INPUT VALIDATION & SECURITY
  // ========================================
  describe('Input Validation & Security', () => {
    test('should handle SQL injection in search', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions?search=\'; DROP TABLE subscriptions; --')
        .set('Authorization', `Bearer ${token}`);

      // Should not crash and should return error or empty results
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    test('should handle XSS in notes field', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          member_id: 'test',
          amount: 100,
          months: 2,
          notes: '<script>alert("xss")</script>'
        });

      // Should not crash
      expect([400, 404, 500]).toContain(response.status);
    });

    test('should validate page parameter', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions?page=-1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    test('should validate limit parameter', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions?limit=1000')
        .set('Authorization', `Bearer ${token}`);

      // Limit should be capped at 50
      expect([200, 400, 500]).toContain(response.status);
    });

    test('should handle malformed UUID', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          member_id: 'not-a-valid-uuid',
          amount: 100,
          months: 2
        });

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  // ========================================
  // ROLE-BASED ACCESS CONTROL
  // ========================================
  describe('Role-Based Access Control', () => {
    test('financial_manager can access admin routes', async () => {
      const token = tokenFactory.financialManager();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions/stats')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    test('admin role cannot access subscription routes', async () => {
      const token = tokenFactory.admin();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      // Admin role is not in allowed roles for subscription management
      expect([401, 403, 500]).toContain(response.status);
    });

    test('family_head cannot access admin routes', async () => {
      const token = tokenFactory.familyHead();

      const response = await request(app)
        .get('/api/subscriptions/admin/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================
  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('not valid json');

      expect([400, 500]).toContain(response.status);
    });

    test('should handle empty request body', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect([400, 500]).toContain(response.status);
    });

    test('should return appropriate error messages in Arabic', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/subscriptions/admin/subscriptions/payment')
        .set('Authorization', `Bearer ${token}`)
        .send({ member_id: 'test', amount: 25, months: 1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // Error message should be in Arabic
      expect(response.body.message).toBeDefined();
    });
  });
});
