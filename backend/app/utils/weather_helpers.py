import math
from typing import Dict, Optional, Tuple, Literal
from dataclasses import dataclass


@dataclass
class WeatherInput:
    """날씨 입력 데이터"""
    temp_c: float
    ptype: Literal['clear', 'rain', 'snow', 'sleet']
    rain_mm_per_h: float = 0.0
    snow_cm_per_h: float = 0.0


@dataclass
class SpeedPrediction:
    """속도 예측 결과"""
    stride_factor: float      # fL
    cadence_factor: float     # fC
    weather_coeff: float      # Cwx (클램프 적용)
    speed_mps: float          # m/s
    speed_kmh: float          # km/h
    percent_change: float     # 기준 대비 변화율 (%)
    warnings: list[str]       # 안전 경고


class WeatherSpeedModel:
    """날씨 기반 보행속도 예측 모델"""
    
    def __init__(
        self,
        clip_min: float = 0.70,
        clip_max: float = 1.10,
        smoothing_alpha: float = 0.3
    ):
        """
        Args:
            clip_min: 최소 계수 클램프
            clip_max: 최대 계수 클램프
            smoothing_alpha: EMA 스무딩 가중치
        """
        self.clip_min = clip_min
        self.clip_max = clip_max
        self.smoothing_alpha = smoothing_alpha
        
        # 파라미터 (사양서 기본값)
        self.params = {
            # 기온 효과
            'a_hot_L': 0.04,
            'a_cold_L': 0.03,
            'b_L': 0.01,
            'a_hot_C': 0.04,
            'a_cold_C': 0.03,
            'b_C': 0.02,
            
            # 비 효과
            'I0': 6.0,           # mm/h
            'R0_L': 0.06,
            'R0_C': 0.04,
            'M_fr': 0.93,        # 어는 비 보정
            
            # 눈 효과
            'S0': 1.2,           # cm/h
            'S0_L': 0.18,
            'A_wet_L': 0.10,
            'S0_C': 0.08,
            'A_wet_C': 0.05,
        }
        
        # 스무딩용 이전 계수 저장
        self.prev_coeff: Optional[float] = None
    
    @staticmethod
    def _sigmoid(x: float) -> float:
        """시그모이드 함수"""
        return 1.0 / (1.0 + math.exp(-x))
    
    @staticmethod
    def _gaussian(x: float, mu: float, sigma: float) -> float:
        """가우시안 함수"""
        return math.exp(-((x - mu) ** 2) / (2 * sigma ** 2))
    
    def _temp_effect_stride(self, T: float) -> float:
        """기온에 따른 보폭 계수 f_{L,T}"""
        hot = self.params['a_hot_L'] * self._sigmoid((T - 30) / 6)
        cold = self.params['a_cold_L'] * self._sigmoid((0 - T) / 4)
        comfort = self.params['b_L'] * self._gaussian(T, 10, 5)
        return 1.0 - hot - cold + comfort
    
    def _temp_effect_cadence(self, T: float) -> float:
        """기온에 따른 보행수 계수 f_{C,T}"""
        hot = self.params['a_hot_C'] * self._sigmoid((T - 30) / 4)
        cold = self.params['a_cold_C'] * self._sigmoid((0 - T) / 3)
        comfort = self.params['b_C'] * self._gaussian(T, 10, 5)
        return 1.0 - hot - cold + comfort
    
    def _rain_max_factor(self, T: float, param_key: str) -> float:
        """온도에 따른 강우 최대 영향 R_max(T)"""
        R0 = self.params[param_key]
        hot_adj = 0.20 * self._sigmoid((T - 30) / 4)
        cold_adj = 0.30 * self._sigmoid((0 - T) / 3)
        return R0 * (1.0 + hot_adj + cold_adj)
    
    def _rain_effect(self, T: float, I: float) -> Tuple[float, float]:
        """강우 효과 계산"""
        if I <= 0:
            return 1.0, 1.0
        
        I0 = self.params['I0']
        
        # 보폭 효과
        R_max_L = self._rain_max_factor(T, 'R0_L')
        f_L = 1.0 - R_max_L * (1.0 - math.exp(-I / I0))
        
        # 보행수 효과
        R_max_C = self._rain_max_factor(T, 'R0_C')
        f_C = 1.0 - R_max_C * (1.0 - math.exp(-I / I0))
        
        # 어는 비 보정
        if T <= 0:
            M_fr_sqrt = math.sqrt(self.params['M_fr'])
            f_L *= M_fr_sqrt
            f_C *= M_fr_sqrt
        
        return f_L, f_C
    
    def _snow_max_factor(self, T: float, param_S0: str, param_A: str) -> float:
        """온도에 따른 적설 최대 영향 S_max(T)"""
        S0 = self.params[param_S0]
        A_wet = self.params[param_A]
        wet_snow = A_wet * self._gaussian(T, 1.5, 1.5)
        return S0 + wet_snow
    
    def _snow_effect(self, T: float, S: float) -> Tuple[float, float]:
        """적설 효과 계산"""
        if S <= 0:
            return 1.0, 1.0
        
        S0 = self.params['S0']
        
        # 보폭 효과
        S_max_L = self._snow_max_factor(T, 'S0_L', 'A_wet_L')
        f_L = 1.0 - S_max_L * (1.0 - math.exp(-S / S0))
        
        # 보행수 효과
        S_max_C = self._snow_max_factor(T, 'S0_C', 'A_wet_C')
        f_C = 1.0 - S_max_C * (1.0 - math.exp(-S / S0))
        
        return f_L, f_C
    
    def _precip_effect(
        self, 
        T: float, 
        ptype: str, 
        I: float, 
        S: float
    ) -> Tuple[float, float]:
        """강수 효과 계산 (통합)"""
        if ptype == 'clear':
            return 1.0, 1.0
        elif ptype == 'rain':
            return self._rain_effect(T, I)
        elif ptype == 'snow':
            return self._snow_effect(T, S)
        elif ptype == 'sleet':
            # 진눈깨비: min(rain, snow) × 0.99
            rain_L, rain_C = self._rain_effect(T, I)
            snow_L, snow_C = self._snow_effect(T, S)
            return min(rain_L, snow_L) * 0.99, min(rain_C, snow_C) * 0.99
        else:
            return 1.0, 1.0
    
    def _get_safety_warnings(self, weather: WeatherInput) -> list[str]:
        """안전 경고 생성"""
        warnings = []
        
        # 어는 비
        if weather.temp_c <= 0 and weather.rain_mm_per_h > 0:
            warnings.append("⚠️ 어는 비 - 빙판 낙상 위험")
        
        # 습설
        if 0 <= weather.temp_c <= 3 and weather.snow_cm_per_h > 0:
            warnings.append("⚠️ 습설 - 미끄럼 주의")
        
        # 폭설
        if weather.snow_cm_per_h > 2.5:
            warnings.append("⚠️ 폭설 - 보행 매우 어려움")
        
        # 장대비
        if weather.rain_mm_per_h > 10:
            warnings.append("⚠️ 장대비 - 시야 불량")
        
        return warnings
    
    def predict(
        self, 
        v0_mps: float, 
        weather: WeatherInput,
        use_smoothing: bool = False
    ) -> SpeedPrediction:
        """
        날씨 조건에서 보행속도 예측
        
        Args:
            v0_mps: 기준 속도 (m/s, 중립 조건 12-20°C 평지)
            weather: 날씨 입력 데이터
            use_smoothing: 스무딩 적용 여부
        
        Returns:
            SpeedPrediction: 예측 결과
        """
        T = weather.temp_c
        
        # 1. 기온 효과
        f_L_T = self._temp_effect_stride(T)
        f_C_T = self._temp_effect_cadence(T)
        
        # 2. 강수 효과
        f_L_P, f_C_P = self._precip_effect(
            T, 
            weather.ptype, 
            weather.rain_mm_per_h, 
            weather.snow_cm_per_h
        )
        
        # 3. 통합
        f_L = f_L_T * f_L_P
        f_C = f_C_T * f_C_P
        
        # 4. 최종 계수 (클램프)
        C_wx = max(self.clip_min, min(self.clip_max, f_L * f_C))
        
        # 5. 스무딩 (옵션)
        if use_smoothing and self.prev_coeff is not None:
            alpha = self.smoothing_alpha
            C_final = (1 - alpha) * self.prev_coeff + alpha * C_wx
            self.prev_coeff = C_final
        else:
            C_final = C_wx
            self.prev_coeff = C_wx
        
        # 6. 속도 계산
        v_mps = v0_mps * C_final
        v_kmh = v_mps * 3.6
        percent_change = (C_final - 1.0) * 100
        
        # 7. 안전 경고
        warnings = self._get_safety_warnings(weather)
        
        return SpeedPrediction(
            stride_factor=f_L,
            cadence_factor=f_C,
            weather_coeff=C_final,
            speed_mps=v_mps,
            speed_kmh=v_kmh,
            percent_change=percent_change,
            warnings=warnings
        )
    
    def predict_from_stride_cadence(
        self,
        L0: float,
        C0: float,
        weather: WeatherInput,
        use_smoothing: bool = False
    ) -> Dict:
        """
        보폭/보행수 분해 예측
        
        Args:
            L0: 기준 보폭 (m/step)
            C0: 기준 보행수 (steps/s)
            weather: 날씨 입력
            use_smoothing: 스무딩 여부
        
        Returns:
            예측 결과 (보폭/보행수 포함)
        """
        v0 = L0 * C0
        result = self.predict(v0, weather, use_smoothing)
        
        L_hat = L0 * result.stride_factor
        C_hat = C0 * result.cadence_factor
        
        return {
            'stride_m': L_hat,
            'cadence_sps': C_hat,
            'stride_factor': result.stride_factor,
            'cadence_factor': result.cadence_factor,
            'weather_coeff': result.weather_coeff,
            'speed_mps': result.speed_mps,
            'speed_kmh': result.speed_kmh,
            'percent_change': result.percent_change,
            'warnings': result.warnings
        }
    
    def smooth(self, prev_coeff: float, new_coeff: float, alpha: Optional[float] = None) -> float:
        """
        계수 스무딩 (EMA)
        
        Args:
            prev_coeff: 이전 계수
            new_coeff: 새 계수
            alpha: 가중치 (None이면 기본값 사용)
        
        Returns:
            스무딩된 계수
        """
        if alpha is None:
            alpha = self.smoothing_alpha
        return (1 - alpha) * prev_coeff + alpha * new_coeff
    
    def reset_smoothing(self):
        """스무딩 상태 초기화"""
        self.prev_coeff = None


