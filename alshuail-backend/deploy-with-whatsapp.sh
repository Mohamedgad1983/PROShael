#!/bin/bash
# ════════════════════════════════════════════════════════════════
# Al-Shuail Backend Deployment Script with Ultramsg WhatsApp
# صندوق عائلة شعيل العنزي
# ════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Configuration
VPS_IP="213.199.62.185"
VPS_USER="root"
REMOTE_PATH="/var/www/alshuail-backend"
LOCAL_PATH="D:/PROShael/alshuail-backend"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       🚀 AL-SHUAIL BACKEND DEPLOYMENT                       ║"
echo "║           With Ultramsg WhatsApp Integration                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Step 1: Check local files
echo "📦 Step 1: Checking local files..."
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    exit 1
fi
print_status "Local files OK"

# Step 2: Git commit and push
echo ""
echo "📤 Step 2: Pushing to GitHub..."
git add -A
git commit -m "Deploy: Ultramsg WhatsApp integration $(date +%Y-%m-%d)" || true
git push origin main
print_status "Code pushed to GitHub"

# Step 3: SSH Deploy
echo ""
echo "🔄 Step 3: Deploying to VPS ($VPS_IP)..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    set -e
    
    echo "📂 Navigating to project..."
    cd /var/www/alshuail-backend
    
    echo "📥 Pulling latest code..."
    git pull origin main
    
    echo "📦 Installing dependencies..."
    npm install --production
    
    echo "🔄 Restarting PM2..."
    pm2 restart alshuail-backend || pm2 start server.js --name alshuail-backend
    
    echo "📊 PM2 Status:"
    pm2 status
    
    echo "📋 Recent logs:"
    pm2 logs alshuail-backend --lines 20 --nostream
ENDSSH

print_status "Deployment complete!"

# Step 4: Health check
echo ""
echo "🏥 Step 4: Running health check..."
sleep 5  # Wait for server to start

HEALTH_URL="https://api.alshailfund.com/api/health"
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL" || echo "FAILED")

if [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
    print_status "Server is healthy!"
else
    print_warning "Health check returned unexpected response"
    echo "$HEALTH_RESPONSE"
fi

# Step 5: OTP Status check
echo ""
echo "📱 Step 5: Checking WhatsApp OTP status..."
OTP_URL="https://api.alshailfund.com/api/otp/status"
OTP_RESPONSE=$(curl -s "$OTP_URL" || echo "FAILED")
echo "$OTP_RESPONSE" | jq . 2>/dev/null || echo "$OTP_RESPONSE"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔗 API URL: https://api.alshailfund.com"
echo "📊 Health: https://api.alshailfund.com/api/health"
echo "📱 OTP Status: https://api.alshailfund.com/api/otp/status"
echo ""
echo "⚠️ REMINDER: Configure Ultramsg on VPS:"
echo "   1. SSH to server: ssh root@$VPS_IP"
echo "   2. Edit .env: nano /var/www/alshuail-backend/.env"
echo "   3. Add:"
echo "      ULTRAMSG_INSTANCE_ID=your_id"
echo "      ULTRAMSG_TOKEN=your_token"
echo "   4. Restart: pm2 restart alshuail-backend"
echo ""
