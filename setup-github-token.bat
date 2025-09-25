@echo off
echo ========================================
echo GitHub MCP Server Setup
echo ========================================
echo.
echo To use the GitHub MCP server, you need a GitHub Personal Access Token.
echo.
echo Steps to get your token:
echo 1. Go to: https://github.com/settings/tokens
echo 2. Click "Generate new token (classic)"
echo 3. Give it a name like "Claude MCP"
echo 4. Select scopes:
echo    - repo (for full repository access)
echo    - read:org (for organization repositories)
echo    - gist (if you want gist access)
echo 5. Click "Generate token"
echo 6. Copy the token (it starts with ghp_)
echo.
echo ========================================
set /p TOKEN="Enter your GitHub Personal Access Token: "
echo.

if "%TOKEN%"=="" (
    echo Error: Token cannot be empty!
    pause
    exit /b 1
)

echo Updating .mcp.json with your token...

:: Create a temporary Python script to update JSON
echo import json > update_token.py
echo with open('.mcp.json', 'r') as f: >> update_token.py
echo     config = json.load(f) >> update_token.py
echo config['mcpServers']['github']['env']['GITHUB_PERSONAL_ACCESS_TOKEN'] = '%TOKEN%' >> update_token.py
echo with open('.mcp.json', 'w') as f: >> update_token.py
echo     json.dump(config, f, indent=2) >> update_token.py

python update_token.py
del update_token.py

echo.
echo ✓ GitHub token has been added to .mcp.json
echo.
echo Testing GitHub MCP connection...
echo.

:: Test the connection
claude --debug 2>&1 | findstr /i "github"

echo.
echo ========================================
echo Setup complete!
echo.
echo You can now use GitHub MCP commands in Claude.
echo Restart Claude if it's currently running.
echo ========================================
echo.
pause