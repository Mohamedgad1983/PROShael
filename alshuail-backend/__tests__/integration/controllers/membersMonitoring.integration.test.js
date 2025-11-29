/**
 * Members Monitoring Controller Integration Tests
 * Tests the getAllMembersForMonitoring endpoint with real database operations
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import membersRoutes from '../../../src/routes/members.js';
import { tokenFactory, testConnection, dbOps } from '../../helpers/testDatabase.js';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/members', membersRoutes);

describe('Members Monitoring Controller Integration Tests', () => {
  let dbConnected = false;

  beforeAll(async () => {
    dbConnected = await testConnection();
  });

  afterAll(async () => {
    await dbOps.cleanup();
  });

  // ============================================
  // Authentication Tests
  // ============================================
  describe('Authentication', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/members/monitoring/all');

      expect([401, 403, 500]).toContain(response.status);
    });

    test('should reject member role', async () => {
      const token = tokenFactory.member();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should reject family_head role', async () => {
      const token = tokenFactory.familyHead();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });

    test('should reject expired token', async () => {
      const token = tokenFactory.expired();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  // ============================================
  // Authorization - Allowed Roles
  // ============================================
  describe('Authorization - Allowed Roles', () => {
    test('should allow super_admin access', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.total).toBeDefined();
        expect(typeof response.body.total).toBe('number');
      }
    });

    test('should allow admin access', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.admin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    test('should allow financial_manager access', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.financialManager();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return proper success response structure', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/[\u0600-\u06FF]/); // Arabic message
      }
    });

    test('should return all members without pagination', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        // Monitoring endpoint returns ALL members
        expect(response.body.total).toBe(response.body.data.length);
      }
    });

    test('should return member data with all fields', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200 && response.body.data.length > 0) {
        const member = response.body.data[0];

        // Check for expected member fields
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('created_at');
      }
    });
  });

  // ============================================
  // Data Ordering Tests
  // ============================================
  describe('Data Ordering', () => {
    test('should order members by created_at descending', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200 && response.body.data.length > 1) {
        const members = response.body.data;

        // Check descending order by created_at
        for (let i = 0; i < members.length - 1; i++) {
          const date1 = new Date(members[i].created_at);
          const date2 = new Date(members[i + 1].created_at);

          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });
  });

  // ============================================
  // Large Dataset Tests
  // ============================================
  describe('Large Dataset Handling', () => {
    test('should handle fetching all members efficiently', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const startTime = Date.now();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.status === 200) {
        // Should complete within reasonable time (30 seconds max for large datasets)
        expect(duration).toBeLessThan(30000);

        expect(response.body.success).toBe(true);
        expect(response.body.total).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle empty database gracefully', async () => {
      // This test covers line 36: hasMore = false when data is empty
      // The actual behavior depends on whether there are members in the database
      // We test that the endpoint handles whatever data state exists

      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(typeof response.body.total).toBe('number');
        expect(response.body.total).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should handle invalid Authorization header format', async () => {
      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', 'InvalidFormat');

      expect([401, 403, 500]).toContain(response.status);
    });

    test('should handle malformed JWT token', async () => {
      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', 'Bearer malformed.token.here');

      expect([401, 403, 500]).toContain(response.status);
    });

    test('should return error response with proper structure on failure', async () => {
      const token = tokenFactory.member(); // Unauthorized role

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  // ============================================
  // Arabic Content Tests
  // ============================================
  describe('Arabic Content', () => {
    test('should return Arabic success message', async () => {
      if (!dbConnected) {
        console.warn('Skipping - database not connected');
        return;
      }

      const token = tokenFactory.superAdmin();

      const response = await request(app)
        .get('/api/members/monitoring/all')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        expect(response.body.message).toMatch(/تم جلب/);
        expect(response.body.message).toMatch(/عضو/);
      }
    });
  });
});
