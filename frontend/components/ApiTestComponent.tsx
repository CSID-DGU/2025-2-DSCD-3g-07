import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useHealthCheck, useTransitRoute } from '../hooks/api/useApi';
import RouteDetailComponent from './RouteDetailComponent';
import Config from '../config';
import { analyzeRouteSlope } from '../services/elevationService';
import { RouteElevationAnalysis } from '../types/api';
import { healthConnectService } from '../services/healthConnect';
import { getCurrentWeather } from '../services/weatherService';

const ApiTestComponent: React.FC = () => {
  const { data: healthData, loading: healthLoading, error: healthError, checkHealth } = useHealthCheck();
  const { data: routeData, loading: routeLoading, error: routeError, getRoute } = useTransitRoute();
  const [slopeAnalysis, setSlopeAnalysis] = useState<RouteElevationAnalysis | null>(null);
  const [slopeLoading, setSlopeLoading] = useState(false);
  const [walkingSpeedCase1, setWalkingSpeedCase1] = useState<number | null>(null);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

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

          // 날씨 데이터 가져오기 (경로 시작점 좌표 사용)
          let weatherData = null;
          if (itinerary && itinerary.legs && itinerary.legs.length > 0) {
            const firstLeg = itinerary.legs[0];
            const startCoords = firstLeg?.start;

            if (startCoords) {
              setWeatherLoading(true);
              try {
                console.log('🌤️ 날씨 데이터 가져오는 중...', {
                  lat: startCoords.lat,
                  lon: startCoords.lon
                });

                const weather = await getCurrentWeather(startCoords.lat, startCoords.lon);

                if (weather?.current) {
                  // KMA 데이터 형식으로 변환
                  weatherData = {
                    temp_c: weather.current.temperature_2m,
                    pty: mapWeatherCodeToPTY(weather.current.weather_code),
                    rain_mm_per_h: weather.current.rain || weather.current.precipitation || 0,
                    snow_cm_per_h: 0  // KMA 데이터에서 눈 정보가 있으면 추가
                  };

                  setCurrentWeather(weather.current);
                  console.log('✅ 날씨 데이터 획득:', weatherData);
                }
              } catch (weatherError) {
                console.warn('⚠️ 날씨 데이터 로드 실패:', weatherError);
              } finally {
                setWeatherLoading(false);
              }
            }
          }

          // Health Connect Case 1 속도와 날씨 데이터를 함께 전달
          if (itinerary) {
            const analysis = await analyzeRouteSlope(
              itinerary,
              undefined, // apiKey
              walkingSpeedCase1 || undefined, // walking speed (m/s)
              weatherData || undefined // 날씨 데이터 추가 (null이 아닌 undefined로)
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

  const testHealthCheck = async () => {
    console.log('🔍 Testing Health Check...');
    await checkHealth();
  };

  const testTransitRoute = async () => {
    console.log('🔍 Testing Transit Route...');
    setSlopeAnalysis(null); // 이전 결과 초기화

    // 동국대 -> 창동축구장 테스트 좌표
    await getRoute({
      start_x: 127.00020089028668,
      start_y: 37.55826891774226,
      end_x: 127.04098866446125,
      end_y: 37.648520753827064,
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
            {routeLoading ? '⏳ 검색 중...' : slopeLoading ? ' 경사도 분석 중...' : '🗺️ 경로 검색 (동국대 본관→창동축구장)'}
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
            {currentWeather && (
              <Text style={styles.infoText}>
                🌤️ 날씨: {currentWeather.temperature_2m}°C (코드: {currentWeather.weather_code})
              </Text>
            )}
            {slopeLoading && (
              <Text style={styles.infoText}>
                📊 경사도 분석 중{weatherLoading ? ' (날씨 포함)' : ''}...
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