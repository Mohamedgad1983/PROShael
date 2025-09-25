# GitHub MCP Server Setup Script
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "GitHub MCP Server Setup" -ForegroundColor Yellow
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

Write-Host "To use the GitHub MCP server, you need a GitHub Personal Access Token." -ForegroundColor White
Write-Host ""
Write-Host "Steps to get your token:" -ForegroundColor Green
Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "2. Click 'Generate new token (classic)'" -ForegroundColor White
Write-Host "3. Give it a name like 'Claude MCP'" -ForegroundColor White
Write-Host "4. Select scopes:" -ForegroundColor White
Write-Host "   - repo (for full repository access)" -ForegroundColor Gray
Write-Host "   - read:org (for organization repositories)" -ForegroundColor Gray
Write-Host "   - gist (if you want gist access)" -ForegroundColor Gray
Write-Host "5. Click 'Generate token'" -ForegroundColor White
Write-Host "6. Copy the token (it starts with ghp_)" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

$token = Read-Host "Enter your GitHub Personal Access Token"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Error: Token cannot be empty!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Updating .mcp.json with your token..." -ForegroundColor Yellow

try {
    # Read the existing configuration
    $configPath = ".\.mcp.json"
    $config = Get-Content $configPath | ConvertFrom-Json

    # Update the GitHub token
    $config.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN = $token

    # Save the updated configuration
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath

    Write-Host "✓ GitHub token has been added to .mcp.json" -ForegroundColor Green
    Write-Host ""

    # Test the connection
    Write-Host "Testing GitHub MCP connection..." -ForegroundColor Yellow
    Write-Host ""

    # Run Claude debug to check MCP servers
    & claude --debug 2>&1 | Select-String -Pattern "github" | ForEach-Object { Write-Host $_ -ForegroundColor Cyan }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use GitHub MCP commands in Claude." -ForegroundColor White
    Write-Host "Restart Claude if it's currently running." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan

} catch {
    Write-Host "Error updating configuration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Read-Host "Press Enter to exit"