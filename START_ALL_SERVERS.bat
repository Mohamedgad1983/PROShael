@echo off
echo ========================================
echo   AL-SHUAIL SYSTEM - STARTING ALL
echo ========================================
echo.
echo This will start:
echo   1. Backend API (Port 3001)
echo   2. Frontend Admin Panel (Port 3002)
echo.
echo Press any key to continue...
pause > nul

echo.
echo [1/2] Starting Backend API...
start "Al-Shuail Backend API - Port 3001" cmd /k "cd /d D:\PROShael\alshuail-backend && echo Starting Backend API... && npm start"

echo.
echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo [2/2] Starting Frontend Admin Panel...
start "Al-Shuail Frontend - Port 3002" cmd /k "cd /d D:\PROShael\alshuail-admin-arabic && echo Starting Frontend... && npm start"

echo.
echo ========================================
echo   SERVERS STARTING...
echo ========================================
echo.
echo Two new windows have opened:
echo   - Backend API (localhost:3001)
echo   - Frontend (localhost:3002)
echo.
echo Browser will open automatically in ~30 seconds
echo.
echo IMPORTANT: Keep both windows open!
echo To stop: Close the windows or press Ctrl+C in each
echo.
echo ========================================
echo.
pause
