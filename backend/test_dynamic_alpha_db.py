"""
동적 알파값 가중 평균 실제 DB 테스트
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


def test_dynamic_alpha_with_db():
    """동적 알파값 DB 테스트"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("동적 알파값 가중 평균 DB 테스트")
        print("="*80)
        
        # 1. 테스트 사용자 생성
        print("\n[1단계] 테스트 사용자 생성")
        print("-" * 80)
        
        # 기존 테스트 데이터 정리
        db.query(models.Users).filter(
            models.Users.username == "DynamicAlphaTest"
        ).delete()
        db.commit()
        
        test_email = f"test_dynamic_alpha_{datetime.now().timestamp()}@test.com"
        new_user = crud.create_user(
            db=db,
            email=test_email,
            username="DynamicAlphaTest",
            password_hash="test_hash"
        )
        print(f"✅ 사용자 생성: {new_user.username} (ID: {new_user.user_id})")
        
        # 2. 초기 프로필 생성 (기본 4.0 km/h)
        print("\n[2단계] 초기 프로필 생성")
        print("-" * 80)
        
        initial_profile = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=4.0,
            source="initial"
        )
        print(f"✅ 초기 속도: {initial_profile.speed_case1} km/h")
        print(f"   데이터 포인트: {initial_profile.data_points_count}")
        
        # 3. 여러 측정값으로 업데이트 (실제 속도 5.0 km/h로 수렴)
        print("\n[3단계] 측정값으로 프로필 업데이트")
        print("-" * 80)
        
        measurements = [
            (5.0, 1.0, 1.0, "첫 측정"),
            (5.2, 1.0, 1.0, "두 번째"),
            (4.8, 1.0, 1.0, "세 번째"),
            (5.1, 1.15, 1.0, "네 번째 (오르막)"),
            (4.9, 1.0, 1.05, "다섯 번째 (비)"),
        ]
        
        for idx, (real_speed, slope_factor, weather_factor, description) in enumerate(measurements, 1):
            # 역산: 평지+맑은날 기준 속도 계산
            base_speed = reverse_calculate_base_speed(
                real_walking_speed_kmh=real_speed,
                slope_factor=slope_factor,
                weather_factor=weather_factor
            )
            
            # 프로필 업데이트
            updated_profile = crud.update_speed_profile_with_weighted_avg(
                db=db,
                user_id=new_user.user_id,
                activity_type="walking",
                new_speed_kmh=base_speed,
                source="navigation_log",
                navigation_log_id=idx
            )
            
            # 마지막 이력 엔트리 확인
            last_history = updated_profile.speed_history[-1]
            
            print(f"\n측정 {idx}: {description}")
            print(f"  실측 속도: {real_speed:.2f} km/h (slope={slope_factor:.2f}, weather={weather_factor:.2f})")
            print(f"  역산 속도: {base_speed:.2f} km/h")
            print(f"  데이터 포인트: {updated_profile.data_points_count}")
            print(f"  적용 알파(α): {last_history.get('alpha', 'N/A')}")
            print(f"  프로필 업데이트: {last_history['old_avg']} → {last_history['new_avg']} km/h")
        
        # 4. 이력 전체 조회
        print("\n[4단계] 전체 속도 변화 이력")
        print("-" * 80)
        
        profiles = crud.get_speed_profile_by_user(
            db=db,
            user_id=new_user.user_id
        )
        final_profile = [p for p in profiles if p.activity_type == "walking"][0]
        
        print(f"\n📊 최종 프로필:")
        print(f"   Case1 (경로 안내): {final_profile.speed_case1} km/h")
        print(f"   Case2 (코스 추천): {final_profile.speed_case2} km/h")
        print(f"   총 데이터 포인트: {final_profile.data_points_count}")
        
        print(f"\n📜 속도 이력 ({len(final_profile.speed_history)}개):")
        for i, entry in enumerate(final_profile.speed_history, 1):
            alpha = entry.get('alpha', 'N/A')
            data_points = entry.get('data_points', 'N/A')
            print(f"   {i}. [{entry['source']:16s}] "
                  f"{entry.get('old_avg', 'N/A')} → {entry['new_avg']} km/h "
                  f"(α={alpha}, 누적={data_points})")
        
        # 5. 장기 안정화 시뮬레이션
        print("\n[5단계] 장기 안정화 시뮬레이션 (50회+ 측정)")
        print("-" * 80)
        
        # 20회 더 측정 (안정적인 5.0 km/h)
        for i in range(6, 26):
            base_speed = 5.0
            updated_profile = crud.update_speed_profile_with_weighted_avg(
                db=db,
                user_id=new_user.user_id,
                activity_type="walking",
                new_speed_kmh=base_speed,
                source="navigation_log",
                navigation_log_id=i
            )
        
        print(f"✅ 25회 측정 후: {updated_profile.speed_case1} km/h")
        print(f"   알파값: {updated_profile.speed_history[-1].get('alpha')}")
        
        # 노이즈 측정
        print("\n[6단계] 노이즈 저항성 테스트")
        print("-" * 80)
        
        # 갑자기 7.0 km/h 측정 (노이즈)
        noise_profile = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=7.0,
            source="navigation_log",
            navigation_log_id=26
        )
        
        last_entry = noise_profile.speed_history[-1]
        noise_impact = noise_profile.speed_case1 - updated_profile.speed_case1
        
        print(f"❗ 노이즈 측정: 7.0 km/h")
        print(f"   적용 알파: {last_entry.get('alpha')}")
        print(f"   속도 변화: {updated_profile.speed_case1} → {noise_profile.speed_case1} km/h")
        print(f"   노이즈 영향: +{noise_impact:.3f} km/h")
        print(f"   ({last_entry['old_avg']} × {1-last_entry['alpha']} + 7.0 × {last_entry['alpha']} = {last_entry['new_avg']})")
        
        print("\n" + "="*80)
        print("✅ 테스트 완료!")
        print("="*80)
        
        # 테스트 데이터 정리
        db.query(models.ActivitySpeedProfile).filter(
            models.ActivitySpeedProfile.user_id == new_user.user_id
        ).delete()
        db.query(models.Users).filter(
            models.Users.user_id == new_user.user_id
        ).delete()
        db.commit()
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    test_dynamic_alpha_with_db()
