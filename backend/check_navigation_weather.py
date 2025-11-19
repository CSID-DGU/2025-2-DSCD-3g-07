"""navigation_logs 테이블의 weather_id 확인"""
from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    # 최근 navigation log 확인
    result = conn.execute(text("""
        SELECT log_id, start_location, weather_id, created_at
        FROM navigation_logs
        ORDER BY log_id DESC
        LIMIT 5
    """))
    
    print("최근 navigation_logs (weather_id 포함):")
    for row in result:
        print(f"  log_id={row[0]}, location={row[1]}, weather_id={row[2]}, created_at={row[3]}")
    
    print("\n")
    
    # weather_cache 데이터 확인
    result = conn.execute(text("""
        SELECT weather_id, latitude, longitude, temperature_celsius, weather_condition, cached_at
        FROM weather_cache
        ORDER BY weather_id DESC
        LIMIT 5
    """))
    
    print("최근 weather_cache:")
    for row in result:
        print(f"  weather_id={row[0]}, lat={row[1]}, lon={row[2]}, temp={row[3]}°C, condition={row[4]}, cached_at={row[5]}")
