"""
weather_cache 테이블에 location_name 컬럼 추가 마이그레이션

문제:
  - psycopg2.errors.UndefinedColumn: column "location_name" of relation "weather_cache" does not exist

해결:
  - weather_cache 테이블에 location_name VARCHAR(100) 컬럼 추가

실행:
  python -m migrations.add_location_name_to_weather_cache
"""

import os
import sys

# 상위 디렉토리를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL


def migrate():
    """weather_cache 테이블에 location_name 컬럼 추가"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        # 트랜잭션 시작
        trans = conn.begin()
        
        try:
            # 컬럼 존재 여부 확인
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'weather_cache' 
                AND column_name = 'location_name';
            """)
            result = conn.execute(check_sql)
            exists = result.fetchone() is not None
            
            if exists:
                print("✅ location_name 컬럼이 이미 존재합니다.")
            else:
                # 컬럼 추가
                alter_sql = text("""
                    ALTER TABLE weather_cache 
                    ADD COLUMN location_name VARCHAR(100);
                """)
                conn.execute(alter_sql)
                print("✅ weather_cache 테이블에 location_name 컬럼 추가 완료")
            
            trans.commit()
            print("✅ 마이그레이션 완료")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ 마이그레이션 실패: {e}")
            raise


def rollback():
    """location_name 컬럼 제거 (롤백)"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        trans = conn.begin()
        
        try:
            alter_sql = text("""
                ALTER TABLE weather_cache 
                DROP COLUMN IF EXISTS location_name;
            """)
            conn.execute(alter_sql)
            trans.commit()
            print("✅ location_name 컬럼 제거 완료 (롤백)")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ 롤백 실패: {e}")
            raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="weather_cache 테이블 마이그레이션")
    parser.add_argument("--rollback", action="store_true", help="롤백 실행")
    args = parser.parse_args()
    
    if args.rollback:
        rollback()
    else:
        migrate()
