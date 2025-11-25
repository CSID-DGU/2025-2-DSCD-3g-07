"""
navigation_logs 테이블에 실제 보행 거리 컬럼 추가
"""
from app.database import engine
from sqlalchemy import text

# 컬럼 추가
with engine.connect() as conn:
    print("📊 navigation_logs 테이블에 walking_distance_m 컬럼 추가 중...")
    
    conn.execute(text('''
        ALTER TABLE navigation_logs 
        ADD COLUMN IF NOT EXISTS walking_distance_m DECIMAL(8, 2)
    '''))
    print("  ✅ walking_distance_m 추가 완료")
    
    conn.commit()
    
    print("\n✅ 컬럼 추가 완료!")
    print("\n💡 설명:")
    print("   - walking_distance_m: 실제 보행 거리 (m)")
    print("   - GPS 추적 기반으로 차량/정지 구간 제외")
    print("   - total_distance_m과 비교하여 보행 비율 분석 가능")
