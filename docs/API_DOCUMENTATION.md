# PaceTry API v1.0.0

보행 속도 개인화 API

## 인증

### Register
`POST /api/auth/register`

회원가입

- username, email, password로 새 계정 생성
- 이메일/사용자명 중복 검사
- 비밀번호 해싱 후 저장
- JWT 토큰 즉시 발급 (자동 로그인)

#### Request Body
- Content-Type: `application/json`
- Schema: `UserRegisterRequest`
  - (See Components > Schemas > UserRegisterRequest)

#### Responses
- **201**: Successful Response
- **422**: Validation Error

---

### Login
`POST /api/auth/login`

로그인

- 이메일/비밀번호로 인증
- JWT 토큰 발급

#### Request Body
- Content-Type: `application/json`
- Schema: `UserLoginRequest`
  - (See Components > Schemas > UserLoginRequest)

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Get Current User Info
`GET /api/auth/me`

현재 로그인한 사용자 정보 조회

- Authorization 헤더에 Bearer 토큰 필요
- 토큰에서 사용자 정보 추출하여 반환

#### Responses
- **200**: Successful Response

---

### Protected Route Example
`GET /api/auth/protected-example`

보호된 라우트 예시

- 로그인한 사용자만 접근 가능
- 다른 엔드포인트에서 get_current_user를 의존성으로 추가하면 인증 필요

#### Responses
- **200**: Successful Response

---

## routes

### Analyze Slope
`POST /api/routes/analyze-slope`

Tmap 경로 데이터에서 보행 구간의 경사도를 분석하고 보정된 시간을 반환

