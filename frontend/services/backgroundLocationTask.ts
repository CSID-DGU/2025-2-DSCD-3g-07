/**
 * 백그라운드 위치 추적 태스크
 * 
 * 앱이 백그라운드에 있을 때도 위치를 추적하여
 * 경로 안내 중 정확한 보행 속도를 측정합니다.
 */

import * as Location from 'expo-location';

// TaskManager를 선택적으로 import
let TaskManager: any = null;
let isTaskManagerAvailable = false;

try {
    TaskManager = require('expo-task-manager');
    isTaskManagerAvailable = true;
} catch (error) {
    console.warn('⚠️ expo-task-manager를 사용할 수 없습니다. 백그라운드 위치 추적은 development build에서만 사용 가능합니다.');
}

// 백그라운드 위치 추적 태스크 이름
export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// 백그라운드에서 수집된 위치 데이터를 저장할 전역 변수
let backgroundLocations: Location.LocationObject[] = [];

/**
 * 백그라운드 위치 데이터 가져오기
 */
export function getBackgroundLocations(): Location.LocationObject[] {
    return [...backgroundLocations];
}

/**
 * 백그라운드 위치 데이터 초기화
 */
export function clearBackgroundLocations(): void {
    backgroundLocations = [];
}

/**
 * TaskManager 사용 가능 여부 확인
 */
export function isTaskManagerSupported(): boolean {
    return isTaskManagerAvailable;
}

/**
 * 백그라운드 위치 추적 태스크 정의
 */
if (isTaskManagerAvailable && TaskManager) {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
        if (error) {
            console.error('❌ 백그라운드 위치 추적 오류:', error);
            return;
        }

        if (data) {
            const { locations } = data as { locations: Location.LocationObject[] };

            // 위치 데이터 저장
            backgroundLocations.push(...locations);

            // 메모리 관리: 최근 1000개만 유지
            if (backgroundLocations.length > 1000) {
                backgroundLocations = backgroundLocations.slice(-1000);
            }

            console.log(`📍 백그라운드 위치 수집됨: ${locations.length}개, 총: ${backgroundLocations.length}개`);

            // 최신 위치 로깅
            if (locations.length > 0) {
                const latest = locations[locations.length - 1];
                if (latest) {
                    console.log(`   └─ 최신: (${latest.coords.latitude.toFixed(6)}, ${latest.coords.longitude.toFixed(6)})`);
                }
            }
        }
    });
}

/**
 * 백그라운드 위치 추적 시작
 */
export async function startBackgroundLocationTracking(): Promise<boolean> {
    try {
        // TaskManager가 사용 가능한지 확인
        if (!isTaskManagerAvailable || !TaskManager) {
            console.warn('⚠️ 백그라운드 위치 추적은 development build에서만 사용 가능합니다. Expo Go에서는 지원되지 않습니다.');
            return false;
        }

        // 1. 알림 권한 요청 (Android 13+)
        try {
            const { PermissionsAndroid, Platform } = await import('react-native');
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: '알림 권한 필요',
                        message: '백그라운드에서 경로 안내를 계속하려면 알림 권한이 필요합니다.',
                        buttonPositive: '허용',
                    }
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('⚠️ 알림 권한이 거부되었습니다. 알림바에 표시되지 않을 수 있습니다.');
                }
            }
        } catch (error) {
            console.warn('⚠️ 알림 권한 요청 실패:', error);
        }

        // 2. 백그라운드 위치 권한 확인
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

        if (foregroundStatus !== 'granted') {
            console.error('❌ 포어그라운드 위치 권한이 거부되었습니다');
            return false;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

        if (backgroundStatus !== 'granted') {
            console.error('❌ 백그라운드 위치 권한이 거부되었습니다');
            return false;
        }

        // 3. 이미 등록된 태스크가 있는지 확인
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

        if (isRegistered) {
            console.log('⚠️ 백그라운드 위치 추적이 이미 실행 중입니다');
            return true;
        }

        // 4. 백그라운드 위치 추적 시작
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000, // 1초마다 업데이트
            distanceInterval: 1, // 1m 이동 시 업데이트
            foregroundService: {
                notificationTitle: 'PaceTry 경로 안내 중',
                notificationBody: '실시간으로 위치를 추적하여 정확한 보행 속도를 측정합니다.',
                notificationColor: '#007AFF',
            },
            showsBackgroundLocationIndicator: true, // iOS: 백그라운드 위치 사용 표시
            deferredUpdatesInterval: 1000, // 1초마다 배치 업데이트
            deferredUpdatesDistance: 1, // 1m 간격
        });

        // 5. 기존 데이터 초기화
        clearBackgroundLocations();

        console.log('✅ 백그라운드 위치 추적 시작됨 - 알림바를 확인하세요');
        return true;

    } catch (error) {
        console.error('❌ 백그라운드 위치 추적 시작 실패:', error);
        return false;
    }
}

/**
 * 백그라운드 위치 추적 중지
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
    try {
        if (!isTaskManagerAvailable || !TaskManager) {
            console.warn('⚠️ TaskManager를 사용할 수 없습니다.');
            return;
        }

        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

        if (isRegistered) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            console.log('🛑 백그라운드 위치 추적 중지됨');
        }
    } catch (error) {
        console.error('❌ 백그라운드 위치 추적 중지 실패:', error);
    }
}

/**
 * 백그라운드 위치 추적 상태 확인
 */
export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
    try {
        if (!isTaskManagerAvailable || !TaskManager) {
            return false;
        }

        return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    } catch (error) {
        console.error('❌ 백그라운드 위치 추적 상태 확인 실패:', error);
        return false;
    }
}
