import sys
sys.path.insert(0, 'd:/PaceTry/backend')

from app.utils.weather_helpers import WeatherSpeedModel, map_kma_to_weather

print('=== 날씨 계수 계산 검증 ===')
print()

# 날씨 모델 생성
model = WeatherSpeedModel()

# 테스트 케이스들
test_cases = [
    {'name': '맑은 날 (15°C)', 'T': 15, 'PTY': 0},
    {'name': '추운 날 (-5°C)', 'T': -5, 'PTY': 0},
    {'name': '더운 날 (35°C)', 'T': 35, 'PTY': 0},
    {'name': '비 오는 날 (15°C, 5mm/h)', 'T': 15, 'PTY': 1, 'RN1': 5.0},
    {'name': '폭우 (15°C, 15mm/h)', 'T': 15, 'PTY': 1, 'RN1': 15.0},
    {'name': '눈 오는 날 (-2°C, 1cm/h)', 'T': -2, 'PTY': 3, 'SNO': 1.0},
]

print('기준 속도: 1.4 m/s (5.04 km/h)')
print()

for tc in test_cases:
    # name 제외하고 전달
    weather_params = {k: v for k, v in tc.items() if k != 'name'}
    weather = map_kma_to_weather(**weather_params)
    pred = model.predict(1.4, weather)
    
    # 시간 계수 계산 (속도 비율의 역수)
    time_factor = 1.0 / pred.weather_coeff
    
    print(f'{tc["name"]}:')
    print(f'  - 속도 계수: {pred.weather_coeff:.3f} (속도 {pred.percent_change:+.1f}%)')
    print(f'  - 시간 계수: {time_factor:.3f} (시간 {(time_factor-1)*100:+.1f}%)')
    print(f'  - 예상 속도: {pred.speed_kmh:.2f} km/h')
    if pred.warnings:
        for w in pred.warnings:
            print(f'  {w}')
    print()

print('='*50)
print('💡 해석:')
print('  - 속도 계수 < 1.0 → 느려짐 → 시간 계수 > 1.0 (시간 증가)')
print('  - 속도 계수 > 1.0 → 빨라짐 → 시간 계수 < 1.0 (시간 감소)')
print('  - 좋은 날씨(10-20°C) = 약 1.01 (1% 빠름)')
print('  - 나쁜 날씨(극한/폭우) = 0.70-0.90 (느림)')
