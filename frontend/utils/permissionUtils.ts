/**
 * 통합 권한 요청 유틸리티
 * 
 * 앱에서 필요한 모든 권한을 체계적으로 관리합니다.
 * - 위치 권한 (포어그라운드/백그라운드)
 * - 알림 권한 (Android 13+)
 * - 활동 인식 권한 (Android 10+)
 */

import * as Location from 'expo-location';
import { Platform, PermissionsAndroid, Alert, Linking, NativeModules } from 'react-native';

const { SensorServiceModule } = NativeModules;

export interface PermissionStatus {
    location: boolean;
    backgroundLocation: boolean;
    notification: boolean;
    activityRecognition: boolean;
    batteryOptimization: boolean;  // 배터리 최적화 제외 여부
}

export interface PermissionCheckResult extends PermissionStatus {
    allGranted: boolean;
    missingPermissions: string[];
}

/**
 * 모든 권한 상태 확인
 */
export async function checkAllPermissions(): Promise<PermissionCheckResult> {
    const status: PermissionStatus = {
        location: false,
        backgroundLocation: false,
        notification: true, // 기본값 true (Android 13 미만에서는 불필요)
        activityRecognition: true, // 기본값 true (Android 10 미만에서는 불필요)
        batteryOptimization: true, // 기본값 true (배터리 최적화 제외)
    };

    try {
        // 1. 위치 권한 확인
        const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
        status.location = foregroundStatus === 'granted';

        // 2. 백그라운드 위치 권한 확인
        const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
        status.backgroundLocation = backgroundStatus === 'granted';

        // 3. 알림 권한 확인 (Android 13+)
        if (Platform.OS === 'android') {
            const apiLevel = typeof Platform.Version === 'number'
                ? Platform.Version
                : parseInt(Platform.Version, 10);

            if (apiLevel >= 33) {
                const notificationGranted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                status.notification = notificationGranted;
            }

            // 4. 활동 인식 권한 확인 (Android 10+)
            if (apiLevel >= 29) {
                const activityGranted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
                );
                status.activityRecognition = activityGranted;
            }

            // 5. 배터리 최적화 제외 확인
            if (SensorServiceModule) {
                try {
                    status.batteryOptimization = await SensorServiceModule.isIgnoringBatteryOptimizations();
                } catch (e) {
                    console.warn('⚠️ 배터리 최적화 상태 확인 실패:', e);
                    status.batteryOptimization = false;
                }
            }
        }
    } catch (error) {
        console.error('❌ 권한 상태 확인 실패:', error);
    }

    // 누락된 권한 목록 생성
    const missingPermissions: string[] = [];
    if (!status.location) missingPermissions.push('위치');
    if (!status.backgroundLocation) missingPermissions.push('백그라운드 위치');
    if (!status.notification) missingPermissions.push('알림');
    if (!status.activityRecognition) missingPermissions.push('활동 인식');

    return {
        ...status,
        allGranted: missingPermissions.length === 0,
        missingPermissions,
    };
}

/**
 * 모든 필수 권한 요청
 * 사용자에게 순차적으로 권한을 요청합니다.
 */
