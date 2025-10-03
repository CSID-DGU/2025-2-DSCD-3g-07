"""
FastAPI 기본 엔드포인트 테스트
"""
import pytest
from fastapi.testclient import TestClient


def test_read_root(client: TestClient):
    """루트 엔드포인트 테스트"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "Hello World"


def test_health_check(client: TestClient):
    """Health check 엔드포인트 테스트"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "version" in data


def test_health_check_response_format(client: TestClient):
    """Health check 응답 형식 검증"""
    response = client.get("/health")
    data = response.json()

    # 필수 필드 존재 확인
    required_fields = ["status", "version"]
    for field in required_fields:
        assert field in data

    # 값 타입 확인
    assert isinstance(data["status"], str)
    assert isinstance(data["version"], str)


def test_api_docs_available(client: TestClient):
    """API 문서 접근 가능성 테스트"""
    response = client.get("/docs")
    assert response.status_code == 200

    response = client.get("/redoc")
    assert response.status_code == 200


def test_openapi_json(client: TestClient):
    """OpenAPI JSON 스키마 테스트"""
    response = client.get("/openapi.json")
    assert response.status_code == 200

    data = response.json()
    assert "openapi" in data
    assert "info" in data
    assert data["info"]["title"] == "PaceTry API"
