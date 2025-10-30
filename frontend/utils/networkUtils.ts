/**
 * 네트워크 유틸리티 함수
 * IP 주소 감지 및 네트워크 상태 확인
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 현재 로컬 네트워크 IP 주소 추정
 * Expo 개발 서버의 IP를 기반으로 백엔드 서버 URL 생성
 */
export const getLocalNetworkIp = (): string | null => {
  try {
    // Expo Go의 debugger host에서 IP 추출
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const [ip] = hostUri.split(':');
      return ip || null;
    }

    // 구버전 호환
    const manifest = Constants.manifest as any;
    if (manifest?.debuggerHost) {
      const [ip] = manifest.debuggerHost.split(':');
      return ip || null;
    }

    return null;
  } catch (error) {
    console.error('IP 감지 오류:', error);
    return null;
  }
};

/**
 * 자동으로 백엔드 서버 URL 생성
 * @param port 백엔드 서버 포트 (기본값: 8000)
 */
export const getBackendUrl = (port: number = 8000): string => {
  const ip = getLocalNetworkIp();
  
  if (ip) {
    return `http://${ip}:${port}`;
  }

  // Fallback: 플랫폼별 기본값
  if (Platform.OS === 'android') {
    // Android 에뮬레이터는 10.0.2.2가 호스트 머신
    return `http://10.0.2.2:${port}`;
  }

  // iOS와 웹은 localhost 사용 가능
  return `http://localhost:${port}`;
};

/**
 * 네트워크 연결 상태 확인
 */
export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    // 간단한 네트워크 연결 테스트 (Google DNS)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    await fetch('https://8.8.8.8', {
      method: 'HEAD',
      signal: controller.signal as any,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.error('네트워크 상태 확인 오류:', error);
    return false;
  }
};

/**
 * API 서버 연결 테스트
 * @param baseUrl 테스트할 서버 URL
 */
export const testApiConnection = async (baseUrl: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/api-health`, {
      method: 'GET',
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn(`API 연결 테스트 실패 (${baseUrl}):`, error);
    return false;
  }
};

/**
 * 여러 URL 중 작동하는 것 찾기
 * @param urls 테스트할 URL 배열
 */
export const findWorkingUrl = async (urls: string[]): Promise<string | null> => {
  for (const url of urls) {
    console.log(`🔍 테스트 중: ${url}`);
    const isWorking = await testApiConnection(url);
    if (isWorking) {
      console.log(`✅ 작동하는 URL 발견: ${url}`);
      return url;
    }
  }
  console.warn('⚠️ 작동하는 URL을 찾지 못했습니다');
  return null;
};

/**
 * 개발 환경 정보 로깅
 */
export const logNetworkInfo = () => {
  if (__DEV__) {
    console.log('═════════════════════════════════════');
    console.log('📱 네트워크 정보');
    console.log('═════════════════════════════════════');
    console.log('플랫폼:', Platform.OS);
    console.log('실제 기기:', Constants.isDevice);
    console.log('Expo 호스트:', Constants.expoConfig?.hostUri);
    console.log('감지된 IP:', getLocalNetworkIp());
    console.log('백엔드 URL:', getBackendUrl());
    console.log('═════════════════════════════════════');
  }
};
