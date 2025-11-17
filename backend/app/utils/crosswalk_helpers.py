from typing import Dict
import pandas as pd


def crosswalk_wait_avg(real_coord):
    gyo = pd.read_csv('data/dongjak_crosswalk.csv')
    lat, lng = real_coord[0], real_coord[1]
    lst = []
    for i in range(len(gyo)):
        dist = (abs(lat - gyo.loc[i, 'lat']) ** 2 + abs(lng - gyo.loc[i, 'lng']) ** 2) ** 0.5
        lst.append(dist)
    idx = lst.index(min(lst))

    if min(lst) > 0.01:
        wait_avg = 0
    else:
        red, green = gyo.iloc[idx, -2], gyo.iloc[idx, -1]
        wait_avg = (green - 7 + red) ** 2 / 2

    return int(wait_avg)


def dongjak_waiting_time(itinerary: Dict) -> float:
    legs = itinerary.get("legs", [])
    total_wait = 0

    for leg in legs:
        if leg.get("mode") != "WALK":
            continue

        steps = leg.get("steps", [])
        result_coords = []

        for step in steps:
            if "횡단보도" in step["description"]:
                first_coord = step["linestring"].split()[0]
                lng, lat = map(float, first_coord.split(','))
                result_coords.append((lat, lng))

        waiting_avg = []
        for coord in result_coords:
            wait_avg = crosswalk_wait_avg(coord)
            waiting_avg.append(wait_avg)

        total_wait += sum(waiting_avg)

    return float(total_wait)  # 항상 float 반환
