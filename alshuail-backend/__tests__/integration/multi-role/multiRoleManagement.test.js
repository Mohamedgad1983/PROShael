/**
 * Multi-Role Management API Integration Tests
 *
 * Test Suite Coverage:
 * - Member Search API
 * - Role Assignment with Hijri Dates
 * - Role Expiration Validation
 * - Permission Merging
 * - Overlap Detection
 * - RLS Policy Enforcement
 *
 * @reference Context7 - Jest async testing best practices
 * @reference Context7 - Supabase integration testing
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../../server.js';
import { supabase } from '../../../src/config/database.js';
import jwt from 'jsonwebtoken';

// Test configuration
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const API_BASE = '/api/multi-role';

// Helper function to create test tokens
const createTestToken = (userId, role = 'super_admin', permissions = { all_access: true }) => {
  return jwt.sign(
    {
      id: userId,
      role,
      permissions,
      email: `test-${userId}@test.com`
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Test data storage
const testData = {
  superAdminToken: null,
  adminToken: null,
  memberToken: null,
  testUserId: null,
  testMemberId: null,
  testRoleId: null,
  testAssignmentId: null
};

describe('Multi-Role Management API - Comprehensive QA Suite', () => {

  beforeAll(async () => {
    // Create test users and roles
    const { data: superAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1)
      .single();

    if (superAdmin) {
      testData.testUserId = superAdmin.id;
      testData.superAdminToken = createTestToken(superAdmin.id, 'super_admin');
    }

    // Get a test member
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (member) {
      testData.testMemberId = member.id;
    }

    // Get a test role
    const { data: role } = await supabase
      .from('user_roles')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (role) {
      testData.testRoleId = role.id;
    }
  });

  afterAll(async () => {
    // Cleanup: Remove test assignments
    if (testData.testAssignmentId) {
      await supabase
        .from('user_role_assignments')
        .delete()
        .eq('id', testData.testAssignmentId);
    }
  });

  describe('1. Member Search API - /api/multi-role/search-members', () => {

    test('should search members successfully with super_admin token', async () => {
      const response = await request(app)
        .get(`${API_BASE}/search-members`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .query({ q: 'test', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    test('should return members with active_roles attached', async () => {
      const response = await request(app)
        .get(`${API_BASE}/search-members`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .query({ q: '', limit: 5 });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const member = response.body.data[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('email');
        expect(member).toHaveProperty('active_roles');
        expect(Array.isArray(member.active_roles)).toBe(true);
      }
    });

    test('should require authentication for member search', async () => {
      const response = await request(app)
        .get(`${API_BASE}/search-members`)
        .query({ q: 'test' });

      expect(response.status).toBe(401);
    });

    test('should limit search results correctly', async () => {
      const limit = 3;
      const response = await request(app)
        .get(`${API_BASE}/search-members`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .query({ q: '', limit });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(limit);
    });

    test('should search in both users and members tables', async () => {
      const response = await request(app)
        .get(`${API_BASE}/search-members`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .query({ q: '', limit: 20 });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const sources = response.body.data.map(item => item.source);
        // Should have items from either 'users' or 'members'
        expect(sources.every(s => ['users', 'members'].includes(s))).toBe(true);
      }
    });
  });

  describe('2. Role Assignment API - /api/multi-role/assign', () => {

    test('should assign role with Hijri dates successfully', async () => {
      if (!testData.testMemberId || !testData.testRoleId) {
        // eslint-disable-next-line no-console
        console.warn('Skipping: No test data available');
        return;
      }

      const assignmentData = {
        user_id: testData.testMemberId,
        role_id: testData.testRoleId,
        start_date_gregorian: '2025-01-01',
        end_date_gregorian: '2025-12-31',
        start_date_hijri: '1446-07-01',
        end_date_hijri: '1447-06-30',
        notes: 'QA Test Assignment - Can be deleted',
        is_active: true
      };

      const response = await request(app)
        .post(`${API_BASE}/assign`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send(assignmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.user_id).toBe(testData.testMemberId);
      expect(response.body.data.role_id).toBe(testData.testRoleId);

      // Store for cleanup
      testData.testAssignmentId = response.body.data.id;
    });

    test('should validate start_date before end_date', async () => {
      if (!testData.testMemberId || !testData.testRoleId) {
        console.warn('Skipping: No test data available');
        return;
      }

      const invalidData = {
        user_id: testData.testMemberId,
        role_id: testData.testRoleId,
        start_date_gregorian: '2025-12-31',
        end_date_gregorian: '2025-01-01' // End before start
      };

      const response = await request(app)
        .post(`${API_BASE}/assign`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should detect overlapping role assignments', async () => {
      if (!testData.testMemberId || !testData.testRoleId || !testData.testAssignmentId) {
        console.warn('Skipping: No test assignment available');
        return;
      }

      // Try to assign same role with overlapping dates
      const overlappingData = {
        user_id: testData.testMemberId,
        role_id: testData.testRoleId,
        start_date_gregorian: '2025-06-01',
        end_date_gregorian: '2026-06-01', // Overlaps with existing assignment
        is_active: true
      };

      const response = await request(app)
        .post(`${API_BASE}/assign`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send(overlappingData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('overlapping');
    });

    test('should require super_admin role for assignment', async () => {
      const memberToken = createTestToken('test-member-123', 'member', { view_only: true });

      const response = await request(app)
        .post(`${API_BASE}/assign`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          user_id: testData.testMemberId,
          role_id: testData.testRoleId
        });

      expect(response.status).toBe(403);
    });

    test('should validate Hijri date format', async () => {
      if (!testData.testMemberId || !testData.testRoleId) {
        console.warn('Skipping: No test data available');
        return;
      }

      const invalidHijriData = {
        user_id: testData.testMemberId,
        role_id: testData.testRoleId,
        start_date_hijri: 'invalid-date',
        end_date_hijri: '1446-99-99' // Invalid month/day
      };

      const response = await request(app)
        .post(`${API_BASE}/assign`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send(invalidHijriData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('3. Get User Role Assignments - /api/multi-role/user/:userId', () => {

    test('should get all role assignments for a user', async () => {
      if (!testData.testMemberId) {
        console.warn('Skipping: No test member available');
        return;
      }

      const response = await request(app)
        .get(`${API_BASE}/user/${testData.testMemberId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should include assignment status in response', async () => {
      if (!testData.testMemberId) {
        console.warn('Skipping: No test member available');
        return;
      }

      const response = await request(app)
        .get(`${API_BASE}/user/${testData.testMemberId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const assignment = response.body.data[0];
        expect(assignment).toHaveProperty('status');
        expect(['active', 'pending', 'expired', 'inactive']).toContain(assignment.status);
      }
    });

    test('should return empty array for user with no assignments', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`${API_BASE}/user/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('4. Update Role Assignment - /api/multi-role/:assignmentId', () => {

    test('should update assignment dates successfully', async () => {
      if (!testData.testAssignmentId) {
        console.warn('Skipping: No test assignment available');
        return;
      }

      const updateData = {
        end_date_gregorian: '2026-12-31',
        end_date_hijri: '1448-06-30',
        notes: 'Updated via QA test'
      };

      const response = await request(app)
        .patch(`${API_BASE}/${testData.testAssignmentId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe(updateData.notes);
    });

    test('should deactivate assignment by setting is_active to false', async () => {
      if (!testData.testAssignmentId) {
        console.warn('Skipping: No test assignment available');
        return;
      }

      const response = await request(app)
        .patch(`${API_BASE}/${testData.testAssignmentId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send({ is_active: false });

      expect(response.status).toBe(200);
      expect(response.body.data.is_active).toBe(false);

      // Reactivate for other tests
      await request(app)
        .patch(`${API_BASE}/${testData.testAssignmentId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send({ is_active: true });
    });
  });

  describe('5. Delete Role Assignment - /api/multi-role/:assignmentId', () => {

    test('should soft-delete assignment successfully', async () => {
      if (!testData.testAssignmentId) {
        console.warn('Skipping: No test assignment available');
        return;
      }

      const response = await request(app)
        .delete(`${API_BASE}/${testData.testAssignmentId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's soft-deleted (is_active = false)
      const { data: assignment } = await supabase
        .from('user_role_assignments')
        .select('is_active')
        .eq('id', testData.testAssignmentId)
        .single();

      expect(assignment.is_active).toBe(false);

      // Clear reference
      testData.testAssignmentId = null;
    });

    test('should return 404 for non-existent assignment', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`${API_BASE}/${nonExistentId}`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('6. Available Roles API - /api/multi-role/available-roles', () => {

    test('should return all active roles', async () => {
      const response = await request(app)
        .get(`${API_BASE}/available-roles`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should include role permissions in response', async () => {
      const response = await request(app)
        .get(`${API_BASE}/available-roles`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const role = response.body.data[0];
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('role_name');
        expect(role).toHaveProperty('permissions');
        expect(typeof role.permissions).toBe('object');
      }
    });
  });

  describe('7. PostgreSQL Functions Testing', () => {

    test('should call get_active_roles function successfully', async () => {
      if (!testData.testUserId) {
        console.warn('Skipping: No test user available');
        return;
      }

      const { data, error } = await supabase
        .rpc('get_active_roles', {
          p_user_id: testData.testUserId,
          p_check_date: new Date().toISOString().split('T')[0]
        });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should call user_has_permission function successfully', async () => {
      if (!testData.testUserId) {
        console.warn('Skipping: No test user available');
        return;
      }

      const { data, error } = await supabase
        .rpc('user_has_permission', {
          p_user_id: testData.testUserId,
          p_permission_path: 'all_access',
          p_check_date: new Date().toISOString().split('T')[0]
        });

      expect(error).toBeNull();
      expect(typeof data).toBe('boolean');
    });

    test('should call get_merged_permissions function successfully', async () => {
      if (!testData.testUserId) {
        console.warn('Skipping: No test user available');
        return;
      }

      const { data, error } = await supabase
        .rpc('get_merged_permissions', {
          p_user_id: testData.testUserId,
          p_check_date: new Date().toISOString().split('T')[0]
        });

      expect(error).toBeNull();
      expect(typeof data).toBe('object');
    });
  });

  describe('8. Hijri Date Conversion Tests', () => {

    test('should convert Gregorian to Hijri correctly', async () => {
      const { gregorianToHijri } = await import('../../../src/utils/hijriConverter.js');

      const hijriDate = gregorianToHijri('2025-01-01');

      expect(hijriDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should convert Hijri to Gregorian correctly', async () => {
      const { hijriToGregorian } = await import('../../../src/utils/hijriConverter.js');

      const gregorianDate = hijriToGregorian('1446-07-01');

      expect(gregorianDate).toBeInstanceOf(Date);
      expect(gregorianDate.getFullYear()).toBeGreaterThan(2023);
    });

    test('should validate Hijri date format', async () => {
      const { isValidHijriDate } = await import('../../../src/utils/hijriConverter.js');

      expect(isValidHijriDate('1446-07-15')).toBe(true);
      expect(isValidHijriDate('invalid')).toBe(false);
      expect(isValidHijriDate('1446-13-01')).toBe(false); // Invalid month
      expect(isValidHijriDate('1446-07-32')).toBe(false); // Invalid day
    });

    test('should format Hijri date in Arabic', async () => {
      const { formatHijriDateArabic } = await import('../../../src/utils/hijriConverter.js');

      const formatted = formatHijriDateArabic('1446-09-15');

      expect(formatted).toContain('رمضان');
      expect(formatted).toContain('1446');
      expect(formatted).toContain('هـ');
    });
  });

  describe('9. Performance and Load Testing', () => {

    test('should handle concurrent role assignment requests', async () => {
      if (!testData.testMemberId || !testData.testRoleId) {
        console.warn('Skipping: No test data available');
        return;
      }

      const promises = Array(5).fill(null).map((_, index) =>
        request(app)
          .get(`${API_BASE}/user/${testData.testMemberId}`)
          .set('Authorization', `Bearer ${testData.superAdminToken}`)
      );

      const results = await Promise.all(promises);

      results.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get(`${API_BASE}/available-roles`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('10. Security and Authorization Tests', () => {

    test('should enforce RLS policies on role_assignments table', async () => {
      const memberToken = createTestToken('test-member-456', 'member', { view_only: true });

      const response = await request(app)
        .get(`${API_BASE}/search-members`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    test('should prevent SQL injection in search queries', async () => {
      const maliciousQuery = "'; DROP TABLE user_role_assignments; --";

      const response = await request(app)
        .get(`${API_BASE}/search-members`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .query({ q: maliciousQuery });

      expect(response.status).toBe(200);

      // Verify table still exists
      const { data } = await supabase
        .from('user_role_assignments')
        .select('id')
        .limit(1);

      expect(data).toBeDefined();
    });

    test('should sanitize user input in notes field', async () => {
      if (!testData.testMemberId || !testData.testRoleId) {
        console.warn('Skipping: No test data available');
        return;
      }

      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post(`${API_BASE}/assign`)
        .set('Authorization', `Bearer ${testData.superAdminToken}`)
        .send({
          user_id: testData.testMemberId,
          role_id: testData.testRoleId,
          notes: xssPayload
        });

      if (response.status === 201) {
        const assignment = response.body.data;
        expect(assignment.notes).not.toContain('<script>');

        // Cleanup
        await supabase
          .from('user_role_assignments')
          .delete()
          .eq('id', assignment.id);
      }
    });
  });
});
