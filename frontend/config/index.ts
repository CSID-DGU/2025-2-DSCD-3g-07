import Constants from 'expo-constants';
import { Platform } from 'react-native';

// API 연결 테스트 함수
const testApiConnection = async (url: string): Promise<boolean> => {
  try {
    console.log(`🔍 Testing Health Check for: ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout (10s) reached for ${url}`);
      controller.abort();
    }, 10000); // 10초 타임아웃으로 증가
    
    const startTime = Date.now();
    
    const response = await fetch(`${url}/api-health`, {
      method: 'GET',
      signal: controller.signal as any,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const success = response.ok;
    
    if (success) {
      console.log(`✅ Health check SUCCESS for ${url} (${duration}ms) - Status: ${response.status}`);
    } else {
      console.log(`❌ Health check FAILED for ${url} (${duration}ms) - Status: ${response.status}`);
    }
    
    return success;
  } catch (error) {
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ Health check ERROR for ${url}: [${errorType}: ${errorMessage}]`);
    
    // AbortError의 경우 더 자세한 정보 제공
    if (errorType === 'AbortError') {
      console.log(`   🚨 Request was aborted (likely due to timeout or network issues)`);
      console.log(`   💡 This might indicate network connectivity problems between mobile and PC`);
    }
    
    return false;
  }
};



// Expo hostUri에서 IP 추출하는 개선된 함수
const getExpoBasedApiUrl = (): string | null => {
  try {
    const hostUri = Constants.expoConfig?.hostUri;
    console.log('📱 Checking Expo hostUri:', hostUri);
    
    if (!hostUri) {
      console.log('❌ No Expo hostUri found');
      return null;
    }
    
    const hostIP = hostUri.split(':')[0];
    if (!hostIP || hostIP === 'localhost' || hostIP === '127.0.0.1') {
      console.log('❌ Invalid or localhost IP in hostUri:', hostIP);
      return null;
    }
    
    const apiUrl = `http://${hostIP}:8000`;
    console.log(`✅ Expo-based API URL: ${hostUri} → ${apiUrl}`);
    return apiUrl;
    
  } catch (error) {
    console.error('❌ Error extracting IP from Expo hostUri:', error);
    return null;
  }
};

// 자동 IP 감지 함수 (Expo hostUri 우선)
const getAutoDetectedApiUrl = (): string => {
  console.log('🔍 Starting API URL detection...');
  
  // 1순위: Expo hostUri에서 실시간 IP 추출 (가장 정확)
  const expoApiUrl = getExpoBasedApiUrl();
  if (expoApiUrl) {
    return expoApiUrl;
  }

  // 2순위: 환경 변수
  const envApiUrl = Constants.expoConfig?.extra?.API_BASE_URL || process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl && envApiUrl !== 'http://localhost:8000') {
    console.log('📌 Using environment variable:', envApiUrl);
    return envApiUrl;
  }

  // 3순위: 플랫폼별 기본값
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  // 4순위: 개발 환경 fallback
  const fallbackIPs = [
    'http://172.30.1.59:8000',    // 현재 백엔드 서버 IP
    'http://192.168.45.161:8000', // 이전 IP (백업용)
    'http://10.0.2.2:8000',       // Android 에뮬레이터
    'http://localhost:8000'       // 최종 fallback
  ];
  
  const fallbackUrl = fallbackIPs[0] || 'http://localhost:8000';
  console.log('🌐 Using fallback API URL:', fallbackUrl);
  return fallbackUrl;
};

// 동적 API URL 관리 클래스
class ApiConfig {
  private _baseUrl: string;
  private _isInitialized = false;

  constructor() {
    console.log('=====================================');
    console.log('🌐 API Configuration');
    console.log('=====================================');
    console.log('Platform:', Platform.OS);
    console.log('Is Device:', Constants.isDevice);
    
    this._baseUrl = getAutoDetectedApiUrl();
    
    console.log('Base URL:', this._baseUrl);
    console.log('Expo Host:', Constants.expoConfig?.hostUri);
    console.log('=====================================');
  }

