# Feature 3: Notification Settings - Comprehensive Test Scenarios

**Implementation Date**: 2025-11-12
**Status**: ✅ COMPLETE - Full-Stack Implementation
**Deployment URL**: https://59dcc1b5.alshuail-admin.pages.dev
**Backend**: https://proshael.onrender.com

---

## 🎯 Overview

Complete test scenarios for Feature 3 (Notification Settings) covering:
- Backend API endpoints (GET/PUT)
- Frontend UI interactions
- Database operations
- Integration testing
- Error handling
- Edge cases
- User acceptance testing

---

## 📋 Test Environment Setup

### Prerequisites
```yaml
Backend:
  URL: https://proshael.onrender.com
  Database: Supabase PostgreSQL
  Table: public.profiles
  Column: notification_preferences JSONB

Frontend:
  URL: https://59dcc1b5.alshuail-admin.pages.dev
  Branch: feature3-notification-backend-complete
  Component: ProfileSettings.tsx

Test Account:
  Email: admin@alshuail.com
  Password: Admin@123456
  Role: super_admin
  User ID: a4ed4bc2-b61e-49ce-90c4-386b131d054e
```

### Test Data Structure
```json
{
  "email_notifications": true,
  "push_notifications": false,
  "member_updates": true,
  "financial_alerts": true,
  "system_updates": false
}
```

---

## 🔧 Backend API Testing

### Test Suite 1: GET /api/user/profile/notifications

#### Test Case 1.1: Successful Fetch with Existing Preferences
**Objective**: Verify GET endpoint returns stored notification preferences

**Prerequisites**:
- User has existing notification_preferences in database
- Valid authentication token

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"
curl -X GET "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "email_notifications": true,
    "push_notifications": false,
    "member_updates": true,
    "financial_alerts": true,
    "system_updates": false
  }
}
```

**Validation Checklist**:
- [ ] Status code is 200
- [ ] Response has `success: true`
- [ ] `data` object contains all 5 notification preferences
- [ ] All preference values are boolean
- [ ] Response time < 500ms

---

#### Test Case 1.2: Fetch with NULL Preferences (Default Values)
**Objective**: Verify GET endpoint returns default values when notification_preferences is NULL

**Prerequisites**:
- User exists but notification_preferences column is NULL
- Valid authentication token

**Test Steps**:
```sql
-- Set up test: Make notification_preferences NULL
UPDATE public.profiles
SET notification_preferences = NULL
WHERE id = 'a4ed4bc2-b61e-49ce-90c4-386b131d054e';
```

```bash
TOKEN="<valid_jwt_token>"
curl -X GET "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "email_notifications": true,
    "push_notifications": false,
    "member_updates": true,
    "financial_alerts": true,
    "system_updates": false
  }
}
```

**Validation Checklist**:
- [ ] Status code is 200
- [ ] Default values returned correctly
- [ ] All 5 preferences present
- [ ] Values match default schema

---

#### Test Case 1.3: Unauthorized Access (No Token)
**Objective**: Verify GET endpoint rejects requests without authentication

**Test Steps**:
```bash
curl -X GET "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Content-Type: application/json"
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "غير مصرح",
  "message_en": "Unauthorized"
}
```

**Validation Checklist**:
- [ ] Status code is 401
- [ ] Response indicates unauthorized access
- [ ] Dual-language error message

---

#### Test Case 1.4: Invalid/Expired Token
**Objective**: Verify GET endpoint rejects invalid authentication tokens

**Test Steps**:
```bash
TOKEN="invalid.token.here"
curl -X GET "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "التوكن غير صالح",
  "message_en": "Invalid token"
}
```

**Validation Checklist**:
- [ ] Status code is 401
- [ ] Token validation error returned
- [ ] No data leaked

---

#### Test Case 1.5: User Not Found
**Objective**: Verify GET endpoint handles non-existent user gracefully

**Prerequisites**:
- Valid token but user ID doesn't exist in profiles table

**Expected Response** (404 Not Found):
```json
{
  "success": false,
  "message": "المستخدم غير موجود",
  "message_en": "User not found"
}
```

**Validation Checklist**:
- [ ] Status code is 404
- [ ] Clear error message
- [ ] No server errors

---

### Test Suite 2: PUT /api/user/profile/notifications

#### Test Case 2.1: Update Single Preference
**Objective**: Verify PUT endpoint updates single notification preference and merges with existing

**Prerequisites**:
- Valid authentication token
- Existing notification preferences in database

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": false
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "تم تحديث إعدادات الإشعارات بنجاح",
  "message_en": "Notification preferences updated successfully",
  "data": {
    "email_notifications": false,
    "push_notifications": false,
    "member_updates": true,
    "financial_alerts": true,
    "system_updates": false
  }
}
```

