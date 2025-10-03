import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useHealthCheck, useTransitRoute } from '../hooks/api/useApi';
import Config from '../config';

const ApiTestComponent: React.FC = () => {
  const { data: healthData, loading: healthLoading, error: healthError, checkHealth } = useHealthCheck();
  const { data: routeData, loading: routeLoading, error: routeError, getRoute } = useTransitRoute();

  const testHealthCheck = async () => {
    console.log('🔍 Testing Health Check...');
    await checkHealth();
  };

  const testTransitRoute = async () => {
    console.log('🔍 Testing Transit Route...');
    // 서울역 -> 강남역 테스트 좌표
    await getRoute({
      start_x: 126.9706,
      start_y: 37.5547,
      end_x: 127.0276,
      end_y: 37.4979,
      user_age: 25,
      fatigue_level: 2,
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
          style={[styles.button, routeLoading && styles.buttonDisabled]}
          onPress={testTransitRoute}
          disabled={routeLoading}
        >
          <Text style={styles.buttonText}>
            {routeLoading ? '⏳ 검색 중...' : '🗺️ 경로 검색 (서울역→강남역)'}
          </Text>
        </TouchableOpacity>

        {routeData && (
          <Text style={styles.successText}>
            ✅ 경로 검색 성공! 총 시간: {routeData.total_time_minutes?.toFixed(1)}분
          </Text>
        )}

        {routeError && (
          <Text style={styles.errorText}>❌ 오류: {routeError}</Text>
        )}
      </View>
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
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
  },
});

export default ApiTestComponent;