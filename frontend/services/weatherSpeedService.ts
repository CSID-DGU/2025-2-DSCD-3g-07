/**
 * 날씨 기반 보행속도 예측 서비스
 * 
 * 백엔드의 WeatherSpeedModel을 활용하여
 * 날씨 조건에 따른 보행속도 보정을 수행합니다.
 */

import apiClient from '../utils/apiClient';

/**
 * 날씨 기반 속도 예측 요청
 */
export interface WeatherSpeedRequest {
    base_speed_mps: number;    // 기준 속도 (m/s)
    temp_c: number;             // 기온 (°C)
    pty: number;                // 강수형태 (0:없음, 1:비, 2:진눈깨비, 3:눈)
    rain_mm_per_h?: number;     // 시간당 강수량 (mm/h)
    snow_cm_per_h?: number;     // 시간당 신적설 (cm/h)
    use_smoothing?: boolean;    // 스무딩 적용 여부
}

/**
 * 날씨 기반 속도 예측 응답
 */
export interface WeatherSpeedResponse {
    stride_factor: number;      // 보폭 계수
    cadence_factor: number;     // 보행수 계수
    weather_coeff: number;      // 최종 날씨 계수
    speed_mps: number;          // 예측 속도 (m/s)
    speed_kmh: number;          // 예측 속도 (km/h)
    percent_change: number;     // 기준 대비 변화율 (%)
    warnings: string[];         // 안전 경고
}

/**
 * 날씨 기반 ETA 계산 요청
 */
export interface WeatherETARequest {
    distance_m: number;         // 거리 (m)
    base_speed_mps: number;     // 기준 속도 (m/s)
    temp_c: number;             // 기온 (°C)
    pty: number;                // 강수형태
    rain_mm_per_h?: number;     // 시간당 강수량 (mm/h)
    snow_cm_per_h?: number;     // 시간당 신적설 (cm/h)
}

/**
 * 날씨 기반 ETA 계산 응답
 */
export interface WeatherETAResponse {
    eta_minutes: number;                // 예상 도착 시간 (분)
    eta_seconds: number;                // 예상 도착 시간 (초)
    base_eta_seconds: number;           // 기준 도착 시간 (초)
    time_difference_seconds: number;    // 시간 차이 (초)
    speed_kmh: number;                  // 예측 속도 (km/h)
    weather_coeff: number;              // 날씨 계수
    warnings: string[];                 // 안전 경고
}

/**
 * 현재 날씨 데이터 (프론트엔드)
 */
export interface CurrentWeather {
    temperature_2m: number;       // 기온
    weather_code: number;         // 날씨 코드
    precipitation?: number;       // 강수량
    rain?: number;               // 비
    relative_humidity_2m?: number; // 습도
}

/**
 * 날씨 기반 보행속도 예측
 * 
 * @param baseSpeedMps 기준 속도 (m/s)
 * @param weather 현재 날씨 데이터
 * @param useSmoothing 스무딩 적용 여부
 * @returns 예측된 속도 정보
 */
export async function predictWalkingSpeed(
    baseSpeedMps: number,
    weather: CurrentWeather,
    useSmoothing: boolean = false
): Promise<WeatherSpeedResponse> {
    try {
        console.log('🚶 [속도 예측] 요청:', {
            기준속도_mps: baseSpeedMps,
            기온: weather.temperature_2m,
            날씨코드: weather.weather_code,
            강수량: weather.precipitation
        });

        // 날씨 코드를 PTY로 변환
        const pty = mapWeatherCodeToPTY(weather.weather_code);

        const request: WeatherSpeedRequest = {
            base_speed_mps: baseSpeedMps,
            temp_c: weather.temperature_2m,
            pty: pty,
            rain_mm_per_h: weather.rain || weather.precipitation || 0,
            snow_cm_per_h: 0,  // KMA API에서 눈 데이터가 있으면 추가 필요
            use_smoothing: useSmoothing
        };

        const response = await apiClient.post<WeatherSpeedResponse>(
            '/api/weather/speed/predict',
            request
        );

        console.log('✅ [속도 예측] 성공:', {
            예측속도_kmh: response.speed_kmh.toFixed(2),
            날씨계수: response.weather_coeff.toFixed(3),
            변화율: `${response.percent_change.toFixed(1)}%`,
            경고수: response.warnings.length
        });

        if (response.warnings.length > 0) {
            console.warn('⚠️ [속도 예측] 경고:', response.warnings);
        }

        return response;

    } catch (error) {
        console.error('❌ [속도 예측] 실패:', error);
        // 오류 시 기본값 반환 (날씨 영향 없음)
        return {
            stride_factor: 1.0,
            cadence_factor: 1.0,
            weather_coeff: 1.0,
            speed_mps: baseSpeedMps,
            speed_kmh: baseSpeedMps * 3.6,
            percent_change: 0,
            warnings: ['날씨 기반 속도 예측을 사용할 수 없습니다.']
        };
    }
}

/**
 * 날씨 기반 ETA 계산
 * 
 * @param distanceM 거리 (m)
 * @param baseSpeedMps 기준 속도 (m/s)
 * @param weather 현재 날씨 데이터
 * @returns ETA 정보
 */
