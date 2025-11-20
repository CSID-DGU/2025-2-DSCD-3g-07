"""
navigation_logs 테이블에 실제 보행속도 측정 컬럼 추가
"""
from app.database import engine
from sqlalchemy import text

# 컬럼 추가
with engine.connect() as conn:
    print("📊 navigation_logs 테이블에 새 컬럼 추가 중...")
    
    conn.execute(text('ALTER TABLE navigation_logs ADD COLUMN IF NOT EXISTS active_walking_time_seconds INTEGER'))
    print("  ✅ active_walking_time_seconds 추가")
    
    conn.execute(text('ALTER TABLE navigation_logs ADD COLUMN IF NOT EXISTS paused_time_seconds INTEGER DEFAULT 0'))
    print("  ✅ paused_time_seconds 추가")
    
    conn.execute(text('ALTER TABLE navigation_logs ADD COLUMN IF NOT EXISTS real_walking_speed_ms DECIMAL(4, 2)'))
    print("  ✅ real_walking_speed_ms 추가")
    
    conn.execute(text('ALTER TABLE navigation_logs ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0'))
    print("  ✅ pause_count 추가")
    
    conn.execute(text('ALTER TABLE navigation_logs ADD COLUMN IF NOT EXISTS movement_data JSONB'))
    print("  ✅ movement_data 추가")
    
    conn.commit()
    
    print("\n✅ 모든 컬럼 추가 완료!")
