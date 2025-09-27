@echo off
echo Forcing complete frontend rebuild...
echo.

echo Step 1: Killing all Node processes...
taskkill /F /IM node.exe 2>nul

echo Step 2: Clearing all caches...
cd /d D:\PROShael\alshuail-admin-arabic
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q build 2>nul

echo Step 3: Starting fresh frontend...
start cmd /k "npm start"

echo.
echo ============================================
echo IMPORTANT: After the app loads:
echo 1. Press Ctrl+Shift+R in browser
echo 2. Click on "مراقبة الأعضاء" in menu
echo ============================================
pause