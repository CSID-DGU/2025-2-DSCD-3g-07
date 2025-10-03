# 🚀 팀원용 Quick Start 가이드

## 📥 프로젝트 클론 및 설정

### 1. **저장소 클론**

```bash
git clone https://github.com/CSID-DGU/2025-2-DSCD-3g-07.git
cd 2025-2-DSCD-3g-07
```

### 2. **개발 환경 설정**

```bash
# 의존성 설치 (Frontend + Backend)
npm run install:dev

# 환경 변수 설정
cp backend/.env.example backend/.env
# backend/.env 파일을 열어서 실제 API 키 입력
```

### 3. **개발 서버 실행**

```bash
# Backend + Frontend 동시 실행
npm run dev

# 또는 개별 실행
npm run backend:dev    # 백엔드만
npm run frontend:dev   # 프론트엔드만
```

## 🔄 일일 개발 워크플로우

### 📅 **작업 시작 시**

```bash
# 1. develop 브랜치로 이동 및 업데이트
git checkout develop
git pull origin develop

# 2. 새 기능 브랜치 생성
git checkout -b feature/본인이름-기능명
# 예시: git checkout -b feature/kim-map-ui

# 3. 개발 서버 실행
npm run dev
```

### 💻 **개발 중**

```bash
# 자주 커밋하기 (의미있는 단위로)

# 📋 현재 변경사항 확인
git status
git diff --name-only

# 🎯 방법 1: 구체적인 파일명 지정 (가장 안전)
git add src/components/LoginForm.tsx
git add src/utils/validation.ts

# 🎯 방법 2: 패턴으로 추가
git add "*.tsx" "*.ts"        # TypeScript 파일만
git add src/components/       # components 폴더만
git add backend/app/*.py      # Python 파일만

# 🎯 방법 3: Interactive 모드 (권장)
git add -i                    # 대화형으로 파일 선택

# 📝 커밋
git commit -m "✨ feat: 기능 설명

- 상세 변경사항 1
- 상세 변경사항 2"

# 원격에 푸시 (처음 한 번)
git push -u origin feature/본인이름-기능명

# 이후 푸시
git push
```

### 📤 **작업 완료 시**

```bash
# 1. 최신 develop과 동기화
git checkout develop
git pull origin develop
git checkout feature/본인이름-기능명
git rebase develop

# 2. 마지막 푸시
git push

# 3. GitHub에서 PR 생성
# feature/본인이름-기능명 → develop

# 4. 팀원 리뷰 대기
# 5. 승인 후 병합
# 6. 로컬 브랜치 정리
git checkout develop
git pull origin develop
git branch -d feature/본인이름-기능명
```

## 👥 팀 역할 분담 예시

### 🎨 **Frontend 팀**

```bash
# UI/UX 관련 브랜치
git checkout -b feature/김-로그인-ui
git checkout -b feature/이-지도-컴포넌트  
git checkout -b feature/박-설정-화면
```

### 🔧 **Backend 팀**

```bash
# API/서버 관련 브랜치
git checkout -b feature/최-사용자-api
git checkout -b feature/정-경로-api
git checkout -b feature/한-ml-모델-개선
```

### 📚 **공통 작업**

```bash
# 문서화, 설정 등
git checkout -b feature/문서-업데이트
git checkout -b feature/ci-cd-설정
git checkout -b feature/테스트-코드
```

## 🆘 자주 발생하는 문제 해결

### 🔀 **Merge Conflict 발생 시**

```bash
# 1. 충돌 파일 확인
git status

# 2. 충돌 파일 수동 수정
# <<<<<<< HEAD와 >>>>>>> 마커 제거 후 올바른 코드 선택

# 3. 해결 완료 후
git add 충돌해결한파일명.확장자  # 해결한 파일만 추가
git commit -m "🔀 resolve merge conflict"
```

### 🔄 **잘못된 커밋 수정**

```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "올바른 커밋 메시지"

# 마지막 커밋에 파일 추가
git add 파일명
git commit --amend --no-edit
```

### 🌿 **브랜치 정리**

```bash
# 원격에서 삭제된 브랜치 로컬에서도 제거
git fetch --prune

# 병합된 브랜치 일괄 삭제
git branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d
```

## 📱 모바일 테스트 가이드

### 🔧 **Expo Go 사용**

```bash
# 1. 프론트엔드 실행
npm run frontend:dev

# 2. 's' 키로 Expo Go 모드 전환
# 3. 모바일에서 QR 코드 스캔
```

### 🌐 **웹 브라우저 테스트**

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 새 터미널에서 프론트엔드 별도 실행
npm run frontend:dev

# 3. 'w' 키로 웹 브라우저 열기
```

## 🎯 커밋 메시지 치트시트

```bash
# 새 기능
git commit -m "✨ feat: 카카오맵 컴포넌트 추가"

# 버그 수정
git commit -m "🐛 fix: API 응답 파싱 오류 수정"

# 문서 업데이트
git commit -m "📝 docs: README 설치 가이드 추가"

# 스타일 변경
git commit -m "💄 style: 버튼 디자인 개선"

# 리팩토링
git commit -m "♻️ refactor: API 서비스 함수 모듈화"

# 테스트 추가
git commit -m "🧪 test: 경로 검색 API 테스트 케이스 추가"

# 설정 변경
git commit -m "🔧 chore: ESLint 규칙 업데이트"
```

---

## 🔗 유용한 링크

- **Repository**: https://github.com/CSID-DGU/2025-2-DSCD-3g-07
- **Issues**: 버그 리포트, 기능 요청
- **Projects**: 작업 진행상황 트래킹
- **Wiki**: 상세 기술 문서

문의사항이 있으면 팀 채널이나 GitHub Issues에 남겨주세요! 🙌