**처리 과정:**
1. Tmap 경로에서 보행 구간(WALK) 추출
2. 좌표 샘플링 (API 효율성을 위해 20m 간격으로)
3. Google Elevation API로 고도 데이터 획득
4. 경사도 계산 및 속도 계수 적용 (Tobler's Function)
5. 통합 계산 (Factors_Affecting_Walking_Speed)
   - Tmap 기준 시간 (1.0)
   - × 사용자 속도 계수 (Health Connect)
   - × 경사도 계수 (Tobler's Function)
   - × 날씨 계수 (WeatherSpeedModel)
6. 최종 보정된 보행 시간 반환

**경사도별 속도 계수:**
- 평지 (0-3%): 1.0배
- 완만 (3-5%): 0.9배
- 보통 (5-10%): 0.75배
- 가파름 (10-15%): 0.6배
- 매우 가파름 (15%+): 0.4배

**날씨 보정:**
- 기온, 강수량, 적설량을 고려한 속도 보정
- weather_data 파라미터를 통해 전달

Args:
    request: Tmap itinerary 데이터, 선택적 API 키, 선택적 날씨 데이터

Returns:
    경사도 분석 결과 및 보정된 시간 (날씨 영향 포함)

Raises:
    HTTPException: API 키가 없거나 처리 중 오류 발생 시

#### Request Body
- Content-Type: `application/json`
- Schema: `AnalyzeSlopeRequest`
  - (See Components > Schemas > AnalyzeSlopeRequest)

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Health Check
`GET /api/routes/health`

경로 분석 서비스 헬스 체크

#### Responses
- **200**: Successful Response

---

### List Routes
`GET /api/routes/routes`

경로 목록 조회 (필터링 가능)

Args:
    route_type: 경로 타입 (walking/running/mixed)
    difficulty: 난이도 (easy/moderate/hard)
    min_distance: 최소 거리 (km)
    max_distance: 최대 거리 (km)
    limit: 조회 개수 제한
    offset: 오프셋
    db: DB 세션

Returns:
    경로 목록 및 총 개수

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| route_type | query | any | False |  |
| difficulty | query | any | False |  |
| min_distance | query | any | False |  |
| max_distance | query | any | False |  |
| limit | query | integer | False |  |
| offset | query | integer | False |  |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Get Route Detail
`GET /api/routes/routes/{route_id}`

특정 경로의 상세 정보 조회

Args:
    route_id: 조회할 경로 ID
    db: DB 세션

Returns:
    경로 상세 정보 및 세그먼트 정보

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| route_id | path | integer | True |  |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Recommend Routes
`GET /api/routes/recommend`

사용자 위치 기반 경로 추천

로직:
1. PostgreSQL에서 모든 GPX 경로 조회
2. 각 경로의 시작점과 사용자 위치 간 거리 계산
3. 사용자 위치에서 가까운 순으로 정렬
4. 목표 거리/시간에 맞는 코스만 필터링

Args:
    distance_km: 목표 거리 (km)
    duration_minutes: 목표 시간 (분)
    difficulty: 선호 난이도 (easy/moderate/hard)
    route_type: 경로 타입 (walking/running/mixed)
    user_lat: 사용자 위도 (필수)
    user_lng: 사용자 경도 (필수)
    user_speed_kmh: 사용자 평균 보행 속도 (km/h, Health Connect Case 2)
    max_distance_from_user: 검색 반경 (km, 기본 10km)
    distance_tolerance: 거리 허용 오차 (km, 기본 ±1km)
    duration_tolerance: 시간 허용 오차 (분, 기본 ±15분)
    limit: 최대 반환 개수
    db: DB 세션

Returns:
    추천 경로 목록 (가까운 순)

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| distance_km | query | any | False |  |
| duration_minutes | query | any | False |  |
| difficulty | query | any | False |  |
| route_type | query | any | False |  |
| user_lat | query | any | False |  |
| user_lng | query | any | False |  |
| user_speed_kmh | query | any | False |  |
| max_distance_from_user | query | number | False |  |
| distance_tolerance | query | number | False |  |
| duration_tolerance | query | integer | False |  |
| limit | query | integer | False |  |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

## weather

### Proxy Kma Weather
`GET /api/weather/kma`

기상청 단기예보 API 프록시.
브라우저 환경에서 발생하는 CORS 이슈를 피하기 위해 서버에서 요청 후 결과를 그대로 전달한다.

최적화:
- 5분 캐싱으로 불필요한 API 호출 최소화
- 같은 격자 좌표는 같은 데이터 공유

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| lat | query | number | True | 위도 |
| lon | query | number | True | 경도 |
| numOfRows | query | integer | False |  |
| pageNo | query | integer | False |  |
| dataType | query | string | False |  |
| baseDate | query | any | False |  |
| baseTime | query | any | False |  |
| serviceKey | query | any | False |  |
| useCache | query | boolean | False | 캐시 사용 여부 |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Clear Cache
`POST /api/weather/cache/clear`

캐시 전체 삭제 (디버깅/테스트용)

#### Responses
- **200**: Successful Response

---

### Predict Walking Speed
`POST /api/weather/speed/predict`

날씨 조건에 따른 보행속도 예측

**기능:**
- 기온, 강수량, 적설량을 고려한 보행속도 계산
- 보폭 및 보행수 계수 분석
- 안전 경고 생성 (어는 비, 폭설 등)

**예측 모델:**
- 기온 효과: 10°C 부근이 가장 쾌적 (시그모이드 + 가우시안)
- 강우 효과: 비가 올수록 속도 감소 (지수 함수)
- 적설 효과: 눈이 쌓일수록 속도 대폭 감소
- 어는 비/습설: 추가 보정 계수 적용

**사용 예시:**
```json
{
  "base_speed_mps": 1.4,
  "temp_c": 18,
  "pty": 0
}
```

#### Request Body
- Content-Type: `application/json`
- Schema: `WeatherSpeedRequest`
  - (See Components > Schemas > WeatherSpeedRequest)

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Calculate Weather Eta
`POST /api/weather/speed/eta`

날씨를 고려한 ETA(예상 도착 시간) 계산

**기능:**
- 거리와 기준 속도를 기반으로 ETA 계산
- 날씨 조건에 따른 시간 보정
- 기준 시간 대비 차이 제공

**활용:**
- 경로 안내 시 정확한 도착 시간 제공
- 날씨에 따른 시간 여유 계산
- 실시간 경로 재계산

**사용 예시:**
```json
{
  "distance_m": 1000,
  "base_speed_mps": 1.4,
  "temp_c": 5,
  "pty": 1,
  "rain_mm_per_h": 5.0
}
```

#### Request Body
- Content-Type: `application/json`
- Schema: `WeatherETARequest`
  - (See Components > Schemas > WeatherETARequest)

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Reset Speed Smoothing
`POST /api/weather/speed/reset-smoothing`

속도 예측 스무딩 상태 초기화

**용도:** 새로운 경로 시작 시 이전 스무딩 히스토리 제거

#### Responses
- **200**: Successful Response

---

### Get Model Info
`GET /api/weather/speed/model-info`

날씨 기반 속도 예측 모델 정보 조회

**반환 정보:**
- 모델 파라미터
- 클램프 범위
- 스무딩 설정

#### Responses
- **200**: Successful Response

---

### Save Weather Data
`POST /api/weather/save`

날씨 데이터를 DB에 저장하고 weather_id 반환

네비게이션 로그 저장 시 weather_id를 함께 저장하기 위해 사용

#### Request Body
- Content-Type: `application/json`
- Schema: `WeatherSaveRequest`
  - (See Components > Schemas > WeatherSaveRequest)

#### Responses
- **201**: Successful Response
- **422**: Validation Error

---

## walking

### Get Walking Route
`POST /api/walking/route`

Tmap 보행자 경로 API를 호출하여 도보 경로 반환

Args:
    request: 출발지/도착지 좌표 정보

Returns:
    GeoJSON 형식의 보행자 경로 데이터
    - type: FeatureCollection
    - features: 경로 좌표 및 안내 정보 배열
    - properties: 총 거리, 총 시간 등 요약 정보

#### Request Body
- Content-Type: `application/json`
- Schema: `WalkingRouteRequest`
  - (See Components > Schemas > WalkingRouteRequest)

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Health Check
`GET /api/walking/health`

보행자 경로 서비스 헬스 체크

#### Responses
- **200**: Successful Response

---

## navigation_logs

### Create Navigation Log
`POST /api/navigation/logs`

네비게이션 로그 저장

경로 안내가 종료되면 프론트엔드에서 이 API를 호출하여 로그를 저장합니다.

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| user_id | query | integer | True | 사용자 ID |

#### Request Body
- Content-Type: `application/json`
- Schema: `NavigationLogCreate`
  - (See Components > Schemas > NavigationLogCreate)

#### Responses
- **201**: Successful Response
- **422**: Validation Error

---

### Get Navigation Logs
`GET /api/navigation/logs`

네비게이션 로그 목록 조회

사용자의 경로 안내 기록을 조회합니다.

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| user_id | query | integer | True | 사용자 ID |
| route_mode | query | any | False | 경로 모드 필터 (transit/walking) |
| start_date | query | any | False | 조회 시작 날짜 |
| end_date | query | any | False | 조회 종료 날짜 |
| limit | query | integer | False | 조회 개수 |
| offset | query | integer | False | 오프셋 |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Get Navigation Log Detail
`GET /api/navigation/logs/{log_id}`

네비게이션 로그 상세 조회

특정 네비게이션 로그의 상세 정보를 조회합니다.

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| log_id | path | integer | True |  |
| user_id | query | integer | True | 사용자 ID |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Delete Navigation Log
`DELETE /api/navigation/logs/{log_id}`

네비게이션 로그 삭제

특정 네비게이션 로그를 삭제합니다.

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| log_id | path | integer | True |  |
| user_id | query | integer | True | 사용자 ID |

#### Responses
- **204**: Successful Response
- **422**: Validation Error

---

### Get Navigation Statistics
`GET /api/navigation/logs/statistics/summary`

네비게이션 통계 조회

사용자의 경로 안내 사용 통계를 제공합니다.

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| user_id | query | integer | True | 사용자 ID |
| days | query | integer | False | 통계 기간 (일) |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

## personalization

### Get Speed Profile
`GET /api/profile/speed`

사용자의 속도 프로필 조회

- 로그인 필요
- activity_type별 평균 속도 반환

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| activity_type | query | string | False | 활동 유형 |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

### Update Speed Profile
`PUT /api/profile/speed`

사용자의 속도 프로필 수동 업데이트

- 로그인 필요
- 사용자가 직접 선택한 속도로 덮어쓰기 (가중평균 아님)

#### Request Body
- Content-Type: `application/json`
- Schema: `SpeedProfileUpdateRequest`
  - (See Components > Schemas > SpeedProfileUpdateRequest)

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

## Uncategorized

### Read Root
`GET /`

API 루트 엔드포인트

Returns:
    환영 메시지 및 서버 정보

#### Responses
- **200**: Successful Response

---

## Health

### Api Health Check
`GET /api-health`

API 서버 상태를 확인합니다.

#### Responses
- **200**: Successful Response

---

### Db Health Check
`GET /db-health`

데이터베이스 연결 상태 확인

#### Responses
- **200**: Successful Response

---

## Routes

### Get Transit Route
`GET /transit-route`

T맵 대중교통 경로를 검색합니다.

보행 시간 재계산 및 보정은 /api/routes/analyze-slope에서 수행

#### Parameters
| Name | In | Type | Required | Description |
|---|---|---|---|---|
| start_x | query | number | True | 출발지 경도 |
| start_y | query | number | True | 출발지 위도 |
| end_x | query | number | True | 도착지 경도 |
| end_y | query | number | True | 도착지 위도 |
| count | query | integer | False | 경로 개수 |
| lang | query | integer | False | 언어 설정 |
| format | query | string | False | 응답 형식 |

#### Responses
- **200**: Successful Response
- **422**: Validation Error

---

## Schemas

### AnalyzeSlopeRequest
Type: object
Description: 경사도 분석 요청 모델
| Property | Type | Description |
|---|---|---|
| itinerary | object |  |
| api_key | string | null |  |
| weather_data | object | null |  |
| user_speed_mps | number | null |  |

### AnalyzeSlopeResponse
Type: object
Description: 경사도 분석 응답 모델
| Property | Type | Description |
|---|---|---|
| walk_legs_analysis | array |  |
| total_original_walk_time | integer |  |
| total_adjusted_walk_time | integer |  |
| total_route_time_adjustment | integer |  |
| crosswalk_count | integer | null |  |
| crosswalk_wait_time | integer | null |  |
| total_time_with_crosswalk | integer | null |  |
| factors | FactorsInfo | null |  |
| user_speed_mps | number | null |  |
| weather_applied | boolean | null |  |
| sampled_coords_count | integer | null |  |
| original_coords_count | integer | null |  |
| data_quality | object | null |  |
| error | string | null |  |

### FactorsInfo
Type: object
Description: 통합 계수 정보
| Property | Type | Description |
|---|---|---|
| user_speed_factor | number |  |
| slope_factor | number |  |
| weather_factor | number |  |
| final_factor | number |  |

### HTTPValidationError
Type: object
| Property | Type | Description |
|---|---|---|
| detail | array |  |

### NavigationLogCreate
Type: object
Description: 네비게이션 로그 생성 요청
| Property | Type | Description |
|---|---|---|
| route_mode | string | 경로 모드: 'transit' 또는 'walking' |
| start_location | string | null | 출발지 주소/명칭 |
| end_location | string | null | 도착지 주소/명칭 |
| start_lat | number | 출발지 위도 |
| start_lon | number | 출발지 경도 |
| end_lat | number | 도착지 위도 |
| end_lon | number | 도착지 경도 |
| total_distance_m | number | 총 거리 (m) |
| walking_distance_m | number | null | 실제 보행 거리 (m, GPS 추적) |
| transport_modes | array | null | 대중교통 수단 리스트 |
| crosswalk_count | integer | 횡단보도 개수 |
| user_speed_factor | number | null | 사용자 속도 계수 |
| slope_factor | number | null | 경사도 계수 |
| weather_factor | number | null | 날씨 계수 |
| estimated_time_seconds | integer | 예상 시간 (초) |
| actual_time_seconds | integer | 실제 소요 시간 (초) |
| time_difference_seconds | integer | null | 시간 차이 (실제 - 예상) |
| accuracy_percent | number | null | 전체 시간 예측 정확도 (%) |
| estimated_walk_time_seconds | integer | null | 예측 보행 시간 (횡단보도 1/3 포함) |
| walk_time_difference_seconds | integer | null | 보행 시간 차이 (실제 - 예측) |
| walk_accuracy_percent | number | null | 보행 예측 정확도 (%) |
| active_walking_time_seconds | integer | null | 실제 걷는 시간 (정지 제외) |
| paused_time_seconds | integer | 5초 이상 정지한 시간 |
| real_walking_speed_kmh | number | null | 실제 보행속도 (km/h) |
| pause_count | integer | 정지 구간 횟수 |
| movement_data | object | null | 움직임 구간 상세 데이터 |
| weather_id | integer | null | 날씨 캐시 ID |
| route_data | object | null | 전체 경로 상세 정보 (JSON) |
| started_at | string | 안내 시작 시간 |
| ended_at | string | 안내 종료 시간 |

### NavigationLogListResponse
Type: object
Description: 네비게이션 로그 목록 응답
| Property | Type | Description |
|---|---|---|
| total_count | integer |  |
| logs | array |  |

### NavigationLogResponse
Type: object
Description: 네비게이션 로그 응답
| Property | Type | Description |
|---|---|---|
| log_id | integer |  |
| user_id | integer |  |
| route_mode | string |  |
| start_location | string | null |  |
| end_location | string | null |  |
| start_lat | number |  |
| start_lon | number |  |
| end_lat | number |  |
| end_lon | number |  |
| total_distance_m | number |  |
| walking_distance_m | number | null |  |
| transport_modes | array | null |  |
| crosswalk_count | integer |  |
| user_speed_factor | number | null |  |
| slope_factor | number | null |  |
| weather_factor | number | null |  |
| estimated_time_seconds | integer |  |
| actual_time_seconds | integer |  |
| time_difference_seconds | integer | null | 시간 차이 (실제 - 예상) |
| accuracy_percent | number | null | 전체 시간 예측 정확도 (%) |
| estimated_walk_time_seconds | integer | null |  |
| walk_time_difference_seconds | integer | null |  |
| walk_accuracy_percent | number | null |  |
| active_walking_time_seconds | integer | null |  |
| paused_time_seconds | integer | null |  |
| real_walking_speed_kmh | number | null |  |
| pause_count | integer | null |  |
| movement_data | object | null |  |
| weather_id | integer | null |  |
| route_data | object | null |  |
| started_at | string |  |
| ended_at | string |  |
| created_at | string |  |

### SpeedProfileResponse
Type: object
Description: 속도 프로필 응답
| Property | Type | Description |
|---|---|---|
| profile_id | integer |  |
| user_id | integer |  |
| activity_type | string |  |
| speed_case1 | number | 평지 기준 평균 속도 (km/h) - Case1: 경로 안내용 |
| speed_case2 | number | null | 느린 산책 속도 (km/h) - Case2: 코스 추천용 |
| data_points_count | integer | 누적 데이터 포인트 수 |

### SpeedProfileUpdateRequest
Type: object
Description: 속도 프로필 수동 업데이트 요청
| Property | Type | Description |
|---|---|---|
| speed_case1 | number | 새로운 평균 속도 (km/h) |
| speed_case2 | number | null | 느린 산책 속도 (km/h) |
| activity_type | string | 활동 유형 |

### TokenResponse
Type: object
Description: 토큰 응답
| Property | Type | Description |
|---|---|---|
| access_token | string |  |
| token_type | string |  |
| user | [UserResponse] |  |

### UserLoginRequest
Type: object
Description: 로그인 요청
| Property | Type | Description |
|---|---|---|
| email | string | 이메일 주소 |
| password | string | 비밀번호 |

### UserRegisterRequest
Type: object
Description: 회원가입 요청
| Property | Type | Description |
|---|---|---|
| username | string | 사용자 이름 |
| email | string | 이메일 주소 |
| password | string | 비밀번호 (최소 6자) |

### UserResponse
Type: object
Description: 사용자 정보 응답
| Property | Type | Description |
|---|---|---|
| user_id | integer |  |
| username | string |  |
| email | string |  |
| auth_provider | string | null |  |
| created_at | string |  |
| last_login | string | null |  |

### ValidationError
Type: object
| Property | Type | Description |
|---|---|---|
| loc | array |  |
| msg | string |  |
| type | string |  |

### WalkingRouteRequest
Type: object
Description: 보행자 경로 요청 모델
| Property | Type | Description |
|---|---|---|
| start_x | number |  |
| start_y | number |  |
| end_x | number |  |
| end_y | number |  |
| start_name | string | null |  |
| end_name | string | null |  |
| user_speed_mps | number | null |  |
| weather_data | object | null |  |

### WeatherCacheResponse
Type: object
| Property | Type | Description |
|---|---|---|
| weather_id | integer |  |
| latitude | number |  |
| longitude | number |  |
| location_name | string | null |  |
| weather_time | string |  |
| temperature_celsius | number | null |  |
| humidity_percent | integer | null |  |
| wind_speed_ms | number | null |  |
| weather_condition | string | null |  |
| precipitation_mm | integer | null |  |
| air_quality_index | integer | null |  |
| data_source | string | null |  |
| cached_at | string |  |

### WeatherETARequest
Type: object
Description: 날씨 기반 ETA 계산 요청
| Property | Type | Description |
|---|---|---|
| distance_m | number | 거리 (m) |
| base_speed_mps | number | 기준 속도 (m/s) |
| temp_c | number | 기온 (°C) |
| pty | integer | 강수형태 |
| rain_mm_per_h | number | null | 시간당 강수량 (mm/h) |
| snow_cm_per_h | number | null | 시간당 신적설 (cm/h) |

### WeatherETAResponse
Type: object
Description: 날씨 기반 ETA 계산 응답
| Property | Type | Description |
|---|---|---|
| eta_minutes | number | 예상 도착 시간 (분) |
| eta_seconds | number | 예상 도착 시간 (초) |
| base_eta_seconds | number | 기준 도착 시간 (초) |
| time_difference_seconds | number | 시간 차이 (초) |
| speed_kmh | number | 예측 속도 (km/h) |
| weather_coeff | number | 날씨 계수 |
| warnings | array | 안전 경고 |

### WeatherSaveRequest
Type: object
| Property | Type | Description |
|---|---|---|
| latitude | number |  |
| longitude | number |  |
| temperature_celsius | number |  |
| weather_condition | string | null |  |
| precipitation_mm | number | null |  |

### WeatherSpeedRequest
Type: object
Description: 날씨 기반 속도 예측 요청
| Property | Type | Description |
|---|---|---|
| base_speed_mps | number | 기준 속도 (m/s) |
| temp_c | number | 기온 (°C) |
| pty | integer | 강수형태 (0:없음, 1:비, 2:진눈깨비, 3:눈) |
| rain_mm_per_h | number | null | 시간당 강수량 (mm/h) |
| snow_cm_per_h | number | null | 시간당 신적설 (cm/h) |
| use_smoothing | boolean | 스무딩 적용 여부 |

### WeatherSpeedResponse
Type: object
Description: 날씨 기반 속도 예측 응답
| Property | Type | Description |
|---|---|---|
| stride_factor | number | 보폭 계수 |
| cadence_factor | number | 보행수 계수 |
| weather_coeff | number | 최종 날씨 계수 |
| speed_mps | number | 예측 속도 (m/s) |
| speed_kmh | number | 예측 속도 (km/h) |
| percent_change | number | 기준 대비 변화율 (%) |
| warnings | array | 안전 경고 |
