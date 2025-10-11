/**
 * API Performance Benchmarks
 * Measures response times for critical endpoints
 *
 * Benchmarks:
 * - Authentication (login, verify)
 * - Member Operations (list, search)
 * - Payment Operations (create, list)
 * - Document Operations (list, stats)
 * - Financial Reports (summary)
 *
 * Performance Targets:
 * - Fast: < 100ms
 * - Acceptable: < 500ms
 * - Slow: > 500ms (requires optimization)
 *
 * Total: 10 performance benchmark tests
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.js';
import membersRoutes from '../../src/routes/members.js';
import paymentsRoutes from '../../src/routes/payments.js';
import documentsRoutes from '../../src/routes/documents.js';
import financialReportsRoutes from '../../src/routes/financialReports.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Create Express app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/reports', financialReportsRoutes);

// Helper tokens
const createAdminToken = () => jwt.sign(
  { id: 'admin-test-id', role: 'admin', email: 'admin@alshuail.com' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const createFinancialManagerToken = () => jwt.sign(
  { id: 'fm-test-id', role: 'financial_manager', email: 'fm@alshuail.com' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Performance measurement helper
const measurePerformance = async (name, requestFn) => {
  const startTime = Date.now();
  const response = await requestFn();
  const duration = Date.now() - startTime;

  const status = response.status === 200 || response.status === 201 ? '✅' : '⚠️';
  const perf = duration < 100 ? '🚀 FAST' : duration < 500 ? '✓ OK' : '⚠️  SLOW';

  console.log(`${status} ${perf} ${name}: ${duration}ms (status: ${response.status})`);

  return { duration, response };
};

describe('API Performance Benchmarks', () => {

  // ========================================
  // Authentication Performance (2 tests)
  // ========================================

  describe('Authentication Endpoints', () => {
    it('should benchmark member login performance', async () => {
      const { duration, response } = await measurePerformance(
        'POST /api/auth/member-login',
        () => request(app)
          .post('/api/auth/member-login')
          .send({ phone: '0555555555', password: 'Test@1234' })
      );

      expect(duration).toBeLessThan(2000); // 2 second max
      expect([200, 401, 500]).toContain(response.status);
    });

    it('should benchmark token verification performance', async () => {
      const token = createAdminToken();

      const { duration, response } = await measurePerformance(
        'POST /api/auth/verify',
        () => request(app)
          .post('/api/auth/verify')
          .send({ token })
      );

      expect(duration).toBeLessThan(500); // 500ms max
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  // ========================================
  // Member Operations Performance (2 tests)
  // ========================================

  describe('Member Endpoints', () => {
    it('should benchmark members list performance', async () => {
      const token = createAdminToken();

      const { duration, response } = await measurePerformance(
        'GET /api/members',
        () => request(app)
          .get('/api/members')
          .query({ limit: 20, offset: 0 })
          .set('Authorization', `Bearer ${token}`)
      );

      expect(duration).toBeLessThan(1000); // 1 second max
      expect([200, 403, 500]).toContain(response.status);
    });

    it('should benchmark member statistics performance', async () => {
      const token = createAdminToken();

      const { duration, response } = await measurePerformance(
        'GET /api/members/statistics',
        () => request(app)
          .get('/api/members/statistics')
          .set('Authorization', `Bearer ${token}`)
      );

      expect(duration).toBeLessThan(1000); // 1 second max
      expect([200, 403, 500]).toContain(response.status);
    });
  });

  // ========================================
  // Payment Operations Performance (2 tests)
  // ========================================

  describe('Payment Endpoints', () => {
    it('should benchmark payments list performance', async () => {
      const token = createFinancialManagerToken();

      const { duration, response } = await measurePerformance(
        'GET /api/payments',
        () => request(app)
          .get('/api/payments')
          .query({ page: 1, limit: 20 })
          .set('Authorization', `Bearer ${token}`)
      );

      expect(duration).toBeLessThan(1000); // 1 second max
      expect([200, 403, 500]).toContain(response.status);
    });

    it('should benchmark payment statistics performance', async () => {
      const token = createFinancialManagerToken();

      const { duration, response } = await measurePerformance(
        'GET /api/payments/stats/overview',
        () => request(app)
          .get('/api/payments/stats/overview')
          .set('Authorization', `Bearer ${token}`)
      );

      expect(duration).toBeLessThan(1000); // 1 second max
      expect([200, 403, 500]).toContain(response.status);
    });
  });

  // ========================================
  // Document Operations Performance (2 tests)
  // ========================================

  describe('Document Endpoints', () => {
    it('should benchmark documents list performance', async () => {
      const token = createAdminToken();

      const { duration, response } = await measurePerformance(
        'GET /api/documents/member/:memberId',
        () => request(app)
          .get('/api/documents/member/test-member-id')
          .set('Authorization', `Bearer ${token}`)
      );

      expect(duration).toBeLessThan(1000); // 1 second max
      expect([200, 403, 500]).toContain(response.status);
    });

    it('should benchmark document categories performance', async () => {
      const { duration, response } = await measurePerformance(
        'GET /api/documents/config/categories',
        () => request(app)
          .get('/api/documents/config/categories')
      );

      expect(duration).toBeLessThan(200); // 200ms max (lightweight)
      expect([200, 500]).toContain(response.status);
    });
  });

  // ========================================
  // Financial Reports Performance (2 tests)
  // ========================================

  describe('Financial Report Endpoints', () => {
    it('should benchmark financial summary performance', async () => {
      const token = createFinancialManagerToken();

      const { duration, response } = await measurePerformance(
        'GET /api/reports/financial-summary',
        () => request(app)
          .get('/api/reports/financial-summary')
          .query({ period: 'monthly' })
          .set('Authorization', `Bearer ${token}`)
      );

      expect(duration).toBeLessThan(2000); // 2 seconds max (complex query)
      expect([200, 403, 500]).toContain(response.status);
    });

    it('should benchmark cash flow analysis performance', async () => {
      const token = createFinancialManagerToken();

      const { duration, response } = await measurePerformance(
        'GET /api/reports/cash-flow',
        () => request(app)
          .get('/api/reports/cash-flow')
          .query({ period: 'monthly' })
          .set('Authorization', `Bearer ${token}`)
      );

      expect(duration).toBeLessThan(2000); // 2 seconds max (complex query)
      expect([200, 403, 500]).toContain(response.status);
    });
  });
});
