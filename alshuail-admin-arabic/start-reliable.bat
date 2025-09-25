@echo off
echo ============================================
echo Starting Al-Shuail Admin Dashboard
echo Reliable Startup Script
echo ============================================

REM Kill any existing node processes on port 3002
echo Checking for existing processes on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM Wait for port to be fully released
echo Waiting for port to be released...
timeout /t 3 /nobreak >nul

REM Check if build directory exists
if not exist "build" (
    echo Build directory not found! Building project...
    call npm run build
    if errorlevel 1 (
        echo Build failed! Exiting...
        pause
        exit /b 1
    )
)

REM Start the server using simple-server.js
echo Starting server on port 3002...
node simple-server.js

pause