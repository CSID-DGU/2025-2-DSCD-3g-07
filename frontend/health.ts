import { Platform } from 'react-native';
import {
    SdkAvailabilityStatus,
    aggregateRecord,
    getGrantedPermissions,
    getSdkStatus,
    initialize,
    openHealthConnectSettings as openNativeHealthConnectSettings,
    readRecords,
    requestPermission,
    type BackgroundAccessPermission,
    type Permission,
    type ReadHealthDataHistoryPermission,
    type WriteExerciseRoutePermission,
} from 'react-native-health-connect';

export interface HealthResult {
  granted: boolean;
  totalSteps: number;
  totalMeters: number;
  averageSpeedKmh: number;
  averageSpeedMps: number;
  source: 'Health Connect' | 'Sensors' | 'Fallback';
  isDemoData: boolean;
  timestamp: string;
}

type AnyGrantedPermission =
  | Permission
  | WriteExerciseRoutePermission
  | BackgroundAccessPermission
  | ReadHealthDataHistoryPermission;

const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
];

const OPTIONAL_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Speed' },
];

const ALL_PERMISSIONS: Permission[] = [...REQUIRED_PERMISSIONS, ...OPTIONAL_PERMISSIONS];

const REQUIRED_PERMISSION_KEYS = REQUIRED_PERMISSIONS.map(permissionKey);
const OPTIONAL_PERMISSION_KEYS = OPTIONAL_PERMISSIONS.map(permissionKey);

const SPEED_PERMISSION_KEY = OPTIONAL_PERMISSION_KEYS[0];

const nowISO = () => new Date().toISOString();

function permissionKey(permission: { accessType: string; recordType: string }): string {
  return `${permission.accessType}:${permission.recordType}`;
}

function createGrantedKeySet(granted: AnyGrantedPermission[]): Set<string> {
  return new Set(granted.map(permissionKey));
}

function hasAllRequiredPermissions(granted: AnyGrantedPermission[]): boolean {
  const grantedKeys = createGrantedKeySet(granted);
  return REQUIRED_PERMISSION_KEYS.every((key) => grantedKeys.has(key));
}

async function ensureHealthConnectReady(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const status = await getSdkStatus();
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      console.warn('[health] SDK status not available', status);
      return false;
    }
    return await initialize();
  } catch (error) {
    console.warn('[health] ensure readiness failed', error);
    return false;
  }
}

async function readFromHealthConnect(): Promise<HealthResult | null> {
  if (!(await ensureHealthConnectReady())) {
    return null;
  }

  try {
    let grantedPermissions = await getGrantedPermissions();
    let grantedKeys = createGrantedKeySet(grantedPermissions);

    let hasRequired = hasAllRequiredPermissions(grantedPermissions);
    if (!hasRequired) {
      await requestPermission(ALL_PERMISSIONS);
      grantedPermissions = await getGrantedPermissions();
      grantedKeys = createGrantedKeySet(grantedPermissions);
      hasRequired = hasAllRequiredPermissions(grantedPermissions);
    }

    if (!hasRequired) {
      return {
        granted: false,
        totalSteps: 0,
        totalMeters: 0,
        averageSpeedKmh: 0,
        averageSpeedMps: 0,
        source: 'Health Connect',
        isDemoData: true,
        timestamp: nowISO(),
      };
    }

    const end = new Date();
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);

    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    const stepsAggregate = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
    const distanceAggregate = await aggregateRecord({ recordType: 'Distance', timeRangeFilter });

    const totalSteps = Math.max(0, Math.round(stepsAggregate?.COUNT_TOTAL ?? 0));
    const totalMeters = Math.max(0, Math.round(distanceAggregate?.DISTANCE?.inMeters ?? 0));

    let averageSpeedMps = 0;
    let averageSpeedKmh = 0;

    if (SPEED_PERMISSION_KEY && grantedKeys.has(SPEED_PERMISSION_KEY)) {
      try {
        const speedResponse = await readRecords('Speed', {
          timeRangeFilter,
        });

        const samples = speedResponse?.records
          ?.map((record) => record.samples ?? [])
          .flat()
          .map((sample) => sample.speed?.inMetersPerSecond ?? 0)
          .filter((value) => value > 0);

        if (samples && samples.length > 0) {
          const total = samples.reduce((sum, value) => sum + value, 0);
          const avgMps = total / samples.length;
          averageSpeedMps = parseFloat(avgMps.toFixed(2));
          averageSpeedKmh = parseFloat((avgMps * 3.6).toFixed(2));
        }
      } catch (error) {
        console.warn('[health] speed read failed', error);
      }
    }

    return {
      granted: true,
      totalSteps,
      totalMeters,
      averageSpeedKmh,
      averageSpeedMps,
      source: 'Health Connect',
      isDemoData: false,
      timestamp: nowISO(),
    };
  } catch (error) {
    console.warn('[health] health connect read failed', error);
    return null;
  }
}

function demoFallback(): HealthResult {
  const steps = 6200 + Math.floor(Math.random() * 1200);
  const meters = Math.round(steps * 0.72);
  const averageSpeedKmh = parseFloat((Math.random() * 1.2 + 5.4).toFixed(2));
  const averageSpeedMps = parseFloat((averageSpeedKmh / 3.6).toFixed(2));

  return {
    granted: true,
    totalSteps: steps,
    totalMeters: meters,
    averageSpeedKmh,
    averageSpeedMps,
    source: 'Fallback',
    isDemoData: true,
    timestamp: nowISO(),
  };
}

export async function readTodayStepsAndDistance(): Promise<HealthResult> {
  const native = await readFromHealthConnect();
  if (native && native.granted) {
    return native;
  }
  return demoFallback();
}

export async function requestHealthConnectPermissions(): Promise<{ success: boolean; error?: string }> {
  if (!(await ensureHealthConnectReady())) {
    return { success: false, error: 'Health Connect is not available' };
  }

  try {
    await requestPermission(ALL_PERMISSIONS);
    const granted = await getGrantedPermissions();
    if (hasAllRequiredPermissions(granted)) {
      return { success: true };
    }
    return { success: false, error: 'Required permissions were not granted' };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function openHealthConnectSettings(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, error: 'Health Connect settings unavailable on this platform' };
  }

  try {
    openNativeHealthConnectSettings();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}
