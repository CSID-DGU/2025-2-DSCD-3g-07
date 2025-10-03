import os

import requests
from dotenv import load_dotenv

load_dotenv()


def call_tmap_transit_api(
    start_x, start_y, end_x, end_y, count=1, lang=0, format="json"
):
    url = "https://apis.openapi.sk.com/transit/routes"
    headers = {
        "accept": "application/json",
        "appKey": os.getenv("TMAP_APPKEY"),
        "content-type": "application/json",
    }
    body = {
        "startX": start_x,
        "startY": start_y,
        "endX": end_x,
        "endY": end_y,
        "count": count,
        "lang": lang,
        "format": format,
    }
    response = requests.post(url, headers=headers, json=body)
    return response
