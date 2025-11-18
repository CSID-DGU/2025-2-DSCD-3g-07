"""
네비게이션 로그 시스템 테스트 스크립트

DB 적재 전에 데이터 구조와 로직을 테스트합니다.
"""

from datetime import datetime
from pydantic import ValidationError
from app.schemas import NavigationLogCreate

# 테스트 데이터 1: 도보 경로
walking_log_data = {
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
    "started_at": datetime(2025, 11, 18, 10, 0, 0),
    "ended_at": datetime(2025, 11, 18, 10, 27, 30),
}

# 테스트 데이터 2: 대중교통 경로
transit_log_data = {
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
    "started_at": datetime(2025, 11, 18, 14, 0, 0),
    "ended_at": datetime(2025, 11, 18, 14, 42, 30),
}


def test_schema_validation():
    """스키마 검증 테스트"""
    print("\n" + "=" * 60)
    print("1. 스키마 검증 테스트")
    print("=" * 60)

    # 도보 경로 검증
    try:
        walking_log = NavigationLogCreate(**walking_log_data)
        print("✅ 도보 경로 데이터 검증 성공")
        print(f"   - 경로 모드: {walking_log.route_mode}")
        print(f"   - 총 거리: {walking_log.total_distance_m}m")
        print(f"   - 횡단보도: {walking_log.crosswalk_count}개")
        print(f"   - 계수: 속도={walking_log.user_speed_factor}, "
              f"경사도={walking_log.slope_factor}, "
              f"날씨={walking_log.weather_factor}")
        print(f"   - 시간: 예상={walking_log.estimated_time_seconds}초, "
              f"실제={walking_log.actual_time_seconds}초")
    except ValidationError as e:
        print("❌ 도보 경로 데이터 검증 실패:")
        print(e)
        return False

    # 대중교통 경로 검증
    try:
        transit_log = NavigationLogCreate(**transit_log_data)
        print("\n✅ 대중교통 경로 데이터 검증 성공")
        print(f"   - 경로 모드: {transit_log.route_mode}")
        print(f"   - 교통수단: {transit_log.transport_modes}")
        print(f"   - 총 거리: {transit_log.total_distance_m}m")
        print(f"   - 횡단보도: {transit_log.crosswalk_count}개")
    except ValidationError as e:
        print("❌ 대중교통 경로 데이터 검증 실패:")
        print(e)
        return False

    return True


def test_required_fields():
    """필수 필드 누락 테스트"""
    print("\n" + "=" * 60)
    print("2. 필수 필드 검증 테스트")
    print("=" * 60)

    incomplete_data = {
        "route_mode": "walking",
        "start_lat": 37.558,
        "start_lon": 127.000,
        # end_lat, end_lon 누락
    }

    try:
        NavigationLogCreate(**incomplete_data)
        print("❌ 필수 필드 누락 감지 실패")
        return False
    except ValidationError as e:
        print("✅ 필수 필드 누락 정상 감지:")
        for error in e.errors():
            print(f"   - {error['loc'][0]}: {error['msg']}")
        return True


def test_data_types():
    """데이터 타입 검증 테스트"""
    print("\n" + "=" * 60)
    print("3. 데이터 타입 검증 테스트")
    print("=" * 60)

    wrong_type_data = {
        "route_mode": "walking",
        "start_lat": "not_a_number",  # 잘못된 타입
        "start_lon": 127.000,
        "end_lat": 37.551,
        "end_lon": 126.988,
        "total_distance_m": 2500.5,
        "estimated_time_seconds": 1800,
        "actual_time_seconds": 1650,
        "started_at": datetime(2025, 11, 18, 10, 0, 0),
        "ended_at": datetime(2025, 11, 18, 10, 27, 30),
    }

    try:
        NavigationLogCreate(**wrong_type_data)
        print("❌ 잘못된 데이터 타입 감지 실패")
        return False
    except (ValidationError, ValueError) as e:
        print("✅ 잘못된 데이터 타입 정상 감지:")
        if isinstance(e, ValidationError):
            for error in e.errors():
                print(f"   - {error['loc'][0]}: {error['msg']}")
        else:
            print(f"   - {str(e)}")
        return True


