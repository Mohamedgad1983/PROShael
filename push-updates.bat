@echo off
echo ========================================
echo   Pushing Updates to GitHub
echo ========================================
echo.

REM Add all changes
git add .

REM Commit with message
set /p message="Enter commit message: "
git commit -m "%message%"

REM Pull latest changes from GitHub
echo.
echo Pulling latest changes...
git pull origin main --rebase

REM Push to GitHub
echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   Update Complete!
echo ========================================
pause