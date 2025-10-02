@echo off
REM Al-Shuail Quick Deploy Script (Windows)
REM Commits and pushes changes to GitHub, triggering Cloudflare Pages deployment

echo ========================================
echo    Al-Shuail Quick Deploy Script
echo ========================================
echo.

REM Check if we're in a git repository
if not exist ".git" (
    echo [31mNot in a git repository![0m
    echo Please run this script from D:\PROShael directory
    pause
    exit /b 1
)

REM Get commit message from argument or prompt
set "COMMIT_MESSAGE=%~1"

if "%COMMIT_MESSAGE%"=="" (
    set /p COMMIT_MESSAGE="Enter commit message: "
)

if "%COMMIT_MESSAGE%"=="" (
    echo [31mCommit message cannot be empty[0m
    pause
    exit /b 1
)

REM Show current status
echo.
echo [34mGit Status:[0m
git status --short

REM Confirm
echo.
echo [33mCommit message: %COMMIT_MESSAGE%[0m
set /p CONFIRM="Ready to deploy? (y/n): "

if /i not "%CONFIRM%"=="y" (
    echo [33mDeployment cancelled[0m
    pause
    exit /b 0
)

REM Add all changes
echo.
echo [34mAdding changes...[0m
git add .

REM Commit
echo [34mCommitting...[0m
git commit -m "%COMMIT_MESSAGE%"

if errorlevel 1 (
    echo [33mNothing to commit or commit failed[0m
    pause
    exit /b 1
)

REM Push
echo.
echo [34mPushing to GitHub...[0m
git push origin main

if errorlevel 0 (
    echo.
    echo ========================================
    echo [32mDeployment initiated successfully![0m
    echo ========================================
    echo.
    echo [34mDeployment will be available at:[0m
    echo    Frontend: https://alshuail-admin.pages.dev
    echo    Backend:  https://proshael.onrender.com
    echo.
    echo [34mEstimated deployment time: 2-5 minutes[0m
    echo.
    echo [34mMonitor deployment:[0m
    echo    GitHub Actions: https://github.com/YOUR_USERNAME/PROShael/actions
    echo    Cloudflare:     https://dash.cloudflare.com/
    echo.
) else (
    echo.
    echo [31mPush failed![0m
    echo Check your git configuration and network connection
    pause
    exit /b 1
)

pause
