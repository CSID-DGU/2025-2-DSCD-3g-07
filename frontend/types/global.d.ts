/// <reference types="expo/types" />

// Global type declarations for PaceTry frontend

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      EXPO_PUBLIC_API_URL?: string;
      EXPO_PUBLIC_DEV_API_URL?: string;
      EXPO_PUBLIC_PROD_API_URL?: string;
      EXPO_PUBLIC_APP_NAME?: string;
      EXPO_PUBLIC_APP_VERSION?: string;
      EXPO_PUBLIC_HEALTH_CONNECT_ENABLED?: string;
      EXPO_PUBLIC_DEBUG_ENABLED?: string;
    }
  }
}

// React Native Health Connect types
declare module 'react-native-health-connect' {
  // Permission types
  export enum HealthPermission {
    STEPS = 'android.permission.health.READ_STEPS',
    DISTANCE = 'android.permission.health.READ_DISTANCE',
    CALORIES = 'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
    HEART_RATE = 'android.permission.health.READ_HEART_RATE',
    EXERCISE = 'android.permission.health.READ_EXERCISE',
    SPEED = 'android.permission.health.READ_SPEED',
  }

  export interface HealthConnectPermission {
    accessType: 'read' | 'write';
    recordType: string;
  }

  // Record types
  export interface StepsRecord {
    startTime: string;
    endTime: string;
    count: number;
    metadata?: RecordMetadata;
  }

  export interface DistanceRecord {
    startTime: string;
    endTime: string;
    distance: {
      inMeters: number;
    };
    metadata?: RecordMetadata;
  }

  export interface HeartRateRecord {
    time: string;
    beatsPerMinute: number;
    metadata?: RecordMetadata;
  }

  export interface ActiveCaloriesBurnedRecord {
    startTime: string;
    endTime: string;
    energy: {
      inKilocalories: number;
    };
    metadata?: RecordMetadata;
  }

  export interface ExerciseSessionRecord {
    startTime: string;
    endTime: string;
    exerciseType: number;
    title?: string;
    notes?: string;
    metadata?: RecordMetadata;
  }

  export interface SpeedRecord {
    time: string;
    speed: {
      inMetersPerSecond: number;
    };
    metadata?: RecordMetadata;
  }

  export interface RecordMetadata {
    id: string;
    clientRecordId?: string;
    dataOrigin: string;
    lastModifiedTime: string;
    clientRecordVersion: number;
  }

  // Request/Response types
  export interface ReadRecordsRequest {
    recordType: string;
    timeRangeFilter: {
      startTime: string;
      endTime: string;
    };
    dataOriginFilter?: string[];
    ascendingOrder?: boolean;
    pageSize?: number;
    pageToken?: string;
  }

  export interface ReadRecordsResponse<T> {
    records: T[];
    pageToken?: string;
  }

  export interface AggregateResult {
    [key: string]: number | string;
  }

  // SDK methods
  export interface HealthConnectClient {
    initialize(): Promise<void>;
    requestPermission(permissions: HealthConnectPermission[]): Promise<boolean>;
    checkPermissions(permissions: HealthConnectPermission[]): Promise<boolean[]>;
    readRecords<T>(request: ReadRecordsRequest): Promise<ReadRecordsResponse<T>>;
    aggregate(request: AggregateRequest): Promise<AggregateResult>;
    insertRecords(records: any[]): Promise<string[]>;
    deleteRecords(recordIds: string[]): Promise<void>;
  }

  export interface AggregateRequest {
    recordType: string;
    timeRangeFilter: {
      startTime: string;
      endTime: string;
    };
    dataOriginFilter?: string[];
    metrics: string[];
  }

  // Main exports
  export function initialize(): Promise<boolean>;
  export function getSdkStatus(): Promise<number>;
  export function requestPermission(permissions: HealthConnectPermission[]): Promise<boolean>;
  export function getGrantedPermissions(): Promise<HealthConnectPermission[]>;
  export function readRecords<T>(request: ReadRecordsRequest): Promise<ReadRecordsResponse<T>>;
  export function aggregateRecord(request: AggregateRequest): Promise<AggregateResult>;
  export function insertRecords(records: any[]): Promise<string[]>;
  export function deleteRecords(recordType: string, recordIdsList: string[], clientRecordIdsList: string[]): Promise<boolean>;
  
  // Constants
  export const SdkAvailabilityStatus: {
    SDK_UNAVAILABLE: number;
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: number;
    SDK_AVAILABLE: number;
  };
}

// Custom app types
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export interface HealthMetrics {
  steps: number;
  distance: number;
  calories: number;
  heartRate?: number;
  timestamp: Date;
  source?: string;
}

export interface DailyHealthData {
  date: string;
  steps: number;
  distance: number; // meters
  calories: number;
  activeMinutes?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  heartRateMin?: number;
}

export interface WeeklyHealthSummary {
  weekStart: string;
  weekEnd: string;
  totalSteps: number;
  totalDistance: number;
  totalCalories: number;
  avgStepsPerDay: number;
  dailyData: DailyHealthData[];
}

export interface TransitRoute {
  id: string;
  duration: number;
  distance: number;
  steps: RouteStep[];
  estimatedWalkingTime: number;
  personalizedWalkingTime?: number;
}

export interface RouteStep {
  instruction: string;
  duration: number;
  distance: number;
  mode: 'walking' | 'transit' | 'bus' | 'subway' | 'train';
  transitDetails?: TransitDetails;
}

export interface TransitDetails {
  line: string;
  departure: string;
  arrival: string;
  stops: number;
}

export interface UserProfile {
  id: string;
  name?: string;
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  averageWalkingSpeed?: number; // km/h
  healthGoals?: HealthGoals;
}

export interface HealthGoals {
  dailySteps?: number;
  weeklyDistance?: number; // km
  weeklyCalories?: number;
  weeklyActiveMinutes?: number;
}

export interface PersonalizationData {
  userId: string;
  walkingSpeedFactor: number; // 1.0 = average
  fitnessLevel: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

export {};
