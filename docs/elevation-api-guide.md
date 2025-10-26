# 경사도 분석 기능 가이드

## 📖 개요

PaceTry의 경사도 분석 기능은 Google Elevation API를 활용하여 Tmap 대중교통 경로의 보행 구간 경사도를 측정하고, 이를 반영한 실제 보행 시간을 계산합니다.

## 🎯 주요 기능

1. **경로 좌표 샘플링**: API 효율성을 위해 20m 간격으로 좌표 샘플링
2. **고도 데이터 획득**: Google Elevation API로 각 좌표의 고도 측정
3. **경사도 계산**: 고도차와 거리를 이용한 경사도(%) 계산
4. **보행 시간 보정**: 경사도에 따른 속도 계수 적용

## 🔧 설정

### 1. Google Elevation API 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "라이브러리"로 이동
4. "Elevation API" 검색 후 활성화
5. "사용자 인증 정보" 메뉴에서 API 키 생성
6. API 키 제한 설정 (선택사항):
   - 애플리케이션 제한: IP 주소 또는 HTTP 리퍼러
   - API 제한: Elevation API만 선택

### 2. 환경 변수 설정

**Backend (.env 파일)**
```env
GOOGLE_ELEVATION_API_KEY=your_actual_api_key_here
```

### 3. 패키지 설치

**Backend**
```bash
cd backend
pip install -r requirements.txt
```

주요 추가 패키지:
- `aiohttp==3.11.20`: 비동기 HTTP 클라이언트

## 📊 보행 속도 모델: Tobler's Hiking Function

PaceTry는 과학적으로 검증된 **Tobler's Hiking Function (1993)**을 사용하여 경사도별 보행 속도를 계산합니다.

### 모델 설명

**출처:**
- Tobler, W. (1993). "Three presentations on geographical analysis and modeling"
- NCGIA Technical Report 93-1, Figure II
- 실증 데이터 기반의 과학적 모델

**공식:**
```
W = 6 × exp(-3.5 × |S + 0.05|)
```
- W: 보행 속도 (km/h)
- S: 경사 = tan(θ) = slope_percent / 100
- exp: 자연 지수 함수

**특징:**
- 오르막과 내리막을 부호로 자동 구분 (양수=오르막, 음수=내리막)
- 연속적인 속도 값 계산 (더 정확함)
- 평지(0%): ~5.0 km/h (속도 계수 1.0)
- 최적 속도: 약 -5% 내리막에서 최대

**Python 코드 예시:**
```python
from app.utils.elevation_helpers import calculate_slope_factor

# 부호로 오르막/내리막 자동 구분
uphill_factor = calculate_slope_factor(10)    # 10% 오르막 → 0.710
downhill_factor = calculate_slope_factor(-10) # 10% 내리막 → 1.007
flat_factor = calculate_slope_factor(0)       # 평지 → 1.007

# 실제 속도 계산 (기준 속도 5 km/h)
uphill_speed = uphill_factor * 5    # 3.55 km/h
downhill_speed = downhill_factor * 5 # 5.04 km/h
```

### 경사도별 속도 예시

| 경사도 | 지형 설명 | 속도 (km/h) | 속도 계수 | 비고 |
|--------|-----------|-------------|-----------|------|
| -20% | 가파른 내리막 | ~3.25 | 0.65 | 조심스럽게 |
| -10% | 보통 내리막 | ~4.6 | 0.92 | 약간 빠름 |
| -5% | 완만한 내리막 | ~5.4 | 1.08 | 최적 속도 |
| -3% | 약간 내리막 | ~5.3 | 1.06 | 약간 빠름 |
| 0% | **평지** | **5.0** | **1.0** | **기준** |
| 3% | 완만한 오르막 | ~4.2 | 0.84 | 약간 느림 |
| 5% | 보통 오르막 | ~3.6 | 0.72 | 느림 |
| 10% | 가파른 오르막 | ~2.5 | 0.50 | 상당히 느림 |
| 15% | 매우 가파름 | ~1.6 | 0.32 | 매우 느림 |
| 20% | 급경사 | ~1.05 | 0.21 | 극도로 느림 |

**내리막 특성:**
- 완만한 내리막(-3~-5%): 가장 빠른 속도
- 가파른 내리막(-10% 이상): 안전을 위해 속도 감소
- Tobler 모델이 자연스럽게 반영

## 🔄 데이터 흐름

```
1. Frontend: Tmap 경로 데이터 획득
   ↓
2. Frontend → Backend: /api/routes/analyze-slope POST
   ↓
3. Backend: 보행 구간(WALK) 추출
   ↓
4. Backend: 좌표 샘플링 (200개 → 75개)
   ↓
5. Backend → Google: Elevation API 호출
   ↓
6. Backend: 경사도 계산 및 시간 보정
   ↓
7. Backend → Frontend: 분석 결과 반환
   ↓
8. Frontend: UI에 표시
```

## 💻 사용 예시

### Backend API 호출

```python
# Python 예시
import requests

tmap_route = {
    "legs": [
        {
            "mode": "WALK",
            "sectionTime": 752,
            "distance": 888,
            "start": {"name": "출발지", "lon": 127.0, "lat": 37.557778},
            "end": {"name": "도착지", "lon": 127.001, "lat": 37.558},
            "steps": [
                {
                    "distance": 52,
                    "linestring": "127.00001,37.557808 126.99967,37.55789"
                }
            ]
        }
    ]
}

response = requests.post(
    "http://localhost:8000/api/routes/analyze-slope",
    json={"itinerary": tmap_route}
)

result = response.json()
print(f"원래 시간: {result['total_original_walk_time']}초")
print(f"보정 시간: {result['total_adjusted_walk_time']}초")
print(f"차이: {result['total_route_time_adjustment']}초")
```

