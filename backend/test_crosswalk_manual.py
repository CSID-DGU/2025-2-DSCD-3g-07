"""
횡단보도 계산 테스트 - 실제 API 응답 데이터로 테스트
"""
import json
from app.utils.crosswalk_helpers import crosswalk_waiting_time

# JSON 파일에서 실제 API 응답 로드
with open('../transit_response.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

itineraries = data.get("metaData", {}).get("plan", {}).get("itineraries", [])

if not itineraries:
    print("❌ 경로가 없습니다!")
    exit(1)

first_itinerary = itineraries[0]

print("=" * 60)
print("횡단보도 계산 테스트 - 실제 API 응답")
print("=" * 60)

result = crosswalk_waiting_time(first_itinerary)

print(f"\n✅ 결과:")
print(f"  - 횡단보도 개수: {result['count']}개")
print(f"  - 총 대기 시간: {result['total_wait_time']}초 ({result['total_wait_time'] // 60}분 {result['total_wait_time'] % 60}초)")
print(f"\n📋 상세:")
for i, (coords, wait) in enumerate(result['details'], 1):
    print(f"  {i}. 위치: {coords}, 대기시간: {wait}초")

# 원본 시간 정보
original_time = first_itinerary.get("totalTime", 0)
original_walk_time = first_itinerary.get("totalWalkTime", 0)

print(f"\n⏱️ 시간 정보:")
print(f"  - 원본 총 시간: {original_time}초 ({original_time // 60}분)")
print(f"  - 원본 도보 시간: {original_walk_time}초 ({original_walk_time // 60}분)")
if result['total_wait_time'] > 0:
    print(f"  - 횡단보도 포함 최종 보정 시간: {original_time + result['total_wait_time']}초 ({(original_time + result['total_wait_time']) // 60}분 {(original_time + result['total_wait_time']) % 60}초)")
    print(f"  - 횡단보도 포함 도보 시간: {original_walk_time + result['total_wait_time']}초 ({(original_walk_time + result['total_wait_time']) // 60}분 {(original_walk_time + result['total_wait_time']) % 60}초)")

print("\n" + "=" * 60)
print("횡단보도가 포함된 Step 확인")
print("=" * 60)
for leg_idx, leg in enumerate(first_itinerary['legs']):
    if leg.get('mode') != 'WALK':
        continue
    print(f"\nLeg {leg_idx} (WALK): {leg.get('start', {}).get('name', '?')} → {leg.get('end', {}).get('name', '?')}")
    steps = leg.get('steps', [])
    if not steps:
        print("  ⚠️ steps가 없습니다")
        continue
    for step_idx, step in enumerate(steps):
        desc = step.get('description', '')
        if '횡단보도' in desc:
            print(f"  Step {step_idx}: {desc}")
            linestring = step.get('linestring', '')
            if linestring:
                coords = linestring.split()
                print(f"    좌표 개수: {len(coords)}")
                if len(coords) >= 2:
                    print(f"    시작: {coords[0]}")
                    print(f"    끝: {coords[-1]}")
