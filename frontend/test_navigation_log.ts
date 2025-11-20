/**
 * 네비게이션 로그 프론트엔드 테스트
 * 
 * DB 적재 전 데이터 추출 및 변환 테스트
 */

import { extractNavigationLogData } from './services/navigationLogService';

// 모의 routeInfo 데이터 (대중교통)
const mockTransitRouteInfo = {
    totalDistance: 8500,
    totalTime: 2400,
    slopeAnalysis: {
        crosswalk_count: 3,
        total_time_with_crosswalk: 2400,
        factors: {
            user_speed_factor: 0.950,
            slope_factor: 1.05,
            weather_factor: 1.1,
        },
    },
    legs: [
        { mode: 'WALK' },
        { mode: 'BUS' },
        { mode: 'WALK' },
        { mode: 'SUBWAY' },
        { mode: 'WALK' },
    ],
};

// 모의 routeInfo 데이터 (도보)
const mockWalkingRouteInfo = {
    totalDistance: 2500.5,
    totalTime: 1800,
    slopeAnalysis: {
        crosswalk_count: 5,
        total_time_with_crosswalk: 1800,
        factors: {
            user_speed_factor: 0.887,
            slope_factor: 1.15,
            weather_factor: 1.0,
        },
    },
};

// 모의 위치 데이터
const mockStartLocation = {
    place_name: '동국대학교',
    y: 37.558,
    x: 127.000,
};

const mockEndLocation = {
    place_name: '강남역',
    y: 37.498,
    x: 127.028,
};

/**
 * 테스트 1: 대중교통 경로 데이터 추출
 */
async function testTransitDataExtraction() {
    console.log('\n' + '='.repeat(60));
    console.log('1. 대중교통 경로 데이터 추출 테스트');
    console.log('='.repeat(60));

    const startTime = new Date('2025-11-18T14:00:00');
    const endTime = new Date('2025-11-18T14:42:30');

    try {
        const logData = await extractNavigationLogData(
            mockTransitRouteInfo,
            mockStartLocation,
            mockEndLocation,
            'transit',
            startTime,
            endTime
        );

        console.log('✅ 데이터 추출 성공');
        console.log('   - 경로 모드:', logData.route_mode);
        console.log('   - 출발지:', logData.start_location);
        console.log('   - 도착지:', logData.end_location);
        console.log('   - 총 거리:', logData.total_distance_m, 'm');
        console.log('   - 교통수단:', logData.transport_modes);
        console.log('   - 횡단보도:', logData.crosswalk_count, '개');
        console.log('   - 속도 계수:', logData.user_speed_factor);
        console.log('   - 경사도 계수:', logData.slope_factor);
        console.log('   - 날씨 계수:', logData.weather_factor);
        console.log('   - 예상 시간:', logData.estimated_time_seconds, '초');
        console.log('   - 실제 시간:', logData.actual_time_seconds, '초');
        console.log('   - 시간 차이:', logData.actual_time_seconds - logData.estimated_time_seconds, '초');

        return true;
    } catch (error) {
        console.error('❌ 데이터 추출 실패:', error);
        return false;
    }
}

/**
 * 테스트 2: 도보 경로 데이터 추출
 */
async function testWalkingDataExtraction() {
    console.log('\n' + '='.repeat(60));
    console.log('2. 도보 경로 데이터 추출 테스트');
    console.log('='.repeat(60));

    const startTime = new Date('2025-11-18T10:00:00');
    const endTime = new Date('2025-11-18T10:27:30');

    try {
        const logData = await extractNavigationLogData(
            mockWalkingRouteInfo,
            { place_name: '동국대학교', y: 37.558, x: 127.000 },
            { place_name: '남산타워', y: 37.551, x: 126.988 },
            'walking',
            startTime,
            endTime
        );

        console.log('✅ 데이터 추출 성공');
        console.log('   - 경로 모드:', logData.route_mode);
        console.log('   - 교통수단:', logData.transport_modes || '없음');
        console.log('   - 횡단보도:', logData.crosswalk_count, '개');
        console.log('   - 계수들:', {
            user: logData.user_speed_factor,
            slope: logData.slope_factor,
            weather: logData.weather_factor,
        });

        return true;
    } catch (error) {
        console.error('❌ 데이터 추출 실패:', error);
        return false;
    }
}

