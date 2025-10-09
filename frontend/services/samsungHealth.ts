import { NativeModules, Platform, Linking, Alert } from 'react-native';

const { HealthConnectModule } = NativeModules;

export interface SamsungHealthData {
  steps?: number;
  distance?: number;
  calories?: number;
  heartRate?: number;
  sleepDuration?: number;
  exerciseSessions?: ExerciseSession[];
  speed?: {
    averageSpeed: number;
    maxSpeed: number;
    averageSpeedKmh: number;
    maxSpeedKmh: number;
    recordCount: number;
  };
  available: boolean;
  source: 'Samsung Health' | 'Health Connect' | 'Not Available';
  lastUpdated?: string;
}

export interface ExerciseSession {
  exerciseType: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  source: string;
}

export interface HealthSummary {
  steps: number;
  distance: number;
  calories: number;
  date: string;
  lastUpdated: string;
}

export interface ConnectionStatus {
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

export class SamsungHealthService {
  private static instance: SamsungHealthService;
  
  public static getInstance(): SamsungHealthService {
    if (!SamsungHealthService.instance) {
      SamsungHealthService.instance = new SamsungHealthService();
    }
    return SamsungHealthService.instance;
  }

  /**
   * Health Connect 사용 가능 여부 확인
   */
  async checkHealthConnectAvailability(): Promise<{ 
    available: boolean; 
    status: string; 
    message: string; 
  }> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return {
        available: false,
        status: 'UNSUPPORTED_PLATFORM',
        message: 'Health Connect is only available on Android'
      };
    }

