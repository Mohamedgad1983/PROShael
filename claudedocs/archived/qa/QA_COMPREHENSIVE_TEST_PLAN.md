# Comprehensive QA Test Plan - Member Suspension System
## Post-Refactoring Validation

**Date**: 2025-10-24
**Scope**: Complete A-Z testing after HIGH/MEDIUM/LOW priority improvements
**Environment**: Production (proshael.onrender.com)
**Commit**: 24e922b

---

## Test Strategy

### Regression Testing (Existing Functionality)
✅ Verify all 10 original tests still pass after refactoring

### New Feature Testing (Improvements)
✅ Test new validation features (UUID, XSS, max length)
✅ Test new authorization (requireAdminOrSelf)
✅ Verify enhanced audit trail (admin details)

### Security Testing
✅ XSS attack prevention
✅ Authorization bypass attempts
✅ Input validation edge cases

---

## TEST SUITE A: Core Functionality (Regression)

### Test A1: Suspend Active Member ✅
**Priority**: CRITICAL
**Prerequisites**: Member must be active

```bash
# Step 1: Get JWT token
curl -X POST https://proshael.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alshuail.com","password":"Admin@123"}'

# Extract token from response: eyJhbGci...

# Step 2: Suspend member
curl -X POST "https://proshael.onrender.com/api/members/54c27835-898f-429c-a8bf-441ace4a6157/suspend" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"reason":"QA Test - Comprehensive validation after refactoring"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "تم إيقاف العضو بنجاح",
  "data": {
    "member": {
      "id": "54c27835-898f-429c-a8bf-441ace4a6157",
      "name": "ابراهيم نواش غضبان",
      "status": "suspended",
      "suspended_at": "[TIMESTAMP]",
      "suspended_by": {
        "id": "[ADMIN_UUID]",
        "email": "admin@alshuail.com",
        "role": "super_admin"
      },
      "suspension_reason": "QA Test - Comprehensive validation after refactoring"
    }
  }
}
```

