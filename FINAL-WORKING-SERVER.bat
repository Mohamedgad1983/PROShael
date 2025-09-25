@echo off
cls
echo ============================================
echo FINAL WORKING SERVER SETUP - PORT 3002
echo ============================================
echo.

echo STEP 1: Force killing ALL node processes...
taskkill /F /IM node.exe 2>nul
ping localhost -n 3 >nul

echo STEP 2: Killing processes on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill /PID %%a /F 2>nul
)
ping localhost -n 2 >nul

echo STEP 3: Starting the CORRECT server...
echo.
cd /d D:\PROShael\alshuail-admin-arabic

echo ============================================
echo SERVER IS NOW RUNNING!
echo ============================================
echo.
echo Access the application at:
echo   http://localhost:3002
echo   http://localhost:3002/login
echo.
echo Features:
echo   - Normal text weight (400) everywhere
echo   - No bold text
echo   - Fixed page height (no scrolling)
echo   - SPA routing enabled
echo.
echo ============================================

REM Run the working serve-public.js server
node serve-public.js