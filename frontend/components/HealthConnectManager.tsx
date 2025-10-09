import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Button, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity 
} from 'react-native';
import { samsungHealthService, SamsungHealthData, ConnectionStatus } from '../services/samsungHealth';

const HealthConnectManager: React.FC = () => {
  const [healthData, setHealthData] = useState<SamsungHealthData>({
    available: false,
    source: 'Not Available'
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    availableData: [],
    connectionDetails: {
      samsungHealthInstalled: false,
      healthConnectAvailable: false,
      permissionsGranted: false,
      dataAccessible: false,
      recommendedActions: []
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeSamsungHealth();
  }, []);

  const initializeSamsungHealth = async () => {
    setIsLoading(true);
    try {
      await checkConnectionStatus();
      setIsInitialized(true);
    } catch (error) {
      console.error('Samsung Health 초기화 실패:', error);
      Alert.alert('오류', 'Samsung Health 초기화에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      console.log('🔍 Checking Samsung Health connection status...');
      const status = await samsungHealthService.getConnectionStatus();
      setConnectionStatus(status);
      console.log('Samsung Health 연결 상태:', status);
    } catch (error) {
      console.error('연결 상태 확인 실패:', error);
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      const result = await samsungHealthService.requestHealthPermissions();
      if (result.allPermissionsGranted) {
        Alert.alert('성공', '모든 권한이 허용되었습니다.');
        await checkConnectionStatus();
      } else {
        Alert.alert('권한 필요', `${result.grantedPermissions}/${result.totalPermissions} 권한이 허용되었습니다.`);
      }
    } catch (error) {
      console.error('권한 요청 실패:', error);
      Alert.alert('오류', '권한 요청에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const openSamsungHealth = async () => {
    setIsLoading(true);
    try {
      const result = await samsungHealthService.openSamsungHealth();
      Alert.alert(
        result.success ? '성공' : '알림',
        result.message
      );
    } catch (error) {
      console.error('Samsung Health 열기 실패:', error);
      Alert.alert('오류', 'Samsung Health를 열 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkHealthConnectAvailability = async () => {
    setIsLoading(true);
    try {
      const availability = await samsungHealthService.checkHealthConnectAvailability();
      Alert.alert(
        'Health Connect 상태',
        `사용 가능: ${availability.available ? '예' : '아니오'}\n상태: ${availability.status}\n메시지: ${availability.message}`
      );
    } catch (error) {
      console.error('Health Connect 가용성 확인 실패:', error);
      Alert.alert('오류', 'Health Connect 상태를 확인할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const openHealthConnectSettings = async () => {
    setIsLoading(true);
    try {
      const result = await samsungHealthService.openHealthConnectSettings();
      Alert.alert(
        result.success ? '성공' : '알림',
        result.message
      );
    } catch (error) {
      console.error('Health Connect 설정 열기 실패:', error);
      Alert.alert('오류', 'Health Connect 설정을 열 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const testBackendConnection = async () => {
    setIsLoading(true);
    try {
      // 백엔드 연결 테스트
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://192.168.45.161:8000/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('백엔드 연결 성공', `서버 상태: ${JSON.stringify(data, null, 2)}`);
      } else {
        Alert.alert('백엔드 연결 실패', `HTTP 상태: ${response.status}`);
      }
    } catch (error) {
      console.error('백엔드 연결 테스트 실패:', error);
      Alert.alert('백엔드 연결 오류', `오류: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSamsungHealthInstallation = async () => {
    setIsLoading(true);
    try {
      const installed = await samsungHealthService.isSamsungHealthInstalled();
      Alert.alert(
        'Samsung Health 설치 상태',
        installed ? 'Samsung Health가 설치되어 있습니다.' : 'Samsung Health가 설치되어 있지 않습니다.'
      );
    } catch (error) {
      console.error('Samsung Health 설치 상태 확인 실패:', error);
      Alert.alert('오류', 'Samsung Health 설치 상태를 확인할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTodaysSummary = async () => {
    setIsLoading(true);
    try {
      const summary = await samsungHealthService.getTodaysSummary();
      if (summary) {
        Alert.alert(
          '오늘의 건강 데이터',
          `걸음 수: ${summary.steps}\n거리: ${(summary.distance / 1000).toFixed(2)}km\n칼로리: ${summary.calories.toFixed(0)}kcal\n날짜: ${summary.date}`
        );
      } else {
        Alert.alert('알림', '건강 데이터를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('건강 데이터 조회 실패:', error);
      Alert.alert('오류', '건강 데이터 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const syncHealthData = async () => {
    setIsLoading(true);
    try {
      const result = await samsungHealthService.syncHealthData();
      if (result.success && result.data) {
        setHealthData(result.data);
        Alert.alert('성공', '건강 데이터가 동기화되었습니다.');
      } else {
        Alert.alert('실패', result.message || '건강 데이터 동기화에 실패했습니다.');
      }
      await checkConnectionStatus();
    } catch (error) {
      console.error('건강 데이터 동기화 실패:', error);
      Alert.alert('오류', '건강 데이터 동기화에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDetailedHealthData = async () => {
    setIsLoading(true);
    try {
      const data = await samsungHealthService.getAllHealthData();
      setHealthData(data);
      
      if (data.available) {
        Alert.alert(
          '상세 건강 데이터',
          `소스: ${data.source}\n걸음 수: ${data.steps || 0}\n거리: ${((data.distance || 0) / 1000).toFixed(2)}km\n칼로리: ${(data.calories || 0).toFixed(0)}kcal\n운동 세션: ${data.exerciseSessions?.length || 0}개`
        );
      } else {
        Alert.alert('알림', '건강 데이터를 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('상세 건강 데이터 조회 실패:', error);
      Alert.alert('오류', '상세 건강 데이터 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderConnectionDetails = () => {
    const { connectionDetails } = connectionStatus;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔗 연결 상태</Text>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>전체 연결 상태:</Text>
          <Text style={[styles.statusValue, { color: connectionStatus.isConnected ? '#4CAF50' : '#F44336' }]}>
            {connectionStatus.isConnected ? '✅ 연결됨' : '❌ 연결 안됨'}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Samsung Health 설치:</Text>
          <Text style={[styles.statusValue, { color: connectionDetails.samsungHealthInstalled ? '#4CAF50' : '#F44336' }]}>
            {connectionDetails.samsungHealthInstalled ? '✅ 설치됨' : '❌ 미설치'}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Health Connect 사용 가능:</Text>
          <Text style={[styles.statusValue, { color: connectionDetails.healthConnectAvailable ? '#4CAF50' : '#F44336' }]}>
            {connectionDetails.healthConnectAvailable ? '✅ 사용 가능' : '❌ 사용 불가'}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>권한 허용:</Text>
          <Text style={[styles.statusValue, { color: connectionDetails.permissionsGranted ? '#4CAF50' : '#F44336' }]}>
            {connectionDetails.permissionsGranted ? '✅ 허용됨' : '❌ 미허용'}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>데이터 접근 가능:</Text>
          <Text style={[styles.statusValue, { color: connectionDetails.dataAccessible ? '#4CAF50' : '#F44336' }]}>
            {connectionDetails.dataAccessible ? '✅ 가능' : '❌ 불가능'}
          </Text>
        </View>

        {connectionDetails.recommendedActions.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>📋 권장 작업:</Text>
            {connectionDetails.recommendedActions.map((action, index) => (
              <Text key={index} style={styles.recommendationItem}>• {action}</Text>
            ))}
          </View>
        )}

        {connectionStatus.availableData.length > 0 && (
          <View style={styles.availableDataContainer}>
            <Text style={styles.availableDataTitle}>📊 사용 가능한 데이터:</Text>
            {connectionStatus.availableData.map((dataType, index) => (
              <Text key={index} style={styles.availableDataItem}>• {dataType}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderHealthData = () => {
    if (!healthData.available) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 건강 데이터</Text>
          <Text style={styles.noDataText}>사용 가능한 데이터가 없습니다.</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 건강 데이터</Text>
        
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>데이터 소스:</Text>
          <Text style={styles.dataValue}>{healthData.source}</Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>걸음 수:</Text>
          <Text style={styles.dataValue}>{healthData.steps?.toLocaleString() || '0'} 걸음</Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>거리:</Text>
          <Text style={styles.dataValue}>{((healthData.distance || 0) / 1000).toFixed(2)} km</Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>칼로리:</Text>
          <Text style={styles.dataValue}>{(healthData.calories || 0).toFixed(0)} kcal</Text>
        </View>

        {healthData.exerciseSessions && healthData.exerciseSessions.length > 0 && (
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>운동 세션:</Text>
            <Text style={styles.dataValue}>{healthData.exerciseSessions.length}개</Text>
          </View>
        )}

        {healthData.lastUpdated && (
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>마지막 업데이트:</Text>
            <Text style={styles.dataValue}>{new Date(healthData.lastUpdated).toLocaleString()}</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Samsung Health를 초기화하고 있습니다...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏥 건강 데이터 연동</Text>
        <Text style={styles.subtitle}>Samsung Health 및 Health Connect 관리</Text>
      </View>

      {renderConnectionDetails()}
      {renderHealthData()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 기본 기능</Text>
        
        <TouchableOpacity style={styles.button} onPress={checkConnectionStatus} disabled={isLoading}>
          <Text style={styles.buttonText}>🔄 연결 상태 새로고침</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={requestPermissions} disabled={isLoading}>
          <Text style={styles.buttonText}>🔑 권한 상태 확인</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={openHealthConnectSettings} disabled={isLoading}>
          <Text style={styles.buttonText}>⚙️ Health Connect 설정 열기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={openSamsungHealth} disabled={isLoading}>
          <Text style={styles.buttonText}>📱 Samsung Health 앱 열기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 진단 도구</Text>
        
        <TouchableOpacity style={styles.button} onPress={checkHealthConnectAvailability} disabled={isLoading}>
          <Text style={styles.buttonText}>🏥 Health Connect 사용 가능 여부 확인</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={checkSamsungHealthInstallation} disabled={isLoading}>
          <Text style={styles.buttonText}>📲 Samsung Health 설치 상태 확인</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testBackendConnection} disabled={isLoading}>
          <Text style={styles.buttonText}>🌐 백엔드 서버 연결 테스트</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 데이터 조회</Text>
        
        <TouchableOpacity style={styles.button} onPress={getTodaysSummary} disabled={isLoading}>
          <Text style={styles.buttonText}>📅 오늘의 건강 요약</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={getDetailedHealthData} disabled={isLoading}>
          <Text style={styles.buttonText}>📈 상세 건강 데이터 조회</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={syncHealthData} disabled={isLoading}>
          <Text style={styles.buttonText}>🔄 건강 데이터 동기화</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  recommendationsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 5,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 5,
  },
  recommendationItem: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 10,
    marginBottom: 2,
  },
  availableDataContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#E8F5E8',
    borderRadius: 5,
  },
  availableDataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#388E3C',
    marginBottom: 5,
  },
  availableDataItem: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 10,
    marginBottom: 2,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default HealthConnectManager;