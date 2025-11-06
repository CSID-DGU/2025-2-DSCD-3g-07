# 🛡️ GitHub Branch Protection 설정 가이드

## 🎯 목적

`main` 브랜치를 보호하여 안정적인 코드만 배포되도록 관리합니다.

## ⚙️ 설정 방법

### 1. **GitHub Repository 설정**

1. Repository → **Settings** → **Branches**
2. **"Add rule"** 클릭
3. **Branch name pattern**: `main`

### 2. **보호 규칙 설정**

#### ✅ **필수 설정**

- [x] **Require a pull request before merging**
  - [x] **Require approvals**: 최소 1명
  - [x] **Dismiss stale PR approvals when new commits are pushed**
  
- [x] **Require status checks to pass before merging**
  - [x] **Require branches to be up to date before merging**
  
- [x] **Require conversation resolution before merging**

- [x] **Restrict pushes that create files over 100MB**

#### 🔧 **권장 설정**

- [x] **Require linear history** (깔끔한 히스토리 유지)
- [x] **Include administrators** (관리자도 규칙 준수)

## 📋 결과

이 설정으로 다음이 보장됩니다:

- ❌ `main` 브랜치에 직접 푸시 불가
- ✅ 모든 변경사항은 PR을 통해서만 병합
- ✅ 최소 1명의 코드 리뷰 필수
- ✅ CI/CD 테스트 통과 필수
- ✅ 대화(코멘트) 해결 후 병합

---

## 🚦 CI/CD 워크플로우 (GitHub Actions)

현재 프로젝트에 `.github/workflows/quality-check.yml`이 있습니다.
이 워크플로우가 통과해야만 PR 병합이 가능합니다.

```yaml
# .github/workflows/quality-check.yml 예시
name: Quality Check

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      # Backend 테스트
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      
      - name: Install Backend Dependencies
        run: |
          cd backend
          pip install -r requirements-dev.txt
      
      - name: Run Backend Tests
        run: |
          cd backend
          pytest
      
      # Frontend 테스트  
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: 16
      
      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run Frontend Tests
        run: |
          cd frontend
          npm test
```