export async function requestAllPermissions(): Promise<PermissionCheckResult> {
    const status: PermissionStatus = {
        location: false,
        backgroundLocation: false,
        notification: true,
        activityRecognition: true,
        batteryOptimization: true,
    };

    try {
        console.log('📋 통합 권한 요청 시작...');

        // 1. 위치 권한 (포어그라운드) 요청
        console.log('📍 위치 권한 요청 중...');
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        status.location = foregroundStatus === 'granted';

        if (!status.location) {
            console.warn('⚠️ 위치 권한 거부됨');
            return createResult(status);
        }
        console.log('✅ 위치 권한 허용됨');

        // 2. 백그라운드 위치 권한 요청
        console.log('📍 백그라운드 위치 권한 요청 중...');
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        status.backgroundLocation = backgroundStatus === 'granted';

        if (!status.backgroundLocation) {
            console.warn('⚠️ 백그라운드 위치 권한 거부됨');
        } else {
            console.log('✅ 백그라운드 위치 권한 허용됨');
        }

        // Android 전용 권한들
        if (Platform.OS === 'android') {
            const apiLevel = typeof Platform.Version === 'number'
                ? Platform.Version
                : parseInt(Platform.Version, 10);

            // 3. 알림 권한 (Android 13+)
            if (apiLevel >= 33) {
                console.log('🔔 알림 권한 요청 중...');
                const notificationResult = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: '알림 권한',
                        message: '백그라운드에서 경로 안내 상태를 표시하기 위해 알림 권한이 필요합니다.',
                        buttonPositive: '허용',
                        buttonNegative: '거부',
                    }
                );
                status.notification = notificationResult === PermissionsAndroid.RESULTS.GRANTED;

                if (!status.notification) {
                    console.warn('⚠️ 알림 권한 거부됨');
                } else {
                    console.log('✅ 알림 권한 허용됨');
                }
            }

            // 4. 활동 인식 권한 (Android 10+)
            if (apiLevel >= 29) {
                console.log('🚶 활동 인식 권한 요청 중...');
                const activityResult = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
                    {
                        title: '활동 인식 권한',
                        message: '정확한 보행 속도 측정을 위해 활동 인식 권한이 필요합니다.\n\n만보계 센서를 사용하여 걷기, 뛰기, 정지 상태를 정확히 구분합니다.',
                        buttonPositive: '허용',
                        buttonNegative: '거부',
                    }
                );
                status.activityRecognition = activityResult === PermissionsAndroid.RESULTS.GRANTED;

                if (!status.activityRecognition) {
                    console.warn('⚠️ 활동 인식 권한 거부됨');
                } else {
                    console.log('✅ 활동 인식 권한 허용됨');
                }
            }

            // 5. 배터리 최적화 제외 요청
            if (SensorServiceModule) {
                try {
                    const isIgnoring = await SensorServiceModule.isIgnoringBatteryOptimizations();
                    if (!isIgnoring) {
                        console.log('🔋 배터리 최적화 제외 요청 중...');
                        await new Promise<void>((resolve) => {
                            Alert.alert(
                                '배터리 최적화 제외 필요',
                                '백그라운드에서 정확한 보행 추적을 위해 배터리 최적화를 "제한 없음"으로 설정해주세요.\n\n다음 화면에서 "제한 없음"을 선택해주세요.',
                                [
                                    {
                                        text: '설정하기',
                                        onPress: async () => {
                                            await SensorServiceModule.requestIgnoreBatteryOptimization();
                                            // 설정 후 상태 다시 확인
                                            setTimeout(async () => {
                                                status.batteryOptimization = await SensorServiceModule.isIgnoringBatteryOptimizations();
                                                resolve();
                                            }, 1000);
                                        },
                                    },
                                    {
                                        text: '나중에',
                                        style: 'cancel',
                                        onPress: () => {
                                            status.batteryOptimization = false;
                                            resolve();
                                        },
                                    },
                                ]
                            );
                        });
                        if (status.batteryOptimization) {
                            console.log('✅ 배터리 최적화 제외됨');
                        } else {
                            console.warn('⚠️ 배터리 최적화 제외 거부됨');
                        }
                    } else {
                        status.batteryOptimization = true;
                        console.log('✅ 배터리 최적화 이미 제외됨');
                    }
                } catch (e) {
                    console.warn('⚠️ 배터리 최적화 요청 실패:', e);
                    status.batteryOptimization = false;
                }
            }
        }

        console.log('📋 통합 권한 요청 완료');

    } catch (error) {
        console.error('❌ 권한 요청 중 오류:', error);
    }

    return createResult(status);
}

/**
 * 누락된 권한만 요청
 * 이미 허용된 권한은 건너뛰고 누락된 권한만 요청합니다.
 */
