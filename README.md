# 🏃 PaceTry - 개인 맞춤형 보행·러닝 길찾기 서비스

![PaceTry Logo](https://via.placeholder.com/200x80/2C6DE7/FFFFFF?text=PaceTry)

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Machine Learning](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)

**당신의 걸음에 맞춘 똑똑한 길안내와 운동 코스를 경험하세요.**

개인의 보행 속도, 신체 특성(나이, 피로도), 환경 조건을 종합적으로 고려하여 정확한 이동 시간을 예측하고, 사용자 맞춤형 경로를 추천하는 모바일 애플리케이션입니다.

---

## 📌 프로젝트 소개

PaceTry는 기존 지도 서비스의 획일적인 평균 속도 기반 예측을 넘어, **머신러닝 기반 개인화 모델**을 통해 더 정확하고 신뢰할 수 있는 길안내를 제공합니다.

### 🎯 핵심 문제 해결

- ❌ **기존 문제**: 모든 사람에게 동일한 평균 속도(시속 4km) 적용
- ✅ **PaceTry 해결**: 개인의 나이, 피로도, 보행 패턴을 반영한 정밀 예측

## 🏗️ 프로젝트 구조

```
PaceTry/
├── 📱 frontend/          # React Native (Expo) 모바일 앱
│   ├── app/             # 파일 기반 라우팅 (Expo Router)
│   ├── components/      # 재사용 가능한 컴포넌트
│   ├── services/        # API 서비스 레이어
│   └── assets/          # 이미지, 아이콘 등
├── 🐍 backend/           # FastAPI 서버 + 머신러닝 모델
│   ├── app/             # FastAPI 애플리케이션
│   ├── utils/           # API 헬퍼, ML 헬퍼
│   └── tests/           # 백엔드 테스트 코드
├── 📋 scripts/           # 개발 도구 스크립트
├── 📚 docs/             # 프로젝트 문서
├── 🔧 .vscode/          # VSCode 설정
├── 🚀 .github/          # CI/CD 워크플로우
└── 📦 package.json      # Monorepo 통합 관리
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
- 🌐 서버: http://192.168.35.52:8000 (네트워크 접근 가능)
- 🏠 로컬: http://127.0.0.1:8000
- 📚 API 문서: http://192.168.35.52:8000/docs
- 📖 ReDoc: http://192.168.35.52:8000/redoc

#### Frontend (Expo 앱)
```bash
npm run frontend:dev
```
- 📱 Expo Go: QR 코드 스캔으로 모바일 테스트
- 🌐 웹 버전: http://localhost:8081 (또는 8082)
- 🔄 Development Build 지원

#### 전체 개발 환경 (Backend + Frontend)
```bash
npm run dev
```
- 🚀 백엔드와 프론트엔드 동시 실행
- 📱 모바일 테스트: `s` 키로 Expo Go 모드 전환
- 🌐 웹 테스트: 새 터미널에서 `npm run frontend:dev` 후 `w` 키

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
curl http://192.168.35.52:8000/health

# 경로 검색 (서울역 → 강남역, 개인화 적용)
curl "http://192.168.35.52:8000/transit-route?start_x=126.9706&start_y=37.5547&end_x=127.0276&end_y=37.4979&user_age=25&fatigue_level=2&user_id=test_user"
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
### 1. 🚶‍♂️ 개인화된 대중교통 경로 검색

- **머신러닝 기반 보행 시간 예측**: 사용자의 나이, 피로도를 고려한 개인별 adjustment factor 계산
- **T맵 API 연동**: 실시간 대중교통 경로 정보 제공
- **카카오맵 시각화**: 직관적인 지도 인터페이스

### 2. 🧠 개인화 모델

- **LinearRegression 모델**: 개인 특성 기반 보행 시간 조정
- **실시간 학습**: 사용자 행동 패턴 지속적 학습
- **정확도 경고**: 예측 신뢰도에 따른 알림 제공

### 3. 📱 크로스 플랫폼 모바일 앱

- **Expo Go 지원**: 빠른 개발 및 테스트 환경
- **Development Build**: 네이티브 모듈 지원
- **실시간 Hot Reload**: 개발 효율성 극대화

### 4. 🔧 개발자 친화적 환경

- **Monorepo 구조**: Frontend + Backend 통합 관리
- **자동화 스크립트**: 빌드, 테스트, 배포 자동화
- **타입 안전성**: TypeScript + Python 타입 힌트

---

## 🛠️ 기술 스택

### Frontend (React Native + Expo)

- **React Native + Expo**: 크로스 플랫폼 모바일 개발
- **Expo Router**: 파일 기반 네비게이션
- **TypeScript**: 타입 안전성 보장
- **카카오맵 WebView**: 지도 시각화

### Backend

- **FastAPI**: 고성능 Python 웹 프레임워크
- **SQLAlchemy**: ORM (Object-Relational Mapping)
- **PostgreSQL**: 관계형 데이터베이스
- **JWT**: 사용자 인증

### External APIs

- **Tmap 대중교통 API**: 경로 탐색 기본 데이터
- **카카오맵 API**: 지도 시각화
- **Google Elevation API**: 경로 고도 데이터
- **OpenRouteService API**: 운동 코스 생성
- **기상청 실시간 API**: 날씨 정보

### Infrastructure

- **AWS EC2**: 백엔드 서버 배포
- **AWS RDS**: PostgreSQL 호스팅
- **GitHub**: 버전 관리 및 협업

---

## 🏗️ 시스템 아키텍처

### 📱 Frontend

```
React Native Mobile App (iOS/Android)
         │
         │ REST API (Axios)
         ↓
