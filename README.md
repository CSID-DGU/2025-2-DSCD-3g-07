# 🚶‍♂️ PaceTry

개인의 보행 속도에 맞춘 개인화된 교통 경로 안내 앱

## 📱 소개

PaceTry는 사용자의 건강 데이터와 보행 패턴을 분석하여 개인에게 최적화된 교통 경로를 제공하는 React Native 기반의 모바일 애플리케이션입니다.

### 🌟 주요 기능

- **🏥 Health Connect 통합**: 안드로이드 Health Connect와 연동하여 보행 속도 데이터 수집
- **🗺️ 개인화된 경로 안내**: 
  - 사용자의 실제 보행 속도를 반영한 맞춤형 경로 시간 예측
  - 경사도 분석 (Tobler's Hiking Function 적용)
  - 실시간 날씨 영향 반영 (기온, 강수, 적설)
  - 횡단보도 위치 및 신호 대기 시간 고려
- **📊 자동 보행 속도 보정**: 
  - 경로 안내 사용 기록 기반 자동 학습
  - GPS + 가속도계 센서 융합으로 정확한 실제 보행 시간 측정
  - 가중 평균 (7:3) 방식의 점진적 속도 업데이트
- **🚶 백그라운드 위치 추적**: 앱이 백그라운드에 있어도 정확한 보행 기록 유지
- **🔒 데이터 보안**: 건강 데이터 로컬 저장 및 개인정보 보호

## 🏗️ 아키텍처

```
PaceTry/
├── frontend/          # React Native (Expo)
├── backend/           # FastAPI (Python)
├── docs/             # 문서
└── scripts/          # 빌드 및 배포 스크립트
```

## 🚀 빠른 시작

### 필요한 도구

- **Node.js** >= 18.0.0
- **Python** >= 3.11
- **npm** >= 9.0.0
- **Android Studio** (Android 개발용)
- **Expo CLI**
- **PostgreSQL** (프로덕션 DB)
- **Google Elevation API Key**
- **기상청 API Key**
- **TMAP API Key**
- **Kakao API Key**

### 설치

1. **저장소 클론**
```bash
git clone https://github.com/CSID-DGU/2025-2-DSCD-3g-07.git
cd 2025-2-DSCD-3g-07
```

2. **Frontend 설정**
```bash
cd frontend
npm install

# .env 파일 생성 및 API 키 설정
cp .env.example .env.local
# EXPO_PUBLIC_API_BASE_URL, KAKAO_JS_KEY 등 설정

# Android 네이티브 빌드 (첫 실행 시)
npx expo prebuild
```

3. **Backend 설정**
```bash
cd backend
pip install -r requirements.txt

# .env 파일 생성 및 설정
# DATABASE_URL, API 키 등 설정

# 데이터베이스 초기화
python -c "from app.database import engine, Base; Base.metadata.create_all(bind=engine)"
```

4. **개발 서버 실행**

**Backend:**
```bash
cd backend
python run.py
# http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npx expo start

# Android 실행
npx expo run:android
```

## 📱 개발 가이드

### Frontend (React Native + Expo)

```bash
cd frontend

# 개발 서버 시작
npx expo start

# Android 앱 빌드 및 실행
npx expo run:android

# 타입 체크
npm run type-check
```

### Backend (FastAPI)

```bash
cd backend

# 개발 서버 시작
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 테스트 실행
python -m pytest

# API 문서 확인
# http://localhost:8000/docs
```

## 🔧 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run setup` | 전체 프로젝트 초기 설정 |
| `npm run dev` | 로컬 개발 모드 |
| `npm run dev:tunnel` | 터널링 개발 모드 |
| `npm run test:all` | 전체 테스트 실행 |
| `npm run lint:all` | 전체 린팅 |
| `npm run format:all` | 코드 포맷팅 |
| `npm run clean:all` | 캐시 정리 |

## 🏥 Health Connect 설정

### Android 요구사항

- **최소 SDK**: 26 (Android 8.0)
- **권장 SDK**: 34 (Android 14+)
- **Health Connect 앱** 설치 필요 ([Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata))

### 권한 설정

앱에서 다음 건강 데이터에 대한 권한을 요청합니다:

- **걸음 수** (Steps): 일일 활동량 추적
- **이동 거리** (Distance): 보행 거리 측정
- **보행 속도** (Speed): 실시간 보행 속도 분석
- **소모 칼로리** (Active Calories): 에너지 소비 계산
- **운동 세션** (Exercise): 운동 패턴 분석

### 주요 기능

- **전체 기간 데이터 분석**: 최대 10년간의 보행 데이터로 정확한 평균 속도 계산
- **두 가지 속도 프로필**:
  - Case 1 (≥2.5 km/h): 경로 안내용 - 목적지가 있는 빠른 걸음
  - Case 2 (≥1.5 km/h): 코스 추천용 - 산책 포함 여유로운 걸음
- **자동 fallback**: Health Connect 없이도 앱 사용 가능 (기본 속도 4km/h)

## 🛠️ 기술 스택

### Frontend
- **React Native** + **Expo** (SDK 52)
- **TypeScript**
- **React Native Health Connect** (안드로이드 건강 데이터)
- **Expo Location** + **Expo Task Manager** (백그라운드 위치 추적)
- **Expo Sensors** (가속도계)
- **Kakao Map** (지도 표시)

### Backend
- **FastAPI** (Python 3.11)
- **SQLAlchemy** + **PostgreSQL** (데이터베이스)
- **Pydantic** (데이터 검증)
- **TMAP API** (경로 탐색)
- **Google Elevation API** (고도 데이터)
- **기상청 단기예보 API** (날씨 정보)

### 핵심 알고리즘
- **Tobler's Hiking Function**: 경사도에 따른 보행 속도 계산
- **WeatherSpeedModel**: 날씨가 보행 속도에 미치는 영향 분석
- **가중 평균 학습**: 기존 70% + 새 데이터 30% 비율로 점진적 업데이트

### DevOps
- **GitHub Actions** (CI/CD)
- **ESLint** + **Prettier** (코드 품질)
- **Jest** + **pytest** (테스트)

## 📊 API 문서

개발 서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

- `POST /api/auth/register` - 회원가입 (Health Connect 자동 연동)
- `POST /api/auth/login` - 로그인
- `GET /api/personalization/speed` - 사용자 보행 속도 프로필 조회
- `PUT /api/personalization/speed` - 보행 속도 수동 업데이트
- `POST /api/routes/analyze-slope` - 경로 경사도 분석
- `POST /api/weather/predict-speed` - 날씨 기반 속도 예측
- `POST /api/navigation/logs` - 경로 안내 기록 저장
- `GET /api/navigation/logs/statistics/summary` - 사용 통계

## 🤝 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

### 코드 스타일

```bash
# 코드 포맷팅
npm run format:all

# 린팅
npm run lint:all

# 타입 체크
npm run type-check:all
```

## 👥 팀

- **Frontend**: React Native + Health Connect 통합
- **Backend**: FastAPI + AI 경로 최적화
- **DevOps**: CI/CD + 배포 자동화

## 🐛 문제 신고

버그나 기능 요청은 [GitHub Issues](https://github.com/your-username/pacetry/issues)에서 신고해 주세요.

## 📚 주요 문서

- [`docs/INTEGRATED_WALKING_SPEED_SYSTEM.md`](docs/INTEGRATED_WALKING_SPEED_SYSTEM.md) - 보행속도 통합 계산 시스템
- [`docs/NAVIGATION_LOG_SYSTEM.md`](docs/NAVIGATION_LOG_SYSTEM.md) - 네비게이션 로그 시스템
- [`docs/TOBLER_MIGRATION_REPORT.md`](docs/TOBLER_MIGRATION_REPORT.md) - Tobler's Function 적용 보고서
- [`docs/kma-api-quick-guide.md`](docs/kma-api-quick-guide.md) - 기상청 API 가이드
- [`docs/elevation-api-guide.md`](docs/elevation-api-guide.md) - Google Elevation API 가이드

## 🔗 링크

- **GitHub**: [CSID-DGU/2025-2-DSCD-3g-07](https://github.com/CSID-DGU/2025-2-DSCD-3g-07)
- **API 문서**: [Swagger UI](http://localhost:8000/docs)
- **Health Connect**: [Android 공식 문서](https://developer.android.com/health-and-fitness/guides/health-connect)
- **TMAP API**: [SK Open API](https://openapi.sk.com/)

## 🎓 프로젝트 정보

- **과목**: 데이터 사이언스 캡스톤 디자인
- **팀**: 3g-07
- **기간**: 2025년 2학기
- **소속**: 동국대학교 데이터사이언스소프트웨어 연계전공

---

**PaceTry Team** - 개인화된 보행 경험을 위한 혁신적인 솔루션 🚶‍♂️