export async function requestMissingPermissions(
    currentStatus: PermissionCheckResult
): Promise<PermissionCheckResult> {
    const status: PermissionStatus = {
        location: currentStatus.location,
        backgroundLocation: currentStatus.backgroundLocation,
        notification: currentStatus.notification,
        activityRecognition: currentStatus.activityRecognition,
        batteryOptimization: currentStatus.batteryOptimization,
    };

    try {
        console.log('📋 누락된 권한만 요청 시작...');

        // 백그라운드 위치 권한이 없고, 포어그라운드 위치 권한이 있으면 요청
        if (!status.backgroundLocation && status.location) {
            console.log('📍 백그라운드 위치 권한 요청 중...');
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            status.backgroundLocation = backgroundStatus === 'granted';
            if (status.backgroundLocation) {
                console.log('✅ 백그라운드 위치 권한 허용됨');
            } else {
                console.warn('⚠️ 백그라운드 위치 권한 거부됨');
            }
        }

        // Android 전용 권한들
        if (Platform.OS === 'android') {
            const apiLevel = typeof Platform.Version === 'number'
                ? Platform.Version
                : parseInt(Platform.Version, 10);

            // 알림 권한이 없으면 요청 (Android 13+)
            if (apiLevel >= 33 && !status.notification) {
                console.log('🔔 알림 권한 요청 중...');
                const notificationResult = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: '알림 권한',
                        message: '백그라운드에서 경로 안내 상태를 표시하기 위해 알림 권한이 필요합니다.',
                        buttonPositive: '허용',
                        buttonNegative: '거부',
                    }
                );
                status.notification = notificationResult === PermissionsAndroid.RESULTS.GRANTED;
                if (status.notification) {
                    console.log('✅ 알림 권한 허용됨');
                } else {
                    console.warn('⚠️ 알림 권한 거부됨');
                }
            }

            // 활동 인식 권한이 없으면 요청 (Android 10+)
            if (apiLevel >= 29 && !status.activityRecognition) {
                console.log('🚶 활동 인식 권한 요청 중...');
                const activityResult = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
                    {
                        title: '활동 인식 권한',
                        message: '정확한 보행 속도 측정을 위해 활동 인식 권한이 필요합니다.\n\n만보계 센서를 사용하여 걷기, 뛰기, 정지 상태를 정확히 구분합니다.',
                        buttonPositive: '허용',
                        buttonNegative: '거부',
                    }
                );
                status.activityRecognition = activityResult === PermissionsAndroid.RESULTS.GRANTED;
                if (status.activityRecognition) {
                    console.log('✅ 활동 인식 권한 허용됨');
                } else {
                    console.warn('⚠️ 활동 인식 권한 거부됨');
                }
            }

            // 배터리 최적화 제외가 안 되어 있으면 요청
            if (SensorServiceModule && !status.batteryOptimization) {
                try {
                    const isIgnoring = await SensorServiceModule.isIgnoringBatteryOptimizations();
                    if (!isIgnoring) {
                        console.log('🔋 배터리 최적화 제외 요청 중...');
                        await SensorServiceModule.requestIgnoreBatteryOptimization();
                        // 잠시 후 상태 확인
                        await new Promise(r => setTimeout(r, 1000));
                        status.batteryOptimization = await SensorServiceModule.isIgnoringBatteryOptimizations();
                    } else {
                        status.batteryOptimization = true;
                    }
                } catch (e) {
                    console.warn('⚠️ 배터리 최적화 요청 실패:', e);
                }
            }
        }

        console.log('📋 누락된 권한 요청 완료');

    } catch (error) {
        console.error('❌ 권한 요청 중 오류:', error);
    }

    return createResult(status);
}

/**
 * 필수 권한만 요청 (위치 + 알림)
 * 안내 시작 전 최소한의 권한만 요청합니다.
 */
export async function requestEssentialPermissions(): Promise<{
    location: boolean;
    notification: boolean;
}> {
    const result = {
        location: false,
        notification: true,
    };

    try {
        // 1. 위치 권한 요청
        const { status } = await Location.requestForegroundPermissionsAsync();
        result.location = status === 'granted';

        // 2. 알림 권한 요청 (Android 13+)
        if (Platform.OS === 'android') {
            const apiLevel = typeof Platform.Version === 'number'
                ? Platform.Version
                : parseInt(Platform.Version, 10);

            if (apiLevel >= 33) {
                const notificationResult = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: '알림 권한',
                        message: '경로 안내 알림을 표시하기 위해 권한이 필요합니다.',
                        buttonPositive: '허용',
                        buttonNegative: '거부',
                    }
                );
                result.notification = notificationResult === PermissionsAndroid.RESULTS.GRANTED;
            }
        }
    } catch (error) {
        console.error('❌ 필수 권한 요청 실패:', error);
    }

    return result;
}

