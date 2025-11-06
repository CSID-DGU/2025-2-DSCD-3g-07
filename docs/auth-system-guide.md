# 🔐 PaceTry 로그인 시스템 사용 가이드

## 📱 프론트엔드 구현 완료!

JWT 기반 로그인 시스템이 완성되었습니다.

---

## 🎨 구현된 화면

### 1️⃣ 로그인 화면 (`app/(auth)/login.tsx`)
- ✅ 이메일/비밀번호 입력
- ✅ 비밀번호 보기/숨기기
- ✅ 입력 검증 (이메일 형식)
- ✅ 로딩 인디케이터
- ✅ 회원가입 페이지 링크
- ✅ "로그인 없이 둘러보기" 옵션

### 2️⃣ 회원가입 화면 (`app/(auth)/register.tsx`)
- ✅ 사용자명, 이메일, 비밀번호 입력
- ✅ 비밀번호 확인
- ✅ 입력 검증
  - 사용자명: 3-50자
  - 이메일: 유효한 형식
  - 비밀번호: 최소 6자
- ✅ 로딩 인디케이터
- ✅ 로그인 페이지 링크

### 3️⃣ 설정 화면 (`app/(tabs)/settings.tsx`)
- ✅ 사용자 프로필 표시
- ✅ 로그인/로그아웃 버튼
- ✅ 로그인 상태에 따른 UI 변경
- ✅ 앱 설정 메뉴

---

## 🏗️ 아키텍처

```
frontend/
├── contexts/
│   └── AuthContext.tsx          # 전역 인증 상태 관리
├── services/
│   └── authService.ts           # API 호출 서비스
├── app/
│   ├── _layout.tsx              # AuthProvider 추가됨
│   ├── (auth)/
│   │   ├── login.tsx            # 로그인 화면
│   │   └── register.tsx         # 회원가입 화면
│   └── (tabs)/
│       └── settings.tsx         # 설정 화면 (로그아웃)
```

---

## 🔄 데이터 흐름

### 회원가입
```
1. 사용자 입력 (username, email, password)
   ↓
2. 입력 검증 (authService.validate*)
   ↓
3. API 호출 (authService.register)
   POST /api/auth/register
   ↓
4. 토큰 + 사용자 정보 수신
   ↓
5. AuthContext에 저장 (login)
   ↓
6. AsyncStorage에 자동 저장
   ↓
7. 메인 화면으로 이동
```

### 로그인
```
1. 사용자 입력 (email, password)
   ↓
2. 입력 검증
   ↓
3. API 호출 (authService.login)
   POST /api/auth/login
   ↓
4. 토큰 + 사용자 정보 수신
   ↓
5. AuthContext에 저장
   ↓
6. AsyncStorage에 자동 저장
   ↓
7. 메인 화면으로 이동
```

### 자동 로그인
```
1. 앱 시작
   ↓
2. AuthContext.useEffect 실행
   ↓
3. AsyncStorage에서 토큰/사용자 읽기
   ↓
4. 토큰이 있으면 자동 로그인 상태
   ↓
5. 없으면 로그인 화면 표시
```

---

## 💻 사용법

### AuthContext 사용하기

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return <Text>로딩 중...</Text>;
  }

  if (isAuthenticated) {
    return <Text>안녕하세요, {user.username}님!</Text>;
  }

  return <Text>로그인이 필요합니다</Text>;
}
```

### 인증이 필요한 API 호출

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { token } = useAuth();

  const fetchProtectedData = async () => {
    const response = await fetch('http://api-url/protected', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data;
  };
}
```

### 조건부 렌더링

```typescript
function MyComponent() {
  const { isAuthenticated } = useAuth();

  return (
    <View>
      {isAuthenticated ? (
        <Text>로그인된 사용자만 보는 내용</Text>
      ) : (
        <Text>게스트용 내용</Text>
      )}
    </View>
  );
}
```

---

## 🧪 테스트 방법

### 1. 서버 실행 확인
```bash
cd backend
python run.py
# http://10.61.23.26:8000 에서 실행 중
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm start
```

