#!/bin/bash
# Admin Panel Deployment Script
# This ensures Admin Panel always deploys to alshuail-admin.pages.dev

echo "🚀 Deploying Admin Panel to Cloudflare Pages..."
echo "================================================"

# Navigate to admin directory
cd alshuail-admin-arabic

# Check if build exists
if [ ! -d "build" ]; then
    echo "🔨 Build directory not found. Building now..."
    npm run build

    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
fi

# Check for index.html
if [ ! -f "build/index.html" ]; then
    echo "❌ Error: build/index.html not found!"
    exit 1
fi

# Deploy to Cloudflare Pages
echo "📦 Deploying build to alshuail-admin..."
npx wrangler pages deploy build --project-name alshuail-admin --commit-dirty=true

cd ..

echo ""
echo "✅ Admin Panel deployed successfully!"
echo "🔗 Check deployment at: https://alshuail-admin.pages.dev"
echo ""
echo "💼 Admin Panel Features:"
echo "   - Dashboard with statistics"
echo "   - Member management"
echo "   - Payment tracking"
echo "   - Initiatives management"
echo "   - Diyas management"
echo "   - News management"
echo "   - Notifications center"
echo "   - Reports & analytics"
echo "   - Settings & user management"
