@echo off
REM ================================================
REM Al-Shuail Mobile PWA - WhatsApp OTP Deployment
REM صندوق عائلة شعيل العنزي
REM ================================================

echo.
echo ====================================================
echo   AL-SHUAIL MOBILE PWA - WHATSAPP OTP DEPLOYMENT
echo   صندوق عائلة شعيل العنزي
echo ====================================================
echo.

cd /d D:\PROShael\alshuail-mobile

echo [1/4] Installing dependencies...
call npm install

echo.
echo [2/4] Building production bundle...
call npm run build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Build successful! Files are in dist folder.
echo.

echo [4/4] Deploying to VPS...
echo.
echo Run this command to deploy:
echo scp -r D:\PROShael\alshuail-mobile\dist\* root@213.199.62.185:/var/www/mobile/
echo.

echo ====================================================
echo   DEPLOYMENT READY!
echo ====================================================
echo.
echo Local Test: npm run preview
echo Production: https://app.alshailfund.com
echo.
echo Changes:
echo  - WhatsApp OTP Login (via Ultramsg)
echo  - Phone number validation (Saudi + Kuwait)
echo  - OTP verification with countdown
echo  - Resend OTP functionality
echo.

pause
