@echo off
echo ============================================
echo Starting Server on Port 3002
echo ============================================
echo.

cd alshuail-admin-arabic

REM Kill any existing processes on port 3002
echo Killing existing processes on port 3002...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3002') do (
    taskkill /F /PID %%p 2>nul
)

echo.
echo Starting development server...
echo.
echo Server running at: http://localhost:3002
echo Login page: http://localhost:3002/login
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the Node.js serve-dev.js server
node serve-dev.js