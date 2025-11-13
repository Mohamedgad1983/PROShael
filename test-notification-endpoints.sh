#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0ZWQ0YmMyLWI2MWUtNDljZS05MGM0LTM4NmIxMzFkMDU0ZSIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTUwMDAwMDAxIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc2Mjg1ODA4OSwiZXhwIjoxNzYzNDYyODg5fQ.4hLM851ln1ZkP3qkuvqUCz-m_jI4yOJA94Z9_zDj6Ao"

echo "======================================"
echo "Testing Backend Notification Endpoints"
echo "======================================"
echo ""

echo "TEST 1: GET /api/user/profile/notifications"
echo "-------------------------------------------"
curl -s "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
echo ""
echo ""

echo "TEST 2: PUT /api/user/profile/notifications"
echo "-------------------------------------------"
echo "Toggling email_notifications to false..."
curl -s -X PUT "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_notifications": false}' | python -m json.tool
echo ""
echo ""

echo "TEST 3: GET again to verify update"
echo "-------------------------------------------"
curl -s "https://proshael.onrender.com/api/user/profile/notifications" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
echo ""
echo ""

echo "======================================"
echo "Backend Endpoint Tests Complete!"
echo "======================================"
