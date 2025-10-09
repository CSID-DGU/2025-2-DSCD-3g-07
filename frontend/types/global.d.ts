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

// React Native Health Connect types (if not properly exported)
declare module 'react-native-health-connect' {
  export interface HealthConnectPermission {
    read: string;
    write: string;
  }
  
  export interface HealthData {
    steps?: number;
    distance?: number;
    calories?: number;
    heartRate?: number;
  }
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
}

export interface TransitRoute {
  id: string;
  duration: number;
  distance: number;
  steps: RouteStep[];
  estimatedWalkingTime: number;
}

export interface RouteStep {
  instruction: string;
  duration: number;
  distance: number;
  mode: 'walking' | 'transit';
}

export {};