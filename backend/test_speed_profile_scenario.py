"""
?�도 ?�로???�동 ?�데?�트 ?�나리오 ?�스??

1. ?�원가????초기 4 km/h ?�로???�성
2. �?번째 경로 ???�측 ?�도�??�로???�데?�트
3. ??번째 경로 ??가중평균으�??�진??개선
4. ?�력 조회 ??JSONB ?�력 ?�인
"""
import sys
import os

# ?�로?�트 루트 경로 추�?
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app import crud, models
from app.utils.Factors_Affecting_Walking_Speed import reverse_calculate_base_speed
import json
from datetime import datetime


def test_speed_profile_scenario():
    """?�나리오 ?�스???�행"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("?�� ?�도 ?�로???�동 ?�데?�트 ?�나리오 ?�스??)
        print("="*80)
        
        # ============================================
        # 1?�계: ?�규 ?�용???�성 (?�원가??
        # ============================================
        print("\n[1?�계] ?�규 ?�용???�성")
        print("-" * 80)
        
        # 기존 ?�스???�용????��
        existing_user = db.query(models.Users).filter(models.Users.email == "test_speed@example.com").first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print("  ?�️  기존 ?�스???�용????��")
        
        # ???�용???�성
        new_user = crud.create_user(
            db=db,
            username="speed_test_user",
            email="test_speed@example.com",
            password_hash="dummy_hash",
            auth_provider="local"
        )
        print(f"  ???�용???�성: ID={new_user.user_id}, email={new_user.email}")
        
        # 초기 ?�로???�성 (?�원가?????�동 ?�성�??�일)
        initial_profile = crud.create_speed_profile(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            speed_case1=4.0,
            data_points_count=0,
        )
        print(f"  ??초기 ?�로???�성: ?�도={initial_profile.speed_case1} km/h, ?�이???�인??{initial_profile.data_points_count}")
        
        # ============================================
        # 2?�계: �?번째 경로 ?�내 ?�료
        # ============================================
        print("\n[2?�계] �?번째 경로 ?�내 ?�료")
        print("-" * 80)
        
        # ?��??�이???�이??
        real_speed_kmh_1 = 3.2  # ?�측 ?�도 (?�르�?+ �?
        slope_factor_1 = 1.25   # ?�르�?5%
        weather_factor_1 = 1.15 # �?
        
        # ??��: ?��?+맑�???기�? ?�도 계산
        base_speed_1 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_1,
            slope_factor=slope_factor_1,
            weather_factor=weather_factor_1
        )
        print(f"  ?�� ?�측 ?�이?? {real_speed_kmh_1} km/h (slope={slope_factor_1}, weather={weather_factor_1})")
        print(f"  ?�� ??�� 결과: {base_speed_1:.2f} km/h (?��?+맑�???기�?)")
        
        # ?�로???�데?�트 (가중평�?
        updated_profile_1 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_1,
            source="navigation_log",
            navigation_log_id=1
        )
        print(f"  ???�로???�데?�트: {initial_profile.speed_case1} ??{updated_profile_1.speed_case1} km/h")
        print(f"  ?�� ?�이???�인?? {updated_profile_1.data_points_count}�?)
        
        # ============================================
        # 3?�계: ??번째 경로 ?�내 ?�료
        # ============================================
        print("\n[3?�계] ??번째 경로 ?�내 ?�료")
        print("-" * 80)
        
        # ?��??�이???�이??
        real_speed_kmh_2 = 3.5  # ?�측 ?�도 (?�만???�르�?+ 맑음)
        slope_factor_2 = 1.10   # ?�르�?2%
        weather_factor_2 = 1.05 # ?�간 ?�림
        
        # ??��
        base_speed_2 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_2,
            slope_factor=slope_factor_2,
            weather_factor=weather_factor_2
        )
        print(f"  ?�� ?�측 ?�이?? {real_speed_kmh_2} km/h (slope={slope_factor_2}, weather={weather_factor_2})")
        print(f"  ?�� ??�� 결과: {base_speed_2:.2f} km/h (?��?+맑�???기�?)")
        
        # ?�로???�데?�트
        updated_profile_2 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_2,
            source="navigation_log",
            navigation_log_id=2
        )
        print(f"  ???�로???�데?�트: {updated_profile_1.speed_case1} ??{updated_profile_2.speed_case1} km/h")
        print(f"  ?�� ?�이???�인?? {updated_profile_2.data_points_count}�?)
        
        # ============================================
        # 4?�계: ??번째 경로 (?��? + 맑음)
        # ============================================
        print("\n[4?�계] ??번째 경로 ?�내 ?�료 (?��?+맑음)")
        print("-" * 80)
        
        real_speed_kmh_3 = 4.8  # ?�측 ?�도 (?��? + 맑음)
        slope_factor_3 = 1.0    # ?��?
        weather_factor_3 = 1.0  # 맑음
        
        base_speed_3 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_3,
            slope_factor=slope_factor_3,
            weather_factor=weather_factor_3
        )
        print(f"  ?�� ?�측 ?�이?? {real_speed_kmh_3} km/h (slope={slope_factor_3}, weather={weather_factor_3})")
        print(f"  ?�� ??�� 결과: {base_speed_3:.2f} km/h (?��?+맑�???기�?)")
        
        updated_profile_3 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_3,
            source="navigation_log",
            navigation_log_id=3
        )
        print(f"  ???�로???�데?�트: {updated_profile_2.speed_case1} ??{updated_profile_3.speed_case1} km/h")
        print(f"  ?�� ?�이???�인?? {updated_profile_3.data_points_count}�?)
        
        # ============================================
        # 5?�계: ?�도 ?�력 조회
        # ============================================
        print("\n[5?�계] ?�도 변???�력 조회")
        print("-" * 80)
        
        # 최종 ?�로??조회
        final_profile = crud.get_speed_profile_by_user(db, new_user.user_id)[0]
        
        print(f"  ?�� 최종 ?�균 ?�도: {final_profile.speed_case1} km/h")
        print(f"  ?�� �??�이???�인?? {final_profile.data_points_count}�?)
        print(f"\n  ?�� ?�도 변???�력:")
        
        if final_profile.speed_history:
            history = final_profile.speed_history
            if isinstance(history, str):
                history = json.loads(history)
            
            for idx, entry in enumerate(history, 1):
                print(f"\n    {idx}. {entry.get('timestamp', 'N/A')[:19]}")
                print(f"       측정 ?�도: {entry.get('speed_kmh')} km/h")
                print(f"       출처: {entry.get('source')}")
                print(f"       변?? {entry.get('old_avg')} ??{entry.get('new_avg')} km/h")
                if entry.get('navigation_log_id'):
                    print(f"       로그 ID: {entry.get('navigation_log_id')}")
        else:
            print("    ?�️  ?�력 ?�음")
        
        # ============================================
        # 결과 ?�약
        # ============================================
        print("\n" + "="*80)
        print("?�� ?�스??결과 ?�약")
        print("="*80)
        print(f"  초기 ?�도: 4.0 km/h")
        print(f"  최종 ?�도: {final_profile.speed_case1} km/h")
        print(f"  변?�량: {float(final_profile.speed_case1) - 4.0:+.2f} km/h")
        print(f"  �??�데?�트: {final_profile.data_points_count}??)
        print(f"  ?�력 기록: {len(history) if final_profile.speed_history else 0}�?)
        print("\n??모든 ?�나리오 ?�스???�과!")
        print("="*80)
        
    except Exception as e:
        print(f"\n???�스???�패: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_speed_profile_scenario()