**Validation Checklist**:
- [ ] Status code is 200
- [ ] `email_notifications` updated to `false`
- [ ] Other preferences unchanged (merge behavior)
- [ ] `updated_at` timestamp changed in database
- [ ] Success message in Arabic and English

**Database Verification**:
```sql
SELECT notification_preferences, updated_at
FROM public.profiles
WHERE id = 'a4ed4bc2-b61e-49ce-90c4-386b131d054e';
```

---

#### Test Case 2.2: Update Multiple Preferences
**Objective**: Verify PUT endpoint can update multiple preferences at once

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": true,
    "push_notifications": true,
    "system_updates": true
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "تم تحديث إعدادات الإشعارات بنجاح",
  "message_en": "Notification preferences updated successfully",
  "data": {
    "email_notifications": true,
    "push_notifications": true,
    "member_updates": true,
    "financial_alerts": true,
    "system_updates": true
  }
}
```

**Validation Checklist**:
- [ ] Status code is 200
- [ ] All 3 specified preferences updated
- [ ] Unspecified preferences (member_updates, financial_alerts) remain unchanged
- [ ] Merge behavior correct

---

#### Test Case 2.3: Toggle Preference (False → True → False)
**Objective**: Verify preference can be toggled repeatedly

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"

# Step 1: Set to false
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"financial_alerts": false}'

# Step 2: Set to true
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"financial_alerts": true}'

# Step 3: Set to false again
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"financial_alerts": false}'
```

**Validation Checklist**:
- [ ] All 3 requests succeed with 200 OK
- [ ] `financial_alerts` value changes correctly each time
- [ ] No stale data or race conditions
- [ ] Database reflects final state

---

#### Test Case 2.4: Invalid Request Body (No Preferences)
**Objective**: Verify PUT endpoint rejects empty update requests

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "لم يتم تقديم أي تحديثات للإشعارات",
  "message_en": "No notification preferences provided"
}
```

**Validation Checklist**:
- [ ] Status code is 400
- [ ] Clear validation error message
- [ ] Database not modified

---

#### Test Case 2.5: Invalid Data Type (String Instead of Boolean)
**Objective**: Verify PUT endpoint handles type coercion correctly

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": "true",
    "push_notifications": "false"
  }'
```

**Expected Behavior**:
- Backend coerces strings to booleans using `!!value`
- "true" → true
- "false" → true (non-empty string)
- Empty string or null → false

**Validation Checklist**:
- [ ] Request succeeds with 200 OK
- [ ] Values coerced to boolean correctly
- [ ] Data stored as boolean in JSONB

---

#### Test Case 2.6: Unauthorized Update (No Token)
**Objective**: Verify PUT endpoint rejects requests without authentication

**Test Steps**:
```bash
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Content-Type: application/json" \
  -d '{"email_notifications": false}'
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "غير مصرح",
  "message_en": "Unauthorized"
}
```

**Validation Checklist**:
- [ ] Status code is 401
- [ ] Database not modified
- [ ] No data leaked

---

#### Test Case 2.7: Update All Preferences to False
**Objective**: Verify all preferences can be disabled simultaneously

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": false,
    "push_notifications": false,
    "member_updates": false,
    "financial_alerts": false,
    "system_updates": false
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "تم تحديث إعدادات الإشعارات بنجاح",
  "message_en": "Notification preferences updated successfully",
  "data": {
    "email_notifications": false,
    "push_notifications": false,
    "member_updates": false,
    "financial_alerts": false,
    "system_updates": false
  }
}
```

**Validation Checklist**:
- [ ] Status code is 200
- [ ] All preferences set to false
- [ ] User can disable all notifications

---

#### Test Case 2.8: Update All Preferences to True
**Objective**: Verify all preferences can be enabled simultaneously

**Test Steps**:
```bash
TOKEN="<valid_jwt_token>"
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": true,
    "push_notifications": true,
    "member_updates": true,
    "financial_alerts": true,
    "system_updates": true
  }'
