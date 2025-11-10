"""
보행자 전용 경로 API
Tmap 보행자 경로 API를 호출하여 도보 경로를 제공
"""

import logging
import os
from typing import Any, Dict, List, Optional

import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .elevation_helpers import analyze_route_elevation

router = APIRouter(prefix="/walking", tags=["walking"])
logger = logging.getLogger(__name__)


class WalkingRouteRequest(BaseModel):
    """보행자 경로 요청 모델"""

    start_x: float
    start_y: float
    end_x: float
    end_y: float
    start_name: Optional[str] = None
    end_name: Optional[str] = None
    user_speed_mps: Optional[float] = None  # 사용자 보행속도 (m/s)
    weather_data: Optional[Dict[str, Any]] = None  # 날씨 데이터


class WalkingRouteResponse(BaseModel):
    """보행자 경로 응답 모델"""

    type: str
    features: List[Dict[str, Any]]
    properties: Dict[str, Any]


@router.post("/route", response_model=Dict[str, Any])
async def get_walking_route(request: WalkingRouteRequest):
    """
    Tmap 보행자 경로 API를 호출하여 도보 경로 반환

    Args:
        request: 출발지/도착지 좌표 정보

    Returns:
        GeoJSON 형식의 보행자 경로 데이터
        - type: FeatureCollection
        - features: 경로 좌표 및 안내 정보 배열
        - properties: 총 거리, 총 시간 등 요약 정보
    """
    try:
        # Tmap API Key 가져오기 (대중교통 API와 동일한 Key 사용)
        tmap_api_key = os.getenv("TMAP_APPKEY")
        if not tmap_api_key:
            raise ValueError("TMAP_APPKEY 환경변수가 설정되지 않았습니다.")

        # Tmap 보행자 경로 API 호출
        url = "https://apis.openapi.sk.com/tmap/routes/pedestrian"

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "appKey": tmap_api_key,
        }

        payload = {
            "startX": request.start_x,
            "startY": request.start_y,
            "endX": request.end_x,
            "endY": request.end_y,
            "reqCoordType": "WGS84GEO",
            "resCoordType": "WGS84GEO",
            "searchOption": "0",  # 0: 추천 경로
            "sort": "index",
        }

        # 출발지/도착지 이름이 있으면 추가
        if request.start_name:
            payload["startName"] = request.start_name
        if request.end_name:
            payload["endName"] = request.end_name

        logger.info(
            f"[보행자 경로] API 호출 시작: {request.start_name or '출발지'} → {request.end_name or '도착지'}"
        )

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{url}?version=1",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(
                        f"[보행자 경로] Tmap API 오류: {response.status} - {error_text}"
                    )
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Tmap API 오류: {error_text}",
                    )

                data = await response.json()

                # GeoJSON 데이터 검증
                if (
                    not isinstance(data, dict)
                    or data.get("type") != "FeatureCollection"
                ):
                    logger.error(f"[보행자 경로] 잘못된 응답 형식: {data}")
                    raise HTTPException(
                        status_code=500,
                        detail="Tmap API 응답 형식이 올바르지 않습니다.",
                    )

                features = data.get("features", [])
                if not features:
                    logger.warning("[보행자 경로] 경로 데이터가 비어있습니다.")
                    raise HTTPException(
                        status_code=404, detail="경로를 찾을 수 없습니다."
                    )

                # 총 거리 및 시간 추출 (첫 번째 feature의 properties에서)
                total_distance = 0
                total_time = 0

                if features and features[0].get("properties"):
                    props = features[0]["properties"]
                    total_distance = props.get("totalDistance", 0)
                    total_time = props.get("totalTime", 0)

                logger.info(
                    f"[보행자 경로] 성공 - 거리: {total_distance}m, "
                    f"시간: {total_time}초, features: {len(features)}개"
                )

                # ===== 중요: 4km/h 기준으로 재계산 =====
                # Tmap API가 반환한 시간이 아닌, 거리를 4km/h로 나눈 기준 시간 사용
                # 이후 사용자 속도, 경사도, 날씨로 보정
                tmap_base_speed_mps = 1.111  # 4 km/h = 1.111 m/s (Tmap 기준)
                recalculated_base_time = (
                    int(total_distance / tmap_base_speed_mps)
                    if tmap_base_speed_mps > 0
                    else total_time
                )

                logger.info(
                    f"[보행자 경로] 시간 재계산\n"
                    f"  - API 반환 시간: {total_time}초 ({total_time//60}분 {total_time%60}초)\n"
                    f"  - 거리: {total_distance}m\n"
                    f"  - 4km/h 기준 재계산: {recalculated_base_time}초 ({recalculated_base_time//60}분 {recalculated_base_time%60}초)"
                )

                # GeoJSON을 Itinerary 형식으로 변환하여 경사도 분석
                itinerary = {
                    "legs": [
                        {
                            "mode": "WALK",
                            "sectionTime": recalculated_base_time,  # 재계산된 기준 시간 사용
                            "distance": total_distance,
                            "start": {
                                "lat": request.start_y,
                                "lon": request.start_x,
                                "name": request.start_name or "출발지",
                            },
                            "end": {
                                "lat": request.end_y,
                                "lon": request.end_x,
                                "name": request.end_name or "도착지",
                            },
                            "steps": [],
                        }
                    ],
                    "totalTime": recalculated_base_time,  # 재계산된 시간
                    "totalWalkTime": recalculated_base_time,  # 재계산된 시간
                    "totalDistance": total_distance,
                    "totalWalkDistance": total_distance,
                }

                # GeoJSON features에서 linestring 추출하여 steps에 추가
                # Point feature의 description을 다음 LineString에 병합
                point_description = None

                for feature in features:
                    geometry_type = feature.get("geometry", {}).get("type")
                    properties = feature.get("properties", {})

                    # Point: 다음 LineString에 사용할 description 저장
                    if geometry_type == "Point":
                        turn_type = properties.get("turnType")
                        # 출발점(200)과 도착점(201)은 제외
                        if turn_type not in [200, 201]:
                            point_description = properties.get("description", "")

                    # LineString: 실제 이동 구간
                    elif geometry_type == "LineString":
                        coords = feature["geometry"].get("coordinates", [])
                        if coords:
                            # 좌표를 "lng,lat" 형식의 문자열로 변환
                            linestring = " ".join(
                                [f"{lng},{lat}" for lng, lat in coords]
                            )

                            # Point description이 있으면 사용, 없으면 LineString description 사용
                            description = point_description or properties.get(
                                "description", ""
                            )
                            point_description = None  # 사용 후 초기화

                            itinerary["legs"][0]["steps"].append(
                                {
                                    "linestring": linestring,
                                    "distance": properties.get("distance", 0),
                                    "description": description,
                                    "roadName": properties.get("name", ""),
                                    "turnType": properties.get("turnType"),
                                }
                            )

                # 횡단보도 개수 카운팅 (GeoJSON features를 직접 전달)
                from .elevation_helpers import count_crosswalks

                crosswalk_count = count_crosswalks(features)  # features 전달
                logger.info(f"[보행자 경로] 횡단보도 개수: {crosswalk_count}개")

                # 경사도/날씨/속도 분석 수행
                elevation_analysis = None
                try:
                    elevation_analysis = await analyze_route_elevation(
                        itinerary=itinerary,
                        api_key=None,  # Google API 키는 elevation_helpers에서 자동으로 가져옴
                        weather_data=request.weather_data,
                        user_speed_mps=request.user_speed_mps,
                        crosswalk_count=crosswalk_count,  # 횡단보도 개수 전달
                    )
                    logger.info(
                        f"[보행자 경로] 경사도 분석 완료: {elevation_analysis is not None}"
                    )
                    if elevation_analysis and elevation_analysis.get("error"):
                        logger.warning(
                            f"[보행자 경로] 경사도 분석 에러: {elevation_analysis['error']}"
                        )
                        # 에러가 있어도 횡단보도 정보는 유지
                        elevation_analysis["crosswalk_count"] = crosswalk_count
                except Exception as e:
                    logger.error(f"[보행자 경로] 경사도 분석 실패: {e}", exc_info=True)
                    elevation_analysis = {
                        "error": str(e),
                        "crosswalk_count": crosswalk_count,  # 횡단보도 정보 포함
                        "factors": {
                            "user_speed_factor": 1,
                            "slope_factor": 1,
                            "weather_factor": 1,
                            "final_factor": 1,
                        },
                        "walk_legs_analysis": [],
                        "total_original_walk_time": recalculated_base_time,
                        "total_adjusted_walk_time": recalculated_base_time,
                        "total_route_time_adjustment": 0,
                        "weather_applied": False,
                        "user_speed_mps": request.user_speed_mps or 1.111,
                    }

                # 응답 데이터에 요약 정보 추가
                # 대중교통과 동일한 구조로 변환하여 프론트엔드 호환성 확보
                result = {
                    "type": data.get("type"),
                    "features": features,
                    "properties": {
                        "totalDistance": total_distance,
                        "totalTime": recalculated_base_time,  # 재계산된 기준 시간 반환
                        "totalWalkTime": recalculated_base_time,  # 재계산된 기준 시간
                        "originalTime": total_time,  # API 원본 시간 (참고용)
                        "mode": "WALK",
                    },
                    "elevation_analysis": elevation_analysis,  # 경사도 분석 결과 추가
                    # 대중교통과 동일한 구조 추가 (상세 경로 표시용)
                    "metaData": {
                        "plan": {
                            "itineraries": [itinerary]  # 이미 변환된 itinerary 사용
                        }
                    },
                }

                return result

    except aiohttp.ClientError as e:
        logger.error(f"[보행자 경로] 네트워크 오류: {e}")
        raise HTTPException(status_code=503, detail=f"Tmap API 연결 실패: {str(e)}")
    except ValueError as e:
        logger.error(f"[보행자 경로] 설정 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"[보행자 경로] 예상치 못한 오류: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"보행자 경로 검색 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    보행자 경로 서비스 헬스 체크
    """
    return {"status": "healthy", "service": "walking-route"}
