"""
네비게이션 로그 관리 API

사용자의 경로 안내 기록을 저장하고 조회하는 라우터
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models import NavigationLogs, Users
from app.schemas import NavigationLogCreate, NavigationLogResponse, NavigationLogListResponse

router = APIRouter(
    prefix="/api/navigation",
    tags=["navigation_logs"]
)


@router.post("/logs", response_model=NavigationLogResponse, status_code=201)
async def create_navigation_log(
    log_data: NavigationLogCreate,
    user_id: int = Query(..., description="사용자 ID"),
    db: Session = Depends(get_db)
):
    """
    네비게이션 로그 저장
    
    경로 안내가 종료되면 프론트엔드에서 이 API를 호출하여 로그를 저장합니다.
    """
    # 사용자 존재 확인
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    # 네비게이션 로그 생성
    nav_log = NavigationLogs(
        user_id=user_id,
        route_mode=log_data.route_mode,
        start_location=log_data.start_location,
        end_location=log_data.end_location,
        start_lat=log_data.start_lat,
        start_lon=log_data.start_lon,
        end_lat=log_data.end_lat,
        end_lon=log_data.end_lon,
        total_distance_m=log_data.total_distance_m,
        transport_modes=log_data.transport_modes,
        crosswalk_count=log_data.crosswalk_count,
        user_speed_factor=log_data.user_speed_factor,
        slope_factor=log_data.slope_factor,
        weather_factor=log_data.weather_factor,
        estimated_time_seconds=log_data.estimated_time_seconds,
        actual_time_seconds=log_data.actual_time_seconds,
        weather_id=log_data.weather_id,
        route_data=log_data.route_data,
        started_at=log_data.started_at,
        ended_at=log_data.ended_at,
    )
    
    db.add(nav_log)
    db.commit()
    db.refresh(nav_log)
    
    # 응답 생성
    response = NavigationLogResponse(
        log_id=nav_log.log_id,
        user_id=nav_log.user_id,
        route_mode=nav_log.route_mode,
        start_location=nav_log.start_location,
        end_location=nav_log.end_location,
        start_lat=float(nav_log.start_lat),
        start_lon=float(nav_log.start_lon),
        end_lat=float(nav_log.end_lat),
        end_lon=float(nav_log.end_lon),
        total_distance_m=float(nav_log.total_distance_m),
        transport_modes=nav_log.transport_modes,
        crosswalk_count=nav_log.crosswalk_count,
        user_speed_factor=float(nav_log.user_speed_factor) if nav_log.user_speed_factor else None,
        slope_factor=float(nav_log.slope_factor) if nav_log.slope_factor else None,
        weather_factor=float(nav_log.weather_factor) if nav_log.weather_factor else None,
        estimated_time_seconds=nav_log.estimated_time_seconds,
        actual_time_seconds=nav_log.actual_time_seconds,
        time_difference_seconds=nav_log.actual_time_seconds - nav_log.estimated_time_seconds,
        weather_id=nav_log.weather_id,
        route_data=nav_log.route_data,
        started_at=nav_log.started_at,
        ended_at=nav_log.ended_at,
        created_at=nav_log.created_at,
    )
    
    return response


@router.get("/logs", response_model=NavigationLogListResponse)
async def get_navigation_logs(
    user_id: int = Query(..., description="사용자 ID"),
    route_mode: Optional[str] = Query(None, description="경로 모드 필터 (transit/walking)"),
    start_date: Optional[datetime] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[datetime] = Query(None, description="조회 종료 날짜"),
    limit: int = Query(50, ge=1, le=100, description="조회 개수"),
    offset: int = Query(0, ge=0, description="오프셋"),
    db: Session = Depends(get_db)
):
    """
    네비게이션 로그 목록 조회
    
    사용자의 경로 안내 기록을 조회합니다.
    """
    # 사용자 존재 확인
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    # 기본 쿼리
    query = db.query(NavigationLogs).filter(NavigationLogs.user_id == user_id)
    
    # 필터 적용
    if route_mode:
        query = query.filter(NavigationLogs.route_mode == route_mode)
    
    if start_date:
        query = query.filter(NavigationLogs.started_at >= start_date)
    
    if end_date:
        query = query.filter(NavigationLogs.started_at <= end_date)
    
    # 전체 개수
    total_count = query.count()
    
    # 최신순 정렬 및 페이징
    logs = query.order_by(desc(NavigationLogs.started_at)).offset(offset).limit(limit).all()
    
    # 응답 생성
    log_responses = []
    for log in logs:
        log_responses.append(NavigationLogResponse(
            log_id=log.log_id,
            user_id=log.user_id,
            route_mode=log.route_mode,
            start_location=log.start_location,
            end_location=log.end_location,
            start_lat=float(log.start_lat),
            start_lon=float(log.start_lon),
            end_lat=float(log.end_lat),
            end_lon=float(log.end_lon),
            total_distance_m=float(log.total_distance_m),
            transport_modes=log.transport_modes,
            crosswalk_count=log.crosswalk_count,
            user_speed_factor=float(log.user_speed_factor) if log.user_speed_factor else None,
            slope_factor=float(log.slope_factor) if log.slope_factor else None,
            weather_factor=float(log.weather_factor) if log.weather_factor else None,
            estimated_time_seconds=log.estimated_time_seconds,
            actual_time_seconds=log.actual_time_seconds,
            time_difference_seconds=log.actual_time_seconds - log.estimated_time_seconds,
            weather_id=log.weather_id,
            route_data=log.route_data,
            started_at=log.started_at,
            ended_at=log.ended_at,
            created_at=log.created_at,
        ))
    
    return NavigationLogListResponse(
        total_count=total_count,
        logs=log_responses
    )


@router.get("/logs/{log_id}", response_model=NavigationLogResponse)
async def get_navigation_log_detail(
    log_id: int,
    user_id: int = Query(..., description="사용자 ID"),
    db: Session = Depends(get_db)
):
    """
    네비게이션 로그 상세 조회
    
    특정 네비게이션 로그의 상세 정보를 조회합니다.
    """
    log = db.query(NavigationLogs).filter(
        NavigationLogs.log_id == log_id,
        NavigationLogs.user_id == user_id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="로그를 찾을 수 없습니다.")
    
    return NavigationLogResponse(
        log_id=log.log_id,
        user_id=log.user_id,
        route_mode=log.route_mode,
        start_location=log.start_location,
        end_location=log.end_location,
        start_lat=float(log.start_lat),
        start_lon=float(log.start_lon),
        end_lat=float(log.end_lat),
        end_lon=float(log.end_lon),
        total_distance_m=float(log.total_distance_m),
        transport_modes=log.transport_modes,
        crosswalk_count=log.crosswalk_count,
        user_speed_factor=float(log.user_speed_factor) if log.user_speed_factor else None,
        slope_factor=float(log.slope_factor) if log.slope_factor else None,
        weather_factor=float(log.weather_factor) if log.weather_factor else None,
        estimated_time_seconds=log.estimated_time_seconds,
        actual_time_seconds=log.actual_time_seconds,
        time_difference_seconds=log.actual_time_seconds - log.estimated_time_seconds,
        weather_id=log.weather_id,
        route_data=log.route_data,
        started_at=log.started_at,
        ended_at=log.ended_at,
        created_at=log.created_at,
    )


@router.get("/logs/statistics/summary", response_model=dict)
async def get_navigation_statistics(
    user_id: int = Query(..., description="사용자 ID"),
    days: int = Query(30, ge=1, le=365, description="통계 기간 (일)"),
    db: Session = Depends(get_db)
):
    """
    네비게이션 통계 조회
    
    사용자의 경로 안내 사용 통계를 제공합니다.
    """
    # 사용자 존재 확인
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    # 기간 설정
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # 통계 쿼리
    logs = db.query(NavigationLogs).filter(
        NavigationLogs.user_id == user_id,
        NavigationLogs.started_at >= start_date
    ).all()
    
    if not logs:
        return {
            "period_days": days,
            "total_navigations": 0,
            "walking_count": 0,
            "transit_count": 0,
            "total_distance_km": 0,
            "total_time_hours": 0,
            "avg_time_difference_seconds": 0,
            "accuracy_rate": 0,
        }
    
    # 통계 계산
    total_count = len(logs)
    walking_count = sum(1 for log in logs if log.route_mode == "walking")
    transit_count = sum(1 for log in logs if log.route_mode == "transit")
    total_distance = sum(float(log.total_distance_m) for log in logs) / 1000  # km로 변환
    total_time = sum(log.actual_time_seconds for log in logs) / 3600  # 시간으로 변환
    avg_time_diff = sum(log.actual_time_seconds - log.estimated_time_seconds for log in logs) / total_count
    
    # 정확도 계산 (예상 시간 대비 실제 시간이 ±20% 이내인 경우)
    accurate_count = sum(
        1 for log in logs 
        if abs(log.actual_time_seconds - log.estimated_time_seconds) / log.estimated_time_seconds <= 0.2
    )
    accuracy_rate = (accurate_count / total_count * 100) if total_count > 0 else 0
    
    return {
        "period_days": days,
        "total_navigations": total_count,
        "walking_count": walking_count,
        "transit_count": transit_count,
        "total_distance_km": round(total_distance, 2),
        "total_time_hours": round(total_time, 2),
        "avg_time_difference_seconds": round(avg_time_diff, 0),
        "accuracy_rate": round(accuracy_rate, 1),
        "avg_user_speed_factor": round(
            sum(float(log.user_speed_factor) for log in logs if log.user_speed_factor) / 
            sum(1 for log in logs if log.user_speed_factor), 3
        ) if any(log.user_speed_factor for log in logs) else None,
        "avg_slope_factor": round(
            sum(float(log.slope_factor) for log in logs if log.slope_factor) / 
            sum(1 for log in logs if log.slope_factor), 3
        ) if any(log.slope_factor for log in logs) else None,
        "avg_weather_factor": round(
            sum(float(log.weather_factor) for log in logs if log.weather_factor) / 
            sum(1 for log in logs if log.weather_factor), 3
        ) if any(log.weather_factor for log in logs) else None,
    }


@router.delete("/logs/{log_id}", status_code=204)
async def delete_navigation_log(
    log_id: int,
    user_id: int = Query(..., description="사용자 ID"),
    db: Session = Depends(get_db)
):
    """
    네비게이션 로그 삭제
    
    특정 네비게이션 로그를 삭제합니다.
    """
    log = db.query(NavigationLogs).filter(
        NavigationLogs.log_id == log_id,
        NavigationLogs.user_id == user_id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="로그를 찾을 수 없습니다.")
    
    db.delete(log)
    db.commit()
    
    return None
