"""
고도 및 경사도 분석을 위한 헬퍼 함수들
Google Elevation API를 사용하여 경로의 경사도를 계산합니다.

보행 속도 모델: Tobler's Hiking Function (1993)
- 출처: Tobler, W. (1993). "Three presentations on geographical analysis and modeling"
- 공식: W = 6 * exp(-3.5 * |S + 0.05|) km/h
- 실증 데이터 기반의 과학적 모델로 오르막/내리막을 모두 고려

통합 계산: Factors_Affecting_Walking_Speed.py 사용
- Tmap 기준값(1.0)에 사용자 속도, 경사도, 날씨 계수를 모두 적용
"""

import math
import os
from typing import Dict, List, Optional, Tuple

import aiohttp

from .Factors_Affecting_Walking_Speed import get_integrator
from .geo_helpers import coords_to_latlng_string, haversine, parse_linestring
from .crosswalk_helpers import dongjak_waiting_time

# 경사도별 속도 계수 (참고용 - 실제로는 Tobler's Function 사용)
# Tobler's Function은 연속적인 값을 반환하므로 더 정확함
SLOPE_SPEED_FACTORS_REFERENCE = {
    "flat": 1.0,  # 0%: 평지 (5.0 km/h)
    "gentle_up": 0.84,  # 3%: 완만한 오르막 (4.2 km/h)
    "gentle_down": 1.08,  # -3%: 완만한 내리막 (5.4 km/h)
    "moderate_up": 0.65,  # 10%: 보통 오르막 (3.25 km/h)
    "moderate_down": 0.92,  # -10%: 보통 내리막 (4.6 km/h)
    "steep_up": 0.42,  # 20%: 가파른 오르막 (2.1 km/h)
    "steep_down": 0.65,  # -20%: 가파른 내리막 (3.25 km/h)
}

# Google Elevation API 설정
GOOGLE_ELEVATION_API_URL = "https://maps.googleapis.com/maps/api/elevation/json"
MAX_COORDINATES_PER_REQUEST = 512  # Google API 제한


def count_crosswalks(itinerary: Dict) -> int:
    """
    Tmap API 응답에서 횡단보도 개수를 카운팅

    Args:
        itinerary: Tmap API의 itinerary 데이터 또는 GeoJSON features

    Returns:
        경로 상의 총 횡단보도 개수

    참고:
        Tmap Pedestrian API의 turnType:
        - 211: 횡단보도
        - 214: 8시 방향 횡단보도
        - 215: 10시 방향 횡단보도
        - 216: 2시 방향 횡단보도
        - 217: 4시 방향 횡단보도
    """
    total_count = 0

    # GeoJSON features가 직접 전달된 경우
    if isinstance(itinerary, list):
        features = itinerary
        for feature in features:
            if (
                feature.get("type") == "Feature"
                and feature.get("geometry", {}).get("type") == "Point"
            ):
                turn_type = feature.get("properties", {}).get("turnType")
                # 횡단보도 관련 turnType 체크
                if turn_type in [211, 214, 215, 216, 217]:
                    total_count += 1
        return total_count

    # 기존 itinerary 구조 처리
    legs = itinerary.get("legs", [])
    for leg in legs:
        # WALK 모드만 검사
        if leg.get("mode") != "WALK":
            continue

        # steps에서 turnType 확인
        steps = leg.get("steps", [])
        for step in steps:
            turn_type = step.get("turnType")
            if turn_type in [211, 214, 215, 216, 217]:
                total_count += 1

            # 하위 호환성: description에서도 검사
            description = step.get("description", "")
            # 한 description에 여러 개의 횡단보도가 있을 수 있음
            total_count += description.count("횡단보도")

    return total_count


def count_total_coordinates(walk_legs: List[Dict]) -> int:
    """
    전체 보행 구간의 좌표 수를 계산

    Args:
        walk_legs: mode가 'WALK'인 leg 리스트

    Returns:
        전체 좌표 개수
    """
    total = 0
    for leg in walk_legs:
        if "steps" in leg:
            for step in leg["steps"]:
                coords = step["linestring"].split()
                total += len(coords)
        elif "passShape" in leg:
            coords = leg["passShape"]["linestring"].split()
            total += len(coords)
    return total


