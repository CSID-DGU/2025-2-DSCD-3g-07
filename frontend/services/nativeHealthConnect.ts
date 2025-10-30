import { NativeModules } from 'react-native';

interface HealthConnectModuleType {
  isHealthConnectInstalled(): Promise<boolean>;
  openHealthConnectSettings(): Promise<boolean>;
}

const { HealthConnectModule } = NativeModules;

export default HealthConnectModule as HealthConnectModuleType;
