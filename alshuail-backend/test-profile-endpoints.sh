#!/bin/bash
# Test script for User Profile API endpoints
# Usage: ./test-profile-endpoints.sh

echo "========================================="
echo "PROFILE API ENDPOINT TESTS"
echo "========================================="
echo ""

# Configuration
API_BASE="http://localhost:5001"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0ZWQ0YmMyLWI2MWUtNDljZS05MGM0LTM4NmIxMzFkMDU0ZSIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTUwMDAwMDAxIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc2Mjg1ODA4OSwiZXhwIjoxNzYzNDYyODg5fQ.4hLM851ln1ZkP3qkuvqUCz-m_jI4yOJA94Z9_zDj6Ao"

echo "Testing with API Base: $API_BASE"
echo ""

# Test 1: GET /api/user/profile
echo "TEST 1: GET /api/user/profile"
echo "-------------------------------------"
curl -s -X GET "$API_BASE/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool || echo "FAILED"
echo ""
echo ""

# Test 2: POST /api/user/profile/avatar (without file - should fail)
echo "TEST 2: POST /api/user/profile/avatar (no file - should fail with 400)"
echo "-------------------------------------"
curl -s -X POST "$API_BASE/api/user/profile/avatar" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool || echo "FAILED"
echo ""
echo ""

# Test 3: POST /api/user/profile/avatar (with test image)
# Note: You'll need to create a test image file or skip this test
if [ -f "test-avatar.jpg" ]; then
  echo "TEST 3: POST /api/user/profile/avatar (with file)"
  echo "-------------------------------------"
  curl -s -X POST "$API_BASE/api/user/profile/avatar" \
    -H "Authorization: Bearer $TOKEN" \
    -F "avatar=@test-avatar.jpg" | python -m json.tool || echo "FAILED"
  echo ""
  echo ""
else
  echo "TEST 3: SKIPPED (test-avatar.jpg not found)"
  echo "Create a test image: convert -size 200x200 xc:blue test-avatar.jpg"
  echo ""
fi

# Test 4: DELETE /api/user/profile/avatar
echo "TEST 4: DELETE /api/user/profile/avatar"
echo "-------------------------------------"
echo "⚠️  CAUTION: This will delete the current avatar"
echo "Skipping by default. Uncomment to test."
# curl -s -X DELETE "$API_BASE/api/user/profile/avatar" \
#   -H "Authorization: Bearer $TOKEN" | python -m json.tool || echo "FAILED"
echo "SKIPPED (uncomment to test)"
echo ""
echo ""

# Test 5: PUT /api/user/profile (update profile info)
echo "TEST 5: PUT /api/user/profile (update profile)"
echo "-------------------------------------"
curl -s -X PUT "$API_BASE/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User Updated"}' | python -m json.tool || echo "FAILED"
echo ""
echo ""

echo "========================================="
echo "TESTS COMPLETE"
echo "========================================="
