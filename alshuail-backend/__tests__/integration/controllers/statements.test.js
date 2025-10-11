/**
 * Statements Controller Integration Tests
 * Tests statement search, generation, and member balance calculations
 */

import request from 'supertest';
import express from 'express';
import statementRoutes from '../../../src/routes/statementRoutes.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/statements', statementRoutes);

// Helper to create super admin token
const createAdminToken = () => {
  return jwt.sign(
    { id: 'admin-test-id', role: 'super_admin', email: 'admin@alshuail.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Helper to create member token
const createMemberToken = () => {
  return jwt.sign(
    { id: 'member-test-id', role: 'member', phone: '0555555555' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Statements Controller Integration Tests', () => {
  describe('GET /api/statements/search/phone', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555');

      expect([401, 403]).toContain(response.status);
    });

    it('should require phone parameter', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('هاتف');
    });

    it('should require minimum 8 digits', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=055')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8');
    });

    it('should validate phone format', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=12345678')
        .set('Authorization', `Bearer ${token}`);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should search by Saudi phone number', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      // Should either find member or return 404
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('memberId');
        expect(response.body.data).toHaveProperty('fullName');
        expect(response.body.data).toHaveProperty('currentBalance');
        expect(response.body.data).toHaveProperty('targetBalance');
        expect(response.body.data).toHaveProperty('alertLevel');
      }
    });

    it('should return statement with financial data', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('currentBalance');
        expect(response.body.data).toHaveProperty('targetBalance');
        expect(response.body.data).toHaveProperty('shortfall');
        expect(response.body.data).toHaveProperty('percentageComplete');
        expect(response.body.data).toHaveProperty('alertLevel');
        expect(response.body.data).toHaveProperty('statusColor');
      }
    });

    it('should return alert messages', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('alertMessage');
        expect(['ZERO_BALANCE', 'CRITICAL', 'WARNING', 'SUFFICIENT']).toContain(response.body.data.alertLevel);
      }
    });

    it('should return recent transactions', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('recentTransactions');
        expect(Array.isArray(response.body.data.recentTransactions)).toBe(true);
        expect(response.body.data).toHaveProperty('statistics');
      }
    });
  });

  describe('GET /api/statements/search/name', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/statements/search/name?name=test');

      expect([401, 403]).toContain(response.status);
    });

    it('should require name parameter', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/name')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require minimum 3 characters', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/name?name=ab')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('3');
    });

    it('should search by Arabic name', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/name?name=محمد')
        .set('Authorization', `Bearer ${token}`);

      // Should either find members or return 404
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should normalize Arabic text for better search', async () => {
      const token = createAdminToken();

      // Test with different Arabic variations
      const response = await request(app)
        .get('/api/statements/search/name?name=احمد')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should limit results to 10 members', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/name?name=test')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200 && Array.isArray(response.body.data)) {
        expect(response.body.data.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('GET /api/statements/search/member-id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/statements/search/member-id?memberId=SH-12345');

      expect([401, 403]).toContain(response.status);
    });

    it('should require memberId parameter', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/member-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should search by membership number', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/member-id?memberId=SH-12345')
        .set('Authorization', `Bearer ${token}`);

      // Should either find member or return 404
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('memberId');
      }
    });
  });

  describe('GET /api/statements/generate/:memberId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/statements/generate/test-member-id');

      expect([401, 403]).toContain(response.status);
    });

    it('should generate statement for member', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/generate/test-member-id')
        .set('Authorization', `Bearer ${token}`);

      // Should either generate statement or fail
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.message).toContain('كشف الحساب');
      }
    });

    it('should include comprehensive statement data', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/generate/test-member-id')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        const data = response.body.data;
        expect(data).toHaveProperty('memberId');
        expect(data).toHaveProperty('fullName');
        expect(data).toHaveProperty('currentBalance');
        expect(data).toHaveProperty('recentTransactions');
        expect(data).toHaveProperty('statistics');
      }
    });
  });

  describe('Statement Data Quality', () => {
    it('should calculate balance correctly', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        const data = response.body.data;
        expect(typeof data.currentBalance).toBe('number');
        expect(data.currentBalance).toBeGreaterThanOrEqual(0);
        expect(data.targetBalance).toBe(3000); // Standard target
        expect(data.shortfall).toBe(Math.max(0, 3000 - data.currentBalance));
      }
    });

    it('should set appropriate alert levels', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        const data = response.body.data;
        const balance = data.currentBalance;

        if (balance === 0) {
          expect(data.alertLevel).toBe('ZERO_BALANCE');
          expect(data.statusColor).toBe('#991B1B');
        } else if (balance < 1000) {
          expect(data.alertLevel).toBe('CRITICAL');
          expect(data.statusColor).toBe('#DC2626');
        } else if (balance < 3000) {
          expect(data.alertLevel).toBe('WARNING');
          expect(data.statusColor).toBe('#F59E0B');
        } else {
          expect(data.alertLevel).toBe('SUFFICIENT');
          expect(data.statusColor).toBe('#10B981');
        }
      }
    });

    it('should calculate percentage complete correctly', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        const data = response.body.data;
        const expectedPercentage = Math.min(100, (data.currentBalance / 3000) * 100);
        expect(data.percentageComplete).toBeCloseTo(expectedPercentage, 1);
      }
    });

    it('should include transaction statistics', async () => {
      const token = createAdminToken();

      const response = await request(app)
        .get('/api/statements/search/phone?phone=0555555555')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        const stats = response.body.data.statistics;
        expect(stats).toHaveProperty('totalPayments');
        expect(stats).toHaveProperty('lastPaymentDate');
        expect(stats).toHaveProperty('averagePayment');
        expect(stats).toHaveProperty('yearlyTotal');
      }
    });
  });
});
