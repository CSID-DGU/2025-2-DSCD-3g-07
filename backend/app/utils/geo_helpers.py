"""
지리적 계산을 위한 유틸리티 함수들
"""
import math
from typing import Dict, List, Tuple


def parse_coord(coord_str: str) -> Dict[str, float]:
    """
    좌표 문자열을 파싱하여 딕셔너리로 반환
    
    Args:
        coord_str: "경도,위도" 형식의 문자열 (예: "127.00001,37.557808")
    
    Returns:
        {'lon': float, 'lat': float} 형식의 딕셔너리
    """
    try:
        lon, lat = coord_str.split(',')
        return {
            'lon': float(lon),
            'lat': float(lat)
        }
    except (ValueError, AttributeError) as e:
        raise ValueError(f"잘못된 좌표 형식입니다: {coord_str}") from e


def haversine(coord1: Dict[str, float], coord2: Dict[str, float]) -> float:
    """
    두 좌표 간의 거리를 Haversine 공식으로 계산 (미터 단위)
    
    Args:
        coord1: {'lon': float, 'lat': float} 첫 번째 좌표
        coord2: {'lon': float, 'lat': float} 두 번째 좌표
    
    Returns:
        두 지점 간의 거리 (미터)
    
    Examples:
        >>> coord1 = {'lon': 127.0, 'lat': 37.5}
        >>> coord2 = {'lon': 127.001, 'lat': 37.501}
        >>> distance = haversine(coord1, coord2)
        >>> print(f"{distance:.2f}m")
    """
    # 지구 반지름 (미터)
    R = 6371000
    
    # 위도, 경도를 라디안으로 변환
    lat1_rad = math.radians(coord1['lat'])
    lat2_rad = math.radians(coord2['lat'])
    delta_lat = math.radians(coord2['lat'] - coord1['lat'])
    delta_lon = math.radians(coord2['lon'] - coord1['lon'])
    
    # Haversine 공식
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    
    return distance


def parse_linestring(linestring: str) -> List[Dict[str, float]]:
    """
    linestring을 좌표 리스트로 파싱
    
    Args:
        linestring: 공백으로 구분된 "경도,위도" 형식의 문자열
                   예: "127.00001,37.557808 126.99967,37.55789"
    
    Returns:
        [{'lon': float, 'lat': float}, ...] 형식의 리스트
    """
    if not linestring or not linestring.strip():
        return []
    
    coords = []
    for coord_str in linestring.strip().split():
        try:
            coords.append(parse_coord(coord_str))
        except ValueError:
            # 잘못된 좌표는 건너뛰기
            continue
    
    return coords


def calculate_distance(coords: List[Dict[str, float]]) -> float:
    """
    좌표 리스트의 전체 거리를 계산
    
    Args:
        coords: [{'lon': float, 'lat': float}, ...] 형식의 좌표 리스트
    
    Returns:
        전체 경로의 거리 (미터)
    """
    if len(coords) < 2:
        return 0.0
    
    total_distance = 0.0
    for i in range(len(coords) - 1):
        total_distance += haversine(coords[i], coords[i + 1])
    
    return total_distance


def get_midpoint(coord1: Dict[str, float], coord2: Dict[str, float]) -> Dict[str, float]:
    """
    두 좌표의 중간점을 계산
    
    Args:
        coord1: 첫 번째 좌표
        coord2: 두 번째 좌표
    
    Returns:
        중간 지점의 좌표
    """
    return {
        'lon': (coord1['lon'] + coord2['lon']) / 2,
        'lat': (coord1['lat'] + coord2['lat']) / 2
    }


def coords_to_latlng_string(coords: List[Dict[str, float]]) -> str:
    """
    좌표 리스트를 Google Elevation API 형식의 문자열로 변환
    
    Args:
        coords: [{'lon': float, 'lat': float}, ...] 형식의 좌표 리스트
    
    Returns:
        "lat,lng|lat,lng|..." 형식의 문자열
    """
    return '|'.join([f"{coord['lat']},{coord['lon']}" for coord in coords])
