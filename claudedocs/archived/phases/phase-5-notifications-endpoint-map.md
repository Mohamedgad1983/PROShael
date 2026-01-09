# Notifications Controller Endpoint Mapping

**Controller**: `notificationsController.js`
**Routes**: `routes/notifications.js`
**File Size**: 658 lines
**Complexity**: Medium

---

## Endpoint Summary

| # | Method | Path | Controller | RBAC | Tests |
|---|--------|------|------------|------|-------|
| 1 | GET | /api/notifications | getAllNotifications | super_admin, financial_manager | 3 |
| 2 | GET | /api/notifications/:id | getNotificationById | super_admin, member | 2 |
| 3 | POST | /api/notifications | createNotification | super_admin, financial_manager | 4 |
| 4 | PUT | /api/notifications/:id/read | markAsRead | super_admin, member | 3 |
| 5 | PUT | /api/notifications/bulk-read | bulkMarkAsRead | super_admin | 2 |
| 6 | DELETE | /api/notifications/:id | deleteNotification | super_admin | 2 |
| 7 | GET | /api/notifications/member/:memberId | getMemberNotifications | super_admin, member* | 3 |
| 8 | GET | /api/notifications/stats | getNotificationStats | super_admin, financial_manager | 3 |

**Total Estimated Tests**: 22

*Note: Members can only access their own notifications*

---

## Detailed Endpoint Analysis

### 1. GET /api/notifications - getAllNotifications

**Purpose**: Get all notifications with pagination and filtering

**RBAC**: `super_admin`, `financial_manager`

**Query Parameters**:
- `member_id` - Filter by specific member
- `type` - Filter by notification type
- `priority` - Filter by priority level
- `is_read` - Filter by read status (true/false)
- `target_audience` - Filter by audience type
- `limit` - Pagination limit (default: 50)
- `offset` - Pagination offset (default: 0)
- `start_date` - Date range start
- `end_date` - Date range end

**Response Structure**:
```javascript
{
  success: true,
  data: [...], // Array of notifications
  pagination: {
    limit: 50,
    offset: 0,
    total: 100
  },
  summary: {
    total: 100,
    unread: 25,
    read: 75,
    by_type: { general: 50, payment: 30, event: 20 },
    by_priority: { normal: 80, high: 15, urgent: 5 }
  },
  message: 'تم جلب الإشعارات بنجاح'
}
```

**Test Scenarios** (3):
1. Should require authentication (401/403 without token)
2. Should deny access to members (403)
3. Should return paginated notifications for admins/financial managers (200)

**Validation**:
- Enum values: type, priority, target_audience, is_read
- Date range validation
- Pagination bounds

---

### 2. GET /api/notifications/:id - getNotificationById

**Purpose**: Get single notification by ID

**RBAC**: `super_admin`, `member`

**Path Parameters**:
- `id` - Notification ID (UUID)

**Response Structure**:
```javascript
{
  success: true,
  data: { id, title, message, type, priority, ... },
  message: 'تم جلب بيانات الإشعار بنجاح'
}
```

**Error Responses**:
- `404` - Notification not found (PGRST116)
- `500` - Server error

**Test Scenarios** (2):
1. Should require authentication (401/403)
2. Should return notification by ID for authorized users (200/404/500)

---

### 3. POST /api/notifications - createNotification

**Purpose**: Create and dispatch new notification(s)

**RBAC**: `super_admin`, `financial_manager`

**Request Body**:
```javascript
{
  title: string (required),
  message: string (required),
  type: 'general' | 'payment' | 'event' | 'initiative' | 'diya' | 'system',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  target_audience: 'all' | 'specific' | 'admins' | 'active_members',
  member_id: string (required if target_audience === 'specific'),
  send_immediately: boolean (default: true)
}
```

**Response Structure**:
```javascript
{
  success: true,
  data: {
    notifications: [...],
    sent_count: 150,
    target_audience: 'all',
    send_immediately: true
  },
  message: 'تم إرسال 150 إشعار بنجاح'
}
```

**Validation**:
- Required: title, message
- Enum: type (6 values), priority (4 values), target_audience (4 values)
- Conditional: member_id required if target_audience === 'specific'
- Member existence check for specific targeting

**Test Scenarios** (4):
1. Should require authentication (401/403)
2. Should require title and message (400)
3. Should validate type, priority, target_audience enums (400)
4. Should create notification successfully for admins (201/500)

---

### 4. PUT /api/notifications/:id/read - markAsRead

**Purpose**: Mark single notification as read

**RBAC**: `super_admin`, `member`

**Path Parameters**:
- `id` - Notification ID

**Request Body**:
```javascript
{
  member_id: string (optional - for member ownership verification)
}
```

**Response Structure**:
```javascript
{
  success: true,
  data: { ...notification, is_read: true, read_at: '2025-10-11T...' },
  message: 'تم وضع علامة قراءة على الإشعار'
}
```

**Access Control**:
- Members can only mark their own notifications as read
- Admins can mark any notification as read

