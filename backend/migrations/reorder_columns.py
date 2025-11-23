"""
Recreate activity_speed_profile table with correct column order
"""
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine

def recreate_table():
    with engine.connect() as conn:
        # Backup data
        conn.execute(text("""
            CREATE TABLE activity_speed_profile_backup AS 
            SELECT * FROM activity_speed_profile
        """))
        print("✓ Data backed up to activity_speed_profile_backup")
        
        # Drop original table
        conn.execute(text("DROP TABLE activity_speed_profile"))
        print("✓ Dropped original table")
        
        # Recreate with correct column order
        conn.execute(text("""
            CREATE TABLE activity_speed_profile (
                profile_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                activity_type VARCHAR(50) NOT NULL DEFAULT 'walking',
                avg_speed_flat_kmh NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
                avg_speed_slow_walk_kmh NUMERIC(4, 2) NOT NULL DEFAULT 3.20,
                data_points_count INTEGER DEFAULT 0,
                last_updated TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                speed_history JSONB,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                UNIQUE (user_id, activity_type)
            )
        """))
        print("✓ Created table with new column order")
        
        # Restore data
        conn.execute(text("""
            INSERT INTO activity_speed_profile 
            (profile_id, user_id, activity_type, avg_speed_flat_kmh, avg_speed_slow_walk_kmh, 
             data_points_count, last_updated, created_at, speed_history)
            SELECT profile_id, user_id, activity_type, avg_speed_flat_kmh, avg_speed_slow_walk_kmh,
                   data_points_count, last_updated, created_at, speed_history
            FROM activity_speed_profile_backup
        """))
        print("✓ Data restored")
        
        # Reset sequence
        conn.execute(text("""
            SELECT setval('activity_speed_profile_profile_id_seq', 
                         (SELECT MAX(profile_id) FROM activity_speed_profile))
        """))
        print("✓ Sequence reset")
        
        # Drop backup table
        conn.execute(text("DROP TABLE activity_speed_profile_backup"))
        print("✓ Backup table dropped")
        
        conn.commit()
        print("\n✅ Table recreated with correct column order")

if __name__ == "__main__":
    recreate_table()
