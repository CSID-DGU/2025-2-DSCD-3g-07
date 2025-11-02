"""
보행속도에 영향을 주는 모든 요인을 통합 관리하는 모듈

기준값: Tmap API의 기본 보행 시간 = 1.0

최종 보행 시간 = Tmap 기준 시간 × 사용자 속도 계수 × 경사도 계수 × 날씨 계수

각 계수:
- 사용자 속도 계수: Health Connect 데이터 기반
- 경사도 계수: Google Elevation API + Tobler's Function
- 날씨 계수: 기상청 API + WeatherSpeedModel
"""

from typing import Dict, Optional, List
from dataclasses import dataclass
import logging

from .weather_helpers import WeatherSpeedModel, WeatherInput, map_kma_to_weather

logger = logging.getLogger(__name__)


@dataclass
class SpeedFactors:
    """보행속도 보정 계수들"""
    base_time: float              # Tmap API 기준 시간 (초)
    user_speed_factor: float      # 사용자 속도 계수 (Health Connect 기반)
    slope_factor: float           # 경사도 계수 (Tobler's Function)
    weather_factor: float         # 날씨 계수 (WeatherSpeedModel)
    final_factor: float           # 최종 통합 계수
    adjusted_time: float          # 보정된 시간 (초)
    
    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        return {
            'base_time': self.base_time,
            'user_speed_factor': self.user_speed_factor,
            'slope_factor': self.slope_factor,
            'weather_factor': self.weather_factor,
            'final_factor': self.final_factor,
            'adjusted_time': self.adjusted_time,
            'time_difference': self.adjusted_time - self.base_time
        }


