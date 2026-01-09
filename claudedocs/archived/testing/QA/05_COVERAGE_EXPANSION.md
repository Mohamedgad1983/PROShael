# 📈 COVERAGE EXPANSION STRATEGY

## Goal: Increase Coverage from 20.2% to 70%+

This document provides a systematic approach to adding new test cases to significantly improve code coverage while focusing on business-critical paths.

---

## 🎯 COVERAGE PRIORITIES BY BUSINESS IMPACT

### Priority 1: CRITICAL (Target: 90%+ coverage)
**Business Impact**: System-breaking if bugs exist  
**Test Count Needed**: ~150 new tests

1. **Authentication & Authorization** (Current: Unknown, Target: 90%)
   - JWT token generation and validation
   - RBAC permission checks for all 7 roles
   - Password hashing and comparison
   - Token expiration handling
   - Session management

2. **Member Management** (Current: Unknown, Target: 90%)
   - Member CRUD operations
   - Membership number generation (SH-XXXX)
   - National ID validation (Saudi/Kuwait)
   - Phone number validation
   - Arabic name validation
   - Member profile updates
   - Member deactivation/reactivation

3. **Subscription Management** (Current: Unknown, Target: 95%)
   - Subscription calculation (50 SAR base)
   - Family discount logic (5+ members = 10% off)
   - Subscription status tracking
   - Subscription renewal
   - Overdue subscription handling

4. **Payment Processing** (Current: Unknown, Target: 95%)
   - Payment creation and validation
   - Payment method handling
   - Member balance updates
   - Payment confirmation
   - Payment cancellation

5. **Family Tree Operations** (Current: Unknown, Target: 85%)
   - Relationship creation
   - Circular reference prevention
   - Self-reference prevention
   - Tree traversal algorithms
   - Generation level calculation

### Priority 2: HIGH (Target: 70%+ coverage)
**Business Impact**: Critical features but with workarounds  
**Test Count Needed**: ~100 new tests

6. **Financial Contributions (Diya)** (Current: Unknown, Target: 75%)
7. **Activities & Events Management** (Target: 70%)
8. **Document Management** (Target: 70%)
9. **Family Branch Management** (Target: 75%)
10. **Notifications System** (Target: 65%)

### Priority 3: MEDIUM (Target: 50%+ coverage)
**Business Impact**: Important but not system-critical  
**Test Count Needed**: ~50 new tests

11. **Reporting & Analytics** (Target: 50%)
12. **Audit Logging** (Target: 55%)
13. **Settings Management** (Target: 50%)
14. **Competition Management** (Target: 45%)
15. **Initiative Management** (Target: 45%)

---

## 📝 TEST TEMPLATES FOR EACH CATEGORY

### Template 1: Member Lifecycle Tests

