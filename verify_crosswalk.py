"""
횡단보도 계산 검증 스크립트
Transit API 응답을 받아서 analyzeRouteSlope와 동일하게 처리되는지 확인
"""
import json
import os
import sys

# backend 폴더를 경로에 추가
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

# backend 폴더로 작업 디렉토리 변경 (CSV 파일 접근용)
os.chdir(backend_path)

from app.utils.crosswalk_helpers import crosswalk_waiting_time

# Transit API 응답 로드
json_path = os.path.join(os.path.dirname(__file__), 'transit_response.json')
with open(json_path, 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

itineraries = data.get("metaData", {}).get("plan", {}).get("itineraries", [])

if not itineraries:
    print("❌ 경로가 없습니다!")
    exit(1)

first_itinerary = itineraries[0]

print("=" * 70)
print("🚦 횡단보도 계산 검증")
print("=" * 70)

# 1. 횡단보도 계산
crosswalk_result = crosswalk_waiting_time(first_itinerary)

print(f"\n✅ 횡단보도 계산 결과:")
print(f"  - 개수: {crosswalk_result['count']}개")
print(f"  - 총 대기 시간: {crosswalk_result['total_wait_time']}초 ({crosswalk_result['total_wait_time'] // 60}분 {crosswalk_result['total_wait_time'] % 60}초)")

# 2. 각 횡단보도 상세 정보
if crosswalk_result['details']:
    print(f"\n📍 횡단보도 위치:")
    for i, (coords, wait) in enumerate(crosswalk_result['details'], 1):
        lat1, lng1, lat2, lng2 = coords
        print(f"  {i}. ({lat1:.5f}, {lng1:.5f}) → ({lat2:.5f}, {lng2:.5f})")
        print(f"     대기시간: {wait}초")

# 3. 원본 시간 정보
original_time = first_itinerary.get("totalTime", 0)
original_walk_time = first_itinerary.get("totalWalkTime", 0)

print(f"\n⏱️ 시간 정보:")
print(f"  - 원본 총 시간: {original_time}초 ({original_time // 60}분)")
print(f"  - 원본 도보 시간: {original_walk_time}초 ({original_walk_time // 60}분)")
print(f"  - 횡단보도 포함 최종 보정 시간: {original_time + crosswalk_result['total_wait_time']}초 ({(original_time + crosswalk_result['total_wait_time']) // 60}분)")
print(f"  - 횡단보도 포함 도보 시간: {original_walk_time + crosswalk_result['total_wait_time']}초 ({(original_walk_time + crosswalk_result['total_wait_time']) // 60}분)")

# 4. 도보 구간 확인
walk_legs = [leg for leg in first_itinerary.get("legs", []) if leg.get("mode") == "WALK"]
print(f"\n🚶 도보 구간: {len(walk_legs)}개")
for i, leg in enumerate(walk_legs, 1):
    steps = leg.get("steps", [])
    crosswalk_steps = [s for s in steps if "횡단보도" in s.get("description", "")]
    print(f"  {i}. {leg.get('start', {}).get('name', '?')} → {leg.get('end', {}).get('name', '?')}")
    print(f"     - Steps: {len(steps)}개")
    print(f"     - 횡단보도 포함 steps: {len(crosswalk_steps)}개")
    for step in crosswalk_steps:
        print(f"       • {step.get('description', '')}")

print("\n" + "=" * 70)
print("✅ 검증 완료!")
print("=" * 70)
