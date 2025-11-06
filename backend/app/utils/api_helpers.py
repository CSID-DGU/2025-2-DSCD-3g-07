import os
from datetime import datetime
from typing import Any, Optional

import requests
from dotenv import load_dotenv

load_dotenv()


def call_tmap_transit_api(
    start_x: float,
    start_y: float,
    end_x: float,
    end_y: float,
    count: int = 10,
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
    tmap_key = os.getenv("TMAP_APPKEY")

    # TMAP API 키가 없으면 더미 데이터 반환
    if not tmap_key or tmap_key == "your_tmap_api_key_here":
        print("⚠️ TMAP API 키가 설정되지 않아 더미 데이터를 반환합니다.")

        # 더미 응답 생성
        class DummyResponse:
            status_code = 200
            content = b"{}"

            def json(self):
                return {
                    "metaData": {
                        "plan": {
                            "itineraries": [
                                {
                                    "totalTime": 1800,  # 30분 (초)
                                    "totalWalkTime": 600,  # 10분 (초)
                                    "legs": [
                                        {
                                            "mode": "WALK",
                                            "sectionTime": 300,
                                            "distance": 400,
                                            "start": {"name": "출발지"},
                                            "end": {"name": "정류장1"},
                                        },
                                        {
                                            "mode": "BUS",
                                            "sectionTime": 900,
                                            "distance": 5000,
                                            "start": {"name": "정류장1"},
                                            "end": {"name": "정류장2"},
                                        },
                                        {
                                            "mode": "WALK",
                                            "sectionTime": 300,
                                            "distance": 350,
                                            "start": {"name": "정류장2"},
                                            "end": {"name": "도착지"},
                                        },
                                    ],
                                }
                            ]
                        }
                    }
                }

        return DummyResponse()

    url = "https://apis.openapi.sk.com/transit/routes"
    headers = {
        "accept": "application/json",
        "appKey": tmap_key,
        "content-type": "application/json",
    }

    # 현재 시간을 yyyymmddhhmm 형식으로 변환
    current_time = datetime.now().strftime("%Y%m%d%H%M")

    body = {
        "startX": start_x,
        "startY": start_y,
        "endX": end_x,
        "endY": end_y,
        "count": count,
        "lang": lang,
        "format": format,
        "searchDttm": current_time,  # 현재 시간 추가
    }

    print(f"🕐 [TMAP API] 검색 시간: {current_time}")

    response = requests.post(url, headers=headers, json=body)  # nosec B113
    return response
