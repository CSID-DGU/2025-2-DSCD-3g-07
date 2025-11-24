import pandas as pd


def extract_number_from_text(text):
    """문자열에서 숫자만 추출"""
    if not text:
        return None
    number_str = ''
    for char in text:
        if char.isdigit():
            number_str += char
        elif number_str:  # 숫자를 찾은 후 숫자가 아닌 문자가 나오면 중단
            break
    return int(number_str) if number_str else None


def crosswalk_wait(real_coord):
    """횡단보도 대기 시간 계산 - 안전한 반환값 보장"""
    try:
        gyo = pd.read_csv('data/crosswalk.csv')
        # 입력값 검증
        if not real_coord or len(real_coord) != 4:
            return 0
        lat1, lng1, lat2, lng2 = real_coord[0], real_coord[1], real_coord[2], real_coord[3]
        # NaN 체크
        if any(pd.isna([lat1, lng1, lat2, lng2])):
            return 0
        lat = (lat1 + lat2) / 2
        lng = (lng1 + lng2) / 2
        min_dist = 1
        idx = -1
        for i in range(len(gyo)):
            dist = (abs(lat - gyo.loc[i, 'lat']) ** 2 + abs(lng - gyo.loc[i, 'lng']) ** 2) ** 0.5
            if dist <= min_dist:
                min_dist = dist
                idx = i

        if min_dist > 0.0005 or idx == -1:
            return 0
        else:
            wait = int(gyo.loc[idx, 'red'])

        # 음수나 비정상적인 값 방지
        result = max(0, int(wait))
        return result
    except Exception as e:
        print(f"횡단보도 대기시간 계산 오류: {e}")
        return 0


def crosswalk_waiting_time(itinerary):
    """
    횡단보도 대기 시간 및 개수 계산 - Pedestrian/Transit API 모두 지원
    
    Returns:
        dict: {
            "count": 횡단보도 개수,
            "total_wait_time": 총 대기 시간(초),
            "details": [(위치, 대기시간), ...]
        }
    """
    try:
        red_per_green = pd.read_csv('data/red_per_green.csv')
        gyo = pd.read_csv('data/crosswalk.csv')
        
        if not itinerary or not isinstance(itinerary, dict):
            return {"count": 0, "total_wait_time": 0, "details": []}
        
        legs = itinerary.get("legs", [])
        
        crosswalk_list = []  # [(좌표, 대기시간), ...]
        checked_crosswalks = set()  # 중복 방지

        for i, leg in enumerate(legs):
            if not isinstance(leg, dict):
                continue
            
            mode = leg.get("mode")
            if mode != "WALK":
                continue
            
            # 다음 leg가 지하철인지 확인 (지하 진입 여부 판단)
            next_leg = legs[i + 1] if i + 1 < len(legs) else None
            is_entering_subway = next_leg and next_leg.get("mode") == "SUBWAY"

            steps = leg.get("steps", [])
            
            # Pedestrian API와 Transit API 모두 동일한 steps 구조 사용
            if not steps:
                continue
                
            for step_index, step in enumerate(steps):
                if not isinstance(step, dict):
                    continue
                description = step.get("description", "")
                linestring = step.get("linestring", "")
                if "횡단보도" not in description:
                    continue
                
                # 지하철 진입 직전의 마지막 step + 출구 횡단보도는 제외 (실제로 안 건넘)
                is_last_step = step_index == len(steps) - 1
                if is_entering_subway and is_last_step and "출구에서" in description:
                    continue

                # 횡단보도 이후의 숫자만 추출
                length = None
                crosswalk_index = description.find("횡단보도")
                text_after = description[crosswalk_index:]
                number_str = ''
                for char in text_after:
                    if char.isdigit():
                        number_str += char
                    elif number_str:
                        break
                if number_str:
                    length = int(number_str)

                try:
                    coords = linestring.split()
                    if len(coords) < 2:
                        continue
                    first_coord = coords[0]
                    last_coord = coords[-1]
                    lng1, lat1 = map(float, first_coord.split(','))
                    lng2, lat2 = map(float, last_coord.split(','))
                    
                    # 중복 체크용 좌표 ID
                    crosswalk_id = (round(lat1, 5), round(lng1, 5), round(lat2, 5), round(lng2, 5))
                    if crosswalk_id in checked_crosswalks:
                        continue
                    
                    wait = crosswalk_wait((lat1, lng1, lat2, lng2))
                    
                    if wait == 0 and length is not None:
                        # green 컬럼에 해당 값이 있는지 확인
                        matching_rows = red_per_green.loc[red_per_green['green'] == length + 7, 'red']
                        if len(matching_rows) > 0:
                            wait = int(matching_rows.values[0])
                        else:
                            wait = 0  # 매칭되는 값이 없으면 0
                    else:
                        wait = max(wait, 0)
                    
                    crosswalk_list.append((crosswalk_id, wait))
                    checked_crosswalks.add(crosswalk_id)
                except (ValueError, IndexError):
                    continue

        total_wait = sum(wait for _, wait in crosswalk_list)
        
        if len(crosswalk_list) > 0:
            avg_wait = total_wait / len(crosswalk_list)
            print(f"🚦 횡단보도: {len(crosswalk_list)}개, 총 대기시간: {total_wait}초 (평균: {avg_wait:.1f}초/개)")
            # 대기시간 분포 확인
            wait_times = [wait for _, wait in crosswalk_list]
            print(f"   대기시간 범위: {min(wait_times)}~{max(wait_times)}초")
        
        return {
            "count": len(crosswalk_list),
            "total_wait_time": total_wait,
            "details": crosswalk_list
        }
    except Exception as e:
        return {"count": 0, "total_wait_time": 0, "details": []}
