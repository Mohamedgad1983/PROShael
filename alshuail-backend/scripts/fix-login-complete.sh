#!/bin/bash

###############################################################################
# Complete Login Fix Script - From A to Z
# This script will:
# 1. Check database connection
# 2. Check if users table exists
# 3. Create admin user if missing
# 4. Verify JWT_SECRET is set
# 5. Restart backend service
# 6. Test login endpoint
###############################################################################

echo "========================================="
echo "🔧 Complete Login Fix - Starting..."
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to backend directory
cd /var/www/PROShael/alshuail-backend || exit 1

echo "📂 Working directory: $(pwd)"
echo ""

# Step 1: Check if .env file exists
echo "========================================="
echo "Step 1: Checking .env file..."
echo "========================================="
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi
echo ""

# Step 2: Check database connection
echo "========================================="
echo "Step 2: Testing database connection..."
echo "========================================="
node scripts/test-database-connection.js
DB_EXIT_CODE=$?

if [ $DB_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Database connection failed!${NC}"
    echo "Please check your database credentials in .env file"
    exit 1
fi
echo ""

# Step 3: Create/Update admin user
echo "========================================="
echo "Step 3: Creating/Updating admin user..."
echo "========================================="
node scripts/create-admin-user.js
ADMIN_EXIT_CODE=$?

if [ $ADMIN_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Failed to create admin user!${NC}"
    exit 1
fi
echo ""

# Step 4: Check JWT_SECRET
echo "========================================="
echo "Step 4: Checking JWT_SECRET..."
echo "========================================="
if grep -q "JWT_SECRET=" .env; then
    JWT_VALUE=$(grep "JWT_SECRET=" .env | cut -d '=' -f2)
    if [ -n "$JWT_VALUE" ]; then
        echo -e "${GREEN}✅ JWT_SECRET is set${NC}"
    else
        echo -e "${RED}❌ JWT_SECRET is empty!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ JWT_SECRET not found in .env!${NC}"
    exit 1
fi
echo ""

# Step 5: Restart backend service
echo "========================================="
echo "Step 5: Restarting backend service..."
echo "========================================="
systemctl restart alshuail-backend.service
sleep 5

# Check service status
if systemctl is-active --quiet alshuail-backend.service; then
    echo -e "${GREEN}✅ Backend service is running${NC}"
else
    echo -e "${RED}❌ Backend service failed to start!${NC}"
    echo "Checking logs..."
    journalctl -u alshuail-backend.service -n 20 --no-pager
    exit 1
fi
echo ""

# Step 6: Wait for server to be ready
echo "========================================="
echo "Step 6: Waiting for server to be ready..."
echo "========================================="
for i in {1..10}; do
    if curl -s http://localhost:5001/api/health > /dev/null; then
        echo -e "${GREEN}✅ Server is ready!${NC}"
        break
    fi
    echo "Waiting... ($i/10)"
    sleep 2
done
echo ""

# Step 7: Test login endpoint
echo "========================================="
echo "Step 7: Testing login endpoint..."
echo "========================================="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alshuail.com","password":"Admin@123456"}')

echo "Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🎉 SUCCESS! Login is working!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "✅ You can now login with:"
    echo "   Email: admin@alshuail.com"
    echo "   Password: Admin@123456"
    echo "   URL: https://alshailfund.com/admin/login"
    echo ""
elif echo "$LOGIN_RESPONSE" | grep -q '"success":false'; then
    echo ""
    echo -e "${YELLOW}⚠️  Login endpoint responded but authentication failed${NC}"
    echo "This might be a password mismatch or user not found"
    echo "Try running: node scripts/create-admin-user.js"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Login test failed!${NC}"
    echo "Checking server logs..."
    journalctl -u alshuail-backend.service -n 30 --no-pager
    exit 1
fi

echo "========================================="
echo "✅ Fix completed!"
echo "========================================="
