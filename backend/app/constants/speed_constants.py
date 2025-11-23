"""
속도 프로필 관련 상수
"""

# Case2 (느린 산책) 속도 비율
# Case2 = Case1 * SLOW_WALK_SPEED_RATIO
SLOW_WALK_SPEED_RATIO = 0.8

# 기본 속도값 (km/h)
DEFAULT_WALKING_SPEED_CASE1 = 4.0  # 경로 안내용
DEFAULT_WALKING_SPEED_CASE2 = 3.2  # 코스 추천용 (4.0 * 0.8)

# 속도 유효 범위 (km/h)
MIN_WALKING_SPEED = 1.5
MAX_WALKING_SPEED = 8.0

# 속도 업데이트 최소 시간 (초)
MIN_ACTIVE_WALKING_TIME = 300  # 5분
