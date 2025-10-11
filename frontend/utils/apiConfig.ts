import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * 현재 호스트 IP 주소를 자동으로 감지
 * Expo의 manifest를 통해 개발 서버 IP를 가져옴
 */
const getDevServerIp = (): string | null => {
  try {
    // Expo Go 사용 시 자동으로 감지된 IP
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      // "192.168.1.100:8081" 형태에서 IP만 추출
      const ip = debuggerHost.split(':')[0];
      return ip || null;
    }

    // manifest에서 IP 가져오기 (구버전 호환)
    const manifest = Constants.manifest as any;
    if (manifest?.debuggerHost) {
      const ip = manifest.debuggerHost.split(':')[0];
      return ip || null;
    }

    return null;
  } catch (error) {
    console.warn('⚠️ IP 자동 감지 실패:', error);
    return null;
  }
};

/**
 * 환경별 API Base URL 결정
 */
const getApiBaseUrl = () => {
  const isDev = __DEV__;
  
  // 1순위: 환경 변수에서 확인
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log('📌 환경변수 사용:', process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2순위: 개발 환경에서는 자동 IP 감지
  if (isDev) {
    const autoIp = getDevServerIp();
    if (autoIp) {
      const autoUrl = `http://${autoIp}:8000`;
      console.log('🔍 자동 감지된 IP:', autoUrl);
      return autoUrl;
    }
  }

  // 3순위: 플랫폼별 기본값
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  if (Platform.OS === 'android') {
    // Android 에뮬레이터는 10.0.2.2 사용
    if (Constants.isDevice === false) {
      return 'http://10.0.2.2:8000';
    }
    // 실제 기기는 환경변수 필요
    return process.env.EXPO_PUBLIC_DEV_API_URL || 'http://192.168.1.100:8000';
  }

  // iOS는 localhost 사용 가능
  return 'http://localhost:8000';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  
  // 엔드포인트
  ENDPOINTS: {
    HEALTH: '/health',
    TRANSIT_ROUTE: '/transit/route',
    PERSONALIZATION: '/personalization',
  },
  
  // 개발자별 수동 설정 (자동 감지 실패 시 사용)
  DEVELOPER_URLS: {
    default: 'http://10.0.2.2:8000',      // Android 에뮬레이터
    localhost: 'http://localhost:8000',   // 웹/iOS 시뮬레이터
    // 팀원별 IP 주소 (필요시 추가)
    // member1: 'http://192.168.1.100:8000',
    // member2: 'http://172.30.1.50:8000',
  }
};

// 디버그 정보 출력
if (__DEV__) {
  console.log('=====================================');
  console.log('🌐 API Configuration');
  console.log('=====================================');
  console.log('Platform:', Platform.OS);
  console.log('Is Device:', Constants.isDevice);
  console.log('Base URL:', API_CONFIG.BASE_URL);
  console.log('Expo Host:', Constants.expoConfig?.hostUri);
  console.log('=====================================');
}

export default API_CONFIG;