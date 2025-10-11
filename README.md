# 🚶‍♂️ PaceTry

개인의 보행 속도에 맞춘 개인화된 교통 경로 안내 앱

## 📱 소개

PaceTry는 사용자의 건강 데이터와 보행 패턴을 분석하여 개인에게 최적화된 교통 경로를 제공하는 React Native 기반의 모바일 애플리케이션입니다.

### 🌟 주요 기능

- **🏥 Health Connect 통합**: Samsung Health와 연동하여 실시간 건강 데이터 수집
- **🗺️ 개인화된 경로**: 사용자의 보행 속도와 피로도를 고려한 맞춤형 교통 경로
- **📊 실시간 분석**: AI 기반 개인 데이터 분석 및 경로 추천
- **🔒 데이터 보안**: 건강 데이터 암호화 및 개인정보 보호

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

- **Node.js** >= 16.0.0
- **Python** >= 3.8
- **npm** >= 8.0.0
- **Android Studio** (Android 개발용)
- **Expo CLI**

### 설치

1. **저장소 클론**
```bash
git clone https://github.com/your-username/pacetry.git
cd pacetry
```

2. **의존성 설치**
```bash
npm run setup
```

3. **환경 설정**
```bash
# Frontend 환경 설정
cp frontend/.env.example frontend/.env.local

# Backend 환경 설정
cp backend/.env.example backend/.env
```

4. **개발 서버 실행**

**로컬 개발 (같은 네트워크):**
```bash
npm run dev
```

**원격 협업 (터널링):**
```bash
npm run dev:tunnel
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
- **Health Connect 앱** 설치 필요

### 권한 설정

앱에서 다음 건강 데이터에 대한 권한을 요청합니다:

- 걸음 수
- 이동 거리
- 소모 칼로리
- 심박수
- 운동 세션
- 수면 데이터

## 🛠️ 기술 스택

### Frontend
- **React Native** + **Expo**
- **TypeScript**
- **Health Connect SDK**
- **React Navigation**

### Backend
- **FastAPI** (Python)
- **Pydantic** (데이터 검증)
- **TMAP API** (교통 정보)
- **SQLite** (개발용 DB)

### DevOps
- **GitHub Actions** (CI/CD)
- **ESLint** + **Prettier** (코드 품질)
- **Jest** + **pytest** (테스트)

## 📊 API 문서

개발 서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

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

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 👥 팀

- **Frontend**: React Native + Health Connect 통합
- **Backend**: FastAPI + AI 경로 최적화
- **DevOps**: CI/CD + 배포 자동화

## 🐛 문제 신고

버그나 기능 요청은 [GitHub Issues](https://github.com/your-username/pacetry/issues)에서 신고해 주세요.

## 🔗 링크

- **API 문서**: [Swagger UI](http://localhost:8000/docs)
- **Health Connect**: [Android 공식 문서](https://developer.android.com/health-and-fitness/guides/health-connect)
- **TMAP API**: [SK Open API](https://openapi.sk.com/)

---

**PaceTry Team** - 개인화된 보행 경험을 위한 혁신적인 솔루션 💚
