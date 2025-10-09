import os
import pathlib

import joblib
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.utils.api_helpers import call_tmap_transit_api
from app.utils.ml_helpers import predict_adjustment, train_personalization_model

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


def calculate_walking_time(distance_meters, avg_speed_kmh=4.5):
    speed_mps = avg_speed_kmh * 1000 / 3600  # m/s로 변환
    estimated_time_seconds = distance_meters / speed_mps if speed_mps > 0 else 0
    return int(estimated_time_seconds)


# 파일 경로 설정

base_dir = pathlib.Path(__file__).parent.parent
model_path = base_dir / "personalization_model.pkl"
sample_data_path = base_dir / "app" / "utils" / "sample_walking_data.csv"

try:
    personalization_model = joblib.load(str(model_path))
except FileNotFoundError:
    train_personalization_model(str(sample_data_path))
    personalization_model = joblib.load(str(model_path))


@app.get("/")
async def read_root():
    return {
        "message": "🚶‍♂️ PaceTry API Server",
        "version": "1.0.0",
        "status": "운영 중",
        "docs": "http://127.0.0.1:8000/docs",
        "health": "http://127.0.0.1:8000/health"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """서버 상태를 확인합니다."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/transit-route", tags=["Routes"])
async def get_transit_route(
    start_x: float = Query(..., description="출발지 경도"),
    start_y: float = Query(..., description="출발지 위도"),
    end_x: float = Query(..., description="도착지 경도"),
    end_y: float = Query(..., description="도착지 위도"),
    count: int = Query(1, description="경로 개수"),
    lang: int = Query(0, description="언어 설정"),
    format: str = Query("json", description="응답 형식"),
    user_id: str = Query("default_user", description="사용자 ID"),
    user_age: int = Query(30, description="사용자 나이"),
    fatigue_level: int = Query(3, description="피로도 레벨 (1-5)"),
):
    """
    개인화된 대중교통 경로를 검색합니다.

    사용자의 나이와 피로도를 고려하여 보행 시간을 조정한 경로 정보를 제공합니다.
    """
    response = call_tmap_transit_api(
        start_x, start_y, end_x, end_y, count, lang, format
    )

    if response.status_code == 200:
        data = response.json()
        itinerary = data.get("metaData", {}).get("plan", {}).get("itineraries", [{}])[0]

        # 도보 시간 추출
        walking_sections = []
        total_walk_time = itinerary.get("totalWalkTime", 0)  # 전체 도보 시간 (초)
        for leg in itinerary.get("legs", []):
            if leg.get("mode") == "WALK":
                walking_sections.append(
                    {
                        "section_time_seconds": leg.get("sectionTime", 0),
                        "distance_meters": leg.get("distance", 0),
                        "start_name": leg.get("start", {}).get("name", "Unknown"),
                        "end_name": leg.get("end", {}).get("name", "Unknown"),
                    }
                )

        # 계산 로직: 예상 시간 및 오차
        for section in walking_sections:
            section["estimated_time_seconds"] = calculate_walking_time(
                section["distance_meters"]
            )
            section["actual_vs_estimated_diff"] = (
                section["section_time_seconds"] - section["estimated_time_seconds"]
            )
            if (
                abs(section["actual_vs_estimated_diff"])
                > section["section_time_seconds"] * 0.2
            ):
                section[
                    "accuracy_warning"
                ] = "High variance - consider real-time factors"

        # 개인화 적용
        personalized_sections = []
        for section in walking_sections:
            factor = predict_adjustment(
                personalization_model,
                section["distance_meters"],
                user_age,
                fatigue_level,
            )
            section["personalized_time_seconds"] = int(
                section["section_time_seconds"] * factor
            )
            personalized_sections.append(section)

        # 혼합 경로 처리
        total_time = itinerary.get("totalTime", 0)
        walk_ratio = (total_walk_time / total_time) * 100 if total_time > 0 else 0

        processed_data = {
            "original_data": data,
            "total_time_minutes": total_time / 60,
            "total_walk_time_minutes": total_walk_time / 60,
            "walk_ratio_percent": walk_ratio,
            "non_walk_time_minutes": (total_time - total_walk_time) / 60,
            "walking_sections_count": len(walking_sections),
            "walking_sections": personalized_sections,
            "total_estimated_walk_time_minutes": sum(
                section["estimated_time_seconds"] for section in walking_sections
            )
            / 60,
            "total_personalized_walk_time_minutes": sum(
                section["personalized_time_seconds"]
                for section in personalized_sections
            )
            / 60,
            "adjustment_factor": factor,
            "overall_accuracy_note": "Times are estimates; adjust for weather/terrain",
        }
        return processed_data
    else:
        # 에러 처리
        error_details = response.json()
        error_code = error_details.get("error", {}).get("code", "Unknown")
        error_message = error_details.get("error", {}).get("message", "Unknown error")
        return {
            "error_code": error_code,
            "error_message": error_message,
            "status_code": response.status_code,
        }

# DB 용 main.py 예시 코드
# app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app import models
from app.database import engine, get_db
from app import crud

# DB 테이블 생성 (테이블이 없으면 자동 생성)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PaceTry API")

@app.get("/")
async def root():
    return {"message": "Hello World"}


# DB 연결 확인 예시
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "db connection ok"}

# ORM 구조 확인 (개발용)
@app.get("/users/count")
def users_count(db: Session = Depends(get_db)):
    return {"users": db.query(models.Users).count()}

@app.get("/routes/sample")
def routes_sample(db: Session = Depends(get_db)):
    row = db.query(models.Routes).order_by(models.Routes.route_id.desc()).first()
    return {"latest_route": row.route_name if row else None}

# crud 활용예시
# @app.post("/users")
# def create_user(username: str, email: str, password: str, db: Session = Depends(get_db)):
#     hash_pw = some_hash_function(password)
#     return crud.create_user(db, username, email, hash_pw)

# @app.get("/routes")
# def read_routes(db: Session = Depends(get_db)):
#     return crud.get_all_routes(db)