/**
 * 권한 상태에 따른 안내 메시지 표시
 */
export function showPermissionAlert(result: PermissionCheckResult): void {
    if (result.allGranted) {
        return; // 모든 권한이 있으면 알림 불필요
    }

    const missingList = result.missingPermissions.join(', ');

    // 필수 권한(위치)이 없는 경우
    if (!result.location) {
        Alert.alert(
            '위치 권한 필요',
            '경로 안내를 위해 위치 권한이 반드시 필요합니다.\n\n설정에서 위치 권한을 허용해주세요.',
            [
                { text: '취소', style: 'cancel' },
                { text: '설정으로 이동', onPress: () => Linking.openSettings() },
            ]
        );
        return;
    }

    // 선택 권한이 없는 경우 (안내만)
    if (result.missingPermissions.length > 0) {
        Alert.alert(
            '일부 권한 미허용',
            `다음 권한이 허용되지 않았습니다: ${missingList}\n\n일부 기능이 제한될 수 있습니다.`,
            [
                { text: '계속 진행', style: 'default' },
                { text: '설정으로 이동', onPress: () => Linking.openSettings() },
            ]
        );
    }
}

/**
 * 앱 시작 시 권한 체크 및 요청
 * 필수 권한이 없으면 요청하고, 결과를 반환합니다.
 * 
 * 권한 요청 시점:
 * - 위치 권한이 없으면 → 모든 권한 순차 요청
 * - 위치 권한만 있고 다른 권한이 없으면 → 누락된 권한만 요청
 */
export async function initializePermissions(): Promise<PermissionCheckResult> {
    // 먼저 현재 권한 상태 확인
    const currentStatus = await checkAllPermissions();
    console.log('📋 현재 권한 상태:', JSON.stringify(currentStatus, null, 2));

    // 이미 모든 권한이 있으면 그대로 반환
    if (currentStatus.allGranted) {
        console.log('✅ 모든 권한 이미 허용됨');
        return currentStatus;
    }

    // 필수 권한(위치)이 없으면 모든 권한 요청
    if (!currentStatus.location) {
        console.log('📋 위치 권한 없음 - 전체 권한 요청 시작');
        return await requestAllPermissions();
    }

    // 위치 권한은 있지만 다른 권한이 없는 경우 → 누락된 권한만 요청
    console.log(`⚠️ 일부 권한 누락: ${currentStatus.missingPermissions.join(', ')}`);
    return await requestMissingPermissions(currentStatus);
}

/**
 * 경로 안내 시작 전 권한 확인
 * 필요한 권한이 없으면 요청합니다.
 */
export async function ensureNavigationPermissions(): Promise<boolean> {
    const status = await checkAllPermissions();

    // 위치 권한이 없으면 요청
    if (!status.location) {
        const result = await requestAllPermissions();
        if (!result.location) {
            showPermissionAlert(result);
            return false;
        }
    }

    // 백그라운드 위치 권한이 없으면 요청 (선택)
    if (!status.backgroundLocation) {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            console.warn('⚠️ 백그라운드 위치 권한 거부 - 포어그라운드에서만 동작');
        }
    }

    return true;
}

// 내부 헬퍼 함수
function createResult(status: PermissionStatus): PermissionCheckResult {
    const missingPermissions: string[] = [];
    if (!status.location) missingPermissions.push('위치');
    if (!status.backgroundLocation) missingPermissions.push('백그라운드 위치');
    if (!status.notification) missingPermissions.push('알림');
    if (!status.activityRecognition) missingPermissions.push('활동 인식');
    if (!status.batteryOptimization) missingPermissions.push('배터리 최적화 제외');

    return {
        ...status,
        allGranted: missingPermissions.length === 0,
        missingPermissions,
    };
}

export default {
    checkAllPermissions,
    requestAllPermissions,
    requestEssentialPermissions,
    showPermissionAlert,
    initializePermissions,
    ensureNavigationPermissions,
};
