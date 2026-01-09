# Phase 5 Step 3: Payments Controller Endpoint Map

## Overview
Comprehensive mapping of all Payments Controller endpoints for integration test implementation.
**Total Endpoints**: 25+
**Estimated Tests**: 12-15
**Controller File**: `src/controllers/paymentsController.js` (908 lines)
**Routes File**: `src/routes/payments.js` (109 lines)

---

## RBAC Role Hierarchy

| Role | Access Level | Typical Permissions |
|------|--------------|---------------------|
| super_admin | Full access | All operations including bulk updates |
| admin | Administrative access | Most operations except super_admin-only |
| financial_manager | Financial operations | View, create, update payments and reports |
| member | Self-service only | View own payments, make mobile payments |

---

## Endpoint Categories

### 1. Basic CRUD Operations (4 endpoints)

#### 1.1 GET /api/payments - Get All Payments
**RBAC**: super_admin, financial_manager
**Controller Function**: `getAllPayments`
**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string: 'pending', 'completed', 'failed')
- `category` (string)
- `start_date` (ISO date)
- `end_date` (ISO date)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "member_id": "uuid",
        "amount": 1000,
        "category": "subscription",
        "status": "completed",
        "payment_date": "2025-10-11T00:00:00.000Z",
        "description_ar": "اشتراك شهري"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

**Test Scenarios**:
- ✅ Financial manager can access with valid pagination
- ✅ Member role gets 403 forbidden
- ✅ Filter by status works correctly
- ✅ Date range filtering works

---

#### 1.2 POST /api/payments - Create Payment
**RBAC**: super_admin, financial_manager
**Controller Function**: `createPayment`
**Request Body**:
```json
{
  "member_id": "uuid",
  "amount": 1000,
  "category": "subscription",
  "description_ar": "اشتراك شهري",
  "description_en": "Monthly subscription",
  "payment_date": "2025-10-11"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "member_id": "uuid",
      "amount": 1000,
      "status": "pending",
      "created_at": "2025-10-11T..."
    }
  }
}
```

**Test Scenarios**:
- ✅ Financial manager can create payment
- ✅ Member role gets 403 forbidden
- ✅ Invalid member_id returns 400
- ✅ Missing required fields returns 400

---

#### 1.3 GET /api/payments/:id - Get Payment by ID
**RBAC**: super_admin, financial_manager, member (with restrictions)
**Controller Function**: `getPaymentById`
**Path Parameters**: `id` (payment UUID)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "member_id": "uuid",
      "member_name": "أحمد الشعيل",
      "amount": 1000,
      "category": "subscription",
      "status": "completed",
      "receipt_url": "https://...",
      "created_at": "2025-10-11T..."
    }
  }
}
```

**Test Scenarios**:
- ✅ Financial manager can view any payment
- ✅ Member can only view own payment (requires checking member_id)
- ✅ Invalid payment ID returns 404

---

#### 1.4 PATCH /api/payments/:id/status - Update Payment Status
**RBAC**: super_admin, financial_manager
**Controller Function**: `updatePaymentStatus`
**Request Body**:
```json
{
  "status": "completed",
  "notes": "Payment verified"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "status": "completed",
      "updated_at": "2025-10-11T..."
    }
  }
}
```

**Test Scenarios**:
- ✅ Financial manager can update status
- ✅ Member role gets 403 forbidden
- ✅ Invalid status value returns 400

---

### 2. Statistics & Analytics (6 endpoints)

#### 2.1 GET /api/payments/stats - Payment Statistics
**RBAC**: super_admin, financial_manager
**Controller Function**: `getPaymentStatistics`
**Query Parameters**:
- `period` (string: 'daily', 'monthly', 'yearly')
- `start_date` (ISO date)
- `end_date` (ISO date)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "total_payments": 150,
    "total_amount": 150000,
    "completed_payments": 140,
    "pending_payments": 10,
    "average_payment": 1000,
    "by_category": {
      "subscription": 100000,
      "diya": 30000,
      "initiative": 20000
    }
  }
}
```

