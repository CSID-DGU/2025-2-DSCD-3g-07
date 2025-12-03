"""AWS DB 테이블 목록 확인"""
from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

print('=== AWS DB 테이블 목록 ===')
for t in sorted(tables):
    print(f'  - {t}')

print(f'\n총 {len(tables)}개 테이블')

# 횡단보도 관련 테이블 검색
crosswalk_tables = [t for t in tables if 'crosswalk' in t.lower() or 'signal' in t.lower() or 'traffic' in t.lower()]
print(f'\n횡단보도 관련 테이블: {crosswalk_tables if crosswalk_tables else "없음"}')
