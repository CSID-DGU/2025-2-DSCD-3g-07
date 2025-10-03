import { NativeModules, Platform } from 'react-native';

export interface HealthResult {
  granted: boolean;
  totalSteps: number;
  totalMeters: number;
  source: 'Health Connect' | 'Sensors' | 'Fallback';
  isDemoData: boolean;
  timestamp: string;
}

type NativeHealthModule = {
  isAvailable: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  readToday: () => Promise<{ granted: boolean; steps?: number; meters?: number }>;
} | undefined;

const NativeHealth: NativeHealthModule = Platform.OS === 'android' ? (NativeModules as any)?.PacerHealthConnect : undefined;

const nowISO = () => new Date().toISOString();

async function readFromNative(): Promise<HealthResult | null> {
  if (Platform.OS !== 'android' || !NativeHealth?.isAvailable) return null;

  try {
    const available = await NativeHealth.isAvailable();
    if (!available) return null;

    const granted = await NativeHealth.requestPermissions();
    if (!granted) {
      return {
        granted: false,
        totalSteps: 0,
        totalMeters: 0,
        source: 'Health Connect',
        isDemoData: true,
        timestamp: nowISO(),
      };
    }

    const result = await NativeHealth.readToday();
    if (!result?.granted) {
      return {
        granted: false,
        totalSteps: 0,
        totalMeters: 0,
        source: 'Health Connect',
        isDemoData: true,
        timestamp: nowISO(),
      };
    }

    const steps = Math.max(0, Math.round(result.steps ?? 0));
    const meters = Math.max(0, Math.round(result.meters ?? 0));

    return {
      granted: true,
      totalSteps: steps,
      totalMeters: meters,
      source: 'Health Connect',
      isDemoData: false,
      timestamp: nowISO(),
    };
  } catch (error) {
    console.warn('[health] native error', error);
    return null;
  }
}

function demoFallback(): HealthResult {
  const steps = 6200 + Math.floor(Math.random() * 1200);
  const meters = Math.round(steps * 0.72);
  return {
    granted: true,
    totalSteps: steps,
    totalMeters: meters,
    source: 'Fallback',
    isDemoData: true,
    timestamp: nowISO(),
  };
}

export async function readTodayStepsAndDistance(): Promise<HealthResult> {
  const native = await readFromNative();
  if (native && native.granted) {
    return native;
  }
  return demoFallback();
}

export async function requestHealthConnectPermissions(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'android' || !NativeHealth?.requestPermissions) {
    return { success: false, error: 'Health Connect is not available' };
  }
  try {
    const granted = await NativeHealth.requestPermissions();
    return { success: granted };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function openHealthConnectSettings(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Health Connect settings unavailable in Expo Go' };
}
