# 🎯 AL-SHUAIL SYSTEM - CRITICAL 5 FILES: TEST, FIX & ACHIEVE 90%

## MASTER PROMPT FOR CLAUDE CODE
**Version**: 3.0 | **Date**: November 26, 2025  
**Mission**: Achieve 90%+ Coverage on 5 Critical Controllers  
**Estimated Time**: 2-3 Days

---

# 🚨 MISSION BRIEFING

You are Claude Code, an expert AI developer. Your mission is to:

1. **INSPECT** - Analyze 5 critical controller files thoroughly
2. **TEST** - Create comprehensive integration tests
3. **FIX** - Fix any bugs or issues discovered
4. **VERIFY** - Ensure 90%+ coverage on each file
5. **REPORT** - Document all findings and fixes

---

# 📁 TARGET FILES (5 Files Only)

```yaml
File 1: src/controllers/membersMonitoringController.js
  Current: 78%
  Target: 90%+
  Gap: +12%

File 2: src/controllers/subscriptionController.js
  Current: 75%
  Target: 90%+
  Gap: +15%

File 3: src/controllers/dashboardController.js
  Current: 66%
  Target: 90%+
  Gap: +24%

File 4: src/controllers/membersController.js
  Current: 63%
  Target: 90%+
  Gap: +27%

File 5: src/controllers/financialReportsController.js
  Current: 60%
  Target: 90%+
  Gap: +30%
```

---

# 🔄 EXECUTION WORKFLOW

## Phase 1: SETUP & BASELINE (15 minutes)

```bash
# Step 1: Navigate to backend
cd backend

# Step 2: Install dependencies
npm install

# Step 3: Get current baseline for each file
npm run test:coverage -- --collectCoverageFrom='src/controllers/membersMonitoringController.js' --coverageReporters='text'
npm run test:coverage -- --collectCoverageFrom='src/controllers/subscriptionController.js' --coverageReporters='text'
npm run test:coverage -- --collectCoverageFrom='src/controllers/dashboardController.js' --coverageReporters='text'
npm run test:coverage -- --collectCoverageFrom='src/controllers/membersController.js' --coverageReporters='text'
npm run test:coverage -- --collectCoverageFrom='src/controllers/financialReportsController.js' --coverageReporters='text'

# Step 4: Document baseline
echo "BASELINE RECORDED: $(date)"
```

---

## Phase 2: FILE-BY-FILE ANALYSIS & TESTING

### 📄 FILE 1: membersMonitoringController.js (78% → 90%)

#### Step 2.1: Read and Analyze
```bash
# Read the controller file completely
cat src/controllers/membersMonitoringController.js

# Find existing tests
find tests -name "*monitoring*" -o -name "*Monitoring*"

# Check what's NOT covered
npm run test:coverage -- --collectCoverageFrom='src/controllers/membersMonitoringController.js' --coverageReporters='text-summary'
```

#### Step 2.2: Identify Uncovered Lines
Look for:
- Functions without tests
- Error handling branches (catch blocks)
- Edge cases (empty arrays, null values)
- Conditional branches (if/else)
- Early returns

#### Step 2.3: Create/Update Tests

