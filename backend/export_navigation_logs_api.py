"""
EC2 서버 API를 통해 Navigation Logs를 CSV로 내보내기

API 엔드포인트를 사용하여 모든 사용자의 navigation_logs를 수집합니다.
"""

import requests
import csv
import json
from datetime import datetime

# EC2 서버 API URL
BASE_URL = "http://3.36.70.73:8000"

# 출력 파일
output_file = f"navigation_logs_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

# CSV 헤더 (NavigationLogResponse 스키마 기반) - route_data, movement_data 제외
headers = [
    "log_id", "user_id", "route_mode", "start_location", "end_location",
    "start_lat", "start_lon", "end_lat", "end_lon",
    "total_distance_m", "walking_distance_m", "transport_modes", "crosswalk_count",
    "user_speed_factor", "slope_factor", "weather_factor",
    "estimated_time_seconds", "actual_time_seconds", "time_difference_seconds", "accuracy_percent",
    "estimated_walk_time_seconds", "walk_time_difference_seconds", "walk_accuracy_percent",
    "active_walking_time_seconds", "paused_time_seconds", "real_walking_speed_kmh", "pause_count",
    "weather_id",
    "started_at", "ended_at", "created_at"
]

all_logs = []

print("📊 EC2 서버에서 Navigation Logs 수집 중...")

# 여러 user_id를 시도 (1~100)
for user_id in range(1, 101):
    try:
        response = requests.get(
            f"{BASE_URL}/api/navigation/logs",
            params={"user_id": user_id, "limit": 100},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("total_count", 0) > 0:
                logs = data.get("logs", [])
                all_logs.extend(logs)
                print(f"  ✅ user_id={user_id}: {len(logs)}개 로그 발견")
        elif response.status_code == 404:
            # 사용자 없음 - 무시
            pass
        else:
            print(f"  ⚠️ user_id={user_id}: HTTP {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"  ❌ user_id={user_id}: 요청 실패 - {e}")
        break

print(f"\n📊 총 {len(all_logs)}개의 로그를 수집했습니다.")

if len(all_logs) > 0:
    # log_id가 정수가 아닌 로그 필터링
    valid_logs = []
    skipped_count = 0
    for log in all_logs:
        log_id = log.get("log_id")
        if log_id is not None and isinstance(log_id, int):
            valid_logs.append(log)
        else:
            skipped_count += 1
            print(f"  ⚠️ 스킵: log_id={log_id} (정수 아님)")
    
    if skipped_count > 0:
        print(f"⚠️ {skipped_count}개의 잘못된 log_id 레코드 제외됨")
    
    # CSV로 저장
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore')
        writer.writeheader()
        
        for log in valid_logs:
            # 복사본 생성하여 원본 데이터 보존
            row = log.copy()
            
            # 긴 JSON 필드 제거 (CSV 파싱 문제 방지)
            row.pop("movement_data", None)
            row.pop("route_data", None)
            
            # transport_modes는 간단하므로 유지
            if row.get("transport_modes"):
                row["transport_modes"] = json.dumps(row["transport_modes"], ensure_ascii=False)
            
            writer.writerow(row)
    
    print(f"✅ CSV 파일 저장 완료: {output_file} ({len(valid_logs)}개 레코드)")
else:
    print("⚠️ 수집된 데이터가 없습니다.")
