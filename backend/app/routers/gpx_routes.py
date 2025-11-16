"""
경로 조회 및 추천을 위한 라우터
(사용자는 업로드하지 않고, 조회만 함)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
import math
import json

from app.database import get_db


router = APIRouter(
    prefix="/api/routes",
    tags=["routes"]
)


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    두 GPS 좌표 간 거리 계산 (Haversine formula)
    
    Returns:
        거리 (km)
    """
    R = 6371  # 지구 반지름 (km)
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def clean_route_name(route_name: str) -> str:
    """
    경로 이름 정리
    - '/' 기준 중복 제거
    - '|' 이후 Strava 메타데이터 제거
    - 거리 정보 중복 제거
    
    예시:
    "사천교~홍제천 탑수부 왕복(5.0km) / 사천교~홍제천 탑수부 왕복(5.0km) | Strava Run Segment"
    → "사천교~홍제천 탑수부 왕복(5.0km)"
    """
    if not route_name:
        return route_name
    
    # 1. '|' 이후 Strava 정보 제거
    if '|' in route_name:
        route_name = route_name.split('|')[0].strip()
    
    # 2. '/' 로 나눠진 경우 중복 제거
    if '/' in route_name:
        parts = [part.strip() for part in route_name.split('/')]
        # 중복 제거 (순서 유지)
        seen = set()
        unique_parts = []
        for part in parts:
            if part and part not in seen:
                seen.add(part)
                unique_parts.append(part)
        route_name = unique_parts[0] if unique_parts else route_name
    
    return route_name.strip()


