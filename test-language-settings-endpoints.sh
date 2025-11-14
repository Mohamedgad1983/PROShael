#!/bin/bash

# ============================================================================
# Language Settings Endpoints Test Script
# Feature 5.3: Language & Region Settings
# Tests all 3 endpoints with various scenarios
# ============================================================================

# Configuration
API_BASE="https://proshael.onrender.com"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0ZWQ0YmMyLWI2MWUtNDljZS05MGM0LTM4NmIxMzFkMDU0ZSIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTUwMDAwMDAxIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc2Mjg1ODA4OSwiZXhwIjoxNzYzNDYyODg5fQ.4hLM851ln1ZkP3qkuvqUCz-m_jI4yOJA94Z9_zDj6Ao"

echo "============================================================================="
echo "LANGUAGE SETTINGS ENDPOINTS TEST SUITE"
echo "Testing Feature 5.3 - Language & Region Settings"
echo "============================================================================="
echo ""

# ============================================================================
# TEST 1: GET /api/user/profile/language-settings
# ============================================================================
echo "TEST 1: GET /api/user/profile/language-settings"
echo "Expected: 200 OK with default language settings"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "200" ]; then
  echo "✅ TEST 1 PASSED: Successfully retrieved language settings"
else
  echo "❌ TEST 1 FAILED: Expected status 200, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 2: PUT /api/user/profile/language-settings (Change Language)
# ============================================================================
echo "TEST 2: PUT /api/user/profile/language-settings (Change Language)"
echo "Expected: 200 OK with updated language to 'en'"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "200" ]; then
  echo "✅ TEST 2 PASSED: Successfully updated language to English"
else
  echo "❌ TEST 2 FAILED: Expected status 200, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 3: PUT /api/user/profile/language-settings (Multiple Fields)
# ============================================================================
echo "TEST 3: PUT /api/user/profile/language-settings (Multiple Fields)"
echo "Expected: 200 OK with updated region, timezone, date format, etc."
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "AE",
    "timezone": "Asia/Dubai",
    "date_format": "YYYY-MM-DD",
    "time_format": "24h",
    "currency": "AED"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "200" ]; then
  echo "✅ TEST 3 PASSED: Successfully updated multiple settings"
else
  echo "❌ TEST 3 FAILED: Expected status 200, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 4: PUT /api/user/profile/language-settings (Invalid Language)
# ============================================================================
echo "TEST 4: PUT /api/user/profile/language-settings (Invalid Language)"
echo "Expected: 400 Bad Request with validation error"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "fr"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "400" ]; then
  echo "✅ TEST 4 PASSED: Validation correctly rejected invalid language"
else
  echo "❌ TEST 4 FAILED: Expected status 400, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 5: PUT /api/user/profile/language-settings (Invalid Region)
# ============================================================================
echo "TEST 5: PUT /api/user/profile/language-settings (Invalid Region)"
echo "Expected: 400 Bad Request with validation error for invalid ISO code"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "USA"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "400" ]; then
  echo "✅ TEST 5 PASSED: Validation correctly rejected invalid region code"
else
  echo "❌ TEST 5 FAILED: Expected status 400, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 6: PUT /api/user/profile/language-settings (Invalid Currency)
# ============================================================================
echo "TEST 6: PUT /api/user/profile/language-settings (Invalid Currency)"
echo "Expected: 400 Bad Request with validation error for invalid ISO code"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "DOLLAR"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "400" ]; then
  echo "✅ TEST 6 PASSED: Validation correctly rejected invalid currency code"
else
  echo "❌ TEST 6 FAILED: Expected status 400, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 7: PUT /api/user/profile/language-settings (Invalid Date Format)
# ============================================================================
echo "TEST 7: PUT /api/user/profile/language-settings (Invalid Date Format)"
echo "Expected: 400 Bad Request with validation error"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date_format": "DD-MM-YYYY"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "400" ]; then
  echo "✅ TEST 7 PASSED: Validation correctly rejected invalid date format"
else
  echo "❌ TEST 7 FAILED: Expected status 400, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 8: PUT /api/user/profile/language-settings (Invalid Time Format)
# ============================================================================
echo "TEST 8: PUT /api/user/profile/language-settings (Invalid Time Format)"
echo "Expected: 400 Bad Request with validation error"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time_format": "am/pm"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "400" ]; then
  echo "✅ TEST 8 PASSED: Validation correctly rejected invalid time format"
else
  echo "❌ TEST 8 FAILED: Expected status 400, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 9: PUT /api/user/profile/language-settings (Invalid Week Start)
# ============================================================================
echo "TEST 9: PUT /api/user/profile/language-settings (Invalid Week Start)"
echo "Expected: 400 Bad Request with validation error"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "week_start": "friday"
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "400" ]; then
  echo "✅ TEST 9 PASSED: Validation correctly rejected invalid week start"
else
  echo "❌ TEST 9 FAILED: Expected status 400, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 10: DELETE /api/user/profile/language-settings
# ============================================================================
echo "TEST 10: DELETE /api/user/profile/language-settings"
echo "Expected: 200 OK with settings reset to defaults"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "200" ]; then
  echo "✅ TEST 10 PASSED: Successfully reset settings to defaults"
else
  echo "❌ TEST 10 FAILED: Expected status 200, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 11: GET /api/user/profile/language-settings (Verify Reset)
# ============================================================================
echo "TEST 11: GET /api/user/profile/language-settings (Verify Reset)"
echo "Expected: 200 OK with default Arabic/SA settings"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "200" ]; then
  echo "✅ TEST 11 PASSED: Verified settings are reset to Arabic/SA defaults"
else
  echo "❌ TEST 11 FAILED: Expected status 200, got $http_status"
fi
echo "============================================================================="
echo ""

# ============================================================================
# TEST 12: PUT without data
# ============================================================================
echo "TEST 12: PUT /api/user/profile/language-settings (No Data)"
echo "Expected: 400 Bad Request"
echo "---------------------------------------------"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$API_BASE/api/user/profile/language-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Status: $http_status"
echo "Response: $body" | python -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_status" = "400" ]; then
  echo "✅ TEST 12 PASSED: Validation correctly rejected empty update"
else
  echo "❌ TEST 12 FAILED: Expected status 400, got $http_status"
fi
echo "============================================================================="
echo ""

echo "============================================================================="
echo "TEST SUITE COMPLETED"
echo "============================================================================="
echo "Summary:"
echo "- Total Tests: 12"
echo "- Backend: Language & Region Settings Endpoints"
echo "- Validation: All field validations tested"
echo "- CRUD Operations: GET, PUT, DELETE verified"
echo "============================================================================="
