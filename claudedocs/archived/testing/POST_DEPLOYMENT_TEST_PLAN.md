# Post-Deployment Test Plan - Comprehensive A-Z Validation
**Target**: https://proshael.onrender.com
**Method**: Playwright MCP + Chrome DevTools
**Goal**: 100% Functional Validation
**Duration**: ~30 minutes

---

## Test Execution Phases

### Phase 1: Deployment Verification (5 min)
**Objective**: Confirm deployment succeeded and service is healthy

#### Test 1.1: Health Check
```javascript
GET https://proshael.onrender.com/api/health
Expected: 200 OK
Response: {
  "status": "healthy",
  "checks": {
    "database": true,
    "jwt": true,
    "supabase_url": true,
    "supabase_keys": true
  }
}
```

#### Test 1.2: Deployment Commit Verification
```javascript
// Check if new commit is live
// Look for multi-role endpoints availability
GET https://proshael.onrender.com/api/multi-role/roles
Expected: 401 Unauthorized (not 404)
```

#### Test 1.3: Existing Endpoints Stability
```javascript
GET https://proshael.onrender.com/api/settings/system
Expected: 401 Unauthorized (unchanged behavior)

POST https://proshael.onrender.com/api/auth/login
Body: { "email": "", "password": "" }
Expected: 400 Bad Request with Arabic error message
```

---

### Phase 2: Multi-Role API Endpoints (10 min)
**Objective**: Test all 7 multi-role endpoints

#### Test 2.1: List Available Roles
```javascript
GET /api/multi-role/roles
Headers: { Authorization: "Bearer <super_admin_token>" }

Success Criteria:
✅ Status: 200 OK
✅ Response contains array of roles
✅ Each role has: id, role_name, role_name_ar, priority, permissions
✅ Roles ordered by priority descending

Without Auth:
✅ Status: 401 Unauthorized
✅ Error message in Arabic
```

#### Test 2.2: Search Members
```javascript
GET /api/multi-role/search-members?q=admin&limit=10
Headers: { Authorization: "Bearer <super_admin_token>" }

Success Criteria:
✅ Status: 200 OK
✅ Response contains: { success: true, data: [...], count: n }
✅ Each member has: id, email, full_name, phone, primary_role, active_roles
✅ Search works across users and members tables
✅ Active roles populated from v_user_roles_with_periods view

Without Auth:
✅ Status: 401 Unauthorized

Without super_admin Role:
✅ Status: 403 Forbidden
```

#### Test 2.3: Assign Role to User
```javascript
POST /api/multi-role/assign
Headers: { Authorization: "Bearer <super_admin_token>" }
Body: {
  "user_id": "<valid_user_id>",
  "role_id": "<valid_role_id>",
  "start_date_gregorian": "2025-11-08",
  "end_date_gregorian": "2025-12-08",
  "start_date_hijri": "1447-05-08",
  "end_date_hijri": "1447-06-08",
  "notes": "Test assignment",
  "is_active": true
}

Success Criteria:
✅ Status: 201 Created
✅ Response contains assignment details
✅ Arabic success message
✅ Joi validation working
✅ Overlap detection preventing duplicates
✅ Hijri dates stored correctly

Validation Tests:
✅ Invalid user_id → 404
✅ Invalid role_id → 404
✅ end_date < start_date → 400
✅ Invalid Hijri format → 400
✅ Overlapping assignment → 409
```

#### Test 2.4: Get User Role Assignments
```javascript
GET /api/multi-role/users/:userId/roles
Headers: { Authorization: "Bearer <super_admin_token>" }

Success Criteria:
✅ Status: 200 OK
✅ Response contains all assignments (active, pending, expired)
✅ Ordered by start_date_gregorian descending
✅ Each assignment includes role details and date ranges
✅ Both Gregorian and Hijri dates present
```