def map_kma_to_weather(
    T: float,
    PTY: int,
    RN1: Optional[float] = None,
    SNO: Optional[float] = None
) -> WeatherInput:
    """
    KMA(기상청) 데이터를 WeatherInput으로 변환
    
    Args:
        T: 기온 (°C)
        PTY: 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
        RN1: 1시간 강수량 (mm)
        SNO: 1시간 신적설 (cm)
    
    Returns:
        WeatherInput
    """
    # PTY 매핑
    if PTY in [0]:
        ptype = 'clear'
    elif PTY in [1, 4, 5]:
        ptype = 'rain'
    elif PTY in [3, 7]:
        ptype = 'snow'
    elif PTY in [2, 6]:
        ptype = 'sleet'
    else:
        ptype = 'clear'
    
    # 강수량
    rain_mm = RN1 if RN1 is not None and RN1 > 0 else 0.0
    
    # 적설량 (없으면 SLR 10:1 근사)
    if SNO is not None and SNO > 0:
        snow_cm = SNO
    elif ptype in ['snow', 'sleet'] and rain_mm > 0:
        snow_cm = rain_mm / 10.0
    else:
        snow_cm = 0.0
    
    return WeatherInput(
        temp_c=T,
        ptype=ptype,
        rain_mm_per_h=rain_mm,
        snow_cm_per_h=snow_cm
    )


