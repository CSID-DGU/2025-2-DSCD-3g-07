import { 
  initialize, 
  getSdkStatus, 
  SdkAvailabilityStatus, 
  requestPermission, 
  revokeAllPermissions, 
  getGrantedPermissions, 
  readRecords,
  Permission
} from 'react-native-health-connect';
import { Platform } from 'react-native';

export interface HealthData {
  steps?: number;
  distance?: number;
  calories?: number;
  exerciseSessions?: any[];
  available: boolean;
  source: 'Health Connect' | 'Not Available';
  error?: string;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync?: Date;
  availableData: string[];
  connectionDetails: {
    samsungHealthInstalled: boolean;
    healthConnectAvailable: boolean;
    permissionsGranted: boolean;
    dataAccessible: boolean;
    recommendedActions: string[];
  };
}

export class HealthConnectService {
  private static instance: HealthConnectService;
  
  public static getInstance(): HealthConnectService {
    if (!HealthConnectService.instance) {
      HealthConnectService.instance = new HealthConnectService();
    }
    return HealthConnectService.instance;
  }

  /**
   * Health Connect SDK 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing Health Connect SDK...');
      
      // Android만 지원
      if (Platform.OS !== 'android') {
        console.log('⚠️ Health Connect is only available on Android');
        return false;
      }

      // SDK 가용성 먼저 확인
      const sdkStatus = await this.checkAvailability();
      if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        console.log('❌ Health Connect SDK not available, status:', sdkStatus);
        return false;
      }

      const isInitialized = await initialize();
      console.log('✅ Health Connect SDK initialized:', isInitialized);
      return isInitialized;
    } catch (error) {
      console.error('❌ Failed to initialize Health Connect SDK:', error);
      return false;
    }
  }

  /**
   * Health Connect SDK 사용 가능 여부 확인
   */
  async checkAvailability(): Promise<number> {
    try {
      console.log('🔍 Checking Health Connect SDK availability...');
      const status = await getSdkStatus();
      console.log('📊 SDK Status:', status);
      return status;
    } catch (error) {
      console.error('❌ Failed to check SDK availability:', error);
      return SdkAvailabilityStatus.SDK_UNAVAILABLE;
    }
  }

