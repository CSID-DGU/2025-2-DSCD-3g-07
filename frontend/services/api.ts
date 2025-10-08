import Constants from 'expo-constants';
import { API_CONFIG } from '../utils/apiConfig';

const API_BASE_URL = API_CONFIG.BASE_URL;

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
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('🌐 API Base URL:', this.baseURL);
  }

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log('📡 API Request:', url);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          status: response.status,
          error: data.message || `API Error: ${response.status}`,
        };
      }

      return {
        status: response.status,
        data,
      };
    } catch (error) {
      console.error('❌ API Request failed:', error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Network error',
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
      count: params.count?.toString() || '1',
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