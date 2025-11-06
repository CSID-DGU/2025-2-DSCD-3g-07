"""
기상청 단기예보 API 프록시 라우터 및 날씨 기반 보행속도 예측
"""

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

import aiohttp
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..utils.weather_helpers import (
    WeatherSpeedModel,
    calculate_eta,
    map_kma_to_weather,
)

router = APIRouter(prefix="/weather", tags=["weather"])

KMA_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
KMA_SERVICE_KEY = os.getenv("KMA_SERVICE_KEY") or os.getenv("KMA_API_KEY")
KST = timezone(timedelta(hours=9))


# 간단한 인메모리 캐시
class WeatherCache:
    """날씨 데이터 캐싱 (5분 TTL)"""

    def __init__(self, ttl_seconds: int = 300):
        self._cache: Dict[str, Tuple[dict, datetime]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)

    def get(self, key: str) -> Optional[dict]:
        """캐시에서 데이터 가져오기"""
        if key in self._cache:
            data, timestamp = self._cache[key]
            if datetime.now(KST) - timestamp < self._ttl:
                return data
            else:
                # 만료된 캐시 삭제
                del self._cache[key]
        return None

    def set(self, key: str, data: dict) -> None:
        """캐시에 데이터 저장"""
        self._cache[key] = (data, datetime.now(KST))

    def clear(self) -> None:
        """캐시 전체 삭제"""
        self._cache.clear()

    def get_cache_key(
        self, lat: float, lon: float, base_date: str, base_time: str, num_rows: int
    ) -> str:
        """캐시 키 생성"""
        # 격자 좌표로 변환 후 키 생성 (같은 격자는 같은 날씨)
        nx, ny = convert_to_grid(lat, lon)
        return f"weather:{nx}:{ny}:{base_date}:{base_time}:{num_rows}"


# 전역 캐시 인스턴스
weather_cache = WeatherCache(ttl_seconds=300)  # 5분 캐시


def convert_to_grid(lat: float, lon: float) -> tuple[int, int]:
    """
    위도/경도를 기상청 격자 좌표로 변환
    (기상청 단기예보 좌표계 변환 공식 사용)
    """
    import math

    RE = 6371.00877  # 지구 반경(km)
    GRID = 5.0  # 격자 간격(km)
    SLAT1 = 30.0  # 위도1(degree)
    SLAT2 = 60.0  # 위도2(degree)
    OLON = 126.0  # 기준 경도(degree)
    OLAT = 38.0  # 기준 위도(degree)
    XO = 43  # 기준점 X좌표(GRID)
    YO = 136  # 기준점 Y좌표(GRID)

    DEGRAD = math.pi / 180.0
    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon = OLON * DEGRAD
    olat = OLAT * DEGRAD

    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = (math.pow(sf, sn) * math.cos(slat1)) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = (re * sf) / math.pow(ro, sn)

    ra = math.tan(math.pi * 0.25 + lat * DEGRAD * 0.5)
    ra = (re * sf) / math.pow(ra, sn)
    theta = lon * DEGRAD - olon

    if theta > math.pi:
        theta -= math.pi * 2.0
    if theta < -math.pi:
        theta += math.pi * 2.0

    theta *= sn

    x = ra * math.sin(theta) + XO
    y = ro - ra * math.cos(theta) + YO

    return int(x + 0.5), int(y + 0.5)


def get_base_time(now: Optional[datetime] = None) -> tuple[str, str]:
    """
    기상청 발표 기본 시각 계산 (KST 기준)
    """
    if now is None:
        aware_now = datetime.now(KST)
    else:
        if now.tzinfo is None:
            aware_now = now.replace(tzinfo=timezone.utc).astimezone(KST)
        else:
            aware_now = now.astimezone(KST)

    kst_now = aware_now

    base_hours = [2, 5, 8, 11, 14, 17, 20, 23]
    base_hour = base_hours[0]

    for bh in reversed(base_hours):
        if kst_now.hour > bh or (kst_now.hour == bh and kst_now.minute >= 10):
            base_hour = bh
            break

    if kst_now.hour < 2 or (kst_now.hour == 2 and kst_now.minute < 10):
        yesterday = kst_now - timedelta(days=1)
        return yesterday.strftime("%Y%m%d"), "2300"

    return kst_now.strftime("%Y%m%d"), f"{base_hour:02d}00"


