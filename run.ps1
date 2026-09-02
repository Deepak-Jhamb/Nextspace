Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "        NexusHub Collaborative Workspace SaaS          " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    npm install
}
if (-not (Test-Path "server/node_modules")) {
    Write-Host "Installing server dependencies..." -ForegroundColor Yellow
    npm install --prefix server
}
if (-not (Test-Path "client/node_modules")) {
    Write-Host "Installing client dependencies..." -ForegroundColor Yellow
    npm install --prefix client
}

Write-Host "`nStarting NexusHub API Server & Frontend App..." -ForegroundColor Green
Write-Host " - Server API & Sockets: http://localhost:5000" -ForegroundColor Gray
Write-Host " - Client Frontend App:  http://localhost:5173" -ForegroundColor Gray
Write-Host ""

npx concurrently --names "SERVER,CLIENT" --prefix-colors "blue,magenta" "npm run dev --prefix server" "npm run dev --prefix client"
