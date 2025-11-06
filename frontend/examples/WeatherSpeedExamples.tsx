/**
 * 날씨 기반 속도 예측 사용 가이드
 *
 * 이 파일은 weather_helpers.py 모델을 프론트엔드에서
 * 활용하는 방법을 설명합니다.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { getCurrentWeather } from '../services/weatherService';
import {
  predictWalkingSpeed,
  calculateWeatherETA,
  resetSpeedSmoothing,
  applyWeatherToSegments,
  getModelInfo,
} from '../services/weatherSpeedService';
import WeatherSpeedDisplay from '../components/WeatherSpeedDisplay';

/**
 * 예제 1: 현재 위치의 날씨 기반 속도 표시
 */
export const Example1_BasicSpeedDisplay = () => {
  const [location, setLocation] = useState({
    latitude: 37.5665,
    longitude: 126.978,
  });
  const baseSpeed = 1.4; // m/s (평균 보행속도)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>예제 1: 기본 속도 표시</Text>
      <WeatherSpeedDisplay
        latitude={location.latitude}
        longitude={location.longitude}
        baseSpeedMps={baseSpeed}
        onSpeedUpdate={adjustedSpeed => {
          console.log('조정된 속도:', adjustedSpeed, 'm/s');
        }}
      />
    </View>
  );
};

/**
 * 예제 2: 경로 ETA 계산 (날씨 고려)
 */
