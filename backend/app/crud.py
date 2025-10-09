# DB 조작 함수: Create, Read, Update, Delete
# 초안만 일단
# CRUD는 백엔드 개발 중 언제든지 수정될 수 있음

# app/crud.py
from sqlalchemy.orm import Session
from app import models

# ================================
# 1. USERS
# ================================
def create_user(db: Session, username: str, email: str, password_hash: str, auth_provider: str = "local"):
    new_user = models.Users(
        username=username,
        email=email,
        password_hash=password_hash,
        auth_provider=auth_provider
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.Users).filter(models.Users.user_id == user_id).first()

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
    return db.query(models.WeatherCache).filter(models.WeatherCache.weather_id == weather_id).first()

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
    return db.query(models.HealthData).filter(models.HealthData.health_data_id == health_data_id).first()

def get_user_health_data(db: Session, user_id: int):
    return db.query(models.HealthData).filter(models.HealthData.user_id == user_id).all()

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
    return db.query(models.ActivitySpeedProfile).filter(models.ActivitySpeedProfile.user_id == user_id).all()

def delete_speed_profile(db: Session, profile_id: int):
    profile = db.query(models.ActivitySpeedProfile).filter(models.ActivitySpeedProfile.profile_id == profile_id).first()
    if profile:
        db.delete(profile)
        db.commit()
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
    return db.query(models.UserPreferences).filter(models.UserPreferences.user_id == user_id).first()

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
    return db.query(models.RouteSegments).filter(models.RouteSegments.route_id == route_id).all()


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
    return db.query(models.RouteSearchHistory).filter(models.RouteSearchHistory.user_id == user_id).all()


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
    return db.query(models.SearchRouteSegments).filter(models.SearchRouteSegments.search_id == search_id).all()


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
    return db.query(models.FavoriteRoutes).filter(models.FavoriteRoutes.user_id == user_id).all()

def remove_favorite_route(db: Session, user_id: int, route_id: int):
    fav = db.query(models.FavoriteRoutes).filter(
        models.FavoriteRoutes.user_id == user_id,
        models.FavoriteRoutes.route_id == route_id
    ).first()
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
    return db.query(models.RouteRatings).filter(models.RouteRatings.route_id == route_id).all()

def get_user_rating_for_route(db: Session, user_id: int, route_id: int):
    return db.query(models.RouteRatings).filter(
        models.RouteRatings.user_id == user_id,
        models.RouteRatings.route_id == route_id
    ).first()


