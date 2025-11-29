@echo off
echo ========================================
echo Browser Automation MCP Server - Windows Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18.0.0 or higher from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detected: 
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

echo [OK] npm detected:
npm --version
echo.

echo Step 1: Installing dependencies...
echo This may take a few minutes...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

echo Step 2: Installing Playwright browsers...
echo Downloading Chromium browser (~150MB)...
call npm run install-browsers
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Failed to install browsers automatically
    echo You can install manually with: npx playwright install chromium
)
echo [OK] Browsers installed
echo.

echo Step 3: Building TypeScript project...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build complete
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Your installation path: %CD%
echo Build file: %CD%\build\index.js
echo.
echo Next steps:
echo 1. Add this to your Claude Desktop config:
echo    Location: %%APPDATA%%\Claude\claude_desktop_config.json
echo.
echo    {
echo      "mcpServers": {
echo        "browser-automation": {
echo          "command": "node",
echo          "args": [
echo            "%CD%\build\index.js"
echo          ]
echo        }
echo      }
echo    }
echo.
echo 2. Restart Claude Desktop completely
echo 3. Test with: "Launch browser and go to google.com"
echo.
echo ========================================
pause