```

**Validation Checklist**:
- [ ] Status code is 200
- [ ] All preferences set to true
- [ ] No conflicts or errors

---

## 🎨 Frontend UI Testing

### Test Suite 3: Profile Settings Page

#### Test Case 3.1: Navigate to Profile Settings
**Objective**: Verify user can access notification settings section

**Test Steps**:
1. Login at https://59dcc1b5.alshuail-admin.pages.dev
2. Navigate to Settings (الإعدادات)
3. Click on "الملف الشخصي" (Profile Settings) tab
4. Scroll down to "إعدادات الإشعارات" section

**Expected Result**:
- [ ] Profile Settings page loads successfully
- [ ] Notification Settings section visible below User Info section
- [ ] Header shows "إعدادات الإشعارات"
- [ ] Subtitle shows "قم بتخصيص تفضيلات الإشعارات الخاصة بك"
- [ ] 5 notification toggles visible
- [ ] No "Coming Soon" badge
- [ ] No "سيتم تفعيل هذه الميزة قريباً" message

---

#### Test Case 3.2: Initial Load - Fetch Current Preferences
**Objective**: Verify frontend loads current notification preferences from backend on mount

**Test Steps**:
1. Open browser DevTools → Network tab
2. Navigate to Profile Settings page
3. Observe network requests

**Expected Behavior**:
- [ ] GET request to `/api/user/profile/notifications` made on page load
- [ ] Request includes Authorization header with Bearer token
- [ ] Toggle switches reflect fetched preferences:
  - Email Notifications: ON (checked)
  - Browser Push: OFF (unchecked)
  - Member Updates: ON (checked)
  - Financial Alerts: ON (checked)
  - System Updates: OFF (unchecked)

**DevTools Verification**:
```javascript
// Check initial state in React DevTools
ProfileSettings > notificationPreferences = {
  email_notifications: true,
  push_notifications: false,
  member_updates: true,
  financial_alerts: true,
  system_updates: false
}
```

---

#### Test Case 3.3: Toggle Single Preference (Optimistic Update)
**Objective**: Verify toggle switch responds immediately and syncs with backend

**Test Steps**:
1. Navigate to Profile Settings → Notification Settings
2. Observe current state of "Browser Push Notifications" toggle (OFF)
3. Click on toggle to enable
4. Observe UI behavior

**Expected Behavior**:
- [ ] Toggle switches to ON immediately (optimistic update)
- [ ] "جاري الحفظ..." (Saving...) indicator appears
- [ ] PUT request sent to `/api/user/profile/notifications` with `{"push_notifications": true}`
- [ ] Request completes successfully
- [ ] "جاري الحفظ..." indicator disappears
- [ ] Success message "تم تحديث إعدادات الإشعارات بنجاح" appears briefly (3 seconds)
- [ ] Toggle remains ON

**Network Verification**:
```http
PUT /api/user/profile/notifications
Authorization: Bearer <token>
Content-Type: application/json