export async function calculateWeatherETA(
    distanceM: number,
    baseSpeedMps: number,
    weather: CurrentWeather
): Promise<WeatherETAResponse> {
    try {
        console.log('⏱️ [ETA 계산] 요청:', {
            거리_m: distanceM,
            기준속도_mps: baseSpeedMps,
            기온: weather.temperature_2m
        });

        const pty = mapWeatherCodeToPTY(weather.weather_code);

        const request: WeatherETARequest = {
            distance_m: distanceM,
            base_speed_mps: baseSpeedMps,
            temp_c: weather.temperature_2m,
            pty: pty,
            rain_mm_per_h: weather.rain || weather.precipitation || 0,
            snow_cm_per_h: 0
        };

        const response = await apiClient.post<WeatherETAResponse>(
            '/api/weather/speed/eta',
            request
        );

        console.log('✅ [ETA 계산] 성공:', {
            예상시간_분: response.eta_minutes.toFixed(1),
            시간차이_초: response.time_difference_seconds.toFixed(0),
            날씨계수: response.weather_coeff.toFixed(3)
        });

        return response;

    } catch (error) {
        console.error('❌ [ETA 계산] 실패:', error);
        // 오류 시 기본 계산 반환
        const baseEta = distanceM / baseSpeedMps;
        return {
            eta_minutes: baseEta / 60,
            eta_seconds: baseEta,
            base_eta_seconds: baseEta,
            time_difference_seconds: 0,
            speed_kmh: baseSpeedMps * 3.6,
            weather_coeff: 1.0,
            warnings: ['ETA 계산을 사용할 수 없습니다.']
        };
    }
}

/**
 * 스무딩 상태 초기화
 * (새로운 경로 시작 시 호출)
 */
export async function resetSpeedSmoothing(): Promise<void> {
    try {
        await apiClient.post('/api/weather/speed/reset-smoothing', {});
        console.log('✅ [스무딩] 상태 초기화 완료');
    } catch (error) {
        console.error('❌ [스무딩] 초기화 실패:', error);
    }
}

/**
 * 모델 정보 조회
 */
export async function getModelInfo(): Promise<any> {
    try {
        const response = await apiClient.get<any>('/api/weather/speed/model-info');
        return response;
    } catch (error) {
        console.error('❌ [모델 정보] 조회 실패:', error);
        return null;
    }
}

/**
 * OpenMeteo 날씨 코드를 KMA PTY로 변환
 * 
 * @param weatherCode OpenMeteo 날씨 코드
 * @returns KMA PTY (0:없음, 1:비, 2:진눈깨비, 3:눈)
 */
function mapWeatherCodeToPTY(weatherCode: number): number {
    // 맑음
    if (weatherCode === 0) return 0;

    // 비 관련 (51-67, 80-82)
    if (
        (weatherCode >= 51 && weatherCode <= 67) ||
        (weatherCode >= 80 && weatherCode <= 82)
    ) {
        return 1; // 비
    }

    // 눈 관련 (71-77, 85-86)
    if (
        (weatherCode >= 71 && weatherCode <= 77) ||
        (weatherCode >= 85 && weatherCode <= 86)
    ) {
        return 3; // 눈
    }

    // 진눈깨비 (68-69)
    if (weatherCode >= 68 && weatherCode <= 69) {
        return 2; // 진눈깨비
    }

    // 기타 (구름, 안개 등)
    return 0;
}

/**
 * 경로의 각 구간에 날씨 영향 적용
 * 
 * @param segments 경로 구간 배열
 * @param weather 현재 날씨
 * @param baseSpeedMps 기준 속도
 * @returns 날씨가 적용된 구간 정보
 */
export async function applyWeatherToSegments(
    segments: Array<{ distance: number; time: number }>,
    weather: CurrentWeather,
    baseSpeedMps: number
): Promise<Array<{ distance: number; originalTime: number; adjustedTime: number; weatherCoeff: number }>> {
    try {
        const speedPrediction = await predictWalkingSpeed(baseSpeedMps, weather);

        return segments.map(segment => {
            const adjustedTime = segment.time / speedPrediction.weather_coeff;

            return {
                distance: segment.distance,
                originalTime: segment.time,
                adjustedTime: adjustedTime,
                weatherCoeff: speedPrediction.weather_coeff
            };
        });
    } catch (error) {
        console.error('❌ [구간 날씨 적용] 실패:', error);
        // 오류 시 원본 데이터 반환
        return segments.map(segment => ({
            distance: segment.distance,
            originalTime: segment.time,
            adjustedTime: segment.time,
            weatherCoeff: 1.0
        }));
    }
}

/**
 * 날씨 경고 메시지를 사용자 친화적으로 포맷
 */
export function formatWeatherWarnings(warnings: string[]): string {
    if (warnings.length === 0) return '';

    return warnings.map(w => {
        // 이모지 제거 후 메시지만 추출
        return w.replace(/^⚠️\s*/, '');
    }).join('\n');
}

/**
 * 속도 변화율을 설명 문자열로 변환
 */
export function getSpeedChangeDescription(percentChange: number): string {
    if (percentChange > 5) {
        return '날씨가 좋아 평소보다 빠릅니다';
    } else if (percentChange > 0) {
        return '날씨가 양호합니다';
    } else if (percentChange > -10) {
        return '날씨가 약간 영향을 줍니다';
    } else if (percentChange > -20) {
        return '날씨로 인해 느려집니다';
    } else {
        return '날씨로 인해 많이 느려집니다';
    }
}

export default {
    predictWalkingSpeed,
    calculateWeatherETA,
    resetSpeedSmoothing,
    getModelInfo,
    applyWeatherToSegments,
    formatWeatherWarnings,
    getSpeedChangeDescription
};
