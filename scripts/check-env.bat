@echo off
title PaceTry Environment Check
echo.
echo ========================================
echo   🔍 PaceTry Environment Check
echo ========================================
echo.

echo 📂 Project Structure:
echo ├── Backend (FastAPI + Python)
echo ├── Frontend (Expo + React Native) 
echo └── Scripts (Development tools)
echo.

echo 🐍 Python Environment Check:
if exist "backend\venv\Scripts\python.exe" (
    echo ✅ Python Virtual Environment: Found
    "backend\venv\Scripts\python.exe" --version 2>nul && echo ✅ Python executable: Working || echo ❌ Python executable: Not working
) else (
    echo ❌ Python Virtual Environment: Not found
)
echo.

echo 📦 Node.js Environment Check:
where node >nul 2>&1 && (
    echo ✅ Node.js: Found
    node --version
) || (
    echo ❌ Node.js: Not found
)
echo.

echo 📱 Frontend Dependencies:
if exist "frontend\node_modules" (
    echo ✅ Frontend dependencies: Installed
) else (
    echo ⚠️  Frontend dependencies: Not installed
)
echo.

echo 🐍 Backend Dependencies:
cd backend
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\pip.exe" show fastapi >nul 2>&1 && (
        echo ✅ Backend dependencies: Installed
    ) || (
        echo ⚠️  Backend dependencies: Not fully installed
    )
) else (
    echo ❌ Backend virtual environment not found
)
cd..
echo.

echo 📁 Important Files:
echo Backend:
if exist "backend\app\main.py" (echo ✅ main.py) else (echo ❌ main.py)
if exist "backend\.env" (echo ✅ .env) else (echo ❌ .env)
if exist "backend\requirements.txt" (echo ✅ requirements.txt) else (echo ❌ requirements.txt)

echo.
echo Frontend:
if exist "frontend\app.json" (echo ✅ app.json) else (echo ❌ app.json)
if exist "frontend\package.json" (echo ✅ package.json) else (echo ❌ package.json)

echo.
echo 🚀 Quick Start Commands:
echo   npm run dev           - Start both backend and frontend
echo   npm run backend:dev   - Start backend only  
echo   npm run frontend:dev  - Start frontend only
echo.

pause