#!/bin/bash
echo "========================================"
echo "  Al-Shuail Mobile App Deployment"
echo "========================================"
echo ""

cd /d/PROShael/alshuail-mobile

echo "[1/3] Installing dependencies..."
npm install || { echo "ERROR: npm install failed!"; exit 1; }

echo ""
echo "[2/3] Building production version..."
npm run build || { echo "ERROR: Build failed!"; exit 1; }

echo ""
echo "[3/3] Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name alshuail-mobile-pwa --commit-dirty=true

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "  URL: https://app.alshailfund.com"
echo "========================================"