def smart_sample_coordinates(
    linestring: str, target_points: int, distance: float
) -> List[Dict[str, float]]:
    """
    거리 기반 적응형 샘플링 (20m 간격)

    Args:
        linestring: 좌표 문자열
        target_points: 목표 샘플 개수 (참고용, 실제로는 거리 기반)
        distance: 구간 거리 (미터)

    Returns:
        샘플링된 좌표 리스트
    """
    coords = parse_linestring(linestring)

    if not coords:
        return []

    # 10m 간격으로 샘플링 (높은 정확도)
    SAMPLE_INTERVAL_M = 10.0

    # 필요한 샘플 개수 계산 (올림 처리로 중간 샘플 보장)
    needed_samples = max(2, math.ceil(distance / SAMPLE_INTERVAL_M) + 1)

    # 좌표가 필요한 샘플보다 적으면 그대로 반환
    if len(coords) <= needed_samples:
        return coords

    # 시작점과 끝점은 항상 포함
    if needed_samples == 2:
        return [coords[0], coords[-1]]

    sampled = [coords[0]]

    # 각 좌표 간 실제 거리 계산하여 누적 거리 배열 생성
    cumulative_distances = [0.0]
    for i in range(1, len(coords)):
        dist = haversine(coords[i - 1], coords[i])
        cumulative_distances.append(cumulative_distances[-1] + dist)

    total_distance = cumulative_distances[-1]

    # 10m 간격으로 샘플링할 목표 거리들
    target_distances = []
    current_distance = SAMPLE_INTERVAL_M
    while current_distance < total_distance:
        target_distances.append(current_distance)
        current_distance += SAMPLE_INTERVAL_M

    # 각 목표 거리에 가장 가까운 좌표 선택
    for target_dist in target_distances:
        # 목표 거리에 가장 가까운 인덱스 찾기
        closest_idx = 0
        min_diff = float('inf')
        
        for i, cum_dist in enumerate(cumulative_distances):
            diff = abs(cum_dist - target_dist)
            if diff < min_diff:
                min_diff = diff
                closest_idx = i
            elif diff > min_diff:
                # 이미 최소값을 지나쳤으므로 종료
                break
        
        # 중복 방지
        if closest_idx > 0 and coords[closest_idx] != sampled[-1]:
            sampled.append(coords[closest_idx])

    # 끝점 추가 (중복 방지)
    if coords[-1] != sampled[-1]:
        sampled.append(coords[-1])

    return sampled


def optimize_all_coordinates(
    walk_legs: List[Dict]
) -> Dict:
    """
    보행 구간의 좌표를 수집 (샘플링 없이 Tmap 원본 사용)

    Args:
        walk_legs: 보행 구간 리스트

    Returns:
        좌표 데이터와 메타정보
    
    Note:
        - Tmap API가 제공하는 좌표를 그대로 사용 (최적화된 간격)
        - API 호출 시 250개씩 자동 배치 처리
        - GPS 오차 필터링은 adjust_walking_time에서 처리
    """
    # 각 leg의 거리와 좌표 수 분석
    leg_info = []
    total_distance = 0
    total_coords = 0

    for leg in walk_legs:
        leg_distance = leg.get("distance", 0)

        if "steps" in leg:
            leg_coords = sum(len(step["linestring"].split()) for step in leg["steps"])
            steps = leg["steps"]
        elif "passShape" in leg:
            leg_coords = len(leg["passShape"]["linestring"].split())
            # passShape를 steps 형식으로 변환
            steps = [
                {"linestring": leg["passShape"]["linestring"], "distance": leg_distance}
            ]
        else:
            continue

        leg_info.append(
            {
                "leg": leg,
                "distance": leg_distance,
                "original_coords": leg_coords,
                "steps": steps,
            }
        )
        total_distance += leg_distance
        total_coords += leg_coords

    print(f"[좌표 수집] 원본 좌표: {total_coords}개 (샘플링 없이 그대로 사용)")
    print(f"[좌표 수집] 총 거리: {total_distance:.0f}m")
    print(f"[좌표 수집] 평균 간격: {total_distance/total_coords:.1f}m" if total_coords > 0 else "[좌표 수집] 평균 간격: N/A")

    if total_distance == 0:
        return {"legs": [], "total_sampled_coords": 0}

    # Tmap 좌표를 그대로 수집 (샘플링 없음)
    result = {
        "legs": [],
        "total_sampled_coords": 0,
        "original_coords": total_coords,
    }
    
    for info in leg_info:
        step_coords = []
        for i, step in enumerate(info["steps"]):
            coords = parse_linestring(step["linestring"])
            step_coords.append(
                {
                    "step_index": i,
                    "coords": coords,
                    "distance": step.get("distance", 0),
                }
            )
        
        result["legs"].append(
            {
                "leg_data": info["leg"],
                "steps_coords": step_coords,
                "total_coords": sum(len(s["coords"]) for s in step_coords),
            }
        )
        result["total_sampled_coords"] += sum(len(s["coords"]) for s in step_coords)
    
    print(f"[좌표 수집] 최종 좌표: {result['total_sampled_coords']}개")
    
    # 배치 처리 예상 정보
    batch_count = (result['total_sampled_coords'] + 249) // 250
    if batch_count > 1:
        print(f"[좌표 수집] 배치 처리 예정: {batch_count}개 배치 (250개씩)")
    
    return result


