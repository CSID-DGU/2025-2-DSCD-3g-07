"""
activity_speed_profile에 속도 이력 JSONB 컬럼 추가

기존 테이블을 확장하여 속도 변화 이력을 추적
"""
from sqlalchemy import text
from app.database import engine

def upgrade():
    """speed_history JSONB 컬럼 추가"""
    with engine.connect() as conn:
        # JSONB 컬럼 추가
        conn.execute(text("""
            ALTER TABLE activity_speed_profile 
            ADD COLUMN IF NOT EXISTS speed_history JSONB DEFAULT '[]'::jsonb
        """))
        
        conn.commit()
        print("✅ activity_speed_profile.speed_history 컬럼 추가 완료")

def downgrade():
    """speed_history 컬럼 삭제"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE activity_speed_profile 
            DROP COLUMN IF EXISTS speed_history
        """))
        conn.commit()
        print("✅ activity_speed_profile.speed_history 컬럼 삭제 완료")

if __name__ == "__main__":
    print("🔧 속도 이력 컬럼 추가 마이그레이션 시작...")
    upgrade()
    print("✅ 마이그레이션 완료")
