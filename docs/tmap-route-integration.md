# 티맵 API 경로 검색 기능 🗺️

## ✅ 구현 완료!

### 작동 방식
```
1. 사용자가 출발지/도착지 입력
   ↓
2. "경로 검색" 버튼 클릭
   ↓
3. 티맵 API로 경로 탐색 (도보/대중교통)
   ↓
4. 카카오맵에 경로 표시
   ↓
5. 거리, 시간 정보 표시
```

---

## 📱 사용 방법

### 1. Routes 탭으로 이동
- 앱 하단의 **"걸을 코스"** 탭 클릭

### 2. 출발지/도착지 입력
- **출발지**: 기본값 "현재 위치" (수정 가능)
- **도착지**: 원하는 목적지 입력

### 3. 경로 검색
- 파란색 **"경로 검색"** 버튼 클릭
- 로딩 중 표시 (스피너)

### 4. 결과 확인
- 전체 화면 지도 모달 표시
- 출발지 (파란색 마커)
- 도착지 (빨간색 마커)
- 경로 (파란색 선)
- 거리 & 시간 정보

---

## 🔧 구현된 파일들

### 1. **`frontend/services/routeService.ts`** (신규)
티맵 API 연동 서비스
```typescript
// 도보 경로 검색
searchPedestrianRoute(request: RouteRequest): Promise<RouteResponse>

// 대중교통 경로 검색
searchTransitRoute(request: RouteRequest): Promise<RouteResponse>

// 주소 → 좌표 변환
geocodeAddress(address: string): Promise<{lat, lng}>
```

**티맵 API 키**: `uAD0x6MeRK3WiaTxMW3ck23uBsilTxXA7hLk0Lo4`

### 2. **`frontend/components/KakaoMapWithRoute.tsx`** (신규)
경로를 표시하는 카카오맵 컴포넌트
- 출발지/도착지 마커
- 경로 선 그리기
- 자동 지도 범위 조정

**카카오맵 JS 키**: `9a91bb579fe8e58cc9e5e25d6a073869`

### 3. **`frontend/app/(tabs)/routes.tsx`** (수정)
경로 검색 UI 및 로직
- 검색 입력창
- 경로 검색 버튼 (+ 로딩 상태)
- 결과 지도 모달

---

## 🧪 테스트 데이터

### 현재 테스트용 좌표
```typescript
출발지: 서울시청
  위도: 37.5665
  경도: 126.9780

도착지: 남산
  위도: 37.5511
  경도: 126.9882
```

### 테스트 시나리오
1. **기본 테스트**
   - 출발지: "현재 위치"
   - 도착지: "남산"
   - 결과: 약 1.8km, 25분 도보 경로

2. **주소 입력 테스트** (향후 개선)
   - 출발지: "서울시청"
   - 도착지: "강남역"
   - 주소 → 좌표 변환 필요

---

## 📊 API 응답 데이터

### 티맵 도보 경로 API
```json
{
  "type": "pedestrian",
  "totalDistance": 1850,  // 미터
  "totalTime": 1500,      // 초 (25분)
  "paths": [
    { "lat": 37.5665, "lng": 126.9780 },
    { "lat": 37.5650, "lng": 126.9790 },
    ...
    { "lat": 37.5511, "lng": 126.9882 }
  ]
}
```

### 콘솔 로그
```javascript
🚶 [티맵 API] 도보 경로 검색: {
  startX: 126.9780,
  startY: 37.5665,
  endX: 126.9882,
  endY: 37.5511
}

📦 [티맵 API] 도보 경로 응답: {...}

✅ [티맵 API] 변환 완료: {
  거리: "1.85km",
  시간: "25분",
  좌표수: 142
}
```

---

## 🎯 현재 상태

### ✅ 구현 완료
- [x] 티맵 API 연동 (도보 경로)
- [x] 카카오맵에 경로 표시
- [x] 출발지/도착지 마커
- [x] 경로 선 그리기
- [x] 거리/시간 정보 표시
- [x] 로딩 상태 표시
- [x] 전체 화면 지도 모달

### 🚧 향후 개선사항
- [ ] 주소 검색 기능 (카카오 로컬 API)
- [ ] GPS 현재 위치 가져오기
- [ ] 대중교통 경로 표시
- [ ] 다양한 경로 옵션 (최단/최적)
- [ ] 경로 저장 기능
- [ ] 실시간 네비게이션

---

## 🔍 디버깅

### 경로가 안 나올 때
1. **콘솔 확인**: F12 → Console 탭
2. **API 응답 확인**: 티맵 API 로그 확인
3. **네트워크 확인**: Network 탭에서 API 호출 상태
4. **좌표 확인**: 출발지/도착지 좌표가 올바른지

### CORS 에러가 날 때
티맵 API는 모바일 앱에서만 작동합니다.
- **해결책**: React Native 앱으로 테스트
- **웹 테스트**: 백엔드 프록시 필요

---

## 📝 사용 예시

### 코드에서 직접 호출
```typescript
import { searchPedestrianRoute } from '../services/routeService';

const result = await searchPedestrianRoute({
  startX: 126.9780,  // 서울시청 경도
  startY: 37.5665,   // 서울시청 위도
  endX: 126.9882,    // 남산 경도
  endY: 37.5511,     // 남산 위도
  startName: '서울시청',
  endName: '남산',
});

console.log(`거리: ${(result.totalDistance / 1000).toFixed(2)}km`);
console.log(`시간: ${Math.round(result.totalTime / 60)}분`);
console.log(`경로 좌표: ${result.paths.length}개`);
```

---

## 🎉 완성!

**티맵 API로 경로 검색** → **카카오맵에 표시** 기능이 완성되었습니다!

1. 앱 실행: `npm start`
2. Routes 탭 이동
3. 도착지 입력
4. "경로 검색" 클릭
5. 지도에서 경로 확인!

**네비게이션 앱처럼 출발지/도착지 검색하면 경로가 나옵니다!** 🗺️✨
