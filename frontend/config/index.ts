import Constants from 'expo-constants';

export const Config = {
  API_BASE_URL: Constants.expoConfig?.extra?.API_BASE_URL || 'http://172.30.1.11:8000',
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