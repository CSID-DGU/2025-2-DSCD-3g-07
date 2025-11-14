import os

# import joblib  # 제거됨: ml_helpers와 함께 사용하지 않음
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.routers import auth, routes, weather, gpx_routes

# from app.utils.ml_helpers import predict_adjustment, train_personalization_model  # 제거됨: 더 이상 사용하지 않음
from app.utils import walking_only
from app.utils.api_helpers import call_tmap_transit_api

load_dotenv()  # .env 로드

# 환경 변수 설정
HOST = os.getenv("HOST", "0.0.0.0")  # nosec B104
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
app.include_router(auth.router, prefix="/api")
app.include_router(routes.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(walking_only.router, prefix="/api")
app.include_router(gpx_routes.router)


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
        "health": "/health",
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

    보행 시간 재계산 및 보정은 /api/routes/analyze-slope에서 수행
    """
    response = call_tmap_transit_api(
        start_x, start_y, end_x, end_y, count, lang, format
    )

    if response.status_code == 200:
        data = response.json()
        itineraries = data.get("metaData", {}).get("plan", {}).get("itineraries", [])
        print(f"✅ 대중교통 경로 검색 성공 - {len(itineraries)}개 경로")
        return data
    else:
        # 에러 처리
        error_details = response.json() if response.content else {}
        error_code = error_details.get("error", {}).get("code", "Unknown")
        error_message = error_details.get("error", {}).get("message", "Unknown error")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"API Error {error_code}: {error_message}",
        )


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