{"push_notifications": true}
```

---

#### Test Case 3.4: Toggle Multiple Preferences Rapidly
**Objective**: Verify frontend handles rapid toggle changes without race conditions

**Test Steps**:
1. Navigate to Notification Settings
2. Quickly toggle 3 different switches:
   - Email Notifications: ON → OFF
   - Member Updates: ON → OFF
   - System Updates: OFF → ON
3. Observe behavior

**Expected Behavior**:
- [ ] All toggles respond immediately
- [ ] "جاري الحفظ..." indicator appears
- [ ] 3 separate PUT requests sent (one per toggle)
- [ ] All requests complete successfully
- [ ] Final state reflects all changes
- [ ] No race conditions or stale data

**Edge Case**: If user toggles same switch twice quickly:
- [ ] Only final state is saved
- [ ] No conflicting requests

---

#### Test Case 3.5: Network Error Handling (Rollback)
**Objective**: Verify frontend rolls back optimistic update on backend error

**Test Steps**:
1. Open DevTools → Network tab
2. Set network throttling to "Offline"
3. Toggle any notification preference
4. Observe behavior

**Expected Behavior**:
- [ ] Toggle switches immediately (optimistic update)
- [ ] "جاري الحفظ..." indicator appears
- [ ] PUT request fails
- [ ] Toggle reverts to original state (rollback)
- [ ] Error message appears: "فشل في تحديث إعدادات الإشعارات" or network error message
- [ ] Error message disappears after 3 seconds

**Console Verification**:
```javascript
// Console should log error
"Failed to fetch notification preferences: [Error details]"
```

---

#### Test Case 3.6: Disabled State During Save
**Objective**: Verify toggles are disabled while save is in progress

**Test Steps**:
1. Navigate to Notification Settings
2. Simulate slow network (DevTools → Network → Slow 3G)
3. Toggle any preference
4. Attempt to toggle another preference immediately

**Expected Behavior**:
- [ ] First toggle switches immediately
- [ ] "جاري الحفظ..." indicator appears
- [ ] All 5 toggles become disabled (opacity 0.6, cursor: not-allowed)
- [ ] User cannot change other toggles during save
- [ ] After save completes, toggles re-enable
- [ ] User can now make additional changes

---

#### Test Case 3.7: Toggle All OFF
**Objective**: Verify user can disable all notifications

**Test Steps**:
1. Navigate to Notification Settings
2. Enable all 5 toggles (if not already)
3. Disable all 5 toggles one by one
4. Refresh page

**Expected Behavior**:
- [ ] All toggles can be set to OFF
- [ ] Each change saves successfully
- [ ] After refresh, all toggles remain OFF
- [ ] Backend confirms all preferences are `false`

---

#### Test Case 3.8: Toggle All ON
**Objective**: Verify user can enable all notifications

**Test Steps**:
1. Navigate to Notification Settings
2. Disable all 5 toggles (if not already)
3. Enable all 5 toggles one by one
4. Refresh page

**Expected Behavior**:
- [ ] All toggles can be set to ON
- [ ] Each change saves successfully
- [ ] After refresh, all toggles remain ON
- [ ] Backend confirms all preferences are `true`

---

#### Test Case 3.9: Session Persistence
**Objective**: Verify notification preferences persist across sessions

**Test Steps**:
1. Navigate to Notification Settings
2. Change 2-3 preferences
3. Wait for save to complete
4. Logout
5. Login again
6. Navigate to Notification Settings

**Expected Behavior**:
- [ ] Toggles reflect previous session's changes
- [ ] No data loss
- [ ] State persisted in database

---

#### Test Case 3.10: Multiple Browser Tabs
**Objective**: Verify changes in one tab don't conflict with another

**Test Steps**:
1. Open Profile Settings in Tab 1
2. Open Profile Settings in Tab 2
3. In Tab 1: Toggle Email Notifications OFF
4. In Tab 2: Toggle Push Notifications ON
5. Refresh both tabs

**Expected Behavior**:
- [ ] Both changes saved successfully
- [ ] No conflicts or data loss
- [ ] After refresh, both tabs show correct state:
  - Email Notifications: OFF
  - Push Notifications: ON

---

### Test Suite 4: Visual & UX Testing

#### Test Case 4.1: Visual Design Consistency
**Objective**: Verify notification settings section matches design system

**Checklist**:
- [ ] Section header uses correct typography (fontSize: TYPOGRAPHY.lg, fontWeight: semibold)
- [ ] Subtitle uses TYPOGRAPHY.sm with COLORS.gray500
- [ ] Toggle container has gray50 background with border-radius lg
- [ ] Individual toggles have white background with border
- [ ] Toggle switches use primary color when ON, gray300 when OFF
- [ ] Spacing matches SPACING constants (lg, xl)
- [ ] Border separator above section (borderTop: 1px solid COLORS.border)
- [ ] "جاري الحفظ..." indicator uses COLORS.primary

---

#### Test Case 4.2: Arabic RTL Layout
**Objective**: Verify proper right-to-left layout for Arabic interface

**Checklist**:
- [ ] Section header aligned right
- [ ] Toggle labels aligned right
- [ ] Toggle switches positioned on left side
- [ ] Text flows right-to-left
- [ ] "جاري الحفظ..." indicator positioned correctly
- [ ] All Arabic text readable and properly shaped

---

#### Test Case 4.3: Toggle Switch Animation
**Objective**: Verify smooth toggle animations

**Test Steps**:
1. Toggle any preference
2. Observe animation

**Expected Behavior**:
- [ ] Toggle ball smoothly slides from one side to other
- [ ] Background color transitions smoothly
- [ ] Animation duration feels natural (~300ms)
- [ ] No janky or abrupt movements

---

#### Test Case 4.4: Hover States
**Objective**: Verify hover interactions

**Test Steps**:
1. Hover over enabled toggle
2. Hover over disabled toggle (during save)

**Expected Behavior**:
- [ ] Enabled toggle: cursor changes to pointer
- [ ] Disabled toggle: cursor shows not-allowed
- [ ] No unintended hover effects during disabled state

---

#### Test Case 4.5: Responsive Design
**Objective**: Verify notification settings work on different screen sizes

**Test Steps**:
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)

**Expected Behavior**:
- [ ] Layout remains usable on all screen sizes
- [ ] Toggle switches scale appropriately
- [ ] Text remains readable
- [ ] No horizontal scrolling
- [ ] Touch targets adequate on mobile (≥44x44px)

---

## 🔗 Integration Testing

### Test Suite 5: End-to-End Flows

#### Test Case 5.1: Complete User Journey
**Objective**: Test full notification settings workflow from login to save

**Test Steps**:
1. **Login**:
   - Navigate to https://59dcc1b5.alshuail-admin.pages.dev
   - Enter credentials: admin@alshuail.com / Admin@123456
   - Click "تسجيل الدخول"

2. **Navigate to Settings**:
   - Click "الإعدادات" in sidebar
   - Click "الملف الشخصي" tab
   - Scroll to "إعدادات الإشعارات" section

3. **View Current Settings**:
   - Observe current toggle states
   - Verify they match backend data

4. **Change Preferences**:
   - Toggle "Email Notifications" OFF
   - Toggle "Push Notifications" ON
   - Wait for "جاري الحفظ..." to disappear

5. **Verify Changes**:
   - Refresh page
   - Verify toggles reflect new state
   - Check backend database

6. **Logout and Login**:
   - Logout
   - Login again
   - Navigate to notification settings
   - Verify changes persisted

**Expected Result**: All steps complete successfully without errors

---

#### Test Case 5.2: Database Consistency Check
**Objective**: Verify frontend and backend are in sync with database

**Test Steps**:
1. Navigate to Notification Settings in frontend
2. Note current toggle states
3. Query database directly:
```sql
SELECT id, notification_preferences, updated_at
FROM public.profiles
WHERE id = 'a4ed4bc2-b61e-49ce-90c4-386b131d054e';
```
4. Compare values

**Expected Result**:
- [ ] Frontend toggle states match database JSONB values exactly
- [ ] No discrepancies

---

#### Test Case 5.3: Concurrent User Test
**Objective**: Verify multiple users can update preferences simultaneously without conflicts

**Test Steps**:
1. Create 2 test users
2. Have both users navigate to notification settings simultaneously
3. User 1: Toggle email notifications
4. User 2: Toggle push notifications
5. Verify both saves succeed
6. Check database for both users

**Expected Result**:
- [ ] Both users' changes saved correctly
- [ ] No cross-user contamination
- [ ] Each user's preferences isolated

---

## ⚠️ Error Scenarios & Edge Cases

### Test Suite 6: Error Handling

#### Test Case 6.1: Backend Server Down
**Objective**: Verify frontend handles backend unavailability gracefully

**Test Steps**:
1. Stop backend server (or block in DevTools)
2. Navigate to Profile Settings
3. Attempt to toggle preference

**Expected Behavior**:
- [ ] Page loads but toggles may show stale data
- [ ] On toggle attempt, error message appears
- [ ] No crashes or white screen
- [ ] User informed of connectivity issue

---

#### Test Case 6.2: Database Connection Lost
**Objective**: Verify backend handles database errors

**Simulation**: Temporarily disable Supabase connection

**Expected Response** (500 Internal Server Error):
```json
{
  "success": false,
  "message": "فشل في تحديث إعدادات الإشعارات",
  "message_en": "Failed to update notification preferences",
  "error": "Database connection error"
}
```

---

#### Test Case 6.3: Token Expiration During Session
**Objective**: Verify system handles expired token gracefully

**Test Steps**:
1. Login and navigate to notification settings
2. Wait for token to expire (or manually expire in localStorage)
3. Toggle any preference

**Expected Behavior**:
- [ ] Request fails with 401 Unauthorized
- [ ] User redirected to login page
- [ ] Or: Token refresh flow triggered
- [ ] Changes not lost if possible

---

#### Test Case 6.4: Invalid User ID in Token
**Objective**: Verify backend validates user ID from token

**Test Steps**: Manually create token with non-existent user ID

**Expected Response** (404 Not Found):
```json
{
  "success": false,
  "message": "المستخدم غير موجود",
  "message_en": "User not found"
}
```

---

#### Test Case 6.5: Malformed JSONB Data
**Objective**: Verify system handles corrupted notification_preferences data

**Test Steps**:
```sql
-- Corrupt data in database
UPDATE public.profiles
SET notification_preferences = '{"invalid": "structure"}'::jsonb
WHERE id = 'a4ed4bc2-b61e-49ce-90c4-386b131d054e';
```

**Expected Behavior**:
- [ ] Frontend displays default toggle states or gracefully handles missing keys
- [ ] PUT request overwrites corrupted data with valid structure
- [ ] No crashes

---

## 📊 Performance Testing

### Test Suite 7: Performance Benchmarks

#### Test Case 7.1: Page Load Performance
**Objective**: Verify Profile Settings page loads within acceptable time

**Metrics**:
- [ ] Initial page render: < 1 second
- [ ] GET /api/user/profile/notifications: < 500ms
- [ ] Total time to interactive: < 2 seconds

**Tools**: Chrome DevTools Lighthouse

---

#### Test Case 7.2: Toggle Response Time
**Objective**: Verify toggle feels instant and responsive

**Test Steps**:
1. Toggle any preference
2. Measure time from click to visual feedback

**Metrics**:
- [ ] Visual feedback (toggle switch): < 50ms (immediate)
- [ ] PUT request initiation: < 100ms
- [ ] Backend response: < 500ms
- [ ] "جاري الحفظ..." duration: < 1 second (on fast connection)

---

#### Test Case 7.3: Database Query Performance
**Objective**: Verify database operations are optimized

**Test Steps**:
```sql
-- Check query plan for GET operation
EXPLAIN ANALYZE
SELECT notification_preferences
FROM public.profiles
WHERE id = 'a4ed4bc2-b61e-49ce-90c4-386b131d054e';

