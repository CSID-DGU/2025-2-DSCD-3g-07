import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useHealthCheck, useTransitRoute } from '../hooks/api/useApi';
import RouteDetailComponent from './RouteDetailComponent';
import Config from '../config';
import { analyzeRouteSlope } from '../services/elevationService';
import { RouteElevationAnalysis } from '../types/api';

const ApiTestComponent: React.FC = () => {
  const { data: healthData, loading: healthLoading, error: healthError, checkHealth } = useHealthCheck();
  const { data: routeData, loading: routeLoading, error: routeError, getRoute } = useTransitRoute();
  const [slopeAnalysis, setSlopeAnalysis] = useState<RouteElevationAnalysis | null>(null);
  const [slopeLoading, setSlopeLoading] = useState(false);

  // routeData가 업데이트되면 경사도 분석 수행
  useEffect(() => {
    const analyzeSlopeData = async () => {
      if (routeData && !routeError && routeData.metaData?.plan?.itineraries?.[0]) {
        const itineraries = routeData.metaData.plan.itineraries;
        console.log(`📊 받은 경로 개수: ${itineraries.length}개`);
        console.log('📊 Auto-analyzing slope for route data...');
        setSlopeLoading(true);
        try {
          const itinerary = itineraries[0]; // 첫 번째 경로만 분석
          if (itinerary) {
            const analysis = await analyzeRouteSlope(itinerary);
            setSlopeAnalysis(analysis);
            console.log('✅ Slope analysis complete:', analysis);
          }
        } catch (error) {
          console.error('❌ Slope analysis failed:', error);
          setSlopeAnalysis(null);
        } finally {
          setSlopeLoading(false);
        }
      }
    };

    analyzeSlopeData();
  }, [routeData, routeError]);

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
            {slopeLoading && (
              <Text style={styles.infoText}>
                📊 경사도 분석 중...
              </Text>
            )}
            {slopeAnalysis && !slopeAnalysis.error && (
              <Text style={styles.successText}>
                ✅ 경사도 분석 완료! (보정 시간: {slopeAnalysis.total_route_time_adjustment > 0 ? '+' : ''}{Math.round(slopeAnalysis.total_route_time_adjustment / 60)}분)
              </Text>
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
});

export default ApiTestComponent;