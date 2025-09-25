@echo off
title Al-Shuail App Server - Port 3002
cls

echo ============================================
echo        AL-SHUAIL APP SERVER
echo ============================================
echo.

REM Kill all processes on port 3002
echo Cleaning port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3002"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Port 3002 cleared.
echo.
echo Starting server on http://localhost:3002
echo.

cd /d "D:\PROShael\alshuail-admin-arabic"

REM Start the Express server from public directory
npx http-server public -p 3002 --proxy http://localhost:3002? -c-1 --cors

pause