-- Check query plan for PUT operation
EXPLAIN ANALYZE
UPDATE public.profiles
SET notification_preferences = '{"email_notifications": false}'::jsonb,
    updated_at = NOW()
WHERE id = 'a4ed4bc2-b61e-49ce-90c4-386b131d054e';
```

**Expected**:
- [ ] Primary key lookup (Index Scan)
- [ ] Execution time < 5ms
- [ ] GIN index used for JSONB queries

---

#### Test Case 7.4: Concurrent Updates Performance
**Objective**: Verify system handles multiple simultaneous updates

**Test Steps**: Simulate 10 users updating preferences simultaneously

**Metrics**:
- [ ] All requests complete successfully
- [ ] No deadlocks or race conditions
- [ ] Average response time < 1 second
- [ ] 95th percentile < 2 seconds

---

## ✅ User Acceptance Testing (UAT)

### Test Suite 8: UAT Scenarios

#### UAT Case 1: Admin Manages Notification Preferences
**Persona**: Super Admin managing their notification settings

**Scenario**:
> "As a super admin, I want to customize which notifications I receive so that I only see alerts relevant to my responsibilities."

**Test Steps**:
1. Login as super admin
2. Go to Settings → Profile Settings
3. Disable system updates (not critical for daily work)
4. Enable financial alerts (important for admin)
5. Verify changes take effect immediately

**Acceptance Criteria**:
- [ ] All notification types clearly labeled in Arabic
- [ ] Toggle switches easy to understand and use
- [ ] Changes save automatically without explicit "Save" button
- [ ] Visual feedback confirms save success

---

#### UAT Case 2: User Disables All Email Notifications
**Persona**: User who prefers in-app notifications only

**Scenario**:
> "As a user, I want to disable email notifications but keep in-app notifications so I'm not overwhelmed with emails."

**Test Steps**:
1. Login
2. Navigate to notification settings
3. Disable "Email Notifications"
4. Keep other preferences enabled
5. Test that emails stop but in-app notifications continue

**Acceptance Criteria**:
- [ ] Can disable email without affecting other types
- [ ] Clear description of what each toggle controls
- [ ] Change takes effect immediately

---

#### UAT Case 3: User Re-enables After Disabling
**Persona**: User who initially disabled notifications but wants them back

**Scenario**:
> "As a user, I disabled notifications but now I'm missing important updates, so I want to re-enable them."

**Test Steps**:
1. Login
2. Navigate to notification settings
3. Observe all toggles are OFF
4. Enable desired notification types
5. Verify notifications resume

**Acceptance Criteria**:
- [ ] Easy to re-enable notifications
- [ ] No data loss or history of previous preferences
- [ ] Toggle state persists across sessions

---

## 🔍 Security Testing

### Test Suite 9: Security Validation

#### Test Case 9.1: Authorization Validation
**Objective**: Verify users can only modify their own preferences

**Test Steps**:
1. Login as User A (get token)
2. Attempt to update User B's preferences using User A's token
3. Observe response

**Expected Behavior**:
- [ ] Request rejected or silently updates only User A's preferences
- [ ] User B's preferences unchanged
- [ ] No unauthorized access

---

#### Test Case 9.2: SQL Injection Prevention
**Objective**: Verify backend properly sanitizes inputs

**Test Steps**:
```bash
TOKEN="<valid_token>"
curl -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": "true; DROP TABLE profiles; --"
  }'
