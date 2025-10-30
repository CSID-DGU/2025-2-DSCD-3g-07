# PaceTry Backend Server Start Script
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host "   🚀 PaceTry Backend Server Starting"
Write-Host "========================================"
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ScriptDir "..\backend" | Resolve-Path
Set-Location $BackendPath

Write-Host "📂 Backend Directory: $(Get-Location)"
Write-Host ""

# 가상환경 확인
$PythonExe = Join-Path $BackendPath "venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "❌ Error: 가상환경을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "다음 명령어로 가상환경을 생성하세요:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor White
    Write-Host "  python -m venv venv" -ForegroundColor White
    Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
    Write-Host "  pip install -r requirements.txt" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🔧 Setting up environment..."
$env:PYTHONPATH = $BackendPath

Write-Host "🐍 Using Python: venv\Scripts\python.exe"
Write-Host "🌐 Starting FastAPI server..."
Write-Host "📚 API Documentation: http://127.0.0.1:8000/docs"
Write-Host "🌍 Network Access: http://0.0.0.0:8000/docs"
Write-Host "📖 ReDoc Documentation: http://127.0.0.1:8000/redoc"
Write-Host ""

try {
    & $PythonExe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}
catch {
    Write-Host "❌ Error starting backend server: $_" -ForegroundColor Red
}
finally {
    Write-Host ""
    Write-Host "🛑 Server stopped"
    Read-Host "Press Enter to continue..."
}