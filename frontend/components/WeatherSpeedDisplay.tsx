/**
 * 날씨 기반 속도 표시 컴포넌트
 * 
 * 현재 날씨를 고려하여 보행속도를 예측하고 표시합니다.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getCurrentWeather } from '../services/weatherService';
import {
    predictWalkingSpeed,
    WeatherSpeedResponse,
    getSpeedChangeDescription,
    formatWeatherWarnings
} from '../services/weatherSpeedService';

interface WeatherSpeedDisplayProps {
    latitude: number;
    longitude: number;
    baseSpeedMps: number;  // 기준 속도 (m/s)
    onSpeedUpdate?: (adjustedSpeed: number) => void;  // 조정된 속도 콜백
}

export const WeatherSpeedDisplay: React.FC<WeatherSpeedDisplayProps> = ({
    latitude,
    longitude,
    baseSpeedMps,
    onSpeedUpdate
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [speedData, setSpeedData] = useState<WeatherSpeedResponse | null>(null);
    const [weatherInfo, setWeatherInfo] = useState<{ temp: number; code: number } | null>(null);

    useEffect(() => {
        loadWeatherAndPredictSpeed();
    }, [latitude, longitude, baseSpeedMps]);

    const loadWeatherAndPredictSpeed = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🌤️ [날씨 속도 표시] 데이터 로딩 시작...');

            // 1. 날씨 데이터 가져오기
            const weather = await getCurrentWeather(latitude, longitude);

            if (!weather?.current) {
                throw new Error('날씨 데이터를 가져올 수 없습니다.');
            }

            console.log('📍 [날씨 속도 표시] 날씨 데이터:', {
                기온: weather.current.temperature_2m,
                날씨코드: weather.current.weather_code
            });

            setWeatherInfo({
                temp: weather.current.temperature_2m,
                code: weather.current.weather_code
            });

            // 2. 속도 예측
            const prediction = await predictWalkingSpeed(
                baseSpeedMps,
                weather.current,
                false  // 스무딩 비활성화 (단일 예측)
            );

            setSpeedData(prediction);

            console.log('🚶 [날씨 속도 표시] 속도 예측 완료:', {
                원본속도_kmh: (baseSpeedMps * 3.6).toFixed(2),
                예측속도_kmh: prediction.speed_kmh.toFixed(2),
                날씨계수: prediction.weather_coeff.toFixed(3)
            });

            // 3. 조정된 속도를 부모 컴포넌트에 전달
            if (onSpeedUpdate) {
                onSpeedUpdate(prediction.speed_mps);
            }

        } catch (err) {
            console.error('❌ [날씨 속도 표시] 오류:', err);
            setError(err instanceof Error ? err.message : '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>날씨 기반 속도 계산 중...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
                <Text style={styles.fallbackText}>
                    기본 속도: {(baseSpeedMps * 3.6).toFixed(1)} km/h
                </Text>
            </View>
        );
    }

    if (!speedData || !weatherInfo) {
        return null;
    }

    const changeColor = speedData.percent_change >= 0 ? '#4CAF50' : '#FF9800';
    const warningText = formatWeatherWarnings(speedData.warnings);

    return (
        <View style={styles.container}>
            {/* 기본 정보 */}
            <View style={styles.row}>
                <Text style={styles.label}>현재 날씨:</Text>
                <Text style={styles.value}>{weatherInfo.temp}°C</Text>
            </View>

            {/* 속도 정보 */}
            <View style={styles.row}>
                <Text style={styles.label}>예상 속도:</Text>
                <Text style={styles.speedValue}>
                    {speedData.speed_kmh.toFixed(1)} km/h
                </Text>
            </View>

            {/* 변화율 */}
            <View style={styles.row}>
                <Text style={styles.label}>속도 변화:</Text>
                <Text style={[styles.changeValue, { color: changeColor }]}>
                    {speedData.percent_change >= 0 ? '+' : ''}
                    {speedData.percent_change.toFixed(1)}%
                </Text>
            </View>

            {/* 설명 */}
            <Text style={styles.description}>
                {getSpeedChangeDescription(speedData.percent_change)}
            </Text>

            {/* 날씨 계수 (디버그 정보) */}
            {__DEV__ && (
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        계수: {speedData.weather_coeff.toFixed(3)} =
                        보폭({speedData.stride_factor.toFixed(3)}) ×
                        보행수({speedData.cadence_factor.toFixed(3)})
                    </Text>
                </View>
            )}

            {/* 경고 메시지 */}
            {warningText && (
                <View style={styles.warningBox}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningText}>{warningText}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        marginVertical: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    value: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    speedValue: {
        fontSize: 18,
        color: '#007AFF',
        fontWeight: 'bold',
    },
    changeValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    description: {
        marginTop: 8,
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: 13,
        color: '#666',
    },
    errorText: {
        fontSize: 13,
        color: '#F44336',
        marginBottom: 4,
    },
    fallbackText: {
        fontSize: 13,
        color: '#666',
    },
    debugInfo: {
        marginTop: 12,
        padding: 8,
        backgroundColor: '#E8F5E9',
        borderRadius: 6,
    },
    debugText: {
        fontSize: 11,
        color: '#2E7D32',
        fontFamily: 'monospace',
    },
    warningBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    warningIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#E65100',
        fontWeight: '500',
    },
});

export default WeatherSpeedDisplay;