### Frontend (React Native/Expo) 사용

```typescript
import { analyzeRouteSlope, formatTime, formatTimeDifference } from '@/services/elevationService';

// Tmap 경로 데이터 획득 후
const itinerary = tmapResponse.metaData.plan.itineraries[0];

// 경사도 분석
try {
  const analysis = await analyzeRouteSlope(itinerary);
  
  console.log('원래 보행 시간:', formatTime(analysis.total_original_walk_time));
  console.log('보정된 보행 시간:', formatTime(analysis.total_adjusted_walk_time));
  console.log('시간 차이:', formatTimeDifference(analysis.total_route_time_adjustment));
  
  // 각 구간별 정보
  analysis.walk_legs_analysis.forEach((leg, index) => {
    console.log(`\n구간 ${index + 1}: ${leg.start_name} → ${leg.end_name}`);
    console.log(`- 거리: ${leg.distance}m`);
    console.log(`- 평균 경사도: ${leg.avg_slope.toFixed(1)}%`);
    console.log(`- 시간 차이: ${formatTimeDifference(leg.time_diff)}`);
  });
  
} catch (error) {
  console.error('경사도 분석 실패:', error);
}
```

## 📈 응답 데이터 구조

```json
{
  "walk_legs_analysis": [
    {
      "leg_index": 0,
      "start_name": "출발지",
      "end_name": "충무로역",
      "distance": 888,
      "original_time": 752,
      "adjusted_time": 823,
      "time_diff": 71,
      "avg_slope": 4.2,
      "max_slope": 8.5,
      "min_slope": -2.1,
      "segments": [
        {
          "distance": 22.5,
          "elevation_start": 45.2,
          "elevation_end": 46.1,
          "elevation_diff": 0.9,
          "slope": 4.0,
          "is_uphill": true,
          "speed_factor": 0.9,
          "time": 17.8
        }
      ]
    }
  ],
  "total_original_walk_time": 1488,
  "total_adjusted_walk_time": 1621,
  "total_route_time_adjustment": 133,
  "sampled_coords_count": 75,
  "original_coords_count": 200
}
```

## ⚠️ 주의사항

### API 제한사항

**Google Elevation API:**
- 무료 티어: 25,000 요청/일
- 최대 512개 좌표/요청
- URL 길이: 8192자 제한

**권장사항:**
- 좌표 샘플링을 통한 효율적 사용
- 캐싱으로 중복 요청 방지
- Rate limiting 적용

### 정확도

- 샘플링 간격: 약 20m
- 짧은 구간 (<50m): 모든 좌표 사용
- 긴 구간 (>200m): 20-30m 간격 샘플링

### 에러 처리

```typescript
try {
  const analysis = await analyzeRouteSlope(itinerary);
  
  if (analysis.error) {
    // API 오류가 있어도 원본 시간은 반환됨
    console.warn('경사도 분석 일부 실패:', analysis.error);
    // 원본 시간 사용
    useOriginalTime(analysis.total_original_walk_time);
  } else {
    // 정상 처리
    useAdjustedTime(analysis.total_adjusted_walk_time);
  }
  
} catch (error) {
  // 완전 실패
  console.error('경사도 분석 실패:', error);
  // Fallback: 원본 Tmap 시간 사용
}
```

## 🧪 테스트

### Backend 테스트

```bash
cd backend
pytest tests/test_elevation_helpers.py -v
```

### API 수동 테스트

```bash
# 서버 실행
cd backend
uvicorn app.main:app --reload

# 다른 터미널에서
curl -X POST "http://localhost:8000/api/routes/analyze-slope" \
  -H "Content-Type: application/json" \
  -d @test_data/sample_route.json
```

## 📝 구현 세부사항

### 좌표 샘플링 알고리즘

```python
def smart_sample_coordinates(linestring: str, distance: float) -> List[Dict]:
    """
    거리 기반 적응형 샘플링
    """
    coords = parse_linestring(linestring)
    
    if distance < 50:  # 50m 미만: 모든 좌표
        return coords
    elif distance < 200:  # 200m 미만: 10m당 1개
        sample_rate = len(coords) // (distance // 10)
    else:  # 200m 이상: 20m당 1개
        sample_rate = len(coords) // (distance // 20)
    
    # 시작점과 끝점은 항상 포함
    sampled = [coords[0]]
    for i in range(sample_rate, len(coords) - 1, sample_rate):
        sampled.append(coords[i])
    sampled.append(coords[-1])
    
    return sampled
```

### 경사도 계산 공식

```python
경사도(%) = (고도차 / 수평거리) × 100

예시:
- 거리: 100m
- 고도차: 5m
- 경사도: (5 / 100) × 100 = 5%
```

### 보행 시간 보정 공식

```python
보정 시간 = 거리 / (기본 속도 × 속도 계수)

예시:
- 거리: 100m
- 기본 속도: 1.4 m/s
- 경사도: 5% (속도 계수: 0.9)
- 보정 시간: 100 / (1.4 × 0.9) = 79.4초
```

## 🔗 관련 문서

- [Tmap API 문서](docs/tmap-api.md)
- [Google Elevation API 공식 문서](https://developers.google.com/maps/documentation/elevation)
- [Backend API 문서](docs/backend-api.md)

## 📞 문의

기술적 문제나 개선 제안이 있으시면 이슈를 등록해주세요.