  /**
   * Health Connect 앱 설치 확인
   */
  async isHealthConnectInstalled(): Promise<boolean> {
    try {
      const sdkStatus = await this.checkAvailability();
      return sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch (error) {
      console.error('❌ Failed to check Health Connect installation:', error);
      return false;
    }
  }

  /**
   * 권한 요청
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 Requesting Health Connect permissions...');
      
      // 먼저 초기화 확인
      const isInit = await this.initialize();
      if (!isInit) {
        console.error('❌ Health Connect not initialized');
        return false;
      }
      
      const permissions: Permission[] = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'write', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'write', recordType: 'Distance' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'write', recordType: 'ExerciseSession' },
      ];

      const grantedPermissions = await requestPermission(permissions);
      console.log('✅ Granted permissions:', grantedPermissions);
      
      // requestPermission returns boolean, not an array
      return grantedPermissions === true;
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * 허용된 권한 조회
   */
  async getGrantedPermissions(): Promise<any[]> {
    try {
      const permissions = await getGrantedPermissions();
      console.log('📋 Currently granted permissions:', permissions);
      return permissions as any[];
    } catch (error) {
      console.error('❌ Failed to get granted permissions:', error);
      return [];
    }
  }

  /**
   * 걸음 수 데이터 읽기
   */
  async readStepsData(startTime: Date, endTime: Date): Promise<any[]> {
    try {
      console.log('👟 Reading steps data from', startTime, 'to', endTime);
      
      const result = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });
      
      console.log('📊 Steps data:', result);
      return result.records || [];
    } catch (error) {
      console.error('❌ Failed to read steps data:', error);
      return [];
    }
  }

  /**
   * 거리 데이터 읽기
   */
  async readDistanceData(startTime: Date, endTime: Date): Promise<any[]> {
    try {
      console.log('📏 Reading distance data from', startTime, 'to', endTime);
      
      const result = await readRecords('Distance', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });
      
      console.log('📊 Distance data:', result);
      return result.records || [];
    } catch (error) {
      console.error('❌ Failed to read distance data:', error);
      return [];
    }
  }

  /**
   * 칼로리 데이터 읽기
   */
  async readCaloriesData(startTime: Date, endTime: Date): Promise<any[]> {
    try {
      console.log('🔥 Reading calories data from', startTime, 'to', endTime);
      
      const result = await readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });
      
      console.log('📊 Calories data:', result);
      return result.records || [];
    } catch (error) {
      console.error('❌ Failed to read calories data:', error);
      return [];
    }
  }

  /**
   * 운동 세션 데이터 읽기
   */
  async readExerciseData(startTime: Date, endTime: Date): Promise<any[]> {
    try {
      console.log('🏃 Reading exercise data from', startTime, 'to', endTime);
      
      const result = await readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });
      
      console.log('📊 Exercise data:', result);
      return result.records || [];
    } catch (error) {
      console.error('❌ Failed to read exercise data:', error);
      return [];
    }
  }

  /**
   * 전체 건강 데이터 가져오기
   */
  async getHealthData(days: number = 7): Promise<HealthData> {
    try {
      console.log('📊 Getting health data for', days, 'days...');
      
      // Health Connect 설치 확인
      const isInstalled = await this.isHealthConnectInstalled();
      if (!isInstalled) {
        return {
          available: false,
          source: 'Not Available',
          error: 'Health Connect not installed or not available'
        };
      }

      // 초기화
      const isInit = await this.initialize();
      if (!isInit) {
        return {
          available: false,
          source: 'Not Available',
          error: 'Failed to initialize Health Connect SDK'
        };
      }
      
      // 권한 확인
      const grantedPermissions = await this.getGrantedPermissions();
      if (grantedPermissions.length === 0) {
        console.log('⚠️ No permissions granted');
        return {
          available: false,
          source: 'Not Available',
          error: 'No Health Connect permissions granted'
        };
      }

      console.log('📋 Granted permissions:', grantedPermissions.length);

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (days * 24 * 60 * 60 * 1000));

      console.log('📅 Data range:', startTime.toISOString(), 'to', endTime.toISOString());

      // 병렬로 데이터 요청
      const [stepsData, distanceData, caloriesData, exerciseData] = await Promise.allSettled([
        this.readStepsData(startTime, endTime),
        this.readDistanceData(startTime, endTime),
        this.readCaloriesData(startTime, endTime),
        this.readExerciseData(startTime, endTime)
      ]);

      // 안전하게 데이터 추출
      const steps = stepsData.status === 'fulfilled' ? stepsData.value : [];
      const distance = distanceData.status === 'fulfilled' ? distanceData.value : [];
      const calories = caloriesData.status === 'fulfilled' ? caloriesData.value : [];
      const exercise = exerciseData.status === 'fulfilled' ? exerciseData.value : [];

      // 데이터 집계
      const totalSteps = steps.reduce((sum, record) => sum + (record.count || 0), 0);
      const totalDistance = distance.reduce((sum, record) => {
        const dist = record.distance?.inMeters || record.distance?.meters || record.distance || 0;
        return sum + (typeof dist === 'number' ? dist : 0);
      }, 0);
      const totalCalories = calories.reduce((sum, record) => {
        const cal = record.energy?.inCalories || record.energy?.calories || record.energy || 0;
        return sum + (typeof cal === 'number' ? cal : 0);
      }, 0);

      console.log('📊 Data summary:', {
        steps: totalSteps,
        distance: totalDistance,
        calories: totalCalories,
        exerciseSessions: exercise.length
      });

      return {
        steps: totalSteps,
        distance: Math.round(totalDistance),
        calories: Math.round(totalCalories),
        exerciseSessions: exercise,
        available: true,
        source: 'Health Connect'
      };

    } catch (error) {
      console.error('❌ Failed to get health data:', error);
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return {
        available: false,
        source: 'Not Available',
        error: errorMessage
      };
    }
  }

  /**
   * 동기화 상태 확인
   */
  async checkSyncStatus(): Promise<SyncStatus> {
    try {
      console.log('🔄 Checking Health Connect sync status...');

      const sdkStatus = await this.checkAvailability();
      const isHealthConnectAvailable = sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE;
      
      const grantedPermissions = await this.getGrantedPermissions();
      const permissionsGranted = grantedPermissions.length > 0;
      
      const healthData = await this.getHealthData(1);
      const dataAccessible = healthData.available;

      const availableDataTypes: string[] = [];
      if (permissionsGranted) {
        grantedPermissions.forEach(permission => {
          availableDataTypes.push(`${permission.recordType} (${permission.accessType})`);
        });
      }

      const recommendedActions: string[] = [];
      if (!isHealthConnectAvailable) {
        recommendedActions.push('Health Connect 앱을 설치하거나 업데이트하세요');
      }
      if (!permissionsGranted) {
        recommendedActions.push('건강 데이터 접근 권한을 허용하세요');
      }
      if (!dataAccessible) {
        recommendedActions.push('Samsung Health 또는 다른 건강 앱에서 데이터를 동기화하세요');
      }

      return {
        isConnected: isHealthConnectAvailable && permissionsGranted && dataAccessible,
        lastSync: new Date(),
        availableData: availableDataTypes,
        connectionDetails: {
          samsungHealthInstalled: true, // Health Connect가 사용 가능하면 일반적으로 Samsung Health도 있음
          healthConnectAvailable: isHealthConnectAvailable,
          permissionsGranted,
          dataAccessible,
          recommendedActions
        }
      };

    } catch (error) {
      console.error('❌ Failed to check sync status:', error);
      return {
        isConnected: false,
        availableData: [],
        connectionDetails: {
          samsungHealthInstalled: false,
          healthConnectAvailable: false,
          permissionsGranted: false,
          dataAccessible: false,
          recommendedActions: ['Health Connect를 확인할 수 없습니다']
        }
      };
    }
  }

  /**
   * 모든 권한 철회
   */
  async revokeAllPermissions(): Promise<void> {
    try {
      await revokeAllPermissions();
      console.log('✅ All permissions revoked');
    } catch (error) {
      console.error('❌ Failed to revoke permissions:', error);
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const healthConnectService = HealthConnectService.getInstance();

// 이전 서비스와의 호환성을 위한 별칭
export const samsungHealthService = healthConnectService;
export type SamsungHealthData = HealthData;