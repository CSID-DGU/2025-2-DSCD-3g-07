"""
경사도 분석 API 테스트 스크립트
"""
import requests
import json

def test_slope_analysis():
    url = "http://172.16.100.102:8000/api/routes/analyze-slope"
    
    # 간단한 테스트 데이터
    test_data = {
        "itinerary": {
            "legs": [
                {
                    "mode": "WALK",
                    "sectionTime": 300,
                    "distance": 400,
                    "start": {
                        "name": "동국대 본관",
                        "lon": 127.00020089028668,
                        "lat": 37.55826891774226
                    },
                    "end": {
                        "name": "근처",
                        "lon": 127.00120089028668,
                        "lat": 37.55926891774226
                    },
                    "steps": [
                        {
                            "distance": 200,
                            "linestring": "127.00020089028668,37.55826891774226 127.00070089028668,37.55876891774226"
                        },
                        {
                            "distance": 200,
                            "linestring": "127.00070089028668,37.55876891774226 127.00120089028668,37.55926891774226"
                        }
                    ]
                }
            ]
        }
    }
    
    print("🧪 경사도 분석 API 테스트 시작...")
    print(f"URL: {url}")
    print(f"\n📤 요청 데이터:")
    print(json.dumps(test_data, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(
            url,
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"\n📊 응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ 성공!")
            print(f"📥 응답 데이터:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"\n❌ 오류 발생!")
            print(f"상태 코드: {response.status_code}")
            print(f"응답: {response.text}")
            
    except requests.exceptions.Timeout:
        print("\n⏰ 타임아웃 발생! (30초 초과)")
    except requests.exceptions.ConnectionError as e:
        print(f"\n🔌 연결 오류: {e}")
    except Exception as e:
        print(f"\n❌ 예외 발생: {e}")

if __name__ == "__main__":
    test_slope_analysis()
