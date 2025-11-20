"""
속도 이력 테이블 생성 마이그레이션

사용자의 보행 속도 변화 이력을 추적하기 위한 테이블
"""
from sqlalchemy import text
from app.database import engine

def upgrade():
    """speed_history 테이블 생성"""
    with engine.connect() as conn:
        # 테이블 생성
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS speed_history (
                history_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                activity_type VARCHAR(20) NOT NULL DEFAULT 'walking',
                measured_speed_kmh NUMERIC(4, 2) NOT NULL,
                source VARCHAR(20) NOT NULL,
                navigation_log_id INTEGER REFERENCES navigation_logs(log_id) ON DELETE SET NULL,
                recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                
                CONSTRAINT ck_speed_range CHECK (measured_speed_kmh >= 2.0 AND measured_speed_kmh <= 8.0),
                CONSTRAINT ck_source_type CHECK (source IN ('navigation_log', 'manual', 'health_connect', 'initial'))
            )
        """))
        
        # 인덱스 생성
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_speed_history_user_time 
            ON speed_history(user_id, recorded_at DESC)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_speed_history_user_activity 
            ON speed_history(user_id, activity_type)
        """))
        
        conn.commit()
        print("✅ speed_history 테이블 생성 완료")

def downgrade():
    """speed_history 테이블 삭제"""
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS speed_history CASCADE"))
        conn.commit()
        print("✅ speed_history 테이블 삭제 완료")

if __name__ == "__main__":
    print("🔧 속도 이력 테이블 마이그레이션 시작...")
    upgrade()
    print("✅ 마이그레이션 완료")
