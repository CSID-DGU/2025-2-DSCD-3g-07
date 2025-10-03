# Frontend 개발 가이드

## 📱 React Native (Expo) 앱 개요

PaceTry Frontend는 Expo 기반의 React Native 앱으로, 보행 속도 개인화 서비스를 위한 모바일 인터페이스를 제공합니다.

## 📋 목차

- [프로젝트 구조](#프로젝트-구조)
- [개발 환경 설정](#개발-환경-설정)
- [주요 컴포넌트](#주요-컴포넌트)
- [API 연동](#api-연동)
- [스타일링](#스타일링)
- [개발 가이드](#개발-가이드)

## 📁 프로젝트 구조

```
frontend/
├── app/                    # 라우터 기반 화면
│   ├── _layout.tsx        # 루트 레이아웃
│   ├── modal.tsx          # 모달 화면
│   └── (tabs)/           # 탭 네비게이션
│       ├── _layout.tsx   # 탭 레이아웃
│       ├── index.tsx     # 홈 화면
│       ├── routes.tsx    # 경로 화면
│       ├── stats.tsx     # 통계 화면
│       └── api-test.tsx  # API 테스트 화면
├── components/            # 재사용 컴포넌트
│   ├── ApiTestComponent.tsx    # API 테스트 컴포넌트
│   ├── KakaoMap.tsx           # 카카오맵 컴포넌트
│   └── ui/                    # UI 컴포넌트
├── services/             # API 서비스
│   └── api.ts           # Backend API 클라이언트
├── hooks/               # 커스텀 Hook
│   └── api/
│       └── useApi.ts    # API 관련 Hook
├── config/              # 설정 파일
│   └── index.ts         # 앱 설정
├── constants/           # 상수 정의
├── assets/             # 정적 자원
└── .expo/              # Expo 캐시
```

## 🚀 개발 환경 설정

### 빠른 시작

```bash
# 루트 디렉터리에서
npm run frontend:dev

# 또는 frontend 디렉터리에서
cd frontend
npx expo start
```

### 개발 도구

**Expo Go 앱** (권장):
1. 모바일에서 Expo Go 앱 설치
2. QR 코드 스캔하여 앱 실행

**웹 브라우저**:
- `w` 키 눌러서 웹 버전 실행
- http://localhost:19006 접속

**시뮬레이터**:
- `i` (iOS 시뮬레이터)
- `a` (Android 에뮬레이터)

## 🎨 주요 컴포넌트

### 1. 홈 화면 (`app/(tabs)/index.tsx`)

메인 네비게이션과 지도 인터페이스를 제공합니다.

**주요 기능:**
- 위치 권한 요청
- 실시간 위치 추적
- 카카오맵 통합
- 빠른 검색 칩

### 2. API 테스트 화면 (`app/(tabs)/api-test.tsx`)

Backend API 연결을 테스트할 수 있는 화면입니다.

**주요 기능:**
- Health Check API 테스트
- 경로 검색 API 테스트  
- 실시간 응답 확인
- 에러 상태 표시

### 3. 카카오맵 컴포넌트 (`components/KakaoMap.tsx`)

```tsx
import KakaoMap from '@/components/KakaoMap';

// 사용 예제
<KakaoMap />
```

**Props:**
- `jsKey`: 카카오 JavaScript API 키

### 4. API 테스트 컴포넌트 (`components/ApiTestComponent.tsx`)

```tsx
import ApiTestComponent from '@/components/ApiTestComponent';

// 사용 예제  
<ApiTestComponent />
```

**기능:**
- 자동 API 설정 정보 표시
- Health Check 버튼
- 경로 검색 테스트 (서울역→강남역)
- 성공/실패 상태 표시

## 🔗 API 연동

### API 서비스 (`services/api.ts`)

```typescript
import { apiService } from '@/services/api';

// Health Check
const response = await apiService.healthCheck();

// 경로 검색
const routeResponse = await apiService.getTransitRoute({
  start_x: 126.9706,
  start_y: 37.5547, 
  end_x: 127.0276,
  end_y: 37.4979,
  user_age: 25,
  fatigue_level: 3
});
```

### API Hook (`hooks/api/useApi.ts`)

```typescript
import { useHealthCheck, useTransitRoute } from '@/hooks/api/useApi';

function MyComponent() {
  const { data, loading, error, checkHealth } = useHealthCheck();
  const { data: routeData, getRoute } = useTransitRoute();
  
  return (
    <Button onPress={checkHealth} disabled={loading}>
      {loading ? 'Loading...' : 'Check Health'}
    </Button>
  );
}
```

### 환경 설정 (`config/index.ts`)

```typescript
import Config from '@/config';

// API Base URL 접근
console.log(Config.API_BASE_URL); // http://127.0.0.1:8000

// 기본값 사용
const params = {
  user_age: Config.DEFAULTS.USER_AGE, // 30
  fatigue_level: Config.DEFAULTS.FATIGUE_LEVEL, // 3
};
```

## 🎨 스타일링

### 디자인 시스템

```typescript
// 색상 상수
const PRIMARY_COLOR = '#2C6DE7';
const SECONDARY_TEXT = '#4A5968';
const LIGHT_BACKGROUND = '#F2F5FC';
const BORDER_COLOR = '#E6E9F2';
```

### StyleSheet 사용

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
    padding: 16,
  },
  button: {
    backgroundColor: PRIMARY_COLOR,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
```

### 반응형 디자인

```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width * 0.9,
    height: height * 0.7,
  },
});
```

## 🧭 네비게이션

### 탭 네비게이션 구조

```typescript
// app/(tabs)/_layout.tsx
<Tabs>
  <Tabs.Screen name="index" options={{ title: '홈' }} />
  <Tabs.Screen name="routes" options={{ title: '코스' }} />
  <Tabs.Screen name="stats" options={{ title: 'MY' }} />
  <Tabs.Screen name="api-test" options={{ title: 'API' }} />
</Tabs>
```

### 새로운 화면 추가

1. **파일 생성**: `app/(tabs)/new-screen.tsx`
2. **레이아웃 수정**: `app/(tabs)/_layout.tsx`에 탭 추가
3. **컴포넌트 작성**:

```tsx
export default function NewScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>New Screen</Text>
    </SafeAreaView>
  );
}
```

## 📱 권한 관리

### 위치 권한

```typescript
import * as Location from 'expo-location';

const requestLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission denied');
    return;
  }
  
  const location = await Location.getCurrentPositionAsync();
  console.log(location.coords);
};
```

## 🧪 테스트

### 컴포넌트 테스트 (예정)

```bash
# 테스트 실행
npm test

