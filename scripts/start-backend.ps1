# PaceTry Backend Server Start Script
Write-Host ""
Write-Host "========================================"
Write-Host "   🚀 PaceTry Backend Server Starting"
Write-Host "========================================"
Write-Host ""

$BackendPath = Join-Path $PSScriptRoot "..\backend"
Set-Location $BackendPath

Write-Host "📂 Backend Directory: $(Get-Location)"
Write-Host ""

Write-Host "🔧 Setting up environment..."
$env:PYTHONPATH = "D:\PaceTry\backend"

Write-Host "🐍 Using Python: D:\PaceTry\backend\venv\Scripts\python.exe"
Write-Host "🌐 Starting FastAPI server..."
Write-Host "📚 API Documentation: http://127.0.0.1:8000/docs"
Write-Host "📖 ReDoc Documentation: http://127.0.0.1:8000/redoc"
Write-Host ""

try {
    & "D:\PaceTry\backend\venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
}
catch {
    Write-Host "❌ Error starting backend server: $_" -ForegroundColor Red
}
finally {
    Write-Host ""
    Write-Host "🛑 Server stopped"
    Read-Host "Press Enter to continue..."
}