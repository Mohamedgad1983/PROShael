@echo off
echo ========================================
echo   Al-Shuail Mobile App Deployment
echo ========================================
echo.

cd /d D:\PROShael\alshuail-mobile

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building production version...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Deploying to Cloudflare Pages...
call npx wrangler pages deploy dist --project-name alshuail-mobile-pwa --commit-dirty=true

echo.
echo ========================================
echo   Deployment Complete!
echo   URL: https://app.alshailfund.com
echo ========================================
pause
