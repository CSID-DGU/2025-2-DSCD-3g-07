"""
경로 분석 관련 API 엔드포인트
"""

import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..utils.elevation_helpers import analyze_route_elevation

router = APIRouter(prefix="/routes", tags=["routes"])
logger = logging.getLogger(__name__)


class AnalyzeSlopeRequest(BaseModel):
    """경사도 분석 요청 모델"""

    itinerary: Dict
    api_key: Optional[str] = None
    weather_data: Optional[Dict] = None  # 날씨 데이터
    user_speed_mps: Optional[float] = None  # 사용자 평균 보행속도 (m/s)

    class Config:
        json_schema_extra = {
            "example": {
                "itinerary": {
                    "legs": [
                        {
                            "mode": "WALK",
                            "sectionTime": 752,
                            "distance": 888,
                            "start": {"name": "출발지", "lon": 127.0, "lat": 37.557778},
                            "end": {"name": "도착지", "lon": 127.001, "lat": 37.558},
                            "steps": [
                                {
                                    "distance": 52,
                                    "linestring": "127.00001,37.557808 126.99967,37.55789",
                                }
                            ],
                        }
                    ]
                },
                "weather_data": {
                    "temp_c": 18,
                    "pty": 0,
                    "rain_mm_per_h": 0.0,
                    "snow_cm_per_h": 0.0,
                },
                "user_speed_mps": 1.5,
            }
        }


class FactorsInfo(BaseModel):
    """통합 계수 정보"""

    user_speed_factor: float
    slope_factor: float
    weather_factor: float
    final_factor: float


class AnalyzeSlopeResponse(BaseModel):
    """경사도 분석 응답 모델"""

    walk_legs_analysis: List[Dict]
    total_original_walk_time: int
    total_adjusted_walk_time: int
    total_route_time_adjustment: int
    # 횡단보도 정보
    crosswalk_count: Optional[int] = None
    crosswalk_wait_time: Optional[int] = None
    total_time_with_crosswalk: Optional[int] = None
    # 통합 계수 정보
    factors: Optional[FactorsInfo] = None
    user_speed_mps: Optional[float] = None
    weather_applied: Optional[bool] = None
    sampled_coords_count: Optional[int] = None
    original_coords_count: Optional[int] = None
    data_quality: Optional[Dict] = None
    error: Optional[str] = None


@router.post("/analyze-slope", response_model=AnalyzeSlopeResponse)
async def analyze_slope(request: AnalyzeSlopeRequest):
    """
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
    """
    try:
        logger.info("경사도 분석 요청 시작")

        # 경사도 분석 실행 (횡단보도 계산 포함)
        result = await analyze_route_elevation(
            request.itinerary,
            api_key=request.api_key,
            weather_data=request.weather_data,
            user_speed_mps=request.user_speed_mps,
        )

        if "error" in result and not result.get("walk_legs_analysis"):
            logger.error(f"경사도 분석 실패: {result['error']}")
            # 에러가 있어도 원본 시간 정보는 반환
            return result

        logger.info(f"경사도 분석 완료 - 횡단보도: {result.get('crosswalk_count', 0)}개")
        return result

    except ValueError as e:
        logger.error(f"입력 데이터 오류: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"경사도 분석 중 예외 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"경사도 분석 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    경로 분석 서비스 헬스 체크
    """
    return {"status": "healthy", "service": "route-analysis"}
