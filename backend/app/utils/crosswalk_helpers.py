import pandas as pd
import os
import requests


def get_crosswalk_direction1(lat1, lng1, lat2, lng2):
    """
    4방향 기준 판단 (동, 서, 남, 북)
    반환값: tdata에서 쓰는 key 중 st, nt, wt, et
    """
    dy = lat2 - lat1
    dx = lng2 - lng1

    if abs(dx) > abs(dy):  # 수평 이동이 더 크면 동서
        return 'et' if dx < 0 else 'wt'
    else:  # 수직 이동이 더 크면 남북
        return 'st' if dy < 0 else 'nt'


def get_crosswalk_direction2(lat1, lng1, lat2, lng2):
    """
    8방향 판단 (NE, NW, SE, SW) - 4방위 실패 시
    반환값: tdata에서 쓰는 key 중 ne, nw, se, sw
    """
    dy = lat2 - lat1
    dx = lng2 - lng1

    if dx < 0 and dy < 0:
        return 'ne'
    elif dx > 0 and dy < 0:
        return 'nw'
    elif dx < 0 and dy > 0:
        return 'se'
    elif dx > 0 and dy > 0:
        return 'sw'
    else:
        # 수평/수직 이동이 0이면 fallback
        return None


def tdata(itst_id, direction):
    # 최초 호출 시 자동 초기화
    if not hasattr(tdata, "error_count"):
        tdata.error_count = {}
    key = str(itst_id)
    if key not in tdata.error_count:
        tdata.error_count[key] = 0
    # 실패 2회 이상이면 즉시 0 반환
    if tdata.error_count[key] >= 2:
        return 0
    url = "http://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseInformation/1.0"
    params = {
        "apiKey": os.getenv("TDATA_API_KEY"),
        "itstId": itst_id,
        "numOfRows": 1,
        "pageNo": 1,
        "type": "json"
    }

    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()  # HTTP 오류 체크
        data = resp.json()[0]
    except requests.RequestException as e:
        tdata.error_count[key] += 1
        print("HTTP 요청 실패:", e)
        return 0
    except (ValueError, IndexError, KeyError) as e:
        print("JSON 처리 실패:", e)
        return 0

    state_key = f"{direction}PdsgStatNm"
    state = data.get(state_key)
    if not state:
        return 0

    if state == "stop-And-Remain":
        url2 = "http://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingInformation/1.0"
        try:
            resp2 = requests.get(url2, params=params)
            resp2.raise_for_status()
            data2 = resp2.json()[0]
        except requests.RequestException as e:
            tdata.error_count[key] += 1
            print("HTTP 요청 실패:", e)
            return 0
        except (ValueError, IndexError, KeyError) as e:
            print("JSON 처리 실패:", e)
            return 0

        time_key = f"{direction}PdsgRmdrCs"
        raw_value = data2.get(time_key)
        if raw_value is None:
            return 0
        if raw_value >= 2400:
            return 0

        try:
            return int(raw_value) / 10
        except ValueError as e:
            print("int 변환 실패:", e)
            return 0

    # stop-And-Remain이 아닌 경우
    return 0


def crosswalk_wait_avg(real_coord):
    """횡단보도 대기 시간 계산 - 안전한 반환값 보장"""
    try:
        gyo = pd.read_csv('data/crosswalk_list.csv')
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
        if gyo.iloc[idx, 0] > 0:
            itst_id = int(gyo.iloc[idx, 0])
            direction = get_crosswalk_direction1(lat1, lng1, lat2, lng2)
            wait_avg = tdata(itst_id, direction)
            if wait_avg == 0:
                direction_alt = get_crosswalk_direction2(lat1, lng1, lat2, lng2)
                wait_avg = tdata(itst_id, direction_alt)
        else:
            red, green = gyo.iloc[idx, -2], gyo.iloc[idx, -1]
            # 음수 방지
            if red <= 0 or green <= 0:
                return 0
            green_blink = max(0, (green - 7) / 1.3)
            denominator = red + green
            if denominator == 0:
                return 0
            wait_avg = (red - green_blink) ** 2 / (2 * denominator)

        # 음수나 비정상적인 값 방지
        result = max(0, int(wait_avg))
        return result
    except Exception as e:
        print(f"횡단보도 대기시간 계산 오류: {e}")
        return 0


def crosswalk_waiting_time(itinerary):
    """총 대기 시간 계산 - None-safe 처리"""
    try:
        if not itinerary or not isinstance(itinerary, dict):
            return 0, []
        legs = itinerary.get("legs", [])
        total_wait = 0
        waiting_avg = []

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

                try:
                    coords = linestring.split()
                    if len(coords) < 2:
                        continue
                    first_coord = coords[0]
                    last_coord = coords[-1]
                    lng1, lat1 = map(float, first_coord.split(','))
                    lng2, lat2 = map(float, last_coord.split(','))
                    wait_avg = crosswalk_wait_avg((lat1, lng1, lat2, lng2))
                    waiting_avg.append(wait_avg)
                    total_wait += wait_avg
                except (ValueError, IndexError) as e:
                    print(f"좌표 파싱 오류: {e}")
                    continue

        return total_wait
    except Exception as e:
        print(f"총 대기시간 계산 오류: {e}")
        return 0, []
