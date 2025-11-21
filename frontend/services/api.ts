import { apiClient } from '../utils/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@pacetry_auth_token';

interface TransitRouteParams {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  count?: number;
  lang?: number;
  format?: string;
}

interface WalkingRouteParams {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  start_name?: string;
  end_name?: string;
  user_speed_mps?: number; // 사용자 보행속도 (m/s)
  weather_data?: any; // 날씨 데이터
}

interface SpeedProfileUpdateParams {
  activity_type: string;
  avg_speed_flat_kmh: number;
  source?: string;
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

  private async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      // apiClient를 사용하여 자동 스캔 기능 활용
      if (options?.method === 'GET' || !options?.method) {
        const result = await apiClient.get<T>(endpoint);
        return {
          status: 200,
          data: result,
        };
      } else {
        const result = await apiClient.post<T>(
          endpoint,
          options?.body ? JSON.parse(options.body as string) : undefined
        );
        return {
          status: 200,
          data: result,
        };
      }
    } catch (error) {
      console.error('❌ API Request failed:', error);
      return {
        status: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Network error with auto-scanning apiClient',
      };
    }
  }

  async getTransitRoute(params: TransitRouteParams): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams({
      start_x: params.start_x.toString(),
      start_y: params.start_y.toString(),
      end_x: params.end_x.toString(),
      end_y: params.end_y.toString(),
      count: params.count?.toString() || '10',
      lang: params.lang?.toString() || '0',
      format: params.format || 'json',
    });

    return this.makeRequest(`/transit-route?${queryParams}`);
  }

  async getWalkingRoute(params: WalkingRouteParams): Promise<ApiResponse<any>> {
    const body = {
      start_x: params.start_x,
      start_y: params.start_y,
      end_x: params.end_x,
      end_y: params.end_y,
      start_name: params.start_name,
      end_name: params.end_name,
      user_speed_mps: params.user_speed_mps,
      weather_data: params.weather_data,
    };

    return this.makeRequest('/api/walking/route', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async healthCheck(): Promise<
    ApiResponse<{ status: string; version: string }>
  > {
    return this.makeRequest('/api-health');
  }

  async updateSpeedProfile(params: SpeedProfileUpdateParams, token?: string): Promise<ApiResponse<any>> {
    try {
      // 토큰 가져오기 (파라미터로 전달되지 않으면 AsyncStorage에서)
      const authToken = token || await AsyncStorage.getItem(TOKEN_KEY);
      if (!authToken) {
        throw new Error('인증 토큰이 없습니다');
      }

      console.log('🔐 Using token:', authToken.substring(0, 20) + '...');

      const body = {
        activity_type: params.activity_type,
        avg_speed_flat_kmh: params.avg_speed_flat_kmh,
      };

      // 직접 fetch 사용하여 인증 헤더 포함
      const url = `${apiClient.getBaseUrl()}/api/profile/speed`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 오류: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return {
        status: response.status,
        data,
      };
    } catch (error) {
      console.error('❌ Speed profile update failed:', error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 싱글톤 인스턴스 생성
export const apiService = new ApiService();
export default ApiService;
export type { TransitRouteParams, WalkingRouteParams, SpeedProfileUpdateParams, ApiResponse };
