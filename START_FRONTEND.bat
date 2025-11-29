@echo off
echo ========================================
echo Starting Al-Shuail Admin Panel
echo ========================================
echo.

cd /d D:\PROShael\alshuail-admin-arabic

echo Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Starting development server on http://localhost:3002
echo Please wait...
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

npm start

pause
