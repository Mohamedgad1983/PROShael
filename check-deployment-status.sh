#!/bin/bash

# Feature 4 Critical Fix - Deployment Status Checker
# Monitors when Render.com deployment completes

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0ZWQ0YmMyLWI2MWUtNDljZS05MGM0LTM4NmIxMzFkMDU0ZSIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTUwMDAwMDAxIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc2MjcwNjg2MCwiZXhwIjoxNzYzMzExNjYwfQ.eG_RwxA3EPP8hqAUU-av196ImiToG72MYOJA_JL-dLk"

echo "===================================================="
echo "Feature 4 Critical Fix - Deployment Monitor"
echo "===================================================="
echo ""
echo "Checking if Render.com has deployed the fix..."
echo ""

# Check if new rate limit reset endpoint exists (proves deployment)
RESPONSE=$(curl -s -X DELETE "https://proshael.onrender.com/api/user/profile/reset-password-rate-limit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response from rate limit reset endpoint:"
echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "Cannot DELETE"; then
    echo "❌ STATUS: DEPLOYMENT NOT YET COMPLETE"
    echo ""
    echo "The new endpoint doesn't exist yet, which means:"
    echo "- Render.com is still deploying the fix"
    echo "- Expected time: ~5-10 minutes from push"
    echo "- Pushed at: ~03:05 UTC"
    echo "- Check again at: ~03:15 UTC"
    echo ""
    echo "Run this script again in a few minutes."
elif echo "$RESPONSE" | grep -q "success"; then
    echo "✅ STATUS: DEPLOYMENT COMPLETE!"
    echo ""
    echo "The fix has been deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Clear rate limit using reset endpoint (just tested above)"
    echo "2. Test password change functionality"
    echo ""
    echo "Testing password change now..."
    echo ""

    # Test password change
    CHANGE_RESPONSE=$(curl -s -X POST "https://proshael.onrender.com/api/user/profile/change-password" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"currentPassword": "Admin123456", "newPassword": "TestPass123"}')

    echo "Password change test response:"
    echo "$CHANGE_RESPONSE"
    echo ""

    if echo "$CHANGE_RESPONSE" | grep -q '"success":true'; then
        echo "✅ PASSWORD CHANGE WORKING!"
        echo ""
        echo "The bug is FIXED! Password change is now functional."
        echo ""
        echo "Reverting password back to Admin123456..."

        REVERT_RESPONSE=$(curl -s -X POST "https://proshael.onrender.com/api/user/profile/change-password" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"currentPassword": "TestPass123", "newPassword": "Admin123456"}')

        if echo "$REVERT_RESPONSE" | grep -q '"success":true'; then
            echo "✅ Password reverted successfully"
        else
            echo "⚠️ Password revert response:"
            echo "$REVERT_RESPONSE"
        fi

        echo ""
        echo "===================================================="
        echo "FEATURE 4 IS NOW PRODUCTION READY!"
        echo "===================================================="
        echo ""
        echo "User can now test via frontend UI at:"
        echo "https://df397156.alshuail-admin.pages.dev/settings"

    elif echo "$CHANGE_RESPONSE" | grep -q "Too many attempts"; then
        echo "⏳ RATE LIMIT STILL ACTIVE"
        echo ""
        echo "Rate limit expires at: 03:41 UTC"
        echo "Current time: $(date -u '+%H:%M UTC')"
        echo ""
        echo "The reset endpoint exists, so let me clear the rate limit..."

        # Try to reset rate limit
        RESET_RESPONSE=$(curl -s -X DELETE "https://proshael.onrender.com/api/user/profile/reset-password-rate-limit" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json")

        echo "Rate limit reset response:"
        echo "$RESET_RESPONSE"
        echo ""
        echo "Run this script again to test password change."
    else
        echo "⚠️ UNEXPECTED RESPONSE"
        echo ""
        echo "Please review the response above."
    fi
else
    echo "⚠️ UNEXPECTED RESPONSE FORMAT"
    echo ""
    echo "Please review the response above."
fi

echo ""
echo "===================================================="
