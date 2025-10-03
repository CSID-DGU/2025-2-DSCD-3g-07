# 개발 워크플로우 가이드

## 🔄 PaceTry 프로젝트 개발 워크플로우

이 가이드는 PaceTry 프로젝트의 효율적인 개발 워크플로우를 설명합니다.

## 📋 목차

- [개발 환경 구성](#개발-환경-구성)
- [일일 개발 플로우](#일일-개발-플로우)
- [브랜치 전략](#브랜치-전략)
- [코드 품질 관리](#코드-품질-관리)
- [테스트 전략](#테스트-전략)
- [CI/CD 파이프라인](#cicd-파이프라인)
- [배포 프로세스](#배포-프로세스)

## 🛠️ 개발 환경 구성

### 1. 초기 설정

```bash
# 프로젝트 클론
git clone <repository-url>
cd PaceTry

# 종속성 설치
npm install

# Backend 환경 설정
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 API 키 설정
```

### 2. IDE 설정 (VS Code)

**필수 확장 프로그램:**
- Python
- Pylance
- ES7+ React/Redux/React-Native snippets
- Expo Tools
- GitLens
- Prettier - Code formatter
- ESLint

**권장 설정** (`.vscode/settings.json`에 이미 구성됨):
- 자동 저장
- 포맷터 자동 실행
- Python 환경 자동 감지

### 3. 개발 서버 실행

```bash
# 전체 프로젝트 개발 모드 (병렬 실행)
npm run dev

# 개별 실행
npm run backend:dev   # Backend 서버
npm run frontend:dev  # Frontend 앱
```

## 📅 일일 개발 플로우

### 아침 루틴

```bash
# 1. 최신 코드 동기화
git pull origin main

# 2. 의존성 업데이트 확인
npm install
cd backend && pip install -r requirements.txt

# 3. 개발 서버 실행
npm run dev

# 4. Health Check 확인
# Frontend에서 API Test 탭 확인
# 또는 http://127.0.0.1:8000/docs 접속
```

### 개발 중 체크리스트

**코드 작성 전:**
- [ ] 기능 브랜치 생성
- [ ] 이슈 번호 확인

**코드 작성 중:**
- [ ] 커밋 단위는 작고 의미있게
- [ ] 테스트 코드 함께 작성
- [ ] 린트 에러 실시간 수정

**코드 작성 후:**
- [ ] 품질 검사 실행
- [ ] 테스트 통과 확인
- [ ] 문서 업데이트

### 저녁 루틴

```bash
# 1. 품질 검사
npm run quality:check

# 2. 테스트 실행
npm run test:all

# 3. 커밋 및 푸시
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin feature/new-feature
```

## 🌿 브랜치 전략

### Git Flow 기반 브랜칭

```
main (production)
├── develop (development)
├── feature/api-optimization
├── feature/ui-improvement
├── hotfix/critical-bug
└── release/v1.0.0
```

### 브랜치 명명 규칙

**Feature 브랜치:**
- `feature/api-optimization`
- `feature/kakao-map-integration`
- `feature/user-authentication`

**Bug Fix 브랜치:**
- `bugfix/route-calculation-error`
- `bugfix/map-rendering-issue`

**Hotfix 브랜치:**
- `hotfix/security-patch`
- `hotfix/critical-crash`

### 브랜치 워크플로우

```bash
# 1. Feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/new-api-endpoint

# 2. 개발 작업
# ... 코딩 ...

# 3. 정기적으로 develop와 동기화
git checkout develop
git pull origin develop
git checkout feature/new-api-endpoint
git merge develop

# 4. Pull Request 생성
git push origin feature/new-api-endpoint
# GitHub에서 PR 생성

# 5. 코드 리뷰 후 병합
# Squash and merge to develop
```

## 🔍 코드 품질 관리

### 품질 검사 명령어

```bash
# 전체 품질 검사
npm run quality:check

# 개별 검사
npm run lint:all      # 린트 검사
npm run format:all    # 포맷팅 적용
npm run type:check    # 타입 검사
```

### Pre-commit Hook (Husky 설정 시)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.py": ["flake8", "black", "isort"]
  }
}
```

### 코드 리뷰 체크리스트

**Python (Backend):**
- [ ] PEP 8 스타일 가이드 준수
- [ ] Type hints 사용
- [ ] Docstring 작성
- [ ] 예외 처리 적절성
- [ ] 보안 취약점 확인

**TypeScript (Frontend):**
- [ ] ESLint 규칙 준수
- [ ] 타입 안전성 확보
- [ ] Component 구조 적절성
- [ ] 성능 최적화 고려
- [ ] 접근성 고려

## 🧪 테스트 전략

### 테스트 피라미드

```
        E2E Tests (Slow, Expensive)
      /                            \
   Integration Tests (Medium)
  /                              \
Unit Tests (Fast, Cheap)
```

### 테스트 실행

```bash
# 모든 테스트 실행
npm run test:all

# Backend 테스트
npm run backend:test

# Frontend 테스트 (구현 예정)
npm run frontend:test

# 테스트 커버리지
npm run test:coverage
```

### 테스트 작성 가이드

**Backend 단위 테스트:**
```python
def test_personalization_model_prediction():
    """개인화 모델 예측 테스트"""
    model = load_personalization_model()
    result = model.predict([[25, 3]])  # age=25, fatigue=3
    assert isinstance(result, np.ndarray)
    assert len(result) == 1
```

**Frontend 컴포넌트 테스트 (예정):**
```typescript
describe('ApiTestComponent', () => {
  it('should display health check button', () => {
    render(<ApiTestComponent />);
    expect(screen.getByText('Health Check')).toBeInTheDocument();
  });
});
```

### TDD (Test-Driven Development) 권장

```bash
# 1. Red: 실패하는 테스트 작성
# 2. Green: 테스트 통과하는 최소 코드 작성
# 3. Refactor: 코드 개선

# 예시 워크플로우
npm run backend:test -- test_new_feature.py  # Red
# 코드 구현
npm run backend:test -- test_new_feature.py  # Green
# 리팩토링
npm run backend:test -- test_new_feature.py  # 여전히 Green
```

## 🚀 CI/CD 파이프라인

### GitHub Actions 워크플로우

**현재 구성된 파이프라인:**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  backend-test:
    - Python 3.13 환경 설정
    - 의존성 설치
    - 린트 검사 (flake8)
    - 타입 체크 (mypy)
    - 테스트 실행 (pytest)
    - 커버리지 리포트

  frontend-test:
    - Node.js 환경 설정
    - 의존성 설치
    - 린트 검사 (ESLint)
    - 타입 체크 (TypeScript)
    - 빌드 테스트
```

### 파이프라인 트리거

**자동 실행:**
- `main` 브랜치 푸시
- Pull Request 생성/업데이트

**수동 실행:**
```bash
# GitHub CLI 사용
gh workflow run ci.yml
```

### 배포 환경별 전략

**Development:**
- 모든 feature 브랜치 자동 배포
- 테스트 서버에 배포

**Staging:**
- `develop` 브랜치 병합 시 자동 배포
- UAT(User Acceptance Test) 환경

**Production:**
- `main` 브랜치 병합 시 자동 배포
- 프로덕션 서버에 배포

## 📦 배포 프로세스

### Backend 배포

```bash
# 1. 프로덕션 의존성 설치
pip install -r requirements.txt

# 2. 환경 변수 설정
export ENVIRONMENT=production
export TMAP_API_KEY=your_production_key

# 3. 서버 실행 (Gunicorn)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend 배포

```bash
# 1. 프로덕션 빌드
cd frontend
npx expo build:web

# 2. EAS Build (모바일 앱)
npx eas build --platform all --profile production

# 3. 배포
npx eas submit --platform all
```

### 배포 체크리스트

**배포 전:**
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 환경 변수 확인
- [ ] 데이터베이스 마이그레이션
- [ ] 롤백 계획 수립

**배포 중:**
- [ ] 서비스 상태 모니터링
- [ ] 로그 확인
- [ ] Health Check 응답 확인

**배포 후:**
- [ ] 기능 동작 확인
- [ ] 성능 지표 확인
- [ ] 사용자 피드백 모니터링

## 🔧 개발 도구 및 유틸리티

### 자주 사용하는 스크립트

```bash
# 개발 환경 초기화
npm run dev:setup

# 전체 프로젝트 클린업
npm run clean:all

# 의존성 업데이트
npm run deps:update

# 로그 확인
npm run logs:backend
npm run logs:frontend
```

### 디버깅 도구

**Backend:**
- FastAPI 자동 문서화: http://127.0.0.1:8000/docs
- 로그 레벨 설정: `LOGLEVEL=DEBUG`

**Frontend:**
- Expo Developer Tools
- React Native Debugger
- Flipper (선택사항)

### 성능 모니터링

**Backend:**
```python
# API 응답 시간 측정
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

**Frontend:**
- React DevTools Profiler
- Expo 성능 모니터링

## 📊 메트릭 및 모니터링

### 주요 지표

**개발 메트릭:**
- 코드 커버리지: 목표 80% 이상
- 빌드 시간: 목표 5분 이내
- 테스트 실행 시간: 목표 2분 이내

**품질 메트릭:**
- 린트 에러: 0개
- 타입 에러: 0개
- 보안 취약점: Critical/High 0개

**성능 메트릭:**
- API 응답 시간: 목표 200ms 이내
- 앱 시작 시간: 목표 3초 이내
- 메모리 사용량: 모니터링

### 모니터링 도구 (향후 도입 예정)

- **Sentry**: 에러 추적
- **New Relic**: 성능 모니터링
- **LogRocket**: 사용자 세션 기록

## 🎯 베스트 프랙티스

### 커밋 메시지 규칙

```
type(scope): description

feat(api): add route optimization endpoint
fix(ui): resolve map rendering issue
docs(readme): update installation guide
test(backend): add unit tests for ML model
refactor(frontend): improve component structure
```

### 코드 리뷰 가이드라인

**리뷰어 체크리스트:**
- [ ] 기능 요구사항 충족
- [ ] 코드 품질 및 가독성
- [ ] 테스트 커버리지
- [ ] 성능 영향 분석
- [ ] 보안 고려사항

**개발자 체크리스트:**
- [ ] Self-review 완료
- [ ] 테스트 작성
- [ ] 문서 업데이트
- [ ] 브레이킹 체인지 확인

## 🚨 트러블슈팅

### 일반적인 문제

**Backend 서버 시작 실패:**
```bash
# 가상환경 활성화 확인
venv\Scripts\activate

# 의존성 재설치
pip install -r requirements.txt

# 포트 충돌 확인
netstat -ano | findstr :8000
```

**Frontend 빌드 실패:**
```bash
# 캐시 클리어
npx expo r -c

# Node modules 재설치
rm -rf node_modules
npm install
```

**API 연결 실패:**
- Backend 서버 실행 상태 확인
- 환경 변수 설정 확인
- CORS 정책 확인

### 로그 분석

```bash
# Backend 로그
tail -f backend/logs/app.log

# Frontend 로그 (Metro bundler)
npx expo start --verbose
```

## 📈 지속적인 개선

### 주간/월간 리뷰

**주간 작업:**
- 코드 메트릭 리뷰
- 성능 지표 확인
- 기술 부채 정리

**월간 작업:**
- 의존성 업데이트
- 보안 취약점 점검
- 아키텍처 리뷰

### 학습 및 개발

**권장 학습 자료:**
- FastAPI 공식 문서
- React Native 베스트 프랙티스
- Python 성능 최적화
- TypeScript 심화

**팀 지식 공유:**
- 기술 블로그 작성
- 코드 리뷰 세션
- 아키텍처 토론

이 워크플로우 가이드를 통해 효율적이고 품질 높은 개발을 진행하시기 바랍니다! 🚀