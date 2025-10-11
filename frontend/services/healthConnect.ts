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
import HealthConnectModule from './nativeHealthConnect';

export interface HealthData {
  steps?: number;
  distance?: number;
  speed?: number; // 평균 속도 (km/h)
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

export interface PermissionStatus {
  sdkAvailable: boolean;
  permissionsGranted: boolean;
  grantedCount: number;
  totalCount: number;
  sdkStatus?: number;
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
      
      // 상태별 로그
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
        console.log('✅ Health Connect is available and ready');
      } else if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        console.log('❌ Health Connect is not installed');
      } else if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        console.log('⚠️ Health Connect update required OR device not compatible');
      }
      
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
   * 권한 상태 확인 - UI에 표시할 상태 정보
   */
  async checkPermissionStatus(): Promise<PermissionStatus> {
    try {
      console.log('🔍 Checking permission status...');
      
      // SDK 가용성 확인
      const sdkStatus = await this.checkAvailability();
      const sdkAvailable = sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE || 
                           sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED;
      
      // 부여된 권한 확인
      let grantedCount = 0;
      let permissionsGranted = false;
      
      if (sdkAvailable) {
        try {
          // 먼저 초기화 확인
          const isInit = await this.initialize();
          if (!isInit) {
            console.warn('⚠️ Health Connect not initialized, skipping permission check');
            return {
              sdkAvailable: false,
              permissionsGranted: false,
              grantedCount: 0,
              totalCount: 10
            };
          }

          const allGranted = await getGrantedPermissions();
          
          // 우리가 요청한 권한 목록
          const requestedPermissions = [
            'Steps-read', 'Steps-write',
            'Distance-read', 'Distance-write', 
            'Speed-read', 'Speed-write',
            'ActiveCaloriesBurned-read', 'ActiveCaloriesBurned-write',
            'ExerciseSession-read', 'ExerciseSession-write'
          ];
          
          // 실제 부여된 권한 중 우리가 요청한 권한만 카운트
          grantedCount = 0;
          allGranted.forEach(permission => {
            const key = `${permission.recordType}-${permission.accessType}`;
            if (requestedPermissions.includes(key)) {
              grantedCount++;
            }
          });
          
          permissionsGranted = grantedCount > 0;
          console.log(`✅ Our requested permissions granted: ${grantedCount}/10`);
          console.log(`📊 Total permissions in system: ${allGranted.length}`);
        } catch (error) {
          console.warn('⚠️ Could not check granted permissions:', error);
          console.warn('⚠️ Error details:', error instanceof Error ? error.message : String(error));
        }
      }
      
      return {
        sdkAvailable,
        permissionsGranted,
        grantedCount,
        totalCount: 10,
        sdkStatus
      };
    } catch (error) {
      console.error('❌ Failed to check permission status:', error);
      return {
        sdkAvailable: false,
        permissionsGranted: false,
        grantedCount: 0,
        totalCount: 10
      };
    }
  }

  /**
   * 권한 요청 - react-native-health-connect의 requestPermission 사용
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 Requesting Health Connect permissions...');
      
      // 1. SDK 가용성 먼저 확인
      const sdkStatus = await this.checkAvailability();
      console.log('📊 SDK Status before permission request:', sdkStatus);
      
      if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        console.error('❌ Health Connect app is not installed. Please install it from Play Store.');
        return false;
      }
      
      if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        console.warn('⚠️ Health Connect Status 3 (UPDATE_REQUIRED)');
        console.warn('   This is common and we can still try to request permissions.');
      }
      
      // 2. 초기화
      console.log('🔧 Initializing Health Connect SDK...');
      const isInit = await this.initialize();
      if (!isInit) {
        console.error('❌ Health Connect initialization failed');
        return false;
      }
      
      // 3. 현재 권한 상태 확인
      try {
        const currentPermissions = await getGrantedPermissions();
        console.log('📋 Current granted permissions:', currentPermissions.length);
      } catch (error) {
        console.warn('⚠️ Could not get current permissions, continuing anyway');
      }
      
      // 4. 권한 요청 (react-native-health-connect의 requestPermission 사용)
      const permissions: Permission[] = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'write', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'write', recordType: 'Distance' },
        { accessType: 'read', recordType: 'Speed' },
        { accessType: 'write', recordType: 'Speed' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'write', recordType: 'ExerciseSession' },
      ];

      console.log('📝 Requesting permissions with requestPermission() API...');
      console.log('   Permissions to request:', permissions);
      
      try {
        // 실제 권한 요청 - 이 함수가 Health Connect 권한 화면을 엽니다
        const result = await requestPermission(permissions);
        console.log('✅ Permission request completed');
        console.log('   Result:', result);
        
        // 권한 요청 후 다시 확인
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updatedPermissions = await getGrantedPermissions();
        console.log('📋 Updated granted permissions:', updatedPermissions.length);
        
        if (Array.isArray(updatedPermissions) && updatedPermissions.length > 0) {
          console.log('✅ Permissions successfully granted:', updatedPermissions.length, 'permissions');
          return true;
        } else {
          console.warn('⚠️ No permissions granted yet.');
          return false;
        }
      } catch (permissionError: any) {
        console.error('❌ Permission request failed:', permissionError);
        console.error('   Error type:', permissionError?.constructor?.name);
        console.error('   Error message:', permissionError?.message);
        
        // Activity Result API 에러 감지
        if (permissionError?.message?.includes('lateinit') || 
            permissionError?.message?.includes('requestPermission')) {
          console.error('💡 This is an Activity Result API initialization error.');
          console.error('   Falling back to opening settings manually...');
          
          // Fallback: 설정 화면 직접 열기
          try {
            const opened = await HealthConnectModule.openHealthConnectSettings();
            if (opened) {
              console.log('✅ Opened Health Connect settings as fallback');
              await new Promise(resolve => setTimeout(resolve, 5000));
              const fallbackPermissions = await this.getGrantedPermissions();
              return fallbackPermissions.length > 0;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
          }
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
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
      console.log('📊 Granted permissions count:', permissions.length);
      
      // 각 권한 상세 내용 출력
      permissions.forEach((permission, index) => {
        console.log(`📋 Permission ${index + 1}:`, permission);
      });
      
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
   * 속도 데이터 읽기 (기존 방식)
   */
  async readSpeedData(startTime: Date, endTime: Date): Promise<any[]> {
    try {
      console.log('🏃 Reading speed data from', startTime, 'to', endTime);
      
      const result = await readRecords('Speed', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });
      
      console.log('📊 Speed data result:', result);
      console.log('📊 Speed records count:', result.records?.length || 0);
      
      if (result.records && result.records.length > 0) {
        console.log('📊 First speed record:', result.records[0]);
        result.records.forEach((record, index) => {
          console.log(`📊 Speed record ${index} structure:`, {
            startTime: record.startTime,
            endTime: record.endTime,
            samples: record.samples,
            samplesCount: record.samples?.length || 0
          });

          if (record.samples && Array.isArray(record.samples)) {
            record.samples.forEach((sample, sampleIndex) => {
              console.log(`📊 Speed sample ${sampleIndex}:`, {
                time: sample.time,
                speed: sample.speed,
                speedType: typeof sample.speed,
                speedKeys: sample.speed ? Object.keys(sample.speed) : null
              });

              if (sample.speed) {
                const velocity = sample.speed as any;
                
                // 공식 문서에 따라 inKilometersPerHour 또는 inMetersPerSecond 사용
                if (velocity.inKilometersPerHour !== undefined) {
                  console.log(`📊 Speed (km/h): ${velocity.inKilometersPerHour}`);
                } else if (velocity.inMetersPerSecond !== undefined) {
                  const kmh = velocity.inMetersPerSecond * 3.6;
                  console.log(`📊 Speed (m/s → km/h): ${velocity.inMetersPerSecond} → ${kmh}`);
                }
              }
            });
          } else {
            // 레거시 형식 확인
            const spd = record.speed?.inMetersPerSecond || record.speed;
            console.log(`📊 Legacy speed record ${index}:`, spd, 'm/s');
          }
        });
      }
      
      return result.records || [];
    } catch (error) {
      console.error('❌ Failed to read speed data:', error);
      console.error('❌ Speed error details:', error instanceof Error ? error.message : String(error));
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
      const grantedPermissions = await getGrantedPermissions();
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
      const [stepsData, distanceData, speedData, caloriesData, exerciseData] = await Promise.allSettled([
        this.readStepsData(startTime, endTime),
        this.readDistanceData(startTime, endTime),
        this.readSpeedData(startTime, endTime),
        this.readCaloriesData(startTime, endTime),
        this.readExerciseData(startTime, endTime)
      ]);

      // 안전하게 데이터 추출
      const steps = stepsData.status === 'fulfilled' ? stepsData.value : [];
      const distance = distanceData.status === 'fulfilled' ? distanceData.value : [];
      const speed = speedData.status === 'fulfilled' ? speedData.value : [];
      const calories = caloriesData.status === 'fulfilled' ? caloriesData.value : [];
      const exercise = exerciseData.status === 'fulfilled' ? exerciseData.value : [];

      // 데이터 집계
      const totalSteps = steps.reduce((sum, record) => sum + (record.count || 0), 0);
      
      // 거리 데이터 상세 분석
      console.log('📏 Distance records analysis:', distance.length, 'records');
      const totalDistance = distance.reduce((sum, record, index) => {
        console.log(`📏 Distance record ${index}:`, {
          record: record,
          distance: record.distance,
          distanceType: typeof record.distance,
          distanceKeys: record.distance ? Object.keys(record.distance) : null
        });

        let dist = 0;
        if (record.distance) {
          // Distance 객체에서 올바른 값 추출 (공식 문서 기준)
          const distanceObj = record.distance as any;
          if (distanceObj.inMeters !== undefined) {
            dist = distanceObj.inMeters;
            console.log(`📏 Using inMeters: ${dist} meters`);
          } else if (distanceObj.meters !== undefined) {
            dist = distanceObj.meters;
            console.log(`📏 Using meters: ${dist} meters`);
          } else if (typeof record.distance === 'number') {
            dist = record.distance;
            console.log(`📏 Using direct number: ${dist} meters`);
          }
        }

        const newSum = sum + (typeof dist === 'number' ? dist : 0);
        console.log(`📏 Distance accumulation: ${sum} + ${dist} = ${newSum}`);
        return newSum;
      }, 0);

      console.log(`📏 Total distance: ${totalDistance} meters = ${(totalDistance / 1000).toFixed(2)} km`);
      // 평균 속도 계산 (km/h) - 개선된 시간 가중 평균 방식
      let averageSpeed = 0;
      
      if (speed.length > 0) {
        console.log('📊 Processing speed data from', speed.length, 'records');
        
        let totalWeightedSpeed = 0;
        let totalDurationSeconds = 0;

        speed.forEach((record, recordIndex) => {
          console.log(`📊 Processing speed record ${recordIndex}:`, record);
          
          // 레코드의 지속 시간 계산 (초 단위)
          const startTime = new Date(record.startTime).getTime();
          const endTime = new Date(record.endTime).getTime();
          const recordDurationMs = endTime - startTime;
          const recordDurationSeconds = recordDurationMs / 1000;
          
          console.log(`📊 Record duration: ${recordDurationSeconds} seconds`);
          
          if (record.samples && Array.isArray(record.samples)) {
            // 새로운 SpeedRecord.Sample 구조 - 각 샘플의 시간 가중 평균
            let recordSpeedSum = 0;
            let validSamples = 0;

            record.samples.forEach((sample: any, sampleIndex: number) => {
              console.log(`📊 Processing sample ${sampleIndex}:`, sample);
              
              if (sample.speed) {
                const velocity = sample.speed as any;
                let kmhValue = 0;

                // 공식 문서에 따라 Velocity 객체에서 값 추출
                if (velocity.inKilometersPerHour !== undefined) {
                  kmhValue = velocity.inKilometersPerHour;
                  console.log(`📊 Using inKilometersPerHour: ${kmhValue} km/h`);
                } else if (velocity.inMetersPerSecond !== undefined) {
                  const mps = velocity.inMetersPerSecond;
                  kmhValue = mps * 3.6;
                  console.log(`📊 Converting inMetersPerSecond: ${mps} m/s → ${kmhValue} km/h`);
                } else if (typeof sample.speed === 'number') {
                  // 레거시 숫자 형태
                  kmhValue = sample.speed * 3.6;
                  console.log(`📊 Legacy number conversion: ${sample.speed} m/s → ${kmhValue} km/h`);
                }

                if (kmhValue > 0) {
                  recordSpeedSum += kmhValue;
                  validSamples++;
                }
              }
            });

            // 이 레코드의 평균 속도를 시간으로 가중
            if (validSamples > 0 && recordDurationSeconds > 0) {
              const recordAverageSpeed = recordSpeedSum / validSamples;
              totalWeightedSpeed += recordAverageSpeed * recordDurationSeconds;
              totalDurationSeconds += recordDurationSeconds;
              console.log(`📊 Record ${recordIndex}: avg speed ${recordAverageSpeed} km/h for ${recordDurationSeconds}s`);
            }
          } else {
            // 레거시 단일 속도 레코드 형태
            const spd = record.speed?.inMetersPerSecond || record.speed?.metersPerSecond || record.speed || 0;
            if (spd > 0 && recordDurationSeconds > 0) {
              const kmhValue = (typeof spd === 'number' ? spd * 3.6 : 0);
              totalWeightedSpeed += kmhValue * recordDurationSeconds;
              totalDurationSeconds += recordDurationSeconds;
              console.log(`📊 Legacy record: ${spd} m/s → ${kmhValue} km/h for ${recordDurationSeconds}s`);
            }
          }
        });

        if (totalDurationSeconds > 0) {
          averageSpeed = totalWeightedSpeed / totalDurationSeconds;
          console.log(`📊 Time-weighted average speed: ${totalWeightedSpeed} / ${totalDurationSeconds} = ${averageSpeed} km/h`);
        }
      } 
      
      // 속도 데이터가 없거나 0인 경우 거리와 운동 시간으로 추정
      if (averageSpeed === 0 && totalDistance > 0) {
        console.log('📊 No valid speed data, calculating from distance and time estimates');
        
        // 운동 세션 데이터에서 실제 운동 시간 확인
        let totalExerciseTimeHours = 0;
        if (exercise.length > 0) {
          exercise.forEach((session, index) => {
            const startTime = new Date(session.startTime).getTime();
            const endTime = new Date(session.endTime).getTime();
            const sessionDurationMs = endTime - startTime;
            const sessionDurationHours = sessionDurationMs / (1000 * 60 * 60);
            totalExerciseTimeHours += sessionDurationHours;
            console.log(`📊 Exercise session ${index}: ${sessionDurationHours} hours`);
          });
        }
        
        if (totalExerciseTimeHours > 0) {
          // 실제 운동 시간이 있으면 사용
          averageSpeed = (totalDistance / 1000) / totalExerciseTimeHours;
          console.log(`📊 Speed from exercise time: ${(totalDistance/1000).toFixed(2)} km / ${totalExerciseTimeHours.toFixed(2)} h = ${averageSpeed.toFixed(1)} km/h`);
        } else if (totalSteps > 0) {
          // 걸음수를 기반으로 시간 추정 (평균적으로 분당 100걸음으로 가정)
          const estimatedTimeHours = (totalSteps / 100) / 60; // 시간 단위
          averageSpeed = estimatedTimeHours > 0 ? (totalDistance / 1000) / estimatedTimeHours : 0;
          console.log(`📊 Speed from steps estimate: ${totalSteps} steps → ${estimatedTimeHours.toFixed(2)} h → ${averageSpeed.toFixed(1)} km/h`);
        }
      }
      const totalCalories = calories.reduce((sum, record) => {
        const cal = record.energy?.inCalories || record.energy?.calories || record.energy || 0;
        return sum + (typeof cal === 'number' ? cal : 0);
      }, 0);

      console.log('📊 Data summary:', {
        steps: totalSteps,
        distance: totalDistance,
        speed: averageSpeed,
        calories: totalCalories,
        exerciseSessions: exercise.length
      });

      return {
        steps: totalSteps,
        distance: Math.round(totalDistance),
        speed: Math.round(averageSpeed * 100) / 100, // 소수점 둘째 자리까지
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
   * 오늘의 건강 데이터 요약 가져오기
   */
  async getTodaysSummary(): Promise<HealthData> {
    try {
      console.log('📅 Getting today\'s health data summary...');
      return await this.getHealthData(1);
    } catch (error) {
      console.error('❌ Failed to get today\'s summary:', error);
      return {
        available: false,
        source: 'Not Available',
        error: error instanceof Error ? error.message : 'Unknown error'
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

  /**
   * Health Connect 설정 화면 열기
   */
  async openHealthConnectSettings(): Promise<void> {
    try {
      console.log('⚙️ Opening Health Connect settings...');
      const { Linking } = await import('react-native');
      
      // Health Connect 앱의 패키지 이름
      const healthConnectPackage = 'com.google.android.apps.healthdata';
      const settingsUrl = `package:${healthConnectPackage}`;
      
      const canOpen = await Linking.canOpenURL(settingsUrl);
      if (canOpen) {
        await Linking.openURL(settingsUrl);
        console.log('✅ Opened Health Connect settings');
      } else {
        // Play Store에서 Health Connect 열기
        const playStoreUrl = `market://details?id=${healthConnectPackage}`;
        await Linking.openURL(playStoreUrl);
        console.log('✅ Opened Health Connect in Play Store');
      }
    } catch (error) {
      console.error('❌ Failed to open Health Connect settings:', error);
      
      // 대체 방법: 일반 앱 설정
      try {
        const { Linking } = await import('react-native');
        await Linking.openSettings();
        console.log('✅ Opened app settings as fallback');
      } catch (fallbackError) {
        console.error('❌ Failed to open settings:', fallbackError);
      }
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const healthConnectService = HealthConnectService.getInstance();

// 이전 서비스와의 호환성을 위한 별칭
export const samsungHealthService = healthConnectService;
export type SamsungHealthData = HealthData;