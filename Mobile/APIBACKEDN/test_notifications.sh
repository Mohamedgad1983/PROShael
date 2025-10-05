#!/bin/bash

# ===============================================
# NOTIFICATION API - TESTING SCRIPT
# Quick test all notification endpoints
# ===============================================

# Configuration
API_URL="https://proshael.onrender.com"
# Replace with your actual JWT token from login
TOKEN="YOUR_JWT_TOKEN_HERE"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "==============================================="
echo "🧪 NOTIFICATION API TEST SUITE"
echo "==============================================="
echo ""

# ===============================================
# TEST 1: Get All Notifications
# ===============================================
echo "📋 TEST 1: Get All Notifications"
echo "Endpoint: GET /api/member/notifications"
echo ""

response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/member/notifications")

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $http_code"
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $http_code"
  echo "Response: $body"
fi

echo ""
echo "-----------------------------------------------"
echo ""

# ===============================================
# TEST 2: Get Notification Summary
# ===============================================
echo "📊 TEST 2: Get Notification Summary"
echo "Endpoint: GET /api/member/notifications/summary"
echo ""

response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/member/notifications/summary")

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $http_code"
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $http_code"
  echo "Response: $body"
fi

echo ""
echo "-----------------------------------------------"
echo ""

# ===============================================
# TEST 3: Mark Notification as Read
# ===============================================
echo "✓ TEST 3: Mark Notification as Read"
echo "Endpoint: PUT /api/member/notifications/:id/read"
echo ""

# Get first notification ID
notif_id=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/member/notifications" | \
  jq -r '.data.notifications.news[0].id // .data.notifications.initiatives[0].id // .data.notifications.diyas[0].id // empty' 2>/dev/null)

if [ -z "$notif_id" ] || [ "$notif_id" == "null" ]; then
  echo -e "${YELLOW}⚠️ SKIP${NC} - No notifications found to mark as read"
else
  echo "Marking notification as read: $notif_id"
  
  response=$(curl -s -w "\n%{http_code}" \
    -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/member/notifications/$notif_id/read")
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $http_code"
    echo "Response: $body"
  else
    echo -e "${RED}❌ FAIL${NC} - Status: $http_code"
    echo "Response: $body"
  fi
fi

echo ""
echo "-----------------------------------------------"
echo ""

# ===============================================
# TEST 4: Mark All as Read
# ===============================================
echo "✓✓ TEST 4: Mark All Notifications as Read"
echo "Endpoint: PUT /api/member/notifications/read-all"
echo ""

response=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/member/notifications/read-all")

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $http_code"
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $http_code"
  echo "Response: $body"
fi

echo ""
echo "-----------------------------------------------"
echo ""

# ===============================================
# TEST 5: Verify All Marked as Read
# ===============================================
echo "🔍 TEST 5: Verify All Marked as Read"
echo "Endpoint: GET /api/member/notifications"
echo ""

response=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/member/notifications")

unread_count=$(echo "$response" | jq -r '.data.unreadCount // -1' 2>/dev/null)

if [ "$unread_count" == "0" ]; then
  echo -e "${GREEN}✅ PASS${NC} - All notifications marked as read (unreadCount: $unread_count)"
elif [ "$unread_count" == "-1" ]; then
  echo -e "${RED}❌ FAIL${NC} - Could not parse response"
else
  echo -e "${YELLOW}⚠️ WARNING${NC} - Still have unread notifications: $unread_count"
fi

echo ""
echo "==============================================="
echo "📈 TEST SUMMARY"
echo "==============================================="
echo ""
echo "Run this script with your JWT token to test all endpoints"
echo ""
echo "To get your token:"
echo "1. Login via mobile app or Postman"
echo "2. Copy the JWT token from response"
echo "3. Replace TOKEN variable at top of this script"
echo ""
echo "Usage:"
echo "  chmod +x test_notifications.sh"
echo "  ./test_notifications.sh"
echo ""
echo "==============================================="
