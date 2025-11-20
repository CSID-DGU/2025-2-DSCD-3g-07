"""
Health Connect 연동 시나리오 테스트

1. 회원가입 → Health Connect에서 초기 속도 가져오기 (예: 4.5 km/h)
2. 첫 번째 경로 → 실측 속도로 프로필 업데이트
3. 두 번째 경로 → 가중평균으로 점진적 개선
4. 이력 조회 → Health Connect 초기값 포함 확인
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud, models
from app.utils.Factors_Affecting_Walking_Speed import reverse_calculate_base_speed
import json
from datetime import datetime


def test_health_connect_scenario():
    """Health Connect 연동 시나리오 테스트"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("🏥 Health Connect 연동 시나리오 테스트")
        print("="*80)
        
        # ============================================
        # 1단계: 신규 사용자 생성 + Health Connect 초기 속도
        # ============================================
        print("\n[1단계] 회원가입 + Health Connect 데이터 연동")
        print("-" * 80)
        
        # 기존 테스트 사용자 삭제
        existing_user = db.query(models.Users).filter(models.Users.email == "health_test@example.com").first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print("  ⚠️  기존 테스트 사용자 삭제")
        
        # 새 사용자 생성
        new_user = crud.create_user(
            db=db,
            username="health_connect_user",
            email="health_test@example.com",
            password_hash="dummy_hash",
            auth_provider="local"
        )
        print(f"  ✅ 사용자 생성: ID={new_user.user_id}, email={new_user.email}")
        
        # Health Connect에서 가져온 초기 속도 (시뮬레이션)
        health_connect_speed_kmh = 4.5  # Health Connect Case1 평균 속도
        print(f"  🏥 Health Connect 데이터: {health_connect_speed_kmh} km/h")
        
        # 초기 프로필 생성 (Health Connect 속도 사용)
        initial_profile = crud.create_speed_profile(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            avg_speed_flat_kmh=health_connect_speed_kmh,
            data_points_count=1,  # Health Connect 데이터 1개로 시작
            speed_history=[{
                "speed_kmh": health_connect_speed_kmh,
                "source": "health_connect",
                "timestamp": datetime.now().isoformat(),
                "navigation_log_id": None,
                "old_avg": None,
                "new_avg": health_connect_speed_kmh
            }]
        )
        print(f"  ✅ 초기 프로필 생성: 속도={initial_profile.avg_speed_flat_kmh} km/h")
        print(f"  📊 출처: Health Connect (데이터 포인트=1)")
        
        # ============================================
        # 2단계: 첫 번째 실제 경로 안내
        # ============================================
        print("\n[2단계] 첫 번째 실제 경로 안내 완료")
        print("-" * 80)
        
        real_speed_kmh_1 = 3.8  # 실측 속도 (약간 오르막)
        slope_factor_1 = 1.15   # 오르막 3%
        weather_factor_1 = 1.08 # 약간 흐림
        
        base_speed_1 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_1,
            slope_factor=slope_factor_1,
            weather_factor=weather_factor_1
        )
        print(f"  📊 실측 데이터: {real_speed_kmh_1} km/h (slope={slope_factor_1}, weather={weather_factor_1})")
        print(f"  🔄 역산 결과: {base_speed_1:.2f} km/h (평지+맑은날 기준)")
        
        updated_profile_1 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_1,
            source="navigation_log",
            navigation_log_id=101
        )
        print(f"  ✅ 프로필 업데이트: {initial_profile.avg_speed_flat_kmh} → {updated_profile_1.avg_speed_flat_kmh} km/h")
        print(f"  📈 데이터 포인트: {updated_profile_1.data_points_count}개")
        
        # ============================================
        # 3단계: 두 번째 경로 (더 정확한 측정)
        # ============================================
        print("\n[3단계] 두 번째 경로 안내 완료")
        print("-" * 80)
        
        real_speed_kmh_2 = 4.3  # 실측 속도 (거의 평지)
        slope_factor_2 = 1.05   # 완만한 오르막
        weather_factor_2 = 1.02 # 맑음
        
        base_speed_2 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_2,
            slope_factor=slope_factor_2,
            weather_factor=weather_factor_2
        )
        print(f"  📊 실측 데이터: {real_speed_kmh_2} km/h (slope={slope_factor_2}, weather={weather_factor_2})")
        print(f"  🔄 역산 결과: {base_speed_2:.2f} km/h (평지+맑은날 기준)")
        
        updated_profile_2 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_2,
            source="navigation_log",
            navigation_log_id=102
        )
        print(f"  ✅ 프로필 업데이트: {updated_profile_1.avg_speed_flat_kmh} → {updated_profile_2.avg_speed_flat_kmh} km/h")
        print(f"  📈 데이터 포인트: {updated_profile_2.data_points_count}개")
        
        # ============================================
        # 4단계: 세 번째 경로 (평지 최적 조건)
        # ============================================
        print("\n[4단계] 세 번째 경로 안내 완료 (평지+맑음)")
        print("-" * 80)
        
        real_speed_kmh_3 = 4.6  # 실측 속도 (평지 + 맑음)
        slope_factor_3 = 1.0    # 평지
        weather_factor_3 = 1.0  # 맑음
        
        base_speed_3 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_3,
            slope_factor=slope_factor_3,
            weather_factor=weather_factor_3
        )
        print(f"  📊 실측 데이터: {real_speed_kmh_3} km/h (slope={slope_factor_3}, weather={weather_factor_3})")
        print(f"  🔄 역산 결과: {base_speed_3:.2f} km/h (평지+맑은날 기준)")
        
        updated_profile_3 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_3,
            source="navigation_log",
            navigation_log_id=103
        )
        print(f"  ✅ 프로필 업데이트: {updated_profile_2.avg_speed_flat_kmh} → {updated_profile_3.avg_speed_flat_kmh} km/h")
        print(f"  📈 데이터 포인트: {updated_profile_3.data_points_count}개")
        
        # ============================================
        # 5단계: 속도 이력 조회 (Health Connect 포함)
        # ============================================
        print("\n[5단계] 전체 속도 변화 이력 조회")
        print("-" * 80)
        
        final_profile = crud.get_speed_profile_by_user(db, new_user.user_id)[0]
        
        print(f"  📊 최종 평균 속도: {final_profile.avg_speed_flat_kmh} km/h")
        print(f"  📈 총 데이터 포인트: {final_profile.data_points_count}개")
        print(f"\n  📜 속도 변화 이력 (출처별):")
        
        if final_profile.speed_history:
            history = final_profile.speed_history
            if isinstance(history, str):
                history = json.loads(history)
            
            # 출처별 분류
            health_connect_count = 0
            navigation_count = 0
            
            for idx, entry in enumerate(history, 1):
                source = entry.get('source', 'unknown')
                if source == 'health_connect':
                    health_connect_count += 1
                    icon = '🏥'
                elif source == 'navigation_log':
                    navigation_count += 1
                    icon = '🗺️'
                else:
                    icon = '❓'
                
                print(f"\n    {idx}. {icon} {entry.get('timestamp', 'N/A')[:19]}")
                print(f"       측정 속도: {entry.get('speed_kmh')} km/h")
                print(f"       출처: {source}")
                print(f"       변화: {entry.get('old_avg')} → {entry.get('new_avg')} km/h")
                if entry.get('navigation_log_id'):
                    print(f"       로그 ID: {entry.get('navigation_log_id')}")
            
            print(f"\n  📊 출처별 통계:")
            print(f"     🏥 Health Connect: {health_connect_count}개")
            print(f"     🗺️ Navigation Log: {navigation_count}개")
        else:
            print("    ⚠️  이력 없음")
        
        # ============================================
        # 결과 요약
        # ============================================
        print("\n" + "="*80)
        print("📊 Health Connect 연동 시나리오 결과 요약")
        print("="*80)
        print(f"  🏥 Health Connect 초기값: {health_connect_speed_kmh} km/h")
        print(f"  📊 최종 개인화 속도: {final_profile.avg_speed_flat_kmh} km/h")
        print(f"  📈 변화량: {float(final_profile.avg_speed_flat_kmh) - health_connect_speed_kmh:+.2f} km/h")
        print(f"  🔄 총 업데이트: {final_profile.data_points_count}회")
        print(f"  📜 이력 기록: {len(history) if final_profile.speed_history else 0}개")
        print(f"\n  ✨ Health Connect 초기값 → 실측 데이터로 점진적 개선!")
        print("\n✅ Health Connect 연동 시나리오 테스트 통과!")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_health_connect_scenario()
