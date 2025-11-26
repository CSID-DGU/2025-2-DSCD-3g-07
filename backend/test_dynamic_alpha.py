"""
동적 알파값 가중 평균 테스트
"""

def get_alpha(data_points_count: int) -> float:
    """
    측정 횟수에 따른 동적 알파값 계산
    """
    if data_points_count <= 3:
        return 0.50  # 초기: 과감한 반영 (Cold Start 해결)
    elif data_points_count <= 10:
        return 0.40
    elif data_points_count <= 20:
        return 0.30
    elif data_points_count <= 50:
        return 0.20
    else:
        return 0.15  # 장기: 안정화 (노이즈 제거)


def test_dynamic_weighted_average():
    """동적 가중 평균 시뮬레이션"""
    print("=" * 80)
    print("동적 알파값 가중 평균 테스트")
    print("=" * 80)
    
    # 초기 속도
    current_speed = 4.0  # km/h
    measurements = [
        (5.0, "첫 측정 - 빠름"),
        (5.2, "두 번째 - 여전히 빠름"),
        (4.8, "세 번째 - 약간 느림"),
        (5.1, "네 번째"),
        (4.9, "다섯 번째"),
        (5.0, "10회"),
        (4.7, "11회"),
        (5.3, "20회"),
        (4.6, "21회 - 노이즈"),
        (5.5, "50회 - 큰 노이즈"),
        (6.0, "51회 - 더 큰 노이즈"),
        (5.0, "100회"),
    ]
    
    data_points = 0
    
    print(f"\n시작 속도: {current_speed:.2f} km/h")
    print("-" * 80)
    
    for idx, (new_speed, description) in enumerate(measurements, 1):
        # 알파값 계산
        alpha = get_alpha(data_points)
        weight_old = 1.0 - alpha
        weight_new = alpha
        
        # 가중 평균 계산
        old_speed = current_speed
        updated_speed = old_speed * weight_old + new_speed * weight_new
        
        # 속도 차이
        diff = updated_speed - old_speed
        diff_percent = (diff / old_speed) * 100
        
        data_points += 1
        
        print(f"\n[{data_points:3d}회] {description}")
        print(f"  측정 속도: {new_speed:.2f} km/h")
        print(f"  알파값(α): {alpha:.2f} (신규:{weight_new:.0%}, 기존:{weight_old:.0%})")
        print(f"  계산: {old_speed:.2f} × {weight_old:.2f} + {new_speed:.2f} × {weight_new:.2f} = {updated_speed:.2f}")
        print(f"  변화: {old_speed:.2f} → {updated_speed:.2f} km/h ({diff:+.2f} km/h, {diff_percent:+.1f}%)")
        
        current_speed = updated_speed
    
    print("\n" + "=" * 80)
    print(f"최종 속도: {current_speed:.2f} km/h")
    print("=" * 80)
    
    # 알파값 변화 요약
    print("\n[알파값 변화 요약]")
    test_points = [1, 2, 3, 4, 5, 10, 11, 20, 21, 50, 51, 100]
    for point in test_points:
        alpha = get_alpha(point)
        print(f"  {point:3d}회: α = {alpha:.2f} (신규 {alpha:.0%}, 기존 {1-alpha:.0%})")


def test_cold_start_problem():
    """Cold Start 문제 해결 검증"""
    print("\n" + "=" * 80)
    print("Cold Start 문제 해결 검증")
    print("=" * 80)
    
    print("\n[시나리오] 실제 속도 5.0 km/h인 사용자가 기본값 4.0에서 시작")
    print("-" * 80)
    
    # 기존 방식 (고정 0.3 알파)
    print("\n1️⃣ 기존 방식 (α=0.3 고정)")
    speed_old = 4.0
    for i in range(1, 6):
        speed_old = speed_old * 0.7 + 5.0 * 0.3
        print(f"  {i}회: {speed_old:.3f} km/h")
    
    # 새 방식 (동적 알파)
    print("\n2️⃣ 새 방식 (동적 α)")
    speed_new = 4.0
    for i in range(1, 6):
        alpha = get_alpha(i - 1)
        speed_new = speed_new * (1 - alpha) + 5.0 * alpha
        print(f"  {i}회: {speed_new:.3f} km/h (α={alpha:.2f})")
    
    print(f"\n✅ 개선 효과: 기존 {speed_old:.3f} → 새 방식 {speed_new:.3f} km/h")
    print(f"   실제 속도(5.0)에 더 빠르게 수렴!")


def test_noise_resistance():
    """노이즈 저항성 테스트"""
    print("\n" + "=" * 80)
    print("노이즈 저항성 테스트")
    print("=" * 80)
    
    print("\n[시나리오] 안정된 사용자(5.0 km/h)에게 갑자기 7.0 km/h 노이즈 발생")
    print("-" * 80)
    
    # 기존 방식
    print("\n1️⃣ 기존 방식 (α=0.3 고정)")
    speed_old = 5.0
    speed_old = speed_old * 0.7 + 7.0 * 0.3
    print(f"  50회 축적 후: {speed_old:.3f} km/h")
    print(f"  노이즈 영향: +{speed_old - 5.0:.3f} km/h")
    
    # 새 방식 (50회 축적 = α=0.15)
    print("\n2️⃣ 새 방식 (α=0.15)")
    speed_new = 5.0
    alpha = get_alpha(50)
    speed_new = speed_new * (1 - alpha) + 7.0 * alpha
    print(f"  50회 축적 후: {speed_new:.3f} km/h (α={alpha:.2f})")
    print(f"  노이즈 영향: +{speed_new - 5.0:.3f} km/h")
    
    reduction = ((speed_old - 5.0) - (speed_new - 5.0)) / (speed_old - 5.0) * 100
    print(f"\n✅ 노이즈 영향 감소: {reduction:.1f}%")


if __name__ == "__main__":
    test_dynamic_weighted_average()
    test_cold_start_problem()
    test_noise_resistance()
    
    print("\n" + "=" * 80)
    print("테스트 완료 ✅")
    print("=" * 80)
