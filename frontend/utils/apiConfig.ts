import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 개발 환경별 API URL 설정
const getApiBaseUrl = () => {
  // 환경 변수에서 먼저 확인
  const configUrl = Constants.expoConfig?.extra?.API_BASE_URL;
  if (configUrl) {
    return configUrl;
  }

  // 플랫폼별 기본값
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  // Android 에뮬레이터
  if (Platform.OS === 'android' && __DEV__) {
    // 실제 기기 - PC IP 주소 사용
    return 'http://192.168.45.161:8000';
  }

  // iOS 시뮬레이터나 실제 기기
  return 'http://localhost:8000';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 30000,
  
  // 개발자별 설정 (협업용)
  DEVELOPER_URLS: {
    // 팀원들이 각자의 IP를 여기에 추가
    default: 'http://10.0.2.2:8000',
    localhost: 'http://localhost:8000',
    // 예시: 팀원 IP 주소들
    // member1: 'http://192.168.1.100:8000',
    // member2: 'http://172.30.1.50:8000',
  }
};

// 현재 사용 중인 URL 로깅
console.log('🌐 API Base URL:', API_CONFIG.BASE_URL);

export default API_CONFIG;