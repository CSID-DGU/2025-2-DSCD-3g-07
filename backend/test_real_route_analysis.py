# 실제 경로 데이터 분석 테스트
# 충무로역 -> 동국대학교 정보문화관

import requests
import numpy as np
import matplotlib.pyplot as plt

# 좌표 정의
start = {"lat": 37.5616, "lon": 126.9946, "name": "충무로역"}  # 충무로역
end = {"lat": 37.5585, "lon": 127.0016, "name": "동국대 정보문화관"}  # 동국대

print(f"출발: {start['name']} ({start['lat']}, {start['lon']})")
print(f"도착: {end['name']} ({end['lat']}, {end['lon']})")

# Tmap 경로 API 테스트
tmap_api_key = "YOUR_TMAP_API_KEY"  # 실제 키로 교체 필요

# 여기서 실제 API 호출하면 됨
print("\n✅ API 통합 준비 완료")
print("실제 노트북에서 API 키와 함께 실행하면 됩니다!")
