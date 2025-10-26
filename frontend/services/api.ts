import { apiClient } from '../utils/apiClient';

interface TransitRouteParams {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  user_id?: string;
  user_age?: number;
  fatigue_level?: number;
  count?: number;
  lang?: number;
  format?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiService {
  constructor() {
    console.log('🌐 API Service initialized with auto-scanning apiClient');
  }

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      // apiClient를 사용하여 자동 스캔 기능 활용
      if (options?.method === 'GET' || !options?.method) {
        const result = await apiClient.get<T>(endpoint);
        return {
          status: 200,
          data: result,
        };
      } else {
        const result = await apiClient.post<T>(endpoint, options?.body ? JSON.parse(options.body as string) : undefined);
        return {
          status: 200,
          data: result,
        };
      }
    } catch (error) {
      console.error('❌ API Request failed:', error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Network error with auto-scanning apiClient',
      };
    }
  }

  async getTransitRoute(params: TransitRouteParams): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams({
      start_x: params.start_x.toString(),
      start_y: params.start_y.toString(),
      end_x: params.end_x.toString(),
      end_y: params.end_y.toString(),
      user_id: params.user_id || 'default_user',
      user_age: params.user_age?.toString() || '30',
      fatigue_level: params.fatigue_level?.toString() || '3',
      count: params.count?.toString() || '10',
      lang: params.lang?.toString() || '0',
      format: params.format || 'json',
    });

    return this.makeRequest(`/transit-route?${queryParams}`);
  }

  async healthCheck(): Promise<ApiResponse<{ status: string; version: string }>> {
    return this.makeRequest('/api-health');
  }
}

// 싱글톤 인스턴스 생성
export const apiService = new ApiService();
export default ApiService;
export type { TransitRouteParams, ApiResponse };