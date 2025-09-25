@echo off
REM Batch script to set up Cloudflare authentication

echo ==================================
echo Cloudflare Setup Script
echo ==================================
echo.

REM Check if wrangler is installed
echo Checking Wrangler installation...
wrangler --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Wrangler is installed
) else (
    echo [X] Wrangler not found. Installing...
    npm install -g wrangler
)

echo.
echo Choose authentication method:
echo 1. Browser login (OAuth)
echo 2. API Token
echo.

set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Starting browser authentication...
    echo Please complete the login in your browser.
    echo.
    wrangler login
) else if "%choice%"=="2" (
    echo.
    echo Using API Token authentication
    echo.
    echo To get your API Token:
    echo 1. Go to https://dash.cloudflare.com/profile/api-tokens
    echo 2. Click 'Create Token'
    echo 3. Use the 'Edit Cloudflare Workers' template
    echo 4. Add these permissions:
    echo    - Account: Cloudflare Pages:Edit
    echo    - Zone: Page Rules:Edit
    echo 5. Copy the token
    echo.

    set /p token="Paste your API token here: "

    REM Set the API token as environment variable
    setx CLOUDFLARE_API_TOKEN "%token%" >nul
    set CLOUDFLARE_API_TOKEN=%token%

    echo.
    echo Testing authentication...
    wrangler whoami
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Build: cd alshuail-admin-arabic ^&^& npm run build:cloudflare
echo 2. Deploy: npm run deploy:cloudflare
echo.
pause