```javascript
// File: test/integration/member-lifecycle.test.js

const request = require('supertest');
const app = require('../../src/app');
const { createAuthToken, createTestMember } = require('../helpers/testHelpers');

describe('Member Lifecycle - Complete Flow', () => {
  let adminToken;
  
  beforeAll(async () => {
    const { token } = createAuthToken('super_admin');
    adminToken = token;
  });
  
  describe('Member Registration', () => {
    test('should register new member with complete profile', async () => {
      const memberData = {
        full_name_ar: 'محمد بن عبدالله الشعيل',
        full_name_en: 'Mohammed Abdullah Alshuail',
        national_id: '1234567890',
        phone: '+966550000001',
        email: 'mohammed@test.com',
        date_of_birth: '1990-01-01',
        gender: 'male',
        marital_status: 'married',
        family_branch_id: testBranch.id
      };
      
      const response = await request(app)
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData)
        .expect(201);
      
      // Verify member created
      expect(response.body.data).toMatchObject({
        full_name_ar: memberData.full_name_ar,
        full_name_en: memberData.full_name_en,
        national_id: memberData.national_id,
        phone: memberData.phone
      });
      
      // Verify membership number generated
      expect(response.body.data.membership_number).toMatch(/^SH-\d{4}$/);
      
      // Verify ID is UUID
      expect(response.body.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
    
    test('should upload member photo during registration', async () => {
      const member = await createTestMember();
      
      const response = await request(app)
        .post(`/api/v1/members/${member.id}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photo', 'test/fixtures/test-photo.jpg')
        .expect(200);
      
      expect(response.body.data.profile_photo_url).toBeDefined();
      expect(response.body.data.profile_photo_url).toContain('member-photos');
    });
    
    test('should create subscription automatically for new member', async () => {
      const member = await createTestMember();
      
      // Check subscription was created
      const response = await request(app)
        .get(`/api/v1/subscriptions?member_id=${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].amount).toBe(50);
      expect(response.body.data[0].status).toBe('active');
    });
  });
  
  describe('Member Profile Updates', () => {
    test('should update member profile with audit trail', async () => {
      const member = await createTestMember();
      
      const updates = {
        phone: '+966550000002',
        email: 'newemail@test.com'
      };
      
      const response = await request(app)
        .put(`/api/v1/members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);
      
      expect(response.body.data.phone).toBe(updates.phone);
      expect(response.body.data.email).toBe(updates.email);
      
      // Verify audit log created
      const auditResponse = await request(app)
        .get(`/api/v1/audit-logs?resource_id=${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(auditResponse.body.data).toContainEqual(
        expect.objectContaining({
          action: 'update',
          resource_type: 'member'
        })
      );
    });
    
    test('should prevent updating to duplicate national_id', async () => {
      const member1 = await createTestMember({ national_id: '1111111111' });
      const member2 = await createTestMember({ national_id: '2222222222' });
      
      await request(app)
        .put(`/api/v1/members/${member2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ national_id: '1111111111' })  // Trying to use member1's ID
        .expect(400);
    });
  });
  
  describe('Member Deactivation', () => {
    test('should soft delete member (set is_active = false)', async () => {
      const member = await createTestMember();
      
      const response = await request(app)
        .delete(`/api/v1/members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data.is_active).toBe(false);
      expect(response.body.data.deleted_at).toBeDefined();
      
      // Verify member still in database
      const checkResponse = await request(app)
        .get(`/api/v1/members/${member.id}?include_inactive=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(checkResponse.body.data).toBeDefined();
    });
    
    test('should reactivate deactivated member', async () => {
      const member = await createTestMember();
      
      // Deactivate
      await request(app)
        .delete(`/api/v1/members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      // Reactivate
      const response = await request(app)
        .post(`/api/v1/members/${member.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data.is_active).toBe(true);
      expect(response.body.data.deleted_at).toBeNull();
    });
  });
  
  describe('Performance with 347+ Members', () => {
    test('should list all members without performance degradation', async () => {
      // Assuming 347 members already in test database
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/members?limit=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.body.data.length).toBeGreaterThanOrEqual(347);
      expect(duration).toBeLessThan(500);  // Should complete in < 500ms
    });
  });
});
```

---

### Template 2: Subscription & Payment Tests

```javascript
// File: test/integration/subscription-payment.test.js

