# API Mock Contracts

**Feature**: Comprehensive Unit Testing for alshuail-mobile
**Date**: 2026-01-09

## Overview

This document defines the API contracts that MSW handlers must mock for unit testing. Each contract includes request/response schemas and error scenarios.

## Base URL

```
https://api.alshailfund.com/api
```

## Authentication Endpoints

### POST /otp/send

Send OTP to phone number.

**Request:**
```json
{
  "phone": "96512345678"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid phone number format"
}
```

---

### POST /otp/verify

Verify OTP and authenticate user.

**Request:**
```json
{
  "phone": "96512345678",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "membership_number": "M001",
    "full_name_ar": "محمد أحمد الشعيل",
    "phone": "96512345678",
    "role": "member",
    "balance": "1500.00"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

---

### POST /auth/mobile-login

Login with password (for returning users).

**Request:**
```json
{
  "phone": "96512345678",
  "password": "userPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "membership_number": "M001",
    "full_name_ar": "محمد أحمد الشعيل",
    "phone": "96512345678",
    "role": "member",
    "balance": "1500.00"
  }
}
```

---

### POST /auth/logout

Logout user and invalidate token.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Member Endpoints

### GET /members/profile

Get current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": 1,
  "membership_number": "M001",
  "full_name_ar": "محمد أحمد الشعيل",
  "full_name_en": "Mohammed Ahmed Al-Shuail",
  "phone": "96512345678",
  "email": "mohammed@example.com",
  "branch_id": 1,
  "branch_name_ar": "فرع الشعيل الرئيسي",
  "balance": "1500.00",
  "current_balance": "1500.00",
  "role": "member",
  "status": "active",
  "avatar_url": null
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

### PUT /members/profile

Update current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "full_name_ar": "محمد أحمد الشعيل",
  "email": "newemail@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { "...updated profile..." }
}
```

---

### GET /members/balance

Get current user's balance.

**Success Response (200):**
```json
{
  "balance": "1500.00",
  "as_of": "2026-01-09T00:00:00Z"
}
```

---

### GET /members/search

Search members by name or number.

**Query Parameters:**
- `q` - Search query

**Success Response (200):**
```json
{
  "members": [
    {
      "id": 1,
      "membership_number": "M001",
      "full_name_ar": "محمد أحمد الشعيل",
      "phone": "96512345678",
      "balance": "1500.00"
    }
  ]
}
```

---

## Payment Endpoints

### POST /payments/subscription

Pay subscription fee.

**Request:**
```json
{
  "year": 2026,
  "months": [1, 2, 3],
  "for_member_id": null,
  "payment_method": "cash"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "payment_id": 123,
  "reference_number": "PAY-2026-001",
  "amount": "75.00",
  "message": "Payment successful"
}
```

---

### POST /payments/diya

Contribute to diya case.

**Request:**
```json
{
  "diya_case_id": 1,
  "amount": "100.00",
  "for_member_id": null
}
```

**Success Response (200):**
```json
{
  "success": true,
  "payment_id": 124,
  "message": "Diya contribution successful"
}
```

---

### POST /payments/initiative

Contribute to initiative.

**Request:**
```json
{
  "initiative_id": 1,
  "amount": "500.00"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "payment_id": 125,
  "message": "Initiative contribution successful"
}
```

---

### POST /payments/bank-transfer

Submit bank transfer with receipt.

**Request (multipart/form-data):**
```
amount: 1000.00
reference: BANK-REF-001
receipt: <file>
notes: Payment for subscription
```

**Success Response (200):**
```json
{
  "success": true,
  "payment_id": 126,
  "status": "pending_verification",
  "message": "Bank transfer submitted for verification"
}
```

---

### GET /payments/history

Get payment history.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Success Response (200):**
```json
{
  "payments": [
    {
      "id": 1,
      "amount": "250.00",
      "payment_type": "subscription",
      "status": "completed",
      "reference_number": "PAY-2026-001",
      "created_at": "2026-01-09T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pages": 3
}
```

---

## Subscription Endpoints

### GET /subscriptions/plans

Get subscription plans.

**Success Response (200):**
```json
{
  "plans": [
    {
      "id": 1,
      "name_ar": "الاشتراك الشهري",
      "amount": "25.00",
      "period": "monthly"
    }
  ]
}
```

---

### GET /subscriptions/my

Get current user's subscriptions.

