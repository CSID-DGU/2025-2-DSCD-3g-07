import Constants from 'expo-constants';
import { Platform } from 'react-native';

// API 연결 테스트 함수
const testApiConnection = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal as any,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};



// 자동 IP 감지 함수
const getAutoDetectedApiUrl = (): string => {
  // 환경 변수에서 API URL 확인 (최우선)
  const envApiUrl = Constants.expoConfig?.extra?.API_BASE_URL || process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl) {
    console.log('🌐 Using environment API URL:', envApiUrl);
    return envApiUrl;
  }

  // Expo 개발 서버 IP 자동 감지
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')?.[0];
  if (debuggerHost && debuggerHost !== 'localhost' && debuggerHost !== '127.0.0.1') {
    const autoApiUrl = `http://${debuggerHost}:8000`;
    console.log('🔍 Auto-detected API URL from Expo hostUri:', autoApiUrl);
    return autoApiUrl;
  }

  // 개발 환경 fallback (기존 IP는 백업용으로만)
  if (process.env.NODE_ENV !== 'production') {
    const fallbackIPs = [
      'http://192.168.45.161:8000', // 기존 IP (백업용)
      'http://192.168.1.100:8000',  // 일반적인 홈 네트워크
      'http://192.168.0.100:8000',  // 다른 홈 네트워크
      'http://10.0.2.2:8000'        // Android 에뮬레이터
    ];
    
    // 첫 번째 fallback IP 사용
    const fallbackUrl = fallbackIPs[0] || 'http://localhost:8000';
    console.log('🌐 Using fallback development API URL:', fallbackUrl);
    return fallbackUrl;
  }

  // 플랫폼별 자동 감지
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  if (Platform.OS === 'android') {
    // Expo 개발 서버의 IP 주소를 가져오려고 시도
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')?.[0];
    
    if (debuggerHost && debuggerHost !== 'localhost') {
      const apiUrl = `http://${debuggerHost}:8000`;
      console.log('🌐 Auto-detected API URL from Expo hostUri:', apiUrl);
      return apiUrl;
    }

    // Constants에서 더 많은 정보 확인
    console.log('📱 Expo Constants debug info:', {
      hostUri: Constants.expoConfig?.hostUri,
      manifest: Constants.expoConfig,
    });

    // fallback 전략: 일반적인 개발 환경 IP 패턴
    const fallbackIPs = [
      'http://192.168.45.161:8000', // 현재 확실히 작동하는 네트워크
      'http://10.0.2.2:8000',       // 안드로이드 에뮬레이터  
      'http://192.168.1.100:8000',  // 일반적인 홈 네트워크
      'http://192.168.0.100:8000',  // 다른 홈 네트워크
      'http://172.30.1.11:8000'     // 이전 네트워크 (낮은 우선순위)
    ];

    // 현재 시간과 환경에 따라 선택
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 9 && hour <= 18) {
      console.log('🌐 Using office hours fallback IP');
      return fallbackIPs[1] || fallbackIPs[0] || 'http://localhost:8000';
    } else {
      console.log('🌐 Using home network fallback IP');
      return fallbackIPs[0] || 'http://localhost:8000';
    }
  }

  // iOS 기본값
  return 'http://localhost:8000';
};

// 동적 API URL 관리 클래스
class ApiConfig {
  private _baseUrl: string;
  private _isInitialized = false;

  constructor() {
    this._baseUrl = getAutoDetectedApiUrl();
  }

  get API_BASE_URL(): string {
    return this._baseUrl;
  }

  // 실시간으로 작동하는 API URL을 찾아서 업데이트
  async initializeApiUrl(): Promise<string> {
    if (this._isInitialized) {
      return this._baseUrl;
    }

    console.log('🔍 Starting dynamic API URL detection...');
    
    // 여러 후보 URL들을 우선순위에 따라 시도
    const candidateUrls = [
      this._baseUrl,                    // 자동 감지된 URL (최우선)
      'http://localhost:8000',          // 로컬 개발
      'http://10.0.2.2:8000',         // Android 에뮬레이터
      process.env.EXPO_PUBLIC_API_URL,  // 환경변수 (fallback)
      process.env.EXPO_PUBLIC_DEV_API_URL, // 개발용 환경변수
      'http://192.168.45.161:8000',    // 이전 작동 IP (낮은 우선순위)
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