class WalkingSpeedIntegrator:
    """
    보행속도 통합 계산기
    
    Tmap API의 기준 시간을 1.0으로 하여,
    사용자 속도, 경사도, 날씨의 영향을 종합적으로 계산합니다.
    """
    
    def __init__(self):
        self.weather_model = WeatherSpeedModel()
        logger.info("[통합 계산기] 초기화 완료")
    
    def calculate_user_speed_factor(
        self, 
        user_speed_mps: Optional[float],
        tmap_base_speed_mps: float = 1.111  # 시속 4km = 1.111 m/s (백엔드 재계산 기준)
    ) -> float:
        """
        사용자 보행속도 계수 계산
        
        Args:
            user_speed_mps: Health Connect에서 측정한 사용자 평균 속도 (m/s)
            tmap_base_speed_mps: 시속 4km 재계산 후 기준 속도 (기본값: 1.111 m/s = 4km/h)
        
        Returns:
            사용자 속도 계수 (사용자가 빠르면 < 1.0, 느리면 > 1.0)
            
        설명:
            - 백엔드에서 시속 4km(1.111 m/s) 기준으로 재계산한 시간이 기준값(1.0)
            - 사용자가 4km/h보다 빠르면: 시간이 덜 걸림 (계수 < 1.0)
            - 사용자가 4km/h보다 느리면: 시간이 더 걸림 (계수 > 1.0)
            - Health Connect 데이터가 없으면: 1.0 (기준값 사용)
        """
        if user_speed_mps is None or user_speed_mps <= 0:
            logger.debug("[사용자 속도] 데이터 없음, 기준값 사용 (1.0)")
            return 1.0
        
        # 시간 = 거리 / 속도
        # 계수 = 기준 속도 / 사용자 속도
        # 예: 사용자가 1.252m/s (4.51km/h), 기준이 1.111m/s (4km/h) → 1.111/1.252 = 0.887 (약 11% 빠름)
        # 예: 사용자가 1.111m/s (4km/h), 기준이 1.111m/s (4km/h) → 1.111/1.111 = 1.0
        # 예: 사용자가 1.0m/s (3.6km/h), 기준이 1.111m/s (4km/h) → 1.111/1.0 = 1.111 (약 11% 느림)
        factor = tmap_base_speed_mps / user_speed_mps
        
        # 안전 범위: 0.5 ~ 2.0 (기준 대비 ±100%)
        factor = max(0.5, min(2.0, factor))
        
        logger.debug(
            f"[사용자 속도] {user_speed_mps:.3f} m/s ({user_speed_mps*3.6:.2f} km/h) "
            f"vs 기준 {tmap_base_speed_mps:.3f} m/s (4 km/h) "
            f"→ 계수: {factor:.3f} "
            f"(기준 대비 {(1-factor)*100:+.1f}%)"
        )
        
        return factor
    
    def calculate_slope_factor_from_tobler(
        self,
        slope_percent: float
    ) -> float:
        """
        경사도 기반 속도 계수 계산 (Tobler's Hiking Function)
        
        Args:
            slope_percent: 경사도 (%)
        
        Returns:
            경사도 계수 (평지 기준 1.0)
            
        설명:
            Tobler's Function: W = 6 * exp(-3.5 * |S + 0.05|) km/h
            - 평지(0%): 약 5.0 km/h
            - -5% (완만한 내리막): 약 6.0 km/h (가장 빠름)
            - +5% (완만한 오르막): 약 4.2 km/h
        """
        import math
        
        slope_decimal = slope_percent / 100.0
        
        # Tobler's Function으로 속도 계산 (km/h)
        speed_kmh = 6.0 * math.exp(-3.5 * abs(slope_decimal + 0.05))
        
        # 기준 속도 (평지, 0% 경사): 5.036 km/h
        base_speed_kmh = 6.0 * math.exp(-3.5 * 0.05)
        
        # 속도 비율로 계수 계산
        # 시간 계수 = 기준 속도 / 현재 속도
        factor = base_speed_kmh / speed_kmh
        
        logger.debug(
            f"[경사도] {slope_percent:+.1f}% "
            f"→ 속도: {speed_kmh:.2f} km/h, 계수: {factor:.3f}"
        )
        
        return factor
    
    def calculate_weather_factor(
        self,
        weather_data: Optional[Dict]
    ) -> float:
        """
        날씨 기반 속도 계수 계산
        
        Args:
            weather_data: 날씨 데이터
                - temp_c: 기온 (°C)
                - pty: 강수형태 (0:없음, 1:비, 2:진눈깨비, 3:눈)
                - rain_mm_per_h: 시간당 강수량 (mm/h)
                - snow_cm_per_h: 시간당 신적설 (cm/h)
        
        Returns:
            날씨 계수 (맑은 날 기준에서의 상대적 계수)
            
        설명:
            - WeatherSpeedModel의 weather_coeff 사용
            - 좋은 날씨: 1.0 이상 (빠름)
            - 나쁜 날씨: 1.0 미만 (느림)
        """
        if weather_data is None:
            logger.debug("[날씨] 데이터 없음, 기준값 사용 (1.0)")
            return 1.0
        
        try:
            weather_input = map_kma_to_weather(
                T=weather_data.get('temp_c', 15),
                PTY=weather_data.get('pty', 0),
                RN1=weather_data.get('rain_mm_per_h'),
                SNO=weather_data.get('snow_cm_per_h')
            )
            
            # 기준 속도 1.4 m/s로 예측
            prediction = self.weather_model.predict(1.4, weather_input)
            
            # weather_coeff는 속도 비율 (예: 0.9 = 10% 느림)
            # 시간 계수 = 1 / 속도 비율
            # 예: 속도가 0.9배 → 시간은 1/0.9 = 1.111배
            weather_factor = 1.0 / prediction.weather_coeff
            
            logger.debug(
                f"[날씨] 기온: {weather_data.get('temp_c')}°C, "
                f"강수: PTY={weather_data.get('pty')} "
                f"→ 계수: {weather_factor:.3f} "
                f"(속도 {prediction.percent_change:+.1f}%)"
            )
            
            if prediction.warnings:
                for warning in prediction.warnings:
                    logger.warning(f"[날씨 경고] {warning}")
            
            return weather_factor
            
        except Exception as e:
            logger.error(f"[날씨] 계산 실패: {e}, 기준값 사용")
            return 1.0
    
    def calculate_integrated_time(
        self,
        tmap_base_time: float,
        user_speed_mps: Optional[float] = None,
        average_slope_percent: float = 0.0,
        weather_data: Optional[Dict] = None
    ) -> SpeedFactors:
        """
        통합 보행 시간 계산
        
        Args:
            tmap_base_time: Tmap API의 기준 보행 시간 (초)
            user_speed_mps: 사용자 평균 보행속도 (m/s, Health Connect)
            average_slope_percent: 평균 경사도 (%)
            weather_data: 날씨 데이터
        
        Returns:
            SpeedFactors: 모든 계수와 최종 보정 시간
            
        계산 공식:
            최종 시간 = Tmap 기준 × 사용자 계수 × 경사도 계수 × 날씨 계수
        """
        logger.info(f"[통합 계산] 시작 - 기준 시간: {tmap_base_time}초")
        
        # 1. 사용자 속도 계수
        user_factor = self.calculate_user_speed_factor(user_speed_mps)
        
        # 2. 경사도 계수
        slope_factor = self.calculate_slope_factor_from_tobler(average_slope_percent)
        
        # 3. 날씨 계수
        weather_factor = self.calculate_weather_factor(weather_data)
        
        # 4. 최종 통합 계수
        final_factor = user_factor * slope_factor * weather_factor
        
        # 5. 보정된 시간
        adjusted_time = tmap_base_time * final_factor
        
        logger.info(
            f"[통합 계산] 완료\n"
            f"  - 기준 시간: {tmap_base_time:.0f}초\n"
            f"  - 사용자 계수: {user_factor:.3f}\n"
            f"  - 경사도 계수: {slope_factor:.3f}\n"
            f"  - 날씨 계수: {weather_factor:.3f}\n"
            f"  - 최종 계수: {final_factor:.3f}\n"
            f"  - 보정 시간: {adjusted_time:.0f}초 ({(adjusted_time-tmap_base_time):+.0f}초)"
        )
        
        return SpeedFactors(
            base_time=tmap_base_time,
            user_speed_factor=user_factor,
            slope_factor=slope_factor,
            weather_factor=weather_factor,
            final_factor=final_factor,
            adjusted_time=adjusted_time
        )
    
    def calculate_route_segments(
        self,
        segments: List[Dict],
        user_speed_mps: Optional[float] = None,
        weather_data: Optional[Dict] = None
    ) -> List[Dict]:
        """
        경로의 각 구간별 시간 계산
        
        Args:
            segments: 구간 정보 리스트
                - base_time: Tmap 기준 시간 (초)
                - slope_percent: 경사도 (%)
                - distance: 거리 (m)
            user_speed_mps: 사용자 평균 속도
            weather_data: 날씨 데이터
        
        Returns:
            보정된 구간 정보 리스트
        """
        results = []
        total_base_time = 0
        total_adjusted_time = 0
        
        for idx, segment in enumerate(segments):
            base_time = segment.get('base_time', 0)
            slope = segment.get('slope_percent', 0.0)
            
            factors = self.calculate_integrated_time(
                tmap_base_time=base_time,
                user_speed_mps=user_speed_mps,
                average_slope_percent=slope,
                weather_data=weather_data
            )
            
            result = {
                'segment_index': idx,
                'distance': segment.get('distance', 0),
                'base_time': base_time,
                'slope_percent': slope,
                'user_speed_factor': factors.user_speed_factor,
                'slope_factor': factors.slope_factor,
                'weather_factor': factors.weather_factor,
                'final_factor': factors.final_factor,
                'adjusted_time': factors.adjusted_time,
                'time_difference': factors.adjusted_time - base_time
            }
            
            results.append(result)
            total_base_time += base_time
            total_adjusted_time += factors.adjusted_time
        
        logger.info(
            f"[구간 계산] 완료 - {len(segments)}개 구간\n"
            f"  - 전체 기준 시간: {total_base_time:.0f}초\n"
            f"  - 전체 보정 시간: {total_adjusted_time:.0f}초\n"
            f"  - 시간 차이: {(total_adjusted_time-total_base_time):+.0f}초"
        )
        
        return results


