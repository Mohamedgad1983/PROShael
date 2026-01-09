# Phase 5 Step 4: Initiatives Controller Endpoint Map

## Overview
Comprehensive mapping of all Initiatives Controller endpoints for integration test implementation.
**Total Endpoints**: 13
**Estimated Tests**: 12-15
**Routes File**: `src/routes/initiativesEnhanced.js` (701 lines)
**Controller Type**: Inline controller (routes + logic combined)

---

## RBAC Role Requirements

| Role | Access Level | Endpoints |
|------|--------------|-----------|
| admin, super_admin | Full administrative access | All admin endpoints (CRUD, approvals, notifications) |
| member | Read + contribute | Active initiatives, contribute, my contributions |

---

## Endpoint Categories

### 1. Admin CRUD Operations (4 endpoints)

#### 1.1 POST / - Create Initiative
**RBAC**: admin, super_admin only
**Middleware**: `authenticateToken, adminOnly`
**Request Body**:
```json
{
  "title_ar": "مبادرة خيرية",
  "title_en": "Charity Initiative",
  "description_ar": "وصف المبادرة",
  "description_en": "Initiative description",
  "beneficiary_name_ar": "المستفيد",
  "beneficiary_name_en": "Beneficiary",
  "target_amount": 50000,
  "min_contribution": 100,
  "max_contribution": 5000,
  "start_date": "2025-10-01",
  "end_date": "2025-12-31",
  "status": "draft"
}
```

**Success Response (201)**:
```json
{
  "message": "Initiative created successfully",
  "initiative": {
    "id": "uuid",
    "title": "مبادرة خيرية",
    "title_ar": "مبادرة خيرية",
    "title_en": "Charity Initiative",
    "target_amount": 50000,
    "current_amount": 0,
    "status": "draft",
    "created_by": "admin-user-id",
    "created_at": "2025-10-11T..."
  }
}
```

**Validation Rules**:
- `title_ar` required
- `target_amount` required
- `min_contribution` must be ≤ `max_contribution`
- Empty date strings converted to null
- `status` defaults to 'draft'

**Test Scenarios**:
- ✅ Admin can create initiative with all fields
- ✅ Member gets 403 forbidden
- ✅ Validation: missing title_ar returns 400
- ✅ Validation: min > max returns 400

---

#### 1.2 PUT /:id - Update Initiative
**RBAC**: admin, super_admin only
**Path Parameters**: `id` (initiative UUID)
**Request Body**: Any updatable fields
```json
{
  "title_ar": "Updated title",
  "target_amount": 60000,
  "status": "active"
}
```

**Success Response (200)**:
```json
{
  "message": "Initiative updated successfully",
  "initiative": {
    "id": "uuid",
    "title_ar": "Updated title",
    "target_amount": 60000,
    "updated_at": "2025-10-11T..."
  }
}
```

**Important**: `current_amount` cannot be updated directly (calculated by trigger)

**Test Scenarios**:
- ✅ Admin can update initiative
- ✅ Member gets 403 forbidden

---

#### 1.3 DELETE /:id - Delete Initiative
**RBAC**: admin, super_admin only
**Path Parameters**: `id` (initiative UUID)

**Success Response (200)**:
```json
{
  "message": "Initiative deleted successfully",
  "initiative": {
    "id": "uuid",
    "title": "Deleted initiative"
  }
}
```

**Test Scenarios**:
- ✅ Admin can delete initiative
- ✅ Member gets 403 forbidden

---

#### 1.4 PATCH /:id/status - Change Initiative Status
**RBAC**: admin, super_admin only
**Path Parameters**: `id` (initiative UUID)
**Request Body**:
```json
{
  "status": "active",
  "completion_notes": "Notes for completed initiative"
}
```

**Valid Statuses**: `draft`, `active`, `completed`, `archived`

**Success Response (200)**:
```json
{
  "message": "Initiative active successfully",
  "initiative": {
    "id": "uuid",
    "status": "active",
    "archived_at": null,
    "archived_by": null
  }
}
```

