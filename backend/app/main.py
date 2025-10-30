import os
import pathlib

# import joblib  # 제거됨: ml_helpers와 함께 사용하지 않음
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.utils.api_helpers import call_tmap_transit_api
# from app.utils.ml_helpers import predict_adjustment, train_personalization_model  # 제거됨: 더 이상 사용하지 않음
from app.schemas import RouteResponse, WalkingSectionResponse
from app.routers import routes, weather

load_dotenv()  # .env 로드

# 환경 변수 설정
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

app = FastAPI(
    title="PaceTry API",
    description="보행 속도 개인화 API",
    version="1.0.0",
    debug=DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용, 운영에서는 구체적 도메인 설정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(routes.router, prefix="/api")
app.include_router(weather.router, prefix="/api")


def calculate_walking_time(distance_meters: float, avg_speed_kmh: float = 4.5) -> int:
    """
    거리와 평균 속도로 보행 시간 계산
    
    Args:
        distance_meters: 거리 (미터)
        avg_speed_kmh: 평균 보행 속도 (km/h)
    
    Returns:
        예상 보행 시간 (초)
    """
    speed_mps = avg_speed_kmh * 1000 / 3600  # m/s로 변환
    estimated_time_seconds = distance_meters / speed_mps if speed_mps > 0 else 0
    return int(estimated_time_seconds)


# 파일 경로 설정 (더 이상 사용하지 않음 - Factors_Affecting_Walking_Speed.py로 대체)
# base_dir = pathlib.Path(__file__).parent.parent
# model_path = base_dir / "personalization_model.pkl"
# sample_data_path = base_dir / "app" / "utils" / "sample_walking_data.csv"

# try:
#     personalization_model = joblib.load(str(model_path))
# except FileNotFoundError:
#     train_personalization_model(str(sample_data_path))
#     personalization_model = joblib.load(str(model_path))


@app.get("/")
async def read_root() -> dict:
    """
    API 루트 엔드포인트
    
    Returns:
        환영 메시지 및 서버 정보
    """
    return {
        "message": "🚶‍♂️ PaceTry API Server",
        "version": "1.0.0",
        "status": "운영 중",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/api-health", tags=["Health"])
async def api_health_check():
    """API 서버 상태를 확인합니다."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/transit-route", tags=["Routes"])
async def get_transit_route(
    start_x: float = Query(..., description="출발지 경도"),
    start_y: float = Query(..., description="출발지 위도"),
    end_x: float = Query(..., description="도착지 경도"),
    end_y: float = Query(..., description="도착지 위도"),
    count: int = Query(10, description="경로 개수"),
    lang: int = Query(0, description="언어 설정"),
    format: str = Query("json", description="응답 형식"),
):
    """
    T맵 대중교통 경로를 검색합니다.

    T맵 API에서 받은 기본 경로 정보를 그대로 반환합니다.
    """
    response = call_tmap_transit_api(
        start_x, start_y, end_x, end_y, count, lang, format
    )

    if response.status_code == 200:
        return response.json()
    else:
        # 에러 처리
        error_details = response.json() if response.content else {}
        error_code = error_details.get("error", {}).get("code", "Unknown")
        error_message = error_details.get("error", {}).get("message", "Unknown error")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"API Error {error_code}: {error_message}"
        )
        
# === DB 관련 임포트 및 설정 (추가) ===
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import engine, get_db
from app import crud

# DB 테이블 생성
try:
    from app.models import Base
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"DB 초기화 오류: {e}")

# DB 헬스체크 엔드포인트 추가
@app.get("/db-health", tags=["Health"])
def db_health_check(db: Session = Depends(get_db)):
    """데이터베이스 연결 상태 확인"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "db connection ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
