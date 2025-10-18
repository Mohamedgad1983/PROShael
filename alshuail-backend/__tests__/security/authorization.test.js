import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { config } from '../../src/config/env.js';

describe('RBAC Authorization Security Tests', () => {
  let memberToken;
  let adminToken;
  let superAdminToken;
  let financialManagerToken;
  let viewerToken;

  beforeAll(() => {
    const jwtSecret = config.jwt.secret || 'test-secret';

    // Generate tokens for different roles
    memberToken = jwt.sign(
      { id: 'member-123', role: 'member', email: 'member@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: 'admin-123', role: 'admin', email: 'admin@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    superAdminToken = jwt.sign(
      { id: 'super-123', role: 'super_admin', email: 'super@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    financialManagerToken = jwt.sign(
      { id: 'finance-123', role: 'financial_manager', email: 'finance@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    viewerToken = jwt.sign(
      { id: 'viewer-123', role: 'viewer', email: 'viewer@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  describe('Admin-Only Endpoints', () => {
    const adminEndpoints = [
      { method: 'post', path: '/api/members', data: { name: 'Test' } },
      { method: 'put', path: '/api/members/123', data: { name: 'Updated' } },
      { method: 'delete', path: '/api/members/123' },
      { method: 'post', path: '/api/subscriptions/bulk-update', data: {} },
      { method: 'post', path: '/api/notifications/broadcast', data: {} }
    ];

    adminEndpoints.forEach(({ method, path, data }) => {
      test(`should allow admin access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (data) req.send(data);

        const response = await req;

        // Should not be forbidden (403) for admin
        expect(response.status).not.toBe(403);
      });

      test(`should deny member access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${memberToken}`);

        if (data) req.send(data);

        const response = await req.expect(403);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Access denied'
        });
      });

      test(`should allow super admin access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${superAdminToken}`);

        if (data) req.send(data);

        const response = await req;

        // Super admin should have access to everything
        expect(response.status).not.toBe(403);
      });
    });
  });

  describe('Super Admin-Only Endpoints', () => {
    const superAdminEndpoints = [
      { method: 'post', path: '/api/settings/system', data: { key: 'value' } },
      { method: 'delete', path: '/api/database/reset', data: {} },
      { method: 'post', path: '/api/roles/assign', data: { userId: '123', role: 'admin' } }
    ];

    superAdminEndpoints.forEach(({ method, path, data }) => {
      test(`should allow super admin access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${superAdminToken}`);

        if (data) req.send(data);

        const response = await req;

        expect(response.status).not.toBe(403);
      });

      test(`should deny admin access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (data) req.send(data);

        const response = await req.expect(403);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('Super Admin')
        });
      });

      test(`should deny member access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${memberToken}`);

        if (data) req.send(data);

        const response = await req.expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Financial Manager Endpoints', () => {
    const financialEndpoints = [
      { method: 'get', path: '/api/financial-reports' },
      { method: 'post', path: '/api/payments/process', data: { amount: 100 } },
      { method: 'get', path: '/api/financial-reports/summary' },
      { method: 'post', path: '/api/expenses', data: { amount: 50, description: 'Test' } }
    ];

    financialEndpoints.forEach(({ method, path, data }) => {
      test(`should allow financial manager access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${financialManagerToken}`);

        if (data) req.send(data);

        const response = await req;

        expect(response.status).not.toBe(403);
      });

      test(`should deny regular member access to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path)
          .set('Authorization', `Bearer ${memberToken}`);

        if (data) req.send(data);

        const response = await req;

        // Members should not have access to financial endpoints
        expect([403, 401]).toContain(response.status);
      });
    });
  });

  describe('Role Escalation Prevention', () => {
    test('should not allow role escalation through token manipulation', async () => {
      // Create a token claiming to be super_admin but signed with member credentials
      const fakeAdminToken = jwt.sign(
        { id: 'member-123', role: 'super_admin', email: 'fake@example.com' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete('/api/database/reset')
        .set('Authorization', `Bearer ${fakeAdminToken}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    test('should not allow privilege escalation through modified requests', async () => {
      const response = await request(app)
        .put('/api/members/self')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'super_admin' });

      // Should either be forbidden or the role field should be ignored
      if (response.status === 200) {
        expect(response.body.data?.role).not.toBe('super_admin');
      } else {
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Cross-Role Access Patterns', () => {
    test('members should only access their own data', async () => {
      const response = await request(app)
        .get('/api/members/other-user-id')
        .set('Authorization', `Bearer ${memberToken}`);

      // Should either be forbidden or return only limited data
      expect([403, 404]).toContain(response.status);
    });

    test('admins should access all member data', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test('viewer role should only have read access', async () => {
      // Viewers can read
      const readResponse = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(readResponse.status).toBe(200);

      // But cannot write
      const writeResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Test' })
        .expect(403);

      expect(writeResponse.body.error).toBe('Access denied');
    });
  });

  describe('Authorization Bypass Prevention', () => {
    test('should not bypass authorization with missing role checks', async () => {
      // Test endpoints that might have missing authorization
      const endpoints = [
        '/api/admin/dashboard',
        '/api/admin/users',
        '/api/admin/settings',
        '/api/super/config'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${memberToken}`);

        // Should not allow members to access admin endpoints
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    test('should validate roles on every request, not cache authorization', async () => {
      // Make two requests with different tokens to same endpoint
      const response1 = await request(app)
        .get('/api/financial-reports')
        .set('Authorization', `Bearer ${adminToken}`);

      const response2 = await request(app)
        .get('/api/financial-reports')
        .set('Authorization', `Bearer ${memberToken}`);

      // Admin should have access, member should not
      expect(response1.status).not.toBe(403);
      expect([403, 401]).toContain(response2.status);
    });
  });
});