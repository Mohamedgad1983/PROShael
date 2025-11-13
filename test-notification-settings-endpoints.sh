#!/usr/bin/bash

# =============================================================================
# NOTIFICATION SETTINGS ENDPOINTS - COMPREHENSIVE TEST SUITE
# Feature 5.1 Phase 1 - ULTRATHINK Testing
# =============================================================================

API="https://proshael.onrender.com"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0ZWQ0YmMyLWI2MWUtNDljZS05MGM0LTM4NmIxMzFkMDU0ZSIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTUwMDAwMDAxIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc2Mjg1ODA4OSwiZXhwIjoxNzYzNDYyODg5fQ.4hLM851ln1ZkP3qkuvqUCz-m_jI4yOJA94Z9_zDj6Ao"

echo "═══════════════════════════════════════════════════════════"
echo "NOTIFICATION SETTINGS ENDPOINTS - COMPREHENSIVE TEST SUITE"
echo "ULTRATHINK MODE: 100% Coverage Required"
echo "═══════════════════════════════════════════════════════════"
echo ""

# =============================================================================
# SECTION 1: GET ENDPOINT TESTS
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 1.1: GET /api/user/profile/notification-settings"
echo "Expected: 200 OK with default settings"
echo "─────────────────────────────────────────────────────────"
curl -s -X GET "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 1.2: GET without authentication token"
echo "Expected: 401 Unauthorized"
echo "─────────────────────────────────────────────────────────"
curl -s -X GET "$API/api/user/profile/notification-settings" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 1.3: GET with invalid token"
echo "Expected: 401 Unauthorized"
echo "─────────────────────────────────────────────────────────"
curl -s -X GET "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

# =============================================================================
# SECTION 2: PUT ENDPOINT TESTS - VALID DATA
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.1: PUT - Update email_enabled to false"
echo "Expected: 200 OK with updated settings"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_enabled": false}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.2: PUT - Update notification types"
echo "Expected: 200 OK with all notification types"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"types": ["system", "security", "members", "finance", "family_tree"]}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.3: PUT - Update frequency to daily"
echo "Expected: 200 OK with frequency changed"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"frequency": "daily"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.4: PUT - Update quiet hours"
echo "Expected: 200 OK with quiet hours updated"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quiet_hours": {"start": "23:00", "end": "07:00"}}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.5: PUT - Multiple fields at once"
echo "Expected: 200 OK with all fields updated"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_enabled": true,
    "sms_enabled": true,
    "push_enabled": true,
    "types": ["system", "security"],
    "frequency": "instant",
    "quiet_hours": {"start": "22:00", "end": "08:00"}
  }' | python -m json.tool
echo ""
echo ""

# =============================================================================
# SECTION 3: VALIDATION TESTS - INVALID DATA
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.1: PUT with invalid email_enabled type (string)"
echo "Expected: 400 Bad Request - must be boolean"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_enabled": "true"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.2: PUT with empty types array"
echo "Expected: 400 Bad Request - at least one type required"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"types": []}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.3: PUT with invalid notification type"
echo "Expected: 400 Bad Request - invalid type"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"types": ["system", "invalid_type"]}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.4: PUT with invalid frequency"
echo "Expected: 400 Bad Request - invalid frequency"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"frequency": "hourly"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.5: PUT with invalid quiet hours format"
echo "Expected: 400 Bad Request - invalid time format"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quiet_hours": {"start": "25:00", "end": "08:00"}}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.6: PUT with missing quiet hours end time"
echo "Expected: 400 Bad Request - end time required"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quiet_hours": {"start": "22:00"}}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.7: PUT with invalid field name"
echo "Expected: 400 Bad Request - invalid field"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid_field": true}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.8: PUT with empty body"
echo "Expected: 400 Bad Request - no data to update"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python -m json.tool
echo ""
echo ""

# =============================================================================
# SECTION 4: AUTHORIZATION TESTS
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 4.1: PUT without authentication token"
echo "Expected: 401 Unauthorized"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Content-Type: application/json" \
  -d '{"email_enabled": false}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 4.2: PUT with invalid token"
echo "Expected: 401 Unauthorized"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{"email_enabled": false}' | python -m json.tool
echo ""
echo ""

# =============================================================================
# SECTION 5: RATE LIMITING TESTS
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 5.1: Rate limit - Rapid updates (11 requests)"
echo "Expected: First 10 succeed, 11th returns 429"
echo "─────────────────────────────────────────────────────────"

# Reset rate limit first
curl -s -X DELETE "$API/api/user/profile/notification-settings/reset-rate-limit" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
echo ""

# Make 11 rapid requests
for i in {1..11}; do
  echo "Request $i:"
  if [ $((i % 2)) -eq 0 ]; then
    VALUE="true"
  else
    VALUE="false"
  fi

  curl -s -X PUT "$API/api/user/profile/notification-settings" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"email_enabled\": $VALUE}" | python -m json.tool
  echo ""
done
echo ""

# =============================================================================
# SECTION 6: FINAL VERIFICATION
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 6.1: Final GET - Verify persistence"
echo "Expected: 200 OK with latest settings"
echo "─────────────────────────────────────────────────────────"
curl -s -X GET "$API/api/user/profile/notification-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "NOTIFICATION SETTINGS TESTS COMPLETE"
echo "═══════════════════════════════════════════════════════════"
