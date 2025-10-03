@echo off
title PaceTry Backend Server
echo.
echo ========================================
echo   🚀 PaceTry Backend Server Starting
echo ========================================
echo.

cd /d "%~dp0..\backend"

echo 📂 Backend Directory: %cd%
echo.

echo 🔧 Setting up environment...
set PYTHONPATH=D:\PaceTry\backend

echo 🐍 Using Python: D:\PaceTry\backend\venv\Scripts\python.exe
echo 🌐 Starting FastAPI server...
echo 📚 API Documentation will be available at: http://127.0.0.1:8000/docs
echo.

D:\PaceTry\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

echo.
echo 🛑 Server stopped
pause