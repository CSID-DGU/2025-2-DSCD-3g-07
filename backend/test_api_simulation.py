"""
실제 API 호출 시뮬레이션 (DB 없이)

실제 프론트엔드에서 보내는 데이터 형식으로 테스트
"""

from datetime import datetime
from app.schemas import NavigationLogCreate, NavigationLogResponse
import json


def simulate_api_call(user_id: int, log_data: dict):
    """API 호출 시뮬레이션"""
    print("\n" + "=" * 60)
    print(f"POST /api/navigation/logs?user_id={user_id}")
    print("=" * 60)
    
    # 요청 데이터 출력
    print("\n📤 요청 데이터:")
    print(json.dumps(log_data, indent=2, default=str, ensure_ascii=False))
    
    try:
        # 스키마 검증
        validated_data = NavigationLogCreate(**log_data)
        
        print("\n✅ 스키마 검증 성공")
        
        # 응답 시뮬레이션 (DB 저장 없이)
        response = NavigationLogResponse(
            log_id=999,  # 가상 ID
            user_id=user_id,
            route_mode=validated_data.route_mode,
            start_location=validated_data.start_location,
            end_location=validated_data.end_location,
            start_lat=validated_data.start_lat,
            start_lon=validated_data.start_lon,
            end_lat=validated_data.end_lat,
            end_lon=validated_data.end_lon,
            total_distance_m=validated_data.total_distance_m,
            transport_modes=validated_data.transport_modes,
            crosswalk_count=validated_data.crosswalk_count or 0,
            user_speed_factor=validated_data.user_speed_factor,
            slope_factor=validated_data.slope_factor,
            weather_factor=validated_data.weather_factor,
            estimated_time_seconds=validated_data.estimated_time_seconds,
            actual_time_seconds=validated_data.actual_time_seconds,
            time_difference_seconds=validated_data.actual_time_seconds - validated_data.estimated_time_seconds,
            weather_id=validated_data.weather_id,
            route_data=validated_data.route_data,
            started_at=validated_data.started_at,
            ended_at=validated_data.ended_at,
            created_at=datetime.now(),
        )
        
        print("\n📥 응답 데이터:")
        print(json.dumps(response.model_dump(), indent=2, default=str, ensure_ascii=False))
        
        print("\n✅ API 호출 시뮬레이션 성공")
        print(f"   - 저장될 log_id: {response.log_id}")
        print(f"   - 시간 차이: {response.time_difference_seconds}초")
        
        return True
        
    except Exception as e:
        print(f"\n❌ API 호출 시뮬레이션 실패: {e}")
        return False


# 테스트 데이터 1: 도보
walking_request = {
    "route_mode": "walking",
    "start_location": "동국대학교",
    "end_location": "남산타워",
    "start_lat": 37.558,
    "start_lon": 127.000,
    "end_lat": 37.551,
    "end_lon": 126.988,
    "total_distance_m": 2500.5,
    "crosswalk_count": 5,
    "user_speed_factor": 0.887,
    "slope_factor": 1.15,
    "weather_factor": 1.0,
    "estimated_time_seconds": 1800,
    "actual_time_seconds": 1650,
    "started_at": "2025-11-18T10:00:00",
    "ended_at": "2025-11-18T10:27:30",
}

# 테스트 데이터 2: 대중교통
transit_request = {
    "route_mode": "transit",
    "start_location": "동국대학교",
    "end_location": "강남역",
    "start_lat": 37.558,
    "start_lon": 127.000,
    "end_lat": 37.498,
    "end_lon": 127.028,
    "total_distance_m": 8500.0,
    "transport_modes": ["BUS", "SUBWAY"],
    "crosswalk_count": 3,
    "user_speed_factor": 0.950,
    "slope_factor": 1.05,
    "weather_factor": 1.1,
    "estimated_time_seconds": 2400,
    "actual_time_seconds": 2550,
    "started_at": "2025-11-18T14:00:00",
    "ended_at": "2025-11-18T14:42:30",
}


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("API 호출 시뮬레이션 테스트 (DB 없이)")
    print("=" * 60)
    
    results = []
    
    # 도보 경로 테스트
    results.append(simulate_api_call(user_id=1, log_data=walking_request))
    
    # 대중교통 경로 테스트
    results.append(simulate_api_call(user_id=1, log_data=transit_request))
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("시뮬레이션 결과")
    print("=" * 60)
    print(f"성공: {sum(results)}/{len(results)}")
    
    if all(results):
        print("\n🎉 모든 시뮬레이션 성공!")
        print("   실제 DB 적재 시에도 정상 작동할 것으로 예상됩니다.")
    else:
        print("\n⚠️  일부 시뮬레이션 실패")
