# 🌳 Git 워크플로우 가이드

## 📋 브랜치 전략 (Git Flow)

```
main          (🚀 배포/릴리즈용)
├── develop   (👥 개발 통합 브랜치)
│   ├── feature/login         (🔧 로그인 기능)
│   ├── feature/map-ui        (🗺️ 지도 UI 개발)
│   ├── feature/ml-model      (🤖 ML 모델 개선)
│   └── feature/api-integration (🔌 API 연동)
├── hotfix/   (🚨 긴급 수정)
└── release/  (🎯 릴리즈 준비)
```

## 🔄 개발 워크플로우

### 1. **새로운 기능 개발 시작**

```bash
# develop 브랜치로 이동
git checkout develop
git pull origin develop

# 새 기능 브랜치 생성
git checkout -b feature/기능명

# 예시: 지도 UI 개발
git checkout -b feature/map-ui
```

### 2. **개발 중 커밋 규칙**

```bash
# 의미있는 단위로 자주 커밋
git add .
git commit -m "✨ feat: 카카오맵 컴포넌트 추가

- KakaoMap 컴포넌트 기본 구조 생성
- WebView 기반 지도 표시 기능 구현
- 좌표 변환 유틸리티 함수 추가"

# 원격에 푸시
git push -u origin feature/map-ui
```

### 3. **Pull Request (PR) 생성**

GitHub에서 `feature/map-ui` → `develop` PR 생성:

1. **GitHub 접속** → Repository 이동
2. **"Compare & pull request" 클릭**
3. **PR 제목**: `✨ feat: 카카오맵 UI 컴포넌트 추가`
4. **설명 작성**:
   ```markdown
   ## 🎯 작업 내용
   - 카카오맵 WebView 컴포넌트 구현
   - 지도 표시 및 좌표 변환 기능 추가
   
   ## 🧪 테스트 결과
   - [ ] 모바일에서 지도 정상 표시 확인
   - [ ] 좌표 변환 정확성 테스트 완료
   
   ## 📸 스크린샷
   (스크린샷 첨부)
   ```
5. **리뷰어 지정** → 팀원 할당

### 4. **코드 리뷰 및 병합**

```bash
# PR 승인 후 develop에 병합
# GitHub에서 "Squash and merge" 권장

# 로컬에서 develop 업데이트
git checkout develop
git pull origin develop

# 작업 완료된 브랜치 정리
git branch -d feature/map-ui
```

## 📝 커밋 메시지 컨벤션

### 🏷️ **타입 (Type)**

| 타입 | 이모지 | 설명 |
|------|--------|------|
| `feat` | ✨ | 새로운 기능 추가 |
| `fix` | 🐛 | 버그 수정 |
| `docs` | 📝 | 문서 수정 |
| `style` | 💄 | 코드 스타일 변경 |
| `refactor` | ♻️ | 코드 리팩토링 |
| `test` | 🧪 | 테스트 추가/수정 |
| `chore` | 🔧 | 빌드/설정 변경 |

### 📋 **메시지 형식**

```
<타입>: <제목> (50자 이내)

<본문> (선택사항)
- 변경사항 상세 설명
- 왜 이 변경이 필요한지 설명

<꼬리말> (선택사항)
Closes #123
```

### 🌟 **좋은 커밋 예시**

```bash
✨ feat: 개인화 ML 모델 API 연동

- scikit-learn LinearRegression 모델 구현
- 나이, 피로도 기반 보행시간 예측 기능 추가
- API 응답에 개인화된 시간 정보 포함

Closes #15
```

## 🚀 릴리즈 관리

### 1. **버전 태그 생성**

```bash
# main 브랜치에서 릴리즈 태그 생성
git checkout main
git tag -a v1.0.0 -m "🎉 Release v1.0.0: 기본 기능 완성

- 개인화된 대중교통 경로 검색
- 카카오맵 연동
- T맵 API 통합
- ML 기반 보행시간 예측"

# 태그 푸시
git push origin v1.0.0
```

### 2. **GitHub Release 생성**

GitHub에서 **"Releases"** → **"Create a new release"**:

- **Tag**: `v1.0.0`
- **Title**: `🎉 PaceTry v1.0.0 - 기본 기능 완성`
- **Description**: 주요 변경사항 및 새 기능 설명

## 👥 팀 협업 규칙

### 📌 **기본 규칙**

1. **main 브랜치 직접 푸시 금지** 🚫
2. **모든 변경사항은 PR을 통해서만** ✅
3. **PR은 최소 1명 이상 리뷰 필수** 👥
4. **CI/CD 테스트 통과 후 병합** 🧪

### 🔄 **일일 워크플로우**

```bash
# 1. 하루 시작 시
git checkout develop
git pull origin develop

# 2. 새 작업 브랜치 생성
git checkout -b feature/새기능

# 3. 개발 및 커밋
git add .
git commit -m "✨ feat: 새 기능 추가"

# 4. 푸시 및 PR 생성
git push -u origin feature/새기능
# GitHub에서 PR 생성

# 5. 리뷰 완료 후 병합
# 6. 브랜치 정리
```

## 🛠️ 유용한 Git 명령어

```bash
# 현재 브랜치 목록
git branch -a

# 브랜치 간 변경사항 확인
git diff develop..feature/브랜치명

# 커밋 히스토리 그래프로 보기
git log --oneline --graph --all

# 특정 파일의 변경 히스토리
git log --follow 파일명

# 원격 브랜치와 동기화
git fetch --all --prune

# 병합 충돌 해결 도구
git mergetool
```

---

## 📱 모바일 앱 배포 버전 관리

### Frontend (Expo)

```json
// app.json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    },
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

### Backend (FastAPI)

```python
# app/main.py
app = FastAPI(
    title="PaceTry API",
    version="1.0.0",  # 여기서 API 버전 관리
)
```

이렇게 체계적인 버전 관리로 팀 프로젝트를 효율적으로 관리할 수 있습니다! 🎯