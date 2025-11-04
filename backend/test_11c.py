import sys
sys.path.insert(0, 'd:/PaceTry/backend')

from app.utils.weather_helpers import WeatherSpeedModel, map_kma_to_weather

print('=== 11°C 날씨 계수 확인 ===')
print()

model = WeatherSpeedModel()

# 11°C 맑은 날
weather = map_kma_to_weather(T=11, PTY=0)
pred = model.predict(1.4, weather)

time_factor = 1.0 / pred.weather_coeff

print(f'11°C 맑은 날:')
print(f'  - 속도 계수 (weather_coeff): {pred.weather_coeff:.3f}')
print(f'  - 속도 변화율: {pred.percent_change:+.1f}%')
print(f'  - 시간 계수 (1/weather_coeff): {time_factor:.3f}')
print(f'  - 시간 변화율: {(time_factor-1)*100:+.1f}%')
print()

# 예시: 15분 28초 = 928초
original_time = 928
time_with_weather = original_time * time_factor
impact = time_with_weather - original_time

print(f'원래 도보 시간: {original_time // 60}분 {original_time % 60}초')
print(f'날씨 보정 후: {int(time_with_weather) // 60}분 {int(time_with_weather) % 60}초')
print(f'차이: {int(impact) // 60}분 {int(impact) % 60}초')
print()

print('💡 11°C는 쾌적한 온도에 가까워서 약간 빠른 속도가 예상됩니다.')
print('   하지만 이미지에서는 "-0분 18초"로 표시되었다면, 이는 올바른 방향입니다.')
print('   (11°C는 쾌적한 온도이므로 속도가 빠르고, 시간이 감소해야 함)')
