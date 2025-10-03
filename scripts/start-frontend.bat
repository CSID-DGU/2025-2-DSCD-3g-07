@echo off
title PaceTry Frontend App
echo.
echo ========================================
echo   📱 PaceTry Frontend App Starting  
echo ========================================
echo.

cd /d "%~dp0..\frontend"

echo 📂 Frontend Directory: %cd%
echo.

echo 📦 Checking dependencies...
if not exist "node_modules" (
    echo 🔧 Installing dependencies...
    npm install
) else (
    echo ✅ Dependencies already installed
)

echo.
echo 🚀 Starting Expo development server...
echo 📱 Scan QR code with Expo Go app or press 'w' for web
echo.

npx expo start

echo.
echo 🛑 Development server stopped
pause