# Data Model: Unit Testing Infrastructure

**Feature**: Comprehensive Unit Testing for alshuail-mobile
**Date**: 2026-01-09

## Overview

This document defines the test organization structure, mock data schemas, and test file conventions for the alshuail-mobile unit testing infrastructure.

## Test File Organization

### Directory Structure

```
tests/
├── setup.js                          # Global test configuration
├── mocks/
│   ├── server.js                     # MSW server instance
│   ├── handlers.js                   # API request handlers
│   └── data/
│       ├── members.json              # Member mock data
│       ├── payments.json             # Payment mock data
│       ├── subscriptions.json        # Subscription mock data
│       ├── notifications.json        # Notification mock data
│       ├── familyTree.json           # Family tree mock data
│       ├── initiatives.json          # Initiative mock data
│       ├── news.json                 # News mock data
│       └── events.json               # Events mock data
├── unit/
│   ├── services/
│   │   ├── authService.test.js       # Authentication service tests
│   │   ├── memberService.test.js     # Member service tests
│   │   ├── paymentService.test.js    # Payment service tests
│   │   ├── subscriptionService.test.js
│   │   ├── familyTreeService.test.js
│   │   ├── notificationService.test.js
│   │   ├── pushNotificationService.test.js
│   │   ├── initiativeService.test.js
│   │   ├── newsService.test.js
│   │   └── eventsService.test.js
│   ├── utils/
│   │   └── api.test.js               # API utility tests
│   └── contexts/
│       └── DataCacheContext.test.jsx # Cache context tests
└── components/
    ├── BottomNav.test.jsx            # Navigation component tests
    ├── MemberSearchField.test.jsx    # Search field tests
    └── NotificationPrompt.test.jsx   # Notification prompt tests
```

### File Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Service tests | `{serviceName}.test.js` | `authService.test.js` |
| Utility tests | `{utilityName}.test.js` | `api.test.js` |
| Context tests | `{ContextName}.test.jsx` | `DataCacheContext.test.jsx` |
| Component tests | `{ComponentName}.test.jsx` | `BottomNav.test.jsx` |

## Mock Data Schemas

### Member Schema

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
  "avatar_url": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2026-01-09T00:00:00Z"
}
```

### Authentication Response Schema

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
  },
  "message": "Login successful"
}
```

### Payment Schema

```json
{
  "id": 1,
  "member_id": 1,
  "amount": "250.00",
  "payment_type": "subscription",
  "status": "completed",
  "reference_number": "PAY-2026-001",
  "payment_method": "cash",
  "for_member_id": null,
  "notes": null,
  "created_at": "2026-01-09T00:00:00Z"
}
```

### Subscription Schema

```json
{
  "id": 1,
  "member_id": 1,
  "year": 2026,
  "months_paid": 6,
  "total_months": 12,
  "amount_per_month": "25.00",
  "status": "active",
  "paid_months": [1, 2, 3, 4, 5, 6],
  "unpaid_months": [7, 8, 9, 10, 11, 12]
}
```

### Notification Schema

```json
{
  "id": 1,
  "member_id": 1,
  "title_ar": "تذكير بالاشتراك",
  "title_en": "Subscription Reminder",
  "body_ar": "موعد سداد اشتراك شهر يناير",
  "body_en": "January subscription payment due",
  "type": "subscription_reminder",
  "read": false,
  "created_at": "2026-01-09T00:00:00Z"
}
```

### Family Tree Branch Schema

```json
{
  "id": 1,
  "name_ar": "فرع الشعيل الرئيسي",
  "name_en": "Main Al-Shuail Branch",
  "founder_id": 1,
  "member_count": 45,
  "members": [
    {
      "id": 1,
      "full_name_ar": "محمد أحمد الشعيل",
      "relationship": "head"
    }
  ]
}
```

### Initiative Schema

