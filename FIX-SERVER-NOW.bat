@echo off
title FIXING SERVER ON PORT 3002

echo ============================================
echo STEP 1: KILLING ALL NODE PROCESSES
echo ============================================
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo ============================================
echo STEP 2: KILLING ALL PROCESSES ON PORT 3002
echo ============================================
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Killing PID %%a
    taskkill /PID %%a /F 2>nul
)
timeout /t 2 >nul

echo.
echo ============================================
echo STEP 3: STARTING SERVER FROM PUBLIC DIR
echo ============================================
cd /d D:\PROShael\alshuail-admin-arabic

echo.
echo Server Configuration:
echo - Port: 3002
echo - Directory: public
echo - SPA Routing: Enabled
echo - CORS: Enabled
echo.

echo Starting server...
echo.
echo Access the application at:
echo - http://localhost:3002
echo - http://localhost:3002/login
echo.

REM Start http-server with SPA support
npx http-server public -p 3002 --proxy "http://localhost:3002?" -c-1 --cors -o

pause