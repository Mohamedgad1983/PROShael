# API Testing Guide - Member Suspension System
## دليل اختبار API - نظام إيقاف الأعضاء

**Date**: 2025-01-24
**Status**: Ready for Testing
**Backend URL**: https://proshael.onrender.com

---

## Prerequisites - المتطلبات الأساسية

### 1. Tools Required - الأدوات المطلوبة
- **Postman** (recommended) or **curl** command line
- **JWT Token** from super admin account
- **Test Member ID** from database
- **Database Access** (optional for verification)

### 2. Get Super Admin JWT Token

#### Option A: Using Postman
```http
POST https://proshael.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "admin@alshuail.com",
  "password": "YOUR_SUPER_ADMIN_PASSWORD"
}
```

**Expected Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "admin@alshuail.com",
    "role": "super_admin"
  }
}
```

**Save the token** - you'll use it in all subsequent requests as:
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

#### Option B: Using curl
```bash
curl -X POST https://proshael.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alshuail.com","password":"YOUR_PASSWORD"}'
```

### 3. Get Test Member ID

Query the database or use the members list API:

```bash
curl -X GET "https://proshael.onrender.com/api/members?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Pick any member ID from the response, for example: `SH-0001` or UUID format.

---

## Test Cases - حالات الاختبار

### ✅ Test 1: Suspend Active Member (Success Case)

**Endpoint**: `POST /api/members/:memberId/suspend`

**curl Command**:
```bash
curl -X POST "https://proshael.onrender.com/api/members/MEMBER_ID_HERE/suspend" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "عدم سداد الاشتراكات لمدة 6 أشهر"
  }'
```

**Postman Setup**:
- **Method**: POST
- **URL**: `https://proshael.onrender.com/api/members/MEMBER_ID_HERE/suspend`
- **Headers**:
  - `Authorization`: `Bearer YOUR_JWT_TOKEN`
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
```json
{
  "reason": "عدم سداد الاشتراكات لمدة 6 أشهر"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "تم إيقاف العضو بنجاح",
  "data": {
    "member": {
      "id": "MEMBER_ID",
      "name": "محمد عبدالله الشعيل",
      "status": "suspended",
      "suspended_at": "2025-01-24T12:30:00.000Z",
      "suspended_by": "admin@alshuail.com",
      "suspension_reason": "عدم سداد الاشتراكات لمدة 6 أشهر"
    }
  }
}
```

**Verify in Database**:
```sql
SELECT
  id, full_name_arabic, membership_status,
  suspended_at, suspended_by, suspension_reason
FROM members
WHERE id = 'MEMBER_ID';
```

Expected:
- `membership_status` = `'suspended'`
- `suspended_at` = timestamp
- `suspended_by` = super admin UUID
- `suspension_reason` = "عدم سداد الاشتراكات لمدة 6 أشهر"

---

### ✅ Test 2: Activate Suspended Member (Success Case)

**Endpoint**: `POST /api/members/:memberId/activate`

**curl Command**:
```bash
curl -X POST "https://proshael.onrender.com/api/members/MEMBER_ID_HERE/activate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "تم سداد جميع المتأخرات المالية"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "تم تفعيل العضو بنجاح",
  "data": {
    "member": {
      "id": "MEMBER_ID",
      "name": "محمد عبدالله الشعيل",
      "status": "active",
      "reactivated_at": "2025-01-24T13:00:00.000Z",
      "reactivated_by": "admin@alshuail.com",
      "reactivation_notes": "تم سداد جميع المتأخرات المالية"
    }
  }
}
```

**Verify in Database**:
```sql
SELECT
  id, full_name_arabic, membership_status,
  reactivated_at, reactivated_by, reactivation_notes
FROM members
WHERE id = 'MEMBER_ID';
```

Expected:
- `membership_status` = `'active'`
- `reactivated_at` = timestamp
- `reactivated_by` = super admin UUID
- `reactivation_notes` = "تم سداد جميع المتأخرات المالية"

---

### ✅ Test 3: Get Suspension History

**Endpoint**: `GET /api/members/:memberId/suspension-history`

**curl Command**:
```bash
curl -X GET "https://proshael.onrender.com/api/members/MEMBER_ID_HERE/suspension-history" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "MEMBER_ID",
      "name": "محمد عبدالله الشعيل",
      "current_status": "active"
    },
    "suspension_info": {
      "suspended_at": "2025-01-24T12:30:00.000Z",
      "suspended_by": "admin@alshuail.com",
      "reason": "عدم سداد الاشتراكات لمدة 6 أشهر",
      "reactivated_at": "2025-01-24T13:00:00.000Z",
      "reactivated_by": "admin@alshuail.com",
      "notes": "تم سداد جميع المتأخرات المالية"
    }
  }
}
```

---

## Error Scenarios - حالات الخطأ