# ============= 유틸리티 함수 =============

def format_speed_result(result: SpeedPrediction) -> str:
    """결과를 읽기 좋은 문자열로 포맷"""
    lines = [
        f"🏃 속도: {result.speed_kmh:.2f} km/h ({result.speed_mps:.2f} m/s)",
        f"📊 변화율: {result.percent_change:+.1f}%",
        f"👟 보폭 계수: {result.stride_factor:.3f}",
        f"👣 보행수 계수: {result.cadence_factor:.3f}",
        f"🌤️ 날씨 계수: {result.weather_coeff:.3f}",
    ]
    
    if result.warnings:
        lines.append("\n경고:")
        for warning in result.warnings:
            lines.append(f"  {warning}")
    
    return "\n".join(lines)


def calculate_eta(
    distance_m: float,
    v0_mps: float,
    weather: WeatherInput,
    model: Optional[WeatherSpeedModel] = None
) -> Dict:
    """
    날씨를 고려한 ETA 계산
    
    Args:
        distance_m: 거리 (m)
        v0_mps: 기준 속도 (m/s)
        weather: 날씨 조건
        model: 모델 인스턴스 (None이면 새로 생성)
    
    Returns:
        ETA 정보 딕셔너리
    """
    if model is None:
        model = WeatherSpeedModel()
    
    result = model.predict(v0_mps, weather)
    
    eta_seconds = distance_m / result.speed_mps
    eta_minutes = eta_seconds / 60
    
    # 기준 시간 (날씨 영향 없을 때)
    base_eta_seconds = distance_m / v0_mps
    time_diff_seconds = eta_seconds - base_eta_seconds
    
    return {
        'eta_minutes': eta_minutes,
        'eta_seconds': eta_seconds,
        'base_eta_seconds': base_eta_seconds,
        'time_difference_seconds': time_diff_seconds,
        'speed_kmh': result.speed_kmh,
        'weather_coeff': result.weather_coeff,
        'warnings': result.warnings
    }