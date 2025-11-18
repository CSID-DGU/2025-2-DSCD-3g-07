/**
 * 네비게이션 로그 API 서비스
 * 
 * 경로 안내 기록을 저장하고 조회하는 API 호출 함수들
 */

import Config from '@/config';

export interface NavigationLogData {
    route_mode: 'transit' | 'walking';

    // 위치 정보
    start_location?: string;
    end_location?: string;
    start_lat: number;
    start_lon: number;
    end_lat: number;
    end_lon: number;

    // 경로 상세 정보
    total_distance_m: number;
    transport_modes?: string[];
    crosswalk_count?: number;

    // 보행 시간 계산 계수
    user_speed_factor?: number;
    slope_factor?: number;
    weather_factor?: number;

    // 시간 정보
    estimated_time_seconds: number;
    actual_time_seconds: number;

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
    transport_modes?: string[];
    crosswalk_count: number;
    user_speed_factor?: number;
    slope_factor?: number;
    weather_factor?: number;
    estimated_time_seconds: number;
    actual_time_seconds: number;
    time_difference_seconds: number;
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
    try {
        const response = await fetch(`${Config.API_BASE_URL}/navigation/logs?user_id=${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logData),
        });

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(error.detail || '네비게이션 로그 저장 실패');
        }

        return await response.json() as NavigationLogResponse;
    } catch (error) {
        console.error('❌ 네비게이션 로그 저장 오류:', error);
        throw error;
    }
}

/**
 * 네비게이션 로그 목록 조회
 */
export async function getNavigationLogs(
    userId: number,
    options?: {
        route_mode?: 'transit' | 'walking';
        start_date?: Date;
        end_date?: Date;
        limit?: number;
        offset?: number;
    }
): Promise<{ total_count: number; logs: NavigationLogResponse[] }> {
    try {
        const params = new URLSearchParams({
            user_id: userId.toString(),
        });

        if (options?.route_mode) {
            params.append('route_mode', options.route_mode);
        }
        if (options?.start_date) {
            params.append('start_date', options.start_date.toISOString());
        }
        if (options?.end_date) {
            params.append('end_date', options.end_date.toISOString());
        }
        if (options?.limit) {
            params.append('limit', options.limit.toString());
        }
        if (options?.offset) {
            params.append('offset', options.offset.toString());
        }

        const response = await fetch(`${Config.API_BASE_URL}/navigation/logs?${params}`);

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(error.detail || '네비게이션 로그 조회 실패');
        }

        return await response.json() as { total_count: number; logs: NavigationLogResponse[] };
    } catch (error) {
        console.error('❌ 네비게이션 로그 조회 오류:', error);
        throw error;
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
        const response = await fetch(
            `${Config.API_BASE_URL}/navigation/logs/${logId}?user_id=${userId}`
        );

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(error.detail || '네비게이션 로그 상세 조회 실패');
        }

        return await response.json() as NavigationLogResponse;
    } catch (error) {
        console.error('❌ 네비게이션 로그 상세 조회 오류:', error);
        throw error;
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
        const response = await fetch(
            `${Config.API_BASE_URL}/navigation/logs/statistics/summary?user_id=${userId}&days=${days}`
        );

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(error.detail || '네비게이션 통계 조회 실패');
        }

        return await response.json() as NavigationStatistics;
    } catch (error) {
        console.error('❌ 네비게이션 통계 조회 오류:', error);
        throw error;
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
        const response = await fetch(
            `${Config.API_BASE_URL}/navigation/logs/${logId}?user_id=${userId}`,
            {
                method: 'DELETE',
            }
        );

        if (!response.ok) {
            const error: any = await response.json();
            throw new Error(error.detail || '네비게이션 로그 삭제 실패');
        }
    } catch (error) {
        console.error('❌ 네비게이션 로그 삭제 오류:', error);
        throw error;
    }
}

/**
 * routeInfo에서 네비게이션 로그 데이터 추출
 */
export function extractNavigationLogData(
    routeInfo: any,
    startLocation: any,
    endLocation: any,
    routeMode: 'transit' | 'walking',
    startTime: Date,
    endTime: Date
): NavigationLogData {
    // 총 거리 계산 (m)
    const totalDistanceM = routeInfo.totalDistance || 0;

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

    // 예상 시간 (초)
    const estimatedTimeSeconds = routeInfo.slopeAnalysis?.total_time_with_crosswalk
        || routeInfo.totalTime
        || 0;

    // 실제 시간 (초)
    const actualTimeSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    return {
        route_mode: routeMode,
        start_location: startLocation?.place_name || startLocation?.address,
        end_location: endLocation?.place_name || endLocation?.address,
        start_lat: startLocation?.y || startLocation?.lat,
        start_lon: startLocation?.x || startLocation?.lng,
        end_lat: endLocation?.y || endLocation?.lat,
        end_lon: endLocation?.x || endLocation?.lng,
        total_distance_m: totalDistanceM,
        transport_modes: transportModes.length > 0 ? transportModes : undefined,
        crosswalk_count: crosswalkCount,
        user_speed_factor: userSpeedFactor,
        slope_factor: slopeFactor,
        weather_factor: weatherFactor,
        estimated_time_seconds: estimatedTimeSeconds,
        actual_time_seconds: actualTimeSeconds,
        route_data: routeInfo,  // 전체 경로 데이터 저장
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString(),
    };
}
