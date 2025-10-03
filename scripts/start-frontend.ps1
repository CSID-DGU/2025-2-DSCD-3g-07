# PaceTry Frontend App Start Script
Write-Host ""
Write-Host "========================================"
Write-Host "   📱 PaceTry Frontend App Starting"
Write-Host "========================================"
Write-Host ""

$FrontendPath = Join-Path $PSScriptRoot "..\frontend"
Set-Location $FrontendPath

Write-Host "📂 Frontend Directory: $(Get-Location)"
Write-Host ""

Write-Host "📦 Checking dependencies..."
if (-not (Test-Path "node_modules")) {
    Write-Host "🔧 Installing dependencies..."
    npm install
} else {
    Write-Host "✅ Dependencies already installed"
}

Write-Host ""
Write-Host "🚀 Starting Expo development server..."
Write-Host "📱 Scan QR code with Expo Go app or press 'w' for web"
Write-Host ""

try {
    npx expo start
}
catch {
    Write-Host "❌ Error starting frontend: $_" -ForegroundColor Red
}
finally {
    Write-Host ""
    Write-Host "🛑 Development server stopped"
    Read-Host "Press Enter to continue..."
}