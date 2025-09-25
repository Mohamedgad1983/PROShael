# PowerShell script to forcefully fix the server issue
Write-Host "============================================" -ForegroundColor Green
Write-Host "FORCEFULLY FIXING SERVER ON PORT 3002" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Kill ALL Node processes
Write-Host "Step 1: Killing ALL Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Kill everything on port 3002
Write-Host "Step 2: Killing everything on port 3002..." -ForegroundColor Yellow
$connections = netstat -ano | Select-String ":3002"
foreach ($line in $connections) {
    $parts = $line -split '\s+'
    $pid = $parts[-1]
    if ($pid -ne "0") {
        Write-Host "Killing PID: $pid"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

# Double check
Write-Host "Step 3: Double-checking port is clear..." -ForegroundColor Yellow
$connections = netstat -ano | Select-String ":3002"
if ($connections) {
    Write-Host "Found remaining connections, killing them..." -ForegroundColor Red
    foreach ($line in $connections) {
        $parts = $line -split '\s+'
        $pid = $parts[-1]
        if ($pid -ne "0") {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "STARTING CLEAN SERVER" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Change to the correct directory
Set-Location "D:\PROShael\alshuail-admin-arabic"

Write-Host "Starting server from PUBLIC directory..."
Write-Host ""
Write-Host "Access the app at:" -ForegroundColor Cyan
Write-Host "  http://localhost:3002" -ForegroundColor Cyan
Write-Host "  http://localhost:3002/login" -ForegroundColor Cyan
Write-Host ""

# Start the server
node serve-public.js