```javascript
/**
 * @file membersMonitoringController.test.js
 * @description Integration tests for Members Monitoring Controller
 * @target 90%+ coverage
 */

const request = require('supertest');
const app = require('../../src/app');
const { createTestUser, cleanupTestData } = require('../fixtures/helpers');

describe('Members Monitoring Controller', () => {
  let adminToken;
  let financialManagerToken;
  let memberToken;

  beforeAll(async () => {
    // Setup test users with different roles
    const admin = await createTestUser({ role: 'admin' });
    const financial = await createTestUser({ role: 'financial_manager' });
    const member = await createTestUser({ role: 'member' });
    
    adminToken = admin.token;
    financialManagerToken = financial.token;
    memberToken = member.token;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ==========================================
  // GET /api/monitoring/members
  // ==========================================
  describe('GET /api/monitoring/members', () => {
    
    describe('Success Cases', () => {
      test('should return all members for admin', async () => {
        const response = await request(app)
          .get('/api/monitoring/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      test('should support pagination', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?page=1&limit=10')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data.length).toBeLessThanOrEqual(10);
        expect(response.body).toHaveProperty('pagination');
      });

      test('should support search by name (Arabic)', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?search=محمد')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should support search by name (English)', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?search=Mohammed')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should support search by phone (+966)', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?search=+966501234567')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should support search by membership number (SH-XXXX)', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?search=SH-0001')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should filter by subscription status', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?status=active')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should filter by payment status (paid/unpaid)', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?payment_status=unpaid')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should filter by family branch', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?branch_id=some-uuid')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should sort by different fields', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?sort=created_at&order=desc')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Authorization Cases', () => {
      test('should allow financial_manager access', async () => {
        const response = await request(app)
          .get('/api/monitoring/members')
          .set('Authorization', `Bearer ${financialManagerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject member role access', async () => {
        const response = await request(app)
          .get('/api/monitoring/members')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      test('should reject without token', async () => {
        const response = await request(app)
          .get('/api/monitoring/members')
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      test('should reject invalid token', async () => {
        const response = await request(app)
          .get('/api/monitoring/members')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      test('should handle empty search results', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?search=nonexistent12345')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
      });

      test('should handle invalid page number', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?page=-1')
          .set('Authorization', `Bearer ${adminToken}`);

        // Should either return 400 or default to page 1
        expect([200, 400]).toContain(response.status);
      });

      test('should handle very large limit', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?limit=10000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Should cap at maximum allowed
        expect(response.body.data.length).toBeLessThanOrEqual(100);
      });

      test('should handle special characters in search', async () => {
        const response = await request(app)
          .get('/api/monitoring/members?search=' + encodeURIComponent("محمد's"))
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      test('should handle database errors gracefully', async () => {
        // This test depends on your error handling implementation
        // Mock database error if needed
      });
    });
  });

  // ==========================================
  // GET /api/monitoring/members/:id
  // ==========================================
  describe('GET /api/monitoring/members/:id', () => {
    
    test('should return member details for valid ID', async () => {
      // First get a valid member ID
      const listResponse = await request(app)
        .get('/api/monitoring/members?limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      if (listResponse.body.data.length > 0) {
        const memberId = listResponse.body.data[0].id;
        
        const response = await request(app)
          .get(`/api/monitoring/members/${memberId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('id', memberId);
      }
    });

    test('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/api/monitoring/members/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/monitoring/members/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  // ==========================================
  // GET /api/monitoring/statistics
  // ==========================================
  describe('GET /api/monitoring/statistics', () => {
    
    test('should return monitoring statistics', async () => {
      const response = await request(app)
        .get('/api/monitoring/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total_members');
      expect(response.body.data).toHaveProperty('active_subscriptions');
      expect(response.body.data).toHaveProperty('pending_payments');
    });

    test('should filter statistics by date range', async () => {
      const response = await request(app)
        .get('/api/monitoring/statistics?from=2025-01-01&to=2025-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================
  // POST /api/monitoring/export
  // ==========================================
  describe('POST /api/monitoring/export', () => {
    
    test('should export members to Excel', async () => {
      const response = await request(app)
        .post('/api/monitoring/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'xlsx' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/spreadsheet|octet-stream/);
    });

    test('should export members to PDF', async () => {
      const response = await request(app)
        .post('/api/monitoring/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/pdf|octet-stream/);
    });

    test('should export filtered members', async () => {
      const response = await request(app)
        .post('/api/monitoring/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          format: 'xlsx',
          filters: { status: 'active' }
        })
        .expect(200);
    });
  });
});
```

#### Step 2.4: Run Tests and Check Coverage
```bash
# Run tests for this file
npm test -- --testPathPattern="membersMonitoring" --coverage --collectCoverageFrom='src/controllers/membersMonitoringController.js'

# Verify coverage >= 90%
```

---

### 📄 FILE 2: subscriptionController.js (75% → 90%)

#### Step 2.1: Read and Analyze
```bash
cat src/controllers/subscriptionController.js
find tests -name "*subscription*" -o -name "*Subscription*"
```

#### Step 2.2: Create/Update Tests

```javascript
/**
 * @file subscriptionController.test.js
 * @description Integration tests for Subscription Controller
 * @target 90%+ coverage
 * @business-critical Monthly subscription: 50 SAR, Minimum balance: 3000 SAR
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Subscription Controller', () => {
  let adminToken, memberToken, testMemberId;

  // ==========================================
  // SUBSCRIPTION CONFIGURATION TESTS
  // ==========================================
  describe('Subscription Configuration', () => {
    
    test('should have correct monthly fee (50 SAR)', async () => {
      const response = await request(app)
        .get('/api/subscriptions/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.monthly_fee).toBe(50);
    });

    test('should have correct minimum balance (3000 SAR)', async () => {
      const response = await request(app)
        .get('/api/subscriptions/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.minimum_balance).toBe(3000);
    });

    test('should calculate yearly fee correctly (600 SAR)', async () => {
      const response = await request(app)
        .get('/api/subscriptions/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.yearly_fee).toBe(600);
    });
  });

  // ==========================================
  // GET ALL SUBSCRIPTIONS
  // ==========================================
  describe('GET /api/subscriptions', () => {
    
    test('should return all subscriptions for admin', async () => {
      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter by status (active/inactive/suspended)', async () => {
      const statuses = ['active', 'inactive', 'suspended'];
      
      for (const status of statuses) {
        const response = await request(app)
          .get(`/api/subscriptions?status=${status}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should filter by year', async () => {
      const response = await request(app)
        .get('/api/subscriptions?year=2025')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter members below minimum balance', async () => {
      const response = await request(app)
        .get('/api/subscriptions?below_minimum=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned should be below 3000 SAR
      response.body.data.forEach(sub => {
        expect(sub.balance).toBeLessThan(3000);
      });
    });

    test('should return overdue subscriptions', async () => {
      const response = await request(app)
        .get('/api/subscriptions?overdue=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================
  // GET MEMBER SUBSCRIPTION
  // ==========================================
  describe('GET /api/subscriptions/member/:memberId', () => {
    
    test('should return member subscription details', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/member/${testMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('member_id');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('status');
    });

    test('should include payment history', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/member/${testMemberId}?include_history=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('payment_history');
      expect(Array.isArray(response.body.data.payment_history)).toBe(true);
    });

    test('should calculate years paid correctly', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/member/${testMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const balance = response.body.data.balance;
      const yearsPaid = Math.floor(balance / 600);
      expect(response.body.data.years_paid).toBe(yearsPaid);
    });

    test('member can view own subscription', async () => {
      const response = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('member cannot view others subscription', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/member/other-member-id`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // PAYMENT PROCESSING
  // ==========================================
  describe('POST /api/subscriptions/pay', () => {
    
    describe('Valid Payments', () => {
      test('should accept payment of 50 SAR (minimum)', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 50,
            payment_method: 'bank_transfer'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.amount).toBe(50);
      });

      test('should accept payment of 600 SAR (yearly)', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 600,
            payment_method: 'bank_transfer'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should accept payment of 3000 SAR (5 years)', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 3000,
            payment_method: 'bank_transfer'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should update member balance after payment', async () => {
        // Get current balance
        const before = await request(app)
          .get(`/api/subscriptions/member/${testMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        const oldBalance = before.body.data.balance;

        // Make payment
        await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 100,
            payment_method: 'cash'
          });

        // Check new balance
        const after = await request(app)
          .get(`/api/subscriptions/member/${testMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(after.body.data.balance).toBe(oldBalance + 100);
      });

      test('should accept different payment methods', async () => {
        const methods = ['cash', 'bank_transfer', 'card', 'online'];
        
        for (const method of methods) {
          const response = await request(app)
            .post('/api/subscriptions/pay')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              member_id: testMemberId,
              amount: 50,
              payment_method: method
            });

          expect([200, 201]).toContain(response.status);
        }
      });
    });

    describe('Invalid Payments', () => {
      test('should reject payment below minimum (< 50 SAR)', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 25,
            payment_method: 'cash'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('minimum');
      });

      test('should reject zero amount', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 0,
            payment_method: 'cash'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test('should reject negative amount', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: -100,
            payment_method: 'cash'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test('should reject non-numeric amount', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 'fifty',
            payment_method: 'cash'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test('should reject invalid member_id', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: 'invalid-uuid',
            amount: 50,
            payment_method: 'cash'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test('should reject missing payment_method', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            amount: 50
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Authorization', () => {
      test('financial_manager can process payments', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${financialManagerToken}`)
          .send({
            member_id: testMemberId,
            amount: 50,
            payment_method: 'cash'
          });

        expect([200, 201]).toContain(response.status);
      });

      test('regular member cannot process payments for others', async () => {
        const response = await request(app)
          .post('/api/subscriptions/pay')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            member_id: 'other-member-id',
            amount: 50,
            payment_method: 'cash'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==========================================
  // PAYMENT ON BEHALF (نيابة عن)
  // ==========================================
  describe('POST /api/subscriptions/pay-behalf', () => {
    
    test('should allow payment on behalf of another member', async () => {
      const response = await request(app)
        .post('/api/subscriptions/pay-behalf')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          payer_id: 'payer-member-id',
          beneficiary_id: 'beneficiary-member-id',
          amount: 600,
          payment_method: 'bank_transfer'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('payer_id');
      expect(response.body.data).toHaveProperty('beneficiary_id');
    });

    test('should record who paid on behalf', async () => {
      const response = await request(app)
        .post('/api/subscriptions/pay-behalf')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          payer_id: 'payer-id',
          beneficiary_id: 'beneficiary-id',
          amount: 100,
          payment_method: 'cash'
        });

      expect(response.body.data.paid_by).toBe('payer-id');
    });
  });

  // ==========================================
  // SUBSCRIPTION REPORTS
  // ==========================================
  describe('GET /api/subscriptions/reports', () => {
    
    test('should return subscription summary', async () => {
      const response = await request(app)
        .get('/api/subscriptions/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total_members');
      expect(response.body.data).toHaveProperty('total_collected');
      expect(response.body.data).toHaveProperty('total_pending');
    });

    test('should return monthly breakdown', async () => {
      const response = await request(app)
        .get('/api/subscriptions/reports/monthly?year=2025')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(12); // 12 months
    });

    test('should return year-over-year comparison', async () => {
      const response = await request(app)
        .get('/api/subscriptions/reports/yearly')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================
  // BULK OPERATIONS
  // ==========================================
  describe('POST /api/subscriptions/bulk', () => {
    
    test('should process bulk payments', async () => {
      const response = await request(app)
        .post('/api/subscriptions/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          payments: [
            { member_id: 'id1', amount: 50 },
            { member_id: 'id2', amount: 100 },
            { member_id: 'id3', amount: 600 }
          ],
          payment_method: 'bank_transfer'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(3);
    });

    test('should report partial failures in bulk', async () => {
      const response = await request(app)
        .post('/api/subscriptions/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          payments: [
            { member_id: 'valid-id', amount: 50 },
            { member_id: 'invalid-id', amount: 50 }
          ],
          payment_method: 'cash'
        });

      expect(response.body.data).toHaveProperty('successful');
      expect(response.body.data).toHaveProperty('failed');
    });
  });
});
```

---

### 📄 FILE 3: dashboardController.js (66% → 90%)

```javascript
/**
 * @file dashboardController.test.js
 * @description Integration tests for Dashboard Controller
 * @target 90%+ coverage
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Dashboard Controller', () => {
  let adminToken, memberToken;

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================
  describe('GET /api/dashboard', () => {
    
    test('should return dashboard data for admin', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_members');
      expect(response.body.data).toHaveProperty('active_subscriptions');
      expect(response.body.data).toHaveProperty('total_revenue');
      expect(response.body.data).toHaveProperty('pending_payments');
    });

    test('should return member-specific dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('my_balance');
      expect(response.body.data).toHaveProperty('my_subscription_status');
    });

    test('should include recent activities', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('recent_activities');
      expect(Array.isArray(response.body.data.recent_activities)).toBe(true);
    });

    test('should include upcoming events', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('upcoming_events');
    });
  });

  // ==========================================
  // STATISTICS ENDPOINTS
  // ==========================================
  describe('GET /api/dashboard/statistics', () => {
    
    test('should return member statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/statistics/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('inactive');
      expect(response.body.data).toHaveProperty('by_branch');
    });

    test('should return financial statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/statistics/financial')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total_collected');
      expect(response.body.data).toHaveProperty('total_pending');
      expect(response.body.data).toHaveProperty('collection_rate');
    });

    test('should return subscription statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/statistics/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('expired');
      expect(response.body.data).toHaveProperty('below_minimum');
    });

    test('should filter statistics by date range', async () => {
      const response = await request(app)
        .get('/api/dashboard/statistics/financial?from=2025-01-01&to=2025-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return Hijri calendar statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/statistics/hijri')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('current_hijri_date');
    });
  });

  // ==========================================
  // CHARTS DATA
  // ==========================================
  describe('GET /api/dashboard/charts', () => {
    
    test('should return monthly revenue chart data', async () => {
      const response = await request(app)
        .get('/api/dashboard/charts/revenue?year=2025')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('month');
      expect(response.body.data[0]).toHaveProperty('amount');
    });

    test('should return member growth chart data', async () => {
      const response = await request(app)
        .get('/api/dashboard/charts/member-growth')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return payment distribution chart', async () => {
      const response = await request(app)
        .get('/api/dashboard/charts/payment-distribution')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('by_method');
    });

    test('should return branch distribution chart', async () => {
      const response = await request(app)
        .get('/api/dashboard/charts/branch-distribution')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ==========================================
  // QUICK ACTIONS
  // ==========================================
  describe('Dashboard Quick Actions', () => {
    
    test('should return pending approvals count', async () => {
      const response = await request(app)
        .get('/api/dashboard/pending-approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('count');
    });

    test('should return notifications count', async () => {
      const response = await request(app)
        .get('/api/dashboard/notifications/unread')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('count');
    });
  });

  // ==========================================
  // ERROR HANDLING
  // ==========================================
  describe('Error Handling', () => {
    
    test('should handle invalid date range', async () => {
      const response = await request(app)
        .get('/api/dashboard/statistics/financial?from=invalid&to=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    test('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/dashboard/statistics/financial')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
```

---

### 📄 FILE 4: membersController.js (63% → 90%)

```javascript
/**
 * @file membersController.test.js
 * @description Integration tests for Members Controller
 * @target 90%+ coverage
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Members Controller', () => {
  let adminToken;

  // ==========================================
  // CREATE MEMBER
  // ==========================================
  describe('POST /api/members', () => {
    
    describe('Valid Member Creation', () => {
      test('should create member with Arabic name', async () => {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'محمد عبدالله الشعيل',
            full_name_en: 'Mohammed Abdullah Al-Shuail',
            phone: '+966501234567',
            national_id: '1234567890',
            date_of_birth: '1990-01-15',
            gender: 'male'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('membership_number');
        expect(response.body.data.membership_number).toMatch(/^SH-\d{4}$/);
      });

      test('should generate unique membership number (SH-XXXX)', async () => {
        const member1 = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ full_name_ar: 'عضو أول', phone: '+966500000001' });

        const member2 = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ full_name_ar: 'عضو ثاني', phone: '+966500000002' });

        expect(member1.body.data.membership_number).not.toBe(
          member2.body.data.membership_number
        );
      });

      test('should accept Saudi phone format (+966)', async () => {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'عضو سعودي',
            phone: '+966501234567'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      test('should accept Kuwait phone format (+965)', async () => {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'عضو كويتي',
            phone: '+96550012345'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      test('should assign to family branch', async () => {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'عضو مع فخذ',
            phone: '+966501234567',
            family_branch_id: 'valid-branch-uuid'
          })
          .expect(201);

        expect(response.body.data.family_branch_id).toBe('valid-branch-uuid');
      });
    });

    describe('Validation Errors', () => {
      test('should reject missing Arabic name', async () => {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_en: 'English Name Only',
            phone: '+966501234567'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('full_name_ar');
      });

      test('should reject invalid phone format', async () => {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'اسم عربي',
            phone: '+1234567890' // Invalid country
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test('should reject duplicate phone number', async () => {
        // Create first member
        await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'العضو الأول',
            phone: '+966509999999'
          });

        // Try to create second with same phone
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'العضو الثاني',
            phone: '+966509999999'
          })
          .expect(400);

        expect(response.body.message).toContain('phone');
      });

      test('should reject duplicate national_id', async () => {
        const nationalId = '9999999999';
        
        await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'الأول',
            phone: '+966501111111',
            national_id: nationalId
          });

        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'الثاني',
            phone: '+966502222222',
            national_id: nationalId
          })
          .expect(400);

        expect(response.body.message).toContain('national_id');
      });

      test('should reject invalid date_of_birth format', async () => {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'اسم',
            phone: '+966501234567',
            date_of_birth: 'not-a-date'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test('should reject future date_of_birth', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            full_name_ar: 'اسم',
            phone: '+966501234567',
            date_of_birth: futureDate.toISOString().split('T')[0]
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==========================================
  // GET MEMBERS
  // ==========================================
  describe('GET /api/members', () => {
    
    test('should return paginated members', async () => {
      const response = await request(app)
        .get('/api/members?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    test('should search by Arabic name', async () => {
      const response = await request(app)
        .get('/api/members?search=محمد')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by family branch', async () => {
      const response = await request(app)
        .get('/api/members?branch_id=some-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/members?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should sort by different fields', async () => {
      const fields = ['full_name_ar', 'created_at', 'membership_number'];
      
      for (const field of fields) {
        const response = await request(app)
          .get(`/api/members?sort=${field}&order=asc`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  // ==========================================
  // UPDATE MEMBER
  // ==========================================
  describe('PUT /api/members/:id', () => {
    let existingMemberId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name_ar: 'للتعديل',
          phone: '+966508888888'
        });
      existingMemberId = response.body.data.id;
    });

    test('should update member name', async () => {
      const response = await request(app)
        .put(`/api/members/${existingMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name_ar: 'الاسم الجديد'
        })
        .expect(200);

      expect(response.body.data.full_name_ar).toBe('الاسم الجديد');
    });

    test('should update member phone', async () => {
      const response = await request(app)
        .put(`/api/members/${existingMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phone: '+966507777777'
        })
        .expect(200);

      expect(response.body.data.phone).toBe('+966507777777');
    });

    test('should not update membership_number', async () => {
      const response = await request(app)
        .put(`/api/members/${existingMemberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          membership_number: 'SH-9999'
        })
        .expect(200);

      expect(response.body.data.membership_number).not.toBe('SH-9999');
    });

    test('should return 404 for non-existent member', async () => {
      const response = await request(app)
        .put('/api/members/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ full_name_ar: 'test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // DELETE MEMBER
  // ==========================================
  describe('DELETE /api/members/:id', () => {
    
    test('should soft delete member', async () => {
      // Create member
      const createResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name_ar: 'للحذف',
          phone: '+966506666666'
        });

      const memberId = createResponse.body.data.id;

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify soft deleted
      const getResponse = await request(app)
        .get(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.body.data.is_active).toBe(false);
    });

    test('should not permanently delete (soft delete only)', async () => {
      // Implementation depends on your soft delete approach
    });
  });

  // ==========================================
  // IMPORT/EXPORT
  // ==========================================
  describe('POST /api/members/import', () => {
    
    test('should import members from Excel', async () => {
      // Create a test Excel file or use mock
      const response = await request(app)
        .post('/api/members/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', 'tests/fixtures/members_sample.xlsx')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('imported');
      expect(response.body.data).toHaveProperty('failed');
    });

    test('should validate data during import', async () => {
      // Test with invalid data
    });
  });

  describe('GET /api/members/export', () => {
    
    test('should export members to Excel', async () => {
      const response = await request(app)
        .get('/api/members/export?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/spreadsheet|octet-stream/);
    });
  });
});
```

---

### 📄 FILE 5: financialReportsController.js (60% → 90%)

```javascript
/**
 * @file financialReportsController.test.js
 * @description Integration tests for Financial Reports Controller
 * @target 90%+ coverage
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Financial Reports Controller', () => {
  let adminToken, financialManagerToken;

  // ==========================================
  // SUMMARY REPORTS
  // ==========================================
  describe('GET /api/reports/financial/summary', () => {
    
    test('should return financial summary', async () => {
      const response = await request(app)
        .get('/api/reports/financial/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_revenue');
      expect(response.body.data).toHaveProperty('total_expenses');
      expect(response.body.data).toHaveProperty('net_balance');
      expect(response.body.data).toHaveProperty('collection_rate');
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/reports/financial/summary?from=2025-01-01&to=2025-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by Hijri date range', async () => {
      const response = await request(app)
        .get('/api/reports/financial/summary?hijri_from=1446-01-01&hijri_to=1446-12-30')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('financial_manager can access', async () => {
      const response = await request(app)
        .get('/api/reports/financial/summary')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================
  // REVENUE REPORTS
  // ==========================================
  describe('GET /api/reports/financial/revenue', () => {
    
    test('should return revenue breakdown', async () => {
      const response = await request(app)
        .get('/api/reports/financial/revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('subscriptions');
      expect(response.body.data).toHaveProperty('diya_contributions');
      expect(response.body.data).toHaveProperty('donations');
    });

    test('should return monthly breakdown', async () => {
      const response = await request(app)
        .get('/api/reports/financial/revenue/monthly?year=2025')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(12);
    });

    test('should return revenue by payment method', async () => {
      const response = await request(app)
        .get('/api/reports/financial/revenue/by-method')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('cash');
      expect(response.body.data).toHaveProperty('bank_transfer');
    });

    test('should return revenue by branch', async () => {
      const response = await request(app)
        .get('/api/reports/financial/revenue/by-branch')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ==========================================
  // EXPENSE REPORTS
  // ==========================================
  describe('GET /api/reports/financial/expenses', () => {
    
    test('should return expense summary', async () => {
      const response = await request(app)
        .get('/api/reports/financial/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('by_category');
    });

    test('should return expense by category', async () => {
      const response = await request(app)
        .get('/api/reports/financial/expenses/by-category')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ==========================================
  // SUBSCRIPTION REPORTS
  // ==========================================
  describe('GET /api/reports/financial/subscriptions', () => {
    
    test('should return subscription collection report', async () => {
      const response = await request(app)
        .get('/api/reports/financial/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total_expected');
      expect(response.body.data).toHaveProperty('total_collected');
      expect(response.body.data).toHaveProperty('collection_rate');
    });

    test('should identify members with balance below minimum', async () => {
      const response = await request(app)
        .get('/api/reports/financial/subscriptions/below-minimum')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(member => {
        expect(member.balance).toBeLessThan(3000);
      });
    });

    test('should return overdue payments list', async () => {
      const response = await request(app)
        .get('/api/reports/financial/subscriptions/overdue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ==========================================
  // DIYA REPORTS
  // ==========================================
  describe('GET /api/reports/financial/diya', () => {
    
    test('should return Diya cases summary', async () => {
      const response = await request(app)
        .get('/api/reports/financial/diya')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total_cases');
      expect(response.body.data).toHaveProperty('total_amount');
      expect(response.body.data).toHaveProperty('total_collected');
    });

    test('should return Diya case details', async () => {
      const response = await request(app)
        .get('/api/reports/financial/diya/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return contributions by member', async () => {
      const response = await request(app)
        .get('/api/reports/financial/diya/contributions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ==========================================
  // EXPORT REPORTS
  // ==========================================
  describe('POST /api/reports/financial/export', () => {
    
    test('should export to Excel', async () => {
      const response = await request(app)
        .post('/api/reports/financial/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'xlsx',
          report_type: 'summary',
          date_range: { from: '2025-01-01', to: '2025-12-31' }
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/spreadsheet|octet-stream/);
    });

    test('should export to PDF', async () => {
      const response = await request(app)
        .post('/api/reports/financial/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'pdf',
          report_type: 'summary'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/pdf|octet-stream/);
    });

    test('should export custom date range', async () => {
      const response = await request(app)
        .post('/api/reports/financial/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'xlsx',
          report_type: 'detailed',
          date_range: {
            from: '2025-01-01',
            to: '2025-03-31'
          }
        })
        .expect(200);
    });
  });

  // ==========================================
  // AUDIT LOG
  // ==========================================
  describe('GET /api/reports/financial/audit', () => {
    
    test('should return audit log for super_admin only', async () => {
      const response = await request(app)
        .get('/api/reports/financial/audit')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should reject non-super_admin access', async () => {
      const response = await request(app)
        .get('/api/reports/financial/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should filter audit by action type', async () => {
      const response = await request(app)
        .get('/api/reports/financial/audit?action=payment')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter audit by user', async () => {
      const response = await request(app)
        .get('/api/reports/financial/audit?user_id=some-uuid')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================
  // ERROR HANDLING
  // ==========================================
  describe('Error Handling', () => {
    
    test('should handle invalid date format', async () => {
      const response = await request(app)
        .get('/api/reports/financial/summary?from=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    test('should handle empty date range', async () => {
      const response = await request(app)
        .get('/api/reports/financial/summary?from=2025-12-01&to=2025-01-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });
  });
});
```

---

## Phase 3: VERIFICATION & FINAL CHECKS

### Step 3.1: Run All Tests
```bash
npm test
```

### Step 3.2: Check Coverage for Each File
```bash
# Generate detailed coverage report
npm run test:coverage -- \
  --collectCoverageFrom='src/controllers/membersMonitoringController.js' \
  --collectCoverageFrom='src/controllers/subscriptionController.js' \
  --collectCoverageFrom='src/controllers/dashboardController.js' \
  --collectCoverageFrom='src/controllers/membersController.js' \
  --collectCoverageFrom='src/controllers/financialReportsController.js' \
  --coverageReporters='text' \
  --coverageReporters='html'
```

### Step 3.3: Verify Each File >= 90%
```bash
# Check individual file coverage
npm run test:coverage -- \
  --collectCoverageFrom='src/controllers/membersMonitoringController.js' \
  --coverageThreshold='{"src/controllers/membersMonitoringController.js":{"lines":90}}'
```

### Step 3.4: Fix Any Gaps
If any file is below 90%:
1. Check coverage report: `coverage/lcov-report/index.html`
2. Identify uncovered lines (highlighted in red)
3. Write tests for those specific lines
4. Re-run coverage check

---

## Phase 4: BUG FIXING PROTOCOL

### When You Find a Bug:

```markdown
## Bug Report Template

**File**: [filename]
**Line**: [line number]
**Description**: [what's wrong]
**Expected**: [what should happen]
**Actual**: [what actually happens]

### Fix Applied:
[describe the fix]

### Test Added:
[test that verifies the fix]
```

### Common Issues to Look For:

1. **Missing Error Handling**
```javascript
// BAD
async function getData() {
  const result = await db.query(sql);
  return result;
}

// GOOD
async function getData() {
  try {
    const result = await db.query(sql);
    return result;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}
```

2. **Missing Input Validation**
```javascript
// BAD
function processPayment(amount) {
  return amount * 1.05;
}

// GOOD
function processPayment(amount) {
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid amount');
  }
  if (amount < 50) {
    throw new Error('Amount below minimum (50 SAR)');
  }
  return amount * 1.05;
}
```

3. **Missing Null Checks**
```javascript
// BAD
function getMemberName(member) {
  return member.full_name_ar;
}

// GOOD
function getMemberName(member) {
  if (!member) return null;
  return member.full_name_ar || member.full_name_en || 'Unknown';
}
```

---

## 📊 PROGRESS TRACKING

```markdown
| File | Before | After | Tests Added | Bugs Fixed |
|------|--------|-------|-------------|------------|
| membersMonitoringController | 78% | __% | __ | __ |
| subscriptionController | 75% | __% | __ | __ |
| dashboardController | 66% | __% | __ | __ |
| membersController | 63% | __% | __ | __ |
| financialReportsController | 60% | __% | __ | __ |
```

---

## 🎯 SUCCESS CRITERIA

```yaml
Mission Complete When:
  - membersMonitoringController.js >= 90%
  - subscriptionController.js >= 90%
  - dashboardController.js >= 90%
  - membersController.js >= 90%
  - financialReportsController.js >= 90%
  - All tests passing (100% pass rate)
  - No regressions in other files
  - All bugs documented and fixed
```

---

## 🚨 CRITICAL RULES

```
❌ NEVER reduce coverage on any file
❌ NEVER break existing passing tests
❌ NEVER skip test verification
❌ NEVER ignore discovered bugs

✅ ALWAYS run full test suite after changes
✅ ALWAYS document bugs found
✅ ALWAYS fix bugs before moving on
✅ ALWAYS commit after each file reaches 90%
```

---

## 📝 FINAL REPORT TEMPLATE

```markdown
# Final Report: Critical 5 Files Coverage Expansion

## Summary
- **Date**: [date]
- **Duration**: [time spent]
- **Objective**: Achieve 90%+ on 5 critical files

## Results

| File | Before | After | Change |
|------|--------|-------|--------|
| membersMonitoringController | 78% | __% | +__% |
| subscriptionController | 75% | __% | +__% |
| dashboardController | 66% | __% | +__% |
| membersController | 63% | __% | +__% |
| financialReportsController | 60% | __% | +__% |

## Tests Added
- Total new tests: __
- New assertions: __

## Bugs Found & Fixed
1. [Bug 1 description]
2. [Bug 2 description]
...

## Recommendations
- [Any follow-up items]

## Mission Status: ✅ COMPLETE / ❌ INCOMPLETE
```

---

**This prompt provides everything Claude Code needs to systematically test, inspect, fix, and achieve 90%+ coverage on the 5 critical files.**

---

*Document Version: 3.0*  
*Created: November 26, 2025*  
*Focus: 5 Critical Controllers Only*
