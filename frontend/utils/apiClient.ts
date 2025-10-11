/**
 * API 클라이언트
 * 자동 IP 감지 및 재시도 로직 포함
 */

import { API_CONFIG } from './apiConfig';
import { testApiConnection, findWorkingUrl } from './networkUtils';

/**
 * API 요청 래퍼
 */
class ApiClient {
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
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
      const possibleUrls = [
        this.baseUrl,
        'http://localhost:8000',
        'http://10.0.2.2:8000',
        ...Object.values(API_CONFIG.DEVELOPER_URLS),
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
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * POST 요청
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
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

    return response.json();
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