def extract_start_point(route_coordinates: dict) -> tuple:
    """
    GeoJSON에서 시작점 좌표 추출
    
    Returns:
        (lat, lng) tuple
    """
    try:
        if isinstance(route_coordinates, str):
            route_coordinates = json.loads(route_coordinates)
        
        coordinates = route_coordinates.get('coordinates', [])
        if coordinates:
            # GeoJSON은 [경도, 위도] 순서
            lng, lat = coordinates[0]
            return (lat, lng)
    except:
        pass
    
    return (None, None)



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
        # 기본 쿼리문
        base_query = """
        SELECT 
            route_id, route_name, route_type, distance_km,
            estimated_duration_minutes, total_elevation_gain_m,
            difficulty_level, avg_rating, rating_count, created_at
        FROM routes
        WHERE 1=1
        """
        
        params = {}
        
        # 필터 조건 추가
        conditions = []
        if route_type:
            conditions.append(" AND route_type = :route_type")
            params['route_type'] = route_type
        
        if difficulty:
            conditions.append(" AND difficulty_level = :difficulty")
            params['difficulty'] = difficulty
        
        if min_distance is not None:
            conditions.append(" AND distance_km >= :min_distance")
            params['min_distance'] = min_distance
        
        if max_distance is not None:
            conditions.append(" AND distance_km <= :max_distance")
            params['max_distance'] = max_distance
        
        # 쿼리 조립
        full_query = base_query + ''.join(conditions) + " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        params['limit'] = limit
        params['offset'] = offset
        
        results = db.execute(text(full_query), params).fetchall()
        
        # 총 개수 조회
        count_query = "SELECT COUNT(*) FROM routes WHERE 1=1" + ''.join(conditions)
        total_count = db.execute(text(count_query), params).fetchone()[0]
        
        return {
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "routes": [
                {
                    "route_id": r[0],
                    "route_name": clean_route_name(r[1]),  # 경로 이름 정리
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
        query = text("""
        SELECT 
            route_id, route_name, route_type, distance_km,
            estimated_duration_minutes, total_elevation_gain_m,
            total_elevation_loss_m, max_elevation_m, min_elevation_m,
            difficulty_level, route_coordinates, source, tags,
            avg_rating, rating_count, created_at
        FROM routes
        WHERE route_id = :route_id
        """)
        
        result = db.execute(query, {'route_id': route_id}).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"경로 ID {route_id}를 찾을 수 없습니다."
            )
        
        # 세그먼트 정보 조회
        segment_query = text("""
        SELECT 
            segment_id, segment_order, start_lat, start_lon,
            end_lat, end_lon, segment_distance_m, segment_grade_percent,
            elevation_change_m, terrain_type
        FROM route_segments
        WHERE route_id = :route_id
        ORDER BY segment_order
        """)
        
        segments = db.execute(segment_query, {'route_id': route_id}).fetchall()
        
        return {
            "route": {
                "route_id": result[0],
                "route_name": clean_route_name(result[1]),  # 경로 이름 정리
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
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_distance_from_user: float = 10.0,
    distance_tolerance: float = 1.0,
    duration_tolerance: int = 15,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
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
        max_distance_from_user: 검색 반경 (km, 기본 10km)
        distance_tolerance: 거리 허용 오차 (km, 기본 ±1km)
        duration_tolerance: 시간 허용 오차 (분, 기본 ±15분)
        limit: 최대 반환 개수
        db: DB 세션
    
    Returns:
        추천 경로 목록 (가까운 순)
    """
    try:
        # 1️⃣ 사용자 위치 필수 체크
        if not user_lat or not user_lng:
            raise HTTPException(
                status_code=400,
                detail="사용자 위치(user_lat, user_lng)가 필요합니다."
            )
        
        # 2️⃣ 목표 거리 또는 시간 중 하나는 필수
        if not distance_km and not duration_minutes:
            raise HTTPException(
                status_code=400,
                detail="목표 거리(distance_km) 또는 목표 시간(duration_minutes) 중 하나를 입력해주세요."
            )
        
        # 3️⃣ PostgreSQL에서 모든 GPX 경로 조회
        base_query = """
        SELECT 
            route_id, route_name, route_type, distance_km,
            estimated_duration_minutes, total_elevation_gain_m,
            difficulty_level, avg_rating, rating_count, route_coordinates,
            tags
        FROM routes
        WHERE 1=1
        """
        
        params = {}
        conditions = []
        
        # 난이도 필터
        if difficulty:
            conditions.append(" AND difficulty_level = :difficulty")
            params['difficulty'] = difficulty
        
        # 경로 타입 필터
        if route_type:
            conditions.append(" AND route_type = :route_type")
            params['route_type'] = route_type
        
        # 쿼리 실행
        full_query = base_query + ''.join(conditions)
        results = db.execute(text(full_query), params).fetchall()
        
        # 4️⃣ 각 경로 처리: 거리 계산 및 필터링
        routes = []
        
        for r in results:
            route_id, route_name, r_route_type, dist_km, est_duration, elevation_gain, \
            diff_level, avg_rating, rating_count, route_coords, tags = r
            
            # 4-1. 시작점 좌표 추출
            start_lat, start_lng = extract_start_point(route_coords)
            if start_lat is None or start_lng is None:
                continue
            
            # 4-2. 사용자 위치와의 거리 계산 (Haversine)
            distance_from_user = calculate_distance(user_lat, user_lng, start_lat, start_lng)
            
            # 4-3. 검색 반경 필터링 (기본 10km 이내)
            if distance_from_user > max_distance_from_user:
                continue
            
            # 4-4. 목표 거리/시간 필터링
            match = False
            
            if distance_km:
                # 목표 거리 ± 허용 오차 범위
                # Decimal을 float로 변환하여 비교
                if abs(float(dist_km) - distance_km) <= distance_tolerance:
                    match = True
            
            if duration_minutes and not match:
                # 목표 시간 ± 허용 오차 범위
                if abs(est_duration - duration_minutes) <= duration_tolerance:
                    match = True
            
            if not match:
                continue
            
            # 4-5. 설명 생성
            description_parts = []
            if tags:
                try:
                    tags_list = json.loads(tags) if isinstance(tags, str) else tags
                    if isinstance(tags_list, list) and len(tags_list) > 1:
                        tag_value = tags_list[1]
                        # strava.segments, 특수문자(_-), 숫자만 있는 태그, 언더바 포함 태그 제외
                        if not (
                            'strava.segments' in tag_value.lower() or
                            tag_value.startswith('strava') or
                            '_' in tag_value or  # 언더바 포함 제외
                            all(c in '0123456789-_.' for c in tag_value)
                        ):
                            description_parts.append(tag_value)
                except:
                    pass
            
            if elevation_gain:
                if elevation_gain < 50:
                    description_parts.append("평탄한 코스")
                elif elevation_gain < 200:
                    description_parts.append("적당한 오르막")
                else:
                    description_parts.append("경사 있는 코스")
            
            description = ", ".join(description_parts) if description_parts else ""
            
            # 경로 이름 정리 (중복 및 Strava 정보 제거)
            cleaned_name = clean_route_name(route_name)
            
            # 목표 거리/시간과의 차이 계산
            target_diff = 0
            if distance_km:
                # 목표 거리와의 차이 (km)
                target_diff = abs(float(dist_km) - distance_km)
            elif duration_minutes:
                # 목표 시간과의 차이 (분)
                target_diff = abs(est_duration - duration_minutes)
            
            # 4-6. 결과 목록에 추가
            routes.append({
                'route_id': route_id,
                'route_name': cleaned_name,
                'route_type': r_route_type,
                'distance_km': float(dist_km),
                'estimated_duration_minutes': est_duration,
                'total_elevation_gain_m': float(elevation_gain) if elevation_gain else 0,
                'difficulty_level': diff_level,
                'avg_rating': float(avg_rating) if avg_rating else None,
                'rating_count': rating_count,
                'start_point': {
                    'lat': start_lat,
                    'lng': start_lng,
                },
                'distance_from_user': round(distance_from_user, 2),
                'description': description,
                'target_diff': target_diff  # 목표 거리/시간과의 차이
            })
        
        # 5️⃣ 정렬: 사용자 위치에 가까운 순 → 목표 거리/시간에 가까운 순
        # 1차: 사용자 위치에서의 거리 (가까울수록 우선)
        # 2차: 목표값과의 차이 (작을수록 우선)
        routes.sort(key=lambda x: (x['distance_from_user'], x['target_diff']))
        
        # 6️⃣ 상위 N개만 반환 (target_diff는 응답에서 제거)
        recommended = []
        for route in routes[:limit]:
            # target_diff는 내부 정렬용이므로 제거
            route_copy = {k: v for k, v in route.items() if k != 'target_diff'}
            recommended.append(route_copy)
        
        return {
            "total_count": len(routes),
            "recommended_routes": recommended
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ 경로 추천 에러: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"경로 추천 중 오류가 발생했습니다: {str(e)}"
        )