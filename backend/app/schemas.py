# app/schemas.py
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

# API 요청/응답용 Pydantic 스키마


# ============ 인증 관련 스키마 ============
class UserRegisterRequest(BaseModel):
    """회원가입 요청"""

    username: str = Field(..., min_length=3, max_length=50, description="사용자 이름")
    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(
        ..., min_length=6, max_length=100, description="비밀번호 (최소 6자)"
    )


class UserLoginRequest(BaseModel):
    """로그인 요청"""

    email: EmailStr = Field(..., description="이메일 주소")
    password: str = Field(..., description="비밀번호")


class TokenResponse(BaseModel):
    """토큰 응답"""

    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    """사용자 정보 응답"""

    user_id: int
    username: str
    email: str
    auth_provider: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


# ============ 기존 스키마 ============
# 도보 구간 관련
class WalkingSectionRequest(BaseModel):
    section_time_seconds: int
    distance_meters: int
    start_name: str
    end_name: str


class WalkingSectionResponse(BaseModel):
    section_time_seconds: int
    distance_meters: int
    start_name: str
    end_name: str
    estimated_time_seconds: int
    actual_vs_estimated_diff: int
    personalized_time_seconds: Optional[int] = None
    accuracy_warning: Optional[str] = None


# 경로 응답 관련
class RouteResponse(BaseModel):
    total_time_minutes: float
    total_walk_time_minutes: float
    walk_ratio_percent: float
    non_walk_time_minutes: float
    walking_sections_count: int
    walking_sections: List[WalkingSectionResponse]
    total_estimated_walk_time_minutes: float
    total_personalized_walk_time_minutes: Optional[float] = None
    adjustment_factor: Optional[float] = None
    overall_accuracy_note: str


# DB 모델용 스키마들
class UserCreate(BaseModel):
    username: str
    email: str
    password_hash: str
    auth_provider: Optional[str] = "local"


