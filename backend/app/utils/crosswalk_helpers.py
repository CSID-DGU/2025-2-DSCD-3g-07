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
    """총 대기 시간 계산 - None-safe 처리"""
    try:
        red_per_green = pd.read_csv('data/red_per_green.csv')
        if not itinerary or not isinstance(itinerary, dict):
            return 0, []
        legs = itinerary.get("legs", [])
        total_wait = 0
        waiting = []

        for leg in legs:
            if not isinstance(leg, dict):
                continue
            if leg.get("mode") != "WALK":
                continue

            steps = leg.get("steps", [])
            if not steps:
                continue

            for step in steps:
                if not isinstance(step, dict):
                    continue
                description = step.get("description", "")
                linestring = step.get("linestring", "")
                if "횡단보도" not in description:
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
                    waiting.append(wait)
                    total_wait += wait
                except (ValueError, IndexError) as e:
                    print(f"좌표 파싱 오류: {e}")
                    continue

        return total_wait
    except Exception as e:
        print(f"총 대기시간 계산 오류: {e}")
        return 0, []