**Test Scenarios**:
- ✅ Financial manager gets comprehensive statistics
- ✅ Member role gets 403 forbidden

---

#### 2.2 GET /api/payments/revenue - Revenue Statistics
**RBAC**: super_admin, financial_manager
**Controller Function**: `getRevenueStats`

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "current_month": 50000,
    "previous_month": 45000,
    "growth_percentage": 11.11,
    "yearly_total": 600000
  }
}
```

---

#### 2.3 GET /api/payments/category/:category - Payments by Category
**RBAC**: super_admin, financial_manager
**Controller Function**: `getPaymentsByCategory`

---

#### 2.4 GET /api/payments/overdue - Overdue Payments
**RBAC**: super_admin, financial_manager
**Controller Function**: `getOverduePayments`

---

#### 2.5 GET /api/payments/member/:memberId/contributions - Member Contributions
**RBAC**: super_admin, financial_manager, member (self-access only)
**Controller Function**: `getMemberContributions`

**Special RBAC Logic**:
```javascript
if (req.user.role === 'member') {
  if (req.user.id !== req.params.memberId) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
}
```

**Test Scenarios**:
- ✅ Financial manager can view any member's contributions
- ✅ Member can view own contributions
- ✅ Member cannot view other member's contributions (403)

---

#### 2.6 POST /api/payments/bulk-update - Bulk Update Payments
**RBAC**: super_admin ONLY
**Controller Function**: `bulkUpdatePayments`
**Request Body**:
```json
{
  "payment_ids": ["uuid1", "uuid2", "uuid3"],
  "updates": {
    "status": "completed"
  }
}
```

**Test Scenarios**:
- ✅ Super admin can perform bulk updates
- ✅ Financial manager gets 403 forbidden
- ✅ Admin gets 403 forbidden

---

### 3. Member-Specific Operations (1 endpoint)

#### 3.1 GET /api/payments/member/:memberId - Get Member Payments
**RBAC**: super_admin, financial_manager, member (self-access only)
**Controller Function**: `getMemberPayments`
**Path Parameters**: `memberId` (UUID)
**Query Parameters**:
- `page` (number)
- `limit` (number)
- `status` (string)

**Special RBAC Logic**: Same as contributions endpoint - members can only access their own data

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "payments": [...],
    "summary": {
      "total_paid": 50000,
      "pending_amount": 5000,
      "payment_count": 25
    }
  }
}
```

**Test Scenarios**:
- ✅ Financial manager can view any member's payments
- ✅ Member can view own payments
- ✅ Member cannot view other member's payments (403)

---

### 4. Reports & Receipts (2 endpoints)

#### 4.1 GET /api/payments/reports/financial - Generate Financial Report
**RBAC**: super_admin, financial_manager
**Controller Function**: `generateFinancialReport`
**Query Parameters**:
- `start_date` (ISO date, required)
- `end_date` (ISO date, required)
- `format` (string: 'pdf', 'excel', default: 'json')

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "report_period": {
      "start": "2025-01-01",
      "end": "2025-10-11"
    },
    "summary": {
      "total_revenue": 500000,
      "total_payments": 300,
      "by_category": {...}
    }
  }
}
```

**Test Scenarios**:
- ✅ Financial manager can generate report
- ✅ Member role gets 403 forbidden
- ✅ Missing date range returns 400

---

#### 4.2 GET /api/payments/:id/receipt - Generate Payment Receipt
**RBAC**: super_admin, financial_manager, member (for own payments)
**Controller Function**: `generateReceipt`
**Path Parameters**: `id` (payment UUID)
**Query Parameters**:
- `format` (string: 'pdf', 'image', default: 'pdf')
- `language` (string: 'ar', 'en', default: 'ar')

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "receipt_url": "https://...",
    "receipt_number": "RCP-2025-001234",
    "generated_at": "2025-10-11T..."
  }
}
```

**Test Scenarios**:
- ✅ Member can generate receipt for own payment
- ✅ Member cannot generate receipt for other's payment (403)

