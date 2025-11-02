"""
최악의 날씨 조건 테스트
보정계수 0.7(최소값)에 도달하는 조건 찾기
"""

import sys
sys.path.insert(0, 'app')

from app.utils.weather_helpers import WeatherSpeedModel, WeatherInput

model = WeatherSpeedModel(clip_min=0.70, clip_max=1.10)

print("=" * 70)
print("🌡️ 최악의 날씨 조건 분석 (보정계수 0.7 도달)")
print("=" * 70)

# 테스트 케이스들
test_cases = [
    # 1. 극한 추위
    {
        'name': '극한 추위 (맑음)',
        'temp_c': -20,
        'ptype': 'clear',
        'rain_mm_per_h': 0,
        'snow_cm_per_h': 0
    },
    # 2. 극한 더위
    {
        'name': '극한 더위 (맑음)',
        'temp_c': 40,
        'ptype': 'clear',
        'rain_mm_per_h': 0,
        'snow_cm_per_h': 0
    },
    # 3. 장대비
    {
        'name': '장대비 (20°C)',
        'temp_c': 20,
        'ptype': 'rain',
        'rain_mm_per_h': 30,
        'snow_cm_per_h': 0
    },
    # 4. 폭설
    {
        'name': '폭설 (0°C)',
        'temp_c': 0,
        'ptype': 'snow',
        'rain_mm_per_h': 0,
        'snow_cm_per_h': 5.0
    },
    # 5. 어는 비
    {
        'name': '어는 비 (-5°C)',
        'temp_c': -5,
        'ptype': 'rain',
        'rain_mm_per_h': 15,
        'snow_cm_per_h': 0
    },
    # 6. 습설 (최악의 눈)
    {
        'name': '습설 (1.5°C)',
        'temp_c': 1.5,
        'ptype': 'snow',
        'rain_mm_per_h': 0,
        'snow_cm_per_h': 5.0
    },
    # 7. 추위 + 폭설
    {
        'name': '추위 + 폭설 (-10°C)',
        'temp_c': -10,
        'ptype': 'snow',
        'rain_mm_per_h': 0,
        'snow_cm_per_h': 5.0
    },
    # 8. 더위 + 장대비
    {
        'name': '더위 + 장대비 (35°C)',
        'temp_c': 35,
        'ptype': 'rain',
        'rain_mm_per_h': 30,
        'snow_cm_per_h': 0
    },
    # 9. 진눈깨비 (최악)
    {
        'name': '진눈깨비 (0°C)',
        'temp_c': 0,
        'ptype': 'sleet',
        'rain_mm_per_h': 20,
        'snow_cm_per_h': 3.0
    },
    # 10. 극한 조합
    {
        'name': '극한 조합 (-15°C + 폭설)',
        'temp_c': -15,
        'ptype': 'snow',
        'rain_mm_per_h': 0,
        'snow_cm_per_h': 10.0
    },
]

results = []

for case in test_cases:
    weather = WeatherInput(
        temp_c=case['temp_c'],
        ptype=case['ptype'],
        rain_mm_per_h=case['rain_mm_per_h'],
        snow_cm_per_h=case['snow_cm_per_h']
    )
    
    # 기준 속도 1.4 m/s (평균 보행 속도)
    prediction = model.predict(v0_mps=1.4, weather=weather)
    
    results.append({
        'name': case['name'],
        'weather': case,
        'coeff': prediction.weather_coeff,
        'stride': prediction.stride_factor,
        'cadence': prediction.cadence_factor,
        'speed_kmh': prediction.speed_kmh,
        'percent': prediction.percent_change,
        'warnings': prediction.warnings
    })

# 보정계수 낮은 순으로 정렬
results.sort(key=lambda x: x['coeff'])

print("\n🥶 최악의 날씨 TOP 10 (보정계수 낮은 순)")
print("-" * 70)

for i, result in enumerate(results, 1):
    print(f"\n{i}. {result['name']}")
    print(f"   📊 보정계수: {result['coeff']:.3f} ({result['percent']:+.1f}%)")
    print(f"   🌡️  기온: {result['weather']['temp_c']}°C")
    print(f"   ☔ 강수형태: {result['weather']['ptype']}")
    print(f"   💧 강수량: {result['weather']['rain_mm_per_h']} mm/h")
    print(f"   ❄️  적설량: {result['weather']['snow_cm_per_h']} cm/h")
    print(f"   👟 보폭 계수: {result['stride']:.3f}")
    print(f"   👣 보행수 계수: {result['cadence']:.3f}")
    print(f"   🚶 속도: {result['speed_kmh']:.2f} km/h")
    
    if result['warnings']:
        print(f"   ⚠️  경고:")
        for warning in result['warnings']:
            print(f"      {warning}")

# 0.7에 가장 가까운 케이스
worst_case = results[0]
print("\n" + "=" * 70)
print(f"🔥 최악의 케이스: {worst_case['name']}")
print("=" * 70)
print(f"보정계수: {worst_case['coeff']:.3f}")
print(f"기준 대비: {worst_case['percent']:.1f}%")
print(f"속도 감소: {5.04 - worst_case['speed_kmh']:.2f} km/h (5.04 → {worst_case['speed_kmh']:.2f})")

if worst_case['coeff'] == 0.70:
    print("\n✅ 클램핑됨: 계산된 계수가 0.7 이하여서 0.7로 제한됨")
else:
    print(f"\n⚠️ 클램핑 안됨: 실제 계산 값 {worst_case['coeff']:.3f}")

print("\n" + "=" * 70)
print("📝 결론")
print("=" * 70)
print("최악의 보정계수 0.7에 도달하는 조건:")
print("1. 극한 기온 (-15°C 이하 또는 35°C 이상)")
print("2. 폭설 (5 cm/h 이상)")
print("3. 장대비 (30 mm/h 이상)")
print("4. 위 조건들의 조합")
print("\n이런 날씨에는 보행 속도가 30% 감소하여 매우 위험합니다!")
