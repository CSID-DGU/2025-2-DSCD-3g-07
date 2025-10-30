# 평균 속도 이중 계산 기능 (Dual Case Speed Calculation)

## 📋 개요

헬스커넥트에서 수집한 속도 데이터를 두 가지 임계값 기준으로 분리하여 평균 속도를 계산하는 기능을 구현했습니다.

## 🎯 목적

사용자의 다양한 보행 활동을 정확하게 분석하고, 용도에 맞는 평균 속도를 제공합니다:

- **Case 1**: 대중교통 환승 시 도보 구간 예측 등 실제 이동 목적의 보행 속도
- **Case 2**: 느린 산책까지 포함한 전체 보행 활동 속도

## 📊 속도 분류 기준

### Case 1: 실제 이동 목적의 보행 (≥ 2.5 km/h)
```
포함되는 활동:
- 2.5~5 km/h : 보통 산책/걷기
- 5~7 km/h : 빠른 걷기

제외되는 활동:
- 쇼핑/구경 등 목적이 다른 활동
- 매우 느린 산책

적합한 용도:
- 대중교통 환승 시 도보 구간 예측
- 목적지까지의 도보 시간 추정
```

### Case 2: 느린 산책 포함 (≥ 1.5 km/h)
```
포함되는 활동:
- 1.5~2.0 km/h: 매우 느린 산책 (강아지 산책)
- 2.0~2.5 km/h: 느린 산책 (공원 산책)
- 2.5~5 km/h : 보통 산책/걷기
- 5~7 km/h : 빠른 걷기

적합한 용도:
- 전체적인 보행 활동 분석
- 건강 지표로서의 보행 속도
```

## 🔧 구현 내용

### 1. 데이터 인터페이스 수정

**파일**: `frontend/services/healthConnect.ts`

```typescript
export interface HealthData {
  steps?: number;
  distance?: number;
  speed?: number;          // 평균 속도 (기본값: Case 2)
  speedCase1?: number;     // Case 1: ≥ 2.5 km/h
  speedCase2?: number;     // Case 2: ≥ 1.5 km/h
  maxSpeed?: number;
  calories?: number;
  exerciseSessions?: any[];
  available: boolean;
  source: 'Health Connect' | 'Not Available';
  error?: string;
}
```

### 2. 속도 계산 로직 개선

#### 주요 변경사항:
- 두 가지 임계값(2.5 km/h, 1.5 km/h)을 동시에 적용
- 각 케이스별로 독립적인 시간 가중 평균 계산
- 속도 샘플 데이터 처리 시 두 가지 케이스 모두 고려

#### 계산 방식:
```typescript
// Case 1용 변수
let totalWeightedSpeedCase1 = 0;
let totalDurationSecondsCase1 = 0;

// Case 2용 변수
let totalWeightedSpeedCase2 = 0;
let totalDurationSecondsCase2 = 0;

// 각 속도 샘플에 대해:
if (kmhValue >= MIN_SPEED_THRESHOLD_CASE1) {
  // Case 1 계산
}
if (kmhValue >= MIN_SPEED_THRESHOLD_CASE2) {
  // Case 2 계산
}

// 시간 가중 평균 계산
averageSpeedCase1 = totalWeightedSpeedCase1 / totalDurationSecondsCase1;
averageSpeedCase2 = totalWeightedSpeedCase2 / totalDurationSecondsCase2;
```

### 3. UI 컴포넌트 업데이트

**파일**: `frontend/components/HealthConnectManager.tsx`

두 가지 평균 속도를 모두 표시하도록 UI 개선:

```tsx
<View style={styles.dataRow}>
  <Text style={styles.dataLabel}>🚶 평균 속도 (Case 1):</Text>
  <Text style={styles.dataValue}>
    {healthData.speedCase1 && healthData.speedCase1 > 0 
      ? `${healthData.speedCase1} km/h` 
      : '데이터 없음'}
  </Text>
</View>

<View style={styles.descRow}>
  <Text style={styles.descText}>
    ≥ 2.5 km/h (실제 이동 목적의 보행)
  </Text>
</View>

<View style={styles.dataRow}>
  <Text style={styles.dataLabel}>🚶‍♂️ 평균 속도 (Case 2):</Text>
  <Text style={styles.dataValue}>
    {healthData.speedCase2 && healthData.speedCase2 > 0 
      ? `${healthData.speedCase2} km/h` 
      : '데이터 없음'}
  </Text>
</View>

<View style={styles.descRow}>
  <Text style={styles.descText}>
    ≥ 1.5 km/h (느린 산책 포함)
  </Text>
</View>
```

### 4. 로깅 개선

콘솔 로그에서 두 가지 속도를 모두 확인 가능:

```
📊 Health data (1일): 8532 steps, 6.24 km
   속도 Case 1 (≥2.5km/h): 4.2 km/h
   속도 Case 2 (≥1.5km/h): 3.8 km/h
   최고 속도: 6.5 km/h, 칼로리: 245 cal
```

## 📈 기대 효과

### 1. 정확한 보행 시간 예측
- Case 1 속도를 사용하여 실제 이동 시 더 정확한 도착 시간 예측
- 대중교통 환승 시간 계산에 활용

### 2. 건강 데이터 분석 향상
- Case 2 속도를 사용하여 전체적인 보행 활동 패턴 파악
- 느린 산책까지 포함한 일상 활동 분석

### 3. 개인화된 경로 추천
- 사용자의 보행 스타일에 맞는 경로 제안
- 빠른 이동이 필요한 경우 vs. 여유로운 산책 경로 구분

## 🔄 호환성

### 기존 코드와의 호환성
- `speed` 필드는 Case 2 값을 기본값으로 사용 (하위 호환성 유지)
- 새로운 `speedCase1`, `speedCase2` 필드는 선택적으로 사용 가능

### API 응답 예시
```json
{
  "steps": 8532,
  "distance": 6240,
  "speed": 3.8,
  "speedCase1": 4.2,
  "speedCase2": 3.8,
  "maxSpeed": 6.5,
  "calories": 245,
  "available": true,
  "source": "Health Connect"
}
```

## 🧪 테스트 시나리오

### 1. 빠른 걸음만 있는 경우
- Case 1: 정상 계산
- Case 2: 정상 계산
- 두 값이 유사하게 나타남

### 2. 느린 산책이 포함된 경우
- Case 1: 2.5 km/h 이상 속도만 평균 계산
- Case 2: 1.5 km/h 이상 속도 모두 평균 계산
- Case 2가 Case 1보다 낮은 값

### 3. 속도 데이터가 없는 경우
- 거리와 운동 시간으로 추정
- 추정 속도가 각 임계값 이상이면 해당 Case에 적용

## 📝 추후 개선 사항

### 1. 머신러닝 기반 활동 분류
- GPS 속도 변화 패턴 분석
- 산책 vs. 이동 목적 자동 분류

### 2. 시간대별 속도 분석
- 출퇴근 시간대 vs. 여가 시간대
- 요일별 보행 패턴 분석

### 3. 개인화된 임계값
- 사용자의 보행 히스토리 기반 임계값 조정
- 나이, 건강 상태 고려

## 📚 참고 자료

- [Health Connect API Documentation](https://developer.android.com/guide/health-and-fitness/health-connect)
- [보행 속도 연구](https://www.physio-pedia.com/Walking_Speed)
- 평균 보행 속도:
  - 느린 산책: 1.5-2.5 km/h
  - 보통 걸음: 3-5 km/h
  - 빠른 걸음: 5-7 km/h

## 🤝 기여자

- 구현 날짜: 2025년 10월 30일
- 버전: 1.0.0
