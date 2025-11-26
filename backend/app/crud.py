# DB 조작 함수: Create, Read, Update, Delete
# 초안만 일단
# CRUD는 백엔드 개발 중 언제든지 수정될 수 있음

from datetime import datetime

# app/crud.py
from sqlalchemy.orm import Session

from app import models
from app.constants.speed_constants import SLOW_WALK_SPEED_RATIO


# ================================
# 1. USERS
# ================================
def create_user(
    db: Session,
    username: str,
    email: str,
    password_hash: str,
    auth_provider: str = "local",
):
    new_user = models.Users(
        username=username,
        email=email,
        password_hash=password_hash,
        auth_provider=auth_provider,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.Users).filter(models.Users.user_id == user_id).first()


def get_user_by_email(db: Session, email: str):
    """이메일로 사용자 조회"""
    return db.query(models.Users).filter(models.Users.email == email).first()


def get_user_by_username(db: Session, username: str):
    """사용자명으로 사용자 조회"""
    return db.query(models.Users).filter(models.Users.username == username).first()


def update_last_login(db: Session, user_id: int):
    """마지막 로그인 시간 업데이트"""
    user = get_user_by_id(db, user_id)
    if user:
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user


def get_all_users(db: Session):
    return db.query(models.Users).all()


def delete_user(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if user:
        db.delete(user)
        db.commit()
    return user


# ================================
# 2. WEATHER_CACHE
# ================================
def create_weather_cache(db: Session, **kwargs):
    weather = models.WeatherCache(**kwargs)
    db.add(weather)
    db.commit()
    db.refresh(weather)
    return weather


def get_weather_by_id(db: Session, weather_id: int):
    return (
        db.query(models.WeatherCache)
        .filter(models.WeatherCache.weather_id == weather_id)
        .first()
    )


def get_all_weather_cache(db: Session):
    return db.query(models.WeatherCache).all()


def delete_weather_cache(db: Session, weather_id: int):
    w = get_weather_by_id(db, weather_id)
    if w:
        db.delete(w)
        db.commit()
    return w


# ================================
# 3. HEALTH_DATA
# ================================
def create_health_data(db: Session, **kwargs):
    record = models.HealthData(**kwargs)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_health_data_by_id(db: Session, health_data_id: int):
    return (
        db.query(models.HealthData)
        .filter(models.HealthData.health_data_id == health_data_id)
        .first()
    )


def get_user_health_data(db: Session, user_id: int):
    return (
        db.query(models.HealthData).filter(models.HealthData.user_id == user_id).all()
    )


def delete_health_data(db: Session, health_data_id: int):
    record = get_health_data_by_id(db, health_data_id)
    if record:
        db.delete(record)
        db.commit()
    return record


# ================================
# 4. ACTIVITY_SPEED_PROFILE
# ================================
def create_speed_profile(db: Session, **kwargs):
    profile = models.ActivitySpeedProfile(**kwargs)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def get_speed_profile_by_user(db: Session, user_id: int):
    return (
        db.query(models.ActivitySpeedProfile)
        .filter(models.ActivitySpeedProfile.user_id == user_id)
        .all()
    )


def delete_speed_profile(db: Session, profile_id: int):
    profile = (
        db.query(models.ActivitySpeedProfile)
        .filter(models.ActivitySpeedProfile.profile_id == profile_id)
        .first()
    )
    if profile:
        db.delete(profile)
        db.commit()
    return profile


def get_alpha(data_points_count: int) -> float:
    """
    측정 횟수에 따른 동적 알파값 계산
    
    Args:
        data_points_count: 현재까지 측정된 데이터 포인트 개수
    
    Returns:
        알파값 (새 데이터의 가중치)
    """
    if data_points_count <= 3:
        return 0.50  # 초기: 과감한 반영 (Cold Start 해결)
    elif data_points_count <= 10:
        return 0.40
    elif data_points_count <= 20:
        return 0.30
    elif data_points_count <= 50:
        return 0.20
    else:
        return 0.15  # 장기: 안정화 (노이즈 제거)


def update_speed_profile_with_weighted_avg(
    db: Session,
    user_id: int,
    activity_type: str,
    new_speed_kmh: float,
    weight_old: float = None,
    weight_new: float = None,
    source: str = "navigation_log",
    navigation_log_id: int = None,
):
    """
    가중 평균으로 속도 프로필 업데이트 + 이력 기록
    
    Args:
        db: 데이터베이스 세션
        user_id: 사용자 ID
        activity_type: 활동 유형 ('walking', 'running', 'cycling')
        new_speed_kmh: 새로 측정된 속도 (km/h)
        weight_old: 기존 데이터 가중치 (None이면 동적 계산)
        weight_new: 새 데이터 가중치 (None이면 동적 계산)
        source: 속도 출처 ('navigation_log', 'manual', 'health_connect', 'initial')
        navigation_log_id: 네비게이션 로그 ID (있는 경우)
    
    Returns:
        업데이트된 ActivitySpeedProfile 객체
    """
    from datetime import datetime
    
    # 기존 프로필 조회
    profile = (
        db.query(models.ActivitySpeedProfile)
        .filter(
            models.ActivitySpeedProfile.user_id == user_id,
            models.ActivitySpeedProfile.activity_type == activity_type,
        )
        .first()
    )
    
    if profile:
        # 동적 알파값 계산 (weight_new, weight_old가 None인 경우)
        if weight_new is None:
            alpha = get_alpha(profile.data_points_count)
            weight_new = alpha
            weight_old = 1.0 - alpha
        
        # 기존 프로필 있음 - 가중 평균 계산
        old_speed = float(profile.speed_case1 or 4.0)
        updated_speed = old_speed * weight_old + new_speed_kmh * weight_new
        
        profile.speed_case1 = round(updated_speed, 2)
        # Case2도 자동 업데이트 (비율 유지)
        profile.speed_case2 = round(updated_speed * SLOW_WALK_SPEED_RATIO, 2)
        profile.data_points_count += 1
        
        # 이력 추가
        history_entry = {
            "speed_kmh": round(new_speed_kmh, 2),
            "source": source,
            "timestamp": datetime.now().isoformat(),
            "navigation_log_id": navigation_log_id,
            "old_avg": round(old_speed, 2),
            "new_avg": round(updated_speed, 2),
            "alpha": round(weight_new, 2),  # 적용된 알파값 기록
            "data_points": profile.data_points_count + 1
        }
        
        # JSONB 배열에 추가 (최근 100개만 유지)
        current_history = profile.speed_history or []
        if isinstance(current_history, str):
            import json
            current_history = json.loads(current_history)
        
        current_history.append(history_entry)
        profile.speed_history = current_history[-100:]  # 최근 100개만 유지
        
        # SQLAlchemy에게 JSONB 변경 알림
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(profile, "speed_history")
        
    else:
        # 기존 프로필 없음 - 새로 생성
        history_entry = {
            "speed_kmh": round(new_speed_kmh, 2),
            "source": source,
            "timestamp": datetime.now().isoformat(),
            "navigation_log_id": navigation_log_id,
            "old_avg": None,
            "new_avg": round(new_speed_kmh, 2),
            "alpha": 1.0,  # 첫 데이터는 100% 반영
            "data_points": 1
        }
        
        profile = models.ActivitySpeedProfile(
            user_id=user_id,
            activity_type=activity_type,
            speed_case1=round(new_speed_kmh, 2),
            speed_case2=round(new_speed_kmh * SLOW_WALK_SPEED_RATIO, 2),
            data_points_count=1,
            speed_history=[history_entry]
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    return profile


# ================================
# 5. USER_PREFERENCES
# ================================
def create_user_preferences(db: Session, **kwargs):
    pref = models.UserPreferences(**kwargs)
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def get_preferences_by_user(db: Session, user_id: int):
    return (
        db.query(models.UserPreferences)
        .filter(models.UserPreferences.user_id == user_id)
        .first()
    )


def update_user_preferences(db: Session, user_id: int, **kwargs):
    pref = get_preferences_by_user(db, user_id)
    if pref:
        for key, value in kwargs.items():
            setattr(pref, key, value)
        db.commit()
        db.refresh(pref)
    return pref


# ================================
# 6. ROUTES
# ================================
def create_route(db: Session, **kwargs):
    route = models.Routes(**kwargs)
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


def get_route_by_id(db: Session, route_id: int):
    return db.query(models.Routes).filter(models.Routes.route_id == route_id).first()


def get_all_routes(db: Session):
    return db.query(models.Routes).all()


def delete_route(db: Session, route_id: int):
    route = get_route_by_id(db, route_id)
    if route:
        db.delete(route)
        db.commit()
    return route


# ================================
# 7. ROUTE_SEGMENTS
# ================================
def create_route_segment(db: Session, **kwargs):
    segment = models.RouteSegments(**kwargs)
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment


def get_segments_by_route(db: Session, route_id: int):
    return (
        db.query(models.RouteSegments)
        .filter(models.RouteSegments.route_id == route_id)
        .all()
    )


# ================================
# 8. ROUTE_SEARCH_HISTORY
# ================================
def create_route_search(db: Session, **kwargs):
    search = models.RouteSearchHistory(**kwargs)
    db.add(search)
    db.commit()
    db.refresh(search)
    return search


def get_search_by_user(db: Session, user_id: int):
    return (
        db.query(models.RouteSearchHistory)
        .filter(models.RouteSearchHistory.user_id == user_id)
        .all()
    )


# ================================
# 9. SEARCH_ROUTE_SEGMENTS
# ================================
def create_search_segment(db: Session, **kwargs):
    seg = models.SearchRouteSegments(**kwargs)
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


def get_segments_by_search(db: Session, search_id: int):
    return (
        db.query(models.SearchRouteSegments)
        .filter(models.SearchRouteSegments.search_id == search_id)
        .all()
    )


# ================================
# 10. FAVORITE_ROUTES
# ================================
def add_favorite_route(db: Session, **kwargs):
    fav = models.FavoriteRoutes(**kwargs)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


def get_favorites_by_user(db: Session, user_id: int):
    return (
        db.query(models.FavoriteRoutes)
        .filter(models.FavoriteRoutes.user_id == user_id)
        .all()
    )


def remove_favorite_route(db: Session, user_id: int, route_id: int):
    fav = (
        db.query(models.FavoriteRoutes)
        .filter(
            models.FavoriteRoutes.user_id == user_id,
            models.FavoriteRoutes.route_id == route_id,
        )
        .first()
    )
    if fav:
        db.delete(fav)
        db.commit()
    return fav


# ================================
# 11. ROUTE_RATINGS
# ================================
def create_route_rating(db: Session, **kwargs):
    rating = models.RouteRatings(**kwargs)
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


def get_ratings_by_route(db: Session, route_id: int):
    return (
        db.query(models.RouteRatings)
        .filter(models.RouteRatings.route_id == route_id)
        .all()
    )


def get_user_rating_for_route(db: Session, user_id: int, route_id: int):
    return (
        db.query(models.RouteRatings)
        .filter(
            models.RouteRatings.user_id == user_id,
            models.RouteRatings.route_id == route_id,
        )
        .first()
    )


# ================================
# 12. SPEED_HISTORY
# ================================
def create_speed_history(db: Session, **kwargs):
    """속도 이력 기록 생성"""
    history = models.SpeedHistory(**kwargs)
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def get_speed_history_by_user(
    db: Session,
    user_id: int,
    activity_type: str = "walking",
    limit: int = 100
):
    """사용자의 속도 이력 조회 (최신순)"""
    return (
        db.query(models.SpeedHistory)
        .filter(
            models.SpeedHistory.user_id == user_id,
            models.SpeedHistory.activity_type == activity_type
        )
        .order_by(models.SpeedHistory.recorded_at.desc())
        .limit(limit)
        .all()
    )
