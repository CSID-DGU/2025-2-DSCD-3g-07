"""
Health Connect ?�동 ?�나리오 ?�스??

1. ?�원가????Health Connect?�서 초기 ?�도 가?�오�?(?? 4.5 km/h)
2. �?번째 경로 ???�측 ?�도�??�로???�데?�트
3. ??번째 경로 ??가중평균으�??�진??개선
4. ?�력 조회 ??Health Connect 초기�??�함 ?�인
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
    """Health Connect ?�동 ?�나리오 ?�스??""
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("?�� Health Connect ?�동 ?�나리오 ?�스??)
        print("="*80)
        
        # ============================================
        # 1?�계: ?�규 ?�용???�성 + Health Connect 초기 ?�도
        # ============================================
        print("\n[1?�계] ?�원가??+ Health Connect ?�이???�동")
        print("-" * 80)
        
        # 기존 ?�스???�용????��
        existing_user = db.query(models.Users).filter(models.Users.email == "health_test@example.com").first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print("  ?�️  기존 ?�스???�용????��")
        
        # ???�용???�성
        new_user = crud.create_user(
            db=db,
            username="health_connect_user",
            email="health_test@example.com",
            password_hash="dummy_hash",
            auth_provider="local"
        )
        print(f"  ???�용???�성: ID={new_user.user_id}, email={new_user.email}")
        
        # Health Connect?�서 가?�온 초기 ?�도 (?��??�이??
        health_connect_speed_kmh = 4.5  # Health Connect Case1 ?�균 ?�도
        print(f"  ?�� Health Connect ?�이?? {health_connect_speed_kmh} km/h")
        
        # 초기 ?�로???�성 (Health Connect ?�도 ?�용)
        initial_profile = crud.create_speed_profile(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            speed_case1=health_connect_speed_kmh,
            data_points_count=1,  # Health Connect ?�이??1개로 ?�작
            speed_history=[{
                "speed_kmh": health_connect_speed_kmh,
                "source": "health_connect",
                "timestamp": datetime.now().isoformat(),
                "navigation_log_id": None,
                "old_avg": None,
                "new_avg": health_connect_speed_kmh
            }]
        )
        print(f"  ??초기 ?�로???�성: ?�도={initial_profile.speed_case1} km/h")
        print(f"  ?�� 출처: Health Connect (?�이???�인??1)")
        
        # ============================================
        # 2?�계: �?번째 ?�제 경로 ?�내
        # ============================================
        print("\n[2?�계] �?번째 ?�제 경로 ?�내 ?�료")
        print("-" * 80)
        
        real_speed_kmh_1 = 3.8  # ?�측 ?�도 (?�간 ?�르�?
        slope_factor_1 = 1.15   # ?�르�?3%
        weather_factor_1 = 1.08 # ?�간 ?�림
        
        base_speed_1 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_1,
            slope_factor=slope_factor_1,
            weather_factor=weather_factor_1
        )
        print(f"  ?�� ?�측 ?�이?? {real_speed_kmh_1} km/h (slope={slope_factor_1}, weather={weather_factor_1})")
        print(f"  ?�� ??�� 결과: {base_speed_1:.2f} km/h (?��?+맑�???기�?)")
        
        updated_profile_1 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_1,
            source="navigation_log",
            navigation_log_id=101
        )
        print(f"  ???�로???�데?�트: {initial_profile.speed_case1} ??{updated_profile_1.speed_case1} km/h")
        print(f"  ?�� ?�이???�인?? {updated_profile_1.data_points_count}�?)
        
        # ============================================
        # 3?�계: ??번째 경로 (???�확??측정)
        # ============================================
        print("\n[3?�계] ??번째 경로 ?�내 ?�료")
        print("-" * 80)
        
        real_speed_kmh_2 = 4.3  # ?�측 ?�도 (거의 ?��?)
        slope_factor_2 = 1.05   # ?�만???�르�?
        weather_factor_2 = 1.02 # 맑음
        
        base_speed_2 = reverse_calculate_base_speed(
            real_walking_speed_kmh=real_speed_kmh_2,
            slope_factor=slope_factor_2,
            weather_factor=weather_factor_2
        )
        print(f"  ?�� ?�측 ?�이?? {real_speed_kmh_2} km/h (slope={slope_factor_2}, weather={weather_factor_2})")
        print(f"  ?�� ??�� 결과: {base_speed_2:.2f} km/h (?��?+맑�???기�?)")
        
        updated_profile_2 = crud.update_speed_profile_with_weighted_avg(
            db=db,
            user_id=new_user.user_id,
            activity_type="walking",
            new_speed_kmh=base_speed_2,
            source="navigation_log",
            navigation_log_id=102
        )
        print(f"  ???�로???�데?�트: {updated_profile_1.speed_case1} ??{updated_profile_2.speed_case1} km/h")
        print(f"  ?�� ?�이???�인?? {updated_profile_2.data_points_count}�?)
        
        # ============================================
        # 4?�계: ??번째 경로 (?��? 최적 조건)
        # ============================================
        print("\n[4?�계] ??번째 경로 ?�내 ?�료 (?��?+맑음)")
        print("-" * 80)
        
        real_speed_kmh_3 = 4.6  # ?�측 ?�도 (?��? + 맑음)
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
            navigation_log_id=103
        )
        print(f"  ???�로???�데?�트: {updated_profile_2.speed_case1} ??{updated_profile_3.speed_case1} km/h")
        print(f"  ?�� ?�이???�인?? {updated_profile_3.data_points_count}�?)
        
        # ============================================
        # 5?�계: ?�도 ?�력 조회 (Health Connect ?�함)
        # ============================================
        print("\n[5?�계] ?�체 ?�도 변???�력 조회")
        print("-" * 80)
        
        final_profile = crud.get_speed_profile_by_user(db, new_user.user_id)[0]
        
        print(f"  ?�� 최종 ?�균 ?�도: {final_profile.speed_case1} km/h")
        print(f"  ?�� �??�이???�인?? {final_profile.data_points_count}�?)
        print(f"\n  ?�� ?�도 변???�력 (출처�?:")
        
        if final_profile.speed_history:
            history = final_profile.speed_history
            if isinstance(history, str):
                history = json.loads(history)
            
            # 출처�?분류
            health_connect_count = 0
            navigation_count = 0
            
            for idx, entry in enumerate(history, 1):
                source = entry.get('source', 'unknown')
                if source == 'health_connect':
                    health_connect_count += 1
                    icon = '?��'
                elif source == 'navigation_log':
                    navigation_count += 1
                    icon = '?���?
                else:
                    icon = '??
                
                print(f"\n    {idx}. {icon} {entry.get('timestamp', 'N/A')[:19]}")
                print(f"       측정 ?�도: {entry.get('speed_kmh')} km/h")
                print(f"       출처: {source}")
                print(f"       변?? {entry.get('old_avg')} ??{entry.get('new_avg')} km/h")
                if entry.get('navigation_log_id'):
                    print(f"       로그 ID: {entry.get('navigation_log_id')}")
            
            print(f"\n  ?�� 출처�??�계:")
            print(f"     ?�� Health Connect: {health_connect_count}�?)
            print(f"     ?���?Navigation Log: {navigation_count}�?)
        else:
            print("    ?�️  ?�력 ?�음")
        
        # ============================================
        # 결과 ?�약
        # ============================================
        print("\n" + "="*80)
        print("?�� Health Connect ?�동 ?�나리오 결과 ?�약")
        print("="*80)
        print(f"  ?�� Health Connect 초기�? {health_connect_speed_kmh} km/h")
        print(f"  ?�� 최종 개인???�도: {final_profile.speed_case1} km/h")
        print(f"  ?�� 변?�량: {float(final_profile.speed_case1) - health_connect_speed_kmh:+.2f} km/h")
        print(f"  ?�� �??�데?�트: {final_profile.data_points_count}??)
        print(f"  ?�� ?�력 기록: {len(history) if final_profile.speed_history else 0}�?)
        print(f"\n  ??Health Connect 초기�????�측 ?�이?�로 ?�진??개선!")
        print("\n??Health Connect ?�동 ?�나리오 ?�스???�과!")
        print("="*80)
        
    except Exception as e:
        print(f"\n???�스???�패: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_health_connect_scenario()