### ❌ Test 4: Suspend Without Reason (Should Fail)

**curl Command**:
```bash
curl -X POST "https://proshael.onrender.com/api/members/MEMBER_ID_HERE/suspend" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "يجب إدخال سبب الإيقاف",
  "message_en": "Suspension reason is required"
}
```

---

### ❌ Test 5: Suspend Already Suspended Member (Should Fail)

**Scenario**: Try to suspend a member who is already suspended

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "ALREADY_SUSPENDED",
  "message": "العضو موقوف بالفعل",
  "message_en": "Member is already suspended"
}
```

---

### ❌ Test 6: Activate Active Member (Should Fail)

**Scenario**: Try to activate a member who is already active

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "NOT_SUSPENDED",
  "message": "العضو غير موقوف",
  "message_en": "Member is not suspended"
}
```

---

### ❌ Test 7: Suspend with Invalid Member ID (Should Fail)

**curl Command**:
```bash
curl -X POST "https://proshael.onrender.com/api/members/INVALID_ID/suspend" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```

**Expected Response** (404 Not Found):
```json
{
  "success": false,
  "error": "MEMBER_NOT_FOUND",
  "message": "العضو غير موجود",
  "message_en": "Member not found"
}
```

---

### ❌ Test 8: Suspend Without Authentication (Should Fail)

**curl Command** (no Authorization header):
```bash
curl -X POST "https://proshael.onrender.com/api/members/MEMBER_ID_HERE/suspend" \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "يجب تسجيل الدخول أولاً",
  "message_en": "Authentication required"
}
```

---

### ❌ Test 9: Suspend as Regular Admin (Should Fail)

**Scenario**: Use JWT token from regular admin account (not super_admin)

**Steps**:
1. Login as regular admin:
```bash
curl -X POST https://proshael.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"regular_admin@alshuail.com","password":"PASSWORD"}'
```

2. Use the regular admin token to try suspending:
```bash
curl -X POST "https://proshael.onrender.com/api/members/MEMBER_ID_HERE/suspend" \
  -H "Authorization: Bearer REGULAR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```

**Expected Response** (403 Forbidden):
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "هذه العملية متاحة للمشرف العام فقط",
  "message_en": "Super admin access required",
  "requiredRole": "super_admin",
  "currentRole": "admin"
}
```

---

## Security Testing - اختبار الأمان

### 🔒 Test 10: SQL Injection Attempt (Should Be Blocked)

**curl Command**:
```bash
curl -X POST "https://proshael.onrender.com/api/members/'; DROP TABLE members; --/suspend" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "test OR 1=1"}'
```

**Expected**: Request should fail safely without executing SQL injection
- Should return 404 (member not found) or validation error
- Database should remain intact

---

### 🔒 Test 11: JWT Token Manipulation (Should Fail)

**Scenario**: Modify JWT token payload to fake super_admin role

**Steps**:
1. Decode your JWT token
2. Change the role claim to `super_admin`
3. Re-encode (without proper signature)
4. Try to use modified token

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

**Why it fails**: Backend queries database for actual role, doesn't trust JWT claim alone.

---

## Performance Testing - اختبار الأداء

### ⚡ Test 12: Response Time Benchmark

**Goal**: All API responses should be < 500ms

**Test Method**:
```bash
time curl -X POST "https://proshael.onrender.com/api/members/MEMBER_ID/suspend" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```

**Expected**:
- Response time: < 500ms for suspend/activate
- Response time: < 300ms for history query

---

### ⚡ Test 13: Concurrent Requests

**Scenario**: Multiple admins trying to suspend/activate at the same time

**Test Method** (requires load testing tool like Apache Bench):
```bash
# 10 concurrent requests
ab -n 10 -c 10 -H "Authorization: Bearer TOKEN" \
  -p suspend.json -T "application/json" \
  https://proshael.onrender.com/api/members/MEMBER_ID/suspend
```

**Expected**:
- No database corruption
- Consistent responses
- Proper error handling

---

## Test Results Template - قالب نتائج الاختبار

Copy this template to document your test results:

```markdown
## Test Execution Report - تقرير تنفيذ الاختبارات

