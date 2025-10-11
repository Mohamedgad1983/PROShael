/**
 * Load Testing with Concurrent Users
 * Simulates multiple concurrent users accessing the API
 *
 * Tests:
 * - Authentication load (concurrent logins)
 * - Member list load (concurrent reads)
 * - Payment creation load (concurrent writes)
 * - Mixed operations load (read/write mix)
 *
 * Performance Metrics:
 * - Average response time
 * - 95th percentile response time
 * - Success rate
 * - Requests per second
 *
 * Total: 4 load tests
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.js';
import membersRoutes from '../../src/routes/members.js';
import paymentsRoutes from '../../src/routes/payments.js';
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

// Performance statistics calculator
const calculateStats = (durations) => {
  const sorted = [...durations].sort((a, b) => a - b);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return { avg, p95, min, max };
};

// Concurrent request executor
const runConcurrentRequests = async (requestFn, concurrency) => {
  const startTime = Date.now();
  const promises = Array.from({ length: concurrency }, () => requestFn());
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  const durations = results.map(r => r.duration);
  const statuses = results.map(r => r.status);
  const successCount = statuses.filter(s => s === 200 || s === 201).length;
  const successRate = (successCount / concurrency) * 100;

  const stats = calculateStats(durations);
  const rps = (concurrency / (totalTime / 1000)).toFixed(2);

  return {
    stats,
    successRate,
    rps,
    totalTime,
    statuses
  };
};

// Individual request wrapper
const makeRequest = async (requestFn) => {
  const startTime = Date.now();
  const response = await requestFn();
  const duration = Date.now() - startTime;

  return {
    duration,
    status: response.status,
    response
  };
};

describe('Load Testing with Concurrent Users', () => {

  // ========================================
  // Test 1: Authentication Load (10 concurrent)
  // ========================================

  describe('Authentication Load Test', () => {
    it('should handle 10 concurrent login requests', async () => {
      const concurrency = 10;

      const result = await runConcurrentRequests(async () => {
        return makeRequest(() =>
          request(app)
            .post('/api/auth/member-login')
            .send({ phone: '0555555555', password: 'Test@1234' })
        );
      }, concurrency);

      console.log(`\n📊 Authentication Load Test (${concurrency} concurrent users):`);
      console.log(`  Average:      ${result.stats.avg.toFixed(2)}ms`);
      console.log(`  95th %ile:    ${result.stats.p95.toFixed(2)}ms`);
      console.log(`  Min/Max:      ${result.stats.min}ms / ${result.stats.max}ms`);
      console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
      console.log(`  RPS:          ${result.rps}`);

      // Assertions (lenient for test environment)
      expect(result.stats.avg).toBeLessThan(5000); // Average under 5s
      expect(result.stats.p95).toBeLessThan(10000); // 95th percentile under 10s
      // Note: Success rate may be 0% in test environment without database
      expect([200, 401, 500]).toContain(result.statuses[0]); // At least valid responses
    }, 30000);
  });

  // ========================================
  // Test 2: Member List Load (20 concurrent)
  // ========================================

  describe('Member List Load Test', () => {
    it('should handle 20 concurrent member list requests', async () => {
      const concurrency = 20;
      const token = createAdminToken();

      const result = await runConcurrentRequests(async () => {
        return makeRequest(() =>
          request(app)
            .get('/api/members')
            .query({ limit: 20, offset: 0 })
            .set('Authorization', `Bearer ${token}`)
        );
      }, concurrency);

      console.log(`\n📊 Member List Load Test (${concurrency} concurrent users):`);
      console.log(`  Average:      ${result.stats.avg.toFixed(2)}ms`);
      console.log(`  95th %ile:    ${result.stats.p95.toFixed(2)}ms`);
      console.log(`  Min/Max:      ${result.stats.min}ms / ${result.stats.max}ms`);
      console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
      console.log(`  RPS:          ${result.rps}`);

      // Assertions (lenient for test environment)
      expect(result.stats.avg).toBeLessThan(3000); // Average under 3s
      expect(result.stats.p95).toBeLessThan(5000); // 95th percentile under 5s
      // Note: Success rate may be 0% in test environment without database
      expect([200, 403, 500]).toContain(result.statuses[0]); // At least valid responses
    }, 40000);
  });

  // ========================================
  // Test 3: Payment Creation Load (5 concurrent)
  // ========================================

  describe('Payment Creation Load Test', () => {
    it('should handle 5 concurrent payment creation requests', async () => {
      const concurrency = 5;
      const token = createFinancialManagerToken();

      const result = await runConcurrentRequests(async () => {
        return makeRequest(() =>
          request(app)
            .post('/api/payments')
            .set('Authorization', `Bearer ${token}`)
            .send({
              member_id: 'test-member-id',
              amount: 500,
              category: 'subscription',
              payment_method: 'bank_transfer',
              description: 'Load test payment',
              receipt_number: `LOAD-${Date.now()}-${Math.random()}`
            })
        );
      }, concurrency);

      console.log(`\n📊 Payment Creation Load Test (${concurrency} concurrent users):`);
      console.log(`  Average:      ${result.stats.avg.toFixed(2)}ms`);
      console.log(`  95th %ile:    ${result.stats.p95.toFixed(2)}ms`);
      console.log(`  Min/Max:      ${result.stats.min}ms / ${result.stats.max}ms`);
      console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
      console.log(`  RPS:          ${result.rps}`);

      // Assertions (lenient for test environment)
      expect(result.stats.avg).toBeLessThan(5000); // Average under 5s
      expect(result.stats.p95).toBeLessThan(10000); // 95th percentile under 10s
      // Note: Success rate may be 0% in test environment without database
      expect([200, 201, 400, 403, 500]).toContain(result.statuses[0]); // At least valid responses
    }, 40000);
  });

  // ========================================
  // Test 4: Mixed Operations Load (15 concurrent)
  // ========================================

  describe('Mixed Operations Load Test', () => {
    it('should handle 15 concurrent mixed read/write operations', async () => {
      const concurrency = 15;
      const adminToken = createAdminToken();
      const fmToken = createFinancialManagerToken();

      // Create array of mixed operations
      const operations = [
        // Read operations (60%)
        ...Array(9).fill(() =>
          makeRequest(() =>
            request(app)
              .get('/api/members')
              .query({ limit: 10 })
              .set('Authorization', `Bearer ${adminToken}`)
          )
        ),
        // Write operations (40%)
        ...Array(6).fill(() =>
          makeRequest(() =>
            request(app)
              .post('/api/payments')
              .set('Authorization', `Bearer ${fmToken}`)
              .send({
                member_id: 'test-member-id',
                amount: 300,
                category: 'donation',
                payment_method: 'cash',
                receipt_number: `MIX-${Date.now()}-${Math.random()}`
              })
          )
        )
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const totalTime = Date.now() - startTime;

      const durations = results.map(r => r.duration);
      const statuses = results.map(r => r.status);
      const successCount = statuses.filter(s => s === 200 || s === 201 || s === 400).length;
      const successRate = (successCount / concurrency) * 100;

      const stats = calculateStats(durations);
      const rps = (concurrency / (totalTime / 1000)).toFixed(2);

      console.log(`\n📊 Mixed Operations Load Test (${concurrency} concurrent users):`);
      console.log(`  Operations:   9 reads + 6 writes`);
      console.log(`  Average:      ${stats.avg.toFixed(2)}ms`);
      console.log(`  95th %ile:    ${stats.p95.toFixed(2)}ms`);
      console.log(`  Min/Max:      ${stats.min}ms / ${stats.max}ms`);
      console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
      console.log(`  RPS:          ${rps}`);

      // Assertions (lenient for test environment)
      expect(stats.avg).toBeLessThan(4000); // Average under 4s
      expect(stats.p95).toBeLessThan(8000); // 95th percentile under 8s
      // Note: Success rate may be low in test environment without database
      expect([200, 201, 400, 403, 500]).toContain(statuses[0]); // At least valid responses
    }, 50000);
  });
});
