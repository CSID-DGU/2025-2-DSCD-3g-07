// frontend/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 사용자 정보 타입
export interface User {
    user_id: number;
    username: string;
    email: string;
    auth_provider?: string;
    created_at: string;
    last_login?: string;
}

// 인증 컨텍스트 타입
interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    register: (token: string, user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@pacetry_auth_token';
const USER_KEY = '@pacetry_user_data';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 앱 시작 시 저장된 인증 정보 로드
    useEffect(() => {
        loadAuthData();
    }, []);

    const loadAuthData = async () => {
        try {
            const [storedToken, storedUser] = await Promise.all([
                AsyncStorage.getItem(TOKEN_KEY),
                AsyncStorage.getItem(USER_KEY),
            ]);

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                console.log('✅ [Auth] 저장된 인증 정보 로드 성공');
            }
        } catch (error) {
            console.error('❌ [Auth] 인증 정보 로드 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (newToken: string, newUser: User) => {
        try {
            await Promise.all([
                AsyncStorage.setItem(TOKEN_KEY, newToken),
                AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
            ]);

            setToken(newToken);
            setUser(newUser);
            console.log('✅ [Auth] 로그인 성공:', newUser.username);
        } catch (error) {
            console.error('❌ [Auth] 로그인 저장 실패:', error);
            throw error;
        }
    };

    const register = async (newToken: string, newUser: User) => {
        // 회원가입도 로그인과 동일하게 처리
        await login(newToken, newUser);
    };

    const logout = async () => {
        try {
            await Promise.all([
                AsyncStorage.removeItem(TOKEN_KEY),
                AsyncStorage.removeItem(USER_KEY),
            ]);

            setToken(null);
            setUser(null);
            console.log('✅ [Auth] 로그아웃 성공');
        } catch (error) {
            console.error('❌ [Auth] 로그아웃 실패:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        register,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook으로 AuthContext 사용
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
