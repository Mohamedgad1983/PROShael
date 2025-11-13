#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0ZWQ0YmMyLWI2MWUtNDljZS05MGM0LTM4NmIxMzFkMDU0ZSIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTUwMDAwMDAxIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc2Mjk0MTQxNCwiZXhwIjoxNzYzNTQ2MjE0fQ.H4K4A99cdNvK8eZxuPtyAmoAYHYJE1fXfU8g_aPvvEs"

echo ""
echo "=========================================================="
echo "FEATURE 2 BACKEND TESTING - Profile Info Editing"
echo "=========================================================="
echo ""

echo "TEST 1: Empty Update (No Data Provided)"
echo "-------------------------------------------"
curl -s -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
echo -e "\n"

echo "TEST 2: Invalid Name (Too Short - 2 chars)"
echo "-------------------------------------------"
curl -s -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"AB"}'
echo -e "\n"

echo "TEST 3: Invalid Email Format"
echo "-------------------------------------------"
curl -s -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'
echo -e "\n"

echo "TEST 4: Invalid Phone Format"
echo "-------------------------------------------"
curl -s -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"123456"}'
echo -e "\n"

echo "TEST 5: Valid Update - Name Only"
echo "-------------------------------------------"
curl -s -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test Updated Name"}'
echo -e "\n"

echo "TEST 6: Valid Phone Format"
echo "-------------------------------------------"
curl -s -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0512345678"}'
echo -e "\n"

echo "=========================================================="
echo "TESTING COMPLETE"
echo "=========================================================="