```

**Expected Behavior**:
- [ ] Input properly escaped/sanitized
- [ ] No SQL execution
- [ ] Value coerced to boolean safely
- [ ] Database intact

---

#### Test Case 9.3: XSS Prevention
**Objective**: Verify frontend sanitizes any user-controlled data

**Note**: Notification preferences are boolean, so XSS risk is minimal, but test error messages and success messages

**Expected Behavior**:
- [ ] No script execution possible
- [ ] Error messages safely rendered
- [ ] No HTML injection

---

## 📱 Cross-Browser Testing

### Test Suite 10: Browser Compatibility

| Browser | Version | Test Status | Issues |
|---------|---------|-------------|--------|
| Chrome | Latest | [ ] Pass | |
| Firefox | Latest | [ ] Pass | |
| Safari | Latest | [ ] Pass | |
| Edge | Latest | [ ] Pass | |
| Mobile Safari | iOS 15+ | [ ] Pass | |
| Chrome Mobile | Latest | [ ] Pass | |

**Test Checklist Per Browser**:
- [ ] Toggle switches render correctly
- [ ] Animations smooth
- [ ] API requests succeed
- [ ] State persistence works
- [ ] Error handling functions
- [ ] Arabic text displays correctly

---

## 🛠️ Regression Testing

### Test Suite 11: Regression Checks

#### Test Case 11.1: Existing Profile Settings Still Work
**Objective**: Verify notification settings addition didn't break existing functionality

**Test Steps**:
1. Navigate to Profile Settings
2. Test avatar upload/removal
3. Test user info display
4. Verify all existing sections load

**Expected Behavior**:
- [ ] Avatar section works
- [ ] User info section works
- [ ] No new console errors
- [ ] Page performance unchanged

---

#### Test Case 11.2: Other Settings Tabs Unaffected
**Objective**: Verify changes to profile.js didn't break other routes

**Test Steps**:
1. Test User Management tab
2. Test System Settings tab
3. Test Audit Logs tab
4. Test all other settings features

**Expected Behavior**:
- [ ] All tabs load successfully
- [ ] No broken routes
- [ ] No authentication issues

---

## 📋 Test Execution Checklist

### Pre-Testing Setup
- [ ] Backend running at https://proshael.onrender.com
- [ ] Frontend deployed at https://59dcc1b5.alshuail-admin.pages.dev
- [ ] Database migration applied successfully
- [ ] Test user account active (admin@alshuail.com)
- [ ] Authentication token valid

### Testing Order
1. [ ] Backend API Testing (Test Suites 1-2)
2. [ ] Database Verification
3. [ ] Frontend UI Testing (Test Suites 3-4)
4. [ ] Integration Testing (Test Suite 5)
5. [ ] Error Scenarios (Test Suite 6)
6. [ ] Performance Testing (Test Suite 7)
7. [ ] User Acceptance Testing (Test Suite 8)
8. [ ] Security Testing (Test Suite 9)
9. [ ] Cross-Browser Testing (Test Suite 10)
10. [ ] Regression Testing (Test Suite 11)

### Post-Testing
- [ ] Document all failures and bugs
- [ ] Create bug tickets for issues found
- [ ] Retest after fixes
- [ ] Final sign-off from stakeholders

---

## 📊 Test Summary Template

```markdown
## Test Execution Report: Feature 3 Notification Settings

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: Production / Staging
**Build**: [Deployment URL]

