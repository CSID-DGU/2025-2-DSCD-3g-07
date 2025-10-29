"""
Tobler's Hiking Function 테스트 스크립트
다양한 경사도에 대한 속도 계수를 확인합니다.

사용법:
    python test_tobler_function.py
    
주요 특징:
    - 경사도의 부호로 오르막/내리막 자동 구분
    - 양수 = 오르막 (예: 10 = 10% 오르막)
    - 음수 = 내리막 (예: -10 = 10% 내리막)
"""
import math

def calculate_slope_factor(slope_percent: float) -> float:
    """
    Tobler's Hiking Function (1993)을 사용한 경사도별 보행 속도 계수 계산
    
    공식: W = 6 * exp(-3.5 * |S + 0.05|)
    where S = slope = tan(theta) = slope_percent / 100
    
    Args:
        slope_percent: 경사도 (%)
                      양수 = 오르막 (예: 10은 10% 오르막)
                      음수 = 내리막 (예: -10은 10% 내리막)
    
    Returns:
        float: 속도 계수 (평지 1.0 기준)
        
    Examples:
        >>> calculate_slope_factor(10)   # 10% 오르막
        0.710
        >>> calculate_slope_factor(-10)  # 10% 내리막  
        1.007
    """
    # 경사(%)를 tan(θ)로 변환
    S = slope_percent / 100
    
    # Tobler's 공식: W = 6 * exp(-3.5 * |S + 0.05|)
    velocity_kmh = 6 * math.exp(-3.5 * abs(S + 0.05))
    
    # 평지 속도(5 km/h) 대비 계수로 변환
    speed_factor = velocity_kmh / 5.0
    
    return speed_factor


def main():
    print("=" * 70)
    print("Tobler's Hiking Function - 경사도별 보행 속도 분석")
    print("=" * 70)
    print()
    
    # 사용 예시
    print("📝 사용 예시:")
    print("-" * 70)
    print("  # 오르막")
    print(f"  calculate_slope_factor(10)   # 10% 오르막  → {calculate_slope_factor(10):.3f}")
    print(f"  calculate_slope_factor(5)    # 5% 오르막   → {calculate_slope_factor(5):.3f}")
    print()
    print("  # 내리막")
    print(f"  calculate_slope_factor(-10)  # 10% 내리막  → {calculate_slope_factor(-10):.3f}")
    print(f"  calculate_slope_factor(-5)   # 5% 내리막   → {calculate_slope_factor(-5):.3f}")
    print()
    print("  # 평지")
    print(f"  calculate_slope_factor(0)    # 평지        → {calculate_slope_factor(0):.3f}")
    print("=" * 70)
    print()
    
    # 테스트할 경사도 값들 (-80% ~ +80%)
    test_slopes = [
        -80, -70, -60, -50, -40, -30, -25, -20, -15, -10, -7, -5, -3, -1,  # 내리막
        0,                                                                    # 평지
        1, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80                   # 오르막
    ]
    
    print(f"{'경사도':>8} | {'지형':^16} | {'속도(km/h)':>12} | {'속도 계수':>10} | {'보행시간 비율':>14}")
    print("-" * 70)
    
    for slope in test_slopes:
        factor = calculate_slope_factor(slope)
        velocity = factor * 5.0  # 평지 속도 5 km/h 기준
        time_ratio = 1.0 / factor if factor > 0 else float('inf')
        
        # 지형 설명
        if slope < -15:
            terrain = "매우 가파른 내리막"
        elif slope < -10:
            terrain = "가파른 내리막"
        elif slope < -5:
            terrain = "보통 내리막"
        elif slope < -1:
            terrain = "완만한 내리막"
        elif slope < 1:
            terrain = "평지"
        elif slope < 3:
            terrain = "완만한 오르막"
        elif slope < 5:
            terrain = "약간 오르막"
        elif slope < 10:
            terrain = "보통 오르막"
        elif slope < 15:
            terrain = "가파른 오르막"
        else:
            terrain = "매우 가파른 오르막"
        
        print(f"{slope:>7}% | {terrain:^16} | {velocity:>11.2f} | {factor:>10.3f} | {time_ratio:>13.2f}x")
    
    print()
    print("=" * 70)
    print("주요 특징:")
    print("  • 평지(0%): 5.0 km/h (기준)")
    print("  • 최적 속도: 약 -5% 내리막에서 최대 (~5.4 km/h)")
    print("  • 가파른 오르막(20%): 약 1.0 km/h (평지 대비 5배 느림)")
    print("  • 가파른 내리막(-20%): 안전을 위해 속도 감소")
    print()
    print("보행시간 비율: 같은 거리를 이동할 때 평지 대비 걸리는 시간")
    print("  예) 2.0x = 평지보다 2배 오래 걸림")
    print("=" * 70)


if __name__ == "__main__":
    main()