# 전역 인스턴스 (싱글톤)
_integrator_instance = None


def get_integrator() -> WalkingSpeedIntegrator:
    """전역 통합 계산기 인스턴스 반환"""
    global _integrator_instance
    if _integrator_instance is None:
        _integrator_instance = WalkingSpeedIntegrator()
    return _integrator_instance


# 편의 함수들

def calculate_walking_time(
    tmap_base_time: float,
    user_speed_mps: Optional[float] = None,
    slope_percent: float = 0.0,
    weather_data: Optional[Dict] = None
) -> Dict:
    """
    간편한 보행 시간 계산 함수
    
    Returns:
        계산 결과 딕셔너리
    """
    integrator = get_integrator()
    factors = integrator.calculate_integrated_time(
        tmap_base_time=tmap_base_time,
        user_speed_mps=user_speed_mps,
        average_slope_percent=slope_percent,
        weather_data=weather_data
    )
    return factors.to_dict()


def calculate_route_time(
    segments: List[Dict],
    user_speed_mps: Optional[float] = None,
    weather_data: Optional[Dict] = None
) -> Dict:
    """
    전체 경로 시간 계산 함수
    
    Returns:
        전체 경로 계산 결과
    """
    integrator = get_integrator()
    segment_results = integrator.calculate_route_segments(
        segments=segments,
        user_speed_mps=user_speed_mps,
        weather_data=weather_data
    )
    
    total_base = sum(s['base_time'] for s in segment_results)
    total_adjusted = sum(s['adjusted_time'] for s in segment_results)
    
    return {
        'segments': segment_results,
        'total_base_time': total_base,
        'total_adjusted_time': total_adjusted,
        'total_time_difference': total_adjusted - total_base,
        'segment_count': len(segment_results)
    }
