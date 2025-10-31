/**
 * 날씨 전역 관리 Context
 * 앱 시작 시 사용자 위치 기반으로 날씨를 불러와서 전역으로 관리
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { getCurrentWeather } from '../services/weatherService';

interface WeatherData {
    temp_c: number;
    pty: number;
    rain_mm_per_h: number;
    snow_cm_per_h: number;
}

interface WeatherContextType {
    weatherData: WeatherData | null;
    loading: boolean;
    error: string | null;
    refreshWeather: () => Promise<void>;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

// 날씨 코드를 KMA PTY로 변환하는 헬퍼 함수
const mapWeatherCodeToPTY = (weatherCode: number): number => {
    if (weatherCode === 0) return 0; // 맑음
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
        return 1; // 비
    }
    if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
        return 3; // 눈
    }
    if (weatherCode >= 68 && weatherCode <= 69) {
        return 2; // 진눈깨비
    }
    return 0;
};

export function WeatherProvider({ children }: { children: ReactNode }) {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWeather = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🌤️ [날씨 Context] 날씨 데이터 가져오는 중...');

            // 위치 권한 요청
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('위치 권한이 필요합니다.');
            }

            // 현재 위치 가져오기
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // 날씨 데이터 가져오기
            const weather = await getCurrentWeather(
                location.coords.latitude,
                location.coords.longitude
            );

            if (weather?.current) {
                const data: WeatherData = {
                    temp_c: weather.current.temperature_2m,
                    pty: mapWeatherCodeToPTY(weather.current.weather_code),
                    rain_mm_per_h: weather.current.rain || weather.current.precipitation || 0,
                    snow_cm_per_h: 0, // Open-Meteo에서 눈 정보 추가 시 사용
                };

                setWeatherData(data);
                console.log('✅ [날씨 Context] 날씨 데이터 로드 완료:', {
                    온도: `${data.temp_c}°C`,
                    강수형태: data.pty,
                    강수량: `${data.rain_mm_per_h}mm/h`,
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '날씨 데이터 로드 실패';
            setError(errorMessage);
            console.warn('⚠️ [날씨 Context] 날씨 데이터 로드 실패:', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 앱 시작 시 날씨 로드
    useEffect(() => {
        fetchWeather();
    }, []);

    return (
        <WeatherContext.Provider
            value={{
                weatherData,
                loading,
                error,
                refreshWeather: fetchWeather,
            }}
        >
            {children}
        </WeatherContext.Provider>
    );
}

export function useWeatherContext() {
    const context = useContext(WeatherContext);
    if (context === undefined) {
        throw new Error('useWeatherContext must be used within a WeatherProvider');
    }
    return context;
}
