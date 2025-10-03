from typing import Optional

from pydantic import BaseModel


# 사용자 프로필 모델 (개인화 데이터)
class UserProfile(BaseModel):
    user_id: str
    age: int
    fatigue_level: int  # 1-5 (피로도)
    walking_speed: Optional[float] = None  # m/s, 옵션


# 도보 구간 모델
class WalkingSection(BaseModel):
    section_time_seconds: int
    distance_meters: int
    start_name: str
    end_name: str
    estimated_time_seconds: int
    actual_vs_estimated_diff: int
    personalized_time_seconds: Optional[int] = None
    accuracy_warning: Optional[str] = None


# 경로 응답 모델
class RouteResponse(BaseModel):
    total_time_minutes: float
    total_walk_time_minutes: float
    walk_ratio_percent: float
    non_walk_time_minutes: float
    walking_sections_count: int
    walking_sections: list[WalkingSection]
    total_estimated_walk_time_minutes: float
    total_personalized_walk_time_minutes: Optional[float] = None
    adjustment_factor: Optional[float] = None
    overall_accuracy_note: str