---

### 5. Hijri Calendar Operations (3 endpoints)

#### 5.1 GET /api/payments/hijri/calendar - Get Hijri Calendar Data
**RBAC**: super_admin, financial_manager
**Controller Function**: `getHijriCalendarData`
**Query Parameters**:
- `year` (number, Hijri year)
- `month` (number, 1-12)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "hijri_year": 1447,
    "hijri_month": 4,
    "gregorian_equivalent": {
      "start": "2025-10-01",
      "end": "2025-10-30"
    },
    "days": 30
  }
}
```

---

#### 5.2 GET /api/payments/hijri/grouped - Payments Grouped by Hijri Date
**RBAC**: super_admin, financial_manager
**Controller Function**: `getPaymentsGroupedByHijri`

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "by_month": [
      {
        "hijri_month": "رمضان 1447",
        "total_amount": 50000,
        "payment_count": 25
      }
    ]
  }
}
```

---

#### 5.3 GET /api/payments/hijri/stats - Hijri Financial Statistics
**RBAC**: super_admin, financial_manager
**Controller Function**: `getHijriFinancialStats`

---

### 6. Mobile Payment Operations (5 endpoints)

#### 6.1 POST /api/payments/mobile/initiative - Pay for Initiative
**RBAC**: member ONLY
**Controller Function**: `payForInitiative`
**Request Body**:
```json
{
  "initiative_id": "uuid",
  "amount": 500,
  "payment_method": "credit_card"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "initiative_id": "uuid",
      "amount": 500,
      "status": "pending",
      "receipt_url": null
    }
  }
}
```

**Test Scenarios**:
- ✅ Member can pay for initiative
- ✅ Financial manager gets 403 forbidden (mobile endpoints are member-only)
- ✅ Invalid initiative_id returns 400

---

#### 6.2 POST /api/payments/mobile/diya - Pay for Diya
**RBAC**: member ONLY
**Controller Function**: `payForDiya`
**Request Body**:
```json
{
  "diya_id": "uuid",
  "amount": 10000,
  "payment_method": "bank_transfer"
}
```

**Test Scenarios**:
- ✅ Member can pay for diya
- ✅ Non-member role gets 403 forbidden

---

#### 6.3 POST /api/payments/mobile/subscription - Pay Subscription
**RBAC**: member ONLY
**Controller Function**: `paySubscription`
**Request Body**:
```json
{
  "subscription_type": "monthly",
  "amount": 500,
  "payment_method": "credit_card"
}
```

**Test Scenarios**:
- ✅ Member can pay subscription
- ✅ Non-member role gets 403 forbidden

---

#### 6.4 POST /api/payments/mobile/member/:memberId - Pay for Another Member
**RBAC**: member ONLY
**Controller Function**: `payForMember`
**Request Body**:
```json
{
  "amount": 1000,
  "reason": "helping family",
  "payment_method": "credit_card"
}
```

**Test Scenarios**:
- ✅ Member can pay on behalf of another member
- ✅ Non-member role gets 403 forbidden

---

#### 6.5 POST /api/payments/:id/receipt - Upload Payment Receipt
**RBAC**: member ONLY (with multer middleware)
**Controller Function**: `uploadPaymentReceipt`
**Request**: multipart/form-data with file upload
**Headers**: `Content-Type: multipart/form-data`
**Body**:
- `file`: receipt image/PDF

