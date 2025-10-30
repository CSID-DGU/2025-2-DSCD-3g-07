import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """FastAPI 테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_route_params():
    """경로 검색 테스트용 샘플 파라미터"""
    return {
        "start_x": 126.9706,  # 서울역 경도
        "start_y": 37.5547,  # 서울역 위도
        "end_x": 127.0276,  # 강남역 경도
        "end_y": 37.4979,  # 강남역 위도
        "user_age": 25,
        "fatigue_level": 3,
    }
