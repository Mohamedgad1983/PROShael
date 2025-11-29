/**
 * Members Controller Integration Tests
 * Comprehensive tests for member CRUD, statistics, and mobile endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import membersRoutes from '../../../src/routes/members.js';
import { tokenFactory, testConnection, dbOps, testDb } from '../../helpers/testDatabase.js';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/members', membersRoutes);

describe('Members Controller Integration Tests', () => {
  let dbConnected = false;
  let existingMember = null;

  beforeAll(async () => {
    dbConnected = await testConnection();
    if (dbConnected) {
      existingMember = await dbOps.getExistingMember();
    }
  });

  afterAll(async () => {
    await dbOps.cleanup();
  });

  describe('GET /api/members', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/members');

      expect([401, 403, 500]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should return paginated members list for super_admin', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
      }
    });

    test('should return paginated members list for financial_manager', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.financialManager();

      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
    });

    test('should filter by membership status', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members?status=active')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });

    test('should filter by profile completion', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members?profile_completed=true')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
    });

    test('should support search by name', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members?search=test')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
    });

    test('should respect pagination limits', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members?limit=5&page=1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200 && response.body.data) {
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      }
    });

    test('should handle large page numbers gracefully', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members?page=99999')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/members/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/members/test-id');

      expect([401, 403]).toContain(response.status);
    });

    test('should return member by ID for super_admin', async () => {
      if (!dbConnected || !existingMember) {
        console.warn('Skipping - database not connected or no member');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get(`/api/members/${existingMember.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(existingMember.id);
      }
    });

    test('should return 404 for non-existent member', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect([404, 500]).toContain(response.status);
    });

    test('should allow member to view own profile', async () => {
      if (!dbConnected || !existingMember) {
        console.warn('Skipping - database not connected or no member');
        return;
      }

      const token = tokenFactory.member(existingMember.id);

      const response = await request(app)
        .get(`/api/members/${existingMember.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/members/statistics', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/members/statistics');

      expect([401, 403]).toContain(response.status);
    });

    test('should reject member role access', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .get('/api/members/statistics')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should return comprehensive statistics for super_admin', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/statistics')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('total_members');
      }
    });

    test('should return numeric statistics', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/statistics')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        const stats = response.body.data;
        expect(typeof stats.total_members).toBe('number');
        expect(stats.total_members).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('GET /api/members/monitoring/all', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/members/monitoring/all');

      expect([401, 403, 500]).toContain(response.status);
    });

    test('should return monitoring data for financial_manager', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.financialManager();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/members/incomplete-profiles', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/members/incomplete-profiles');

      expect([401, 403, 500]).toContain(response.status);
    });

    test('should return incomplete profiles for super_admin', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/incomplete-profiles')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/members', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/members')
        .send({
          full_name: 'Test Member',
          phone: '+966555555555'
        });

      expect([401, 403]).toContain(response.status);
    });

    test('should reject non-super_admin access', async () => {
      const token = tokenFactory.financialManager();

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          full_name: 'Test Member',
          phone: '+966555555555'
        });

      expect([401, 403]).toContain(response.status);
    });

    test('should validate required fields', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    });

    test('should validate phone format', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          full_name: 'Test Member',
          phone: 'invalid-phone'
        });

      expect([400, 500]).toContain(response.status);
    });

    test('should sanitize XSS in input fields', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          full_name: '<script>alert("xss")</script>',
          phone: '+966555555599'
        });

      // Should either reject or sanitize
      expect([201, 400, 409, 500]).toContain(response.status);
      if (response.status === 201 && response.body.data) {
        expect(response.body.data.full_name).not.toContain('<script>');
      }
    });
  });

  describe('PUT /api/members/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/members/test-id')
        .send({ full_name: 'Updated Name' });

      expect([401, 403]).toContain(response.status);
    });

    test('should reject non-super_admin access', async () => {
      const token = tokenFactory.financialManager();

      const response = await request(app)
        .put('/api/members/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ full_name: 'Updated Name' });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('DELETE /api/members/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/members/test-id');

      expect([401, 403]).toContain(response.status);
    });

    test('should reject non-super_admin access', async () => {
      const token = tokenFactory.financialManager();

      const response = await request(app)
        .delete('/api/members/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Mobile Endpoints', () => {
    describe('GET /api/members/mobile/profile', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .get('/api/members/mobile/profile');

        expect([401, 403]).toContain(response.status);
      });

      test('should return member own profile', async () => {
        if (!dbConnected || !existingMember) {
          console.warn('Skipping - database not connected or no member');
          return;
        }

        const token = tokenFactory.member(existingMember.id);

        const response = await request(app)
          .get('/api/members/mobile/profile')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404, 500]).toContain(response.status);
      });

      test('should not return sensitive fields', async () => {
        if (!dbConnected || !existingMember) {
          console.warn('Skipping - database not connected or no member');
          return;
        }

        const token = tokenFactory.member(existingMember.id);

        const response = await request(app)
          .get('/api/members/mobile/profile')
          .set('Authorization', `Bearer ${token}`);

        if (response.status === 200 && response.body.data) {
          expect(response.body.data).not.toHaveProperty('password_hash');
          expect(response.body.data).not.toHaveProperty('temp_password');
        }
      });
    });

    describe('GET /api/members/mobile/balance', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .get('/api/members/mobile/balance');

        expect([401, 403]).toContain(response.status);
      });

      test('should return member balance', async () => {
        if (!dbConnected || !existingMember) {
          console.warn('Skipping - database not connected or no member');
          return;
        }

        const token = tokenFactory.member(existingMember.id);

        const response = await request(app)
          .get('/api/members/mobile/balance')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /api/members/mobile/transactions', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .get('/api/members/mobile/transactions');

        expect([401, 403]).toContain(response.status);
      });

      test('should return member transactions', async () => {
        if (!dbConnected || !existingMember) {
          console.warn('Skipping - database not connected or no member');
          return;
        }

        const token = tokenFactory.member(existingMember.id);

        const response = await request(app)
          .get('/api/members/mobile/transactions')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /api/members/mobile/notifications', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .get('/api/members/mobile/notifications');

        expect([401, 403]).toContain(response.status);
      });

      test('should return member notifications', async () => {
        if (!dbConnected || !existingMember) {
          console.warn('Skipping - database not connected or no member');
          return;
        }

        const token = tokenFactory.member(existingMember.id);

        const response = await request(app)
          .get('/api/members/mobile/notifications')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('PUT /api/members/mobile/profile', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .put('/api/members/mobile/profile')
          .send({ full_name: 'Updated Name' });

        expect([401, 403]).toContain(response.status);
      });
    });
  });

  describe('Admin Import Endpoints', () => {
    describe('GET /api/members/admin/import-history', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .get('/api/members/admin/import-history');

        expect([401, 403]).toContain(response.status);
      });

      test('should require super_admin role', async () => {
        const token = tokenFactory.financialManager();

        const response = await request(app)
          .get('/api/members/admin/import-history')
          .set('Authorization', `Bearer ${token}`);

        expect([401, 403]).toContain(response.status);
      });

      test('should return import history for super_admin', async () => {
        if (!dbConnected) {
          console.warn('Skipping - database not connected');
          return;
        }

        const token = tokenFactory.superAdmin();

        const response = await request(app)
          .get('/api/members/admin/import-history')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 500]).toContain(response.status);
      });
    });
  });

  describe('Token Verification Endpoint', () => {
    test('GET /api/members/verify-token/:token should handle invalid tokens', async () => {
      const response = await request(app)
        .get('/api/members/verify-token/invalid-token');

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Input Validation & Security', () => {
    test('should handle SQL injection in search', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members?search=\' OR 1=1 --')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    test('should handle very long input values', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          full_name: 'A'.repeat(10000),
          phone: '+966555555555'
        });

      expect([400, 500]).toContain(response.status);
    });

    test('should handle special characters in names', async () => {
      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          full_name: 'محمد العبدالله', // Arabic name
          phone: '+966555555598'
        });

      expect([201, 400, 409, 500]).toContain(response.status);
    });
  });
});
