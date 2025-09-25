# PowerShell script to set up Cloudflare authentication
# Run this script in PowerShell as Administrator

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Cloudflare Setup Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Function to set environment variable
function Set-EnvVariable {
    param (
        [string]$Name,
        [string]$Value
    )
    [System.Environment]::SetEnvironmentVariable($Name, $Value, [System.EnvironmentVariableTarget]::User)
    Write-Host "✓ Set $Name" -ForegroundColor Green
}

# Check if wrangler is installed
Write-Host "Checking Wrangler installation..." -ForegroundColor Yellow
$wranglerVersion = wrangler --version 2>$null
if ($?) {
    Write-Host "✓ Wrangler is installed: $wranglerVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Wrangler not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
}

Write-Host ""
Write-Host "Choose authentication method:" -ForegroundColor Cyan
Write-Host "1. Browser login (OAuth)" -ForegroundColor White
Write-Host "2. API Token" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Starting browser authentication..." -ForegroundColor Yellow
    Write-Host "Please complete the login in your browser." -ForegroundColor Yellow
    Write-Host ""
    wrangler login
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "Using API Token authentication" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get your API Token:" -ForegroundColor Cyan
    Write-Host "1. Go to https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor White
    Write-Host "2. Click 'Create Token'" -ForegroundColor White
    Write-Host "3. Use the 'Edit Cloudflare Workers' template" -ForegroundColor White
    Write-Host "4. Add these permissions:" -ForegroundColor White
    Write-Host "   - Account: Cloudflare Pages:Edit" -ForegroundColor Gray
    Write-Host "   - Zone: Page Rules:Edit" -ForegroundColor Gray
    Write-Host "5. Copy the token" -ForegroundColor White
    Write-Host ""

    $token = Read-Host "Paste your API token here" -AsSecureString
    $tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))

    # Set the API token as environment variable
    Set-EnvVariable -Name "CLOUDFLARE_API_TOKEN" -Value $tokenPlain

    Write-Host ""
    Write-Host "Testing authentication..." -ForegroundColor Yellow
    $env:CLOUDFLARE_API_TOKEN = $tokenPlain
    wrangler whoami
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Build the project: cd alshuail-admin-arabic && npm run build:cloudflare" -ForegroundColor White
Write-Host "2. Deploy to Cloudflare: npm run deploy:cloudflare" -ForegroundColor White
Write-Host ""