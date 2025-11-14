"""
경로 조회 및 추천을 위한 라우터
(사용자는 업로드하지 않고, 조회만 함)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db


router = APIRouter(
    prefix="/api/routes",
    tags=["routes"]
)


class RouteResponse(BaseModel):
    """경로 응답 모델"""
    route_id: int
    route_name: str
    route_type: str
    distance_km: float
    estimated_duration_minutes: int
    total_elevation_gain_m: Optional[float]
    difficulty_level: str
    avg_rating: Optional[float]
    rating_count: int


class RouteDetailResponse(BaseModel):
    """경로 상세 정보 응답"""
    route_id: int
    route_name: str
    route_type: str
    distance_km: float
    estimated_duration_minutes: int
    total_elevation_gain_m: Optional[float]
    total_elevation_loss_m: Optional[float]
    max_elevation_m: Optional[float]
    min_elevation_m: Optional[float]
    difficulty_level: str
    route_coordinates: dict  # GeoJSON
    source: str
    tags: Optional[list]
    avg_rating: Optional[float]
    rating_count: int


class SegmentResponse(BaseModel):
    """세그먼트 응답 모델"""
    segment_id: int
    segment_order: int
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    segment_distance_m: float
    segment_grade_percent: Optional[float]
    elevation_change_m: Optional[float]
    terrain_type: str


@router.get("/routes", response_model=dict)
async def list_routes(
    route_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    min_distance: Optional[float] = None,
    max_distance: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
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
    """
    try:
        # 기본 쿼리
        query = """
        SELECT 
            route_id, route_name, route_type, distance_km,
            estimated_duration_minutes, total_elevation_gain_m,
            difficulty_level, avg_rating, rating_count, created_at
        FROM routes
        WHERE 1=1
        """
        
        params = {}
        
        # 필터 조건 추가
        if route_type:
            query += " AND route_type = :route_type"
            params['route_type'] = route_type
        
        if difficulty:
            query += " AND difficulty_level = :difficulty"
            params['difficulty'] = difficulty
        
        if min_distance is not None:
            query += " AND distance_km >= :min_distance"
            params['min_distance'] = min_distance
        
        if max_distance is not None:
            query += " AND distance_km <= :max_distance"
            params['max_distance'] = max_distance
        
        query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        params['limit'] = limit
        params['offset'] = offset
        
        results = db.execute(query, params).fetchall()
        
        # 총 개수 조회
        count_query = "SELECT COUNT(*) FROM routes WHERE 1=1"
        count_params = {}
        
        if route_type:
            count_query += " AND route_type = :route_type"
            count_params['route_type'] = route_type
        
        if difficulty:
            count_query += " AND difficulty_level = :difficulty"
            count_params['difficulty'] = difficulty
        
        if min_distance is not None:
            count_query += " AND distance_km >= :min_distance"
            count_params['min_distance'] = min_distance
        
        if max_distance is not None:
            count_query += " AND distance_km <= :max_distance"
            count_params['max_distance'] = max_distance
        
        total_count = db.execute(count_query, count_params).fetchone()[0]
        
        return {
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "routes": [
                {
                    "route_id": r[0],
                    "route_name": r[1],
                    "route_type": r[2],
                    "distance_km": float(r[3]),
                    "estimated_duration_minutes": r[4],
                    "total_elevation_gain_m": float(r[5]) if r[5] else None,
                    "difficulty_level": r[6],
                    "avg_rating": float(r[7]) if r[7] else None,
                    "rating_count": r[8],
                    "created_at": r[9].isoformat() if r[9] else None
                }
                for r in results
            ]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"경로 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/routes/{route_id}", response_model=dict)
