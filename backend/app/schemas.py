# app/schemas.py
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date

# API 요청/응답용 Pydantic 스키마

# 사용자 프로필 관련
class UserProfileRequest(BaseModel):
    user_id: str
    age: int
    fatigue_level: int  # 1-5 (피로도)
    walking_speed: Optional[float] = None  # m/s, 옵션

class UserProfileResponse(BaseModel):
    user_id: str
    age: int
    fatigue_level: int
    walking_speed: Optional[float] = None

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

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    auth_provider: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

class WeatherCacheCreate(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str]
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
    location_name: Optional[str]
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