def test_calculate_time_difference():
    """시간 차이 계산 테스트"""
    print("\n" + "=" * 60)
    print("4. 시간 차이 계산 테스트")
    print("=" * 60)

    for name, data in [("도보", walking_log_data), ("대중교통", transit_log_data)]:
        estimated = data["estimated_time_seconds"]
        actual = data["actual_time_seconds"]
        diff = actual - estimated
        accuracy = (1 - abs(diff) / estimated) * 100 if estimated > 0 else 0

        print(f"\n{name} 경로:")
        print(f"   - 예상 시간: {estimated}초 ({estimated // 60}분 {estimated % 60}초)")
        print(f"   - 실제 시간: {actual}초 ({actual // 60}분 {actual % 60}초)")
        print(f"   - 차이: {diff:+d}초 ({diff / 60:+.1f}분)")
        print(f"   - 정확도: {accuracy:.1f}%")

    return True


def test_json_serialization():
    """JSON 직렬화 테스트"""
    print("\n" + "=" * 60)
    print("5. JSON 직렬화 테스트")
    print("=" * 60)

    try:
        walking_log = NavigationLogCreate(**walking_log_data)
        json_data = walking_log.model_dump()
        print("✅ JSON 직렬화 성공")
        print(f"   - 키 개수: {len(json_data)}")
        print(f"   - 포함된 키: {list(json_data.keys())[:5]}...")
        return True
    except Exception as e:
        print(f"❌ JSON 직렬화 실패: {e}")
        return False


def test_edge_cases():
    """경계 케이스 테스트"""
    print("\n" + "=" * 60)
    print("6. 경계 케이스 테스트")
    print("=" * 60)

    # 계수가 없는 경우 (도보 경로에서 경사도 분석 실패 시)
    no_factors_data = {
        "route_mode": "walking",
        "start_location": "출발지",
        "end_location": "도착지",
        "start_lat": 37.5,
        "start_lon": 127.0,
        "end_lat": 37.6,
        "end_lon": 127.1,
        "total_distance_m": 1000.0,
        "estimated_time_seconds": 600,
        "actual_time_seconds": 650,
        "started_at": datetime.now(),
        "ended_at": datetime.now(),
        # user_speed_factor, slope_factor, weather_factor 없음
    }

    try:
        log = NavigationLogCreate(**no_factors_data)
        print("✅ 계수 없는 데이터 처리 성공")
        print(f"   - user_speed_factor: {log.user_speed_factor}")
        print(f"   - slope_factor: {log.slope_factor}")
        print(f"   - weather_factor: {log.weather_factor}")
        return True
    except Exception as e:
        print(f"❌ 계수 없는 데이터 처리 실패: {e}")
        return False


def print_summary(results):
    """테스트 결과 요약"""
    print("\n" + "=" * 60)
    print("테스트 결과 요약")
    print("=" * 60)

    total = len(results)
    passed = sum(results)
    failed = total - passed

    print(f"총 테스트: {total}개")
    print(f"✅ 성공: {passed}개")
    print(f"❌ 실패: {failed}개")
    print(f"성공률: {(passed / total * 100):.1f}%")

    if failed == 0:
        print("\n🎉 모든 테스트 통과! DB 적재 준비 완료")
    else:
        print("\n⚠️  일부 테스트 실패. 수정 후 재테스트 필요")


def main():
    """메인 테스트 실행"""
    print("\n" + "=" * 60)
    print("네비게이션 로그 시스템 테스트")
    print("=" * 60)
    print("DB 적재 전 데이터 구조 및 검증 테스트를 수행합니다.")

    results = []

    # 각 테스트 실행
    results.append(test_schema_validation())
    results.append(test_required_fields())
    results.append(test_data_types())
    results.append(test_calculate_time_difference())
    results.append(test_json_serialization())
    results.append(test_edge_cases())

    # 결과 요약
    print_summary(results)


if __name__ == "__main__":
    main()