export const Example2_RouteETA = () => {
  const [eta, setEta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateETA = async () => {
    setLoading(true);
    try {
      // 1. 현재 날씨 가져오기
      const weather = await getCurrentWeather(37.5665, 126.978);

      // 2. ETA 계산 (거리 1000m, 기준속도 1.4m/s)
      const result = await calculateWeatherETA(
        1000, // 거리 (m)
        1.4, // 기준 속도 (m/s)
        weather.current
      );

      setEta(result);
      console.log('📍 ETA 계산 결과:', result);
    } catch (error) {
      console.error('ETA 계산 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>예제 2: 경로 ETA 계산</Text>

      <Button title="ETA 계산" onPress={calculateETA} disabled={loading} />

      {eta && (
        <View style={styles.resultBox}>
          <Text>예상 시간: {eta.eta_minutes.toFixed(1)}분</Text>
          <Text>날씨 계수: {eta.weather_coeff.toFixed(3)}</Text>
          <Text>시간 차이: {eta.time_difference_seconds.toFixed(0)}초</Text>
          {eta.warnings.length > 0 && (
            <Text style={styles.warning}>⚠️ {eta.warnings.join(', ')}</Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * 예제 3: 경로 구간별 날씨 영향 적용
 */
export const Example3_RouteSegments = () => {
  const [adjustedSegments, setAdjustedSegments] = useState<any[]>([]);

  const applyWeatherToRoute = async () => {
    try {
      // Tmap 경로 데이터 예시
      const routeSegments = [
        { distance: 300, time: 214 }, // 300m, 214초
        { distance: 500, time: 357 }, // 500m, 357초
        { distance: 200, time: 143 }, // 200m, 143초
      ];

      // 현재 날씨 가져오기
      const weather = await getCurrentWeather(37.5665, 126.978);

      // 각 구간에 날씨 영향 적용
      const adjusted = await applyWeatherToSegments(
        routeSegments,
        weather.current,
        1.4 // 기준 속도 (m/s)
      );

      setAdjustedSegments(adjusted);
      console.log('📊 조정된 구간:', adjusted);
    } catch (error) {
      console.error('구간 조정 실패:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>예제 3: 구간별 날씨 영향</Text>

      <Button title="경로 분석" onPress={applyWeatherToRoute} />

      <ScrollView style={styles.segmentList}>
        {adjustedSegments.map((seg, idx) => (
          <View key={idx} style={styles.segmentItem}>
            <Text>
              구간 {idx + 1}: {seg.distance}m
            </Text>
            <Text>원본 시간: {seg.originalTime}초</Text>
            <Text>조정 시간: {seg.adjustedTime.toFixed(0)}초</Text>
            <Text>날씨 계수: {seg.weatherCoeff.toFixed(3)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * 예제 4: 실시간 경로 안내 (스무딩 적용)
 */
export const Example4_LiveNavigation = () => {
  const [currentSpeed, setCurrentSpeed] = useState<number>(1.4);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    let interval: any;

    if (isNavigating) {
      // 5초마다 속도 업데이트 (스무딩 적용)
      interval = setInterval(async () => {
        try {
          const weather = await getCurrentWeather(37.5665, 126.978);

          const prediction = await predictWalkingSpeed(
            1.4, // 기준 속도
            weather.current,
            true // 스무딩 활성화 (부드러운 전환)
          );

          setCurrentSpeed(prediction.speed_mps);
          console.log(
            '🔄 속도 업데이트:',
            prediction.speed_kmh.toFixed(2),
            'km/h'
          );
        } catch (error) {
          console.error('속도 업데이트 실패:', error);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isNavigating]);

  const startNavigation = async () => {
    await resetSpeedSmoothing(); // 스무딩 초기화
    setIsNavigating(true);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>예제 4: 실시간 경로 안내</Text>

      <View style={styles.buttonRow}>
        <Button
          title="안내 시작"
          onPress={startNavigation}
          disabled={isNavigating}
        />
        <Button
          title="안내 중지"
          onPress={stopNavigation}
          disabled={!isNavigating}
        />
      </View>

      <View style={styles.speedDisplay}>
        <Text style={styles.speedLabel}>현재 예상 속도</Text>
        <Text style={styles.speedValue}>
          {(currentSpeed * 3.6).toFixed(1)} km/h
        </Text>
        <Text style={styles.speedSubtext}>
          {isNavigating ? '실시간 업데이트 중...' : '대기 중'}
        </Text>
      </View>
    </View>
  );
};

/**
 * 예제 5: 모델 정보 조회
 */
export const Example5_ModelInfo = () => {
  const [modelInfo, setModelInfo] = useState<any>(null);

  const loadModelInfo = async () => {
    const info = await getModelInfo();
    setModelInfo(info);
    console.log('📋 모델 정보:', info);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>예제 5: 모델 정보</Text>

      <Button title="모델 정보 조회" onPress={loadModelInfo} />

      {modelInfo && (
        <ScrollView style={styles.infoBox}>
          <Text style={styles.infoTitle}>모델: {modelInfo.model}</Text>
          <Text>버전: {modelInfo.version}</Text>
          <Text>
            클램프 범위: {modelInfo.clip_range.min} ~ {modelInfo.clip_range.max}
          </Text>
          <Text>스무딩 알파: {modelInfo.smoothing.alpha}</Text>

          <Text style={styles.infoTitle}>기능:</Text>
          {modelInfo.features?.map((feat: string, idx: number) => (
            <Text key={idx}>• {feat}</Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

/**
 * 통합 예제 - 모든 기능 한 화면에
 */
export const WeatherSpeedExamplesScreen = () => {
  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.screenTitle}>날씨 기반 속도 예측 예제</Text>

      <Example1_BasicSpeedDisplay />
      <Example2_RouteETA />
      <Example3_RouteSegments />
      <Example4_LiveNavigation />
      <Example5_ModelInfo />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 이 예제들은 backend/app/utils/weather_helpers.py의
          WeatherSpeedModel을 활용합니다.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#007AFF',
    color: 'white',
  },
  container: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  resultBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  warning: {
    marginTop: 8,
    color: '#F57C00',
    fontWeight: '500',
  },
  segmentList: {
    marginTop: 12,
    maxHeight: 200,
  },
  segmentItem: {
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  speedDisplay: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  speedLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  speedValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  speedSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    maxHeight: 250,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#007AFF',
  },
  footer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#E65100',
    textAlign: 'center',
  },
});

export default WeatherSpeedExamplesScreen;