describe('Subscription & Payment - Financial Core', () => {
  let member, adminToken, financialManagerToken;
  
  beforeAll(async () => {
    member = await createTestMember();
    adminToken = createAuthToken('super_admin').token;
    financialManagerToken = createAuthToken('financial_manager').token;
  });
  
  describe('Subscription Calculation', () => {
    test('should calculate base subscription as 50 SAR', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          member_id: member.id,
          plan_type: 'monthly'
        })
        .expect(201);
      
      expect(response.body.data.amount).toBe(50);
      expect(response.body.data.currency).toBe('SAR');
    });
    
    test('should apply 10% family discount for 5+ members', async () => {
      // Create family with 5 members
      const family = await createTestFamily({ member_count: 5 });
      
      const response = await request(app)
        .post('/api/v1/subscriptions/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          family_id: family.id
        })
        .expect(200);
      
      expect(response.body.data.amount_per_member).toBe(45);  // 50 * 0.9
      expect(response.body.data.discount_applied).toBe(10);   // percentage
    });
    
    test('should not apply discount for 4 or fewer members', async () => {
      const family = await createTestFamily({ member_count: 4 });
      
      const response = await request(app)
        .post('/api/v1/subscriptions/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          family_id: family.id
        })
        .expect(200);
      
      expect(response.body.data.amount_per_member).toBe(50);
      expect(response.body.data.discount_applied).toBe(0);
    });
  });
  
  describe('Subscription Lifecycle', () => {
    test('should create active subscription', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          member_id: member.id,
          start_date: '2025-01-01',
          auto_renew: true
        })
        .expect(201);
      
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.start_date).toBe('2025-01-01');
    });
    
    test('should mark subscription as overdue after end_date', async () => {
      // Create subscription that ended yesterday
      const subscription = await createTestSubscription({
        member_id: member.id,
        end_date: '2025-11-24'  // Yesterday
      });
      
      // Run overdue check job
      await runSubscriptionStatusCheck();
      
      const response = await request(app)
        .get(`/api/v1/subscriptions/${subscription.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data.status).toBe('overdue');
    });
    
    test('should renew subscription automatically if auto_renew = true', async () => {
      const subscription = await createTestSubscription({
        member_id: member.id,
        end_date: '2025-11-24',
        auto_renew: true
      });
      
      await runSubscriptionRenewal();
      
      const response = await request(app)
        .get(`/api/v1/subscriptions?member_id=${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      // Should have new subscription
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].status).toBe('active');
    });
  });
  
  describe('Payment Processing', () => {
    let subscription;
    
    beforeEach(async () => {
      subscription = await createTestSubscription({
        member_id: member.id,
        amount: 50
      });
    });
    
    test('should process bank transfer payment', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payer_id: member.id,
          subscription_id: subscription.id,
          amount: 50,
          currency: 'SAR',
          payment_method: 'bank_transfer',
          reference_number: 'REF123456',
          payment_date: '2025-11-25'
        })
        .expect(201);
      
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.amount).toBe(50);
    });
    
    test('should update member balance after payment', async () => {
      const initialBalance = member.balance || 0;
      
      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payer_id: member.id,
          subscription_id: subscription.id,
          amount: 50,
          currency: 'SAR',
          payment_method: 'cash',
          payment_date: '2025-11-25'
        })
        .expect(201);
      
      // Check updated balance
      const response = await request(app)
        .get(`/api/v1/members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data.balance).toBe(initialBalance + 50);
    });
    
    test('should generate payment receipt with Hijri date', async () => {
      const payment = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payer_id: member.id,
          subscription_id: subscription.id,
          amount: 50,
          currency: 'SAR',
          payment_method: 'electronic',
          payment_date: '2025-11-25'
        })
        .expect(201);
      
      const receiptResponse = await request(app)
        .get(`/api/v1/payments/${payment.body.data.id}/receipt`)
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .expect(200);
      
      expect(receiptResponse.body.data.hijri_date).toBeDefined();
      expect(receiptResponse.body.data.hijri_date).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2}$/);
    });
    
    test('should reject payment with invalid amount', async () => {
      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${financialManagerToken}`)
        .send({
          payer_id: member.id,
          subscription_id: subscription.id,
          amount: -50,  // Negative amount
          currency: 'SAR',
          payment_method: 'cash'
        })
        .expect(400);
    });
  });
  
  describe('Bulk Operations', () => {
    test('should process monthly renewals for 347 members', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/subscriptions/bulk-renew')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          renewal_date: '2025-12-01'
        })
        .expect(200);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.body.data.processed_count).toBeGreaterThanOrEqual(347);
      expect(duration).toBeLessThan(5000);  // Should complete in < 5 seconds
    });
  });
});
```

---

### Template 3: Family Tree Tests

```javascript
// File: test/integration/family-tree.test.js

