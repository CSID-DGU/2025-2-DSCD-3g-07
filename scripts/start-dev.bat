@echo off
title PaceTry Development Environment
echo.
echo ========================================
echo   🌟 PaceTry Full Stack Development
echo ========================================
echo.

cd /d "%~dp0.."

echo 📂 Project Root: %cd%
echo.

echo 🔧 Starting both Backend and Frontend...
echo.
echo 🐍 Backend will run on: http://127.0.0.1:8000
echo 📱 Frontend will start Expo dev server
echo.
echo Press Ctrl+C to stop all servers
echo.

npm run dev

echo.
echo 🛑 All servers stopped
pause