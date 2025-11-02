import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useHealthCheck, useTransitRoute } from '../hooks/api/useApi';
import RouteDetailComponent from './RouteDetailComponent';
import Config from '../config';
import { analyzeRouteSlope } from '../services/elevationService';
import { RouteElevationAnalysis } from '../types/api';
import { healthConnectService } from '../services/healthConnect';
import { useWeatherContext } from '../contexts/WeatherContext';

const ApiTestComponent: React.FC = () => {
  const { data: healthData, loading: healthLoading, error: healthError, checkHealth } = useHealthCheck();
  const { data: routeData, loading: routeLoading, error: routeError, getRoute } = useTransitRoute();
  const [slopeAnalysis, setSlopeAnalysis] = useState<RouteElevationAnalysis | null>(null);
  const [slopeLoading, setSlopeLoading] = useState(false);
  const [walkingSpeedCase1, setWalkingSpeedCase1] = useState<number | null>(null);

  // 날씨 Context 사용
  const { weatherData } = useWeatherContext();

  // 컴포넌트 마운트 시 Health Connect에서 Case 1 평균 속도 가져오기
  useEffect(() => {
    const fetchWalkingSpeed = async () => {
      try {
        // 전체 기간 평균 속도 사용 (더 안정적)
        const allTimeSpeed = await healthConnectService.getAllTimeAverageSpeeds();
        if (allTimeSpeed.speedCase1 && allTimeSpeed.speedCase1 > 0) {
          // km/h를 m/s로 변환
          const speedMs = allTimeSpeed.speedCase1 / 3.6;
          setWalkingSpeedCase1(speedMs);
          console.log(`✅ 보행 속도: ${allTimeSpeed.speedCase1.toFixed(2)} km/h`);
        }
      } catch (error) {
        console.warn('⚠️ 속도 데이터 로드 실패:', error);
      }
    };

    fetchWalkingSpeed();
  }, []);

  // routeData가 업데이트되면 경사도 분석 수행
  useEffect(() => {
    const analyzeSlopeData = async () => {
      if (routeData && !routeError && routeData.metaData?.plan?.itineraries?.[0]) {
        const itineraries = routeData.metaData.plan.itineraries;
        console.log(`📊 경로 분석 중... (${itineraries.length}개 경로)`);
        setSlopeLoading(true);

        try {
          const itinerary = itineraries[0]; // 첫 번째 경로만 분석

          // Health Connect Case 1 속도와 날씨 Context 데이터를 함께 전달
          if (itinerary) {
            console.log('🌤️ 날씨 데이터 사용:', weatherData);

            const analysis = await analyzeRouteSlope(
              itinerary,
              undefined, // apiKey
              walkingSpeedCase1 || undefined, // walking speed (m/s)
              weatherData || undefined // 날씨 데이터 (Context에서 가져옴)
            );

            setSlopeAnalysis(analysis);

            const logParts = ['✅ 경사도 분석 완료'];
            if (walkingSpeedCase1) {
              logParts.push(`보행속도: ${(walkingSpeedCase1 * 3.6).toFixed(2)} km/h`);
            }
            if (weatherData) {
              logParts.push(`날씨: ${weatherData.temp_c}°C`);
            }
            if (analysis.factors) {
              logParts.push(`계수: ${analysis.factors.final_factor.toFixed(3)}`);
            }
            console.log(logParts.join(', '));
          }
        } catch (error) {
          console.error('❌ 경사도 분석 실패:', error);
          setSlopeAnalysis(null);
        } finally {
          setSlopeLoading(false);
        }
      }
    };

    analyzeSlopeData();
  }, [routeData, routeError, walkingSpeedCase1]);

  const testHealthCheck = async () => {
    console.log('🔍 Testing Health Check...');
    await checkHealth();
  };

  const testTransitRoute = async () => {
    console.log('🔍 Testing Transit Route...');
    setSlopeAnalysis(null); // 이전 결과 초기화

    // 망원시장 -> 동대입구역 테스트 좌표
    await getRoute({
      start_x: 126.90626362296295,
      start_y: 37.555889116421376,
      end_x: 127.00531091525905,
      end_y: 37.559045908511976,
    });
  };

  const showApiInfo = () => {
    Alert.alert(
      'API 설정 정보',
      `Base URL: ${Config.API_BASE_URL}\nEnvironment: ${Config.ENVIRONMENT}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 API 테스트</Text>

      <TouchableOpacity style={styles.button} onPress={showApiInfo}>
        <Text style={styles.buttonText}>📋 API 설정 확인</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Check</Text>
        <TouchableOpacity
          style={[styles.button, healthLoading && styles.buttonDisabled]}
          onPress={testHealthCheck}
          disabled={healthLoading}
        >
          <Text style={styles.buttonText}>
            {healthLoading ? '⏳  확인 중...' : '❤️ Health Check'}
          </Text>
        </TouchableOpacity>

        {healthData && (
          <Text style={styles.successText}>
            ✅ 서버 상태: {healthData.status} (v{healthData.version})
          </Text>
        )}

        {healthError && (
          <Text style={styles.errorText}>❌ 오류: {healthError}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>경로 검색 테스트</Text>
        <TouchableOpacity
          style={[styles.button, (routeLoading || slopeLoading) && styles.buttonDisabled]}
          onPress={testTransitRoute}
          disabled={routeLoading || slopeLoading}
        >
          <Text style={styles.buttonText}>
            {routeLoading ? '⏳ 검색 중...' : slopeLoading ? '📊 경사도 분석 중...' : '🗺️ 경로 검색 (망원시장→동대입구역)'}
          </Text>
        </TouchableOpacity>

        {routeData && (
          <View>
            <Text style={styles.successText}>
              ✅ 경로 검색 성공!
            </Text>
            {routeData.metaData?.plan?.itineraries?.[0] && (
              <Text style={styles.successText}>
                총 시간: {Math.round(routeData.metaData.plan.itineraries[0].totalTime / 60)}분
              </Text>
            )}
            {walkingSpeedCase1 && (
              <Text style={styles.infoText}>
                🚶 사용된 보행 속도: {(walkingSpeedCase1 * 3.6).toFixed(2)} km/h (Case 1)
              </Text>
            )}
            {weatherData && (
              <Text style={styles.infoText}>
                🌤️ 날씨: {weatherData.temp_c}°C (PTY: {weatherData.pty})
              </Text>
            )}
            {slopeLoading && (
              <Text style={styles.infoText}>
                📊 경사도 분석 중 (날씨 포함)...
              </Text>
            )}
            {slopeAnalysis && !slopeAnalysis.error && (
              <View>
                <Text style={styles.successText}>
                  ✅ 경사도 분석 완료! (보정 시간: {slopeAnalysis.total_route_time_adjustment > 0 ? '+' : ''}{Math.round(slopeAnalysis.total_route_time_adjustment / 60)}분)
                </Text>
                {slopeAnalysis.factors ? (
                  <View style={[styles.factorsBox, { marginTop: 8 }]}>
                    <Text style={styles.factorsTitle}>📊 보행속도 보정 계수</Text>
                    <Text style={styles.factorsDetail}>
                      사용자({slopeAnalysis.factors.user_speed_factor.toFixed(3)}) ×
                      경사도({slopeAnalysis.factors.slope_factor.toFixed(3)}) ×
                      날씨({slopeAnalysis.factors.weather_factor.toFixed(3)})
                    </Text>
                    <Text style={styles.factorsFinal}>
                      = {slopeAnalysis.factors.final_factor.toFixed(3)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.errorText}>
                    ⚠️ 계수 정보 없음 (factors: {JSON.stringify(slopeAnalysis.factors)})
                  </Text>
                )}
              </View>
            )}
            {slopeAnalysis?.error && (
              <Text style={styles.errorText}>
                ⚠️ 경사도 분석 실패: {slopeAnalysis.error}
              </Text>
            )}
          </View>
        )}

        {routeError && (
          <Text style={styles.errorText}>❌ 오류: {routeError}</Text>
        )}
      </View>

      {/* 경로 상세 정보 표시 */}
      {routeData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상세 경로 정보</Text>
          <RouteDetailComponent
            routeData={routeData}
            slopeAnalysis={slopeAnalysis}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2C6DE7',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#2C6DE7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  successText: {
    color: '#28a745',
    fontSize: 12,
    marginTop: 5,
  },
  infoText: {
    color: '#2C6DE7',
    fontSize: 12,
    marginTop: 5,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
  },
  factorsBox: {
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2C6DE7',
  },
  factorsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2C6DE7',
    marginBottom: 6,
  },
  factorsDetail: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  factorsFinal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C6DE7',
    textAlign: 'right',
  },
});

export default ApiTestComponent;