**Success Response (200):**
```json
{
  "subscriptions": [
    {
      "year": 2026,
      "months_paid": 6,
      "total_months": 12,
      "amount_per_month": "25.00",
      "paid_months": [1, 2, 3, 4, 5, 6],
      "unpaid_months": [7, 8, 9, 10, 11, 12]
    }
  ]
}
```

---

### GET /subscriptions/statement

Get financial statement.

**Query Parameters:**
- `year` - Year (optional)

**Success Response (200):**
```json
{
  "member": { "...member data..." },
  "balance": "1500.00",
  "transactions": [
    {
      "date": "2026-01-09",
      "type": "payment",
      "description": "اشتراك يناير 2026",
      "amount": "-25.00",
      "balance": "1475.00"
    }
  ]
}
```

---

## Family Tree Endpoints

### GET /family-tree/full

Get full family tree.

**Success Response (200):**
```json
{
  "branches": [
    {
      "id": 1,
      "name_ar": "فرع الشعيل الرئيسي",
      "member_count": 45,
      "members": [...]
    }
  ],
  "total_members": 347
}
```

---

### GET /family-tree/branches

Get all family branches.

**Success Response (200):**
```json
{
  "branches": [
    {
      "id": 1,
      "name_ar": "فرع الشعيل الرئيسي",
      "name_en": "Main Al-Shuail Branch",
      "member_count": 45
    }
  ]
}
```

---

### GET /family-tree/branches/:id/members

Get members of a specific branch.

**Success Response (200):**
```json
{
  "branch": {
    "id": 1,
    "name_ar": "فرع الشعيل الرئيسي"
  },
  "members": [
    {
      "id": 1,
      "full_name_ar": "محمد أحمد الشعيل",
      "relationship": "head"
    }
  ]
}
```

---

## Notification Endpoints

### GET /notifications

Get all notifications.

**Success Response (200):**
```json
{
  "notifications": [
    {
      "id": 1,
      "title_ar": "تذكير بالاشتراك",
      "body_ar": "موعد سداد اشتراك شهر يناير",
      "type": "subscription_reminder",
      "read": false,
      "created_at": "2026-01-09T00:00:00Z"
    }
  ]
}
```

---

### PUT /notifications/:id/read

Mark notification as read.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### PUT /notifications/read-all

Mark all notifications as read.

**Success Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 5
}
```

---

### GET /notifications/unread-count

Get unread notification count.

**Success Response (200):**
```json
{
  "count": 3
}
```

---

### POST /notifications/register-device

Register device for push notifications.

**Request:**
```json
{
  "token": "fcm-device-token",
  "platform": "web"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Device registered successfully"
}
```

---

## Initiative Endpoints

### GET /initiatives

Get all initiatives.

**Success Response (200):**
```json
{
  "initiatives": [
    {
      "id": 1,
      "title_ar": "مشروع بناء مسجد",
      "target_amount": "50000.00",
      "collected_amount": "35000.00",
      "status": "active"
    }
  ]
}
```

---

### GET /initiatives/:id

Get initiative details.

**Success Response (200):**
```json
{
  "id": 1,
  "title_ar": "مشروع بناء مسجد",
  "description_ar": "المساهمة في بناء مسجد للعائلة",
  "target_amount": "50000.00",
  "collected_amount": "35000.00",
  "contributors": 50,
  "status": "active"
}
```

---

## News Endpoints

### GET /news

Get all news articles.

**Success Response (200):**
```json
{
  "news": [
    {
      "id": 1,
      "title_ar": "إعلان هام",
      "content_ar": "محتوى الخبر",
      "category": "announcement",
      "created_at": "2026-01-09T00:00:00Z"
    }
  ]
}
```

---

## Events Endpoints

### GET /events

Get all events.

**Success Response (200):**
```json
{
  "events": [
    {
      "id": 1,
      "title_ar": "اجتماع العائلة السنوي",
      "event_date": "2026-06-15T18:00:00Z",
      "location_ar": "قاعة الشعيل",
      "current_attendees": 250
    }
  ]
}
```

---

### PUT /events/:id/rsvp

Update RSVP status.

**Request:**
```json
{
  "status": "attending",
  "guests": 2
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "RSVP updated successfully"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| SERVER_ERROR | 500 | Internal server error |
| NETWORK_ERROR | N/A | Connection failed |
| TIMEOUT | N/A | Request timed out |
