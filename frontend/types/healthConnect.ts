/**
 * Health Connect 타입 정의
 * Android Health Connect API의 TypeScript 타입
 */

export enum RecordType {
  STEPS = 'Steps',
  DISTANCE = 'Distance',
  HEART_RATE = 'HeartRate',
  ACTIVE_CALORIES_BURNED = 'ActiveCaloriesBurned',
  EXERCISE_SESSION = 'ExerciseSession',
  SPEED = 'Speed',
  TOTAL_CALORIES_BURNED = 'TotalCaloriesBurned',
  BASAL_METABOLIC_RATE = 'BasalMetabolicRate',
}

export enum ExerciseType {
  WALKING = 79,
  RUNNING = 56,
  CYCLING = 8,
  SWIMMING = 71,
  YOGA = 82,
  WORKOUT = 77,
  HIKING = 33,
  OTHER = 0,
}

export interface HealthConnectAvailability {
  isAvailable: boolean;
  status: number;
  message: string;
}

export interface TimeRangeFilter {
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
}

export interface DataOrigin {
  packageName: string;
  appName?: string;
}

export interface HealthRecord {
  metadata: {
    id: string;
    dataOrigin: DataOrigin;
    lastModifiedTime: string;
  };
}

export interface StepsRecord extends HealthRecord {
  startTime: string;
  endTime: string;
  count: number;
}

export interface DistanceRecord extends HealthRecord {
  startTime: string;
  endTime: string;
  distance: {
    inMeters: number;
  };
}

export interface HeartRateRecord extends HealthRecord {
  time: string;
  beatsPerMinute: number;
}

export interface CaloriesRecord extends HealthRecord {
  startTime: string;
  endTime: string;
  energy: {
    inKilocalories: number;
  };
}

export interface ExerciseRecord extends HealthRecord {
  startTime: string;
  endTime: string;
  exerciseType: ExerciseType;
  title?: string;
  notes?: string;
}

export interface SpeedRecord extends HealthRecord {
  time: string;
  speed: {
    inMetersPerSecond: number;
    inKilometersPerHour: number;
  };
}

export type HealthConnectRecord =
  | StepsRecord
  | DistanceRecord
  | HeartRateRecord
  | CaloriesRecord
  | ExerciseRecord
  | SpeedRecord;

export interface AggregatedData {
  dataType: RecordType;
  value: number;
  unit: string;
  startTime: string;
  endTime: string;
}

export interface HealthConnectError {
  code: string;
  message: string;
  details?: any;
}
