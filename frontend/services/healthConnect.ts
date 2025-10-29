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
  maxSpeed?: number; // 최고 속도 (km/h)
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
      console.log('🎯 Filtering to Samsung Health only: com.sec.android.app.shealth');

      const result = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
        // Samsung Health에서만 걸음 수 데이터 가져오기
        dataOriginFilter: ['com.sec.android.app.shealth'],
      });

      // 데이터 출처 분석 및 중복 제거
      const records = result.records || [];
      const recordCount = records.length;

      if (recordCount > 0) {
        console.log(`📊 Steps: ${recordCount} records loaded`);

        // 데이터 출처별로 분석
        const sourceAnalysis = new Map<string, { count: number, steps: number }>();

        records.forEach(record => {
          // 메타데이터에서 앱 정보 추출 (구조가 다를 수 있음)
          let source = 'unknown';
          try {
            if (record.metadata?.dataOrigin) {
              source = (record.metadata.dataOrigin as any).packageName ||
                (record.metadata.dataOrigin as any).appName ||
                JSON.stringify(record.metadata.dataOrigin);
            }
          } catch (e) {
            source = 'unknown';
          }

          const steps = record.count || 0;

          if (!sourceAnalysis.has(source)) {
            sourceAnalysis.set(source, { count: 0, steps: 0 });
          }

          const current = sourceAnalysis.get(source)!;
          current.count += 1;
          current.steps += steps;
        });

        // 출처별 데이터 로그
        console.log('📊 Steps sources:');
        sourceAnalysis.forEach((data, source) => {
          console.log(`   ${source}: ${data.count} records, ${data.steps} steps`);
        });

        // 총 걸음 수 (중복 제거 전)
        const totalStepsBeforeDedup = records.reduce((sum, record) => sum + (record.count || 0), 0);
        console.log(`📊 Total steps before dedup: ${totalStepsBeforeDedup}`);

        // 삼성 헬스 우선 정책으로 중복 제거
        const filteredRecords = this.deduplicateStepsData(records);
        console.log(`📊 After deduplication: ${filteredRecords.length} records`);

        return filteredRecords;
      } else {
        console.log('📊 Steps: No records found');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to read steps data:', error);
      return [];
    }
  }

  /**
   * 걸음 수 데이터 중복 제거
   * 같은 시간대에 여러 앱이 기록한 데이터 중 하나만 선택
   */
  private deduplicateStepsData(records: any[]): any[] {
    if (records.length <= 1) return records;

    // 시간대별로 그룹화
    const timeGroups = new Map<string, any[]>();

    records.forEach(record => {
      const startTime = new Date(record.startTime);
      const endTime = new Date(record.endTime);

      // 15분 간격으로 시간대 그룹 생성 (대부분의 건강 앱이 15분-1시간 간격으로 기록)
      const timeKey = `${startTime.getFullYear()}-${startTime.getMonth()}-${startTime.getDate()}-${Math.floor(startTime.getHours())}:${Math.floor(startTime.getMinutes() / 15) * 15}`;

      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }
      timeGroups.get(timeKey)!.push(record);
    });

    const deduplicatedRecords: any[] = [];

    // 각 시간 그룹에서 중복 제거
    timeGroups.forEach((groupRecords, timeKey) => {
      if (groupRecords.length === 1) {
        deduplicatedRecords.push(groupRecords[0]);
      } else {
        // 여러 레코드가 있는 경우 우선순위로 선택
        // 1. 삼성 헬스 우선 (com.sec.android.app.shealth)
        // 2. 구글 피트니스 (com.google.android.apps.fitness)
        // 3. 기타 앱

        const samsungRecords = groupRecords.filter(record => {
          try {
            const source = (record.metadata?.dataOrigin as any)?.packageName || '';
            return source.includes('shealth') || source.includes('samsung');
          } catch (e) {
            return false;
          }
        });

        const googleRecords = groupRecords.filter(record => {
          try {
            const source = (record.metadata?.dataOrigin as any)?.packageName || '';
            return source.includes('fitness') || source.includes('google');
          } catch (e) {
            return false;
          }
        });

        if (samsungRecords.length > 0) {
          deduplicatedRecords.push(samsungRecords[0]);
          console.log(`📊 Dedup: Chose Samsung Health for ${timeKey}`);
        } else if (googleRecords.length > 0) {
          deduplicatedRecords.push(googleRecords[0]);
          console.log(`📊 Dedup: Chose Google Fitness for ${timeKey}`);
        } else {
          deduplicatedRecords.push(groupRecords[0]);
          console.log(`📊 Dedup: Chose first record for ${timeKey}`);
        }
      }
    });

    return deduplicatedRecords;
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

      // 간략한 거리 데이터 로그만 출력
      const recordCount = result.records?.length || 0;
      if (recordCount > 0) {
        console.log(`📊 Distance: ${recordCount} records loaded`);
      } else {
        console.log('📊 Distance: No records found');
      }
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

      // 간략한 속도 데이터 로그만 출력
      const recordCount = result.records?.length || 0;
      if (recordCount > 0) {
        console.log(`📊 Speed: ${recordCount} records loaded`);
      } else {
        console.log('📊 Speed: No records found');
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

      // 간략한 칼로리 데이터 로그만 출력
      const recordCount = result.records?.length || 0;
      if (recordCount > 0) {
        console.log(`📊 Calories: ${recordCount} records loaded`);
      } else {
        console.log('📊 Calories: No records found');
      }
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

      // 간략한 운동 데이터 로그만 출력
      const recordCount = result.records?.length || 0;
      if (recordCount > 0) {
        console.log(`📊 Exercise: ${recordCount} records loaded`);
      } else {
        console.log('📊 Exercise: No records found');
      }
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
        return {
          available: false,
          source: 'Not Available',
          error: 'No Health Connect permissions granted'
        };
      }

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (days * 24 * 60 * 60 * 1000));

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

      // 거리 데이터 집계
      const totalDistance = distance.reduce((sum, record, index) => {

        let dist = 0;
        if (record.distance) {
          // Distance 객체에서 올바른 값 추출 (공식 문서 기준)
          const distanceObj = record.distance as any;
          if (distanceObj.inMeters !== undefined) {
            dist = distanceObj.inMeters;
          } else if (distanceObj.meters !== undefined) {
            dist = distanceObj.meters;
          } else if (typeof record.distance === 'number') {
            dist = record.distance;
          }
        }

        return sum + (typeof dist === 'number' ? dist : 0);
      }, 0);

      // 평균 속도와 최고 속도 계산 (km/h) - 개선된 시간 가중 평균 방식
      let averageSpeed = 0;
      let maxSpeed = 0;

      // 최소 속도 임계값 설정
      // PaceTry는 보행(걷기) 중심 앱이며, 산책 데이터도 포함
      // 느린 산책: 1.5~2.5 km/h, 보통 산책: 2.5~3.5 km/h
      // 일반 걷기: 3.5~5 km/h, 빠른 걷기: 5~7 km/h
      // 1.5 km/h 미만은 정지/GPS 오차로 간주하여 제외
      const MIN_SPEED_THRESHOLD = 1.5; // km/h

      if (speed.length > 0) {
        let totalWeightedSpeed = 0;
        let totalDurationSeconds = 0;

        speed.forEach((record, recordIndex) => {
          // 레코드의 지속 시간 계산 (초 단위)
          const startTime = new Date(record.startTime).getTime();
          const endTime = new Date(record.endTime).getTime();
          const recordDurationMs = endTime - startTime;
          const recordDurationSeconds = recordDurationMs / 1000;

          if (record.samples && Array.isArray(record.samples)) {
            // 새로운 SpeedRecord.Sample 구조 - 각 샘플의 시간 가중 평균
            let recordSpeedSum = 0;
            let validSamples = 0;

            record.samples.forEach((sample: any, sampleIndex: number) => {
              if (sample.speed) {
                const velocity = sample.speed as any;
                let kmhValue = 0;

                // 공식 문서에 따라 Velocity 객체에서 값 추출
                if (velocity.inKilometersPerHour !== undefined) {
                  kmhValue = velocity.inKilometersPerHour;
                } else if (velocity.inMetersPerSecond !== undefined) {
                  const mps = velocity.inMetersPerSecond;
                  kmhValue = mps * 3.6;
                } else if (typeof sample.speed === 'number') {
                  // 레거시 숫자 형태
                  kmhValue = sample.speed * 3.6;
                }

                // 최소 임계값 이상인 속도만 평균 계산에 포함
                if (kmhValue >= MIN_SPEED_THRESHOLD) {
                  recordSpeedSum += kmhValue;
                  validSamples++;

                  // 최고 속도 업데이트
                  if (kmhValue > maxSpeed) {
                    maxSpeed = kmhValue;
                  }
                }
              }
            });

            // 이 레코드의 평균 속도를 시간으로 가중
            if (validSamples > 0 && recordDurationSeconds > 0) {
              const recordAverageSpeed = recordSpeedSum / validSamples;
              totalWeightedSpeed += recordAverageSpeed * recordDurationSeconds;
              totalDurationSeconds += recordDurationSeconds;
            }
          } else {
            // 레거시 단일 속도 레코드 형태
            const spd = record.speed?.inMetersPerSecond || record.speed?.metersPerSecond || record.speed || 0;
            if (spd > 0 && recordDurationSeconds > 0) {
              const kmhValue = (typeof spd === 'number' ? spd * 3.6 : 0);

              // 최소 임계값 이상인 속도만 평균 계산에 포함
              if (kmhValue >= MIN_SPEED_THRESHOLD) {
                totalWeightedSpeed += kmhValue * recordDurationSeconds;
                totalDurationSeconds += recordDurationSeconds;

                // 최고 속도 업데이트
                if (kmhValue > maxSpeed) {
                  maxSpeed = kmhValue;
                }
              }
            }
          }
        });

        if (totalDurationSeconds > 0) {
          averageSpeed = totalWeightedSpeed / totalDurationSeconds;
        }
      }

      // 속도 데이터가 없거나 0인 경우 거리와 운동 시간으로 추정
      if (averageSpeed === 0 && totalDistance > 0) {
        // 운동 세션 데이터에서 실제 운동 시간 확인
        let totalExerciseTimeHours = 0;
        if (exercise.length > 0) {
          exercise.forEach((session, index) => {
            const startTime = new Date(session.startTime).getTime();
            const endTime = new Date(session.endTime).getTime();
            const sessionDurationMs = endTime - startTime;
            const sessionDurationHours = sessionDurationMs / (1000 * 60 * 60);
            totalExerciseTimeHours += sessionDurationHours;
          });
        }

        if (totalExerciseTimeHours > 0) {
          // 실제 운동 시간이 있으면 사용
          averageSpeed = (totalDistance / 1000) / totalExerciseTimeHours;
        } else if (totalSteps > 0) {
          // 걸음수를 기반으로 시간 추정 (평균적으로 분당 100걸음으로 가정)
          const estimatedTimeHours = (totalSteps / 100) / 60; // 시간 단위
          averageSpeed = estimatedTimeHours > 0 ? (totalDistance / 1000) / estimatedTimeHours : 0;
        }
      }
      const totalCalories = calories.reduce((sum, record) => {
        const cal = record.energy?.inCalories || record.energy?.calories || record.energy || 0;
        return sum + (typeof cal === 'number' ? cal : 0);
      }, 0);

      // 간단한 결과 요약만 출력
      console.log(`📊 Health data (${days}일): ${totalSteps} steps, ${(totalDistance / 1000).toFixed(2)} km, avg ${averageSpeed.toFixed(1)} km/h, max ${maxSpeed.toFixed(1)} km/h, ${totalCalories} cal`);

      return {
        steps: totalSteps,
        distance: Math.round(totalDistance),
        speed: Math.round(averageSpeed * 100) / 100, // 평균 속도 (소수점 둘째 자리까지)
        maxSpeed: Math.round(maxSpeed * 100) / 100, // 최고 속도 (소수점 둘째 자리까지)
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

      const healthData = await this.getTodaysSummary();
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
   * 지정된 날짜 범위의 건강 데이터 가져오기
   */
  async getHealthDataByDateRange(startTime: Date, endTime: Date): Promise<HealthData> {
    try {
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
        return {
          available: false,
          source: 'Not Available',
          error: 'No Health Connect permissions granted'
        };
      }

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

      // 데이터 집계 (기존 getHealthData와 동일한 로직)
      const totalSteps = steps.reduce((sum, record) => sum + (record.count || 0), 0);

      // 거리 데이터 집계
      const totalDistance = distance.reduce((sum, record, index) => {
        let dist = 0;
        if (record.distance) {
          const distanceObj = record.distance as any;
          if (distanceObj.inMeters !== undefined) {
            dist = distanceObj.inMeters;
          } else if (distanceObj.meters !== undefined) {
            dist = distanceObj.meters;
          } else if (typeof record.distance === 'number') {
            dist = record.distance;
          }
        }
        return sum + (typeof dist === 'number' ? dist : 0);
      }, 0);

      // 평균 속도와 최고 속도 계산
      let averageSpeed = 0;
      let maxSpeed = 0;
      if (speed.length > 0) {
        let totalWeightedSpeed = 0;
        let totalDurationSeconds = 0;

        speed.forEach((record, recordIndex) => {
          const startTimeMs = new Date(record.startTime).getTime();
          const endTimeMs = new Date(record.endTime).getTime();
          const recordDurationMs = endTimeMs - startTimeMs;
          const recordDurationSeconds = recordDurationMs / 1000;

          if (record.samples && Array.isArray(record.samples)) {
            let recordSpeedSum = 0;
            let validSamples = 0;

            record.samples.forEach((sample: any, sampleIndex: number) => {
              if (sample.speed) {
                const velocity = sample.speed as any;
                let kmhValue = 0;

                if (velocity.inKilometersPerHour !== undefined) {
                  kmhValue = velocity.inKilometersPerHour;
                } else if (velocity.inMetersPerSecond !== undefined) {
                  const mps = velocity.inMetersPerSecond;
                  kmhValue = mps * 3.6;
                } else if (typeof sample.speed === 'number') {
                  kmhValue = sample.speed * 3.6;
                }

                if (kmhValue > 0) {
                  recordSpeedSum += kmhValue;
                  validSamples++;

                  // 최고 속도 업데이트
                  if (kmhValue > maxSpeed) {
                    maxSpeed = kmhValue;
                  }
                }
              }
            });

            if (validSamples > 0 && recordDurationSeconds > 0) {
              const recordAverageSpeed = recordSpeedSum / validSamples;
              totalWeightedSpeed += recordAverageSpeed * recordDurationSeconds;
              totalDurationSeconds += recordDurationSeconds;
            }
          } else {
            const spd = record.speed?.inMetersPerSecond || record.speed?.metersPerSecond || record.speed || 0;
            if (spd > 0 && recordDurationSeconds > 0) {
              const kmhValue = (typeof spd === 'number' ? spd * 3.6 : 0);
              totalWeightedSpeed += kmhValue * recordDurationSeconds;
              totalDurationSeconds += recordDurationSeconds;

              // 최고 속도 업데이트
              if (kmhValue > maxSpeed) {
                maxSpeed = kmhValue;
              }
            }
          }
        });

        if (totalDurationSeconds > 0) {
          averageSpeed = totalWeightedSpeed / totalDurationSeconds;
        }
      }

      // 속도 데이터가 없는 경우 거리와 운동 시간으로 추정
      if (averageSpeed === 0 && totalDistance > 0) {
        let totalExerciseTimeHours = 0;
        if (exercise.length > 0) {
          exercise.forEach((session, index) => {
            const startTimeMs = new Date(session.startTime).getTime();
            const endTimeMs = new Date(session.endTime).getTime();
            const sessionDurationMs = endTimeMs - startTimeMs;
            const sessionDurationHours = sessionDurationMs / (1000 * 60 * 60);
            totalExerciseTimeHours += sessionDurationHours;
          });
        }

        if (totalExerciseTimeHours > 0) {
          averageSpeed = (totalDistance / 1000) / totalExerciseTimeHours;
        } else if (totalSteps > 0) {
          const estimatedTimeHours = (totalSteps / 100) / 60;
          averageSpeed = estimatedTimeHours > 0 ? (totalDistance / 1000) / estimatedTimeHours : 0;
        }
      }

      const totalCalories = calories.reduce((sum, record) => {
        const cal = record.energy?.inCalories || record.energy?.calories || record.energy || 0;
        return sum + (typeof cal === 'number' ? cal : 0);
      }, 0);

      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      console.log(`📊 Health data (${durationHours.toFixed(1)}h): ${totalSteps} steps, ${(totalDistance / 1000).toFixed(2)} km, avg ${averageSpeed.toFixed(1)} km/h, max ${maxSpeed.toFixed(1)} km/h, ${totalCalories} cal`);

      return {
        steps: totalSteps,
        distance: Math.round(totalDistance),
        speed: Math.round(averageSpeed * 100) / 100,
        maxSpeed: Math.round(maxSpeed * 100) / 100,
        calories: Math.round(totalCalories),
        exerciseSessions: exercise,
        available: true,
        source: 'Health Connect'
      };

    } catch (error) {
      console.error('❌ Failed to get health data by date range:', error);
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
   * 오늘의 건강 데이터 요약 가져오기 (자정부터 현재까지)
   */
  async getTodaysSummary(): Promise<HealthData> {
    try {
      // 오늘 자정 시간 계산
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endTime = now;

      console.log(`📅 Today's data range: ${startOfToday.toISOString()} to ${endTime.toISOString()}`);

      return await this.getHealthDataByDateRange(startOfToday, endTime);
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