$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend 가상환경 자동 설정" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptDir "..\backend" | Resolve-Path
Set-Location $backendPath

# requirements.txt 확인
if (-not (Test-Path "requirements.txt")) {
    Write-Host "❌ Error: requirements.txt를 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "   backend 폴더에서 실행하세요." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Python 확인
Write-Host "[1/5] Python 설치 확인 중..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host $pythonVersion -ForegroundColor Green
    Write-Host "✅ Python 설치 확인됨" -ForegroundColor Green
} catch {
    Write-Host "❌ Python을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "   https://www.python.org/downloads/ 에서 설치하세요." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 기존 venv 삭제
if (Test-Path "venv") {
    Write-Host "[2/5] 기존 가상환경 삭제 중..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force venv
    Write-Host "✅ 삭제 완료" -ForegroundColor Green
} else {
    Write-Host "[2/5] 기존 가상환경 없음 (정상)" -ForegroundColor Green
}
Write-Host ""

# 가상환경 생성
Write-Host "[3/5] 가상환경 생성 중..." -ForegroundColor Yellow
python -m venv venv
Start-Sleep -Seconds 2

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "❌ 가상환경이 제대로 생성되지 않았습니다." -ForegroundColor Red
    Write-Host "   venv\Scripts\python.exe 파일이 없습니다." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ 가상환경 생성 완료" -ForegroundColor Green
Write-Host ""

# 가상환경 활성화
Write-Host "[4/5] 가상환경 활성화 중..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"
Write-Host "✅ 활성화 완료" -ForegroundColor Green
Write-Host ""

# 의존성 설치
Write-Host "[5/5] 의존성 설치 중..." -ForegroundColor Yellow
Write-Host "   pip 업그레이드..." -ForegroundColor Gray
python -m pip install --upgrade pip --quiet

Write-Host "   패키지 설치 중... (시간이 걸릴 수 있습니다)" -ForegroundColor Gray
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 의존성 설치 실패" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ 의존성 설치 완료" -ForegroundColor Green
Write-Host ""

# .env 파일 확인
if (-not (Test-Path ".env")) {
    Write-Host "[추가] .env 파일 생성 중..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env 파일 생성 완료" -ForegroundColor Green
    Write-Host "   ⚠️  .env 파일을 열어 TMAP_APPKEY를 설정하세요!" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 모든 설정이 완료되었습니다!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 명령어로 서버를 실행하세요:" -ForegroundColor Yellow
Write-Host "  1. .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  2. python run.py" -ForegroundColor White
Write-Host ""
Write-Host "또는 스크립트 사용:" -ForegroundColor Yellow
Write-Host "  ..\scripts\start-backend.ps1" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue"