#### Test 2.5: Update Role Assignment
```javascript
PUT /api/multi-role/assignments/:assignmentId
Headers: { Authorization: "Bearer <super_admin_token>" }
Body: {
  "end_date_gregorian": "2025-12-31",
  "end_date_hijri": "1447-06-29",
  "notes": "Extended assignment"
}

Success Criteria:
✅ Status: 200 OK
✅ Assignment updated successfully
✅ Arabic success message
✅ Updated dates validated
✅ Assignment not found → 404
```

#### Test 2.6: Revoke Role Assignment
```javascript
DELETE /api/multi-role/assignments/:assignmentId
Headers: { Authorization: "Bearer <super_admin_token>" }

Success Criteria:
✅ Status: 200 OK
✅ Soft delete (is_active = false)
✅ Arabic success message
✅ Assignment not found → 404
✅ Original assignment data preserved
```

#### Test 2.7: Get My Active Roles
```javascript
GET /api/multi-role/my-roles
Headers: { Authorization: "Bearer <any_authenticated_token>" }

Success Criteria:
✅ Status: 200 OK
✅ Response contains:
  - active_roles: array of current active assignments
  - merged_permissions: combined permissions object
  - role_count: number of active roles
✅ Only roles active on current date returned
✅ Calls get_active_roles() PostgreSQL function
✅ Calls get_merged_permissions() PostgreSQL function
```

---

### Phase 3: Settings Functionality A-Z (8 min)
**Objective**: Validate all settings operations

#### Test 3.1: Get System Settings (Authentication)
```javascript
GET /api/settings/system

Without Auth:
✅ Status: 401 Unauthorized
✅ Error: "رمز الوصول مطلوب"

With Auth (non-admin):
✅ Status: 403 Forbidden (if RBAC enforced)

With Admin Auth:
✅ Status: 200 OK
✅ Settings data returned
```

#### Test 3.2: Update System Settings
```javascript
PUT /api/settings/system
Headers: { Authorization: "Bearer <admin_token>" }
Body: {
  "setting_key": "test_value"
}

Success Criteria:
✅ Status: 200 OK
✅ Settings updated successfully
✅ Validation working (Joi schemas)
✅ Only authorized roles can update
```

#### Test 3.3: Settings Validation
```javascript
PUT /api/settings/system
Headers: { Authorization: "Bearer <admin_token>" }
Body: { "invalid_field": "value" }

Expected:
✅ Status: 400 Bad Request
✅ Validation error message
✅ Field-level error details
```

#### Test 3.4: Settings RBAC Enforcement
```javascript
// Test with different role levels
GET /api/settings/system
Headers: { Authorization: "Bearer <member_token>" }

Expected:
✅ Status: 403 Forbidden (if role-based access enforced)
✅ Only super_admin or authorized roles can access
```

#### Test 3.5: Settings Caching
```javascript
GET /api/settings/system (first call)
GET /api/settings/system (second call)

Success Criteria:
✅ Cache-Control headers present
✅ Second call potentially cached (check timing)
✅ Cache duration: 300 seconds (5 minutes)
```

---

### Phase 4: Security Validation (5 min)
**Objective**: Verify security measures are active

#### Test 4.1: SQL Injection Prevention
```javascript
GET /api/multi-role/search-members?q=' OR '1'='1
Headers: { Authorization: "Bearer <admin_token>" }

Success Criteria:
✅ No SQL injection executed
✅ Query sanitized by inputSanitizer.js
✅ Dangerous keywords removed
✅ Safe results returned or empty array
```

#### Test 4.2: XSS Prevention
```javascript
POST /api/multi-role/assign
Body: {
  "notes": "<script>alert('XSS')</script>"
}

Success Criteria:
✅ Script tags sanitized or escaped
✅ No JavaScript execution in stored data
```

#### Test 4.3: Authentication Token Validation
```javascript
GET /api/multi-role/roles
Headers: { Authorization: "Bearer invalid_token" }

Expected:
✅ Status: 401 Unauthorized
✅ Token validation working
✅ No information leakage in error
```

#### Test 4.4: Authorization Enforcement
```javascript
// Test with lower privilege token
POST /api/multi-role/assign
Headers: { Authorization: "Bearer <member_token>" }

Expected:
✅ Status: 403 Forbidden
✅ RBAC middleware working
✅ Only super_admin can assign roles
```

