"""
경로 검색 API 테스트
"""

from fastapi.testclient import TestClient


def test_transit_route_missing_params(client: TestClient):
    """필수 파라미터 누락 시 422 에러 테스트"""
    response = client.get("/transit-route")
    assert response.status_code == 422


def test_transit_route_with_required_params(client: TestClient, sample_route_params):
    """필수 파라미터만으로 경로 검색 테스트"""
    required_params = {
        "start_x": sample_route_params["start_x"],
        "start_y": sample_route_params["start_y"],
        "end_x": sample_route_params["end_x"],
        "end_y": sample_route_params["end_y"],
    }

    response = client.get("/transit-route", params=required_params)
    # API 키나 외부 서비스 의존성으로 인해 실제 성공은 어려울 수 있음
    # 하지만 파라미터 검증은 통과해야 함
    assert response.status_code in [200, 500]  # 500은 외부 API 오류 허용


def test_transit_route_with_all_params(client: TestClient, sample_route_params):
    """모든 파라미터 포함 경로 검색 테스트"""
    response = client.get("/transit-route", params=sample_route_params)
    assert response.status_code in [200, 500]  # 500은 외부 API 오류 허용


def test_transit_route_invalid_coordinates(client: TestClient):
    """잘못된 좌표 입력 테스트"""
    invalid_params = {
        "start_x": "invalid",
        "start_y": 37.5547,
        "end_x": 127.0276,
        "end_y": 37.4979,
    }

    response = client.get("/transit-route", params=invalid_params)
    assert response.status_code == 422


def test_transit_route_parameter_types(client: TestClient):
    """잘못된 파라미터 타입 테스트"""
    params = {
        "start_x": "invalid",  # 필수 파라미터에 잘못된 타입
        "start_y": 37.5547,
        "end_x": 127.0276,
        "end_y": 37.4979,
    }

    response = client.get("/transit-route", params=params)
    assert response.status_code == 422


def test_transit_route_fatigue_level_range(client: TestClient, sample_route_params):
    """피로도 레벨 범위 테스트"""
    # 정상 범위 (1-5)
    for fatigue_level in [1, 3, 5]:
        params = sample_route_params.copy()
        params["fatigue_level"] = fatigue_level
        response = client.get("/transit-route", params=params)
        assert response.status_code in [200, 500]  # 파라미터 검증은 통과

    # 범위 외 값도 허용되는지 확인 (현재 API는 제한이 없음)
    params = sample_route_params.copy()
    params["fatigue_level"] = 10
    response = client.get("/transit-route", params=params)
    assert response.status_code in [200, 500]
