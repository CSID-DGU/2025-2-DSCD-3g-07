"""
하이브리드 방식 실제 보행속도 측정 테스트
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def test_navigation_log_with_movement_tracking():
    """
    실제 보행속도 측정 데이터를 포함한 네비게이션 로그 저장 테스트
    """
    print("\n" + "="*60)
    print("📊 하이브리드 방식 실제 보행속도 측정 테스트")
    print("="*60)
    
    # 테스트 데이터 준비
    start_time = datetime.now() - timedelta(minutes=15)
    end_time = datetime.now()
    
    # 시뮬레이션된 움직임 구간 데이터
    movement_segments = [
        {
            "start_time": (start_time).isoformat(),
            "end_time": (start_time + timedelta(minutes=5)).isoformat(),
            "distance_m": 420.5,
            "duration_seconds": 300,
            "avg_speed_ms": 1.40,
            "status": "walking"
        },
        {
            "start_time": (start_time + timedelta(minutes=5)).isoformat(),
            "end_time": (start_time + timedelta(minutes=6, seconds=15)).isoformat(),
            "distance_m": 3.2,
            "duration_seconds": 75,
            "avg_speed_ms": 0.04,
            "status": "paused",
            "reason": "crosswalk"
        },
        {
            "start_time": (start_time + timedelta(minutes=6, seconds=15)).isoformat(),
            "end_time": (start_time + timedelta(minutes=11, seconds=30)).isoformat(),
            "distance_m": 450.8,
            "duration_seconds": 315,
            "avg_speed_ms": 1.43,
            "status": "walking"
        },
        {
            "start_time": (start_time + timedelta(minutes=11, seconds=30)).isoformat(),
            "end_time": (start_time + timedelta(minutes=12, seconds=20)).isoformat(),
            "distance_m": 2.1,
            "duration_seconds": 50,
            "avg_speed_ms": 0.04,
            "status": "paused",
            "reason": "crosswalk"
        },
        {
            "start_time": (start_time + timedelta(minutes=12, seconds=20)).isoformat(),
            "end_time": end_time.isoformat(),
            "distance_m": 238.4,
            "duration_seconds": 160,
            "avg_speed_ms": 1.49,
            "status": "walking"
        }
    ]
    
    # 통계 계산
    walking_segments = [s for s in movement_segments if s["status"] == "walking"]
    paused_segments = [s for s in movement_segments if s["status"] == "paused"]
    
    active_walking_time = sum(s["duration_seconds"] for s in walking_segments)
    paused_time = sum(s["duration_seconds"] for s in paused_segments)
    total_distance = sum(s["distance_m"] for s in walking_segments)
    real_walking_speed_ms = total_distance / active_walking_time if active_walking_time > 0 else 0
    real_walking_speed_kmh = real_walking_speed_ms * 3.6  # m/s를 km/h로 변환
    
    log_data = {
        "route_mode": "walking",
        "start_location": "동국대학교 정문",
        "end_location": "신림역 2번 출구",
        "start_lat": 37.558,
        "start_lon": 126.998,
        "end_lat": 37.484,
        "end_lon": 126.929,
        "total_distance_m": total_distance,
        "crosswalk_count": 2,
        "user_speed_factor": 1.0,
        "slope_factor": 1.05,
        "weather_factor": 0.95,
        "estimated_time_seconds": 720,
        "actual_time_seconds": 900,
        
        # 🆕 하이브리드 방식 실제 보행속도 측정 데이터
        "active_walking_time_seconds": active_walking_time,
        "paused_time_seconds": paused_time,
        "real_walking_speed_kmh": round(real_walking_speed_kmh, 2),
        "pause_count": len(paused_segments),
        "movement_data": {
            "segments": movement_segments,
            "detection_method": "gps_accel_hybrid",
            "total_pauses": len(paused_segments),
            "crosswalk_pauses": sum(1 for s in paused_segments if s.get("reason") == "crosswalk")
        },
        
        "started_at": start_time.isoformat(),
        "ended_at": end_time.isoformat()
    }
    
    print("\n📤 전송할 데이터:")
    print(f"  총 거리: {total_distance:.1f}m")
    print(f"  실제 걷기: {active_walking_time}초 ({active_walking_time // 60}분 {active_walking_time % 60}초)")
    print(f"  대기 시간: {paused_time}초 ({paused_time // 60}분 {paused_time % 60}초)")
    print(f"  실제 속도: {real_walking_speed_kmh:.2f} km/h ({real_walking_speed_ms:.2f} m/s)")
    print(f"  정지 횟수: {len(paused_segments)}회")
    print(f"  움직임 구간: {len(movement_segments)}개")
    
    # API 호출
    try:
        response = requests.post(
            f"{BASE_URL}/api/navigation/logs?user_id=1",
            json=log_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n📥 응답 상태: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("\n✅ 로그 저장 성공!")
            print(f"  로그 ID: {result['log_id']}")
            print(f"  사용자 ID: {result['user_id']}")
            print(f"  경로 모드: {result['route_mode']}")
            print(f"  실제 걷기 시간: {result.get('active_walking_time_seconds')}초")
            print(f"  대기 시간: {result.get('paused_time_seconds')}초")
            print(f"  실제 보행속도: {result.get('real_walking_speed_kmh')} km/h")
            print(f"  정지 횟수: {result.get('pause_count')}회")
            print(f"  시간 차이: {result['time_difference_seconds']}초")
            
            if result.get('movement_data'):
                print(f"  움직임 구간 수: {len(result['movement_data']['segments'])}개")
                print(f"  감지 방법: {result['movement_data']['detection_method']}")
            
            return result
        else:
            print(f"\n❌ 로그 저장 실패")
            print(f"  에러: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ API 호출 실패: {e}")
        return None


def test_retrieve_logs():
    """
    저장된 로그 조회 테스트
    """
    print("\n" + "="*60)
    print("📋 네비게이션 로그 조회 테스트")
    print("="*60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/navigation/logs?user_id=1&limit=5"
        )
        
        print(f"\n📥 응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ 총 {result['total_count']}개의 로그")
            
            for i, log in enumerate(result['logs'][:3], 1):
                print(f"\n  [{i}] 로그 ID: {log['log_id']}")
                print(f"      경로: {log.get('start_location', 'N/A')} → {log.get('end_location', 'N/A')}")
                print(f"      거리: {log['total_distance_m']:.1f}m")
                print(f"      예상 시간: {log['estimated_time_seconds']}초")
                print(f"      실제 시간: {log['actual_time_seconds']}초")
                
                if log.get('active_walking_time_seconds'):
                    print(f"      실제 걷기: {log['active_walking_time_seconds']}초")
                    print(f"      대기 시간: {log.get('paused_time_seconds', 0)}초")
                    print(f"      실제 속도: {log.get('real_walking_speed_kmh')} km/h")
                    print(f"      정지 횟수: {log.get('pause_count', 0)}회")
                
        else:
            print(f"\n❌ 로그 조회 실패: {response.text}")
            
    except Exception as e:
        print(f"\n❌ API 호출 실패: {e}")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🧪 하이브리드 방식 실제 보행속도 측정 시스템 테스트")
    print("="*60)
    
    # 1. 로그 저장 테스트
    saved_log = test_navigation_log_with_movement_tracking()
    
    # 2. 로그 조회 테스트
    if saved_log:
        test_retrieve_logs()
    
    print("\n" + "="*60)
    print("✅ 테스트 완료!")
    print("="*60 + "\n")