# 커버리지 포함  
npm run test:coverage
```

### E2E 테스트 (예정)

Detox 또는 Maestro를 사용한 End-to-End 테스트 구현 예정

## 🔧 개발 가이드

### 새로운 컴포넌트 생성

1. **파일 생성**: `components/MyComponent.tsx`
2. **컴포넌트 작성**:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MyComponent;
```

3. **Export 추가**: 필요시 `components/index.ts`에 추가

### API 연동 추가

1. **API 서비스 확장** (`services/api.ts`):

```typescript
async newApiMethod(params: NewParams): Promise<ApiResponse<NewResponse>> {
  return this.makeRequest('/new-endpoint', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

2. **Hook 생성** (`hooks/api/useNewApi.ts`):

```typescript
export function useNewApi() {
  const [state, setState] = useState<UseApiState<NewResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const callNewApi = async (params: NewParams) => {
    setState(prev => ({ ...prev, loading: true }));
    // API 호출 로직
  };

  return { ...state, callNewApi };
}
```

### 상태 관리

현재는 React Hook 기반 상태 관리를 사용합니다.
향후 확장 시 고려사항:

- **Zustand**: 간단한 전역 상태 관리
- **React Query**: 서버 상태 캐싱
- **Redux Toolkit**: 복잡한 상태 로직

### 성능 최적화

```typescript
// React.memo 사용
const MyComponent = React.memo(({ data }) => {
  return <View>{/* 렌더링 */}</View>;
});

// useMemo 사용
const expensiveValue = useMemo(() => {
  return heavyComputation(data);
}, [data]);

// useCallback 사용  
const handlePress = useCallback(() => {
  // 핸들러 로직
}, [dependency]);
```

## 📦 빌드 및 배포

### 개발 빌드

```bash
# Expo 개발 서버
npx expo start

# 웹 빌드
npx expo export:web
```

### 프로덕션 빌드

```bash
# EAS Build 설정
npx eas build:configure

# iOS 빌드
npx eas build --platform ios

# Android 빌드  
npx eas build --platform android
```

### 앱 스토어 배포

```bash
# EAS Submit
npx eas submit --platform ios
npx eas submit --platform android
```

## 🛠️ 디버깅

### React Developer Tools

```bash
# Flipper 사용 (선택사항)
npx expo install react-native-flipper
```

### 로깅

```typescript
// 개발 환경에서만 로깅
if (__DEV__) {
  console.log('Debug info:', data);
}

// Flipper 로깅
import { logger } from 'react-native-logs';
const log = logger.createLogger();
log.debug('Debug message');
```

### 에러 경계

```typescript
import React from 'react';

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return <Text>Something went wrong.</Text>;
    }
    return this.props.children;
  }
}
```

## 📚 참고 자료

- [Expo 공식 문서](https://docs.expo.dev/)
- [React Native 공식 문서](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript React 가이드](https://react-typescript-cheatsheet.netlify.app/)

## 🚀 향후 개발 계획

- [ ] 오프라인 지원
- [ ] 푸시 알림
- [ ] 다크 모드
- [ ] 다국어 지원
- [ ] 접근성 개선
- [ ] 성능 모니터링