async def call_google_elevation_api(
    coords: List[Dict[str, float]], api_key: str
) -> List[float]:
    """
    Google Elevation API를 호출하여 고도 데이터를 가져옴 (배치 처리 지원)

    Args:
        coords: [{'lon': float, 'lat': float}, ...] 형식의 좌표 리스트
        api_key: Google API 키

    Returns:
        고도 값 리스트 (미터 단위)

    Raises:
        Exception: API 호출 실패 시
    
    Note:
        좌표가 250개를 초과하면 자동으로 배치 처리하여 여러 번 API 호출
    """
    if not coords:
        return []

    # 250개씩 배치 처리
    MAX_PER_BATCH = 250
    
    if len(coords) <= MAX_PER_BATCH:
        # 단일 요청
        locations = coords_to_latlng_string(coords)
        params = {"locations": locations, "key": api_key}

        async with aiohttp.ClientSession() as session:
            async with session.get(GOOGLE_ELEVATION_API_URL, params=params) as response:
                data = await response.json()

                if data.get("status") != "OK":
                    error_message = data.get("error_message", data.get("status"))
                    raise Exception(f"Google Elevation API 오류: {error_message}")

                elevations = [result["elevation"] for result in data.get("results", [])]
                return elevations
    
    # 배치 처리: 250개씩 나눠서 여러 번 호출
    print(f"[배치 처리] 총 {len(coords)}개 좌표를 {math.ceil(len(coords) / MAX_PER_BATCH)}개 배치로 분할")
    
    all_elevations = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(0, len(coords), MAX_PER_BATCH):
            batch = coords[i:i + MAX_PER_BATCH]
            batch_num = (i // MAX_PER_BATCH) + 1
            
            print(f"  배치 {batch_num}: {len(batch)}개 좌표 요청 중...")
            
            locations = coords_to_latlng_string(batch)
            params = {"locations": locations, "key": api_key}
            
            async with session.get(GOOGLE_ELEVATION_API_URL, params=params) as response:
                data = await response.json()
                
                if data.get("status") != "OK":
                    error_message = data.get("error_message", data.get("status"))
                    raise Exception(f"Google Elevation API 오류 (배치 {batch_num}): {error_message}")
                
                elevations = [result["elevation"] for result in data.get("results", [])]
                all_elevations.extend(elevations)
                
                print(f"  배치 {batch_num}: ✅ {len(elevations)}개 고도 데이터 수신")
    
    print(f"[배치 처리] 완료: 총 {len(all_elevations)}개 고도 데이터")
    return all_elevations


def calculate_slope(elevation1: float, elevation2: float, distance: float) -> float:
    """
    두 지점 간의 경사도를 계산 (%)

    Args:
        elevation1: 첫 번째 지점의 고도 (미터)
        elevation2: 두 번째 지점의 고도 (미터)
        distance: 두 지점 간의 거리 (미터)

    Returns:
        경사도 (%), 양수면 오르막, 음수면 내리막
    """
    if distance == 0:
        return 0.0

    elevation_diff = elevation2 - elevation1
    slope = (elevation_diff / distance) * 100

    return slope


def validate_slope_data(segment_analysis: List[Dict]) -> Dict[str, any]:
    """
    경사도 데이터의 품질을 검증하고 통계를 반환

    Args:
        segment_analysis: 세그먼트별 분석 결과

    Returns:
        검증 결과 및 통계
    """
    if not segment_analysis:
        return {"is_valid": True, "warnings": [], "extreme_segments": []}

    slopes = [seg["slope"] for seg in segment_analysis]
    warnings = []
    extreme_segments = []

    # 극단값 검사 (±60% 초과)
    for i, seg in enumerate(segment_analysis):
        if abs(seg["slope"]) > 60:
            extreme_segments.append(
                {
                    "index": i,
                    "slope": seg["slope"],
                    "distance": seg["distance"],
                    "elevation_dif": seg["elevation_dif"],
                }
            )
            warnings.append(
                f"세그먼트 {i}: 극단 경사 {seg['slope']:.1f}% "
                f"(거리: {seg['distance']:.1f}m, 고도차: {seg['elevation_dif']:.1f}m)"
            )

    # 통계
    abs_slopes = [abs(s) for s in slopes]

    return {
        "is_valid": len(extreme_segments) == 0,
        "warnings": warnings,
        "extreme_segments": extreme_segments,
        "stats": {
            "max_abs_slope": max(abs_slopes, default=0),
            "extreme_count": len(extreme_segments),
            "total_segments": len(segment_analysis),
        },
    }


def calculate_slope_factor(slope_percent: float, cap_extreme: bool = True) -> float:
    """
    Tobler's Hiking Function (1993)을 사용한 경사도별 보행 속도 계수 계산

    출처: Tobler, W. (1993). "Three presentations on geographical analysis and modeling"
          NCGIA Technical Report 93-1, Figure II

    공식: W = 6 * exp(-3.5 * |(S + 0.05)|)
    where S = slope = tan(theta) = slope_percent / 100

    핵심: -5% 내리막에서 최대 속도 6 km/h
          내리막도 너무 가파르면 속도 감소 (안전상 이유)

    Args:
        slope_percent: 경사도 (%)
                      양수 = 오르막 (예: 10은 10% 오르막)
                      음수 = 내리막 (예: -10은 10% 내리막)
                      0 = 평지
        cap_extreme: 극단값 제한 여부 (기본값 True)
                    True이면 ±70%로 제한하여 데이터 오류 영향 최소화

    Returns:
        float: 속도 계수 (평지 1.0 기준)

    Examples:
        >>> calculate_slope_factor(0)     # 평지
        1.007
        >>> calculate_slope_factor(-5)    # -5% 내리막 (최적)
        1.200
        >>> calculate_slope_factor(-10)   # -10% 내리막
        1.007
        >>> calculate_slope_factor(10)    # 10% 오르막
        0.710
        >>> calculate_slope_factor(-80)   # 극단값, cap_extreme=True
        0.095  # -70%로 제한됨

    Note:
        극단적인 경사도 (±70% 이상)는 데이터 오류일 가능성이 있으므로
        실제 사용 시 검증이 필요합니다.
        cap_extreme=True를 사용하면 ±70%로 자동 제한됩니다.
    """
    # 극단값 제한 (데이터 오류 방지)
    if cap_extreme:
        original_slope = slope_percent
        slope_percent = max(-70, min(70, slope_percent))
        if abs(original_slope - slope_percent) > 0.1:
            import warnings

            warnings.warn(
                f"극단 경사도 {original_slope:.1f}%를 {slope_percent:.1f}%로 제한했습니다 "
                "(데이터 오류 가능성)",
                UserWarning,
            )

    # 극단값 경고 (로깅용)
    if abs(slope_percent) > 60:
        import warnings

        warnings.warn(
            f"극단적인 경사도 감지: {slope_percent:.1f}% - 데이터 오류 가능성 확인 필요",
            UserWarning,
        )

    # 경사(%)를 tan(θ)로 변환
    S = slope_percent / 100

    # Tobler's 공식: W = 6 * exp(-3.5 * |(S + 0.05)|)
    # 절댓값은 (S + 0.05) 전체에 적용
    velocity_kmh = 6 * math.exp(-3.5 * abs(S + 0.05))

    # 평지 속도(5 km/h) 대비 계수로 변환
    speed_factor = velocity_kmh / 5.0

    return speed_factor


def adjust_walking_time(
    leg_data: Dict, elevations: List[float], steps_coords: List[Dict]
) -> Tuple[int, List[Dict]]:
    """
    경사도를 반영한 실제 보행 시간을 계산

    Args:
        leg_data: 보행 구간 데이터
        elevations: 고도 값 리스트
        steps_coords: 각 step의 샘플링된 좌표 정보

    Returns:
        (보정된 시간(초), 각 구간의 상세 분석 정보)
    """
    total_adjusted_time = 0
    original_time = leg_data.get("sectionTime", 0)
    distance = leg_data.get("distance", 0)

    # 기본 보행 속도 계산 (m/s)
    base_speed = distance / original_time if original_time > 0 else 1.4

    segment_analysis = []
    elevation_idx = 0
    
    # 최소 거리 필터용 누적 버퍼
    MIN_SEGMENT_DISTANCE = 10.0  # 10m 미만 구간은 합침 (GPS 오차 최소화)
    accumulated_distance = 0.0
    accumulated_elevation_diff = 0.0
    segment_start_idx = 0
    segment_start_coord = None

    for step_info in steps_coords:
        coords = step_info["coords"]
        step_distance = step_info["distance"]

        for i in range(len(coords) - 1):
            if elevation_idx + 1 >= len(elevations):
                break

            # 두 지점 간 거리 및 고도차
            segment_distance = haversine(coords[i], coords[i + 1])
            elevation_diff = elevations[elevation_idx + 1] - elevations[elevation_idx]
            
            # 첫 구간이면 시작점 설정
            if accumulated_distance == 0:
                segment_start_idx = elevation_idx
                segment_start_coord = coords[i]
            
            # 거리 및 고도차 누적
            accumulated_distance += segment_distance
            accumulated_elevation_diff += elevation_diff
            
            # 누적 거리가 최소 거리 이상이면 구간 계산
            if accumulated_distance >= MIN_SEGMENT_DISTANCE or i == len(coords) - 2:
                # 경사도 계산 (누적값 사용)
                slope = calculate_slope(
                    elevations[segment_start_idx],
                    elevations[elevation_idx + 1],
                    accumulated_distance,
                )

                # Google Elevation API 데이터를 신뢰 - 보정하지 않음
                # 극단 경사도가 있어도 실제 계단/급경사일 수 있으므로 그대로 사용

                # 극단 경사도 감지 및 로깅 (30% 이상)
                if abs(slope) > 30:
                    print(f"⚠️ [극단 경사도 감지]")
                    print(f"   위치: 좌표 {segment_start_idx} → {elevation_idx + 1}")
                    print(f"   좌표: ({segment_start_coord.get('lat', 0):.6f}, {segment_start_coord.get('lon', 0):.6f})")
                    print(f"   누적 거리: {accumulated_distance:.1f}m (최소 필터: {MIN_SEGMENT_DISTANCE}m)")
                    print(f"   경사도: {slope:.1f}% ({'오르막' if slope > 0 else '내리막'})")
                    print(f"   고도: {elevations[segment_start_idx]:.2f}m → {elevations[elevation_idx + 1]:.2f}m (차이: {accumulated_elevation_diff:.2f}m)")
                    print(f"   속도 계수: {calculate_slope_factor(slope):.3f}")

                # 속도 보정 (Tobler's Hiking Function - 부호로 오르막/내리막 자동 구분)
                speed_factor = calculate_slope_factor(slope)
                adjusted_speed = base_speed * speed_factor
                segment_time = (
                    accumulated_distance / adjusted_speed if adjusted_speed > 0 else 0
                )

                total_adjusted_time += segment_time

                segment_analysis.append(
                    {
                        "distance": round(accumulated_distance, 2),
                        "elevation_start": round(elevations[segment_start_idx], 2),
                        "elevation_end": round(elevations[elevation_idx + 1], 2),
                        "elevation_dif": round(accumulated_elevation_diff, 2),
                        "slope": round(slope, 2),
                        "is_uphill": slope > 0,  # UI 표시용
                        "speed_factor": round(speed_factor, 3),
                        "time": round(segment_time, 1),
                        "coords_start": {"lat": segment_start_coord.get('lat', 0), "lon": segment_start_coord.get('lon', 0)},  # 디버깅용
                    }
                )
                
                # 누적값 초기화
                accumulated_distance = 0.0
                accumulated_elevation_diff = 0.0

            elevation_idx += 1

    return int(total_adjusted_time), segment_analysis


async def analyze_route_elevation(
    itinerary: Dict,
    api_key: Optional[str] = None,
    weather_data: Optional[Dict] = None,
    user_speed_mps: Optional[float] = None,
    crosswalk_count: int = 0,
) -> Dict:
    """
    전체 경로의 경사도를 분석하고 시간을 보정 (통합 계산)

    Args:
        itinerary: Tmap API의 itinerary 데이터
        api_key: Google Elevation API 키 (None이면 환경변수에서 가져옴)
        weather_data: 날씨 데이터 (선택사항)
            - temp_c: 기온 (°C)
            - pty: 강수형태 (0:없음, 1:비, 2:진눈깨비, 3:눈)
            - rain_mm_per_h: 시간당 강수량 (mm/h)
            - snow_cm_per_h: 시간당 신적설 (cm/h)
        user_speed_mps: 사용자 평균 보행속도 (m/s, Health Connect)
        crosswalk_count: 경로 상 횡단보도 개수 (기본값: 0)

    Returns:
        경사도 분석 결과 및 보정된 시간 정보 (모든 요인 통합)

    처리 흐름:
        1. Google Elevation API로 고도 데이터 획득
        2. 경사도 계산
        3. Factors_Affecting_Walking_Speed로 통합 계산
           - Tmap 기준 시간 (1.0)
           - × 사용자 속도 계수 (Health Connect)
           - × 경사도 계수 (Tobler's Function)
           - × 날씨 계수 (WeatherSpeedModel)
        4. 횡단보도 대기 시간 추가 (개당 116초, 중앙값 기준)
    """
    if api_key is None:
        api_key = os.getenv("GOOGLE_ELEVATION_API_KEY")

    if not api_key:
        raise ValueError("Google Elevation API 키가 설정되지 않았습니다.")

    # 통합 계산기 초기화
    integrator = get_integrator()

    # 모든 leg 가져오기
    all_legs = itinerary.get("legs", [])

    # ===== 중요: 모든 WALK leg의 sectionTime을 4km/h 기준으로 재계산 =====
    # Tmap API가 반환한 시간이 아닌, 거리를 4km/h로 나눈 기준 시간 사용
    # 이후 사용자 속도, 경사도, 날씨로 보정
    tmap_base_speed_mps = 1.111  # 4 km/h = 1.111 m/s (Tmap 기준)

    print("\n[🔄 4km/h 기준 재계산]")
    for leg in all_legs:
        if leg.get("mode") == "WALK":
            original_time = leg.get("sectionTime", 0)
            distance = leg.get("distance", 0)

            # 4km/h 기준으로 재계산
            recalculated_time = (
                int(distance / tmap_base_speed_mps)
                if tmap_base_speed_mps > 0 and distance > 0
                else original_time
            )

            # leg의 sectionTime을 재계산된 값으로 업데이트
            leg["sectionTime"] = recalculated_time

            print(
                f"  {leg.get('start', {}).get('name', '')} → {leg.get('end', {}).get('name', '')}"
            )
            print(f"    거리: {distance}m")
            print(
                f"    API 원본: {original_time}초 ({original_time//60}분 {original_time%60}초)"
            )
            print(
                f"    4km/h 재계산: {recalculated_time}초 ({recalculated_time//60}분 {recalculated_time%60}초)"
            )

    # WALK 모드인 leg 분류: 실외 보행 vs 환승(실내) 보행
    outdoor_walk_legs = []  # 경사도 + 날씨 적용
    transfer_walk_legs = []  # 사용자 속도만 적용

    for i, leg in enumerate(all_legs):
        if leg.get("mode") == "WALK":
            # 이전 leg과 다음 leg 확인
            prev_leg = all_legs[i - 1] if i > 0 else None
            next_leg = all_legs[i + 1] if i < len(all_legs) - 1 else None

            # 환승 구간 판단: 앞뒤가 모두 대중교통(지하철, 버스)이면 환승(실내)으로 간주
            is_transfer = (
                prev_leg
                and prev_leg.get("mode") in ["SUBWAY", "BUS", "TRAIN"]
                and next_leg
                and next_leg.get("mode") in ["SUBWAY", "BUS", "TRAIN"]
            )

            if is_transfer:
                transfer_walk_legs.append(leg)
                print(
                    f"[경사도 분석] 환승(실내) 구간: {leg.get('start', {}).get('name', '')} → {leg.get('end', {}).get('name', '')} (거리: {leg.get('distance', 0)}m, 재계산 시간: {leg.get('sectionTime', 0)}초) - 사용자 속도만 적용"
                )
            else:
                outdoor_walk_legs.append(leg)

    walk_legs = outdoor_walk_legs  # 경사도 분석 대상

    if not walk_legs:
        return {
            "error": "보행 구간이 없습니다.",
            "walk_legs_analysis": [],
            "total_original_walk_time": 0,
            "total_adjusted_walk_time": 0,
            "total_route_time_adjustment": 0,
            "user_speed_mps": user_speed_mps,
            "weather_applied": weather_data is not None,
            "factors": {
                "user_speed_factor": 1.0,
                "slope_factor": 1.0,
                "weather_factor": 1.0,
                "final_factor": 1.0,
            },
        }

    # 좌표 수집 (샘플링 없이 Tmap 원본 사용)
    optimized = optimize_all_coordinates(walk_legs)

    print(f"[경사도 분석] 원본 좌표: {optimized['original_coords']}개")
    print(f"[경사도 분석] 사용 좌표: {optimized['total_sampled_coords']}개")

    # 모든 좌표를 하나의 리스트로 결합
    all_coords = []
    coord_map = []

    for leg_idx, leg_data in enumerate(optimized["legs"]):
        for step_data in leg_data["steps_coords"]:
            start_idx = len(all_coords)
            all_coords.extend(step_data["coords"])
            coord_map.append(
                {
                    "leg_idx": leg_idx,
                    "step_idx": step_data["step_index"],
                    "start": start_idx,
                    "end": len(all_coords),
                    "distance": step_data["distance"],
                    "coords": step_data["coords"],
                }
            )

    # Google Elevation API 호출
    try:
        elevations = await call_google_elevation_api(all_coords, api_key)
    except Exception as e:
        return {
            "error": f"고도 데이터 획득 실패: {str(e)}",
            "walk_legs_analysis": [],
            "total_original_walk_time": sum(
                leg.get("sectionTime", 0) for leg in walk_legs
            ),
            "total_adjusted_walk_time": sum(
                leg.get("sectionTime", 0) for leg in walk_legs
            ),
            "total_route_time_adjustment": 0,
            "user_speed_mps": user_speed_mps,
            "weather_applied": weather_data is not None,
            "factors": {
                "user_speed_factor": 1.0,
                "slope_factor": 1.0,
                "weather_factor": 1.0,
                "final_factor": 1.0,
            },
        }

    # 각 leg별 분석
    analysis = []
    total_adjusted_time = 0
    elevation_offset = 0

    for leg_idx, leg_data_obj in enumerate(optimized["legs"]):
        leg = leg_data_obj["leg_data"]
        steps_coords = leg_data_obj["steps_coords"]

        # 이 leg의 고도 데이터 개수
        leg_elevation_count = sum(len(s["coords"]) for s in steps_coords)
        leg_elevations = elevations[
            elevation_offset : elevation_offset + leg_elevation_count
        ]

        # 원본 Tmap 시간
        original_time = leg.get("sectionTime", 0)

        # 경사도 기반 시간 계산 (Tobler's Function만 적용)
        slope_based_time, segment_analysis = adjust_walking_time(
            leg, leg_elevations, steps_coords
        )

        # 거리 가중 평균 경사도 계산
        if segment_analysis:
            total_distance = sum(seg["distance"] for seg in segment_analysis)
            if total_distance > 0:
                weighted_slope_sum = sum(
                    seg["slope"] * seg["distance"] for seg in segment_analysis
                )
                avg_slope = weighted_slope_sum / total_distance
            else:
                slopes = [seg["slope"] for seg in segment_analysis]
                avg_slope = sum(slopes) / len(slopes) if slopes else 0

            slopes = [seg["slope"] for seg in segment_analysis]
            max_slope = max(slopes, default=0)
            min_slope = min(slopes, default=0)
            
            # 극단 경사도 요약 로그
            extreme_slopes = [seg for seg in segment_analysis if abs(seg["slope"]) > 30]
            if extreme_slopes:
                print(f"\n📊 [경사도 요약 - {leg.get('start', {}).get('name', '')} → {leg.get('end', {}).get('name', '')}]")
                print(f"   거리 가중 평균 경사도: {avg_slope:.2f}%")
                print(f"   최대 경사도: {max_slope:.2f}%")
                print(f"   최소 경사도: {min_slope:.2f}%")
                print(f"   극단 구간 수 (±30% 초과): {len(extreme_slopes)}개 / 총 {len(segment_analysis)}개")
                total_extreme_distance = sum(seg["distance"] for seg in extreme_slopes)
                print(f"   극단 구간 거리: {total_extreme_distance:.1f}m / 총 {total_distance:.1f}m ({total_extreme_distance/total_distance*100:.1f}%)")
        else:
            avg_slope = 0
            max_slope = 0
            min_slope = 0

        # === 통합 계산: Tmap 기준 × 사용자 속도 × 경사도 × 날씨 ===
        speed_factors = integrator.calculate_integrated_time(
            tmap_base_time=original_time,
            user_speed_mps=user_speed_mps,
            average_slope_percent=avg_slope,
            weather_data=weather_data,
        )

        final_adjusted_time = int(speed_factors.adjusted_time)
        total_adjusted_time += final_adjusted_time

        # 데이터 품질 검증
        validation = validate_slope_data(segment_analysis)

        analysis.append(
            {
                "leg_index": leg_idx,
                "start_name": leg.get("start", {}).get("name", ""),
                "end_name": leg.get("end", {}).get("name", ""),
                "distance": leg.get("distance", 0),
                "original_time": original_time,  # Tmap 기준
                "slope_only_time": slope_based_time,  # 경사도만 적용
                "adjusted_time": final_adjusted_time,  # 모든 요인 적용
                "time_dif": final_adjusted_time - original_time,
                # 개별 계수들
                "user_speed_factor": speed_factors.user_speed_factor,
                "slope_factor": speed_factors.slope_factor,
                "weather_factor": speed_factors.weather_factor,
                "final_factor": speed_factors.final_factor,
                # 경사도 정보
                "avg_slope": round(avg_slope, 2),
                "max_slope": round(max_slope, 2),
                "min_slope": round(min_slope, 2),
                "segments": segment_analysis[:10],  # 처음 10개 세그먼트만 포함 (UI용)
                "data_quality": {
                    "is_valid": validation["is_valid"],
                    "warnings": validation["warnings"],
                    "extreme_count": validation["stats"]["extreme_count"],
                },
            }
        )

        elevation_offset += leg_elevation_count

    # === 환승(실내) 구간 처리: 사용자 속도만 적용 ===
    transfer_adjusted_time = 0
    transfer_analysis = []

    if transfer_walk_legs:
        print("\n[🚇 환승(실내) 구간 처리]")
        for idx, leg in enumerate(transfer_walk_legs):
            original_time = leg.get("sectionTime", 0)

            # 사용자 속도 계수만 적용 (경사도=1.0, 날씨=1.0)
            speed_factors = integrator.calculate_integrated_time(
                tmap_base_time=original_time,
                user_speed_mps=user_speed_mps,
                average_slope_percent=0.0,  # 실내이므로 경사도 무시
                weather_data=None,  # 실내이므로 날씨 무시
            )

            adjusted_time = int(speed_factors.adjusted_time)
            transfer_adjusted_time += adjusted_time

            print(
                f"  환승 {idx}: {leg.get('start', {}).get('name', '')} → {leg.get('end', {}).get('name', '')}"
            )
            print(
                f"    원본: {original_time}초, 보정: {adjusted_time}초 (사용자 속도: {speed_factors.user_speed_factor:.3f})"
            )

            transfer_analysis.append(
                {
                    "leg_index": len(analysis) + idx,
                    "start_name": leg.get("start", {}).get("name", ""),
                    "end_name": leg.get("end", {}).get("name", ""),
                    "distance": leg.get("distance", 0),
                    "original_time": original_time,
                    "adjusted_time": adjusted_time,
                    "time_dif": adjusted_time - original_time,
                    "is_transfer": True,
                    "user_speed_factor": speed_factors.user_speed_factor,
                    "slope_factor": 1.0,
                    "weather_factor": 1.0,
                    "final_factor": speed_factors.user_speed_factor,
                }
            )

    # 전체 도보 시간 계산 (실외 + 환승)
    original_walk_time = sum(leg.get("sectionTime", 0) for leg in walk_legs)
    original_transfer_time = sum(
        leg.get("sectionTime", 0) for leg in transfer_walk_legs
    )
    total_original_walk_time = original_walk_time + original_transfer_time

    total_adjusted_walk_time = total_adjusted_time + transfer_adjusted_time

    print("\n[🔍 도보 시간 계산 검증]")
    print(
        f"  실외 보행 구간: {len(walk_legs)}개, 원본: {original_walk_time}초, 보정: {total_adjusted_time}초"
    )
    print(
        f"  환승(실내) 구간: {len(transfer_walk_legs)}개, 원본: {original_transfer_time}초, 보정: {transfer_adjusted_time}초"
    )
    print(
        f"  전체 합계: 원본 {total_original_walk_time}초 ({total_original_walk_time // 60}분 {total_original_walk_time % 60}초), 보정: {total_adjusted_walk_time}초 ({total_adjusted_walk_time // 60}분 {total_adjusted_walk_time % 60}초)"
    )

    # 횡단보도 대기 시간 계산
    crosswalk_count, crosswalk_wait_time, crosswalk_lst = dongjak_waiting_time(itinerary)

    # 전체 평균 계수 계산 (실외 + 환승)
    all_analysis = analysis + transfer_analysis
    if all_analysis:
        avg_user_factor = sum(a["user_speed_factor"] for a in all_analysis) / len(
            all_analysis
        )
        avg_slope_factor = sum(a["slope_factor"] for a in all_analysis) / len(
            all_analysis
        )
        avg_weather_factor = sum(a["weather_factor"] for a in all_analysis) / len(
            all_analysis
        )
        avg_final_factor = sum(a["final_factor"] for a in all_analysis) / len(
            all_analysis
        )
    else:
        avg_user_factor = avg_slope_factor = avg_weather_factor = avg_final_factor = 1.0

    # 전체 데이터 품질 검증
    all_segments = []
    for leg_analysis in analysis:
        all_segments.extend(leg_analysis["segments"])

    overall_validation = validate_slope_data(all_segments)

    print("\n[📊 최종 결과]")
    print(f"  Tmap 기준 시간: {total_original_walk_time}초")
    print(f"  최종 보정 시간: {total_adjusted_walk_time}초")
    print(
        f"  횡단보도 대기 시간: {crosswalk_wait_time}초 ({crosswalk_lst})"
    )
    print(f"  전체 시간: {total_adjusted_walk_time + crosswalk_wait_time}초")
    print(f"  시간 차이: {total_adjusted_walk_time - total_original_walk_time:+}초")
    print("  평균 계수:")
    print(f"    - 사용자 속도: {avg_user_factor:.3f}")
    print(f"    - 경사도: {avg_slope_factor:.3f}")
    print(f"    - 날씨: {avg_weather_factor:.3f}")
    print(f"    - 최종: {avg_final_factor:.3f}")

    result = {
        "walk_legs_analysis": all_analysis,  # 실외 + 환승 모두 포함
        "total_original_walk_time": total_original_walk_time,
        "total_adjusted_walk_time": total_adjusted_walk_time,
        "total_route_time_adjustment": total_adjusted_walk_time
        - total_original_walk_time,
        # 횡단보도 정보
        "crosswalk_count": crosswalk_count,
        "crosswalk_wait_time": crosswalk_wait_time,
        "total_time_with_crosswalk": int(total_adjusted_walk_time + crosswalk_wait_time),
        # 통합 계수 정보
        "factors": {
            "user_speed_factor": avg_user_factor,
            "slope_factor": avg_slope_factor,
            "weather_factor": avg_weather_factor,
            "final_factor": avg_final_factor,
        },
        "user_speed_mps": user_speed_mps,
        "weather_applied": weather_data is not None,
        "sampled_coords_count": optimized["total_sampled_coords"],
        "original_coords_count": optimized["original_coords"],
        "data_quality": {
            "overall_valid": overall_validation["is_valid"],
            "total_warnings": len(overall_validation["warnings"]),
            "extreme_segments": overall_validation["stats"]["extreme_count"],
            "warnings": overall_validation["warnings"][:5],  # 처음 5개 경고만
        },
    }

    print("\n[🔍 반환 데이터 확인]")
    print(f"  factors 포함 여부: {'factors' in result}")
    print(f"  factors 값: {result.get('factors', 'NOT FOUND')}")

    return result