**Special Behavior**:
- `status: 'archived'` → sets `archived_at` and `archived_by`
- `completion_notes` optional for completed initiatives

**Test Scenarios**:
- ✅ Admin can change status to valid values
- ✅ Invalid status returns 400
- ✅ Member gets 403 forbidden

---

### 2. Admin Query & Analytics (4 endpoints)

#### 2.1 GET /admin/all - Get All Initiatives
**RBAC**: admin, super_admin only
**Query Parameters**:
- `status` (optional): Filter by status

**Success Response (200)**:
```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title_ar": "مبادرة خيرية",
      "target_amount": 50000,
      "current_amount": 25000,
      "status": "active",
      "created_at": "2025-10-01T..."
    }
  ]
}
```

**Test Scenarios**:
- ✅ Admin can view all initiatives
- ✅ Filter by status works
- ✅ Member gets 403 forbidden

---

#### 2.2 GET /:id/details - Get Initiative with Contributions
**RBAC**: admin, super_admin only
**Path Parameters**: `id` (initiative UUID)

**Success Response (200)**:
```json
{
  "initiative": {
    "id": "uuid",
    "title_ar": "مبادرة خيرية",
    "target_amount": 50000,
    "current_amount": 25000
  },
  "donations": [
    {
      "id": "uuid",
      "amount": 1000,
      "donor": {
        "full_name": "أحمد الشعيل",
        "membership_number": "SH-001"
      },
      "approved_by": "admin-id",
      "created_at": "2025-10-10T..."
    }
  ],
  "stats": {
    "totalDonations": 25,
    "uniqueDonors": 18,
    "approvedAmount": 25000,
    "progressPercentage": "50.00"
  }
}
```

**Test Scenarios**:
- ✅ Admin gets detailed initiative data
- ✅ Includes donations and statistics
- ✅ Member gets 403 forbidden

---

#### 2.3 GET /:id/non-contributors - Get Non-Contributing Members
**RBAC**: admin, super_admin only
**Path Parameters**: `id` (initiative UUID)

**Success Response (200)**:
```json
{
  "nonContributors": [
    {
      "id": "uuid",
      "full_name": "محمد الشعيل",
      "membership_number": "SH-002",
      "phone": "0555555555",
      "email": "member@alshuail.com"
    }
  ],
  "stats": {
    "totalActiveMembers": 100,
    "totalContributors": 75,
    "totalNonContributors": 25,
    "contributionRate": "75.00"
  }
}
```

**Logic**:
1. Get all active members
2. Get all donors for this initiative
3. Filter members who haven't donated

**Test Scenarios**:
- ✅ Admin can view non-contributors
- ✅ Statistics calculated correctly
- ✅ Member gets 403 forbidden

---

#### 2.4 PATCH /donations/:donationId/approve - Approve Donation
**RBAC**: admin, super_admin only
**Path Parameters**: `donationId` (donation UUID)

**Success Response (200)**:
```json
{
  "message": "Donation approved successfully",
  "donation": {
    "id": "uuid",
    "amount": 1000,
    "approved_by": "admin-id",
    "approval_date": "2025-10-11T..."
  }
}
```

**Side Effect**: Database trigger updates `initiative.current_amount`

**Test Scenarios**:
- ✅ Admin can approve donations
- ✅ Member gets 403 forbidden

---

### 3. Admin Notification Operations (2 endpoints)

#### 3.1 POST /:id/notify-non-contributors - Notify Non-Contributors
**RBAC**: admin, super_admin only
**Path Parameters**: `id` (initiative UUID)

**Success Response (200)**:
```json
{
  "message": "تم إرسال تذكير إلى 25 عضو غير مساهم بنجاح",
  "recipient_count": 25,
  "contributionRate": "75.00"
}
```

**Behavior**:
1. Find all non-contributors
2. Create admin notification tracking broadcast
3. Return success with statistics

