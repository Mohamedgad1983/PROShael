#!/usr/bin/bash

# =============================================================================
# APPEARANCE SETTINGS ENDPOINTS - COMPREHENSIVE TEST SUITE
# Feature 5.2 Phase 2 - ULTRATHINK Testing
# =============================================================================

API="https://proshael.onrender.com"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0ZWQ0YmMyLWI2MWUtNDljZS05MGM0LTM4NmIxMzFkMDU0ZSIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTUwMDAwMDAxIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc2Mjg1ODA4OSwiZXhwIjoxNzYzNDYyODg5fQ.4hLM851ln1ZkP3qkuvqUCz-m_jI4yOJA94Z9_zDj6Ao"

echo "═══════════════════════════════════════════════════════════"
echo "APPEARANCE SETTINGS ENDPOINTS - COMPREHENSIVE TEST SUITE"
echo "ULTRATHINK MODE: 100% Coverage Required"
echo "═══════════════════════════════════════════════════════════"
echo ""

# =============================================================================
# SECTION 1: GET ENDPOINT TESTS
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 1.1: GET /api/user/profile/appearance-settings"
echo "Expected: 200 OK with default settings"
echo "─────────────────────────────────────────────────────────"
curl -s -X GET "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 1.2: GET without authentication token"
echo "Expected: 401 Unauthorized"
echo "─────────────────────────────────────────────────────────"
curl -s -X GET "$API/api/user/profile/appearance-settings" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 1.3: GET with invalid token"
echo "Expected: 401 Unauthorized"
echo "─────────────────────────────────────────────────────────"
curl -s -X GET "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

# =============================================================================
# SECTION 2: PUT ENDPOINT TESTS - VALID DATA
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.1: PUT - Update theme_mode to dark"
echo "Expected: 200 OK with updated settings"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme_mode": "dark"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.2: PUT - Update primary_color"
echo "Expected: 200 OK with new color"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"primary_color": "#388e3c"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.3: PUT - Update font_size to large"
echo "Expected: 200 OK with font_size changed"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"font_size": "large"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.4: PUT - Enable compact_mode"
echo "Expected: 200 OK with compact_mode: true"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"compact_mode": true}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.5: PUT - Disable animations"
echo "Expected: 200 OK with animations_enabled: false"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"animations_enabled": false}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 2.6: PUT - Multiple fields at once"
echo "Expected: 200 OK with all fields updated"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme_mode": "light",
    "primary_color": "#1976d2",
    "font_size": "medium",
    "compact_mode": false,
    "animations_enabled": true
  }' | python -m json.tool
echo ""
echo ""

# =============================================================================
# SECTION 3: VALIDATION TESTS - INVALID DATA
# =============================================================================

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.1: PUT with invalid theme_mode"
echo "Expected: 400 Bad Request - invalid theme"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme_mode": "purple"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.2: PUT with invalid primary_color (not hex)"
echo "Expected: 400 Bad Request - invalid color format"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"primary_color": "blue"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.3: PUT with invalid primary_color (missing #)"
echo "Expected: 400 Bad Request - invalid hex format"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"primary_color": "1976d2"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.4: PUT with invalid font_size"
echo "Expected: 400 Bad Request - invalid font size"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"font_size": "huge"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.5: PUT with invalid compact_mode type (string)"
echo "Expected: 400 Bad Request - must be boolean"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"compact_mode": "true"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.6: PUT with invalid animations_enabled type"
echo "Expected: 400 Bad Request - must be boolean"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"animations_enabled": 1}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 3.7: PUT with empty body"
echo "Expected: 400 Bad Request - no data to update"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
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
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Content-Type: application/json" \
  -d '{"theme_mode": "dark"}' | python -m json.tool
echo ""
echo ""

echo "─────────────────────────────────────────────────────────"
echo "TEST 4.2: PUT with invalid token"
echo "Expected: 401 Unauthorized"
echo "─────────────────────────────────────────────────────────"
curl -s -X PUT "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{"theme_mode": "dark"}' | python -m json.tool
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
curl -s -X DELETE "$API/api/user/profile/appearance-settings/reset-rate-limit" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
echo ""

# Make 11 rapid requests
for i in {1..11}; do
  echo "Request $i:"
  if [ $((i % 2)) -eq 0 ]; then
    MODE="dark"
  else
    MODE="light"
  fi

  curl -s -X PUT "$API/api/user/profile/appearance-settings" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"theme_mode\": \"$MODE\"}" | python -m json.tool
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
curl -s -X GET "$API/api/user/profile/appearance-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "APPEARANCE SETTINGS TESTS COMPLETE"
echo "═══════════════════════════════════════════════════════════"
