/**
 * API 클라이언트
 * 자동 IP 감지 및 재시도 로직 포함
 */

import Config from '../config';
import { testApiConnection } from './networkUtils';

/**
 * API 요청 래퍼
 */
class ApiClient {
  private baseUrl: string;
  private isConnected: boolean = false;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = Config.API_BASE_URL;
    // constructor에서 자동 초기화 제거
  }

  /**
   * 초기화 - 동적 IP 감지 실행 (한 번만 실행, 중복 방지)
   */
  private async initialize() {
    // 이미 초기화되었으면 즉시 반환
    if (this.initialized) {
      return;
    }

    // 초기화 중이면 기존 Promise 반환
    if (this.initPromise) {
      return this.initPromise;
    }

    // 새로운 초기화 시작
    this.initPromise = (async () => {
      console.log('🚀 Initializing API Client...');

      // Config의 동적 감지 시스템 실행 (Config에서 중복 방지 처리됨)
      this.baseUrl = await Config.initializeApiUrl();
      this.initialized = true;
      this.initPromise = null;

      console.log('📡 API Client initialized with URL:', this.baseUrl);
    })();

    return this.initPromise;
  }

  /**
   * 연결 상태 확인 (초기화와 분리)
   */
  private async checkConnection() {
    this.isConnected = await testApiConnection(this.baseUrl);

    if (!this.isConnected) {
      console.warn('⚠️ Backend server connection failed:', this.baseUrl);
      console.warn('⚠️ Please check if the backend server is running.');
    } else {
      console.log('✅ Backend server connected:', this.baseUrl);
    }
  }

  /**
   * GET 요청
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    // 초기화 보장
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`🔍 Making GET request to: ${this.baseUrl}${endpoint}`);

    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // 타임아웃 설정 (20초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal as any, // React Native와 DOM 타입 충돌 회피
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API 오류: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json() as T;

      // Transit route 응답일 경우 간단한 요약 로그만 출력
      if (endpoint.includes('/transit-route') && data && typeof data === 'object') {
        const routeData = data as any;
        const itineraries = routeData.metaData?.plan?.itineraries;
        if (itineraries && Array.isArray(itineraries)) {
          console.log(`✅ 경로 검색 완료: ${itineraries.length}개 경로`);
          if (itineraries[0]) {
            const first = itineraries[0];
            console.log(`  - 소요시간: ${Math.round(first.totalTime / 60)}분`);
            console.log(`  - 환승: ${first.transfers || 0}회`);
            console.log(`  - 경로 수: ${first.legs?.length || 0}개 구간`);
          }
        }
      } else {
        console.log(`✅ Response received for ${endpoint}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. (timeout 20초)');
      }
      throw error;
    }
  }

  /**
   * POST 요청
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    // 초기화 보장
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`📤 Making POST request to: ${this.baseUrl}${endpoint}`);

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as T;
    console.log(`✅ Response received for ${endpoint}`);
    return result;
  }

  /**
   * 현재 베이스 URL 반환
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 연결 상태 반환
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }
}

// 싱글톤 인스턴스
export const apiClient = new ApiClient();

export default apiClient;
