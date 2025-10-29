# 기상청 API 전환 가이드

## 개요
Open Meteo API에서 기상청 단기예보 API로 전환했습니다.

## 변경사항

### 1. API 엔드포인트 변경
- **이전**: Open Meteo API (`https://api.open-meteo.com/v1/forecast`)
- **현재**: 기상청 단기예보 API (`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`)

### 2. API 키
- **API 키**: `fd3ec2dea8cbb11a251a2ce60843ea3236811fca06f2a8eb8f63426b208f35da`
- **위치**: `frontend/services/weatherService.ts`

### 3. 주요 변경 파일

#### `frontend/types/weather.ts`
- 기상청 API 타입 정의 추가:
  - `KMAWeatherResponse`: 기상청 API 응답 타입
  - `KMAWeatherItem`: 기상청 날씨 항목 타입
  - `KMACategory`: 기상청 카테고리 코드
  - `ParsedWeatherData`: 파싱된 날씨 데이터
  
- `OpenMeteoResponse` 타입 간소화 (하위 호환성 유지)
- `getWeatherDescription()` 함수 업데이트:
  - 기상청 SKY(하늘상태)와 PTY(강수형태) 코드 지원
  - 기존 코드 지원을 위한 `getWeatherDescriptionFromCode()` 추가

#### `frontend/services/weatherService.ts`
- **새로운 함수들**:
  - `convertToGrid()`: 위경도 → 기상청 격자 좌표 변환
  - `getBaseTime()`: 기상청 API 발표 시각 계산
  - `convertKMAToOpenMeteo()`: 기상청 데이터 → OpenMeteo 형식 변환

- **업데이트된 함수들**:
  - `getCurrentWeather()`: 기상청 API 호출
  - `getHourlyWeather()`: 기상청 단기예보 데이터 반환
  - `getDailyWeather()`: 시간별 데이터에서 일별 통계 생성
  - `getCompleteWeather()`: 종합 날씨 정보 반환

#### `frontend/components/WeatherTestScreen.tsx`
- 제목 변경: "기상청 날씨 API 테스트"
- 불필요한 필드 제거 (elevation, generationtime_ms, 등)
- `getWeatherDescriptionFromCode()` 사용

### 4. 기상청 API 데이터 구조

#### 카테고리 코드
- `POP`: 강수확률 (%)
- `PTY`: 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기)
- `PCP`: 1시간 강수량 (mm)
- `REH`: 습도 (%)
- `SNO`: 1시간 신적설 (cm)
- `SKY`: 하늘상태 (1:맑음, 3:구름많음, 4:흐림)
- `TMP`: 1시간 기온 (℃)
- `TMN`: 일 최저기온 (℃)
- `TMX`: 일 최고기온 (℃)
- `VEC`: 풍향 (deg)
- `WSD`: 풍속 (m/s)

#### 격자 좌표 변환
기상청 API는 위경도가 아닌 격자 좌표(nx, ny)를 사용합니다.
- Lambert Conformal Conic 투영법 사용
- 서울(37.5665°N, 126.9780°E) ≈ (60, 127)

### 5. 하위 호환성
기존 코드와의 호환성을 위해 OpenMeteo 응답 형식을 유지합니다:
- `OpenMeteoResponse` 인터페이스 유지
- 기상청 데이터를 OpenMeteo 형식으로 변환
- 기존 컴포넌트에서 수정 최소화

### 6. 제한사항
- **발표 시각**: 기상청 API는 2시간 전 데이터 제공
- **예보 범위**: 단기예보는 3일간의 시간별 예보 제공
- **격자 단위**: 약 5km 해상도

## 테스트 방법

### 1. 앱 실행
```bash
cd frontend
npm start
```

### 2. 날씨 테스트 화면
- 앱에서 "Weather Test" 탭으로 이동
- "날씨 가져오기" 버튼 클릭
- 현재 위치 또는 서울 날씨 확인

### 3. 확인 사항
- ✅ 현재 날씨 정보 표시
- ✅ 시간별 예보 (최대 72시간)
- ✅ 일별 예보 (최대 3일)
- ✅ 강수 정보 (확률, 형태, 양)
- ✅ 풍속, 습도 등 상세 정보

## API 키 보안
현재 API 키가 코드에 하드코딩되어 있습니다. 프로덕션 환경에서는:

1. 환경 변수로 관리:
```typescript
const KMA_API_KEY = process.env.EXPO_PUBLIC_KMA_API_KEY || '';
```

2. `.env` 파일 생성:
```
EXPO_PUBLIC_KMA_API_KEY=your_api_key_here
```

3. `.gitignore`에 추가:
```
.env
.env.local
```

## 참고 자료
- [기상청 단기예보 API 문서](https://www.data.go.kr/data/15084084/openapi.do)
- [기상청 격자 좌표 변환 가이드](https://www.kma.go.kr/images/weather/lifenindustry/timeseries_XML.pdf)
