#!/bin/bash

# ========================================
# SUBSCRIPTION API AUTOMATED TEST SCRIPT
# ========================================
# Usage: ./test_subscriptions.sh
# Make executable: chmod +x test_subscriptions.sh
# ========================================

# Configuration
BASE_URL="http://localhost:3001/api/subscriptions"
PROD_URL="https://proshael.onrender.com/api/subscriptions"

# Use production URL by default, change to BASE_URL for local testing
API_URL="$PROD_URL"

# TODO: Update this token with your admin JWT token
# Get token by logging in: POST /api/auth/login with admin credentials
TOKEN="your_jwt_token_here"

# Test member ID (update with actual test member ID)
TEST_MEMBER_ID="147b3021-a6a3-4cd7-af2c-67ad11734aa0"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_test() {
    echo -e "\n${YELLOW}Test $1: $2${NC}"
    echo "URL: $3"
}

print_success() {
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    ((FAILED++))
}

print_summary() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}TEST SUMMARY${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "Total Tests: $((PASSED + FAILED))"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"

    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
        exit 1
    fi
}

# Check if TOKEN is set
if [ "$TOKEN" == "your_jwt_token_here" ]; then
    echo -e "${RED}ERROR: Please update the TOKEN variable in this script${NC}"
    echo "Get a token by logging in as admin first"
    exit 1
fi

# Start tests
print_header "SUBSCRIPTION API TESTS"
echo "API URL: $API_URL"
echo "Starting tests at: $(date)"

# ========================================
# Test 1: Get Subscription Plans (Public)
# ========================================
print_test "1" "Get Subscription Plans (Public)" "$API_URL/plans"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/plans")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "plans"; then
        print_success
        echo "Response: $BODY" | head -c 200
        echo "..."
    else
        print_fail "Response missing 'plans' field"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
fi

# ========================================
# Test 2: Get Member Subscription (Authenticated)
# ========================================
print_test "2" "Get Member Subscription" "$API_URL/member/subscription"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/member/subscription" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "subscription"; then
        print_success
        echo "Response: $BODY" | head -c 200
        echo "..."
    else
        print_fail "Response missing 'subscription' field"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
fi

# ========================================
# Test 3: Get Payment History (Authenticated)
# ========================================
print_test "3" "Get Payment History" "$API_URL/member/subscription/payments?page=1&limit=10"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/member/subscription/payments?page=1&limit=10" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "payments"; then
        print_success
        echo "Response: $BODY" | head -c 200
        echo "..."
    else
        print_fail "Response missing 'payments' field"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
fi

# ========================================
# Test 4: Get All Subscriptions (Admin)
# ========================================
print_test "4" "Get All Subscriptions (Admin)" "$API_URL/admin/subscriptions?page=1&limit=5"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/subscriptions?page=1&limit=5" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "subscriptions"; then
        print_success
        echo "Response: $BODY" | head -c 200
        echo "..."
    else
        print_fail "Response missing 'subscriptions' field"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
fi

# ========================================
# Test 5: Get Dashboard Stats (Admin)
# ========================================
print_test "5" "Get Dashboard Statistics (Admin)" "$API_URL/admin/subscriptions/stats"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/subscriptions/stats" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "total_members" && echo "$BODY" | grep -q "monthly_revenue"; then
        print_success
        echo "Stats: $BODY"
    else
        print_fail "Response missing expected stats fields"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
fi

# ========================================
# Test 6: Get Overdue Members (Admin)
# ========================================
print_test "6" "Get Overdue Members (Admin)" "$API_URL/admin/subscriptions/overdue"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/subscriptions/overdue" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "overdue_members"; then
        print_success
        echo "Response: $BODY" | head -c 200
        echo "..."
    else
        print_fail "Response missing 'overdue_members' field"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
fi

# ========================================
# Test 7: Record Payment (Admin)
# ========================================
print_test "7" "Record Payment (Admin)" "$API_URL/admin/subscriptions/payment"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/admin/subscriptions/payment" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"member_id\": \"$TEST_MEMBER_ID\",
        \"amount\": 150,
        \"months\": 3,
        \"payment_method\": \"cash\",
        \"receipt_number\": \"TEST-$(date +%s)\",
        \"notes\": \"دفعة اختبار - 3 أشهر\"
    }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "new_balance" && echo "$BODY" | grep -q "months_ahead"; then
        print_success
        echo "Payment recorded: $BODY"
    else
        print_fail "Response missing expected payment fields"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
    echo "Response: $BODY"
fi

# ========================================
# Test 8: Send Payment Reminder (Admin)
# ========================================
print_test "8" "Send Payment Reminder (Admin)" "$API_URL/admin/subscriptions/reminder"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/admin/subscriptions/reminder" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"member_ids\": [\"$TEST_MEMBER_ID\"]
    }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "sent"; then
        print_success
        echo "Reminder sent: $BODY"
    else
        print_fail "Response missing 'sent' field"
    fi
else
    print_fail "HTTP $HTTP_CODE - Expected 200"
fi

# ========================================
# Print Summary
# ========================================
print_summary
