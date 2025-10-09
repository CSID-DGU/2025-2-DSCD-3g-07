@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Backend 가상환경 자동 설정
echo ========================================
echo.

REM 현재 스크립트 위치에서 backend 폴더로 이동
cd /d "%~dp0..\backend"

REM 현재 디렉토리 확인
if not exist "requirements.txt" (
    echo ❌ Error: requirements.txt를 찾을 수 없습니다.
    echo    backend 폴더에서 실행하세요.
    pause
    exit /b 1
)

REM Python 확인
echo [1/5] Python 설치 확인 중...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python을 찾을 수 없습니다.
    echo    https://www.python.org/downloads/ 에서 설치하세요.
    pause
    exit /b 1
)
python --version
echo ✅ Python 설치 확인됨
echo.

REM 기존 venv 삭제
if exist "venv\" (
    echo [2/5] 기존 가상환경 삭제 중...
    rmdir /s /q venv
    echo ✅ 삭제 완료
) else (
    echo [2/5] 기존 가상환경 없음 (정상)
)
echo.

REM 가상환경 생성
echo [3/5] 가상환경 생성 중...
python -m venv venv
if errorlevel 1 (
    echo ❌ 가상환경 생성 실패
    pause
    exit /b 1
)

REM 생성 확인
if not exist "venv\Scripts\python.exe" (
    echo ❌ 가상환경이 제대로 생성되지 않았습니다.
    echo    venv\Scripts\python.exe 파일이 없습니다.
    pause
    exit /b 1
)
echo ✅ 가상환경 생성 완료
echo.

REM 가상환경 활성화
echo [4/5] 가상환경 활성화 중...
call venv\Scripts\activate.bat
echo ✅ 활성화 완료
echo.

REM 의존성 설치
echo [5/5] 의존성 설치 중...
echo    pip 업그레이드...
python -m pip install --upgrade pip --quiet
echo    패키지 설치 중... (시간이 걸릴 수 있습니다)
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ 의존성 설치 실패
    pause
    exit /b 1
)
echo ✅ 의존성 설치 완료
echo.

REM .env 파일 확인
if not exist ".env" (
    echo [추가] .env 파일 생성 중...
    copy .env.example .env >nul
    echo ✅ .env 파일 생성 완료
    echo    ⚠️  .env 파일을 열어 TMAP_APPKEY를 설정하세요!
    echo.
)

echo ========================================
echo ✅ 모든 설정이 완료되었습니다!
echo ========================================
echo.
echo 다음 명령어로 서버를 실행하세요:
echo   1. venv\Scripts\activate
echo   2. python run.py
echo.
echo 또는 스크립트 사용:
echo   ..\scripts\start-backend.bat
echo.
pause