#### Test 4.5: Input Validation (Joi)
```javascript
POST /api/multi-role/assign
Body: {
  "user_id": "not-a-uuid",
  "role_id": "also-not-a-uuid"
}

Expected:
✅ Status: 400 Bad Request
✅ Validation errors with field details
✅ Error messages descriptive
```

---

### Phase 5: Integration & Workflow Tests (7 min)
**Objective**: End-to-end workflow validation

#### Test 5.1: Complete Role Assignment Workflow
```javascript
1. Search for member
   GET /api/multi-role/search-members?q=test

2. Assign role to member
   POST /api/multi-role/assign
   Body: { user_id, role_id, dates }

3. Verify assignment created
   GET /api/multi-role/users/:userId/roles

4. Update assignment dates
   PUT /api/multi-role/assignments/:id
   Body: { new dates }

5. Check user's active roles
   GET /api/multi-role/my-roles (as that user)

6. Revoke assignment
   DELETE /api/multi-role/assignments/:id

7. Confirm revocation
   GET /api/multi-role/users/:userId/roles
   (verify is_active = false)

Success Criteria:
✅ All steps succeed in sequence
✅ Data consistency maintained
✅ Database triggers working
✅ Views updating correctly
```

#### Test 5.2: Hijri Date Conversion Validation
```javascript
POST /api/multi-role/assign
Body: {
  "start_date_gregorian": "2025-11-08",
  "start_date_hijri": "1447-05-08"
}

Success Criteria:
✅ Both dates stored correctly
✅ Hijri date format validated: YYYY-MM-DD
✅ Trigger update_assignment_hijri works
✅ Dates remain synchronized
```

#### Test 5.3: Permission Merging from Multiple Roles
```javascript
// Assign multiple roles to one user
1. Assign role A (permissions: {read: true})
2. Assign role B (permissions: {write: true})

GET /api/multi-role/my-roles

Success Criteria:
✅ merged_permissions: {read: true, write: true}
✅ get_merged_permissions() function working
✅ Priority-based merging applied
✅ Conflicts resolved by priority
```

#### Test 5.4: Role Expiration Middleware
```javascript
// Create assignment with past end date
POST /api/multi-role/assign
Body: {
  "end_date_gregorian": "2025-11-01" // Past date
}

GET /api/multi-role/my-roles

Success Criteria:
✅ Expired role not in active_roles array
✅ Role expiration check working
✅ Only valid roles within date range returned
```

#### Test 5.5: Overlap Detection
```javascript
// Try to assign same role with overlapping dates
1. Assign role A: 2025-11-01 to 2025-12-01
2. Try to assign role A: 2025-11-15 to 2025-12-15

Expected:
✅ Status: 409 Conflict
✅ Error: "User already has an overlapping assignment"
✅ Existing assignments listed in response
```

---

### Phase 6: Performance & Monitoring (3 min)
**Objective**: Validate performance metrics

#### Test 6.1: Response Time Benchmarks
```javascript
Measure response times for:
- GET /api/health
- GET /api/multi-role/roles
- GET /api/multi-role/search-members
- POST /api/multi-role/assign
- GET /api/settings/system

Success Criteria:
✅ Health check: < 100ms
✅ GET endpoints: < 500ms
✅ POST endpoints: < 1000ms
✅ No significant degradation from previous version
```

#### Test 6.2: Memory Usage
```javascript
GET /api/health (check memory stats)

Success Criteria:
✅ Memory usage within normal range (< 90%)
✅ No memory leaks detected
✅ Stable over multiple requests
```

#### Test 6.3: Database Query Performance
```javascript
// Monitor Supabase dashboard for:
- Query execution times
- Connection pool usage
- Slow query detection

Success Criteria:
✅ All queries < 100ms
✅ Indexes being used
✅ No full table scans
```

---

### Phase 7: Error Handling (2 min)
**Objective**: Verify error responses