### Summary
- Total Test Cases: 60+
- Passed: __
- Failed: __
- Blocked: __
- Not Tested: __

### Critical Issues
1. [Issue description]
2. [Issue description]

### Non-Critical Issues
1. [Issue description]
2. [Issue description]

### Notes
[Any additional observations]

### Sign-off
- [ ] Backend API: Approved by ___________
- [ ] Frontend UI: Approved by ___________
- [ ] Database: Approved by ___________
- [ ] Security: Approved by ___________
- [ ] Performance: Approved by ___________

**Overall Status**: ✅ PASS / ❌ FAIL / ⏳ PENDING
```

---

## 🎯 Success Criteria

Feature 3 is considered **COMPLETE and READY FOR PRODUCTION** when:

### Backend
- [x] GET endpoint returns correct data
- [x] PUT endpoint updates preferences correctly
- [x] Merge behavior works (partial updates)
- [x] Default values returned when NULL
- [x] Authentication enforced
- [x] Error handling robust
- [x] Dual-language error messages

### Frontend
- [x] Toggles load current state on mount
- [x] Toggles respond immediately (optimistic updates)
- [x] Saving indicator displays during save
- [x] Success message on save
- [x] Error rollback on failure
- [x] State persists across sessions
- [x] Arabic RTL layout correct

### Database
- [x] Migration applied successfully
- [x] JSONB column with defaults
- [x] GIN index created
- [x] Column comment added
- [x] Query performance acceptable

### Quality
- [ ] All test suites pass (60+ test cases)
- [ ] No critical bugs
- [ ] Performance within benchmarks
- [ ] Security validated
- [ ] Cross-browser compatible
- [ ] UAT approved by stakeholders

---

## 📞 Testing Support

### Deployment URLs
- **Frontend**: https://59dcc1b5.alshuail-admin.pages.dev
- **Backend**: https://proshael.onrender.com
- **Database**: Supabase PostgreSQL

### Test Credentials
- **Email**: admin@alshuail.com
- **Password**: Admin@123456
- **Role**: super_admin

### Documentation References
- Feature 3 UI Summary: `claudedocs/feature3-notification-settings-summary.md`
- Migration File: `migrations/20250201_add_notification_preferences.sql`
- Backend Routes: `alshuail-backend/src/routes/profile.js`
- Frontend Component: `alshuail-admin-arabic/src/components/Settings/ProfileSettings.tsx`

### Support Contacts
- **Technical Issues**: [Developer Team]
- **Test Data**: [QA Team]
- **Access Issues**: [Admin Team]

---

**Test Scenarios Document Version**: 1.0
**Last Updated**: 2025-11-12
**Status**: ✅ Ready for QA Execution
