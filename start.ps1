# 0372api.top Startup Script
# Starts both the API backend (port 3000) and frontend (port 80)

Write-Host "Starting 0372api.top..." -ForegroundColor Cyan

Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'server/index.js|next start' } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

Write-Host "Starting API backend on port 3000..." -ForegroundColor Yellow
$api = Start-Process -FilePath "node" -ArgumentList "server/index.js" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 1

Write-Host "Starting frontend on port 80..." -ForegroundColor Yellow
$web = Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 80" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

try {
    $s = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/settings/public" -TimeoutSec 5
    Write-Host "API backend: OK (site=$($s.data.site_name))" -ForegroundColor Green
} catch {
    Write-Host "API backend: FAILED" -ForegroundColor Red
}
try {
    $r = Invoke-WebRequest -Uri "http://0372api.top/" -UseBasicParsing -TimeoutSec 5
    Write-Host "Frontend: OK ($($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Frontend: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "Site: http://0372api.top" -ForegroundColor Cyan
Write-Host "Admin: http://0372api.top/admin" -ForegroundColor Cyan
Write-Host "Admin login: admin@0372api.top / admin123456" -ForegroundColor Cyan
Write-Host "API: http://0372api.top/api/v1" -ForegroundColor Cyan
