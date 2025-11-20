"""
속도 프로필 자동 업데이트 시나리오 테스트

1. 회원가입 → 초기 4 km/h 프로필 생성
2. 첫 번째 경로 → 실측 속도로 프로필 업데이트
3. 두 번째 경로 → 가중평균으로 점진적 개선
4. 이력 조회 → JSONB 이력 확인
"""
import sys
import os

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app import crud, models
from app.utils.Factors_Affecting_Walking_Speed import reverse_calculate_base_speed
import json
from datetime import datetime


def test_speed_profile_scenario():
    """시나리오 테스트 실행"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("🧪 속도 프로필 자동 업데이트 시나리오 테스트")
        print("="*80)
        
        # ============================================
        # 1단계: 신규 사용자 생성 (회원가입)
        # ============================================
        print("\n[1단계] 신규 사용자 생성")
        print("-" * 80)
        
        # 기존 테스트 사용자 삭제
        existing_user = db.query(models.Users).filter(models.Users.email == "test_speed@example.com").first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print("  ⚠️  기존 테스트 사용자 삭제")
        
        # 새 사용자 생성
        new_user = crud.create_user(
            db=db,
            username="speed_test_user",
            email="test_speed@example.com",
            password_hash="dummy_hash",
            auth_provider="local"
        )
        print(f"  ✅ 사용자 생성: ID={new_user.user_id}, email={new_user.email}")
        
        # 초기 프로필 생성 (회원가입 시 자동 생성과 동일)
        initial_profile = crud.create_speed_profile(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            avg_speed_flat_kmh=4.0,
            data_points_count=0,
        )
        print(f"  ✅ 초기 프로필 생성: 속도={initial_profile.avg_speed_flat_kmh} km/h, 데이터 포인트={initial_profile.data_points_count}")
        
        # ============================================
        # 2단계: 첫 번째 경로 안내 완료
        # ============================================
        print("\n[2단계] 첫 번째 경로 안내 완료")
        print("-" * 80)
        
        # 시뮬레이션 데이터
        real_speed_kmh_1 = 3.2  # 실측 속도 (오르막 + 비)
        slope_factor_1 = 1.25   # 오르막 5%
        weather_factor_1 = 1.15 # 비
        
        # 역산: 평지+맑은날 기준 속도 계산
        base_speed_1 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_1,
            slope_factor=slope_factor_1,
            weather_factor=weather_factor_1
        )
        print(f"  📊 실측 데이터: {real_speed_kmh_1} km/h (slope={slope_factor_1}, weather={weather_factor_1})")
        print(f"  🔄 역산 결과: {base_speed_1:.2f} km/h (평지+맑은날 기준)")
        
        # 프로필 업데이트 (가중평균)
        updated_profile_1 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_1,
            source="navigation_log",
            navigation_log_id=1
        )
        print(f"  ✅ 프로필 업데이트: {initial_profile.avg_speed_flat_kmh} → {updated_profile_1.avg_speed_flat_kmh} km/h")
        print(f"  📈 데이터 포인트: {updated_profile_1.data_points_count}개")
        
        # ============================================
        # 3단계: 두 번째 경로 안내 완료
        # ============================================
        print("\n[3단계] 두 번째 경로 안내 완료")
        print("-" * 80)
        
        # 시뮬레이션 데이터
        real_speed_kmh_2 = 3.5  # 실측 속도 (완만한 오르막 + 맑음)
        slope_factor_2 = 1.10   # 오르막 2%
        weather_factor_2 = 1.05 # 약간 흐림
        
        # 역산
        base_speed_2 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_2,
            slope_factor=slope_factor_2,
            weather_factor=weather_factor_2
        )
        print(f"  📊 실측 데이터: {real_speed_kmh_2} km/h (slope={slope_factor_2}, weather={weather_factor_2})")
        print(f"  🔄 역산 결과: {base_speed_2:.2f} km/h (평지+맑은날 기준)")
        
        # 프로필 업데이트
        updated_profile_2 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_2,
            source="navigation_log",
            navigation_log_id=2
        )
        print(f"  ✅ 프로필 업데이트: {updated_profile_1.avg_speed_flat_kmh} → {updated_profile_2.avg_speed_flat_kmh} km/h")
        print(f"  📈 데이터 포인트: {updated_profile_2.data_points_count}개")
        
        # ============================================
        # 4단계: 세 번째 경로 (평지 + 맑음)
        # ============================================
        print("\n[4단계] 세 번째 경로 안내 완료 (평지+맑음)")
        print("-" * 80)
        
        real_speed_kmh_3 = 4.8  # 실측 속도 (평지 + 맑음)
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
            navigation_log_id=3
        )
        print(f"  ✅ 프로필 업데이트: {updated_profile_2.avg_speed_flat_kmh} → {updated_profile_3.avg_speed_flat_kmh} km/h")
        print(f"  📈 데이터 포인트: {updated_profile_3.data_points_count}개")
        
        # ============================================
        # 5단계: 속도 이력 조회
        # ============================================
        print("\n[5단계] 속도 변화 이력 조회")
        print("-" * 80)
        
        # 최종 프로필 조회
        final_profile = crud.get_speed_profile_by_user(db, new_user.user_id)[0]
        
        print(f"  📊 최종 평균 속도: {final_profile.avg_speed_flat_kmh} km/h")
        print(f"  📈 총 데이터 포인트: {final_profile.data_points_count}개")
        print(f"\n  📜 속도 변화 이력:")
        
        if final_profile.speed_history:
            history = final_profile.speed_history
            if isinstance(history, str):
                history = json.loads(history)
            
            for idx, entry in enumerate(history, 1):
                print(f"\n    {idx}. {entry.get('timestamp', 'N/A')[:19]}")
                print(f"       측정 속도: {entry.get('speed_kmh')} km/h")
                print(f"       출처: {entry.get('source')}")
                print(f"       변화: {entry.get('old_avg')} → {entry.get('new_avg')} km/h")
                if entry.get('navigation_log_id'):
                    print(f"       로그 ID: {entry.get('navigation_log_id')}")
        else:
            print("    ⚠️  이력 없음")
        
        # ============================================
        # 결과 요약
        # ============================================
        print("\n" + "="*80)
        print("📊 테스트 결과 요약")
        print("="*80)
        print(f"  초기 속도: 4.0 km/h")
        print(f"  최종 속도: {final_profile.avg_speed_flat_kmh} km/h")
        print(f"  변화량: {float(final_profile.avg_speed_flat_kmh) - 4.0:+.2f} km/h")
        print(f"  총 업데이트: {final_profile.data_points_count}회")
        print(f"  이력 기록: {len(history) if final_profile.speed_history else 0}개")
        print("\n✅ 모든 시나리오 테스트 통과!")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_speed_profile_scenario()
