import os
from typing import Any, Optional

import requests
from dotenv import load_dotenv

load_dotenv()


def call_tmap_transit_api(
    start_x: float,
    start_y: float,
    end_x: float,
    end_y: float,
    count: int = 1,
    lang: int = 0,
    format: str = "json",
) -> Optional[dict[str, Any]]:
    """
    T맵 대중교통 경로 API 호출
    
    Args:
        start_x: 출발지 경도
        start_y: 출발지 위도
        end_x: 도착지 경도
        end_y: 도착지 위도
        count: 경로 개수
        lang: 언어 (0: 한국어, 1: 영어)
        format: 응답 형식
    
    Returns:
        API 응답 데이터 또는 None
    """
    url = "https://apis.openapi.sk.com/transit/routes"
    headers = {
        "accept": "application/json",
        "appKey": os.getenv("TMAP_APPKEY"),
        "content-type": "application/json",
    }
    body = {
        "startX": start_x,
        "startY": start_y,
        "endX": end_x,
        "endY": end_y,
        "count": count,
        "lang": lang,
        "format": format,
    }
    response = requests.post(url, headers=headers, json=body)
    return response
