# 네비게이션 로그 시스템

경로 안내 기록을 저장하고 분석하는 시스템입니다.

## 개요

사용자가 "안내 시작" 버튼을 눌러 경로 안내를 시작하고 종료하면, 해당 기록이 DB에 자동으로 저장됩니다.

## 저장되는 데이터

### 도보 경로 (`walking`)
- 출발지, 도착지 (주소/명칭, 위경도)
- 총 거리 (m)
- 횡단보도 개수
- **속도 계수** (사용자 보행속도 계수)
- **경사도 계수** (Tobler's Function 기반)
- **날씨 계수** (WeatherSpeedModel 기반)
- 예상 시간 (초)
- 실제 시간 (초)
- 전체 경로 데이터 (JSON)

### 대중교통 경로 (`transit`)
- 도보 경로 항목 + 추가로:
- **교통 수단 목록** (버스, 지하철 등)

## 계수 설명

### 1. 사용자 속도 계수 (`user_speed_factor`)
- **의미**: Health Connect 데이터 기반 개인 보행속도 보정값
- **계산**: `기준 속도 (4km/h) / 사용자 속도`
- **예시**:
  - 사용자가 4.51km/h로 걸음 → 계수 0.887 (11% 빠름)
  - 사용자가 3.6km/h로 걸음 → 계수 1.111 (11% 느림)

### 2. 경사도 계수 (`slope_factor`)
- **의미**: Tobler's Hiking Function 기반 경사도 영향
- **계산**: 평균 경사도를 Tobler's Function에 적용
- **예시**:
  - 평지 (0%) → 계수 1.0
  - 오르막 5% → 계수 1.2 (20% 느림)
  - 내리막 -5% → 계수 0.84 (16% 빠름)

### 3. 날씨 계수 (`weather_factor`)
- **의미**: WeatherSpeedModel 기반 날씨 영향
- **계산**: `1 / weather_coeff`
- **예시**:
  - 맑은 날 → 계수 1.0
  - 비 오는 날 → 계수 1.15 (15% 느림)
  - 눈 오는 날 → 계수 1.3 (30% 느림)

## API 엔드포인트

### 1. 로그 저장
```
POST /api/navigation/logs?user_id={user_id}
```

**요청 본문**:
```json
{
  "route_mode": "walking",
  "start_location": "동국대학교",
  "end_location": "남산타워",
  "start_lat": 37.558,
  "start_lon": 127.000,
  "end_lat": 37.551,
  "end_lon": 126.988,
  "total_distance_m": 2500,
  "crosswalk_count": 5,
  "user_speed_factor": 0.887,
  "slope_factor": 1.15,
  "weather_factor": 1.0,
  "estimated_time_seconds": 1800,
  "actual_time_seconds": 1650,
  "started_at": "2025-11-18T10:00:00Z",
  "ended_at": "2025-11-18T10:27:30Z"
}
```

### 2. 로그 목록 조회
```
GET /api/navigation/logs?user_id={user_id}&route_mode=walking&limit=50
```

### 3. 로그 상세 조회
```
GET /api/navigation/logs/{log_id}?user_id={user_id}
```

### 4. 통계 조회
```
GET /api/navigation/logs/statistics/summary?user_id={user_id}&days=30
```

**응답 예시**:
```json
{
  "period_days": 30,
  "total_navigations": 45,
  "walking_count": 30,
  "transit_count": 15,
  "total_distance_km": 67.5,
  "total_time_hours": 18.2,
  "avg_time_difference_seconds": -120,
  "accuracy_rate": 78.5,
  "avg_user_speed_factor": 0.92,
  "avg_slope_factor": 1.08,
  "avg_weather_factor": 1.05
}
```

### 5. 로그 삭제
```
DELETE /api/navigation/logs/{log_id}?user_id={user_id}
```

## 프론트엔드 사용법

### 네비게이션 로그 저장 (자동)

안내 종료 시 자동으로 저장됩니다:

```typescript
// app/(tabs)/index.tsx의 handleNavigationToggle 함수에서 자동 처리
const handleNavigationToggle = async () => {
  if (isNavigating) {
    // 안내 종료 시 자동으로 DB에 저장
    const logData = extractNavigationLogData(
      routeInfo,
      startLocation,
      endLocation,
      routeMode,
      navigationStartTime,
      new Date()
    );
    
    await saveNavigationLog(userId, logData);
  }
};
```

### 수동 저장 예시

```typescript
import { saveNavigationLog, extractNavigationLogData } from '@/services/navigationLogService';

// 로그 데이터 생성
const logData = extractNavigationLogData(
  routeInfo,      // 경로 정보
  startLocation,  // 출발지
  endLocation,    // 도착지
  'walking',      // 'walking' 또는 'transit'
  startTime,      // Date 객체
  endTime         // Date 객체
);

// 저장
const savedLog = await saveNavigationLog(userId, logData);
```

### 로그 조회 예시

```typescript
import { getNavigationLogs, getNavigationStatistics } from '@/services/navigationLogService';

// 최근 로그 조회
const { total_count, logs } = await getNavigationLogs(userId, {
  limit: 20,
  offset: 0,
});

// 통계 조회 (최근 30일)
const stats = await getNavigationStatistics(userId, 30);
```

## 데이터베이스 마이그레이션

```bash
cd backend

# 마이그레이션 실행
python -c "from migrations.add_navigation_logs import upgrade; upgrade()"

# 또는 Alembic 사용
alembic upgrade head
```

## 데이터 활용 방안

### 1. 개인 보행 패턴 분석
- 평균 보행 속도 추이
- 경사도 대응 능력 변화
- 날씨별 보행 속도 차이

### 2. 예측 정확도 개선
- 실제 시간 vs 예상 시간 비교
- 계수별 영향도 분석
- 개인화된 계수 자동 조정

### 3. 사용자 리포트
- 월간/연간 이동 거리
- 가장 많이 이용한 경로
- 교통수단별 이용 통계

## 참고 파일

- **백엔드 모델**: `backend/app/models.py` - `NavigationLogs` 클래스
- **백엔드 스키마**: `backend/app/schemas.py` - `NavigationLogCreate`, `NavigationLogResponse`
- **백엔드 API**: `backend/app/routers/navigation_logs.py`
- **프론트엔드 서비스**: `frontend/services/navigationLogService.ts`
- **프론트엔드 화면**: `frontend/app/(tabs)/index.tsx` - `handleNavigationToggle` 함수
- **계수 계산 로직**: `backend/app/utils/Factors_Affecting_Walking_Speed.py`

## 주의사항

1. **user_id 처리**: 현재 임시로 `userId = 1` 사용. 실제 로그인 시스템 구현 시 수정 필요.
2. **오프라인 대응**: 네트워크 오류 시에도 사용자 경험에 영향 없도록 예외 처리됨.
3. **개인정보 보호**: 위치 정보가 저장되므로 GDPR/개인정보보호법 준수 필요.
4. **데이터 정제**: 이상치 제거 및 통계 계산 시 필터링 고려.

## 향후 개선 사항

- [ ] 오프라인 모드 지원 (로컬 저장 후 동기화)
- [ ] 로그 데이터 기반 AI 학습
- [ ] 사용자별 맞춤 경로 추천
- [ ] 실시간 피드백 시스템
- [ ] 배치 저장 최적화
