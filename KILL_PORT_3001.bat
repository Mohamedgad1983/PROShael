@echo off
echo ========================================
echo   KILL PORT 3001 (Backend)
echo ========================================
echo.

echo Finding process on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
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
netstat -ano | findstr :3001
if errorlevel 1 (
    echo ✅ Port 3001 is now FREE!
) else (
    echo ⚠️  Port 3001 still in use
)

echo.
pause