async def get_route_detail(
    route_id: int,
    db: Session = Depends(get_db)
):
    """
    특정 경로의 상세 정보 조회
    
    Args:
        route_id: 조회할 경로 ID
        db: DB 세션
    
    Returns:
        경로 상세 정보 및 세그먼트 정보
    """
    try:
        # Routes 테이블에서 경로 정보 조회
        query = """
        SELECT 
            route_id, route_name, route_type, distance_km,
            estimated_duration_minutes, total_elevation_gain_m,
            total_elevation_loss_m, max_elevation_m, min_elevation_m,
            difficulty_level, route_coordinates, source, tags,
            avg_rating, rating_count, created_at
        FROM routes
        WHERE route_id = :route_id
        """
        
        result = db.execute(query, {'route_id': route_id}).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"경로 ID {route_id}를 찾을 수 없습니다."
            )
        
        # 세그먼트 정보 조회
        segment_query = """
        SELECT 
            segment_id, segment_order, start_lat, start_lon,
            end_lat, end_lon, segment_distance_m, segment_grade_percent,
            elevation_change_m, terrain_type
        FROM route_segments
        WHERE route_id = :route_id
        ORDER BY segment_order
        """
        
        segments = db.execute(segment_query, {'route_id': route_id}).fetchall()
        
        return {
            "route": {
                "route_id": result[0],
                "route_name": result[1],
                "route_type": result[2],
                "distance_km": float(result[3]),
                "estimated_duration_minutes": result[4],
                "total_elevation_gain_m": float(result[5]) if result[5] else None,
                "total_elevation_loss_m": float(result[6]) if result[6] else None,
                "max_elevation_m": float(result[7]) if result[7] else None,
                "min_elevation_m": float(result[8]) if result[8] else None,
                "difficulty_level": result[9],
                "route_coordinates": result[10],
                "source": result[11],
                "tags": result[12],
                "avg_rating": float(result[13]) if result[13] else None,
                "rating_count": result[14],
                "created_at": result[15].isoformat() if result[15] else None
            },
            "segments": [
                {
                    "segment_id": seg[0],
                    "segment_order": seg[1],
                    "start_lat": float(seg[2]),
                    "start_lon": float(seg[3]),
                    "end_lat": float(seg[4]),
                    "end_lon": float(seg[5]),
                    "segment_distance_m": float(seg[6]),
                    "segment_grade_percent": float(seg[7]) if seg[7] else None,
                    "elevation_change_m": float(seg[8]) if seg[8] else None,
                    "terrain_type": seg[9]
                }
                for seg in segments
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"경로 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/recommend", response_model=dict)
async def recommend_routes(
    distance_km: Optional[float] = None,
    duration_minutes: Optional[int] = None,
    difficulty: Optional[str] = None,
    route_type: Optional[str] = None,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    조건에 맞는 경로 추천
    
    Args:
        distance_km: 원하는 거리 (km) - 근처 경로 추천
        duration_minutes: 원하는 시간 (분) - 근처 경로 추천
        difficulty: 선호 난이도
        route_type: 경로 타입
        limit: 추천 개수
        db: DB 세션
    
    Returns:
        추천 경로 목록
    """
    try:
        query = """
        SELECT 
            route_id, route_name, route_type, distance_km,
            estimated_duration_minutes, total_elevation_gain_m,
            difficulty_level, avg_rating, rating_count,
            ABS(distance_km - :target_distance) as distance_diff
        FROM routes
        WHERE 1=1
        """
        
        params = {}
        
        # 거리 기준 (입력한 거리와 가까운 순)
        if distance_km:
            params['target_distance'] = distance_km
        else:
            params['target_distance'] = 5.0  # 기본값
        
        # 시간 기준
        if duration_minutes:
            query += """ 
            AND estimated_duration_minutes BETWEEN :duration_min AND :duration_max
            """
            params['duration_min'] = duration_minutes - 10
            params['duration_max'] = duration_minutes + 10
        
        # 난이도 필터
        if difficulty:
            query += " AND difficulty_level = :difficulty"
            params['difficulty'] = difficulty
        
        # 경로 타입 필터
        if route_type:
            query += " AND route_type = :route_type"
            params['route_type'] = route_type
        
        # 거리 차이 순으로 정렬 (가까운 거리 우선)
        query += " ORDER BY distance_diff ASC, avg_rating DESC NULLS LAST LIMIT :limit"
        params['limit'] = limit
        
        results = db.execute(query, params).fetchall()
        
        return {
            "recommended_routes": [
                {
                    "route_id": r[0],
                    "route_name": r[1],
                    "route_type": r[2],
                    "distance_km": float(r[3]),
                    "estimated_duration_minutes": r[4],
                    "total_elevation_gain_m": float(r[5]) if r[5] else None,
                    "difficulty_level": r[6],
                    "avg_rating": float(r[7]) if r[7] else None,
                    "rating_count": r[8]
                }
                for r in results
            ]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"경로 추천 중 오류가 발생했습니다: {str(e)}"
        )