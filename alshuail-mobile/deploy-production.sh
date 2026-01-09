#!/bin/bash
# ================================================
# Al-Shuail Mobile PWA - Production Deployment
# WhatsApp OTP Integration
# ================================================

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🚀 AL-SHUAIL MOBILE PWA - PRODUCTION DEPLOYMENT            ║"
echo "║      WhatsApp OTP Integration                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

VPS_IP="213.199.62.185"
VPS_USER="root"
REMOTE_PATH="/var/www/mobile"

# Step 1: Build
echo "📦 [1/3] Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Deploy
echo "🚀 [2/3] Deploying to VPS ($VPS_IP)..."
scp -r dist/* $VPS_USER@$VPS_IP:$REMOTE_PATH/

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "✅ Files uploaded!"
echo ""

# Step 3: Reload nginx
echo "🔄 [3/3] Reloading nginx..."
ssh $VPS_USER@$VPS_IP "nginx -t && systemctl reload nginx"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   ✅ DEPLOYMENT COMPLETE!                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Live URL: https://app.alshailfund.com"
echo ""
echo "📱 Test the new WhatsApp OTP login:"
echo "   1. Open https://app.alshailfund.com"
echo "   2. Enter your phone number"
echo "   3. Check WhatsApp for OTP"
echo "   4. Enter the code to login"
echo ""
