#!/bin/bash
# Mobile PWA Deployment Script
# This ensures Mobile PWA always deploys to alshuail-mobile-pwa.pages.dev

echo "🚀 Deploying Mobile PWA to Cloudflare Pages..."
echo "================================================"

# Check if Mobile/dist exists
if [ ! -d "Mobile/dist" ]; then
    echo "❌ Error: Mobile/dist directory not found!"
    echo "Please ensure the Mobile PWA is built first."
    exit 1
fi

# Check for index.html
if [ ! -f "Mobile/dist/index.html" ]; then
    echo "📝 Creating index.html from login.html..."
    cp Mobile/dist/login.html Mobile/dist/index.html
fi

# Deploy to Cloudflare Pages
echo "📦 Deploying Mobile/dist to alshuail-mobile-pwa..."
npx wrangler pages deploy Mobile/dist --project-name alshuail-mobile-pwa --commit-dirty=true

echo ""
echo "✅ Mobile PWA deployed successfully!"
echo "🔗 Check deployment at: https://alshuail-mobile-pwa.pages.dev"
echo ""
echo "📱 Mobile PWA Features:"
echo "   - Login page"
echo "   - Dashboard"
echo "   - Payments"
echo "   - Events"
echo "   - Profile"
echo "   - Notifications"
echo "   - Statements"
echo "   - Crisis alerts"
echo "   - Family tree"
