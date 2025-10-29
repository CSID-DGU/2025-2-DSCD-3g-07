"""
기상청 단기예보 API 프록시 라우터
"""

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import aiohttp
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/weather", tags=["weather"])

KMA_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
KMA_SERVICE_KEY = os.getenv("KMA_SERVICE_KEY") or os.getenv("KMA_API_KEY")
KST = timezone(timedelta(hours=9))


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
) -> dict:
    """
    기상청 단기예보 API 프록시.
    브라우저 환경에서 발생하는 CORS 이슈를 피하기 위해 서버에서 요청 후 결과를 그대로 전달한다.
    """
    api_key = service_key or KMA_SERVICE_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="KMA 서비스 키가 설정되어 있지 않습니다.")

    nx, ny = convert_to_grid(lat, lon)

    if not base_date or not base_time:
        computed_date, computed_time = get_base_time()
        base_date = base_date or computed_date
        base_time = base_time or computed_time

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

    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        try:
            async with session.get(url, params=params) as response:
                body = await response.text()
                if response.status != 200:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"KMA API 오류: {response.reason} - {body}",
                    )
                try:
                    data = json.loads(body)
                except json.JSONDecodeError as exc:
                    raise HTTPException(
                        status_code=502,
                        detail=f"KMA 응답 파싱 실패: {exc}",
                    ) from exc
        except aiohttp.ClientError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"KMA API 요청 실패: {exc}",
            ) from exc

    return {
        "requestedCoords": {"latitude": lat, "longitude": lon},
        "gridCoords": {"nx": nx, "ny": ny},
        "baseTime": {"date": base_date, "time": base_time},
        "raw": data,
    }