@router.get("/kma")
async def proxy_kma_weather(
    lat: float = Query(..., description="위도"),
    lon: float = Query(..., description="경도"),
    num_of_rows: int = Query(60, alias="numOfRows", ge=1, le=1000),
    page_no: int = Query(1, alias="pageNo", ge=1),
    data_type: str = Query("JSON", alias="dataType"),
    base_date: Optional[str] = Query(None, alias="baseDate"),
    base_time: Optional[str] = Query(None, alias="baseTime"),
    service_key: Optional[str] = Query(None, alias="serviceKey"),
    use_cache: bool = Query(True, alias="useCache", description="캐시 사용 여부"),
) -> dict:
    """
    기상청 단기예보 API 프록시.
    브라우저 환경에서 발생하는 CORS 이슈를 피하기 위해 서버에서 요청 후 결과를 그대로 전달한다.

    최적화:
    - 5분 캐싱으로 불필요한 API 호출 최소화
    - 같은 격자 좌표는 같은 데이터 공유
    """
    api_key = service_key or KMA_SERVICE_KEY
    if not api_key:
        raise HTTPException(
            status_code=500, detail="KMA 서비스 키가 설정되어 있지 않습니다."
        )

    nx, ny = convert_to_grid(lat, lon)

    if not base_date or not base_time:
        computed_date, computed_time = get_base_time()
        base_date = base_date or computed_date
        base_time = base_time or computed_time

    # 캐시 확인
    cache_key = weather_cache.get_cache_key(lat, lon, base_date, base_time, num_of_rows)

    if use_cache:
        cached_data = weather_cache.get(cache_key)
        if cached_data:
            print(f"✅ [CACHE HIT] {cache_key}")
            return {
                **cached_data,
                "cached": True,
                "cacheHit": True,
            }

    print(f"🌐 [CACHE MISS] KMA API 호출: {cache_key}")

    params = {
        "serviceKey": api_key,
        "numOfRows": str(num_of_rows),
        "pageNo": str(page_no),
        "dataType": data_type,
        "base_date": base_date,
        "base_time": base_time,
        "nx": str(nx),
        "ny": str(ny),
    }

    url = f"{KMA_BASE_URL}/getVilageFcst"

    print(f"[KMA API] 요청 URL: {url}")
    print(f"[KMA API] 파라미터: {params}")

    # 타임아웃 25초로 증가 (KMA API가 매우 느릴 수 있음)
    timeout = aiohttp.ClientTimeout(total=25, connect=10)

    # 재시도 로직 (최대 2번 시도)
    max_retries = 2
    data = None

    for attempt in range(max_retries):
        try:
            print(f"[KMA API] 시도 {attempt + 1}/{max_retries}")
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, params=params) as response:
                    body = await response.text()
                    print(f"[KMA API] 응답 상태: {response.status}")
                    print(f"[KMA API] 응답 본문 (처음 200자): {body[:200]}")

                    if response.status != 200:
                        print(f"[KMA API] 에러 응답: {body[:500]}")

                        # 504 Gateway Timeout은 재시도할 가치가 있음
                        if response.status == 504 and attempt < max_retries - 1:
                            print(
                                f"[KMA API] 504 타임아웃, {attempt + 2}번째 시도 중..."
                            )
                            await asyncio.sleep(2)  # 2초 대기 후 재시도
                            continue

                        raise HTTPException(
                            status_code=response.status,
                            detail=f"KMA API 오류: {response.reason} - {body[:500]}",
                        )

                    try:
                        data = json.loads(body)
                        print(
                            f"[KMA API] ✅ 성공: {attempt + 1}번째 시도에서 데이터 수신"
                        )
                        break  # 성공하면 재시도 루프 종료
                    except json.JSONDecodeError as exc:
                        print(f"[KMA API] JSON 파싱 실패: {exc}")
                        print(f"[KMA API] 파싱 실패한 본문: {body[:500]}")
                        raise HTTPException(
                            status_code=502,
                            detail=f"KMA 응답 파싱 실패: {exc}",
                        ) from exc
        except asyncio.TimeoutError:
            # 타임아웃 전용 에러 메시지
            print(f"[KMA API] ⏱️ 타임아웃 발생 (시도 {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                print("[KMA API] 2초 후 재시도...")
                await asyncio.sleep(2)
                continue
            else:
                print("[KMA API] ❌ 최종 실패: 모든 재시도 소진")
                print("[KMA API] ❌ 최종 실패: 모든 재시도 소진")
                error_msg = (
                    f"KMA API 타임아웃 ({max_retries}번 시도 실패). "
                    "기상청 서버가 응답하지 않습니다."
                )
                raise HTTPException(
                    status_code=504,
                    detail=error_msg,
                )
        except aiohttp.ClientError as exc:
            print(f"[KMA API] 네트워크 에러: {exc}")
            if attempt < max_retries - 1:
                print("[KMA API] 2초 후 재시도...")
                await asyncio.sleep(2)
                continue
            else:
                raise HTTPException(
                    status_code=502,
                    detail=f"KMA API 요청 실패: {exc}",
                ) from exc
        except HTTPException:
            # 이미 처리된 HTTP 예외는 그대로 전달
            raise
        except Exception as exc:
            # 예상하지 못한 에러
            print(f"[KMA API] 예상치 못한 에러: {type(exc).__name__}: {exc}")
            raise HTTPException(
                status_code=500,
                detail=f"KMA API 프록시 내부 오류: {exc}",
            ) from exc

    # 모든 재시도 후에도 data가 None이면 에러
    if data is None:
        raise HTTPException(
            status_code=500,
            detail="KMA API에서 데이터를 가져오는데 실패했습니다.",
        )

    result = {
        "requestedCoords": {"latitude": lat, "longitude": lon},
        "gridCoords": {"nx": nx, "ny": ny},
        "baseTime": {"date": base_date, "time": base_time},
        "raw": data,
        "cached": False,
        "cacheHit": False,
    }

    # 캐시에 저장
    if use_cache:
        weather_cache.set(cache_key, result)
        print(f"💾 [CACHE SAVED] {cache_key}")

    return result


@router.post("/cache/clear")
async def clear_cache() -> dict:
    """캐시 전체 삭제 (디버깅/테스트용)"""
    weather_cache.clear()
    return {"message": "캐시가 삭제되었습니다.", "success": True}


# ============= 날씨 기반 속도 예측 API =============


class WeatherSpeedRequest(BaseModel):
    """날씨 기반 속도 예측 요청"""

    base_speed_mps: float = Field(..., description="기준 속도 (m/s)", gt=0)
    temp_c: float = Field(..., description="기온 (°C)")
    pty: int = Field(0, description="강수형태 (0:없음, 1:비, 2:진눈깨비, 3:눈)")
    rain_mm_per_h: Optional[float] = Field(0.0, description="시간당 강수량 (mm/h)")
    snow_cm_per_h: Optional[float] = Field(0.0, description="시간당 신적설 (cm/h)")
    use_smoothing: bool = Field(False, description="스무딩 적용 여부")

    class Config:
        json_schema_extra = {
            "example": {
                "base_speed_mps": 1.4,
                "temp_c": 18,
                "pty": 0,
                "rain_mm_per_h": 0.0,
                "snow_cm_per_h": 0.0,
                "use_smoothing": False,
            }
        }


class WeatherSpeedResponse(BaseModel):
    """날씨 기반 속도 예측 응답"""

    stride_factor: float = Field(..., description="보폭 계수")
    cadence_factor: float = Field(..., description="보행수 계수")
    weather_coeff: float = Field(..., description="최종 날씨 계수")
    speed_mps: float = Field(..., description="예측 속도 (m/s)")
    speed_kmh: float = Field(..., description="예측 속도 (km/h)")
    percent_change: float = Field(..., description="기준 대비 변화율 (%)")
    warnings: list[str] = Field(default_factory=list, description="안전 경고")


class WeatherETARequest(BaseModel):
    """날씨 기반 ETA 계산 요청"""

    distance_m: float = Field(..., description="거리 (m)", gt=0)
    base_speed_mps: float = Field(..., description="기준 속도 (m/s)", gt=0)
    temp_c: float = Field(..., description="기온 (°C)")
    pty: int = Field(0, description="강수형태")
    rain_mm_per_h: Optional[float] = Field(0.0, description="시간당 강수량 (mm/h)")
    snow_cm_per_h: Optional[float] = Field(0.0, description="시간당 신적설 (cm/h)")

    class Config:
        json_schema_extra = {
            "example": {
                "distance_m": 1000,
                "base_speed_mps": 1.4,
                "temp_c": 18,
                "pty": 0,
                "rain_mm_per_h": 0.0,
                "snow_cm_per_h": 0.0,
            }
        }


class WeatherETAResponse(BaseModel):
    """날씨 기반 ETA 계산 응답"""

    eta_minutes: float = Field(..., description="예상 도착 시간 (분)")
    eta_seconds: float = Field(..., description="예상 도착 시간 (초)")
    base_eta_seconds: float = Field(..., description="기준 도착 시간 (초)")
    time_difference_seconds: float = Field(..., description="시간 차이 (초)")
    speed_kmh: float = Field(..., description="예측 속도 (km/h)")
    weather_coeff: float = Field(..., description="날씨 계수")
    warnings: list[str] = Field(default_factory=list, description="안전 경고")


# 전역 모델 인스턴스 (세션 간 스무딩 유지용)
_speed_model = WeatherSpeedModel()


@router.post("/speed/predict", response_model=WeatherSpeedResponse)
async def predict_walking_speed(request: WeatherSpeedRequest) -> WeatherSpeedResponse:
    """
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
    """
    try:
        # KMA 데이터를 WeatherInput으로 변환
        weather = map_kma_to_weather(
            T=request.temp_c,
            PTY=request.pty,
            RN1=request.rain_mm_per_h,
            SNO=request.snow_cm_per_h,
        )

        # 속도 예측
        result = _speed_model.predict(
            v0_mps=request.base_speed_mps,
            weather=weather,
            use_smoothing=request.use_smoothing,
        )

        return WeatherSpeedResponse(
            stride_factor=result.stride_factor,
            cadence_factor=result.cadence_factor,
            weather_coeff=result.weather_coeff,
            speed_mps=result.speed_mps,
            speed_kmh=result.speed_kmh,
            percent_change=result.percent_change,
            warnings=result.warnings,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"속도 예측 중 오류 발생: {str(e)}")


@router.post("/speed/eta", response_model=WeatherETAResponse)
async def calculate_weather_eta(request: WeatherETARequest) -> WeatherETAResponse:
    """
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
    """
    try:
        # KMA 데이터를 WeatherInput으로 변환
        weather = map_kma_to_weather(
            T=request.temp_c,
            PTY=request.pty,
            RN1=request.rain_mm_per_h,
            SNO=request.snow_cm_per_h,
        )

        # ETA 계산
        eta_result = calculate_eta(
            distance_m=request.distance_m,
            v0_mps=request.base_speed_mps,
            weather=weather,
            model=_speed_model,
        )

        return WeatherETAResponse(
            eta_minutes=eta_result["eta_minutes"],
            eta_seconds=eta_result["eta_seconds"],
            base_eta_seconds=eta_result["base_eta_seconds"],
            time_difference_seconds=eta_result["time_difference_seconds"],
            speed_kmh=eta_result["speed_kmh"],
            weather_coeff=eta_result["weather_coeff"],
            warnings=eta_result["warnings"],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ETA 계산 중 오류 발생: {str(e)}")


@router.post("/speed/reset-smoothing")
async def reset_speed_smoothing() -> dict:
    """
    속도 예측 스무딩 상태 초기화

    **용도:** 새로운 경로 시작 시 이전 스무딩 히스토리 제거
    """
    _speed_model.reset_smoothing()
    return {"message": "스무딩 상태가 초기화되었습니다.", "success": True}


@router.get("/speed/model-info")
async def get_model_info() -> dict:
    """
    날씨 기반 속도 예측 모델 정보 조회

    **반환 정보:**
    - 모델 파라미터
    - 클램프 범위
    - 스무딩 설정
    """
    return {
        "model": "WeatherSpeedModel",
        "version": "1.0",
        "parameters": _speed_model.params,
        "clip_range": {"min": _speed_model.clip_min, "max": _speed_model.clip_max},
        "smoothing": {
            "alpha": _speed_model.smoothing_alpha,
            "enabled": _speed_model.prev_coeff is not None,
        },
        "features": [
            "온도 기반 속도 조절",
            "강수량 기반 속도 조절",
            "적설량 기반 속도 조절",
            "어는 비 보정",
            "습설 보정",
            "안전 경고 생성",
        ],
    }
