"""weather_cache 테이블의 제약 조건 확인"""
from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT conname, pg_get_constraintdef(oid) 
        FROM pg_constraint 
        WHERE conrelid = 'weather_cache'::regclass
    """))
    
    print("weather_cache 테이블의 제약 조건:")
    for row in result:
        print(f"  {row[0]}: {row[1]}")
