/**
 * GPX 경로 추천 서비스
 * 백엔드 DB에 저장된 GPX 경로를 조회하고 추천받는 서비스
 */

import Config from '@/config';

export interface GPXRouteRecommendation {
    route_id: number;
    route_name: string;
    route_type: string;
    distance_km: number;
    estimated_duration_minutes: number;
    total_elevation_gain_m: number;
    difficulty_level: 'easy' | 'moderate' | 'hard';
    avg_rating: number | null;
    rating_count: number;
    start_point: {
        lat: number;
        lng: number;
    };
    end_point: {
        lat: number;
        lng: number;
    };
    total_elevation_loss_m: number;
    distance_from_user: number | null;
    description: string;
}

export interface RecommendRoutesParams {
    distance_km?: number;
    duration_minutes?: number;
    difficulty?: 'easy' | 'moderate' | 'hard';
    route_type?: 'walking' | 'running' | 'mixed';
    user_lat?: number;
    user_lng?: number;
    user_speed_kmh?: number; // 사용자 평균 보행 속도 (km/h, Health Connect Case 2)
    max_distance_from_user?: number;
    distance_tolerance?: number; // 거리 허용 오차 (km)
    duration_tolerance?: number; // 시간 허용 오차 (분)
    limit?: number;
}

/**
 * GPX 경로 추천 받기
 */
export async function getRecommendedRoutes(
    params: RecommendRoutesParams
): Promise<GPXRouteRecommendation[]> {
    try {
        const queryParams = new URLSearchParams();

        if (params.distance_km !== undefined) {
            queryParams.append('distance_km', params.distance_km.toString());
        }
        if (params.duration_minutes !== undefined) {
            queryParams.append('duration_minutes', params.duration_minutes.toString());
        }
        if (params.difficulty) {
            queryParams.append('difficulty', params.difficulty);
        }
        if (params.route_type) {
            queryParams.append('route_type', params.route_type);
        }
        if (params.user_lat !== undefined) {
            queryParams.append('user_lat', params.user_lat.toString());
        }
        if (params.user_lng !== undefined) {
            queryParams.append('user_lng', params.user_lng.toString());
        }
        if (params.user_speed_kmh !== undefined) {
            queryParams.append('user_speed_kmh', params.user_speed_kmh.toString());
        }
        if (params.max_distance_from_user !== undefined) {
            queryParams.append('max_distance_from_user', params.max_distance_from_user.toString());
        }
        if (params.distance_tolerance !== undefined) {
            queryParams.append('distance_tolerance', params.distance_tolerance.toString());
        }
        if (params.duration_tolerance !== undefined) {
            queryParams.append('duration_tolerance', params.duration_tolerance.toString());
        }
        if (params.limit !== undefined) {
            queryParams.append('limit', params.limit.toString());
        }

        const url = `${Config.API_BASE_URL}/api/routes/recommend?${queryParams.toString()}`;
        console.log('🔍 GPX 경로 추천 요청:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: any = await response.json();
        console.log('✅ GPX 경로 추천 성공:', data);

        return data.recommended_routes || [];
    } catch (error) {
        console.error('❌ GPX 경로 추천 실패:', error);
        throw error;
    }
}

/**
 * 특정 경로 상세 조회
 */
export async function getRouteDetail(routeId: number): Promise<any> {
    try {
        const url = `${Config.API_BASE_URL}/api/routes/routes/${routeId}`;
        console.log('🔍 경로 상세 조회:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 경로 상세 조회 성공:', data);

        return data;
    } catch (error) {
        console.error('❌ 경로 상세 조회 실패:', error);
        throw error;
    }
}

/**
 * 경로 목록 조회
 */
export async function getRoutes(params?: {
    route_type?: string;
    difficulty?: string;
    min_distance?: number;
    max_distance?: number;
    limit?: number;
    offset?: number;
}): Promise<any> {
    try {
        const queryParams = new URLSearchParams();

        if (params?.route_type) queryParams.append('route_type', params.route_type);
        if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
        if (params?.min_distance !== undefined) queryParams.append('min_distance', params.min_distance.toString());
        if (params?.max_distance !== undefined) queryParams.append('max_distance', params.max_distance.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const url = `${Config.API_BASE_URL}/api/routes/routes?${queryParams.toString()}`;
        console.log('🔍 경로 목록 조회:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 경로 목록 조회 성공:', data);

        return data;
    } catch (error) {
        console.error('❌ 경로 목록 조회 실패:', error);
        throw error;
    }
}
