#!/bin/bash
# ================================================
# Test Push Notification - Al-Shuail Family Fund
# ================================================

echo "🔔 Testing Push Notification..."
echo ""

# API Base URL
API_URL="https://api.alshailfund.com/api"

# Test 1: Check push notification status
echo "📋 Step 1: Checking push notification service..."
curl -s "$API_URL/health" | grep -o '"database":[^,]*'
echo ""

# Test 2: Send test notification (requires auth token)
# Get the token from login first

echo ""
echo "📱 To test push notifications:"
echo "1. Open https://app.alshailfund.com"
echo "2. Login with your phone number"
echo "3. When prompted, click 'تفعيل' to enable notifications"
echo "4. You should see a test notification"
echo ""
echo "🔧 To send a test notification via API:"
echo ""
echo 'curl -X POST "https://api.alshailfund.com/api/notifications/push/send" \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN" \'
echo '  -d '"'"'{"memberId": "MEMBER_ID", "title": "اختبار 🔔", "body": "هذا اختبار للإشعارات"}'"'"
echo ""
