from app.database import SessionLocal
from app.models import ActivitySpeedProfile

db = SessionLocal()

# 모든 프로필 조회
profiles = db.query(ActivitySpeedProfile).all()

print(f"Total records: {len(profiles)}\n")
print("=" * 70)

for profile in profiles:
    print(f"Profile ID: {profile.profile_id}")
    print(f"  User ID: {profile.user_id}")
    print(f"  Activity: {profile.activity_type}")
    print(f"  speed_case1: {profile.speed_case1} km/h")
    print(f"  speed_case2: {profile.speed_case2} km/h")
    print(f"  Data points: {profile.data_points_count}")
    print(f"  Last updated: {profile.last_updated}")
    print("-" * 70)

db.close()
