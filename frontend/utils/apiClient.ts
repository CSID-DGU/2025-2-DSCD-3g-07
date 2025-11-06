/**
 * API 클라이언트
 * 자동 IP 감지 및 재시도 로직 포함
 */

import Config from '../config';
import { testApiConnection, findWorkingUrl } from './networkUtils';

/**
 * API 요청 래퍼
 */
class ApiClient {
  private baseUrl: string;
  private isConnected: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.baseUrl = Config.API_BASE_URL;
    this.initialize();
  }

  /**
   * 초기화 - 동적 IP 감지 실행
   */
  private async initialize() {
    if (this.initialized) return;

    console.log('🚀 Initializing API Client with dynamic IP detection...');

    // Config의 동적 감지 시스템 실행
    this.baseUrl = await Config.initializeApiUrl();
    this.initialized = true;

    console.log('📡 API Client initialized with URL:', this.baseUrl);

    // 연결 테스트
    this.checkConnection();
  }

  /**
   * 연결 상태 확인
   */
  private async checkConnection() {
    this.isConnected = await testApiConnection(this.baseUrl);

    if (!this.isConnected && __DEV__) {
      console.warn('⚠️ 기본 URL 연결 실패, 대체 URL 탐색 중...');

      // 여러 가능한 URL 시도
      const possibleUrls: string[] = [
        this.baseUrl,
        'http://localhost:8000',
        'http://10.0.2.2:8000',
        'http://172.30.1.59:8000',
        'http://192.168.45.161:8000',
      ];

      const workingUrl = await findWorkingUrl(possibleUrls);
      if (workingUrl) {
        this.baseUrl = workingUrl;
        this.isConnected = true;
        console.log('✅ 작동하는 서버 발견:', workingUrl);
      }
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

      return response.json() as Promise<T>;
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

    return response.json() as Promise<T>;
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