  get API_BASE_URL(): string {
    return this._baseUrl;
  }

  // Expo hostUri 기반 실시간 API URL 감지
  private getExpoBasedApiUrl(): string | null {
    try {
      const hostUri = Constants.expoConfig?.hostUri;
      console.log('📱 Current Expo hostUri:', hostUri);
      
      if (!hostUri) return null;
      
      const hostIP = hostUri.split(':')[0];
      if (!hostIP || hostIP === 'localhost' || hostIP === '127.0.0.1') {
        return null;
      }
      
      const apiUrl = `http://${hostIP}:8000`;
      console.log(`🔄 Expo (${hostUri}) → Backend (${apiUrl})`);
      return apiUrl;
      
    } catch (error) {
      console.error('❌ Failed to extract IP from Expo hostUri:', error);
      return null;
    }
  }

  // 실시간으로 작동하는 API URL을 찾아서 업데이트
  async initializeApiUrl(): Promise<string> {
    if (this._isInitialized) {
      return this._baseUrl;
    }

    console.log('� Starting smart API URL detection...');
    
    // 1단계: Expo hostUri에서 실시간 IP 추출 (최우선)
    const expoDynamicUrl = this.getExpoBasedApiUrl();
    
    // 여러 후보 URL들을 우선순위에 따라 구성
    const candidateUrls = [
      expoDynamicUrl,                   // Expo 실시간 감지 (최우선)
      'http://172.30.1.59:8000',        // 현재 네트워크 IP
      this._baseUrl,                    // 초기 자동 감지된 URL
      'http://192.168.0.20:8000',       // 이전 IP
      'http://10.0.2.2:8000',           // Android 에뮬레이터
      'http://localhost:8000',          // 로컬 개발
      process.env.EXPO_PUBLIC_API_URL,  // 환경변수 (fallback)
      'http://192.168.45.161:8000',     // 구 IP (낮은 우선순위)
    ].filter(Boolean) as string[]; // null/undefined 제거

    // 각 URL을 순차적으로 테스트
    for (const url of candidateUrls) {
      console.log(`🔍 Testing: ${url}`);
      const isWorking = await testApiConnection(url);
      
      if (isWorking) {
        this._baseUrl = url;
        console.log(`✅ Found working API URL: ${url}`);
        this._isInitialized = true;
        return this._baseUrl;
      }
    }
    
    // 모든 URL이 실패한 경우 첫 번째 후보를 사용
    this._baseUrl = candidateUrls[0] || 'http://localhost:8000';
    console.warn('⚠️ No working API URL found, using fallback:', this._baseUrl);
    
    this._isInitialized = true;
    return this._baseUrl;
  }



  // API URL 강제 업데이트
  setApiUrl(url: string): void {
    this._baseUrl = url;
    console.log('🔧 API URL manually set to:', url);
  }
}

const apiConfig = new ApiConfig();

export const Config = {
  get API_BASE_URL() {
    return apiConfig.API_BASE_URL;
  },
  
  // API URL 초기화 함수 (앱 시작시 호출)
  initializeApiUrl: () => apiConfig.initializeApiUrl(),
  
  // API URL 수동 설정
  setApiUrl: (url: string) => apiConfig.setApiUrl(url),
  
  ENVIRONMENT: Constants.expoConfig?.extra?.ENVIRONMENT || 'development',

  // API 엔드포인트
  ENDPOINTS: {
    HEALTH: '/health',
    TRANSIT_ROUTE: '/transit-route',
  },

  // 기본값
  DEFAULTS: {
    USER_AGE: 30,
    FATIGUE_LEVEL: 3,
    ROUTE_COUNT: 1,
    LANGUAGE: 0, // 0: 한국어
  },

  // 개발 설정
  DEV: {
    ENABLE_LOGGING: true,
    API_TIMEOUT: 30000, // 30초
  }
};

export default Config;