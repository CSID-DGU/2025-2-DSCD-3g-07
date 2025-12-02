/**
 * 네이티브 센서 서비스 모듈
 * 
 * Android 네이티브 SensorService를 React Native에서 사용할 수 있게 하는 래퍼입니다.
 * 백그라운드에서도 가속도계와 Pedometer 데이터를 수집할 수 있습니다.
 */

import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { SensorServiceModule } = NativeModules;

export interface AccelData {
    timestamp: number;
    x: number;
    y: number;
    z: number;
    magnitude: number;
}

export interface StepData {
    timestamp: number;
    steps: number;
    deltaSteps: number;
}

export interface SensorAvailability {
    accelerometer: boolean;
    stepCounter: boolean;
    stepDetector: boolean;
}

class NativeSensorService {
    private isAvailable: boolean;

    constructor() {
        this.isAvailable = Platform.OS === 'android' && !!SensorServiceModule;

        if (!this.isAvailable) {
            console.warn('⚠️ NativeSensorService는 Android에서만 사용 가능합니다.');
        }
    }

    /**
     * ACTIVITY_RECOGNITION 권한 요청 (Android 10+)
     */
    async requestPermissions(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            const apiLevel = typeof Platform.Version === 'number'
                ? Platform.Version
                : parseInt(Platform.Version, 10);

            // Android 10 (API 29) 이상에서 ACTIVITY_RECOGNITION 필요
            if (apiLevel >= 29) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
                    {
                        title: '활동 인식 권한',
                        message: '보행 추적을 위해 활동 인식 권한이 필요합니다.',
                        buttonPositive: '허용',
                        buttonNegative: '거부',
                    }
                );

                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('⚠️ ACTIVITY_RECOGNITION 권한 거부됨');
                    return false;
                }
            }

            // Android 13 (API 33) 이상에서 알림 권한도 필요
            if (apiLevel >= 33) {
                const notificationGranted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: '알림 권한',
                        message: '백그라운드 추적 알림을 표시하기 위해 권한이 필요합니다.',
                        buttonPositive: '허용',
                        buttonNegative: '거부',
                    }
                );

                if (notificationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('⚠️ POST_NOTIFICATIONS 권한 거부됨');
                    // 알림 권한은 필수가 아님, 계속 진행
                }
            }

            return true;
        } catch (error) {
            console.error('❌ 권한 요청 실패:', error);
            return false;
        }
    }

    /**
     * 센서 서비스 시작
     */
    async startService(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            // 권한 확인
            const hasPermission = await SensorServiceModule.hasPermissions();
            if (!hasPermission) {
                const granted = await this.requestPermissions();
                if (!granted) {
                    console.error('❌ 필요한 권한이 없습니다');
                    return false;
                }
            }

            await SensorServiceModule.startService();
            console.log('✅ 네이티브 센서 서비스 시작');
            return true;
        } catch (error) {
            console.error('❌ 센서 서비스 시작 실패:', error);
            return false;
        }
    }

    /**
     * 센서 서비스 중지
     */
    async stopService(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            await SensorServiceModule.stopService();
            console.log('✅ 네이티브 센서 서비스 중지');
            return true;
        } catch (error) {
            console.error('❌ 센서 서비스 중지 실패:', error);
            return false;
        }
    }

    /**
     * 서비스 실행 상태 확인
     */
    async isRunning(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            return await SensorServiceModule.isRunning();
        } catch (error) {
            console.error('❌ 서비스 상태 확인 실패:', error);
            return false;
        }
    }

    /**
     * 수집된 가속도계 데이터 가져오기 (가져온 후 클리어됨)
     */
    async getAccelerometerData(): Promise<AccelData[]> {
        if (!this.isAvailable) return [];

        try {
            return await SensorServiceModule.getAccelerometerData();
        } catch (error) {
            console.error('❌ 가속도계 데이터 조회 실패:', error);
            return [];
        }
    }

    /**
     * 수집된 걸음 수 데이터 가져오기 (가져온 후 클리어됨)
     */
    async getStepData(): Promise<StepData[]> {
        if (!this.isAvailable) return [];

        try {
            return await SensorServiceModule.getStepData();
        } catch (error) {
            console.error('❌ 걸음 수 데이터 조회 실패:', error);
            return [];
        }
    }

    /**
     * 최근 N초간 걸음 수 조회
     */
    async getRecentStepCount(seconds: number): Promise<number> {
        if (!this.isAvailable) return 0;

        try {
            return await SensorServiceModule.getRecentStepCount(seconds);
        } catch (error) {
            console.error('❌ 최근 걸음 수 조회 실패:', error);
            return 0;
        }
    }

    /**
     * 최근 N초간 평균 가속도 크기 조회
     */
    async getRecentAccelMagnitude(seconds: number): Promise<number> {
        if (!this.isAvailable) return 0;

        try {
            return await SensorServiceModule.getRecentAccelMagnitude(seconds);
        } catch (error) {
            console.error('❌ 평균 가속도 조회 실패:', error);
            return 0;
        }
    }

    /**
     * 권한 확인
     */
    async hasPermissions(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            return await SensorServiceModule.hasPermissions();
        } catch (error) {
            console.error('❌ 권한 확인 실패:', error);
            return false;
        }
    }

    /**
     * 데이터 클리어
     */
    async clearData(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            return await SensorServiceModule.clearData();
        } catch (error) {
            console.error('❌ 데이터 클리어 실패:', error);
            return false;
        }
    }

    /**
     * 배터리 최적화 제외 여부 확인
     * 일부 제조사에서 백그라운드 서비스가 종료되는 것을 방지하기 위해 중요
     */
    async isIgnoringBatteryOptimizations(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            return await SensorServiceModule.isIgnoringBatteryOptimizations();
        } catch (error) {
            console.error('❌ 배터리 최적화 상태 확인 실패:', error);
            return false;
        }
    }

    /**
     * 배터리 최적화 제외 요청 (설정 화면 열기)
     * 사용자가 직접 배터리 최적화 제외를 설정하도록 안내
     */
    async requestIgnoreBatteryOptimization(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            return await SensorServiceModule.requestIgnoreBatteryOptimization();
        } catch (error) {
            console.error('❌ 배터리 최적화 제외 요청 실패:', error);
            return false;
        }
    }

    /**
     * 센서 사용 가능 여부 확인
     */
    async checkSensorAvailability(): Promise<SensorAvailability> {
        if (!this.isAvailable) {
            return { accelerometer: false, stepCounter: false, stepDetector: false };
        }

        try {
            return await SensorServiceModule.checkSensorAvailability();
        } catch (error) {
            console.error('❌ 센서 가용성 확인 실패:', error);
            return { accelerometer: false, stepCounter: false, stepDetector: false };
        }
    }

    /**
     * 서비스 사용 가능 여부
     */
    isServiceAvailable(): boolean {
        return this.isAvailable;
    }
}

// 싱글톤 인스턴스
export const nativeSensorService = new NativeSensorService();
