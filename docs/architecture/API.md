# API Documentation

Al-Shuail Family Management System - Backend API v2.0.0

**Base URL**: `https://api.alshailfund.com`

---

## Table of Contents

- [Authentication](#authentication)
- [Members](#members)
- [Subscriptions](#subscriptions)
- [Payments](#payments)
- [Family Tree](#family-tree)
- [Reports](#reports)
- [Notifications](#notifications)
- [Initiatives](#initiatives)
- [Diyas](#diyas)
- [Crisis Management](#crisis-management)
- [Settings](#settings)
- [Error Handling](#error-handling)

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Login (Admin)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@alshuail.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@alshuail.com",
    "role": "super_admin",
    "permissions": {...}
  }
}
```

### Login (Member)

```http
POST /api/auth/member-login
Content-Type: application/json

{
  "phone": "96551234567",
  "password": "your_password"
}
```

### Verify Token

```http
POST /api/auth/verify
Authorization: Bearer <token>
```

### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

---

## Members

### List Members

```http
GET /api/members?page=1&limit=20&search=&branch_id=
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| search | string | Search by name or phone |
| branch_id | string | Filter by branch |
| status | string | Filter by status (active/inactive) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name_ar": "محمد الشعيل",
      "phone": "96551234567",
      "branch_id": "uuid",
      "membership_number": "10001",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 347,
    "page": 1,
    "limit": 20,
    "pages": 18
  }
}
```

### Get Member

```http
GET /api/members/:id
Authorization: Bearer <token>
```

### Create Member

```http
POST /api/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name_ar": "محمد الشعيل",
  "phone": "96551234567",
  "branch_id": "uuid",
  "email": "member@example.com"
}
```

### Update Member

```http
PUT /api/members/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name_ar": "محمد بن عبدالله الشعيل",
  "phone": "96551234567"
}
```

### Delete Member

```http
DELETE /api/members/:id
Authorization: Bearer <token>
```

---

## Subscriptions

### Get Subscription Statistics

```http
GET /api/subscriptions/admin/subscriptions/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_members": 347,
  "active": 320,
  "overdue": 27,
  "monthly_revenue": 17350,
  "overdue_amount": 2450,
  "avg_months_ahead": 3.5
}
```

### List Subscriptions

```http
GET /api/subscriptions/admin/subscriptions?page=1&limit=20&status=all&search=
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | all, active, overdue |
| search | string | Search by name or phone |

**Response:**
```json
{
  "subscriptions": [
    {
      "member_id": "uuid",
      "member_name": "محمد الشعيل",
      "phone": "96551234567",
      "status": "active",
      "current_balance": 150,
      "months_paid_ahead": 3,
      "next_payment_due": "2025-04-01",
      "last_payment_date": "2025-01-10",
      "last_payment_amount": 50
    }
  ],
  "total": 347
}
```

### Record Payment

```http
POST /api/subscriptions/admin/subscriptions/payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "member_id": "uuid",
  "amount": 150,
  "months": 3,
  "payment_method": "cash",
  "receipt_number": "REC-2025-001",
  "notes": "Payment for Jan-Mar"
}
```

**Business Rules:**
- Monthly subscription: 50 SAR
- Maximum balance: 3000 SAR (60 months / 5 years)
- Amounts exceeding cap are stored but displayed as 3000

**Response:**
```json
{
  "success": true,
  "new_balance": 300,
  "months_ahead": 6,
  "message": "تم تسجيل الدفعة بنجاح"
}
```

### Send Payment Reminder

```http
POST /api/subscriptions/admin/subscriptions/reminder
Authorization: Bearer <token>
Content-Type: application/json

{
  "member_ids": ["uuid1", "uuid2"]
}
```

---

## Payments

### List Payments

```http
GET /api/payments?page=1&limit=20&member_id=&date_from=&date_to=
Authorization: Bearer <token>
```

### Get Payment

```http
GET /api/payments/:id
Authorization: Bearer <token>
```

### Create Payment

```http
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "member_id": "uuid",
  "amount": 150,
  "payment_type": "subscription",
  "payment_method": "bank_transfer",
  "receipt_number": "REC-2025-001"
}
```

---

## Family Tree

### Get Family Tree

```http
GET /api/family-tree
Authorization: Bearer <token>
```

### Get Branch Members

```http
GET /api/family-tree/branch/:branch_id
Authorization: Bearer <token>
```

### Add Child to Member

```http
POST /api/family-tree/add-child
Authorization: Bearer <token>
Content-Type: application/json

{
  "parent_id": "uuid",
  "full_name_ar": "عبدالله محمد الشعيل",
  "gender": "male",
  "birth_date": "1990-01-15"
}
```

### Get Member Relationships

```http
GET /api/family-tree/member/:id/relationships
Authorization: Bearer <token>
```

---

## Reports

### Financial Summary

```http
GET /api/reports/financial?year=2025
Authorization: Bearer <token>
```

### Payment Reports

```http
GET /api/reports/payments?date_from=2025-01-01&date_to=2025-12-31
Authorization: Bearer <token>
```

### Subscription Reports

```http
GET /api/reports/subscriptions
Authorization: Bearer <token>
```

### Export Report (PDF)

```http
GET /api/reports/export/pdf?report_type=financial&year=2025
Authorization: Bearer <token>
```

### Export Report (Excel)

```http
GET /api/reports/export/excel?report_type=financial&year=2025
Authorization: Bearer <token>
```

---

## Notifications

### List Notifications

```http
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>
```

### Send Notification

```http
POST /api/notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "تذكير بالدفع",
  "body": "يرجى سداد الاشتراك الشهري",
  "target_type": "all|branch|member",
  "target_ids": ["uuid"]
}
```

### Mark as Read

```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

---

## Initiatives

### List Initiatives

```http
GET /api/initiatives
Authorization: Bearer <token>
```

### Get Initiative

```http
GET /api/initiatives/:id
Authorization: Bearer <token>
```

### Create Initiative

```http
POST /api/initiatives
Authorization: Bearer <token>
Content-Type: application/json

{
  "title_ar": "حملة مساعدة الطلاب",
  "description_ar": "دعم الطلاب في الجامعات",
  "target_amount": 50000,
  "start_date": "2025-01-01",
  "end_date": "2025-06-30"
}
```

---

## Diyas

### List Diyas

```http
GET /api/diyas
Authorization: Bearer <token>
```

### Get Diya Case

```http
GET /api/diyas/:id
Authorization: Bearer <token>
```

### Create Diya Case

```http
POST /api/diyas
Authorization: Bearer <token>
Content-Type: application/json

{
  "member_id": "uuid",
  "case_type": "traffic_accident",
  "total_amount": 100000,
  "description": "حادث مروري"
}
```

### Record Diya Payment

```http
POST /api/diyas/:id/payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "contributor_id": "uuid",
  "amount": 500
}
```

---

## Crisis Management

### List Crisis Cases

```http
GET /api/crisis
Authorization: Bearer <token>
```

### Create Crisis Case

```http
POST /api/crisis
Authorization: Bearer <token>
Content-Type: application/json

{
  "member_id": "uuid",
  "crisis_type": "medical",
  "description": "حالة طبية طارئة",
  "required_amount": 25000
}
```

### Update Crisis Status

```http
PUT /api/crisis/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved"
}
```

---

## Settings

### Get Settings

```http
GET /api/settings
Authorization: Bearer <token>
```

### Update Settings

```http
PUT /api/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "monthly_subscription": 50,
  "max_balance_months": 60,
  "notification_enabled": true
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message in Arabic",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or expired token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| INTERNAL_ERROR | 500 | Server error |

### Error Examples

**Unauthorized:**
```json
{
  "success": false,
  "error": "غير مصرح بالوصول",
  "code": "UNAUTHORIZED"
}
```

**Validation Error:**
```json
{
  "success": false,
  "error": "بيانات غير صالحة",
  "code": "VALIDATION_ERROR",
  "details": {
    "phone": "رقم الهاتف مطلوب"
  }
}
```

---

## Rate Limiting

API requests are rate-limited:

- **Standard endpoints**: 100 requests/minute
- **Authentication**: 10 requests/minute
- **Export endpoints**: 5 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## Pagination

Paginated endpoints return:

```json
{
  "data": [...],
  "pagination": {
    "total": 347,
    "page": 1,
    "limit": 20,
    "pages": 18,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Webhooks (Future)

Planned webhook events:
- `payment.created`
- `member.created`
- `subscription.overdue`
- `crisis.created`

---

**API Version**: 2.0.0
**Last Updated**: January 2025