class WeatherCacheCreate(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    weather_time: datetime
    temperature_celsius: Optional[float]
    humidity_percent: Optional[int]
    wind_speed_ms: Optional[float]
    weather_condition: Optional[str]
    precipitation_mm: Optional[int]
    air_quality_index: Optional[int]
    data_source: Optional[str] = "KMA_API"


class WeatherCacheResponse(BaseModel):
    weather_id: int
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    weather_time: datetime
    temperature_celsius: Optional[float]
    humidity_percent: Optional[int]
    wind_speed_ms: Optional[float]
    weather_condition: Optional[str]
    precipitation_mm: Optional[int]
    air_quality_index: Optional[int]
    data_source: Optional[str]
    cached_at: datetime

    class Config:
        from_attributes = True


class HealthDataCreate(BaseModel):
    user_id: int
    record_date: date
    daily_steps: Optional[int]
    daily_distance_km: Optional[float]
    active_minutes: Optional[int]
    running_distance_km: Optional[float]
    running_duration_minutes: Optional[int]
    elevation_gain_m: Optional[float] = 0.0
    elevation_loss_m: Optional[float] = 0.0
    data_source: Optional[str]
    weather_id: Optional[int]


class HealthDataResponse(BaseModel):
    health_data_id: int
    user_id: int
    record_date: date
    daily_steps: Optional[int]
    daily_distance_km: Optional[float]
    active_minutes: Optional[int]
    running_distance_km: Optional[float]
    running_duration_minutes: Optional[int]
    elevation_gain_m: Optional[float]
    elevation_loss_m: Optional[float]
    data_source: Optional[str]
    weather_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 네비게이션 로그 스키마 ============
class NavigationLogCreate(BaseModel):
    """네비게이션 로그 생성 요청"""
    
    route_mode: str = Field(..., description="경로 모드: 'transit' 또는 'walking'")
    
    # 위치 정보
    start_location: Optional[str] = Field(None, description="출발지 주소/명칭")
    end_location: Optional[str] = Field(None, description="도착지 주소/명칭")
    start_lat: float = Field(..., description="출발지 위도")
    start_lon: float = Field(..., description="출발지 경도")
    end_lat: float = Field(..., description="도착지 위도")
    end_lon: float = Field(..., description="도착지 경도")
    
    # 경로 상세 정보
    total_distance_m: float = Field(..., description="총 거리 (m)")
    walking_distance_m: Optional[float] = Field(None, description="실제 보행 거리 (m, GPS 추적)")
    transport_modes: Optional[List[str]] = Field(None, description="대중교통 수단 리스트")
    crosswalk_count: int = Field(0, description="횡단보도 개수")
    
    # 보행 시간 계산 계수
    user_speed_factor: Optional[float] = Field(None, description="사용자 속도 계수")
    slope_factor: Optional[float] = Field(None, description="경사도 계수")
    weather_factor: Optional[float] = Field(None, description="날씨 계수")
    
    # 시간 정보
    estimated_time_seconds: int = Field(..., description="예상 시간 (초)")
    actual_time_seconds: int = Field(..., description="실제 소요 시간 (초)")
    time_difference_seconds: Optional[int] = Field(None, description="시간 차이 (실제 - 예상)")
    accuracy_percent: Optional[float] = Field(None, description="전체 시간 예측 정확도 (%)")
    
    # 보행 시간 예측 정확도 측정
    estimated_walk_time_seconds: Optional[int] = Field(None, description="예측 보행 시간 (횡단보도 1/3 포함)")
    walk_time_difference_seconds: Optional[int] = Field(None, description="보행 시간 차이 (실제 - 예측)")
    walk_accuracy_percent: Optional[float] = Field(None, description="보행 예측 정확도 (%)")
    
    # 실제 보행속도 측정 (하이브리드 방식)
    active_walking_time_seconds: Optional[int] = Field(None, description="실제 걷는 시간 (정지 제외)")
    paused_time_seconds: int = Field(0, description="5초 이상 정지한 시간")
    real_walking_speed_kmh: Optional[float] = Field(None, description="실제 보행속도 (km/h)")
    pause_count: int = Field(0, description="정지 구간 횟수")
    movement_data: Optional[dict] = Field(None, description="움직임 구간 상세 데이터")
    
    # 날씨 및 상세 데이터
    weather_id: Optional[int] = Field(None, description="날씨 캐시 ID")
    route_data: Optional[dict] = Field(None, description="전체 경로 상세 정보 (JSON)")
    
    # 타임스탬프
    started_at: datetime = Field(..., description="안내 시작 시간")
    ended_at: datetime = Field(..., description="안내 종료 시간")


class NavigationLogResponse(BaseModel):
    """네비게이션 로그 응답"""
    
    log_id: int
    user_id: int
    route_mode: str
    
    # 위치 정보
    start_location: Optional[str]
    end_location: Optional[str]
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    
    # 경로 상세 정보
    total_distance_m: float
    walking_distance_m: Optional[float]
    transport_modes: Optional[List[str]]
    crosswalk_count: int
    
    # 보행 시간 계산 계수
    user_speed_factor: Optional[float]
    slope_factor: Optional[float]
    weather_factor: Optional[float]
    
    # 시간 정보
    estimated_time_seconds: int
    actual_time_seconds: int
    time_difference_seconds: Optional[int] = Field(None, description="시간 차이 (실제 - 예상)")
    accuracy_percent: Optional[float] = Field(None, description="전체 시간 예측 정확도 (%)")
    
    # 보행 시간 예측 정확도 측정
    estimated_walk_time_seconds: Optional[int] = None
    walk_time_difference_seconds: Optional[int] = None
    walk_accuracy_percent: Optional[float] = None
    
    # 실제 보행속도 측정 (하이브리드 방식) - 기존 데이터 호환성을 위해 Optional
    active_walking_time_seconds: Optional[int] = None
    paused_time_seconds: Optional[int] = None
    real_walking_speed_kmh: Optional[float] = None
    pause_count: Optional[int] = None
    movement_data: Optional[dict] = None
    
    # 날씨 및 상세 데이터
    weather_id: Optional[int]
    route_data: Optional[dict]
    
    # 타임스탬프
    started_at: datetime
    ended_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class NavigationLogListResponse(BaseModel):
    """네비게이션 로그 목록 응답"""
    
    total_count: int
    logs: List[NavigationLogResponse]
