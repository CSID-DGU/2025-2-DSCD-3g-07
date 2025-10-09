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

REM 가상환경 확인
if not exist "venv\Scripts\python.exe" (
    echo ❌ Error: 가상환경을 찾을 수 없습니다.
    echo.
    echo 다음 명령어로 가상환경을 생성하세요:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo 🔧 Setting up environment...
set "PYTHONPATH=%cd%"

echo 🐍 Using Python: venv\Scripts\python.exe
echo 🌐 Starting FastAPI server...
echo 📚 API Documentation will be available at: http://127.0.0.1:8000/docs
echo 💡 Network API will be available at: http://0.0.0.0:8000/docs
echo.

REM .env 파일에서 설정 읽기 (기본값: 0.0.0.0:8000)
venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 🛑 Server stopped
pause