# 서버 실행 및 종료 명령어 가이드

## 📋 목차
- [통합 서버 관리](#통합-서버-관리)
- [백엔드 서버 (FastAPI)](#백엔드-서버-fastapi)
- [프론트엔드 서버 (Expo)](#프론트엔드-서버-expo)
- [서버 종료 방법](#서버-종료-방법)
- [포트 관리](#포트-관리)
- [트러블슈팅](#트러블슈팅)

---

## 🔄 통합 서버 관리

### ✅ 통합 실행 (권장)

```bash
# 프로젝트 루트에서
npm run dev
```

**실행 내용:**
- 백엔드: `http://127.0.0.1:8000`
- 프론트엔드: `http://localhost:8081`
- **Expo Go 앱**: QR 코드 스캔으로 모바일에서 접속 가능
- 동시 실행으로 개발 효율성 극대화

**접속 방법:**
- 🌐 **웹 브라우저**: http://localhost:8081
- 📱 **Expo Go 모바일 앱**: 터미널에 표시되는 QR 코드 스캔
- 📊 **API 문서**: http://127.0.0.1:8000/docs

### 🛑 통합 종료

```bash
# 터미널에서
Ctrl + C

# 또는 PowerShell에서 강제 종료
taskkill /f /im node.exe && taskkill /f /im python.exe
```

---

## 🐍 백엔드 서버 (FastAPI)

### ✅ 백엔드 실행

**방법 1: npm 스크립트 (권장)**
```bash
npm run backend:dev
```

**방법 2: 직접 실행 (절대 경로)**
```powershell
# 프로젝트 루트에서
cd backend
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH="D:\PaceTry\backend"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**방법 3: 간단한 실행 (권장)**
```powershell
# 백엔드 폴더로 이동
cd D:\PaceTry\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

**방법 4: 가상환경 활성화 후**
```powershell
# backend 폴더에서
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 📊 백엔드 서버 정보

- **포트**: 8000
- **주소**: http://127.0.0.1:8000
- **API 문서**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/health

### 🛑 백엔드 종료

**방법 1: 키보드 단축키**
```bash
Ctrl + C  # 터미널에서
```

**방법 2: 프로세스 종료**
```powershell
# Python 프로세스 모두 종료
taskkill /f /im python.exe

# 특정 포트 사용 프로세스 종료
netstat -ano | findstr ":8000" | foreach { ($_ -split '\s+')[-1] } | ForEach-Object { taskkill /f /pid $_ }
```

---

## ⚛️ 프론트엔드 서버 (Expo)

### ✅ 프론트엔드 실행

**방법 1: npm 스크립트 (권장)**
```bash
npm run frontend:dev
```

**방법 2: 직접 실행**
```bash
# 프로젝트 루트에서
cd frontend
npx expo start
```

**방법 3: 터널링 모드**
```bash
cd frontend
npx expo start --tunnel
```

### 📱 프론트엔드 서버 정보

- **포트**: 8081
- **웹 주소**: http://localhost:8081
- **QR 코드**: 터미널에 표시
- **Expo Go**: 모바일 앱에서 QR 스캔

### 🛑 프론트엔드 종료

**방법 1: 키보드 단축키**
```bash
Ctrl + C  # 터미널에서
```

**방법 2: 프로세스 종료**
```powershell
# Node.js 프로세스 모두 종료
taskkill /f /im node.exe

# 특정 포트 사용 프로세스 종료
netstat -ano | findstr ":8081" | foreach { ($_ -split '\s+')[-1] } | ForEach-Object { taskkill /f /pid $_ }
```

---

## 🛑 서버 종료 방법

### 1️⃣ 일반 종료 (권장)

```bash
# 터미널에서 실행 중일 때
Ctrl + C
```

### 2️⃣ 모든 서버 강제 종료

**PowerShell에서:**
```powershell
# 백엔드 + 프론트엔드 한 번에 종료
taskkill /f /im python.exe; taskkill /f /im node.exe

# 성공 메시지 확인
Write-Host "✅ 모든 서버 종료 완료" -ForegroundColor Green
```

### 3️⃣ 포트별 강제 종료

```powershell
# 포트 8000 사용 프로세스 종료 (백엔드)
$pids = netstat -ano | findstr ":8000" | foreach { ($_ -split '\s+')[-1] }
$pids | ForEach-Object { taskkill /f /pid $_ }

# 포트 8081 사용 프로세스 종료 (프론트엔드)
$pids = netstat -ano | findstr ":8081" | foreach { ($_ -split '\s+')[-1] }
$pids | ForEach-Object { taskkill /f /pid $_ }
```

### 4️⃣ 완전 정리 스크립트

```powershell
# 모든 개발 서버 완전 종료
function Stop-DevServers {
    Write-Host "🛑 개발 서버 종료 중..." -ForegroundColor Yellow
    
    # Python 프로세스 종료
    taskkill /f /im python.exe 2>$null
    Write-Host "✅ 백엔드 서버 종료됨" -ForegroundColor Green
    
    # Node.js 프로세스 종료
    taskkill /f /im node.exe 2>$null
    Write-Host "✅ 프론트엔드 서버 종료됨" -ForegroundColor Green
    
    # 포트 정리
    @(8000, 8081) | ForEach-Object {
        $port = $_
        $pids = netstat -ano | findstr ":$port " | foreach { ($_ -split '\s+')[-1] } | Sort-Object -Unique
        $pids | ForEach-Object { taskkill /f /pid $_ 2>$null }
    }
    
    Write-Host "🎯 모든 서버 종료 완료!" -ForegroundColor Magenta
}

# 실행
Stop-DevServers
```

---

## 🔌 포트 관리

### 현재 사용 중인 포트 확인

```powershell
# 8000, 8081 포트 사용 현황
netstat -ano | findstr ":8000 :8081"

# 모든 포트 사용 현황
netstat -ano | more
```

### 특정 포트 해제

```powershell
# 포트 8000 해제
netstat -ano | findstr ":8000" | foreach { taskkill /f /pid ($_ -split '\s+')[-1] }

# 포트 8081 해제
netstat -ano | findstr ":8081" | foreach { taskkill /f /pid ($_ -split '\s+')[-1] }
```

---

## 🚨 트러블슈팅

### 문제 1: 포트가 이미 사용 중

**에러 메시지:**
```
Error: listen EADDRINUSE: address already in use :::8000
```

**해결방법:**
```powershell
# 해당 포트 사용 프로세스 찾기
netstat -ano | findstr ":8000"

# PID 확인 후 종료
taskkill /f /pid [PID번호]
```

### 문제 2: Python 가상환경 활성화 실패

**에러 메시지:**
```
이 시스템에서 스크립트를 실행할 수 없으므로...
```

**해결방법:**
```powershell
# PowerShell 실행 정책 변경
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 다시 가상환경 활성화
.\venv\Scripts\Activate.ps1
```

### 문제 3: Expo 서버 시작 실패

**해결방법:**
```bash
# 캐시 클리어 후 재시작
npx expo r -c

# 또는 완전 재설치
rm -rf node_modules
npm install
npx expo start
```

### 문제 4: 백엔드 모듈 import 에러

**해결방법:**
```powershell
# PYTHONPATH 설정 확인
$env:PYTHONPATH="D:\PaceTry\backend"

# 가상환경에서 실행
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

---

## 📋 빠른 참조 명령어

### 🚀 시작 명령어

| 용도 | 명령어 |
|------|--------|
| 통합 실행 | `npm run dev` |
| 백엔드만 | `npm run backend:dev` |
| 프론트엔드만 | `npm run frontend:dev` |

### 🛑 종료 명령어

| 용도 | 명령어 |
|------|--------|
| 일반 종료 | `Ctrl + C` |
| Python 종료 | `taskkill /f /im python.exe` |
| Node.js 종료 | `taskkill /f /im node.exe` |
| 모든 서버 종료 | `taskkill /f /im python.exe; taskkill /f /im node.exe` |

### 🔍 상태 확인

| 용도 | 명령어 |
|------|--------|
| 포트 사용 현황 | `netstat -ano \| findstr ":8000 :8081"` |
| 백엔드 Health Check | `curl http://127.0.0.1:8000/health` |
| 프론트엔드 접속 | 브라우저에서 `http://localhost:8081` |

---

## �️ 터미널 선택 가이드

### 🏆 권장: PowerShell

| 기능 | PowerShell | CMD |
|------|------------|-----|
| npm 명령어 | ✅ 완벽 지원 | ✅ 지원 |
| 가상환경 활성화 | ✅ `.ps1` 스크립트 | ⚠️ `.bat` 필요 |
| 프로세스 관리 | ✅ 강력한 기능 | ⚠️ 제한적 |
| 자동완성 | ✅ 우수 | ❌ 제한적 |
| 색상 출력 | ✅ 지원 | ❌ 제한적 |
| 한글 처리 | ✅ 안정적 | ❌ 문제 있음 |

### 💡 PowerShell 장점
- **더 강력한 명령어**: `Get-Process`, `Stop-Process` 등
- **객체 기반**: 파이프라인이 더 효율적
- **최신 표준**: Windows 10/11 기본 터미널
- **VS Code 통합**: 완벽한 통합 지원

### ⚠️ CMD 사용 시 주의사항
```cmd
# PowerShell 명령어를 CMD로 변환
.\venv\Scripts\Activate.ps1  →  venv\Scripts\activate.bat
taskkill /f /im python.exe   →  동일하게 사용 가능
```

---

## 💡 개발 팁

1. **터미널 선택**: PowerShell 사용 권장 🏆
2. **개발 시작할 때**: 터미널 2개로 백엔드/프론트엔드 개별 실행
3. **종료할 때**: `Ctrl + C` 한 번이면 모든 서버 종료
4. **문제 발생 시**: 강제 종료 후 다시 시작
5. **포트 충돌 시**: 해당 포트 사용 프로세스 먼저 종료
6. **QR 코드 확인**: 프론트엔드만 따로 실행하면 잘 보임

이 가이드를 북마크해두시고 필요할 때마다 참조하세요! 🎯