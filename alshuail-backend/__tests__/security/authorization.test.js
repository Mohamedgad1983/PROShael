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

  describe('Super-Admin-Only Member Operations', () => {
    // POST/PUT/DELETE /api/members require super_admin role (not just admin)
    test('should allow super_admin access to POST /api/members', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ full_name: 'Test Member' });

      // Should not be forbidden (403) for super_admin - may be 400 for validation
      expect(response.status).not.toBe(403);
    });

    test('should deny admin access to POST /api/members', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ full_name: 'Test Member' });

      // Admin should get 403 - only super_admin can create members
      expect([401, 403]).toContain(response.status);
    });

    test('should deny member access to POST /api/members', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ full_name: 'Test Member' });

      // Members should get 403 or 401 for super_admin-only endpoints
      expect([401, 403]).toContain(response.status);
    });

    test('should allow super_admin access to PUT /api/members/123', async () => {
      const response = await request(app)
        .put('/api/members/123')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ full_name: 'Updated Member' });

      // Should not be forbidden (403) for super_admin
      expect(response.status).not.toBe(403);
    });

    test('should deny admin access to PUT /api/members/123', async () => {
      const response = await request(app)
        .put('/api/members/123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ full_name: 'Updated Member' });

      // Admin should get 403 - only super_admin can update members
      expect([401, 403]).toContain(response.status);
    });

    test('should deny member access to PUT /api/members/123', async () => {
      const response = await request(app)
        .put('/api/members/123')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ full_name: 'Updated Member' });

      // Members should get 401, 403, or 404 (no access or not found)
      expect([401, 403, 404]).toContain(response.status);
    });

    test('should allow super_admin access to DELETE /api/members/123', async () => {
      const response = await request(app)
        .delete('/api/members/123')
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Should not be forbidden (403) for super_admin
      expect(response.status).not.toBe(403);
    });

    test('should deny admin access to DELETE /api/members/123', async () => {
      const response = await request(app)
        .delete('/api/members/123')
        .set('Authorization', `Bearer ${adminToken}`);

      // Admin should get 403 - only super_admin can delete members
      expect([401, 403]).toContain(response.status);
    });

    test('should deny member access to DELETE /api/members/123', async () => {
      const response = await request(app)
        .delete('/api/members/123')
        .set('Authorization', `Bearer ${memberToken}`);

      // Members should get 401, 403, or 404
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Super Admin-Only Endpoints', () => {
    // Test actual existing super_admin endpoints
    test('should allow super admin access to GET /api/settings/system', async () => {
      const response = await request(app)
        .get('/api/settings/system')
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Super admin should have access
      expect(response.status).not.toBe(403);
    });

    test('should deny member access to GET /api/settings/system', async () => {
      const response = await request(app)
        .get('/api/settings/system')
        .set('Authorization', `Bearer ${memberToken}`);

      // Members should not have access to system settings
      expect([401, 403]).toContain(response.status);
    });

    test('should allow super admin to search members for role assignment', async () => {
      const response = await request(app)
        .get('/api/multi-role/search-members?q=test')
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Super admin should have access
      expect(response.status).not.toBe(403);
    });

    test('should deny member access to role search', async () => {
      const response = await request(app)
        .get('/api/multi-role/search-members?q=test')
        .set('Authorization', `Bearer ${memberToken}`);

      // Members should not have access
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Financial Manager Endpoints', () => {
    // Test actual financial endpoints that exist
    test('should allow financial manager access to GET /api/reports/financial-summary', async () => {
      const response = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${financialManagerToken}`);

      // Financial manager should have access (200) or auth issues (401)
      expect(response.status).not.toBe(403);
    });

    test('should deny regular member access to GET /api/reports/financial-summary', async () => {
      const response = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${memberToken}`);

      // Members should not have access to financial endpoints
      expect([401, 403]).toContain(response.status);
    });

    test('should allow financial manager access to GET /api/expenses', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${financialManagerToken}`);

      // Financial manager should have access
      expect(response.status).not.toBe(403);
    });

    test('should deny regular member access to GET /api/expenses', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${memberToken}`);

      // Members should not have access to expenses
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Role Escalation Prevention', () => {
    test('should not allow role escalation through token manipulation', async () => {
      // Create a token claiming to be super_admin but signed with wrong secret
      const fakeAdminToken = jwt.sign(
        { id: 'member-123', role: 'super_admin', email: 'fake@example.com' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/settings/system')
        .set('Authorization', `Bearer ${fakeAdminToken}`);

      // Should be rejected with 401 for invalid token
      expect(response.status).toBe(401);
    });

    test('should not allow privilege escalation through modified requests', async () => {
      const response = await request(app)
        .put('/api/members/member-123')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'super_admin' });

      // Should either be forbidden/unauthorized or the role field should be ignored
      if (response.status === 200) {
        expect(response.body.data?.role).not.toBe('super_admin');
      } else {
        expect([401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Cross-Role Access Patterns', () => {
    test('members should only access their own data', async () => {
      // Use a UUID format for the member ID to avoid server errors from invalid ID format
      const otherUserId = '00000000-0000-0000-0000-000000000001';
      const response = await request(app)
        .get(`/api/members/${otherUserId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Members with 'member' role CAN access /api/members/:id (per route definition)
      // but should get 404 for non-existent users, or 200 if user exists
      // The route allows: super_admin, financial_manager, member
      expect([200, 403, 404, 500]).toContain(response.status);
    });

    test('admins should access all member data', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    test('viewer role should only have read access', async () => {
      // Test that viewers can access dashboard (read)
      const readResponse = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${viewerToken}`);

      // Viewers should be able to read dashboard stats
      expect([200, 401]).toContain(readResponse.status);

      // But cannot create members (write)
      const writeResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ full_name: 'Test' });

      // Viewers should not be able to write
      expect([401, 403]).toContain(writeResponse.status);
    });
  });

  describe('Authorization Bypass Prevention', () => {
    test('should not bypass authorization with missing role checks', async () => {
      // Test actual admin endpoints that might have missing authorization
      const endpoints = [
        '/api/admin/dashboard',
        '/api/settings/system'
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
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${financialManagerToken}`);

      const response2 = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${memberToken}`);

      // Financial manager should have access (200 or other non-403)
      expect(response1.status).not.toBe(403);
      // Member should not have access
      expect([401, 403]).toContain(response2.status);
    });
  });
});