### 3. 회원가입 테스트
1. 앱에서 "회원가입" 클릭
2. 정보 입력:
   - 사용자명: `testuser`
   - 이메일: `test@example.com`
   - 비밀번호: `password123`
3. "회원가입" 버튼 클릭
4. 성공 메시지 확인
5. 자동으로 메인 화면 이동

### 4. 로그아웃 테스트
1. 설정 탭 이동
2. "로그아웃" 버튼 클릭
3. 확인 팝업에서 "로그아웃" 선택
4. 로그인 화면으로 이동

### 5. 로그인 테스트
1. 로그인 화면에서:
   - 이메일: `test@example.com`
   - 비밀번호: `password123`
2. "로그인" 버튼 클릭
3. 성공 메시지 확인
4. 메인 화면 이동

### 6. 자동 로그인 테스트
1. 로그인된 상태에서 앱 종료
2. 앱 재시작
3. 자동으로 로그인 상태 유지 확인

---

## 🎨 디자인 특징

### 색상 팔레트
- **Primary**: `#007AFF` (iOS 블루)
- **배경**: `#F5F5F5` (라이트 그레이)
- **입력**: `#F0F0F0` (연한 그레이)
- **텍스트**: `#333` (다크 그레이)
- **위험**: `#FF3B30` (빨강 - 로그아웃)
- **성공**: `#34C759` (초록 - 인증 배지)

### UI 컴포넌트
- **둥근 모서리**: `borderRadius: 12px`
- **그림자**: iOS 스타일 섀도우
- **아이콘**: Ionicons 사용
- **애니메이션**: 로딩 인디케이터

---

## 🔒 보안 기능

### 프론트엔드
- ✅ 비밀번호 필드 보안 입력
- ✅ 이메일 형식 검증
- ✅ 비밀번호 강도 검증
- ✅ AsyncStorage에 안전하게 저장
- ✅ 토큰 만료 시 자동 로그아웃 (향후 구현 가능)

### 백엔드
- ✅ JWT 토큰 서명 (SECRET_KEY)
- ✅ 비밀번호 bcrypt 해싱
- ✅ 토큰 만료 시간 (30분)
- ✅ 이메일/사용자명 중복 검사

---

## 🚀 다음 단계 (선택 사항)

### 추가 기능
1. **Refresh Token** - 자동 토큰 갱신
2. **소셜 로그인** - 구글/카카오/네이버
3. **비밀번호 찾기** - 이메일 인증
4. **프로필 편집** - 사용자 정보 수정
5. **이메일 인증** - 회원가입 시 이메일 확인

### UI 개선
1. **스플래시 화면** - 앱 시작 시 로고
2. **온보딩** - 첫 사용자 가이드
3. **다크 모드** - 테마 전환
4. **애니메이션** - 화면 전환 효과

---

## 📝 주요 파일 설명

### `contexts/AuthContext.tsx`
- 전역 인증 상태 관리
- AsyncStorage 연동
- 자동 로그인 처리

### `services/authService.ts`
- 백엔드 API 호출
- 입력 검증 유틸리티
- 에러 메시지 처리

### `app/(auth)/login.tsx`
- 로그인 UI
- 입력 폼 처리
- 에러 핸들링

### `app/(auth)/register.tsx`
- 회원가입 UI
- 비밀번호 확인
- 사용자명 검증

### `app/(tabs)/settings.tsx`
- 사용자 프로필 표시
- 로그아웃 기능
- 앱 설정 메뉴

---

## ✅ 완료!

**이제 PaceTry는 완전한 로그인 시스템을 갖추었습니다!** 🎉

사용자는:
- 회원가입할 수 있습니다
- 로그인할 수 있습니다
- 자동 로그인됩니다
- 로그아웃할 수 있습니다
- 로그인 상태를 유지합니다

**백엔드 API:**
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 내 정보 조회

**프론트엔드 화면:**
- `/(auth)/login` - 로그인
- `/(auth)/register` - 회원가입
- `/(tabs)/settings` - 설정 (로그아웃)

---

**문의사항이나 추가 기능이 필요하시면 언제든지 말씀해주세요!** 💪
