"""Add navigation_logs table

Revision ID: add_navigation_logs
Revises: 
Create Date: 2025-11-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# PostgreSQL JSONB 또는 SQLite JSON 선택
try:
    JSONType = JSONB
except:
    JSONType = sa.JSON


def upgrade():
    """네비게이션 로그 테이블 생성"""
    op.create_table(
        'navigation_logs',
        sa.Column('log_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        
        # 기본 정보
        sa.Column('route_mode', sa.String(20), nullable=False),
        sa.Column('start_location', sa.String(200), nullable=True),
        sa.Column('end_location', sa.String(200), nullable=True),
        sa.Column('start_lat', sa.Numeric(9, 6), nullable=False),
        sa.Column('start_lon', sa.Numeric(9, 6), nullable=False),
        sa.Column('end_lat', sa.Numeric(9, 6), nullable=False),
        sa.Column('end_lon', sa.Numeric(9, 6), nullable=False),
        
        # 경로 상세 정보
        sa.Column('total_distance_m', sa.Numeric(8, 2), nullable=False),
        sa.Column('transport_modes', JSONType, nullable=True),
        sa.Column('crosswalk_count', sa.Integer(), server_default='0'),
        
        # 보행 시간 계산 관련 계수들
        sa.Column('user_speed_factor', sa.Numeric(5, 3), nullable=True),
        sa.Column('slope_factor', sa.Numeric(5, 3), nullable=True),
        sa.Column('weather_factor', sa.Numeric(5, 3), nullable=True),
        
        # 시간 정보
        sa.Column('estimated_time_seconds', sa.Integer(), nullable=False),
        sa.Column('actual_time_seconds', sa.Integer(), nullable=False),
        
        # 날씨 정보
        sa.Column('weather_id', sa.Integer(), nullable=True),
        
        # 상세 경로 데이터
        sa.Column('route_data', JSONType, nullable=True),
        
        # 타임스탬프
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.current_timestamp()),
        
        sa.PrimaryKeyConstraint('log_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['weather_id'], ['weather_cache.weather_id'], ondelete='SET NULL'),
    )
    
    # 인덱스 생성
    op.create_index('idx_nav_user_time', 'navigation_logs', ['user_id', 'started_at'])
    op.create_index('idx_nav_route_mode', 'navigation_logs', ['route_mode'])
    op.create_index('idx_nav_created_at', 'navigation_logs', ['created_at'])


def downgrade():
    """네비게이션 로그 테이블 삭제"""
    op.drop_index('idx_nav_created_at', table_name='navigation_logs')
    op.drop_index('idx_nav_route_mode', table_name='navigation_logs')
    op.drop_index('idx_nav_user_time', table_name='navigation_logs')
    op.drop_table('navigation_logs')