#### Test 7.1: 404 Not Found
```javascript
GET /api/nonexistent-endpoint

Expected:
✅ Status: 404 Not Found
✅ Graceful error message
```

#### Test 7.2: 500 Internal Server Error
```javascript
// Trigger error scenarios:
- Invalid database query
- Missing required service

Success Criteria:
✅ Errors caught and handled
✅ Error logging active
✅ No sensitive data in error response
✅ Arabic error messages where appropriate
```

#### Test 7.3: Rate Limiting (if configured)
```javascript
// Make rapid repeated requests

Success Criteria:
✅ Rate limiting enforced (if enabled)
✅ 429 Too Many Requests returned
✅ Retry-After header present
```

---

## Test Execution Matrix

| # | Test Category | Tests | Critical | Duration |
|---|---------------|-------|----------|----------|
| 1 | Deployment Verification | 3 | ✅ | 5 min |
| 2 | Multi-Role Endpoints | 7 | ✅ | 10 min |
| 3 | Settings Functionality | 5 | ✅ | 8 min |
| 4 | Security Validation | 5 | ✅ | 5 min |
| 5 | Integration Workflows | 5 | ✅ | 7 min |
| 6 | Performance Monitoring | 3 | ⚠️ | 3 min |
| 7 | Error Handling | 3 | ⚠️ | 2 min |
| **TOTAL** | **7 Phases** | **31 Tests** | **24 Critical** | **40 min** |

---

## Success Criteria Summary

### Mandatory (Must Pass)
✅ All 7 multi-role endpoints accessible (not 404)
✅ Authentication and authorization enforced
✅ Joi validation active on all inputs
✅ SQL injection prevention confirmed
✅ Settings CRUD operations working
✅ Database migration successful
✅ No 500 errors in any endpoint
✅ Role assignment workflow complete

### Important (Should Pass)
✅ Hijri date conversion working
✅ Permission merging functional
✅ Overlap detection preventing duplicates
✅ Role expiration middleware active
✅ Response times within targets
✅ Error handling graceful

### Optional (Nice to Have)
✅ Caching headers present
✅ Performance benchmarks met
✅ Memory usage optimal
✅ All 31 tests passing

---

## Test Automation Script (Playwright)

```javascript
// To be executed after deployment confirmation

async function runComprehensiveTests() {
  const results = {
    phase1: await testDeploymentVerification(),
    phase2: await testMultiRoleEndpoints(),
    phase3: await testSettingsFunctionality(),
    phase4: await testSecurityValidation(),
    phase5: await testIntegrationWorkflows(),
    phase6: await testPerformanceMonitoring(),
    phase7: await testErrorHandling()
  };

  return {
    totalTests: 31,
    passed: calculatePassed(results),
    failed: calculateFailed(results),
    passRate: calculatePassRate(results),
    status: determineOverallStatus(results)
  };
}
```

---

## Reporting Template

After test execution, generate report:

```markdown
# Final Validation Report
Date: [timestamp]
Duration: [actual time]
Pass Rate: [X/31 tests passed]

## Phase Results
- Phase 1 (Deployment): ✅/❌ [X/3]
- Phase 2 (Multi-Role): ✅/❌ [X/7]
- Phase 3 (Settings): ✅/❌ [X/5]
- Phase 4 (Security): ✅/❌ [X/5]
- Phase 5 (Integration): ✅/❌ [X/5]
- Phase 6 (Performance): ✅/❌ [X/3]
- Phase 7 (Error Handling): ✅/❌ [X/3]

## Critical Issues
[List any test failures or blocking issues]

## Performance Metrics
[Response times, memory usage, database performance]

## Recommendations
[Next steps, known limitations, improvements needed]

## Overall Status
✅ PRODUCTION READY / ⚠️ NEEDS ATTENTION / ❌ DEPLOYMENT FAILED
```

---

**Test Plan Status**: READY FOR EXECUTION
**Awaiting**: Manual Render deployment completion
**Next Action**: Run comprehensive test suite immediately after deployment

*Plan Created: 2025-11-08 10:10 UTC*
*Prepared By: AI Lead Project Manager (Claude Code)*