```json
{
  "id": 1,
  "title_ar": "مشروع بناء مسجد",
  "title_en": "Mosque Building Project",
  "description_ar": "المساهمة في بناء مسجد للعائلة",
  "target_amount": "50000.00",
  "collected_amount": "35000.00",
  "status": "active",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

### News Schema

```json
{
  "id": 1,
  "title_ar": "إعلان هام",
  "title_en": "Important Announcement",
  "content_ar": "محتوى الخبر باللغة العربية",
  "content_en": "News content in English",
  "category": "announcement",
  "image_url": null,
  "created_at": "2026-01-09T00:00:00Z"
}
```

### Event Schema

```json
{
  "id": 1,
  "title_ar": "اجتماع العائلة السنوي",
  "title_en": "Annual Family Gathering",
  "description_ar": "اجتماع سنوي لجميع أفراد العائلة",
  "location_ar": "قاعة الشعيل",
  "event_date": "2026-06-15T18:00:00Z",
  "rsvp_deadline": "2026-06-01T23:59:59Z",
  "max_attendees": 500,
  "current_attendees": 250
}
```

## Test Categories

### Service Tests (P1 - 80% Coverage)

| Service | Test Count | Key Scenarios |
|---------|------------|---------------|
| authService | 8 | sendOTP, verifyOTP, login, logout, password change |
| memberService | 10 | getProfile, updateProfile, uploadAvatar, getBalance |
| paymentService | 12 | paySubscription, payDiya, payInitiative, bankTransfer, search |
| subscriptionService | 8 | getPlans, getStatus, getHistory, getStatement |
| familyTreeService | 8 | getTree, getBranches, getMembers, search |
| notificationService | 6 | getNotifications, markRead, getCount, registerDevice |
| pushNotificationService | 6 | requestPermission, getToken, onMessage |
| initiativeService | 6 | getInitiatives, contribute, getContributions |
| newsService | 5 | getNews, getByCategory, react |
| eventsService | 6 | getEvents, getRSVP, updateRSVP |

**Total Service Tests:** ~75 test cases

### Utility Tests (P1 - 70% Coverage)

| Utility | Test Count | Key Scenarios |
|---------|------------|---------------|
| api.js | 8 | token management, auth headers, error handling, 401 redirect |

### Context Tests (P2 - 60% Coverage)

| Context | Test Count | Key Scenarios |
|---------|------------|---------------|
| DataCacheContext | 10 | caching, TTL, refresh, invalidation, clearing |

### Component Tests (P2 - 60% Coverage)

| Component | Test Count | Key Scenarios |
|-----------|------------|---------------|
| BottomNav | 5 | render, navigation items, active state, RTL |
| MemberSearchField | 6 | search input, debounce, selection, clear |
| NotificationPrompt | 5 | render, enable action, dismiss, cooldown |

**Total Tests:** ~109 test cases

## Test Utilities

### Render Helpers

```javascript
// tests/utils/renderWithProviders.jsx
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DataCacheProvider } from '../../src/contexts/DataCacheContext'

export function renderWithRouter(ui, options) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>{children}</BrowserRouter>
    ),
    ...options
  })
}

export function renderWithProviders(ui, options) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <DataCacheProvider>
          {children}
        </DataCacheProvider>
      </BrowserRouter>
    ),
    ...options
  })
}
```

### Mock Factories

```javascript
// tests/mocks/factories.js
export function createMockMember(overrides = {}) {
  return {
    id: 1,
    membership_number: 'M001',
    full_name_ar: 'محمد أحمد الشعيل',
    full_name_en: 'Mohammed Ahmed Al-Shuail',
    phone: '96512345678',
    balance: '1500.00',
    role: 'member',
    ...overrides
  }
}

export function createMockPayment(overrides = {}) {
  return {
    id: 1,
    member_id: 1,
    amount: '250.00',
    payment_type: 'subscription',
    status: 'completed',
    ...overrides
  }
}
```

## Coverage Thresholds

| Metric | Global | Services | Utilities | Components |
|--------|--------|----------|-----------|------------|
| Statements | 70% | 80% | 70% | 60% |
| Branches | 60% | 70% | 60% | 50% |
| Functions | 70% | 80% | 70% | 60% |
| Lines | 70% | 80% | 70% | 60% |

## Error Scenarios

Each service test file must cover these error scenarios:

1. **Network errors** - Simulate connection failures
2. **API errors (4xx)** - Handle validation/auth errors
3. **Server errors (5xx)** - Handle server failures
4. **Timeout errors** - Handle slow responses
5. **Invalid data** - Handle unexpected response formats
