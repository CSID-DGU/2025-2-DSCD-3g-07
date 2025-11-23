"""
Remove unused speed profile columns migration script
Removes: avg_speed_downhill_kmh, max_speed_kmh, min_speed_kmh, speed_variance, confidence_score
"""

import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine


def upgrade():
    """Remove unused columns from activity_speed_profile table"""
    with engine.connect() as conn:
        # Remove columns one by one
        columns_to_remove = [
            'avg_speed_downhill_kmh',
            'max_speed_kmh',
            'min_speed_kmh',
            'speed_variance',
            'confidence_score'
        ]
        
        for column in columns_to_remove:
            try:
                conn.execute(text(f"""
                    ALTER TABLE activity_speed_profile 
                    DROP COLUMN IF EXISTS {column}
                """))
                print(f"✓ Dropped column: {column}")
            except Exception as e:
                print(f"✗ Error dropping {column}: {e}")
        
        conn.commit()
        print("\n✅ Migration completed: Removed unused speed columns")


def downgrade():
    """Restore removed columns (with NULL values)"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE activity_speed_profile 
            ADD COLUMN IF NOT EXISTS avg_speed_downhill_kmh NUMERIC(4, 2),
            ADD COLUMN IF NOT EXISTS max_speed_kmh NUMERIC(4, 2),
            ADD COLUMN IF NOT EXISTS min_speed_kmh NUMERIC(4, 2),
            ADD COLUMN IF NOT EXISTS speed_variance NUMERIC(6, 4),
            ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3, 2)
        """))
        conn.commit()
        print("✅ Rollback completed: Restored columns")


if __name__ == "__main__":
    print("Starting migration: Remove unused speed columns")
    print("=" * 60)
    upgrade()