**Error Responses**:
- `404` - Notification not found
- `403` - Not authorized to mark this notification (member trying to mark another's)
- `500` - Server error

**Test Scenarios** (3):
1. Should require authentication (401/403)
2. Should mark notification as read (200/404)
3. Should deny members from marking other members' notifications (403)

---

### 5. PUT /api/notifications/bulk-read - bulkMarkAsRead

**Purpose**: Mark multiple notifications as read

**RBAC**: `super_admin` only

**Request Body**:
```javascript
{
  notification_ids: string[], // Array of notification IDs (required)
  member_id: string (optional - to restrict to specific member)
}
```

**Response Structure**:
```javascript
{
  success: true,
  data: [...updated notifications],
  updated_count: 25,
  message: 'تم وضع علامة قراءة على 25 إشعار'
}
```

**Validation**:
- notification_ids must be array with length > 0

**Test Scenarios** (2):
1. Should require super_admin authentication (403 for non-admins)
2. Should bulk mark notifications as read (200/400/500)

---

### 6. DELETE /api/notifications/:id - deleteNotification

**Purpose**: Delete notification

**RBAC**: `super_admin` only

**Path Parameters**:
- `id` - Notification ID

**Response Structure**:
```javascript
{
  success: true,
  message: 'تم حذف الإشعار بنجاح'
}
```

**Error Responses**:
- `404` - Notification not found
- `500` - Server error

**Test Scenarios** (2):
1. Should require super_admin authentication (403)
2. Should delete notification (200/404/500)

---

### 7. GET /api/notifications/member/:memberId - getMemberNotifications

**Purpose**: Get all notifications for specific member

**RBAC**: `super_admin`, `member` (own notifications only)

**Path Parameters**:
- `memberId` - Member ID or membership number

**Query Parameters**:
- `type` - Filter by type
- `priority` - Filter by priority
- `is_read` - Filter by read status
- `limit` - Pagination limit (default: 50)
- `offset` - Pagination offset (default: 0)

**Middleware Check**:
```javascript
// Members can only access their own notifications
if (req.user.role === 'member') {
  if (req.user.id !== req.params.memberId &&
      req.user.membershipNumber !== req.params.memberId) {
    return 403;
  }
}
```

**Response Structure**:
```javascript
{
  success: true,
  data: [...notifications],
  member: { id, full_name },
  pagination: { limit, offset, total },
  summary: { total, unread, read },
  message: 'تم جلب إشعارات العضو بنجاح'
}
```

**Error Responses**:
- `404` - Member not found
- `403` - Member trying to access another member's notifications
- `500` - Server error

**Test Scenarios** (3):
1. Should require authentication (401/403)
2. Should return member notifications for authorized users (200/404/500)
3. Should deny members from accessing other members' notifications (403)

---

### 8. GET /api/notifications/stats - getNotificationStats

**Purpose**: Get notification statistics with period filtering

**RBAC**: `super_admin`, `financial_manager`

**Query Parameters**:
- `period` - Time period filter: 'all', 'day', 'week', 'month', 'year' (default: 'all')

**Response Structure**:
```javascript
{
  success: true,
  data: {
    overview: {
      total_notifications: 1000,
      read_notifications: 750,
      unread_notifications: 250,
      read_rate: 75 // percentage
    },
    by_type: { general: 500, payment: 300, ... },
    by_priority: { normal: 800, high: 150, urgent: 50 },
    by_audience: { all: 600, specific: 300, active_members: 100 },
    daily_trend: [
      { date: '2025-10-05', total: 120, read: 90, unread: 30 },
      ...7 days
    ]
  },
  message: 'تم جلب إحصائيات الإشعارات بنجاح'
}
```

**Test Scenarios** (3):
1. Should require admin authentication (403 for members)
2. Should return comprehensive statistics (200/500)
3. Should support period filtering (200)

---

## Validation Rules

### Notification Types
- `general` - General announcements
- `payment` - Payment-related notifications
- `event` - Event notifications
- `initiative` - Initiative-related
- `diya` - Blood money (Diya) related
- `system` - System notifications

### Priority Levels
- `low` - Low priority
- `normal` - Normal priority (default)
- `high` - High priority
- `urgent` - Urgent notifications

### Target Audiences
- `all` - All members
- `specific` - Specific member (requires member_id)
- `admins` - Admin users only
- `active_members` - Active members only

---

## Test Plan Summary

### By Test Category

**Authentication & RBAC** (8 tests):
- 3 endpoints require super_admin only
- 3 endpoints require super_admin + financial_manager
- 2 endpoints allow members (with restrictions)
- All endpoints require authentication

**CRUD Operations** (6 tests):
- Create notification (1 test)
- Read notifications (3 tests: all, by ID, by member)
- Update read status (2 tests: single, bulk)
- Delete notification (1 test)

**Filtering & Pagination** (4 tests):
- Type, priority, is_read filtering
- Date range filtering
- Pagination limits
- Member-specific filtering

**Validation** (3 tests):
- Required fields (title, message)
- Enum validation (type, priority, target_audience)
- Member existence check

**Statistics** (1 test):
- Period-based statistics

**Total**: 22 tests

---

## Mock Strategy

### Access Control
Use existing mock from Phase 4:
- `__tests__/__mocks__/accessControlMocks.js`
- Already configured in jest.config.js

### Database Responses
Accept 500 status for database connection issues:
```javascript
expect([200, 500]).toContain(response.status);
if (response.status === 200) {
  // Validate response structure
}
```

### Token Helpers
Reuse from Phase 4:
- `createAdminToken()` - super_admin role
- `createFinancialManagerToken()` - financial_manager role
- `createMemberToken()` - member role

---

## Implementation Checklist

- [ ] Create test file: `__tests__/integration/controllers/notifications.test.js`
- [ ] Set up Express test app with notifications routes
- [ ] Create token helper functions
- [ ] Implement authentication tests (8)
- [ ] Implement CRUD operation tests (6)
- [ ] Implement filtering tests (4)
- [ ] Implement validation tests (3)
- [ ] Implement statistics test (1)
- [ ] Run test suite and verify all pass
- [ ] Update Phase 5 documentation
- [ ] Commit with descriptive message

---

**Status**: Ready for Implementation
**Next**: Create test file and begin writing tests
**Estimated Time**: 1-2 hours (methodical approach)
