@echo off
echo ============================================
echo KILLING ALL PROCESSES ON PORT 3002...
echo ============================================

REM Force kill all Node processes
taskkill /F /IM node.exe 2>nul

echo.
echo ============================================
echo STARTING DEVELOPMENT SERVER ON PORT 3002
echo ============================================
echo.

cd /d D:\PROShael\alshuail-admin-arabic

echo Server is starting...
echo.
echo Access the application at:
echo - http://localhost:3002
echo - http://localhost:3002/login
echo.

REM Use React development server
set PORT=3002
npm start

pause