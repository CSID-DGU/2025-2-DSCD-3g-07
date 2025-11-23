"""
DB 마이그레이션: avg_speed_slow_walk_kmh 컬럼 추가

activity_speed_profile 테이블에 Case2 (느린 산책) 속도 컬럼 추가
"""

import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def upgrade():
    """컬럼 추가 및 기존 데이터 마이그레이션"""
    with engine.connect() as conn:
        # 1. 컬럼 추가
        print("📊 avg_speed_slow_walk_kmh 컬럼 추가 중...")
        conn.execute(text('''
            ALTER TABLE activity_speed_profile 
            ADD COLUMN IF NOT EXISTS avg_speed_slow_walk_kmh NUMERIC(4, 2)
        '''))
        conn.commit()
        print("✅ 컬럼 추가 완료")
        
        # 2. 기존 데이터에 대해 Case2 값 자동 계산 (Case1의 80%)
        print("🔄 기존 데이터 마이그레이션 중...")
        conn.execute(text('''
            UPDATE activity_speed_profile
            SET avg_speed_slow_walk_kmh = ROUND(avg_speed_flat_kmh * 0.8, 2)
            WHERE avg_speed_slow_walk_kmh IS NULL
        '''))
        conn.commit()
        print("✅ 기존 데이터 마이그레이션 완료")

def downgrade():
    """컬럼 제거"""
    with engine.connect() as conn:
        print("⚠️ avg_speed_slow_walk_kmh 컬럼 제거 중...")
        conn.execute(text('''
            ALTER TABLE activity_speed_profile 
            DROP COLUMN IF EXISTS avg_speed_slow_walk_kmh
        '''))
        conn.commit()
        print("✅ 컬럼 제거 완료")

if __name__ == "__main__":
    print("=" * 60)
    print("DB 마이그레이션: Case2 (느린 산책 속도) 컬럼 추가")
    print("=" * 60)
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()
    
    print("\n✅ 마이그레이션 완료!")
