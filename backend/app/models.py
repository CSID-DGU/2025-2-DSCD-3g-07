# app/models.py
from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeEngine

from app.database import Base

# PostgreSQL에서는 JSONB, SQLite에서는 JSON 사용
try:
    from sqlalchemy.dialects.postgresql import JSONB

    JSONType: type[TypeEngine] = JSONB  # type: ignore[assignment]
except ImportError:
    JSONType = JSON  # type: ignore[assignment]


# 1) users
class Users(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    auth_provider = Column(
        String(20)
    )  # CHECK는 DB에 존재, 애플리케이션에서 값 제한 권장
    created_at = Column(DateTime, server_default=func.current_timestamp())
    last_login = Column(DateTime)

    # relationships
    health_data = relationship(
        "HealthData", back_populates="user", cascade="all, delete-orphan"
    )
    speed_profiles = relationship(
        "ActivitySpeedProfile", back_populates="user", cascade="all, delete-orphan"
    )
    preferences = relationship(
        "UserPreferences",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
    )
    route_search_history = relationship(
        "RouteSearchHistory", back_populates="user", cascade="all, delete-orphan"
    )
    favorite_routes = relationship(
        "FavoriteRoutes", back_populates="user", cascade="all, delete-orphan"
    )
    route_ratings = relationship(
        "RouteRatings", back_populates="user", cascade="all, delete-orphan"
    )


# 2) weather_cache
class WeatherCache(Base):
    __tablename__ = "weather_cache"

    weather_id = Column(Integer, primary_key=True)
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    location_name = Column(String(100))
    weather_time = Column(DateTime, nullable=False)
    temperature_celsius = Column(Numeric(4, 1))
    humidity_percent = Column(Integer)
    wind_speed_ms = Column(Numeric(4, 1))
    weather_condition = Column(String(20))
    precipitation_mm = Column(Integer)
    air_quality_index = Column(Integer)
    data_source = Column(String(20), server_default="KMA_API")
    cached_at = Column(DateTime, server_default=func.current_timestamp())

    __table_args__ = (
        Index("idx_weather_location_time", "latitude", "longitude", "weather_time"),
        Index("idx_weather_cached_at", "cached_at"),
    )


# 3) health_data
class HealthData(Base):
    __tablename__ = "health_data"

    health_data_id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    record_date = Column(Date, nullable=False, index=True)
    daily_steps = Column(Integer)
    daily_distance_km = Column(Numeric(6, 2))
    active_minutes = Column(Integer)
    running_distance_km = Column(Numeric(6, 2))
    running_duration_minutes = Column(Integer)
    elevation_gain_m = Column(Numeric(7, 2), server_default="0")
    elevation_loss_m = Column(Numeric(7, 2), server_default="0")
    data_source = Column(String(20))
    weather_id = Column(
        Integer, ForeignKey("weather_cache.weather_id", ondelete="SET NULL")
    )
    created_at = Column(DateTime, server_default=func.current_timestamp())

    __table_args__ = (
        UniqueConstraint("user_id", "record_date", name="uq_health_user_date"),
        Index("idx_health_user_date", "user_id", "record_date"),
        Index("idx_health_date", "record_date"),
    )

    user = relationship("Users", back_populates="health_data")
    weather = relationship("WeatherCache")


# 4) activity_speed_profile
class ActivitySpeedProfile(Base):
    __tablename__ = "activity_speed_profile"

    profile_id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_type = Column(String(20), nullable=False)  # walking/running/cycling
    avg_speed_flat_kmh = Column(Numeric(4, 2))
    avg_speed_uphill_kmh = Column(Numeric(4, 2))
    avg_speed_downhill_kmh = Column(Numeric(4, 2))
    max_speed_kmh = Column(Numeric(4, 2))
    min_speed_kmh = Column(Numeric(4, 2))
    speed_variance = Column(Numeric(4, 2))
    confidence_score = Column(Numeric(3, 2))
    data_points_count = Column(Integer, server_default="0")
    last_updated = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    created_at = Column(DateTime, server_default=func.current_timestamp())

    __table_args__ = (
        UniqueConstraint("user_id", "activity_type", name="uq_speed_user_activity"),
        Index("idx_speed_profile_user_activity", "user_id", "activity_type"),
    )

    user = relationship("Users", back_populates="speed_profiles")


# 5) user_preferences
class UserPreferences(Base):
    __tablename__ = "user_preferences"

    preference_id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    preferred_distance_km = Column(Numeric(5, 2))
    preferred_duration_minutes = Column(Integer)
    preferred_terrain = Column(String(20))
    max_elevation_gain_m = Column(Numeric(6, 2))
    avoid_stairs = Column(Boolean, server_default="false")
    prefer_scenic_routes = Column(Boolean, server_default="false")
    preferred_areas = Column(JSONType)
    weather_preferences = Column(JSONType)
    updated_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    user = relationship("Users", back_populates="preferences")


# 6) routes
class Routes(Base):
    __tablename__ = "routes"

    route_id = Column(Integer, primary_key=True)
    route_name = Column(String(200), nullable=False)
    route_type = Column(String(20))
    distance_km = Column(Numeric(6, 2), nullable=False)
    estimated_duration_minutes = Column(Integer)
    total_elevation_gain_m = Column(Numeric(7, 2), server_default="0")
    total_elevation_loss_m = Column(Numeric(7, 2), server_default="0")
    max_elevation_m = Column(Numeric(6, 2))
    min_elevation_m = Column(Numeric(6, 2))
    difficulty_level = Column(String(20))
    route_coordinates = Column(JSONType, nullable=False)
    source = Column(String(30))
    external_id = Column(String(100))
    avg_rating = Column(Numeric(2, 1))
    rating_count = Column(Integer, server_default="0")
    tags = Column(JSONType)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    __table_args__ = (
        Index("idx_routes_type", "route_type"),
        Index("idx_routes_difficulty", "difficulty_level"),
        Index("idx_routes_distance", "distance_km"),
        Index("idx_routes_source", "source", "external_id"),
    )

    segments = relationship(
        "RouteSegments", back_populates="route", cascade="all, delete-orphan"
    )
    favorites = relationship(
        "FavoriteRoutes", back_populates="route", cascade="all, delete-orphan"
    )
    ratings = relationship(
        "RouteRatings", back_populates="route", cascade="all, delete-orphan"
    )


# 7) route_segments
class RouteSegments(Base):
    __tablename__ = "route_segments"

    segment_id = Column(Integer, primary_key=True)
    route_id = Column(
        Integer,
        ForeignKey("routes.route_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    segment_order = Column(Integer, nullable=False)
    start_lat = Column(Numeric(9, 6), nullable=False)
    start_lon = Column(Numeric(9, 6), nullable=False)
    end_lat = Column(Numeric(9, 6), nullable=False)
    end_lon = Column(Numeric(9, 6), nullable=False)
    segment_distance_m = Column(Numeric(7, 2), nullable=False)
    segment_grade_percent = Column(Numeric(5, 2))
    elevation_change_m = Column(Numeric(6, 2))
    start_elevation_m = Column(Numeric(6, 2))
    end_elevation_m = Column(Numeric(6, 2))
    terrain_type = Column(String(20))

    __table_args__ = (
        UniqueConstraint("route_id", "segment_order", name="uq_route_seg_order"),
        Index("idx_segments_route", "route_id", "segment_order"),
        Index("idx_segments_terrain", "terrain_type"),
    )

    route = relationship("Routes", back_populates="segments")


# 8) route_search_history
class RouteSearchHistory(Base):
    __tablename__ = "route_search_history"

    search_id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_location = Column(String(200))
    end_location = Column(String(200))
    start_lat = Column(Numeric(9, 6), nullable=False)
    start_lon = Column(Numeric(9, 6), nullable=False)
    end_lat = Column(Numeric(9, 6), nullable=False)
    end_lon = Column(Numeric(9, 6), nullable=False)
    estimated_time_minutes = Column(Numeric(6, 2))
    flat_terrain_time_minutes = Column(Numeric(6, 2))
    distance_km = Column(Numeric(6, 2))
    total_elevation_gain_m = Column(Numeric(7, 2))
    total_elevation_loss_m = Column(Numeric(7, 2))
    route_type = Column(String(20))
    weather_id = Column(
        Integer, ForeignKey("weather_cache.weather_id", ondelete="SET NULL")
    )
    searched_at = Column(DateTime, server_default=func.current_timestamp())

    __table_args__ = (
        Index("idx_search_user_time", "user_id", "searched_at"),
        Index("idx_search_locations", "start_lat", "start_lon", "end_lat", "end_lon"),
    )

    user = relationship("Users", back_populates="route_search_history")
    weather = relationship("WeatherCache")
    segments = relationship(
        "SearchRouteSegments", back_populates="search", cascade="all, delete-orphan"
    )


# 9) search_route_segments
class SearchRouteSegments(Base):
    __tablename__ = "search_route_segments"

    search_segment_id = Column(Integer, primary_key=True)
    search_id = Column(
        Integer,
        ForeignKey("route_search_history.search_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    segment_order = Column(Integer, nullable=False)
    route_segment_id = Column(
        Integer, ForeignKey("route_segments.segment_id", ondelete="SET NULL")
    )
    segment_distance_m = Column(Numeric(7, 2), nullable=False)
    segment_grade_percent = Column(Numeric(5, 2))
    segment_elevation_change_m = Column(Numeric(6, 2))
    estimated_segment_time_seconds = Column(Integer)
    terrain_type = Column(String(20))

    __table_args__ = (
        UniqueConstraint("search_id", "segment_order", name="uq_search_seg_order"),
        Index("idx_search_segments_search", "search_id", "segment_order"),
    )

    search = relationship("RouteSearchHistory", back_populates="segments")
    route_segment = relationship("RouteSegments")


# 10) favorite_routes
class FavoriteRoutes(Base):
    __tablename__ = "favorite_routes"

    favorite_id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    route_id = Column(
        Integer,
        ForeignKey("routes.route_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    saved_at = Column(DateTime, server_default=func.current_timestamp())
    notes = Column(Text)

    __table_args__ = (
        UniqueConstraint("user_id", "route_id", name="uq_favorite_user_route"),
        Index("idx_favorites_user", "user_id"),
    )

    user = relationship("Users", back_populates="favorite_routes")
    route = relationship("Routes", back_populates="favorites")


# 11) route_ratings
class RouteRatings(Base):
    __tablename__ = "route_ratings"

    rating_id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    route_id = Column(
        Integer,
        ForeignKey("routes.route_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating = Column(Integer, nullable=False)
    review_text = Column(Text)
    rating_factors = Column(JSONType)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    __table_args__ = (
        UniqueConstraint("user_id", "route_id", name="uq_rating_user_route"),
        Index("idx_ratings_route", "route_id"),
        Index("idx_ratings_user", "user_id"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_rating_range"),
    )

    user = relationship("Users", back_populates="route_ratings")
    route = relationship("Routes", back_populates="ratings")
