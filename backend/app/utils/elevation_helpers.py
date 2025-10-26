"""
고도 및 경사도 분석을 위한 헬퍼 함수들
Google Elevation API를 사용하여 경로의 경사도를 계산하고 보행 시간을 보정합니다.

보행 속도 모델: Tobler's Hiking Function (1993)
- 출처: Tobler, W. (1993). "Three presentations on geographical analysis and modeling"
- 공식: W = 6 * exp(-3.5 * |S + 0.05|) km/h
- 실증 데이터 기반의 과학적 모델로 오르막/내리막을 모두 고려
"""
import os
import math
import aiohttp
from typing import Dict, List, Tuple, Optional
from .geo_helpers import parse_linestring, haversine, coords_to_latlng_string


# 경사도별 속도 계수 (참고용 - 실제로는 Tobler's Function 사용)
# Tobler's Function은 연속적인 값을 반환하므로 더 정확함
SLOPE_SPEED_FACTORS_REFERENCE = {
    'flat': 1.0,        # 0%: 평지 (5.0 km/h)
    'gentle_up': 0.84,  # 3%: 완만한 오르막 (4.2 km/h)
    'gentle_down': 1.08, # -3%: 완만한 내리막 (5.4 km/h)
    'moderate_up': 0.65, # 10%: 보통 오르막 (3.25 km/h)
    'moderate_down': 0.92, # -10%: 보통 내리막 (4.6 km/h)
    'steep_up': 0.42,   # 20%: 가파른 오르막 (2.1 km/h)
    'steep_down': 0.65  # -20%: 가파른 내리막 (3.25 km/h)
}

# Google Elevation API 설정
GOOGLE_ELEVATION_API_URL = "https://maps.googleapis.com/maps/api/elevation/json"
MAX_COORDINATES_PER_REQUEST = 512  # Google API 제한


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
        if 'steps' in leg:
            for step in leg['steps']:
                coords = step['linestring'].split()
                total += len(coords)
        elif 'passShape' in leg:
            coords = leg['passShape']['linestring'].split()
            total += len(coords)
    return total


