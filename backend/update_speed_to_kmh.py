"""
navigation_logs 테이블의 real_walking_speed_ms를 real_walking_speed_kmh로 변경
"""
from app.database import engine
from sqlalchemy import text

# 컬럼명 변경
with engine.connect() as conn:
    print("📊 navigation_logs 테이블 컬럼 변경 중...")
    
    # 기존 컬럼 삭제 및 새 컬럼 추가
    conn.execute(text('ALTER TABLE navigation_logs DROP COLUMN IF EXISTS real_walking_speed_ms'))
    print("  ✅ real_walking_speed_ms 삭제")
    
    conn.execute(text('ALTER TABLE navigation_logs ADD COLUMN IF NOT EXISTS real_walking_speed_kmh DECIMAL(4, 2)'))
    print("  ✅ real_walking_speed_kmh 추가 (km/h 단위)")
    
    conn.commit()
    
    print("\n✅ 컬럼 변경 완료! (m/s → km/h)")
