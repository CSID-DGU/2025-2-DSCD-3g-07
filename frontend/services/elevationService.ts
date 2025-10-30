/**
 * 경사도 분석 서비스
 * Google Elevation API를 활용한 경로 경사도 분석 및 보행 시간 보정
 */

import {
    Itinerary,
    RouteElevationAnalysis,
    AnalyzeSlopeRequest,
    WalkLegAnalysis
} from '@/types/api';
import Config from '@/config';

/**
 * Tmap 경로 데이터의 보행 구간 경사도를 분석하고 보정된 시간을 반환
 * 
 * @param itinerary - Tmap API의 itinerary 데이터
 * @param apiKey - Google Elevation API 키 (선택사항, 없으면 서버 환경변수 사용)
 * @param walkingSpeed - 보행 속도 (m/s) (선택사항, Health Connect Case 1 속도)
 * @returns 경사도 분석 결과 및 보정된 시간
 */
export async function analyzeRouteSlope(
    itinerary: Itinerary,
    apiKey?: string,
    walkingSpeed?: number
): Promise<RouteElevationAnalysis> {
    try {
        const requestBody: AnalyzeSlopeRequest = {
            itinerary,
            ...(apiKey && { api_key: apiKey }),
            ...(walkingSpeed && { walking_speed: walkingSpeed })
        };

        // Config에서 동적으로 감지된 API URL 사용
        const apiBaseUrl = Config.API_BASE_URL;
        console.log(`📍 [경사도 분석] Using API URL: ${apiBaseUrl}`);
        console.log(`📤 [경사도 분석] Request body:`, JSON.stringify(requestBody).substring(0, 200));

        // 타임아웃 설정 (30초)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${apiBaseUrl}/api/routes/analyze-slope`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal as any,
            });

            clearTimeout(timeoutId);

            console.log(`📊 [경사도 분석] Response status: ${response.status}`);

            if (!response.ok) {
                const errorData = await response.json() as { detail?: string };
                throw new Error(
                    errorData.detail || `API 오류: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json() as RouteElevationAnalysis;
            console.log(`✅ [경사도 분석] Success:`, data);
            return data;
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError?.name === 'AbortError') {
                throw new Error('경사도 분석 타임아웃 (30초 초과)');
            }
            throw fetchError;
        }
    } catch (error) {
        console.error('[경사도 분석 오류]', error);
        throw error;
    }
}

/**
 * 보정된 총 보행 시간을 가져옴
 * 
 * @param analysis - 경사도 분석 결과
 * @returns 보정된 총 보행 시간 (초)
 */
export function getAdjustedWalkingTime(analysis: RouteElevationAnalysis): number {
    return analysis.total_adjusted_walk_time;
}

/**
 * 원래 시간 대비 추가된 시간을 가져옴
 * 
 * @param analysis - 경사도 분석 결과
 * @returns 추가된 시간 (초), 양수면 더 오래 걸림, 음수면 더 빨리 도착
 */
export function getTimeDifference(analysis: RouteElevationAnalysis): number {
    return analysis.total_route_time_adjustment;
}

/**
 * 시간을 "분 초" 형식으로 포맷팅
 * 
 * @param seconds - 초 단위 시간
 * @returns "X분 Y초" 형식 문자열
 */
export function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
        return `${remainingSeconds}초`;
    } else if (remainingSeconds === 0) {
        return `${minutes}분`;
    } else {
        return `${minutes}분 ${remainingSeconds}초`;
    }
}

/**
 * 시간 차이를 "±X분 Y초" 형식으로 포맷팅
 * 
 * @param seconds - 시간 차이 (초)
 * @returns "±X분 Y초" 형식 문자열
 */
export function formatTimeDifference(seconds: number): string {
    const absSeconds = Math.abs(seconds);
    const sign = seconds >= 0 ? '+' : '-';
    const minutes = Math.floor(absSeconds / 60);
    const remainingSeconds = Math.round(absSeconds % 60);

    if (minutes === 0) {
        return `${sign}${remainingSeconds}초`;
    } else if (remainingSeconds === 0) {
        return `${sign}${minutes}분`;
    } else {
        return `${sign}${minutes}분 ${remainingSeconds}초`;
    }
}

/**
 * 경사도를 카테고리로 분류 (UI 표시용)
 * 
 * 주의: 이 카테고리는 UI 표시 목적입니다.
 * 실제 보행 시간 계산은 백엔드의 Tobler's Hiking Function을 사용합니다.
 * 
 * @param slope - 경사도 (%)
 * @returns 경사도 카테고리 ('flat', 'gentle', 'moderate', 'steep', 'very_steep')
 */
export function categorizSlope(slope: number): string {
    const absSlope = Math.abs(slope);

    if (absSlope < 3) return 'flat';
    if (absSlope < 5) return 'gentle';
    if (absSlope < 10) return 'moderate';
    if (absSlope < 15) return 'steep';
    return 'very_steep';
}

/**
 * 보행 구간별 경사도 요약 정보 생성
 * 
 * @param legAnalysis - 보행 구간 분석 결과
 * @returns 요약 정보 문자열
 */
export function getSlopeSummary(legAnalysis: WalkLegAnalysis): string {
    const { avg_slope, max_slope, min_slope } = legAnalysis;

    if (Math.abs(avg_slope) < 1) {
        return '평지 구간';
    }

    if (avg_slope > 0) {
        if (avg_slope < 5) {
            return `완만한 오르막 (평균 ${avg_slope.toFixed(1)}%)`;
        } else if (avg_slope < 10) {
            return `보통 오르막 (평균 ${avg_slope.toFixed(1)}%)`;
        } else {
            return `가파른 오르막 (평균 ${avg_slope.toFixed(1)}%)`;
        }
    } else {
        if (Math.abs(avg_slope) < 5) {
            return `완만한 내리막 (평균 ${Math.abs(avg_slope).toFixed(1)}%)`;
        } else {
            return `가파른 내리막 (평균 ${Math.abs(avg_slope).toFixed(1)}%)`;
        }
    }
}

/**
 * 전체 경로의 경사도 난이도 평가
 * 
 * @param analysis - 경사도 분석 결과
 * @returns 난이도 레벨 (1-5)
 */
export function getRouteDifficulty(analysis: RouteElevationAnalysis): number {
    const avgMaxSlope = analysis.walk_legs_analysis.reduce(
        (sum, leg) => sum + Math.abs(leg.max_slope),
        0
    ) / analysis.walk_legs_analysis.length;

    const timeIncrease = analysis.total_route_time_adjustment /
        analysis.total_original_walk_time * 100;

    // 최대 경사도와 시간 증가율을 기준으로 난이도 계산
    if (avgMaxSlope < 5 && timeIncrease < 10) return 1; // 쉬움
    if (avgMaxSlope < 10 && timeIncrease < 20) return 2; // 보통
    if (avgMaxSlope < 15 && timeIncrease < 30) return 3; // 약간 어려움
    if (avgMaxSlope < 20 && timeIncrease < 40) return 4; // 어려움
    return 5; // 매우 어려움
}

/**
 * 난이도를 텍스트로 변환
 * 
 * @param difficulty - 난이도 레벨 (1-5)
 * @returns 난이도 텍스트
 */
export function getDifficultyLabel(difficulty: number): string {
    const labels = ['', '쉬움', '보통', '약간 어려움', '어려움', '매우 어려움'];
    return labels[difficulty] || '알 수 없음';
}

/**
 * 경사도 데이터를 차트용 데이터로 변환
 * 
 * @param analysis - 경사도 분석 결과
 * @returns 차트 데이터 배열
 */
export function prepareChartData(analysis: RouteElevationAnalysis) {
    const chartData: Array<{
        distance: number;
        elevation: number;
        slope: number;
        legIndex: number;
    }> = [];

    let cumulativeDistance = 0;

    analysis.walk_legs_analysis.forEach((leg, legIndex) => {
        leg.segments.forEach((segment) => {
            chartData.push({
                distance: cumulativeDistance,
                elevation: segment.elevation_start,
                slope: segment.slope,
                legIndex
            });

            cumulativeDistance += segment.distance;

            // 마지막 지점 추가
            chartData.push({
                distance: cumulativeDistance,
                elevation: segment.elevation_end,
                slope: segment.slope,
                legIndex
            });
        });
    });

    return chartData;
}

/**
 * 예상 칼로리 소모량 계산 (간단한 추정)
 * 
 * @param analysis - 경사도 분석 결과
 * @param weight - 사용자 체중 (kg)
 * @returns 예상 칼로리 소모량 (kcal)
 */
export function estimateCalories(
    analysis: RouteElevationAnalysis,
    weight: number = 70
): number {
    // MET (Metabolic Equivalent of Task) 기반 계산
    // 평지 보행: 3.5 MET
    // 경사도에 따라 MET 값 증가

    let totalCalories = 0;

    analysis.walk_legs_analysis.forEach((leg) => {
        const timeHours = leg.adjusted_time / 3600;
        const avgSlope = Math.abs(leg.avg_slope);

        // 경사도에 따른 MET 값 계산
        let met = 3.5; // 기본 보행
        if (avgSlope > 0) {
            // 오르막
            met += avgSlope * 0.5; // 경사도 1%당 0.5 MET 증가
        }

        // 칼로리 = MET × 체중(kg) × 시간(hours)
        totalCalories += met * weight * timeHours;
    });

    return Math.round(totalCalories);
}

export default {
    analyzeRouteSlope,
    getAdjustedWalkingTime,
    getTimeDifference,
    formatTime,
    formatTimeDifference,
    categorizSlope,
    getSlopeSummary,
    getRouteDifficulty,
    getDifficultyLabel,
    prepareChartData,
    estimateCalories
};
