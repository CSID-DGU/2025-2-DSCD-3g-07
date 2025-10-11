@echo off
echo 🔍 PaceTry 네트워크 자동 감지 테스트
echo ================================
echo.

cd /d D:\PaceTry\backend

echo 📡 로컬 IP 감지 중...
python utils/network_utils.py

echo.
echo 🚀 백엔드 서버를 시작하려면 아무 키나 누르세요...
pause > nul

echo.
echo 🐍 백엔드 서버 시작 중...
python run.py

pause