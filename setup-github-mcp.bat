@echo off
echo ========================================
echo GitHub MCP Server Setup
echo ========================================
echo.
echo Please enter your GitHub Personal Access Token
echo (It should start with ghp_)
echo.
set /p GITHUB_TOKEN="Enter GitHub Token: "

echo.
echo Adding GitHub MCP server...
claude mcp add github "npx -y @modelcontextprotocol/server-github@latest" -e GITHUB_TOKEN=%GITHUB_TOKEN%

echo.
echo Testing connection...
claude mcp list

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo If the GitHub server shows as "Connected", you're all set!
echo If it shows "Failed to connect", please check your token.
echo.
pause