**Date**: ___________
**Tester**: ___________
**Backend Version**: ___________
**Environment**: Production (https://proshael.onrender.com)

### Test Results:

| # | Test Case | Expected | Actual | Status | Notes |
|---|-----------|----------|--------|--------|-------|
| 1 | Suspend Active Member | 200 OK | _____ | ☐ Pass ☐ Fail | _____ |
| 2 | Activate Suspended Member | 200 OK | _____ | ☐ Pass ☐ Fail | _____ |
| 3 | Get Suspension History | 200 OK | _____ | ☐ Pass ☐ Fail | _____ |
| 4 | Suspend Without Reason | 400 Bad Request | _____ | ☐ Pass ☐ Fail | _____ |
| 5 | Suspend Already Suspended | 400 Bad Request | _____ | ☐ Pass ☐ Fail | _____ |
| 6 | Activate Active Member | 400 Bad Request | _____ | ☐ Pass ☐ Fail | _____ |
| 7 | Invalid Member ID | 404 Not Found | _____ | ☐ Pass ☐ Fail | _____ |
| 8 | No Authentication | 401 Unauthorized | _____ | ☐ Pass ☐ Fail | _____ |
| 9 | Regular Admin (Not Super) | 403 Forbidden | _____ | ☐ Pass ☐ Fail | _____ |
| 10 | SQL Injection Attempt | Blocked | _____ | ☐ Pass ☐ Fail | _____ |
| 11 | JWT Token Manipulation | 401 Unauthorized | _____ | ☐ Pass ☐ Fail | _____ |
| 12 | Response Time < 500ms | < 500ms | _____ | ☐ Pass ☐ Fail | _____ |
| 13 | Concurrent Requests | No corruption | _____ | ☐ Pass ☐ Fail | _____ |

### Database Verification:

- [ ] `membership_status` updates correctly
- [ ] `suspended_at` timestamp recorded
- [ ] `suspended_by` admin UUID recorded
- [ ] `suspension_reason` stored correctly
- [ ] `reactivated_at` timestamp recorded
- [ ] `reactivated_by` admin UUID recorded
- [ ] `reactivation_notes` stored correctly

### Summary:

- **Total Tests**: 13
- **Passed**: _____
- **Failed**: _____
- **Pass Rate**: _____%
- **Critical Issues Found**: _____
- **Recommendation**: ☐ APPROVED FOR PRODUCTION ☐ NEEDS FIXES

### Issues Found:

1. _____________________
2. _____________________
3. _____________________

### Sign-off:

**QA Engineer**: _____________________
**Date**: _____________________
**Approved By**: _____________________
```

---

## Quick Test Checklist - قائمة مراجعة سريعة

**Before Starting**:
- [ ] Backend is healthy: `curl https://proshael.onrender.com/api/health`
- [ ] Super admin JWT token obtained
- [ ] Test member ID identified
- [ ] Postman installed or curl available

**Success Path** (30 minutes):
- [ ] Test 1: Suspend active member ✅
- [ ] Test 2: Activate suspended member ✅
- [ ] Test 3: Get suspension history ✅
- [ ] Verify database updates ✅

**Error Scenarios** (20 minutes):
- [ ] Test 4: Missing reason validation ✅
- [ ] Test 5: Already suspended error ✅
- [ ] Test 6: Not suspended error ✅
- [ ] Test 7: Invalid member ID ✅

**Security Tests** (20 minutes):
- [ ] Test 8: No authentication ✅
- [ ] Test 9: Regular admin blocked ✅
- [ ] Test 10: SQL injection blocked ✅
- [ ] Test 11: JWT manipulation blocked ✅

**Performance Tests** (10 minutes):
- [ ] Test 12: Response time benchmark ✅
- [ ] Test 13: Concurrent requests ✅

**Total Estimated Time**: ~80 minutes

---

## Common Issues and Solutions - المشاكل الشائعة والحلول

### Issue 1: "401 Unauthorized" on all requests
**Cause**: JWT token expired or invalid
**Solution**:
1. Re-login to get fresh token
2. Check token format: `Bearer YOUR_TOKEN` (with space)
3. Verify token in Authorization header

### Issue 2: "403 Forbidden - Super admin access required"
**Cause**: User doesn't have super_admin role
**Solution**:
1. Verify in database: `SELECT role FROM users WHERE email = 'admin@alshuail.com'`
2. Should return `'super_admin'`
3. If not, update: `UPDATE users SET role = 'super_admin' WHERE email = 'admin@alshuail.com'`

### Issue 3: "404 Member not found"
**Cause**: Invalid member ID format or member doesn't exist
**Solution**:
1. Query members table: `SELECT id, member_number FROM members LIMIT 5`
2. Use exact ID format (UUID or member_number like 'SH-0001')

### Issue 4: Network timeout
**Cause**: Render backend cold start or slow database
**Solution**:
1. Wait 10-15 seconds for cold start
2. Retry request
3. Check Render dashboard for backend status

---

## Next Steps After API Testing

1. **If all tests pass**:
   - Update QA report with results
   - Proceed to Dashboard API Integration
   - Connect frontend suspend buttons to real API

2. **If tests fail**:
   - Document failures in detail
   - Check backend logs: https://dashboard.render.com
   - Fix issues and re-test

3. **Mobile App Integration**:
   - Apply `checkMemberSuspension` middleware to mobile endpoints
   - Test suspended member login (should be blocked)

---

**Good luck with testing! 🚀**
**بالتوفيق في الاختبار! 🎯**
