# PaceTry - 보행 속도 개인화 앱 🚶‍♂️

![PaceTry Logo](https://via.placeholder.com/200x80/2C6DE7/FFFFFF?text=PaceTry)

보행자의 개인적 특성(나이, 피로도)을 고려하여 최적화된 경로와 시간을 제공하는 모바일 애플리케이션입니다.

## 🏗️ 프로젝트 구조

```
PaceTry/
├── 📱 frontend/          # React Native (Expo) 모바일 앱
├── 🐍 backend/           # FastAPI 서버 + 머신러닝 모델
├── 📋 scripts/           # 개발 도구 스크립트
├── 🔧 .vscode/          # VSCode 설정
├── 🚀 .github/          # CI/CD 워크플로우
└── 📦 package.json      # 통합 프로젝트 관리
```

## ✨ 주요 기능

### 🎯 **개인화된 경로 최적화**
- 사용자 나이와 피로도를 고려한 보행 시간 조정
- 머신러닝 기반 개인화 모델
- 실시간 T맵 API 연동

### 📱 **모바일 앱 기능**
- 직관적인 경로 검색 인터페이스
- 실시간 위치 기반 서비스
- API 연동 테스트 화면
- 카카오맵 통합

### 🤖 **AI/ML 기능**
- 개인 보행 패턴 학습
- 피로도 기반 시간 예측
- 지속적인 모델 업데이트

## 🚀 빠른 시작

### 📋 **시스템 요구사항**
- **Node.js** 16+ 
- **Python** 3.9+
- **Git**
- **Expo CLI** (자동 설치)

### ⚡ **원클릭 설치 및 실행**

```bash
# 1. 프로젝트 클론
git clone https://github.com/your-username/pacetry.git
cd pacetry

# 2. 모든 의존성 설치
npm run install:all

# 3. 개발 환경 시작 (Backend + Frontend 동시 실행)
npm run dev
```

### 🔧 **개별 실행**

#### Backend (FastAPI 서버)
```bash
npm run backend:dev
```
- 🌐 서버: http://127.0.0.1:8000
- 📚 API 문서: http://127.0.0.1:8000/docs
- 📖 ReDoc: http://127.0.0.1:8000/redoc

#### Frontend (Expo 앱)
```bash
npm run frontend:dev
```
- 📱 Expo QR 코드로 모바일에서 테스트
- 🌐 웹 버전: http://localhost:19006

### 🎮 **배치 스크립트 (Windows)**
```cmd
# 통합 개발 환경
.\scripts\start-dev.bat

# Backend만 실행
.\scripts\start-backend.bat

# Frontend만 실행  
.\scripts\start-frontend.bat

# 환경 체크
.\scripts\check-env.bat
```

## 🔧 개발 가이드

### 📝 **코드 품질 관리**

```bash
# 전체 테스트 실행
npm run test:all

# 코드 품질 검사
npm run lint:all

# 자동 코드 포맷팅
npm run format:all

# 타입 체크
npm run type-check:all

# 통합 품질 검사
.\scripts\quality-check.bat
```

### 🧪 **테스트 커버리지**
- Backend: 11개 테스트 케이스
- API 엔드포인트 검증
- 파라미터 유효성 검사
- 에러 처리 테스트

### 📊 **코드 품질 지표**
- **Linting**: Flake8 (Python) + ESLint (TypeScript)
- **Formatting**: Black (Python) + Prettier (TypeScript)
- **Type Checking**: MyPy (Python) + TypeScript
- **Security**: Bandit (Python)

## 📚 API 문서

### 🔍 **주요 엔드포인트**

| 엔드포인트 | 메소드 | 설명 |
|-----------|--------|------|
| `/health` | GET | 서버 상태 확인 |
| `/transit-route` | GET | 개인화된 경로 검색 |
| `/docs` | GET | Swagger UI |
| `/redoc` | GET | ReDoc 문서 |

### 📋 **API 사용 예제**

```bash
# Health Check
curl http://127.0.0.1:8000/health

# 경로 검색 (서울역 → 강남역)
curl "http://127.0.0.1:8000/transit-route?start_x=126.9706&start_y=37.5547&end_x=127.0276&end_y=37.4979&user_age=25&fatigue_level=3"
```

## 🏛️ 아키텍처

### 🎯 **Backend 아키텍처**
```
FastAPI Server
├── 🌐 API Layer (CORS, 라우팅)
├── 🧠 ML Layer (개인화 모델)
├── 🗺️ External API (T맵 연동)
└── 📊 Data Layer (CSV, PKL)
```

### 📱 **Frontend 아키텍처**
```
React Native (Expo)
├── 🎨 UI Components
├── 🔗 API Services  
├── 🗺️ Map Integration (Kakao)
└── 📦 State Management
```

## 🔧 개발자 도구

### 📝 **VSCode 설정**
프로젝트는 VSCode 멀티 워크스페이스로 구성되어 있습니다:

```bash
# VSCode 워크스페이스 열기
code pacetry.code-workspace
```

**포함된 설정:**
- Python 가상환경 자동 감지
- 자동 포맷팅 (저장 시)
- 통합 디버깅 설정
- 권장 확장 프로그램

### ⚡ **개발 태스크**
- `Ctrl+Shift+P` → "Tasks: Run Task"
- 🚀 Start Development (Both)
- 🐍 Start Backend Only
- 📱 Start Frontend Only

## 🚀 배포 가이드

### 🐳 **Docker (예정)**
```bash
# Backend 컨테이너
docker build -t pacetry-backend ./backend
docker run -p 8000:8000 pacetry-backend

# Frontend 빌드
cd frontend && npm run build
```

### ☁️ **클라우드 배포**
- **Backend**: Heroku, AWS Lambda, Google Cloud Run
- **Frontend**: Expo Application Services (EAS)

## 🤝 기여하기

### 📋 **기여 가이드라인**
1. 🍴 Fork the repository
2. 🌟 Create feature branch (`git checkout -b feature/amazing-feature`)
3. 📝 Commit changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to branch (`git push origin feature/amazing-feature`)
5. 🔄 Open a Pull Request

### 📏 **코드 스타일**
- Python: Black + Flake8 + isort
- TypeScript: Prettier + ESLint
- 커밋 메시지: [Conventional Commits](https://conventionalcommits.org/)

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 👥 팀

- **PaceTry Team** - [GitHub](https://github.com/your-username)

## 📞 지원

- 🐛 **버그 리포트**: [Issues](https://github.com/your-username/pacetry/issues)
- 💡 **기능 요청**: [Discussions](https://github.com/your-username/pacetry/discussions)
- 📧 **이메일**: contact@pacetry.com

---

<div align="center">
  <p>Made with ❤️ by PaceTry Team</p>
  <p>🚶‍♂️ 더 나은 보행 경험을 위해</p>
</div>