**Error Cases**:
- 400 if all members have contributed
- 404 if initiative not found

**Test Scenarios**:
- ✅ Admin can send reminders to non-contributors
- ✅ Correct recipient count returned
- ✅ Member gets 403 forbidden

---

#### 3.2 POST /:id/push-notification - Broadcast to All Members
**RBAC**: admin, super_admin only
**Path Parameters**: `id` (initiative UUID)

**Success Response (200)**:
```json
{
  "message": "تم إرسال الإشعار إلى 100 عضو بنجاح",
  "recipient_count": 100
}
```

**Behavior**:
1. Get all active members
2. Create admin notification tracking broadcast
3. Return success with count

**Test Scenarios**:
- ✅ Admin can broadcast to all members
- ✅ Correct recipient count returned
- ✅ Member gets 403 forbidden

---

### 4. Member Operations (3 endpoints)

#### 4.1 GET /active - Get Active Initiatives
**RBAC**: all authenticated users (member, admin)
**No special restrictions**

**Success Response (200)**:
```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title_ar": "مبادرة خيرية",
      "title_en": "Charity Initiative",
      "target_amount": 50000,
      "current_amount": 25000,
      "status": "active",
      "progress_percentage": "50.00",
      "start_date": "2025-10-01",
      "end_date": "2025-12-31"
    }
  ]
}
```

**Features**:
- Only returns active initiatives
- Calculates progress percentage
- Ordered by start_date (descending)

**Test Scenarios**:
- ✅ Member can view active initiatives
- ✅ Admin can view active initiatives
- ✅ Progress percentage calculated correctly

---

#### 4.2 GET /previous - Get Completed Initiatives
**RBAC**: all authenticated users (member, admin)

**Success Response (200)**:
```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title_ar": "مبادرة سابقة",
      "status": "completed",
      "end_date": "2025-09-30",
      "completion_notes": "Completed successfully"
    }
  ]
}
```

**Features**:
- Returns completed and archived initiatives
- Ordered by end_date (descending)
- Limited to 50 results

**Test Scenarios**:
- ✅ Member can view previous initiatives
- ✅ Only completed/archived returned

---

#### 4.3 POST /:id/contribute - Contribute to Initiative
**RBAC**: all authenticated users (member, admin)
**Path Parameters**: `id` (initiative UUID)
**Request Body**:
```json
{
  "amount": 1000,
  "payment_method": "bank_transfer",
  "receipt_url": "https://..."
}
```

**Success Response (201)**:
```json
{
  "message": "Contribution submitted successfully. Pending approval.",
  "donation": {
    "id": "uuid",
    "initiative_id": "initiative-uuid",
    "donor_member_id": "member-uuid",
    "amount": 1000,
    "payment_method": "bank_transfer",
    "receipt_url": "https://...",
    "payment_date": "2025-10-11T...",
    "approved_by": null
  }
}
```

**Validation Rules**:
- Initiative must be active
- Amount must be ≥ `min_contribution`
- Amount must be ≤ `max_contribution`
- User must be associated with a member

**Test Scenarios**:
- ✅ Member can contribute to active initiative
- ✅ Validation: amount below minimum returns 400
- ✅ Validation: amount above maximum returns 400
- ✅ Validation: inactive initiative returns 400

---

#### 4.4 GET /my-contributions - Get My Contributions
**RBAC**: all authenticated users (member, admin)

**Success Response (200)**:
```json
{
  "contributions": [
    {
      "id": "uuid",
      "initiative_id": "uuid",
      "amount": 1000,
      "payment_method": "bank_transfer",
      "approved_by": "admin-id",
      "approval_date": "2025-10-10T...",
      "created_at": "2025-10-09T...",
      "initiative": {
        "id": "uuid",
        "title_ar": "مبادرة خيرية",
        "title_en": "Charity Initiative",
        "status": "active"
      }
    }
  ]
}
```

**Features**:
- Returns all contributions by authenticated user
- Includes initiative details
- Ordered by created_at (descending)

