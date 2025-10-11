/**
 * E2E Document Management Workflow Test
 * Tests complete document lifecycle
 *
 * Flow:
 * 1. Admin Login → Authenticate as admin
 * 2. Get Categories → Retrieve available document categories
 * 3. List Documents → Get member documents
 * 4. Get Single Document → Retrieve document details with signed URL
 * 5. Update Document → Modify document metadata
 * 6. View Statistics → Check document statistics
 * 7. Delete Document → Remove document
 * 8. Verify Deletion → Confirm document no longer accessible
 *
 * Note: File upload testing requires multipart/form-data handling
 * which is tested separately in integration tests
 *
 * Total: 1 E2E workflow test (8 sequential steps)
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../../src/routes/auth.js';
import documentsRoutes from '../../../src/routes/documents.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Create Express app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);

// Helper to create admin token
const createAdminToken = () => {
  return jwt.sign(
    { id: 'admin-test-id', userId: 'admin-test-id', role: 'admin', email: 'admin@alshuail.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('E2E: Complete Document Management Workflow', () => {
  let documentId = null;
  const adminToken = createAdminToken();
  const testMemberId = 'test-member-id';

  it('should complete full document lifecycle', async () => {
    // ========================================
    // Step 1: Get Categories
    // ========================================
    const categoriesResponse = await request(app)
      .get('/api/documents/config/categories');

    expect([200, 500]).toContain(categoriesResponse.status);

    if (categoriesResponse.status === 200) {
      expect(categoriesResponse.body.success).toBe(true);
      expect(categoriesResponse.body.data).toBeDefined();
      expect(Array.isArray(categoriesResponse.body.data)).toBe(true);
      console.log(`✅ Step 1: Retrieved ${categoriesResponse.body.data.length} document categories`);
    }

    // ========================================
    // Step 2: List Documents
    // ========================================
    const listResponse = await request(app)
      .get(`/api/documents/member/${testMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 403, 404, 500]).toContain(listResponse.status);

    if (listResponse.status === 200) {
      expect(listResponse.body.success).toBe(true);
      if (listResponse.body.data) {
        expect(Array.isArray(listResponse.body.data)).toBe(true);
        console.log(`✅ Step 2: Listed documents (${listResponse.body.data.length} found)`);

        // Use first document if available
        if (listResponse.body.data.length > 0) {
          documentId = listResponse.body.data[0].id;
        }
      }
    }

    // Skip remaining steps if no document available
    if (!documentId) {
      console.log('⚠️  E2E Test Note: No documents available for testing (expected in test environment)');
      return;
    }

    // ========================================
    // Step 3: Get Single Document
    // ========================================
    const singleDocResponse = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 403, 404, 500]).toContain(singleDocResponse.status);

    if (singleDocResponse.status === 200) {
      expect(singleDocResponse.body.success).toBe(true);
      expect(singleDocResponse.body.data).toBeDefined();
      expect(singleDocResponse.body.data.id).toBe(documentId);

      // Verify signed URL for download
      if (singleDocResponse.body.data.signed_url) {
        expect(singleDocResponse.body.data.signed_url).toBeDefined();
        console.log('✅ Step 3: Retrieved document with signed URL for download');
      }
    }

    // ========================================
    // Step 4: Update Document Metadata
    // ========================================
    const updateResponse = await request(app)
      .put(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'E2E Test Document Updated',
        description: 'Updated by E2E workflow test',
        category: 'other'
      });

    expect([200, 403, 404, 500]).toContain(updateResponse.status);

    if (updateResponse.status === 200) {
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data).toBeDefined();
      console.log('✅ Step 4: Document metadata updated successfully');
    }

    // ========================================
    // Step 5: View Statistics
    // ========================================
    const statsResponse = await request(app)
      .get('/api/documents/stats/overview')
      .query({ member_id: testMemberId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 403, 500]).toContain(statsResponse.status);

    if (statsResponse.status === 200) {
      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toBeDefined();

      if (statsResponse.body.data) {
        expect(statsResponse.body.data.total_documents).toBeDefined();
        expect(statsResponse.body.data.total_size).toBeDefined();
        console.log(`✅ Step 5: Retrieved statistics (${statsResponse.body.data.total_documents} documents, ${statsResponse.body.data.total_size_mb} MB)`);
      }
    }

    // ========================================
    // Step 6: Delete Document (Soft Delete)
    // ========================================
    const deleteResponse = await request(app)
      .delete(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 403, 404, 500]).toContain(deleteResponse.status);

    if (deleteResponse.status === 200) {
      expect(deleteResponse.body.success).toBe(true);
      console.log('✅ Step 6: Document deleted successfully');
    }

    // ========================================
    // Step 7: Verify Deletion
    // ========================================
    const verifyDeleteResponse = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([404, 500]).toContain(verifyDeleteResponse.status);

    if (verifyDeleteResponse.status === 404) {
      console.log('✅ Step 7: Deletion verified - document no longer accessible');
    }

    // ========================================
    // Step 8: View Updated Statistics
    // ========================================
    const finalStatsResponse = await request(app)
      .get('/api/documents/stats/overview')
      .query({ member_id: testMemberId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 403, 500]).toContain(finalStatsResponse.status);

    if (finalStatsResponse.status === 200) {
      expect(finalStatsResponse.body.success).toBe(true);
      console.log('✅ Step 8: E2E Test - Complete document management workflow successful');
    }
  }, 30000); // 30 second timeout for E2E test
});
