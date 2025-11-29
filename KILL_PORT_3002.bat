@echo off
echo ========================================
echo   KILL PORT 3002 (Frontend)
echo ========================================
echo.

echo Finding process on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Found PID: %%a
    echo Killing process...
    taskkill /PID %%a /F
    if errorlevel 1 (
        echo Failed to kill process
    ) else (
        echo ✅ Process killed successfully!
    )
)

echo.
echo Checking if port is now free...
netstat -ano | findstr :3002
if errorlevel 1 (
    echo ✅ Port 3002 is now FREE!
) else (
    echo ⚠️  Port 3002 still in use
)

echo.
pause