    try {
      const result = await HealthConnectModule.checkHealthConnectAvailability();
      return {
        available: result.isAvailable,
        status: result.status,
        message: result.message
      };
    } catch (error) {
      console.error('Health Connect availability check failed:', error);
      return {
        available: false,
        status: 'ERROR',
        message: 'Failed to check Health Connect availability'
      };
    }
  }

  /**
   * 공식문서 기반 - 모든 권한 상태 종합 확인
   */
  async checkAllPermissionsStatus(): Promise<{
    sdkAvailable: boolean;
    sdkStatus: string;
    allPermissionsGranted: boolean;
    grantedPermissionsCount: number;
    totalPermissionsCount: number;
    permissionPercentage: number;
    missingPermissions: string[];
    grantedPermissions: string[];
    message: string;
  }> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return {
        sdkAvailable: false,
        sdkStatus: 'UNSUPPORTED_PLATFORM',
        allPermissionsGranted: false,
        grantedPermissionsCount: 0,
        totalPermissionsCount: 0,
        permissionPercentage: 0,
        missingPermissions: [],
        grantedPermissions: [],
        message: 'Health Connect is only available on Android'
      };
    }

    try {
      const result = await HealthConnectModule.checkAllPermissionsStatus();
      return {
        sdkAvailable: result.sdkAvailable,
        sdkStatus: result.sdkStatus,
        allPermissionsGranted: result.allPermissionsGranted,
        grantedPermissionsCount: result.grantedPermissionsCount,
        totalPermissionsCount: result.totalPermissionsCount,
        permissionPercentage: result.permissionPercentage || 0,
        missingPermissions: result.missingPermissions || [],
        grantedPermissions: result.grantedPermissions || [],
        message: result.message
      };
    } catch (error) {
      console.error('All permissions status check failed:', error);
      return {
        sdkAvailable: false,
        sdkStatus: 'ERROR',
        allPermissionsGranted: false,
        grantedPermissionsCount: 0,
        totalPermissionsCount: 0,
        permissionPercentage: 0,
        missingPermissions: [],
        grantedPermissions: [],
        message: 'Failed to check permissions status'
      };
    }
  }

  /**
   * 삼성 헬스 앱이 설치되어 있는지 확인
   */
  async isSamsungHealthInstalled(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      console.log('🔍 Checking Samsung Health installation...');
      
      // HealthConnectModule을 통한 앱 설치 상태 확인
      if (HealthConnectModule) {
        const appStatus = await HealthConnectModule.checkSamsungHealthInstalled();
        return appStatus.samsungHealthInstalled;
      }
      
      // 대체 방법: URL 스킴을 통한 확인
      const samsungHealthSchemes = [
        'shealth://',
        'samsunghealth://',
        'com.sec.android.app.shealth://'
      ];
      
      for (const scheme of samsungHealthSchemes) {
        try {
          const canOpen = await Linking.canOpenURL(scheme);
          if (canOpen) {
            console.log(`✅ Samsung Health detected via ${scheme}`);
            return true;
          }
        } catch (e) {
          // 개별 스킴 오류는 무시하고 다음 시도
        }
      }
      
      console.log('📱 Samsung Health not found via URL schemes');
      return false;
    } catch (error) {
      console.error('Error checking Samsung Health installation:', error);
      return false;
    }
  }

  /**
   * Samsung Health 앱을 열어서 권한 요청
   */
  async openSamsungHealth(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Attempting to open Samsung Health...');
      
      // HealthConnectModule을 통한 앱 열기 시도
      if (HealthConnectModule) {
        try {
          const result = await HealthConnectModule.openSamsungHealthApp();
          return result;
        } catch (moduleError) {
          console.log('Native module method failed, trying alternative methods...', moduleError);
        }
      }

      // 대체 방법: URL 스킴을 통한 앱 열기
      const samsungHealthSchemes = [
        'shealth://',
        'samsunghealth://',
        'com.sec.android.app.shealth://',
        'shealth://main'
      ];
      
      for (const scheme of samsungHealthSchemes) {
        try {
          const canOpen = await Linking.canOpenURL(scheme);
          if (canOpen) {
            await Linking.openURL(scheme);
            console.log(`✅ Successfully opened Samsung Health with: ${scheme}`);
            return {
              success: true,
              message: 'Samsung Health app opened successfully'
            };
          }
        } catch (schemeError) {
          console.log(`❌ Failed with scheme ${scheme}:`, schemeError);
          continue;
        }
      }

      // 모든 방법 실패 시 Play Store로 이동
      try {
        const playStoreUrl = 'market://details?id=com.sec.android.app.shealth';
        const canOpenPlayStore = await Linking.canOpenURL(playStoreUrl);
        
        if (canOpenPlayStore) {
          await Linking.openURL(playStoreUrl);
          return {
            success: false,
            message: 'Samsung Health not found. Redirected to Play Store.'
          };
        } else {
          // Web Play Store로 대체
          const webPlayStoreUrl = 'https://play.google.com/store/apps/details?id=com.sec.android.app.shealth';
          await Linking.openURL(webPlayStoreUrl);
          return {
            success: false,
            message: 'Samsung Health not found. Redirected to web Play Store.'
          };
        }
      } catch (storeError) {
        console.error('Failed to open Play Store:', storeError);
        return {
          success: false,
          message: 'Samsung Health not found and unable to open Play Store.'
        };
      }
    } catch (error) {
      console.error('Error opening Samsung Health:', error);
      return {
        success: false,
        message: 'Failed to open Samsung Health app'
      };
    }
  }

  /**
   * Health Connect 권한 요청
   */
  async requestHealthPermissions(): Promise<{ 
    allPermissionsGranted: boolean; 
    grantedPermissions: number; 
    totalPermissions: number;
    message: string;
  }> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return {
        allPermissionsGranted: false,
        grantedPermissions: 0,
        totalPermissions: 0,
        message: 'Health Connect is not available on this platform'
      };
    }

    try {
      const result = await HealthConnectModule.requestHealthPermissions();
      
      // 권한이 부여되지 않은 경우 Health Connect 설정 화면 열기 제안
      if (!result.allPermissionsGranted) {
        Alert.alert(
          'Health Connect 권한 필요',
          '건강 데이터에 접근하려면 Health Connect에서 권한을 허용해야 합니다.',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: 'Health Connect 열기', 
              onPress: () => this.openHealthConnectSettings()
            }
          ]
        );
      }
      
      return result;
    } catch (error) {
      console.error('Failed to request health permissions:', error);
      return {
        allPermissionsGranted: false,
        grantedPermissions: 0,
        totalPermissions: 0,
        message: 'Failed to request health permissions'
      };
    }
  }

  /**
   * Health Connect 설정 화면 열기
   */
  async openHealthConnectSettings(): Promise<{ success: boolean; message: string }> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return {
        success: false,
        message: 'Health Connect is not available on this platform'
      };
    }

    try {
      const result = await HealthConnectModule.openHealthConnectSettings();
      return result;
    } catch (error) {
      console.error('Failed to open Health Connect settings:', error);
      return {
        success: false,
        message: 'Failed to open Health Connect settings'
      };
    }
  }

  /**
   * 오늘의 건강 데이터 요약 조회
   */
  async getTodaysSummary(): Promise<HealthSummary | null> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      console.log('Health Connect not available');
      return null;
    }

    try {
      const result = await HealthConnectModule.getTodaysSummary();
      return {
        steps: result.steps || 0,
        distance: result.distance || 0,
        calories: result.calories || 0,
        date: result.date,
        lastUpdated: result.lastUpdated
      };
    } catch (error) {
      console.error('Failed to get today\'s summary:', error);
      return null;
    }
  }

  /**
   * 걸음 수 데이터 조회
   */
  async getStepsData(
    startTime: string, 
    endTime: string
  ): Promise<{ count: number; startTime: string; endTime: string; source: string }[] | null> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return null;
    }

    try {
      const result = await HealthConnectModule.getStepsData(startTime, endTime);
      return result.data || [];
    } catch (error) {
      console.error('Failed to get steps data:', error);
      return null;
    }
  }

  /**
   * 거리 데이터 조회
   */
  async getDistanceData(
    startTime: string, 
    endTime: string
  ): Promise<{ distance: number; startTime: string; endTime: string; source: string }[] | null> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return null;
    }

    try {
      const result = await HealthConnectModule.getDistanceData(startTime, endTime);
      return result.data || [];
    } catch (error) {
      console.error('Failed to get distance data:', error);
      return null;
    }
  }

  /**
   * 칼로리 데이터 조회
   */
  async getCaloriesData(
    startTime: string, 
    endTime: string
  ): Promise<{ calories: number; startTime: string; endTime: string; source: string }[] | null> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return null;
    }

    try {
      const result = await HealthConnectModule.getCaloriesData(startTime, endTime);
      return result.data || [];
    } catch (error) {
      console.error('Failed to get calories data:', error);
      return null;
    }
  }

  /**
   * 운동 세션 데이터 조회
   */
  async getExerciseSessionsData(
    startTime: string, 
    endTime: string
  ): Promise<ExerciseSession[] | null> {
    if (Platform.OS !== 'android' || !HealthConnectModule) {
      return null;
    }

    try {
      const result = await HealthConnectModule.getExerciseSessionsData(startTime, endTime);
      return result.data || [];
    } catch (error) {
      console.error('Failed to get exercise sessions data:', error);
      return null;
    }
  }

  /**
   * 전체 연결 상태 확인
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const [
        healthConnectStatus,
        samsungHealthInstalled,
        permissionsResult
      ] = await Promise.all([
        this.checkHealthConnectAvailability(),
        this.isSamsungHealthInstalled(),
        this.requestHealthPermissions()
      ]);

      const availableData: string[] = [];
      if (permissionsResult.allPermissionsGranted) {
        availableData.push('steps', 'distance', 'calories', 'exerciseSessions');
      }

      const recommendedActions: string[] = [];
      if (!samsungHealthInstalled) {
        recommendedActions.push('Install Samsung Health app');
      }
      if (!healthConnectStatus.available) {
        recommendedActions.push('Install Health Connect app');
      }
      if (!permissionsResult.allPermissionsGranted) {
        recommendedActions.push('Grant health data permissions');
      }

      return {
        isConnected: healthConnectStatus.available && permissionsResult.allPermissionsGranted,
        availableData,
        connectionDetails: {
          samsungHealthInstalled,
          healthConnectAvailable: healthConnectStatus.available,
          permissionsGranted: permissionsResult.allPermissionsGranted,
          dataAccessible: healthConnectStatus.available && permissionsResult.allPermissionsGranted,
          recommendedActions
        }
      };
    } catch (error) {
      console.error('Failed to get connection status:', error);
      return {
        isConnected: false,
        availableData: [],
        connectionDetails: {
          samsungHealthInstalled: false,
          healthConnectAvailable: false,
          permissionsGranted: false,
          dataAccessible: false,
          recommendedActions: ['Check device compatibility and install required apps']
        }
      };
    }
  }

  /**
   * 전체 건강 데이터 조회 (통합)
   */
  async getAllHealthData(
    startTime?: string, 
    endTime?: string
  ): Promise<SamsungHealthData> {
    const now = new Date();
    const defaultStartTime = startTime || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const defaultEndTime = endTime || now.toISOString();

    try {
      const connectionStatus = await this.getConnectionStatus();
      
      if (!connectionStatus.isConnected) {
        return {
          available: false,
          source: 'Not Available'
        };
      }

      const [
        todaysSummary,
        stepsData,
        distanceData,
        caloriesData,
        exerciseSessionsData
      ] = await Promise.all([
        this.getTodaysSummary(),
        this.getStepsData(defaultStartTime, defaultEndTime),
        this.getDistanceData(defaultStartTime, defaultEndTime),
        this.getCaloriesData(defaultStartTime, defaultEndTime),
        this.getExerciseSessionsData(defaultStartTime, defaultEndTime)
      ]);

      // 데이터 집계
      const totalSteps = stepsData?.reduce((sum, record) => sum + record.count, 0) || todaysSummary?.steps || 0;
      const totalDistance = distanceData?.reduce((sum, record) => sum + record.distance, 0) || todaysSummary?.distance || 0;
      const totalCalories = caloriesData?.reduce((sum, record) => sum + record.calories, 0) || todaysSummary?.calories || 0;

      return {
        steps: totalSteps,
        distance: totalDistance,
        calories: totalCalories,
        exerciseSessions: exerciseSessionsData || [],
        available: true,
        source: 'Health Connect',
        lastUpdated: todaysSummary?.lastUpdated || now.toISOString()
      };
    } catch (error) {
      console.error('Failed to get all health data:', error);
      return {
        available: false,
        source: 'Not Available'
      };
    }
  }

  /**
   * 데이터 동기화 상태 확인 및 업데이트
   */
  async syncHealthData(): Promise<{ success: boolean; message: string; data?: SamsungHealthData }> {
    try {
      console.log('🔄 Starting health data sync...');
      
      const connectionStatus = await this.getConnectionStatus();
      if (!connectionStatus.isConnected) {
        return {
          success: false,
          message: 'Health Connect is not properly connected'
        };
      }

      const healthData = await this.getAllHealthData();
      
      if (healthData.available) {
        console.log('✅ Health data sync completed successfully');
        return {
          success: true,
          message: 'Health data synced successfully',
          data: healthData
        };
      } else {
        return {
          success: false,
          message: 'No health data available'
        };
      }
    } catch (error) {
      console.error('Health data sync failed:', error);
      return {
        success: false,
        message: 'Health data sync failed'
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const samsungHealthService = SamsungHealthService.getInstance();
export default SamsungHealthService;