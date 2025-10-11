# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

PaceTry 프로젝트의 보안을 중요하게 생각합니다. 보안 취약점을 발견하신 경우 다음 절차를 따라주세요:

### 🚨 긴급 보안 이슈

**공개적으로 이슈를 등록하지 마세요.** 대신 다음 방법으로 신고해주세요:

1. **이메일**: security@pacetry.com (설정 예정)
2. **GitHub Security**: [Security Advisories](https://github.com/your-username/pacetry/security/advisories/new)

### 📝 신고 시 포함할 정보

- 취약점의 상세 설명
- 재현 단계
- 잠재적 영향도
- 가능한 경우 개념 증명 (PoC)

### ⏰ 응답 시간

- **24시간 이내**: 신고 접수 확인
- **72시간 이내**: 초기 평가 결과
- **7일 이내**: 상세 분석 및 수정 계획

### 🏆 보상 정책

현재는 공개 감사(Public Acknowledgment)를 제공합니다. 향후 버그 바운티 프로그램을 고려 중입니다.

## 보안 가이드라인

### 🔒 개발자를 위한 보안 체크리스트

#### Backend (FastAPI)
- [ ] 환경 변수로 민감한 정보 관리
- [ ] API 키 및 시크릿 하드코딩 금지
- [ ] CORS 설정 검토
- [ ] 입력 데이터 검증 (Pydantic 사용)
- [ ] SQL 인젝션 방지
- [ ] 적절한 HTTP 상태 코드 사용
- [ ] 에러 메시지에서 민감한 정보 누출 방지

#### Frontend (React Native)
- [ ] API 키를 클라이언트 코드에 하드코딩 금지
- [ ] 민감한 데이터 로컬 저장 시 암호화
- [ ] 네트워크 통신 HTTPS 사용
- [ ] 사용자 입력 검증
- [ ] 딥링크 보안 검토

#### Health Connect 통합
- [ ] 건강 데이터 최소 권한 원칙
- [ ] 데이터 암호화 저장
- [ ] 사용자 동의 명시적 획득
- [ ] 개인정보처리방침 최신 유지
- [ ] 데이터 보존 기간 준수

### 🔧 자동 보안 검사

```bash
# Backend 보안 스캔
npm run security:backend

# 의존성 취약점 검사
npm audit

# 코드 품질 검사
npm run lint:all
```

### 🚫 금지 사항

1. **하드코딩된 비밀번호/API 키**
2. **프로덕션에서 디버그 모드 활성화**
3. **사용자 입력 미검증**
4. **민감한 정보 로그 출력**
5. **불필요한 권한 요청**

### ✅ 권장 사항

1. **정기적인 의존성 업데이트**
2. **코드 리뷰 시 보안 관점 포함**
3. **최소 권한 원칙 적용**
4. **입력 검증 및 출력 인코딩**
5. **보안 테스트 자동화**

## 연락처

보안 관련 문의: security@pacetry.com (설정 예정)
일반 문의: [GitHub Issues](https://github.com/your-username/pacetry/issues)