@echo off
title PaceTry Code Quality Check
echo.
echo ========================================
echo   🔍 PaceTry Code Quality Check
echo ========================================
echo.

cd /d "%~dp0.."

echo 🐍 Backend Quality Check:
echo ──────────────────────────
echo.

echo 📝 Running Flake8 (Linting)...
npm run lint:backend
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Linting failed
    goto :error
) else (
    echo ✅ Linting passed
)
echo.

echo 🎨 Running Black (Code formatting check)...
cd backend
D:\PaceTry\backend\venv\Scripts\python.exe -m black --check app/ tests/
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Code formatting check failed
    echo 💡 Run 'npm run format:backend' to fix formatting
    cd ..
    goto :error
) else (
    echo ✅ Code formatting is correct
)
cd ..
echo.

echo 🧪 Running Tests...
npm run backend:test
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Tests failed
    goto :error
) else (
    echo ✅ All tests passed
)
echo.

echo 📱 Frontend Quality Check:
echo ──────────────────────────
echo.

echo 📝 Running ESLint...
npm run lint:frontend
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend linting failed
    goto :error
) else (
    echo ✅ Frontend linting passed
)
echo.

echo 🎨 Running Prettier (Format check)...
cd frontend
npx prettier --check "**/*.{js,jsx,ts,tsx,json}"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend formatting check failed  
    echo 💡 Run 'npm run format:frontend' to fix formatting
    cd ..
    goto :error
) else (
    echo ✅ Frontend formatting is correct
)
cd ..
echo.

echo 🎯 All Quality Checks Passed! ✅
echo.
echo 🚀 Your code is ready for deployment!
echo.
goto :end

:error
echo.
echo ❌ Quality checks failed!
echo.
echo 💡 Quick fixes:
echo   npm run format:all    # Fix formatting issues
echo   npm run lint:all      # Check linting issues  
echo   npm run test:all      # Run all tests
echo.
pause
exit /b 1

:end
pause