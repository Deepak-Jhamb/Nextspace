@echo off
title NexusHub SaaS Platform Launcher
echo ========================================================
echo         NexusHub Collaborative Workspace SaaS          
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/3] Checking and installing dependencies if required...
if not exist "node_modules\" (
    echo Installing root dependencies...
    call npm install
)
if not exist "server\node_modules\" (
    echo Installing server dependencies...
    call npm install --prefix server
)
if not exist "client\node_modules\" (
    echo Installing client dependencies...
    call npm install --prefix client
)

echo.
echo [3/3] Starting NexusHub API Server and Client Frontend...
echo.
echo  - Server API ^& Sockets: http://localhost:5000
echo  - Client Frontend App:  http://localhost:5173
echo.
echo Press Ctrl+C at any time to stop all services.
echo ========================================================

call npx concurrently --names "SERVER,CLIENT" --prefix-colors "blue,magenta" "npm run dev --prefix server" "npm run dev --prefix client"

pause
