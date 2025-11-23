from sqlalchemy import inspect
from app.database import engine

insp = inspect(engine)
columns = insp.get_columns('activity_speed_profile')
print('Current column order:')
for i, col in enumerate(columns, 1):
    print(f'  {i}. {col["name"]}')
