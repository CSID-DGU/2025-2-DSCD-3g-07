# DB 연결 설정

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드 (DB 보안 정보 분리)
load_dotenv()

# PostgreSQL 연결 URL
# URL은 .env 파일 안에 존재
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy 엔진 생성 (DB 연결 객체)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 연결 안정성 향상 옵션
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# 세션(Session) 생성 — 실제 쿼리 실행 시 사용됨
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 생성 — 모든 모델 클래스가 이걸 상속받음
Base = declarative_base()

# FastAPI 의존성 주입용 함수
# 요청마다 새로운 DB 세션을 생성하고, 끝나면 자동 종료되게 함
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