```

### 🔧 Backend

```
FastAPI Server
    ├─→ PostgreSQL Database (사용자 데이터, 활동 기록)
    │
    └─→ External APIs
        ├─ Tmap 대중교통 API (경로 탐색)
        ├─ 카카오맵 API (지도 시각화)
        ├─ Google Elevation API (고도 데이터)
        ├─ OpenRouteService API (코스 생성)
        └─ 기상청 실시간 API (날씨 정보)
```

### 🔄 데이터 흐름

1. **사용자 입력** → React Native App
2. **API 요청** → FastAPI Backend
3. **데이터 처리** → PostgreSQL + External APIs
4. **응답 반환** → 개인화된 결과 제공

---

## 📱 주요 화면

### 1. 홈 화면

- 실시간 개인 맞춤형 길찾기
- 오늘의 추천 운동 코스

### 2. 경로 탐색 화면

- 지도 기반 경로 시각화
- 개인화된 예상 도착 시간
- 경사도·날씨 정보 표시

### 3. 코스 추천 화면

- 목표 시간/거리 입력
- 다양한 코스 옵션 제시
- 난이도 및 환경 정보

### 4. 프로필 화면

- 개인 보행 속도 통계
- 활동 이력 및 분석
- 설정 관리

---

## 🚀 설치 및 실행

### Prerequisites

- Node.js v18 이상
- Python 3.9 이상
- PostgreSQL 13 이상
- Expo CLI

### Frontend 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/pacetry.git
cd pacetry/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npx expo start
```

### Backend 실행

```bash
cd pacetry/backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에 DB 정보 및 API 키 입력

# 데이터베이스 마이그레이션
alembic upgrade head

# 서버 실행
uvicorn main:app --reload
```

---

## 📈 개발 로드맵

### Phase 1: 기초 구축 (Week 1-4)

- [x] 프로젝트 환경 설정
- [x] AWS 인프라 구축
- [x] 기본 CRUD API 개발

### Phase 2: 핵심 기능 (Week 5-8)

- [x] 사용자 인증 시스템
- [x] 개인 맞춤형 ETA 알고리즘
- [ ] 경사도·날씨 반영 로직

### Phase 3: 코스 추천 (Week 9-12)

- [ ] OpenRouteService 연동
- [ ] 목표 기반 코스 생성
- [ ] UI/UX 개선

### Phase 4: 테스트 및 배포 (Week 13-15)

- [ ] 통합 테스트
- [ ] 성능 최적화
- [ ] 프로덕션 배포

---

## 👥 팀원

| 이름   | 역할          | 학과 |
|--------|---------------|--------|
| 한승민 | Frontend (팀장)     | 산업시스템공학과 |
| 김영현 | Frontend (팀원)      | 경영정보학과 |
| 박세희 | DevOps (팀원)        | 산업시스템공학과 |
| 오현식 | Backend (팀원)       | 경영정보학과 |

---

## 📊 성과 지표

- **ETA 정확도**: 평균 오차율 ≤ 10% 목표
- **코스 추천 만족도**: ≥ 80% 목표
- **API 응답 속도**: ≤ 3초
- **사용자 경험(SUS)**: ≥ 70점

---

## 📞 문의

프로젝트에 대한 문의사항이나 제안은 이슈를 통해 남겨주세요!

---

## 👥 팀 정보

**CSID-DGU 2025-2-DSCD-3g-07팀**

이 프로젝트는 동국대학교 컴퓨터공학과 데이터사이언스 프로젝트의 일환으로 개발되었습니다.

---

## 📝 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