def smart_sample_coordinates(
    linestring: str, 
    target_points: int, 
    distance: float
) -> List[Dict[str, float]]:
    """
    거리 기반 적응형 샘플링
    - 짧은 구간: 더 많은 샘플 (정밀도 유지)
    - 긴 구간: 적은 샘플 (효율성)
    
    Args:
        linestring: 좌표 문자열
        target_points: 목표 샘플 개수
        distance: 구간 거리 (미터)
    
    Returns:
        샘플링된 좌표 리스트
    """
    coords = parse_linestring(linestring)
    
    if not coords:
        return []
    
    # 거리에 따른 샘플링 전략
    if distance < 50:  # 50m 미만: 모든 좌표 사용
        return coords
    elif distance < 200:  # 200m 미만: 10m당 1개
        sample_interval = max(1, len(coords) // max(1, distance // 10))
    else:  # 200m 이상: 20m당 1개
        sample_interval = max(1, len(coords) // max(1, distance // 20))
    
    # 샘플링 (시작점과 끝점은 항상 포함)
    if len(coords) <= 2:
        return coords
    
    sampled = [coords[0]]
    for i in range(sample_interval, len(coords) - 1, sample_interval):
        sampled.append(coords[i])
    
    # 마지막 좌표가 포함되지 않았다면 추가
    if sampled[-1] != coords[-1]:
        sampled.append(coords[-1])
    
    return sampled


def optimize_all_coordinates(
    walk_legs: List[Dict], 
    max_total: int = 500
) -> Dict:
    """
    전체 보행 구간을 512개 이하로 최적화
    
    Args:
        walk_legs: 보행 구간 리스트
        max_total: 최대 좌표 개수 (기본: 500, API 제한: 512)
    
    Returns:
        최적화된 좌표 데이터와 메타정보
    """
    # 1단계: 각 leg의 거리와 좌표 수 분석
    leg_info = []
    total_distance = 0
    total_coords = 0
    
    for leg in walk_legs:
        leg_distance = leg.get('distance', 0)
        
        if 'steps' in leg:
            leg_coords = sum(len(step['linestring'].split()) for step in leg['steps'])
            steps = leg['steps']
        elif 'passShape' in leg:
            leg_coords = len(leg['passShape']['linestring'].split())
            # passShape를 steps 형식으로 변환
            steps = [{
                'linestring': leg['passShape']['linestring'],
                'distance': leg_distance
            }]
        else:
            continue
        
        leg_info.append({
            'leg': leg,
            'distance': leg_distance,
            'original_coords': leg_coords,
            'steps': steps
        })
        total_distance += leg_distance
        total_coords += leg_coords
    
    if total_distance == 0:
        return {'legs': [], 'total_sampled_coords': 0}
    
    # 2단계: 거리 비율에 따라 좌표 할당
    result = {
        'legs': [],
        'total_sampled_coords': 0,
        'original_coords': total_coords
    }
    
    for info in leg_info:
        # 거리 비율로 좌표 개수 배분
        distance_ratio = info['distance'] / total_distance
        allocated_coords = int(max_total * distance_ratio)
        allocated_coords = max(10, allocated_coords)  # 최소 10개는 보장
        
        # 각 step별로 배분
        step_coords = []
        remaining = allocated_coords
        
        for i, step in enumerate(info['steps']):
            is_last = (i == len(info['steps']) - 1)
            step_distance = step.get('distance', 0)
            
            # 마지막 step은 남은 좌표 모두 사용
            if is_last:
                step_target = remaining
            else:
                step_ratio = step_distance / info['distance'] if info['distance'] > 0 else 0
                step_target = max(3, int(allocated_coords * step_ratio))
                remaining -= step_target
            
            sampled = smart_sample_coordinates(
                step['linestring'],
                step_target,
                step_distance
            )
            
            step_coords.append({
                'step_index': i,
                'coords': sampled,
                'distance': step_distance
            })
        
        result['legs'].append({
            'leg_data': info['leg'],
            'steps_coords': step_coords,
            'total_coords': sum(len(s['coords']) for s in step_coords)
        })
        result['total_sampled_coords'] += sum(len(s['coords']) for s in step_coords)
    
    return result


async def call_google_elevation_api(
    coords: List[Dict[str, float]], 
    api_key: str
) -> List[float]:
    """
    Google Elevation API를 호출하여 고도 데이터를 가져옴
    
    Args:
        coords: [{'lon': float, 'lat': float}, ...] 형식의 좌표 리스트
        api_key: Google API 키
    
    Returns:
        고도 값 리스트 (미터 단위)
    
    Raises:
        Exception: API 호출 실패 시
    """
    if not coords:
        return []
    
    if len(coords) > MAX_COORDINATES_PER_REQUEST:
        raise ValueError(
            f"좌표 개수가 {MAX_COORDINATES_PER_REQUEST}개를 초과했습니다: {len(coords)}개"
        )
    
    # 좌표를 "lat,lng|lat,lng|..." 형식으로 변환
    locations = coords_to_latlng_string(coords)
    
    params = {
        'locations': locations,
        'key': api_key
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.get(GOOGLE_ELEVATION_API_URL, params=params) as response:
            data = await response.json()
            
            if data.get('status') != 'OK':
                error_message = data.get('error_message', data.get('status'))
                raise Exception(f"Google Elevation API 오류: {error_message}")
            
            # 고도 값만 추출
            elevations = [result['elevation'] for result in data.get('results', [])]
            
            return elevations


def calculate_slope(
    elevation1: float, 
    elevation2: float, 
    distance: float
) -> float:
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
        return {
            'is_valid': True,
            'warnings': [],
            'extreme_segments': []
        }
    
    slopes = [seg['slope'] for seg in segment_analysis]
    warnings = []
    extreme_segments = []
    
    # 극단값 검사 (±60% 초과)
    for i, seg in enumerate(segment_analysis):
        if abs(seg['slope']) > 60:
            extreme_segments.append({
                'index': i,
                'slope': seg['slope'],
                'distance': seg['distance'],
                'elevation_diff': seg['elevation_diff']
            })
            warnings.append(
                f"세그먼트 {i}: 극단 경사 {seg['slope']:.1f}% "
                f"(거리: {seg['distance']:.1f}m, 고도차: {seg['elevation_diff']:.1f}m)"
            )
    
    # 통계
    abs_slopes = [abs(s) for s in slopes]
    
    return {
        'is_valid': len(extreme_segments) == 0,
        'warnings': warnings,
        'extreme_segments': extreme_segments,
        'stats': {
            'max_abs_slope': max(abs_slopes, default=0),
            'extreme_count': len(extreme_segments),
            'total_segments': len(segment_analysis)
        }
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
                f"(데이터 오류 가능성)",
                UserWarning
            )
    
    # 극단값 경고 (로깅용)
    if abs(slope_percent) > 60:
        import warnings
        warnings.warn(
            f"극단적인 경사도 감지: {slope_percent:.1f}% - 데이터 오류 가능성 확인 필요",
            UserWarning
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
    leg_data: Dict,
    elevations: List[float],
    steps_coords: List[Dict]
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
    original_time = leg_data.get('sectionTime', 0)
    distance = leg_data.get('distance', 0)
    
    # 기본 보행 속도 계산 (m/s)
    base_speed = distance / original_time if original_time > 0 else 1.4
    
    segment_analysis = []
    elevation_idx = 0
    
    for step_info in steps_coords:
        coords = step_info['coords']
        step_distance = step_info['distance']
        
        for i in range(len(coords) - 1):
            if elevation_idx + 1 >= len(elevations):
                break
            
            # 두 지점 간 거리 및 고도차
            segment_distance = haversine(coords[i], coords[i + 1])
            elevation_diff = elevations[elevation_idx + 1] - elevations[elevation_idx]
            
            # 경사도 계산 (%, 양수=오르막, 음수=내리막)
            slope = calculate_slope(
                elevations[elevation_idx],
                elevations[elevation_idx + 1],
                segment_distance
            )
            
            # 속도 보정 (Tobler's Hiking Function - 부호로 오르막/내리막 자동 구분)
            speed_factor = calculate_slope_factor(slope)
            adjusted_speed = base_speed * speed_factor
            segment_time = segment_distance / adjusted_speed if adjusted_speed > 0 else 0
            
            total_adjusted_time += segment_time
            
            segment_analysis.append({
                'distance': round(segment_distance, 2),
                'elevation_start': round(elevations[elevation_idx], 2),
                'elevation_end': round(elevations[elevation_idx + 1], 2),
                'elevation_diff': round(elevation_diff, 2),
                'slope': round(slope, 2),
                'is_uphill': slope > 0,  # UI 표시용
                'speed_factor': round(speed_factor, 3),
                'time': round(segment_time, 1)
            })
            
            elevation_idx += 1
    
    return int(total_adjusted_time), segment_analysis


async def analyze_route_elevation(
    itinerary: Dict, 
    api_key: Optional[str] = None
) -> Dict:
    """
    전체 경로의 경사도를 분석하고 시간을 보정
    
    Args:
        itinerary: Tmap API의 itinerary 데이터
        api_key: Google Elevation API 키 (None이면 환경변수에서 가져옴)
    
    Returns:
        경사도 분석 결과 및 보정된 시간 정보
    """
    if api_key is None:
        api_key = os.getenv('GOOGLE_ELEVATION_API_KEY')
    
    if not api_key:
        raise ValueError("Google Elevation API 키가 설정되지 않았습니다.")
    
    # WALK 모드인 leg만 추출
    walk_legs = [leg for leg in itinerary.get('legs', []) if leg.get('mode') == 'WALK']
    
    if not walk_legs:
        return {
            'error': '보행 구간이 없습니다.',
            'walk_legs_analysis': [],
            'total_original_walk_time': 0,
            'total_adjusted_walk_time': 0,
            'total_route_time_adjustment': 0
        }
    
    # 좌표 최적화
    optimized = optimize_all_coordinates(walk_legs, max_total=500)
    
    print(f"[경사도 분석] 원본 좌표: {optimized['original_coords']}개")
    print(f"[경사도 분석] 샘플링 후: {optimized['total_sampled_coords']}개")
    
    # 모든 좌표를 하나의 리스트로 결합
    all_coords = []
    coord_map = []
    
    for leg_idx, leg_data in enumerate(optimized['legs']):
        for step_data in leg_data['steps_coords']:
            start_idx = len(all_coords)
            all_coords.extend(step_data['coords'])
            coord_map.append({
                'leg_idx': leg_idx,
                'step_idx': step_data['step_index'],
                'start': start_idx,
                'end': len(all_coords),
                'distance': step_data['distance'],
                'coords': step_data['coords']
            })
    
    # Google Elevation API 호출
    try:
        elevations = await call_google_elevation_api(all_coords, api_key)
    except Exception as e:
        return {
            'error': f'고도 데이터 획득 실패: {str(e)}',
            'walk_legs_analysis': [],
            'total_original_walk_time': sum(leg.get('sectionTime', 0) for leg in walk_legs),
            'total_adjusted_walk_time': sum(leg.get('sectionTime', 0) for leg in walk_legs),
            'total_route_time_adjustment': 0
        }
    
    # 각 leg별 분석
    analysis = []
    total_adjusted_time = 0
    elevation_offset = 0
    
    for leg_idx, leg_data_obj in enumerate(optimized['legs']):
        leg = leg_data_obj['leg_data']
        steps_coords = leg_data_obj['steps_coords']
        
        # 이 leg의 고도 데이터 개수
        leg_elevation_count = sum(len(s['coords']) for s in steps_coords)
        leg_elevations = elevations[elevation_offset:elevation_offset + leg_elevation_count]
        
        # 시간 보정
        original_time = leg.get('sectionTime', 0)
        adjusted_time, segment_analysis = adjust_walking_time(
            leg,
            leg_elevations,
            steps_coords
        )
        
        total_adjusted_time += adjusted_time
        
        # 거리 가중 평균 경사도 계산 (더 정확함)
        if segment_analysis:
            total_distance = sum(seg['distance'] for seg in segment_analysis)
            if total_distance > 0:
                # 거리 가중 평균
                weighted_slope_sum = sum(seg['slope'] * seg['distance'] for seg in segment_analysis)
                avg_slope = weighted_slope_sum / total_distance
            else:
                # fallback: 단순 평균
                slopes = [seg['slope'] for seg in segment_analysis]
                avg_slope = sum(slopes) / len(slopes)
            
            slopes = [seg['slope'] for seg in segment_analysis]
            max_slope = max(slopes, default=0)
            min_slope = min(slopes, default=0)
        else:
            avg_slope = 0
            max_slope = 0
            min_slope = 0
        
        # 데이터 품질 검증
        validation = validate_slope_data(segment_analysis)
        
        analysis.append({
            'leg_index': leg_idx,
            'start_name': leg.get('start', {}).get('name', ''),
            'end_name': leg.get('end', {}).get('name', ''),
            'distance': leg.get('distance', 0),
            'original_time': original_time,
            'adjusted_time': adjusted_time,
            'time_diff': adjusted_time - original_time,
            'avg_slope': round(avg_slope, 2),
            'max_slope': round(max_slope, 2),
            'min_slope': round(min_slope, 2),
            'segments': segment_analysis[:10],  # 처음 10개 세그먼트만 포함 (UI용)
            'data_quality': {
                'is_valid': validation['is_valid'],
                'warnings': validation['warnings'],
                'extreme_count': validation['stats']['extreme_count']
            }
        })
        
        elevation_offset += leg_elevation_count
    
    original_walk_time = sum(leg.get('sectionTime', 0) for leg in walk_legs)
    
    # 전체 데이터 품질 검증
    all_segments = []
    for leg_analysis in analysis:
        all_segments.extend(leg_analysis['segments'])
    
    overall_validation = validate_slope_data(all_segments)
    
    return {
        'walk_legs_analysis': analysis,
        'total_original_walk_time': original_walk_time,
        'total_adjusted_walk_time': total_adjusted_time,
        'total_route_time_adjustment': total_adjusted_time - original_walk_time,
        'sampled_coords_count': optimized['total_sampled_coords'],
        'original_coords_count': optimized['original_coords'],
        'data_quality': {
            'overall_valid': overall_validation['is_valid'],
            'total_warnings': len(overall_validation['warnings']),
            'extreme_segments': overall_validation['stats']['extreme_count'],
            'warnings': overall_validation['warnings'][:5]  # 처음 5개 경고만
        }
    }
