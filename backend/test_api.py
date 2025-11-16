"""
API 테스트 스크립트
"""
import requests

url = "http://localhost:8000/api/routes/recommend"
params = {
    "distance_km": 5,
    "user_lat": 37.5591857,
    "user_lng": 126.9040323,
    "max_distance_from_user": 20,
    "limit": 10
}

print(f"🔍 요청 URL: {url}")
print(f"📦 파라미터: {params}\n")

try:
    response = requests.get(url, params=params)
    print(f"✅ Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 응답 성공!")
        print(f"📊 추천 경로 개수: {len(data.get('recommended_routes', []))}")
        
        for i, route in enumerate(data.get('recommended_routes', [])[:3], 1):
            print(f"\n{i}. {route.get('route_name')}")
            print(f"   - 거리: {route.get('distance_km')} km")
            print(f"   - 소요시간: {route.get('estimated_duration_minutes')} 분")
            print(f"   - 난이도: {route.get('difficulty_level')}")
            print(f"   - 사용자 거리: {route.get('distance_from_user')} km")
    else:
        print(f"❌ 에러 발생!")
        print(f"응답 내용: {response.text}")
        
except Exception as e:
    print(f"❌ 예외 발생: {e}")
    import traceback
    traceback.print_exc()