describe('Family Tree - Relationship Management', () => {
  let members, adminToken, familyTreeManagerToken;
  
  beforeAll(async () => {
    adminToken = createAuthToken('super_admin').token;
    familyTreeManagerToken = createAuthToken('family_tree_manager').token;
    
    // Create test members
    members = {
      grandfather: await createTestMember({ full_name_en: 'Grandfather' }),
      father: await createTestMember({ full_name_en: 'Father' }),
      son: await createTestMember({ full_name_en: 'Son' }),
      daughter: await createTestMember({ full_name_en: 'Daughter' }),
      uncle: await createTestMember({ full_name_en: 'Uncle' })
    };
  });
  
  describe('Relationship Creation', () => {
    test('should create valid father-son relationship', async () => {
      const response = await request(app)
        .post('/api/v1/family-relationships')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_from: members.father.id,
          member_to: members.son.id,
          relationship_type: 'father'
        })
        .expect(201);
      
      expect(response.body.data.relationship_type).toBe('father');
    });
    
    test('should create multiple relationships for same member', async () => {
      // Father -> Son
      await request(app)
        .post('/api/v1/family-relationships')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_from: members.father.id,
          member_to: members.son.id,
          relationship_type: 'father'
        })
        .expect(201);
      
      // Father -> Daughter
      await request(app)
        .post('/api/v1/family-relationships')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_from: members.father.id,
          member_to: members.daughter.id,
          relationship_type: 'father'
        })
        .expect(201);
      
      // Query all relationships
      const response = await request(app)
        .get(`/api/v1/family-relationships?member_from=${members.father.id}`)
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveLength(2);
    });
  });
  
  describe('Relationship Validation', () => {
    test('should prevent self-referential relationship', async () => {
      await request(app)
        .post('/api/v1/family-relationships')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_from: members.father.id,
          member_to: members.father.id,  // Same member!
          relationship_type: 'brother'
        })
        .expect(400);
    });
    
    test('should prevent circular relationship', async () => {
      // Create: Father -> Son
      await request(app)
        .post('/api/v1/family-relationships')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_from: members.father.id,
          member_to: members.son.id,
          relationship_type: 'father'
        })
        .expect(201);
      
      // Try to create: Son -> Father (would create cycle)
      await request(app)
        .post('/api/v1/family-relationships')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_from: members.son.id,
          member_to: members.father.id,
          relationship_type: 'son'
        })
        .expect(400);  // Should be rejected
    });
    
    test('should reject invalid relationship type', async () => {
      await request(app)
        .post('/api/v1/family-relationships')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_from: members.father.id,
          member_to: members.son.id,
          relationship_type: 'invalid_type'
        })
        .expect(400);
    });
  });
  
  describe('Family Tree Construction', () => {
    test('should build complete family tree', async () => {
      // Create tree: Grandfather -> Father -> Son
      await request(app)
        .post('/api/v1/family-tree')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_id: members.grandfather.id,
          parent_member_id: null,  // Root
          generation_level: 0
        })
        .expect(201);
      
      await request(app)
        .post('/api/v1/family-tree')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_id: members.father.id,
          parent_member_id: members.grandfather.id,
          generation_level: 1
        })
        .expect(201);
      
      await request(app)
        .post('/api/v1/family-tree')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .send({
          member_id: members.son.id,
          parent_member_id: members.father.id,
          generation_level: 2
        })
        .expect(201);
      
      // Get tree from root
      const response = await request(app)
        .get(`/api/v1/family-tree/${members.grandfather.id}/descendants`)
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .expect(200);
      
      expect(response.body.data.children).toHaveLength(1);
      expect(response.body.data.children[0].children).toHaveLength(1);
    });
    
    test('should calculate generation levels correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/family-tree/${members.son.id}`)
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .expect(200);
      
      expect(response.body.data.generation_level).toBe(2);
    });
  });
  
  describe('Performance with Large Trees', () => {
    test('should handle tree with 1000+ members', async () => {
      // Assuming large tree already created
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/family-tree/root/descendants')
        .set('Authorization', `Bearer ${familyTreeManagerToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000);  // Should complete in < 2 seconds
    });
  });
});
```

---

## 📊 COVERAGE TRACKING TEMPLATE

Create file: `test/coverage-tracking.md`

```markdown
# Code Coverage Tracking

## Current Status
- **Date**: [Auto-updated]
- **Overall Coverage**: [X]%
- **Target**: 70%+

## Coverage by Category

### Authentication & Authorization
- **Current**: [X]%
- **Target**: 90%
- **Tests Added**: [count]
- **Status**: [On Track / Behind / Complete]

### Member Management
- **Current**: [X]%
- **Target**: 90%
- **Tests Added**: [count]
- **Status**: [On Track / Behind / Complete]

### Subscription Management
- **Current**: [X]%
- **Target**: 95%
- **Tests Added**: [count]
- **Status**: [On Track / Behind / Complete]

[... continue for all categories]

## Recent Improvements
- [Date]: Added 25 member lifecycle tests → Coverage increased from X% to Y%
- [Date]: Added 15 subscription tests → Coverage increased from Y% to Z%

## Gaps Identified
- [ ] Missing tests for payment cancellation flow
- [ ] Need more edge case tests for family tree
- [ ] Arabic text validation needs more coverage
```

---

## ✅ COVERAGE COMPLETION CRITERIA

Coverage expansion is complete when:

```markdown
- [ ] Overall coverage >= 70%
- [ ] All Priority 1 categories >= 90%
- [ ] All Priority 2 categories >= 70%
- [ ] All Priority 3 categories >= 50%
- [ ] Integration tests added for key workflows
- [ ] Performance tests added for scale (347+ members)
- [ ] Edge cases tested (null, empty, invalid, extreme values)
- [ ] Arabic/Hijri functionality fully tested
- [ ] RBAC tested for all 7 roles
- [ ] Documentation updated
```

---

**Next Steps**: Proceed to `06_EXECUTION_CHECKLIST.md` for implementation guidance.
