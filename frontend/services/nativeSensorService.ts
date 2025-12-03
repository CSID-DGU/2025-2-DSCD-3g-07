/**
 * 통합 네이티브 센서 서비스 모듈
 * 
 * Android 네이티브 SensorService를 React Native에서 사용할 수 있게 하는 래퍼입니다.
 * 백그라운드에서도 GPS, 가속도계, Pedometer 데이터를 수집하고
 * walking/paused 상태를 실시간으로 판정합니다.
 * 
 * 상태 판정 기준:
 * - walking: 최근 3초간 1보 이상 걸음 감지
 * - paused: 그 외 (정지, 대중교통 이용 등)
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

export interface LocationData {
    timestamp: number;
    latitude: number;
    longitude: number;
    speed: number;
    accuracy: number;
}

export interface MovementSegment {
    startTime: number;
    endTime: number;
    status: 'walking' | 'paused';
    distanceM: number;
    durationMs: number;
}

export interface TrackingStats {
    totalWalkingTimeMs: number;
    totalPausedTimeMs: number;
    totalDistanceM: number;
    segmentCount: number;
}

export interface SensorAvailability {
    accelerometer: boolean;
    stepCounter: boolean;
    stepDetector: boolean;
    gps: boolean;
}

class NativeSensorService {
    private isAvailable: boolean;

    constructor() {
        console.log('🔧 NativeSensorService 생성자 시작');
        console.log('🔧 Platform.OS:', Platform.OS);
        console.log('🔧 SensorServiceModule:', SensorServiceModule);
        console.log('🔧 NativeModules 키들:', Object.keys(NativeModules));

        this.isAvailable = Platform.OS === 'android' && !!SensorServiceModule;

        if (!this.isAvailable) {
            console.warn('⚠️ NativeSensorService는 Android에서만 사용 가능합니다.');
            if (Platform.OS === 'android') {
                console.error('❌ Android인데 SensorServiceModule이 없습니다! 네이티브 모듈 등록 확인 필요.');
            }
        } else {
            console.log('✅ NativeSensorService 사용 가능');
            console.log('🔧 SensorServiceModule 메서드들:', typeof SensorServiceModule === 'object' ? Object.keys(SensorServiceModule) : 'N/A');
        }
    }

    /**
     * ACTIVITY_RECOGNITION + 위치 권한 요청 (Android 10+)
     */
    async requestPermissions(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            const apiLevel = typeof Platform.Version === 'number'
                ? Platform.Version
                : parseInt(Platform.Version, 10);

            const permissionsToRequest: string[] = [];

            // 위치 권한 (필수)
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);

            // Android 10 (API 29) 이상에서 ACTIVITY_RECOGNITION 필요
            if (apiLevel >= 29) {
                permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
            }

            // Android 10 이상에서 백그라운드 위치 권한
            if (apiLevel >= 29) {
                permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
            }

            const results = await PermissionsAndroid.requestMultiple(permissionsToRequest as any);

            // 필수 권한 확인
            if (results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
                console.warn('⚠️ ACCESS_FINE_LOCATION 권한 거부됨');
                return false;
            }

            if (apiLevel >= 29 && results[PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION] !== PermissionsAndroid.RESULTS.GRANTED) {
                console.warn('⚠️ ACTIVITY_RECOGNITION 권한 거부됨');
                return false;
            }

            // Android 13 (API 33) 이상에서 알림 권한
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
                    console.warn('⚠️ POST_NOTIFICATIONS 권한 거부됨 (필수 아님)');
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
            console.log('✅ 통합 네이티브 센서 서비스 시작 (GPS + 가속도계 + Pedometer)');
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
     * 🆕 수집된 위치 데이터 가져오기 (가져온 후 클리어됨)
     */
    async getLocationData(): Promise<LocationData[]> {
        if (!this.isAvailable) return [];

        try {
            return await SensorServiceModule.getLocationData();
        } catch (error) {
            console.error('❌ 위치 데이터 조회 실패:', error);
            return [];
        }
    }

    /**
     * 🆕 백그라운드에서 판정된 움직임 구간 가져오기
     */
    async getMovementSegments(): Promise<MovementSegment[]> {
        if (!this.isAvailable) return [];

        try {
            const segments = await SensorServiceModule.getMovementSegments();
            return segments.map((s: any) => ({
                ...s,
                status: s.status as 'walking' | 'paused',
            }));
        } catch (error) {
            console.error('❌ 움직임 구간 조회 실패:', error);
            return [];
        }
    }

    /**
     * 🆕 실시간 추적 통계 조회
     */
    async getTrackingStats(): Promise<TrackingStats> {
        if (!this.isAvailable) {
            return {
                totalWalkingTimeMs: 0,
                totalPausedTimeMs: 0,
                totalDistanceM: 0,
                segmentCount: 0,
            };
        }

        try {
            return await SensorServiceModule.getTrackingStats();
        } catch (error) {
            console.error('❌ 추적 통계 조회 실패:', error);
            return {
                totalWalkingTimeMs: 0,
                totalPausedTimeMs: 0,
                totalDistanceM: 0,
                segmentCount: 0,
            };
        }
    }

    /**
     * 🆕 통계 및 구간 데이터 초기화
     */
    async resetStats(): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            return await SensorServiceModule.resetStats();
        } catch (error) {
            console.error('❌ 통계 초기화 실패:', error);
            return false;
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
            return { accelerometer: false, stepCounter: false, stepDetector: false, gps: false };
        }

        try {
            return await SensorServiceModule.checkSensorAvailability();
        } catch (error) {
            console.error('❌ 센서 가용성 확인 실패:', error);
            return { accelerometer: false, stepCounter: false, stepDetector: false, gps: false };
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