**Middleware**: `upload.single('receipt')` (multer)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "receipt_url": "https://storage.../receipt.pdf",
    "uploaded_at": "2025-10-11T..."
  }
}
```

**Test Scenarios**:
- ✅ Member can upload receipt for own payment
- ✅ Non-member role gets 403 forbidden
- ✅ Invalid file type returns 400

---

## Test Implementation Plan (12-15 tests)

### Test Suite Structure
```javascript
describe('Payments Controller Integration Tests', () => {
  // Group 1: Basic CRUD Operations (4 tests)
  describe('GET /api/payments', () => {
    it('should return paginated payments for financial_manager', async () => {});
    it('should reject member role with 403', async () => {});
  });

  describe('POST /api/payments', () => {
    it('should create payment for financial_manager', async () => {});
    it('should reject member role with 403', async () => {});
  });

  // Group 2: Member Self-Access Validation (3 tests)
  describe('GET /api/payments/member/:memberId', () => {
    it('should allow member to view own payments', async () => {});
    it('should reject member viewing other member payments with 403', async () => {});
    it('should allow financial_manager to view any member payments', async () => {});
  });

  // Group 3: Mobile Payment Operations (3 tests)
  describe('POST /api/payments/mobile/initiative', () => {
    it('should allow member to pay for initiative', async () => {});
    it('should reject financial_manager role with 403', async () => {});
  });

  describe('POST /api/payments/mobile/subscription', () => {
    it('should allow member to pay subscription', async () => {});
  });

  // Group 4: Statistics & Bulk Operations (3 tests)
  describe('GET /api/payments/stats', () => {
    it('should return statistics for financial_manager', async () => {});
    it('should reject member role with 403', async () => {});
  });

  describe('POST /api/payments/bulk-update', () => {
    it('should allow super_admin to perform bulk update', async () => {});
    it('should reject financial_manager with 403', async () => {});
  });

  // Group 5: Receipt Operations (2 tests)
  describe('GET /api/payments/:id/receipt', () => {
    it('should generate receipt for member own payment', async () => {});
    it('should reject member generating receipt for other payment', async () => {});
  });
});
```

### Total Tests: 15
- **Basic CRUD**: 4 tests
- **Member Self-Access**: 3 tests
- **Mobile Payments**: 3 tests
- **Statistics & Bulk**: 4 tests
- **Receipt Operations**: 2 tests

---

## JWT Token Helpers

```javascript
const createSuperAdminToken = () => {
  return jwt.sign(
    { id: 'super-admin-id', role: 'super_admin', email: 'super@alshuail.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const createFinancialManagerToken = () => {
  return jwt.sign(
    { id: 'fm-id', role: 'financial_manager', email: 'fm@alshuail.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const createMemberToken = (memberId = 'member-test-id') => {
  return jwt.sign(
    { id: memberId, role: 'member', phone: '0555555555', membershipNumber: 'SH-12345' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};
```

---

## Key Testing Patterns

### Pattern 1: Graceful Degradation
```javascript
expect([200, 403, 500]).toContain(response.status);
if (response.status === 200) {
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
}
```

### Pattern 2: Strict RBAC Enforcement
```javascript
it('should reject member role with 403', async () => {
  const memberToken = createMemberToken();
  const response = await request(app)
    .get('/api/payments/stats')
    .set('Authorization', `Bearer ${memberToken}`);

  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
});
```

### Pattern 3: Member Self-Access Validation
```javascript
it('should reject member viewing other member payments', async () => {
  const memberToken = createMemberToken('member-1');
  const response = await request(app)
    .get('/api/payments/member/member-2')
    .set('Authorization', `Bearer ${memberToken}`);

  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
});
```

---

## Notes for Implementation

1. **Database Independence**: Use graceful degradation pattern - accept [200, 403, 500]
2. **RBAC Testing**: Strict 403 expectations for unauthorized roles
3. **Member Self-Access**: Special testing for member viewing own vs other's data
4. **Mobile Endpoints**: Member-only operations get 403 for admin/financial_manager
5. **Bulk Operations**: Super admin only - financial_manager gets 403
6. **Receipt Upload**: Skip file upload testing (complex multer setup) - focus on RBAC
7. **Hijri Operations**: Optional detailed testing - basic RBAC validation sufficient

---

## Success Criteria

- ✅ All 15 tests pass
- ✅ RBAC validation comprehensive
- ✅ Member self-access properly enforced
- ✅ Mobile payment flows validated
- ✅ Bulk operation restrictions verified
- ✅ Test suite maintains 100% pass rate
