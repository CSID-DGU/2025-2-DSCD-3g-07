# app/routers/personalization.py
"""
개인화 설정 API

사용자의 보행 속도 프로필 관리
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app import crud
from app.database import get_db
from app.models import Users
from app.utils.dependencies import get_current_user
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/api/profile",
    tags=["personalization"]
)


# ============ Schemas ============
class SpeedProfileResponse(BaseModel):
    """속도 프로필 응답"""
    profile_id: int
    user_id: int
    activity_type: str
    avg_speed_flat_kmh: float = Field(..., description="평지 기준 평균 속도 (km/h)")
    data_points_count: int = Field(..., description="누적 데이터 포인트 수")
    
    class Config:
        from_attributes = True


class SpeedProfileUpdateRequest(BaseModel):
    """속도 프로필 수동 업데이트 요청"""
    avg_speed_flat_kmh: float = Field(..., ge=2.0, le=8.0, description="새로운 평균 속도 (km/h)")
    activity_type: str = Field(default="walking", description="활동 유형")


# ============ Endpoints ============
@router.get("/speed", response_model=SpeedProfileResponse)
async def get_speed_profile(
    activity_type: str = Query(default="walking", description="활동 유형"),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    사용자의 속도 프로필 조회
    
    - 로그인 필요
    - activity_type별 평균 속도 반환
    """
    profiles = crud.get_speed_profile_by_user(db, current_user.user_id)
    
    # 해당 activity_type 찾기
    profile = next((p for p in profiles if p.activity_type == activity_type), None)
    
    if not profile:
        # 프로필 없으면 기본값 생성
        profile = crud.create_speed_profile(
            db=db,
            user_id=current_user.user_id,
            activity_type=activity_type,
            avg_speed_flat_kmh=4.0,
            data_points_count=0,
        )
    
    return SpeedProfileResponse.model_validate(profile)


@router.put("/speed", response_model=SpeedProfileResponse)
async def update_speed_profile(
    update_data: SpeedProfileUpdateRequest,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    사용자의 속도 프로필 수동 업데이트
    
    - 로그인 필요
    - 사용자가 직접 선택한 속도로 덮어쓰기 (가중평균 아님)
    """
    from app.models import ActivitySpeedProfile
    
    # 기존 프로필 조회
    profile = (
        db.query(ActivitySpeedProfile)
        .filter(
            ActivitySpeedProfile.user_id == current_user.user_id,
            ActivitySpeedProfile.activity_type == update_data.activity_type,
        )
        .first()
    )
    
    if profile:
        # 기존 프로필 덮어쓰기
        profile.avg_speed_flat_kmh = update_data.avg_speed_flat_kmh
        profile.data_points_count += 1
    else:
        # 새 프로필 생성
        profile = ActivitySpeedProfile(
            user_id=current_user.user_id,
            activity_type=update_data.activity_type,
            avg_speed_flat_kmh=update_data.avg_speed_flat_kmh,
            data_points_count=1,
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    
    return SpeedProfileResponse.model_validate(profile)
