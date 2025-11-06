// frontend/services/authService.ts
import { apiClient } from '../utils/apiClient';
import { User } from '../contexts/AuthContext';

// API 응답 타입
interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

class AuthService {
  /**
   * 회원가입
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log('📝 [AuthService] 회원가입 요청:', {
        email: data.email,
        username: data.username,
      });

      const response = await apiClient.post<AuthResponse>(
        '/api/auth/register',
        data
      );

      console.log('✅ [AuthService] 회원가입 성공');
      return response;
    } catch (error: any) {
      console.error('❌ [AuthService] 회원가입 실패:', error);

      // 에러 메시지 파싱
      if (error.message.includes('400')) {
        throw new Error('이미 사용 중인 이메일 또는 사용자명입니다');
      }
      throw new Error('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  }

  /**
   * 로그인
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('🔐 [AuthService] 로그인 요청:', { email: data.email });

      const response = await apiClient.post<AuthResponse>(
        '/api/auth/login',
        data
      );

      console.log('✅ [AuthService] 로그인 성공');
      return response;
    } catch (error: any) {
      console.error('❌ [AuthService] 로그인 실패:', error);

      // 에러 메시지 파싱
      if (error.message.includes('401')) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
      }
      throw new Error('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  }

  /**
   * 내 정보 조회
   */
  async getMe(token: string): Promise<User> {
    try {
      console.log('👤 [AuthService] 사용자 정보 조회');

      const response = await fetch(`${apiClient.getBaseUrl()}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const user = (await response.json()) as User;
      console.log('✅ [AuthService] 사용자 정보 조회 성공');
      return user;
    } catch (error) {
      console.error('❌ [AuthService] 사용자 정보 조회 실패:', error);
      throw new Error('사용자 정보를 불러올 수 없습니다');
    }
  }

  /**
   * 이메일 형식 검증
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 비밀번호 강도 검증
   */
  validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return {
        isValid: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다',
      };
    }
    return { isValid: true };
  }

  /**
   * 사용자명 검증
   */
  validateUsername(username: string): { isValid: boolean; message?: string } {
    if (username.length < 3) {
      return {
        isValid: false,
        message: '사용자명은 최소 3자 이상이어야 합니다',
      };
    }
    if (username.length > 50) {
      return { isValid: false, message: '사용자명은 최대 50자까지 가능합니다' };
    }
    return { isValid: true };
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();
