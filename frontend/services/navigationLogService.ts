/**
 * 네비게이션 로그 API 서비스
 * 
 * 경로 안내 기록을 저장하고 조회하는 API 호출 함수들
 */

import Config from '@/config';
import { apiClient } from '@/utils/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const normalizeBaseUrl = async (): Promise<string> => {
    const base = await Config.initializeApiUrl();
    return base.endsWith('/') ? base.slice(0, -1) : base;
};

const buildUrl = async (path: string): Promise<string> => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${await normalizeBaseUrl()}${normalized}`;
};

const toErrorMessage = (detail: any, fallback: string): string => {
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    try {
        const serialized = JSON.stringify(detail);
        return serialized === '{}' ? fallback : serialized;
    } catch {
        return fallback;
    }
};

export interface MovementSegment {
    start_time: string;
    end_time: string;
    distance_m: number;
    duration_seconds: number;
    avg_speed_ms: number;
    status: 'walking' | 'paused';
    reason?: string;
}

export interface NavigationLogData {
    route_mode: 'transit' | 'walking' | 'course';

    // 위치 정보
    start_location?: string;
    end_location?: string;
    start_lat: number;
    start_lon: number;
    end_lat: number;
    end_lon: number;

    // 경로 상세 정보
    total_distance_m: number;
    walking_distance_m?: number;
    transport_modes?: string[];
    crosswalk_count?: number;

    // 보행 시간 계산 계수
    user_speed_factor?: number;
    slope_factor?: number;
    weather_factor?: number;

    // 시간 정보
    estimated_time_seconds: number;
    actual_time_seconds: number;
    time_difference_seconds?: number;  // 시간 차이 (실제 - 예상)
    accuracy_percent?: number;  // 전체 시간 예측 정확도 (%)

    // 보행 시간 예측 정확도 측정
    estimated_walk_time_seconds?: number;  // 예측 보행 시간 (횡단보도 1/3 포함)
    walk_time_difference_seconds?: number;  // 보행 시간 차이 (실제 - 예측)
    walk_accuracy_percent?: number;  // 보행 예측 정확도 (%)

    // 실제 보행속도 측정 (하이브리드 방식)
    active_walking_time_seconds?: number;
    paused_time_seconds?: number;
    real_walking_speed_kmh?: number;
    pause_count?: number;
    movement_data?: {
        segments: MovementSegment[];
        detection_method: string;
        total_pauses: number;
        crosswalk_pauses?: number;
    };

    // 날씨 및 상세 데이터
    weather_id?: number;
    route_data?: any;

    // 타임스탬프
    started_at: string;  // ISO 8601 format
    ended_at: string;    // ISO 8601 format
}

export interface NavigationLogResponse {
    log_id: number;
    user_id: number;
    route_mode: string;
    start_location?: string;
    end_location?: string;
    start_lat: number;
    start_lon: number;
    end_lat: number;
    end_lon: number;
    total_distance_m: number;
    walking_distance_m?: number;
    transport_modes?: string[];
    crosswalk_count: number;
    user_speed_factor?: number;
    slope_factor?: number;
    weather_factor?: number;
    estimated_time_seconds: number;
    actual_time_seconds: number;
    time_difference_seconds?: number;
    accuracy_percent?: number;

    // 보행 시간 예측 정확도 측정
    estimated_walk_time_seconds?: number;
    walk_time_difference_seconds?: number;
    walk_accuracy_percent?: number;

    // 실제 보행속도 측정 (하이브리드 방식)
    active_walking_time_seconds?: number;
    paused_time_seconds?: number;
    real_walking_speed_kmh?: number;
    movement_data?: {
        segments: MovementSegment[];
        detection_method: string;
        total_pauses: number;
        crosswalk_pauses?: number;
    };

    weather_id?: number;
    route_data?: any;
    started_at: string;
    ended_at: string;
    created_at: string;
}

export interface NavigationStatistics {
    period_days: number;
    total_navigations: number;
    walking_count: number;
    transit_count: number;
    total_distance_km: number;
    total_time_hours: number;
    avg_time_difference_seconds: number;
    accuracy_rate: number;
    avg_user_speed_factor?: number;
    avg_slope_factor?: number;
    avg_weather_factor?: number;
}

/**
 * 네비게이션 로그 저장
 */
export async function saveNavigationLog(
    userId: number,
    logData: NavigationLogData
): Promise<NavigationLogResponse> {
    const timestamp = new Date().toISOString();

    try {
        const endpoint = `/api/navigation/logs?user_id=${userId}`;
        console.log('[navLog] save request', { endpoint, logData });

        const result = await apiClient.post<NavigationLogResponse>(endpoint, logData);

        console.log('[navLog] save success', result);

        // 🔧 성공 로그 저장 (Release에서도 확인 가능)
        await saveDebugLog({
            timestamp,
            status: 'SUCCESS',
            userId,
            logId: result.log_id,
        });

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[navLog] save failed', {
            error,
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });

        // 🔧 실패 로그 저장 (Release에서도 확인 가능)
        await saveDebugLog({
            timestamp,
            status: 'FAILED',
            userId,
            error: errorMessage,
            requestData: {
                route_mode: logData.route_mode,
                start_lat: logData.start_lat,
                start_lon: logData.start_lon,
                end_lat: logData.end_lat,
                end_lon: logData.end_lon,
                total_distance_m: logData.total_distance_m,
                estimated_time_seconds: logData.estimated_time_seconds,
                actual_time_seconds: logData.actual_time_seconds,
                active_walking_time_seconds: logData.active_walking_time_seconds,
                paused_time_seconds: logData.paused_time_seconds,
                real_walking_speed_kmh: logData.real_walking_speed_kmh,
                weather_id: logData.weather_id,
            },
        });

        throw new Error(error instanceof Error ? error.message : 'Failed to save navigation log');
    }
}

/**
 * 🔧 디버그 로그 저장 (Release에서도 확인 가능)
 */
async function saveDebugLog(log: any): Promise<void> {
    try {
        const existing = await AsyncStorage.getItem('DEBUG_NAV_LOGS');
        const logs = existing ? JSON.parse(existing) : [];
        logs.push(log);
        // 최근 20개만 유지
        if (logs.length > 20) {
            logs.shift();
        }
        await AsyncStorage.setItem('DEBUG_NAV_LOGS', JSON.stringify(logs));
    } catch (e) {
        // 로그 저장 실패는 무시
    }
}

/**
 * 🔧 디버그 로그 조회 (개발자 메뉴에서 사용)
 */
export async function getDebugLogs(): Promise<any[]> {
    try {
        const existing = await AsyncStorage.getItem('DEBUG_NAV_LOGS');
        return existing ? JSON.parse(existing) : [];
    } catch (e) {
        return [];
    }
}

/**
 * 🔧 디버그 로그 초기화
 */
export async function clearDebugLogs(): Promise<void> {
    await AsyncStorage.removeItem('DEBUG_NAV_LOGS');
}

/**
 * 네비게이션 로그 목록 조회
 */
export async function getNavigationLogs(
    userId: number,
    options?: {
        route_mode?: 'transit' | 'walking' | 'course';
        start_date?: Date;
        end_date?: Date;
        limit?: number;
        offset?: number;
    }
): Promise<{ total_count: number; logs: NavigationLogResponse[] }> {
    try {
        const params: Record<string, any> = { user_id: userId };

        if (options?.route_mode) {
            params.route_mode = options.route_mode;
        }
        if (options?.start_date) {
            params.start_date = options.start_date.toISOString();
        }
        if (options?.end_date) {
            params.end_date = options.end_date.toISOString();
        }
        if (options?.limit) {
            params.limit = options.limit;
        }
        if (options?.offset) {
            params.offset = options.offset;
        }

        return await apiClient.get<{ total_count: number; logs: NavigationLogResponse[] }>(
            '/api/navigation/logs',
            params,
        );
    } catch (error) {
        console.error('[navLog] list failed', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch navigation logs');
    }
}

/**
 * 네비게이션 로그 상세 조회
 */
export async function getNavigationLogDetail(
    logId: number,
    userId: number
): Promise<NavigationLogResponse> {
    try {
        return await apiClient.get<NavigationLogResponse>(
            `/api/navigation/logs/${logId}`,
            { user_id: userId },
        );
    } catch (error) {
        console.error('[navLog] detail failed', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch navigation log detail');
    }
}

/**
 * 네비게이션 통계 조회
 */
export async function getNavigationStatistics(
    userId: number,
    days: number = 30
): Promise<NavigationStatistics> {
    try {
        return await apiClient.get<NavigationStatistics>(
            '/api/navigation/logs/statistics/summary',
            { user_id: userId, days },
        );
    } catch (error) {
        console.error('[navLog] stats failed', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch navigation log stats');
    }
}

/**
 * 네비게이션 로그 삭제
 */
export async function deleteNavigationLog(
    logId: number,
    userId: number
): Promise<void> {
    try {
        const url = await buildUrl(`/api/navigation/logs/${logId}?user_id=${userId}`);
        const response = await fetch(url, { method: 'DELETE' });

        if (!response.ok) {
            const raw = await response.text();
            let message = toErrorMessage(raw, 'Failed to delete navigation log');

            try {
                const parsed = JSON.parse(raw);
                message = toErrorMessage(parsed.detail ?? parsed.message ?? parsed, message);
            } catch {
                // keep parsed message fallback
            }

            throw new Error(message);
        }
    } catch (error) {
        console.error('[navLog] delete failed', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to delete navigation log');
    }
}

/**
 * routeInfo에서 네비게이션 로그 데이터 추출
 */
export async function extractNavigationLogData(
    routeInfo: any,
    startLocation: any,
    endLocation: any,
    routeMode: 'transit' | 'walking',
    startTime: Date,
    endTime: Date,
    weatherData?: any,
    trackingData?: {
        activeWalkingTime: number;
        pausedTime: number;
        realSpeed: number;
        pauseCount: number;
        segments: MovementSegment[];
    }
): Promise<NavigationLogData> {
    // 총 거리 계산 (m)
    const totalDistanceM = routeInfo.totalDistance || 0;

    // 🔧 보행 거리: TMap 계획 보행 거리 사용 (속도 계산과 동일한 값으로 일관성 유지)
    // - 기존: GPS 세그먼트 측정 거리 (부정확, 619m vs 1564m 같은 차이 발생)
    // - 변경: TMap totalWalkDistance (실제 도로 기반 정확한 거리)
    const walkingDistanceM: number = routeInfo.totalWalkDistance || routeInfo.totalDistance || 0;

    // 교통수단 추출 (대중교통 경로인 경우)
    let transportModes: string[] = [];
    if (routeMode === 'transit' && routeInfo.legs) {
        transportModes = routeInfo.legs
            .map((leg: any) => leg.mode)
            .filter((mode: string, index: number, self: string[]) =>
                mode !== 'WALK' && self.indexOf(mode) === index
            );
    }

    // 횡단보도 개수
    const crosswalkCount = routeInfo.slopeAnalysis?.crosswalk_count || 0;

    // 계수들 추출
    const userSpeedFactor = routeInfo.slopeAnalysis?.factors?.user_speed_factor;
    const slopeFactor = routeInfo.slopeAnalysis?.factors?.slope_factor;
    const weatherFactor = routeInfo.slopeAnalysis?.factors?.weather_factor;

    // 예상 시간 (초) - 횡단보도 대기 시간 1/3 포함, 개인속도+경사도+날씨 적용
    // transit: 전체 이동시간 (대중교통 탑승 + 보행 + 횡단보도 1/3)
    // walking: 보행시간 + 횡단보도 1/3
    let estimatedTimeSeconds: number;
    let estimatedWalkTimeSeconds: number;  // 예측 보행 시간 (횡단보도 1/3 포함)

    if (routeMode === 'transit') {
        // 대중교통: 횡단보도 포함 보정된 보행시간 + 대중교통 탑승시간
        const adjustedWalkTimeWithCrosswalk = routeInfo.slopeAnalysis?.total_time_with_crosswalk
            || routeInfo.slopeAnalysis?.total_adjusted_walk_time
            || routeInfo.totalWalkTime
            || 0;
        const transitTime = (routeInfo.totalTime || 0) - (routeInfo.totalWalkTime || 0);
        estimatedTimeSeconds = adjustedWalkTimeWithCrosswalk + transitTime;
        estimatedWalkTimeSeconds = adjustedWalkTimeWithCrosswalk;  // 보행 시간만
    } else {
        // 도보: 횡단보도 포함 보정된 보행시간
        estimatedTimeSeconds = routeInfo.slopeAnalysis?.total_time_with_crosswalk
            || routeInfo.slopeAnalysis?.total_adjusted_walk_time
            || routeInfo.totalTime
            || 0;
        estimatedWalkTimeSeconds = estimatedTimeSeconds;  // 도보는 전체가 보행
    }

    // 실제 시간 (초)
    const actualTimeSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // 보행 시간 예측 정확도 계산
    const activeWalkingTime = trackingData?.activeWalkingTime || 0;
    const walkTimeDifference = activeWalkingTime > 0 ? activeWalkingTime - estimatedWalkTimeSeconds : 0;
    const walkAccuracyPercent = (estimatedWalkTimeSeconds > 0 && activeWalkingTime > 0)
        ? Math.round((100 - Math.abs(walkTimeDifference / estimatedWalkTimeSeconds) * 100) * 100) / 100
        : undefined;

    // 전체 시간 정확도 계산
    const timeDifferenceSeconds = actualTimeSeconds - estimatedTimeSeconds;
    const accuracyPercent = estimatedTimeSeconds > 0
        ? Math.round((100 - Math.abs(timeDifferenceSeconds / estimatedTimeSeconds) * 100) * 100) / 100
        : undefined;

    // 좌표 추출 (여러 형식 지원)
    let startLat = startLocation?.y || startLocation?.lat || routeInfo.rawItinerary?.legs?.[0]?.start?.lat;
    let startLon = startLocation?.x || startLocation?.lng || startLocation?.lon || routeInfo.rawItinerary?.legs?.[0]?.start?.lon;
    let endLat = endLocation?.y || endLocation?.lat || routeInfo.rawItinerary?.legs?.[routeInfo.rawItinerary?.legs?.length - 1]?.end?.lat;
    let endLon = endLocation?.x || endLocation?.lng || endLocation?.lon || routeInfo.rawItinerary?.legs?.[routeInfo.rawItinerary?.legs?.length - 1]?.end?.lon;

    console.log('🗺️ 좌표 추출:', { startLat, startLon, endLat, endLon });

    // 날씨 데이터 저장 및 weather_id 획득
    let weatherId: number | undefined = undefined;
    console.log('🌤️ Weather save 조건 체크:', {
        hasWeatherData: !!weatherData,
        weatherData: weatherData,
        startLat,
        startLon,
        willSave: !!(weatherData && startLat && startLon)
    });

    if (weatherData && startLat && startLon) {
        try {
            const weatherSaveUrl = await buildUrl('/api/weather/save');
            console.log('[navLog] Weather save request:', {
                url: weatherSaveUrl,
                data: {
                    latitude: startLat,
                    longitude: startLon,
                    temperature_celsius: weatherData.temp_c || 0,
                    weather_condition: weatherData.pty === 0 ? 'sunny' : weatherData.pty === 1 ? 'rainy' : weatherData.pty === 3 ? 'snowy' : 'cloudy',
                    precipitation_mm: weatherData.rain_mm_per_h || 0,
                }
            });

            const weatherSaveResponse = await fetch(weatherSaveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: startLat,
                    longitude: startLon,
                    temperature_celsius: weatherData.temp_c || 0,
                    weather_condition: weatherData.pty === 0 ? 'sunny' : weatherData.pty === 1 ? 'rainy' : weatherData.pty === 3 ? 'snowy' : 'cloudy',
                    precipitation_mm: weatherData.rain_mm_per_h || 0,
                }),
            });

            console.log('[navLog] Weather save response status:', weatherSaveResponse.status);

            if (weatherSaveResponse.ok) {
                const savedWeather = await weatherSaveResponse.json() as { weather_id: number };
                weatherId = savedWeather.weather_id;
                console.log('[navLog] Weather saved:', { savedWeather, weatherId });
            } else {
                const errorText = await weatherSaveResponse.text();
                console.error('[navLog] Weather save response error:', { status: weatherSaveResponse.status, error: errorText });
            }
        } catch (error) {
            console.error('[navLog] Weather save failed:', error);
        }
    }

    return {
        route_mode: routeMode,
        start_location: startLocation?.place_name || startLocation?.address || startLocation?.name || routeInfo.rawItinerary?.legs?.[0]?.start?.name,
        end_location: endLocation?.place_name || endLocation?.address || endLocation?.name || routeInfo.rawItinerary?.legs?.[routeInfo.rawItinerary?.legs?.length - 1]?.end?.name,
        start_lat: startLat,
        start_lon: startLon,
        end_lat: endLat,
        end_lon: endLon,
        total_distance_m: totalDistanceM,
        walking_distance_m: walkingDistanceM,
        transport_modes: transportModes.length > 0 ? transportModes : undefined,
        crosswalk_count: Math.round(crosswalkCount) || 0,  // 🔧 정수로 변환
        user_speed_factor: userSpeedFactor,
        slope_factor: slopeFactor,
        weather_factor: weatherFactor,
        estimated_time_seconds: Math.round(estimatedTimeSeconds) || 0,  // 🔧 정수로 변환
        actual_time_seconds: Math.round(actualTimeSeconds) || 0,  // 🔧 정수로 변환
        time_difference_seconds: timeDifferenceSeconds,  // 전체 시간 차이
        accuracy_percent: accuracyPercent,  // 전체 시간 예측 정확도
        // 보행 시간 예측 정확도
        estimated_walk_time_seconds: Math.round(estimatedWalkTimeSeconds) || 0,
        walk_time_difference_seconds: activeWalkingTime > 0 ? Math.round(walkTimeDifference) : undefined,
        walk_accuracy_percent: walkAccuracyPercent,
        // 실제 보행 측정
        active_walking_time_seconds: trackingData?.activeWalkingTime ? Math.round(trackingData.activeWalkingTime) : undefined,  // 🔧 정수로 변환
        paused_time_seconds: Math.round(trackingData?.pausedTime || 0),  // 🔧 정수로 변환
        real_walking_speed_kmh: trackingData?.realSpeed ? Math.round(trackingData.realSpeed * 3.6 * 100) / 100 : undefined,  // 🔧 소수점 2자리
        pause_count: Math.round(trackingData?.pauseCount || 0),  // 🔧 정수로 변환
        movement_data: trackingData ? {
            segments: trackingData.segments,
            detection_method: 'step_counter_hybrid',
            total_pauses: trackingData.pauseCount,
            crosswalk_pauses: trackingData.segments.filter(s => s.reason === 'crosswalk').length,
        } : undefined,
        weather_id: weatherId,
        route_data: routeInfo,  // 전체 경로 데이터 저장
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString(),
    };
}
