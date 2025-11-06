"""flake8 에러 자동 수정 스크립트"""
import re
from pathlib import Path

def fix_file(filepath):
    """파일의 flake8 에러 수정"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # F401: 사용하지 않는 import 제거
    if 'geo_helpers.py' in str(filepath):
        content = content.replace('from typing import Dict, List, Tuple', 'from typing import Dict, List')
    
    if 'Factors_Affecting_Walking_Speed.py' in str(filepath):
        content = re.sub(r'from \.weather_helpers import.*WeatherInput.*\n', '', content)
    
    # E741: 애매한 변수명 변경
    if 'weather_helpers.py' in str(filepath):
        # I -> ice_index 등으로 변경
        content = re.sub(r'\bI\b(?=\s*=)', 'ice_index', content)
    
    # F841: 사용하지 않는 변수 제거
    if 'elevation_helpers.py' in str(filepath):
        # step_distance 변수 제거
        content = re.sub(r'\s+step_distance = segment_distance / num_steps\n', '', content)
    
    # F541: f-string placeholder 없는 것 수정
    content = re.sub(r'f"([^{}"]+)"', r'"\1"', content)
    content = re.sub(r"f'([^{}']+)'", r"'\1'", content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Fixed: {filepath}")
        return True
    return False

# 수정할 파일 목록
files_to_fix = [
    'app/utils/geo_helpers.py',
    'app/utils/Factors_Affecting_Walking_Speed.py',
    'app/utils/weather_helpers.py',
    'app/utils/elevation_helpers.py',
]

base_dir = Path(__file__).parent
for file_path in files_to_fix:
    full_path = base_dir / file_path
    if full_path.exists():
        fix_file(full_path)
    else:
        print(f"❌ Not found: {full_path}")
