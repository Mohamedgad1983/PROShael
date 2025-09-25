@echo off
cls
echo ============================================
echo AGGRESSIVE FIX - KILLING EVERYTHING
echo ============================================
echo.

echo Step 1: Killing ALL Node.exe processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM node.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo Step 2: Killing ALL npm processes...
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM npm.cmd 2>nul

echo Step 3: Force killing anything on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill /PID %%a /F 2>nul
)

echo Step 4: Waiting for processes to die...
ping localhost -n 5 >nul

echo Step 5: Double-checking port 3002 is clear...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Force killing PID %%a
    taskkill /PID %%a /F 2>nul
)

echo Step 6: Final wait...
ping localhost -n 3 >nul

echo.
echo ============================================
echo STARTING FRESH SERVER ON PORT 3002
echo ============================================
echo.

cd /d D:\PROShael\alshuail-admin-arabic

echo Starting server from PUBLIC directory...
echo.
echo The app will be available at:
echo   http://localhost:3002
echo   http://localhost:3002/login
echo.

node serve-public.js