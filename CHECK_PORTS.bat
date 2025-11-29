@echo off
echo ========================================
echo   PORT STATUS CHECKER
echo ========================================
echo.

echo Checking if ports are available...
echo.

echo [Port 3001] Backend API:
netstat -ano | findstr :3001
if errorlevel 1 (
    echo   ✅ Port 3001 is FREE - Backend can start
) else (
    echo   ❌ Port 3001 is IN USE - Backend won't start!
    echo   Run KILL_PORT_3001.bat to free it
)

echo.
echo [Port 3002] Frontend:
netstat -ano | findstr :3002
if errorlevel 1 (
    echo   ✅ Port 3002 is FREE - Frontend can start
) else (
    echo   ❌ Port 3002 is IN USE - Frontend won't start!
    echo   Run KILL_PORT_3002.bat to free it
)

echo.
echo [Port 3000] Alternative:
netstat -ano | findstr :3000
if errorlevel 1 (
    echo   ✅ Port 3000 is FREE
) else (
    echo   ⚠️  Port 3000 is IN USE
)

echo.
echo ========================================
echo   NODE.JS STATUS
echo ========================================
echo.

node --version > nul 2>&1
if errorlevel 1 (
    echo   ❌ Node.js NOT INSTALLED!
    echo   Download from: https://nodejs.org
) else (
    echo   ✅ Node.js installed:
    node --version
    echo   ✅ npm installed:
    npm --version
)

echo.
echo ========================================
pause