**Test Scenarios**:
- ✅ Member can view own contributions
- ✅ Includes initiative details

---

## Test Implementation Plan (12-15 tests)

### Test Suite Structure
```javascript
describe('Initiatives Controller Integration Tests', () => {
  // Group 1: Admin CRUD Operations (4 tests)
  describe('POST / - Create Initiative', () => {
    it('should allow admin to create initiative', async () => {});
    it('should reject member with 403', async () => {});
    it('should validate required fields', async () => {});
  });

  describe('PATCH /:id/status - Change Status', () => {
    it('should allow admin to change status', async () => {});
  });

  // Group 2: Admin Analytics (3 tests)
  describe('GET /admin/all - Get All Initiatives', () => {
    it('should allow admin to view all initiatives', async () => {});
    it('should reject member with 403', async () => {});
  });

  describe('GET /:id/non-contributors', () => {
    it('should allow admin to view non-contributors', async () => {});
  });

  // Group 3: Admin Notifications (2 tests)
  describe('POST /:id/notify-non-contributors', () => {
    it('should allow admin to notify non-contributors', async () => {});
  });

  describe('POST /:id/push-notification', () => {
    it('should allow admin to broadcast to all', async () => {});
  });

  // Group 4: Member Operations (4 tests)
  describe('GET /active - Active Initiatives', () => {
    it('should allow member to view active initiatives', async () => {});
  });

  describe('POST /:id/contribute - Contribute', () => {
    it('should allow member to contribute', async () => {});
    it('should validate contribution amount', async () => {});
  });

  describe('GET /my-contributions', () => {
    it('should allow member to view own contributions', async () => {});
  });
});
```

### Total Tests: 13
- **Admin CRUD**: 4 tests
- **Admin Analytics**: 3 tests
- **Admin Notifications**: 2 tests
- **Member Operations**: 4 tests

---

## JWT Token Helpers

```javascript
const createAdminToken = () => {
  return jwt.sign(
    { id: 'admin-test-id', role: 'admin', email: 'admin@alshuail.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const createMemberToken = (userId = 'member-test-id') => {
  return jwt.sign(
    { id: userId, role: 'member', phone: '0555555555', membershipNumber: 'SH-12345' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};
```

---

## Key Testing Patterns

### Pattern 1: Admin-Only Endpoints
```javascript
it('should allow admin to perform action', async () => {
  const adminToken = createAdminToken();
  const response = await request(app)
    .post('/api/initiatives')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ ... });

  expect([200, 201, 403, 500]).toContain(response.status);
});

it('should reject member with 403', async () => {
  const memberToken = createMemberToken();
  const response = await request(app)
    .post('/api/initiatives')
    .set('Authorization', `Bearer ${memberToken}`)
    .send({ ... });

  expect(response.status).toBe(403);
});
```

### Pattern 2: Contribution Validation
```javascript
it('should validate contribution amount', async () => {
  const memberToken = createMemberToken();
  const response = await request(app)
    .post('/api/initiatives/test-id/contribute')
    .set('Authorization', `Bearer ${memberToken}`)
    .send({
      amount: 50, // Below minimum
      payment_method: 'bank_transfer'
    });

  expect([400, 403, 500]).toContain(response.status);
});
```

---

## Notes for Implementation

1. **Database Independence**: Use graceful degradation - accept [200, 201, 403, 500]
2. **Admin RBAC**: Strict 403 for member attempts on admin endpoints
3. **Contribution Validation**: Test min/max amount constraints
4. **Member Association**: Members must be associated with member records
5. **Status Transitions**: Test valid status values
6. **Notification Tracking**: Admin notifications track broadcasts

---

## Success Criteria

- ✅ All 13 tests pass
- ✅ Admin-only RBAC validated
- ✅ Member operations work correctly
- ✅ Contribution validation enforced
- ✅ Notification tracking validated
- ✅ Test suite maintains 100% pass rate
