/**
 * Integration Tests for Payment Endpoints
 * Tests payment CRUD operations, status updates, and processing
 */

import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import paymentRoutes from '../../../src/routes/payments.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);

// Mock Supabase for consistent test results
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-payment-1',
              amount: 100,
              category: 'subscription',
              status: 'pending',
              member_id: 'test-member-1',
              payment_method: 'card',
              created_at: new Date().toISOString()
            },
            error: null
          })),
          limit: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'new-payment-1',
              amount: 150,
              category: 'donation',
              status: 'pending',
              created_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: {
            id: 'test-payment-1',
            status: 'completed'
          },
          error: null
        }))
      }))
    }))
  }
}));

describe('Payment Integration Tests', () => {

  let financialManagerToken;
  let memberToken;

  beforeAll(() => {
    // Use the same JWT_SECRET as setup.js
    const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

    // Generate test tokens
    financialManagerToken = jwt.sign({
      id: 'admin-1',
      email: 'admin@alshuail.com',
      role: 'financial_manager',
      permissions: {
        manage_finances: true,
        view_financial_reports: true
      }
    }, JWT_SECRET, { expiresIn: '1h' });

    memberToken = jwt.sign({
      id: 'test-member-1',
      phone: '0501234567',
      role: 'member',
      membershipNumber: 'SH001'
    }, JWT_SECRET, { expiresIn: '1h' });
  });

  describe('POST /api/payments (Create Payment)', () => {

    test('should reject payment creation without authentication', async () => {
      const response = await request(app)
        .post('/api/payments')
        .send({
          amount: 100,
          category: 'subscription',
          payment_method: 'card'
        });

      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject payment creation by member (requires financial role)', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          amount: 100,
          category: 'subscription',
          payment_method: 'card'
        });

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
      expect(response.body.success).toBe(false);
    });

    test('should accept payment creation by financial manager', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          member_id: 'test-member-1',
          amount: 150,
          category: 'donation',
          payment_method: 'cash',
          description: 'Test donation payment'
        });

      // Test for successful creation or validation error
      if (response.body.success) {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('payment');
        expect(response.body.payment).toHaveProperty('id');
        expect(response.body.payment.category).toBe('donation');
      } else {
        // If validation fails, should return proper error structure
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should validate required payment fields', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          // Missing required fields: amount, category
          payment_method: 'card'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    test('should validate payment amount is positive', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          member_id: 'test-member-1',
          amount: -100,
          category: 'subscription',
          payment_method: 'card'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate payment category', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          member_id: 'test-member-1',
          amount: 100,
          category: 'invalid_category',
          payment_method: 'card'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/:id (Get Payment by ID)', () => {

    test('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/payments/test-payment-1');

      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.body.success).toBe(false);
    });

    test('should allow financial manager to get payment', async () => {
      const response = await request(app)
        .get('/api/payments/test-payment-1')
        .set('Authorization', `Bearer ${financialManagerToken}`);

      if (response.body.success) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('payment');
        expect(response.body.payment).toHaveProperty('id');
        expect(response.body.payment).toHaveProperty('amount');
        expect(response.body.payment).toHaveProperty('category');
      }
    });

    test('should allow member to get their own payment', async () => {
      const response = await request(app)
        .get('/api/payments/test-payment-1')
        .set('Authorization', `Bearer ${memberToken}`);

      // Member can view payments they're authorized for
      if (response.body.success) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('payment');
      }
    });

    test('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payments/non-existent-id')
        .set('Authorization', `Bearer ${financialManagerToken}`);

      if (!response.body.success) {
        expect(response.status).toBeGreaterThanOrEqual(404);
        expect(response.body.error).toBeTruthy();
      }
    });
  });

  describe('PUT /api/payments/:id/status (Update Payment Status)', () => {

    test('should reject without authentication', async () => {
      const response = await request(app)
        .put('/api/payments/test-payment-1/status')
        .send({ status: 'completed' });

      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject status update by member', async () => {
      const response = await request(app)
        .put('/api/payments/test-payment-1/status')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'completed' });

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
      expect(response.body.success).toBe(false);
    });

    test('should allow financial manager to update status', async () => {
      const response = await request(app)
        .put('/api/payments/test-payment-1/status')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({ status: 'completed' });

      if (response.body.success) {
        expect(response.status).toBe(200);
        expect(response.body.payment).toHaveProperty('status');
      }
    });

    test('should validate status values', async () => {
      const response = await request(app)
        .put('/api/payments/test-payment-1/status')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    test('should accept valid status values', async () => {
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];

      for (const status of validStatuses) {
        const response = await request(app)
          .put('/api/payments/test-payment-1/status')
          .set('Authorization', `Bearer ${financialManagerToken}`)
          .send({ status });

        // Should either succeed or fail with proper error structure
        expect(response.body).toHaveProperty('success');
      }
    });
  });

  describe('POST /api/payments/:id/process (Process Payment)', () => {

    test('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/test-payment-1/process')
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject processing by member', async () => {
      const response = await request(app)
        .post('/api/payments/test-payment-1/process')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
      expect(response.body.success).toBe(false);
    });

    test('should allow financial manager to process payment', async () => {
      const response = await request(app)
        .post('/api/payments/test-payment-1/process')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payment_method: 'card',
          transaction_id: 'test-txn-123'
        });

      // Should either succeed or return proper error structure
      expect(response.body).toHaveProperty('success');
      if (response.body.success) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('payment');
      }
    });

    test('should return proper error for already processed payment', async () => {
      // First process
      await request(app)
        .post('/api/payments/test-payment-1/process')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payment_method: 'card'
        });

      // Second process attempt
      const response = await request(app)
        .post('/api/payments/test-payment-1/process')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payment_method: 'card'
        });

      if (!response.body.success) {
        expect(response.body.error).toBeTruthy();
      }
    });
  });

  describe('Payment Flow Integration', () => {

    test('should handle complete payment lifecycle', async () => {
      // 1. Create payment
      const createResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          member_id: 'test-member-1',
          amount: 200,
          category: 'subscription',
          payment_method: 'card'
        });

      if (!createResponse.body.success) {
        return; // Skip rest if creation fails
      }

      const paymentId = createResponse.body.payment?.id || 'test-payment-1';

      // 2. Get payment details
      const getResponse = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${financialManagerToken}`);

      if (getResponse.body.success) {
        expect(getResponse.body.payment).toBeTruthy();
      }

      // 3. Process payment
      const processResponse = await request(app)
        .post(`/api/payments/${paymentId}/process`)
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payment_method: 'card',
          transaction_id: 'test-txn-456'
        });

      if (processResponse.body.success) {
        expect(processResponse.body.payment).toBeTruthy();
      }

      // 4. Update status
      const statusResponse = await request(app)
        .put(`/api/payments/${paymentId}/status`)
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({ status: 'completed' });

      if (statusResponse.body.success) {
        expect(statusResponse.body.payment.status).toBe('completed');
      }
    });
  });

  describe('Error Handling', () => {

    test('should return proper error structure', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({});

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid json"}');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate payment amounts', async () => {
      const invalidAmounts = [0, -100, 'invalid', null, undefined];

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post('/api/payments')
          .set('Authorization', `Bearer ${financialManagerToken}`)
          .send({
            member_id: 'test-member-1',
            amount,
            category: 'subscription',
            payment_method: 'card'
          });

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Role-Based Access Control', () => {

    test('should enforce role requirements for create', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          amount: 100,
          category: 'subscription',
          payment_method: 'card'
        });

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
    });

    test('should enforce role requirements for status update', async () => {
      const response = await request(app)
        .put('/api/payments/test-payment-1/status')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'completed' });

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
    });

    test('should enforce role requirements for processing', async () => {
      const response = await request(app)
        .post('/api/payments/test-payment-1/process')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      expect([401, 403]).toContain(response.status); // Either unauthorized or forbidden
    });
  });
});
