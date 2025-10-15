#!/bin/bash

# Test script for newly implemented endpoints
# Date: 2025-01-12
# Purpose: Verify Day 1 implementations

BASE_URL="https://proshael.onrender.com"
# BASE_URL="http://localhost:5001"  # Uncomment for local testing

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Day 1 Implemented Endpoints"
echo "======================================"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Backend Health Check${NC}"
curl -s "${BASE_URL}/api/health" | jq .
echo ""

# Test 2: Get Crisis Alerts (requires auth - will return 401 if not authenticated)
echo -e "${YELLOW}Test 2: GET /api/crisis (Crisis Alerts)${NC}"
curl -s "${BASE_URL}/api/crisis" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" | jq .
echo ""

# Test 3: Get Emergency Contacts (requires auth)
echo -e "${YELLOW}Test 3: GET /api/crisis/contacts (Emergency Contacts)${NC}"
curl -s "${BASE_URL}/api/crisis/contacts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" | jq .
echo ""

# Test 4: Get Event Attendees (requires auth)
echo -e "${YELLOW}Test 4: GET /api/occasions/:id/attendees (Event Attendees)${NC}"
EVENT_ID=1  # Replace with actual event ID
curl -s "${BASE_URL}/api/occasions/${EVENT_ID}/attendees" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" | jq .
echo ""

# Test 5: Mark Member Safe (requires auth and crisis_id)
echo -e "${YELLOW}Test 5: POST /api/crisis/safe (Mark Member Safe)${NC}"
echo "Skipping - requires active crisis and valid JWT token"
# curl -X POST "${BASE_URL}/api/crisis/safe" \
#   -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
#   -H "Content-Type: application/json" \
#   -d '{"crisis_id": 1}' | jq .
echo ""

# Test 6: Verify RSVP Endpoint Still Works
echo -e "${YELLOW}Test 6: PUT /api/occasions/:id/rsvp (RSVP - Verified)${NC}"
echo "Skipping - requires event ID and valid JWT token"
# curl -X PUT "${BASE_URL}/api/occasions/${EVENT_ID}/rsvp" \
#   -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
#   -H "Content-Type: application/json" \
#   -d '{"member_id": 123, "status": "confirmed"}' | jq .
echo ""

echo -e "${GREEN}✅ Test script complete!${NC}"
echo ""
echo "📝 Notes:"
echo "- Endpoints requiring authentication will return 401 without valid JWT"
echo "- Crisis endpoints gracefully return empty state if tables don't exist"
echo "- Replace YOUR_JWT_TOKEN_HERE with actual token from login"
echo "- Replace EVENT_ID with actual event ID from database"
echo ""
echo "🔐 To get a JWT token:"
echo "1. Login via mobile-login endpoint"
echo "2. Verify OTP (code: 123456 in mock mode)"
echo "3. Copy token from response"
echo ""
echo "Example login:"
echo 'curl -X POST "${BASE_URL}/api/auth/mobile-login" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"phone": "+966501234567"}'"'"' | jq .'