**Validation Points**:
- ✅ HTTP 200 status
- ✅ `suspended_by` now includes {id, email, role} (MEDIUM #6 fix)
- ✅ Reason is sanitized (HIGH #2 fix)
- ✅ Message uses constant from memberConstants.js (MEDIUM #4 fix)

**Database Verification**:
```sql
SELECT membership_status, suspended_at, suspended_by, suspension_reason
FROM members WHERE id = '54c27835-898f-429c-a8bf-441ace4a6157';
```

Expected: status='suspended', timestamps recorded, audit trail complete

---

### Test A2: Activate Suspended Member ✅
**Priority**: CRITICAL
**Prerequisites**: Member must be suspended (from A1)

```bash
curl -X POST "https://proshael.onrender.com/api/members/54c27835-898f-429c-a8bf-441ace4a6157/activate" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"notes":"QA Test - Activation after refactoring validation"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "تم تفعيل العضو بنجاح",
  "data": {
    "member": {
      "id": "54c27835-898f-429c-a8bf-441ace4a6157",
      "name": "ابراهيم نواش غضبان",
      "status": "active",
      "reactivated_at": "[TIMESTAMP]",
      "reactivated_by": {
        "id": "[ADMIN_UUID]",
        "email": "admin@alshuail.com",
        "role": "super_admin"
      },
      "reactivation_notes": "QA Test - Activation after refactoring validation"
    }
  }
}
```

**Validation Points**:
- ✅ HTTP 200 status
- ✅ `reactivated_by` includes full admin details (MEDIUM #6 fix)
- ✅ Notes are sanitized (HIGH #2 fix)
- ✅ Historical suspension data preserved in DB

---

### Test A3: Already Suspended Error ✅
**Priority**: HIGH

```bash
# Suspend member twice
curl -X POST ".../suspend" ... (first suspend - should succeed)
curl -X POST ".../suspend" ... (second suspend - should fail)
```

**Expected Response**:
```json
{
  "success": false,
  "error": "ALREADY_SUSPENDED",
  "message": "العضو موقوف بالفعل"
}
```

**Validation**: Error code from ERROR_CODES constant (MEDIUM #4)

---

### Test A4: Not Suspended Error ✅
**Priority**: HIGH

```bash
# Activate active member
curl -X POST ".../activate" ... (should fail)
```

**Expected Response**:
```json
{
  "success": false,
  "error": "NOT_SUSPENDED",
  "message": "العضو غير موقوف"
}
```

---

## TEST SUITE B: New Validation Features

### Test B1: Invalid UUID Format ✅ NEW
**Priority**: HIGH (Tests HIGH #2 fix)

```bash
curl -X POST "https://proshael.onrender.com/api/members/invalid-uuid-format/suspend" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test"}'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "معرف العضو غير صالح"
}
```

**Validation**: UUID validation from memberValidation.js working

---

### Test B2: XSS Attack Prevention ✅ NEW
**Priority**: CRITICAL (Tests HIGH #2 fix)

```bash
curl -X POST "https://proshael.onrender.com/api/members/54c27835-898f-429c-a8bf-441ace4a6157/suspend" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"reason":"<script>alert(\"XSS\")</script>Test suspension"}'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "member": {
      "suspension_reason": "Test suspension"  // ✅ HTML tags removed
    }
  }
}
```

**Validation**: XSS sanitization removes `<script>` tags

---

### Test B3: Max Length Validation ✅ NEW
**Priority**: MEDIUM (Tests HIGH #2 fix)

```bash
# Create 501-character reason
LONG_REASON=$(python3 -c "print('A' * 501)")

curl -X POST ".../suspend" \
  -H "Authorization: Bearer [TOKEN]" \
  -d "{\"reason\":\"$LONG_REASON\"}"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "سبب الإيقاف طويل جداً (الحد الأقصى 500 حرف)"
}
```

**Validation**: VALIDATION_LIMITS.SUSPENSION_REASON_MAX_LENGTH enforced

---

### Test B4: Empty Reason After Sanitization ✅ NEW
**Priority**: MEDIUM

```bash
curl -X POST ".../suspend" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"reason":"   <><><>   "}'  # Only HTML tags and whitespace
```

**Expected Response**:
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "يجب إدخال سبب الإيقاف"
}
```

**Validation**: Sanitization removes tags, then empty check catches it

---

## TEST SUITE C: Authorization Security

### Test C1: Admin Views Any Member History ✅ NEW
**Priority**: CRITICAL (Tests HIGH #3 fix)

```bash
curl -X GET "https://proshael.onrender.com/api/members/54c27835-898f-429c-a8bf-441ace4a6157/suspension-history" \
  -H "Authorization: Bearer [ADMIN_TOKEN]"
```

**Expected**: HTTP 200 - Admin can view any member's history

---

### Test C2: Member Views Own History ✅ NEW
**Priority**: CRITICAL (Tests HIGH #3 fix)

```bash
# Login as member (get member JWT token)
curl -X POST https://proshael.onrender.com/api/auth/login \
  -d '{"email":"member@example.com","password":"..."}'

# View own history
curl -X GET "https://proshael.onrender.com/api/members/[SAME_MEMBER_ID]/suspension-history" \
  -H "Authorization: Bearer [MEMBER_TOKEN]"
```

**Expected**: HTTP 200 - Member can view own history

---

### Test C3: Member Views Other's History (FORBIDDEN) ✅ NEW
**Priority**: CRITICAL (Tests HIGH #3 fix)

```bash
curl -X GET "https://proshael.onrender.com/api/members/[OTHER_MEMBER_ID]/suspension-history" \
  -H "Authorization: Bearer [MEMBER_TOKEN]"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "غير مسموح لك بعرض هذه المعلومات"
}
```

**Validation**: requireAdminOrSelf middleware blocking cross-member access

---

### Test C4: Unauthenticated Access ✅
**Priority**: CRITICAL

```bash
curl -X GET ".../suspension-history"
# No Authorization header
```

**Expected Response**:
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "غير مصرح - يجب تسجيل الدخول"
}
```

---

## TEST SUITE D: Enhanced Audit Trail

### Test D1: Verify Admin Details in Response ✅
**Priority**: MEDIUM (Tests MEDIUM #6 fix)

After suspending a member, verify `suspended_by` structure:

**Before Refactoring**:
```json
"suspended_by": "admin@alshuail.com"  // ❌ Only email
```

**After Refactoring**:
```json
"suspended_by": {
  "id": "a4ed4bc2-b61e-49ce-90c4-386b131d054e",
  "email": "admin@alshuail.com",
  "role": "super_admin"
}
```

**Validation**: Response includes full admin object (id, email, role)

---

### Test D2: Database Audit Trail Completeness ✅
**Priority**: MEDIUM

```sql
SELECT
  membership_status,
  suspended_at,
  suspended_by,
  suspension_reason,
  reactivated_at,
  reactivated_by,
  reactivation_notes
FROM members
WHERE id = '54c27835-898f-429c-a8bf-441ace4a6157';
```

**Expected**: All fields populated, historical data preserved even after reactivation

---

## TEST SUITE E: Error Logging Enhancement

### Test E1: Supabase Error Details in Logs ✅
**Priority**: LOW (Tests MEDIUM #5 fix)

**Test**: Trigger a database error (e.g., invalid member ID in database)

**Check Render Logs**:
```
[Suspend] Database error: {
  "error": {...},
  "memberId": "...",
  "errorCode": "PGRST116",       // ✅ NEW
  "errorDetails": "...",         // ✅ NEW
  "errorHint": "...",            // ✅ NEW
  "errorMessage": "..."          // ✅ NEW
}
```

**Validation**: Enhanced error logging includes Supabase error details

---

## TEST SUITE F: Non-Existent Member

### Test F1: Suspend Non-Existent Member ✅
**Priority**: HIGH

```bash
curl -X POST "https://proshael.onrender.com/api/members/00000000-0000-0000-0000-000000000000/suspend" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"reason":"Test"}'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "MEMBER_NOT_FOUND",
  "message": "العضو غير موجود"
}
```

**Validation**: findMemberById() helper handling non-existent member (HIGH #1 fix)

---

## TEST SUITE G: Authentication Edge Cases

### Test G1: Missing JWT Token ✅
```bash
curl -X POST ".../suspend" -d '{"reason":"Test"}'
# No Authorization header
```

**Expected**: HTTP 401 - "No token provided"

---

### Test G2: Invalid JWT Token ✅
```bash
curl -X POST ".../suspend" \
  -H "Authorization: Bearer invalid_token_12345" \
  -d '{"reason":"Test"}'
```

**Expected**: HTTP 401 - "Invalid token"

---

### Test G3: Expired JWT Token ✅
```bash
# Use old token from previous session
curl -X POST ".../suspend" \
  -H "Authorization: Bearer [EXPIRED_TOKEN]" \
  -d '{"reason":"Test"}'
```

**Expected**: HTTP 401 - "Token expired"

---

## TEST SUITE H: Backward Compatibility

### Test H1: API Response Structure Unchanged ✅
**Priority**: CRITICAL

**Verify**: Response structure matches original API exactly (except for suspended_by enhancement)

**Original**:
```json
{
  "success": true,
  "message": "تم إيقاف العضو بنجاح",
  "data": { "member": { ... } }
}
```

**Refactored**: Same structure, only `suspended_by` enhanced from string to object

---

### Test H2: Error Messages Unchanged ✅
**Priority**: HIGH

**Verify**: All Arabic error messages remain identical

Example:
- "معرف العضو مطلوب"
- "يجب إدخال سبب الإيقاف"
- "العضو غير موجود"
- "العضو موقوف بالفعل"

All messages preserved in ERROR_MESSAGES constants

---

## TEST EXECUTION CHECKLIST

### Pre-Testing Setup
- [ ] Get fresh super admin JWT token
- [ ] Identify test member ID (active status)
- [ ] Verify backend is deployed and healthy
- [ ] Prepare test data (valid/invalid UUIDs, XSS payloads, long strings)

### Regression Tests (10 tests)
- [ ] A1: Suspend active member
- [ ] A2: Activate suspended member
- [ ] A3: Already suspended error
- [ ] A4: Not suspended error
- [ ] F1: Non-existent member
- [ ] G1: Missing JWT token
- [ ] G2: Invalid JWT token
- [ ] G3: Expired JWT token
- [ ] H1: Response structure unchanged
- [ ] H2: Error messages unchanged

### New Validation Tests (4 tests)
- [ ] B1: Invalid UUID format
- [ ] B2: XSS attack prevention
- [ ] B3: Max length validation
- [ ] B4: Empty reason after sanitization

### Authorization Tests (4 tests)
- [ ] C1: Admin views any member history
- [ ] C2: Member views own history
- [ ] C3: Member views other's history (forbidden)
- [ ] C4: Unauthenticated access

### Enhancement Verification (2 tests)
- [ ] D1: Admin details in response
- [ ] D2: Database audit trail completeness

### Total Tests: 20

---

## Success Criteria

### Must Pass (100% Required):
- ✅ All 10 regression tests pass
- ✅ All 4 authorization tests pass
- ✅ All 4 validation tests pass
- ✅ Response structure backward compatible

### Should Pass (95% Required):
- ✅ Enhancement verification tests
- ✅ Error logging improvements visible in Render logs

### Performance Benchmarks:
- ⏱️ Response time < 1 second for all endpoints
- 📊 No performance degradation from refactoring
- 🔍 Error logs more detailed and helpful

---

## Failure Response Plan

### If Regression Tests Fail:
1. **IMMEDIATE**: Stop deployment, rollback to commit 9ccfd53
2. **ANALYZE**: Review error logs and failure details
3. **FIX**: Address specific issue in local environment
4. **RE-TEST**: Complete test suite again locally
5. **RE-DEPLOY**: Push fix and repeat QA

### If New Tests Fail:
1. **ASSESS**: Determine if expected behavior or bug
2. **PRIORITIZE**: HIGH priority = block deployment, MEDIUM = document for Phase 2
3. **DOCUMENT**: Add to known issues list
4. **COMMUNICATE**: Notify team of limitations

---

## Test Results Documentation Template

```markdown
## Test Execution Results
**Date**: [DATE]
**Tester**: [NAME]
**Environment**: Production
**Commit**: 24e922b

### Summary:
- Total Tests: 20
- Passed: __/20
- Failed: __/20
- Skipped: __/20
- Success Rate: __%

### Detailed Results:
[TEST_ID] [PASS/FAIL] [Notes]

### Issues Found:
1. [Description]
   - Severity: [CRITICAL/HIGH/MEDIUM/LOW]
   - Steps to Reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### Recommendations:
[...]

### Deployment Decision:
[ ] ✅ APPROVED - All tests passed, safe for production
[ ] ⚠️  CONDITIONAL - Minor issues, deploy with caveats
[ ] ❌ REJECTED - Critical issues, rollback required
```

---

## Automated Test Script

```bash
#!/bin/bash
# qa-suspension-system.sh
# Automated QA test runner for Member Suspension System

API_BASE="https://proshael.onrender.com"
ADMIN_EMAIL="admin@alshuail.com"
ADMIN_PASSWORD="Admin@123"
TEST_MEMBER_ID="54c27835-898f-429c-a8bf-441ace4a6157"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "Member Suspension System - QA Test Suite"
echo "========================================="

# Step 1: Get JWT Token
echo -e "\n[TEST 0] Getting JWT Token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ FAILED: Could not obtain JWT token${NC}"
  exit 1
else
  echo -e "${GREEN}✅ PASSED: JWT token obtained${NC}"
fi

# Test A1: Suspend Member
echo -e "\n[TEST A1] Suspending member..."
SUSPEND_RESPONSE=$(curl -s -X POST "$API_BASE/api/members/$TEST_MEMBER_ID/suspend" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"QA Automated Test - Suspend"}')

if echo "$SUSPEND_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASSED: Member suspended successfully${NC}"
else
  echo -e "${RED}❌ FAILED: Suspend failed${NC}"
  echo "$SUSPEND_RESPONSE"
fi

# Test A2: Activate Member
echo -e "\n[TEST A2] Activating member..."
ACTIVATE_RESPONSE=$(curl -s -X POST "$API_BASE/api/members/$TEST_MEMBER_ID/activate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"QA Automated Test - Activate"}')

if echo "$ACTIVATE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASSED: Member activated successfully${NC}"
else
  echo -e "${RED}❌ FAILED: Activate failed${NC}"
  echo "$ACTIVATE_RESPONSE"
fi

# Test B1: Invalid UUID
echo -e "\n[TEST B1] Testing invalid UUID..."
INVALID_UUID_RESPONSE=$(curl -s -X POST "$API_BASE/api/members/invalid-uuid/suspend" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test"}')

if echo "$INVALID_UUID_RESPONSE" | grep -q '"error":"INVALID_INPUT"'; then
  echo -e "${GREEN}✅ PASSED: Invalid UUID rejected${NC}"
else
  echo -e "${RED}❌ FAILED: Invalid UUID not caught${NC}"
  echo "$INVALID_UUID_RESPONSE"
fi

# Add more tests...

echo -e "\n========================================="
echo "Test Suite Complete"
echo "========================================="
```

---

**End of QA Test Plan**