/**
 * 테스트 3: 교통수단 추출 검증
 */
async function testTransportModesExtraction() {
    console.log('\n' + '='.repeat(60));
    console.log('3. 교통수단 추출 검증');
    console.log('='.repeat(60));

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 2550000); // 42.5분 후

    const logData = await extractNavigationLogData(
        mockTransitRouteInfo,
        mockStartLocation,
        mockEndLocation,
        'transit',
        startTime,
        endTime
    );

    console.log('✅ 추출된 교통수단:', logData.transport_modes);
    console.log('   - WALK 제외 확인:', !logData.transport_modes?.includes('WALK'));
    console.log('   - 중복 제거 확인:', new Set(logData.transport_modes).size === logData.transport_modes?.length);

    const success = logData.transport_modes !== undefined &&
        logData.transport_modes.length === 2 &&
        logData.transport_modes.includes('BUS') &&
        logData.transport_modes.includes('SUBWAY');

    return success;
}

/**
 * 테스트 4: 계수 누락 처리
 */
async function testMissingFactors() {
    console.log('\n' + '='.repeat(60));
    console.log('4. 계수 누락 처리 테스트');
    console.log('='.repeat(60));

    const routeInfoWithoutFactors = {
        totalDistance: 1000,
        totalTime: 600,
        // slopeAnalysis 없음
    };

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 650000); // 10분 50초 후

    try {
        const logData = await extractNavigationLogData(
            routeInfoWithoutFactors,
            mockStartLocation,
            mockEndLocation,
            'walking',
            startTime,
            endTime
        );

        console.log('✅ 계수 없는 데이터 처리 성공');
        console.log('   - user_speed_factor:', logData.user_speed_factor || 'undefined');
        console.log('   - slope_factor:', logData.slope_factor || 'undefined');
        console.log('   - weather_factor:', logData.weather_factor || 'undefined');
        console.log('   - crosswalk_count:', logData.crosswalk_count);

        return true;
    } catch (error) {
        console.error('❌ 계수 없는 데이터 처리 실패:', error);
        return false;
    }
}

/**
 * 테스트 5: 시간 계산 정확성
 */
async function testTimeCalculation() {
    console.log('\n' + '='.repeat(60));
    console.log('5. 시간 계산 정확성 테스트');
    console.log('='.repeat(60));

    const startTime = new Date('2025-11-18T10:00:00');
    const endTime = new Date('2025-11-18T10:27:30'); // 27분 30초 = 1650초

    const logData = await extractNavigationLogData(
        mockWalkingRouteInfo,
        mockStartLocation,
        mockEndLocation,
        'walking',
        startTime,
        endTime
    );

    const expectedSeconds = 1650;
    const success = logData.actual_time_seconds === expectedSeconds;

    if (success) {
        console.log('✅ 시간 계산 정확');
        console.log(`   - 계산된 시간: ${logData.actual_time_seconds}초`);
        console.log(`   - 예상 시간: ${expectedSeconds}초`);
    } else {
        console.log('❌ 시간 계산 오류');
        console.log(`   - 계산된 시간: ${logData.actual_time_seconds}초`);
        console.log(`   - 예상 시간: ${expectedSeconds}초`);
    }

    return success;
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('네비게이션 로그 프론트엔드 테스트');
    console.log('='.repeat(60));

    const results: boolean[] = [];

    results.push(await testTransitDataExtraction());
    results.push(await testWalkingDataExtraction());
    results.push(await testTransportModesExtraction());
    results.push(await testMissingFactors());
    results.push(await testTimeCalculation());

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('테스트 결과 요약');
    console.log('='.repeat(60));

    const total = results.length;
    const passed = results.filter(r => r).length;
    const failed = total - passed;

    console.log(`총 테스트: ${total}개`);
    console.log(`✅ 성공: ${passed}개`);
    console.log(`❌ 실패: ${failed}개`);
    console.log(`성공률: ${(passed / total * 100).toFixed(1)}%`);

    if (failed === 0) {
        console.log('\n🎉 모든 테스트 통과! API 호출 준비 완료');
    } else {
        console.log('\n⚠️  일부 테스트 실패. 수정 후 재테스트 필요');
    }
}

// 실행
runTests();
