import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  AppState,
} from 'react-native';
import {
  healthConnectService as healthConnect,
  type HealthData,
  type PermissionStatus,
} from '../services/healthConnect';

const HealthConnectManager: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData>({
    available: false,
    source: 'Not Available',
  });

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    sdkAvailable: false,
    permissionsGranted: false,
    grantedCount: 0,
    totalCount: 0,
  });

  const [allTimeSpeed, setAllTimeSpeed] = useState<{
    speedCase1: number;
    speedCase2: number;
    maxSpeed: number;
    totalRecords: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false); // 앱이 foreground로 돌아올 때마다 권한 확인
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('🔍 Checking permission status...');
        checkPermissionStatus();
      }
    });

    // 초기 권한 확인
    checkPermissionStatus();

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const status = await healthConnect.checkPermissionStatus();
      setPermissionStatus(status);

      // 권한이 있으면 자동으로 데이터 가져오기
      if (status.permissionsGranted) {
        console.log('✅ 권한이 있음 - 자동으로 데이터 가져오기 시작');
        await getTodayHealthData();
      }
    } catch (error) {
      console.error('❌ Error checking permission status:', error);
    }
  };

  const requestPermissions = async () => {
    setLoading(true);
    try {
      console.log('📋 권한 요청 시작...');
      const granted = await healthConnect.requestPermissions();

      if (granted) {
        Alert.alert('성공', 'Health Connect 권한이 부여되었습니다.');
        // 권한 부여 후 즉시 상태 확인
        await checkPermissionStatus();
      } else {
        Alert.alert('실패', 'Health Connect 권한이 거부되었습니다.');
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      Alert.alert('오류', `권한 요청 중 오류가 발생했습니다: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getTodayHealthData = async () => {
    setLoading(true);
    try {
      console.log('📅 오늘의 건강 데이터 가져오기 (자정부터)...');
      const data = await healthConnect.getTodaysSummary(); // 오늘 자정부터 현재까지
      console.log('✅ 데이터 (자정부터):', data);
      setHealthData(data);
    } catch (error) {
      console.error('❌ Error getting health data:', error);
      Alert.alert(
        '오류',
        `건강 데이터를 가져오는 중 오류가 발생했습니다: ${error}`
      );
    } finally {
      setLoading(false);
    }
  };

  const getWeekHealthData = async () => {
    setLoading(true);
    try {
      console.log('📅 주간 건강 데이터 가져오기...');
      const data = await healthConnect.getHealthData(7);
      console.log('✅ 주간 데이터:', data);
      setHealthData(data);
    } catch (error) {
      console.error('❌ Error getting week health data:', error);
      Alert.alert(
        '오류',
        `주간 건강 데이터를 가져오는 중 오류가 발생했습니다: ${error}`
      );
    } finally {
      setLoading(false);
    }
  };

  const getAllTimeAverageSpeed = async () => {
    setLoading(true);
    try {
      console.log('🌐 전체 기간 평균 속도 계산 중...');
      const data = await healthConnect.getAllTimeAverageSpeeds();
      console.log('✅ 전체 기간 속도:', data);

      if (data.error) {
        Alert.alert('오류', data.error);
      } else {
        setAllTimeSpeed(data);
        Alert.alert(
          '✅ 전체 기간 평균 속도',
          `총 ${data.totalRecords}개 기록 분석 완료\n\n` +
            `Case 1 (≥2.5km/h): ${data.speedCase1} km/h\n` +
            `Case 2 (≥1.5km/h): ${data.speedCase2} km/h\n` +
            `최고 속도: ${data.maxSpeed} km/h`
        );
      }
    } catch (error) {
      console.error('❌ Error getting all-time speed:', error);
      Alert.alert(
        '오류',
        `전체 기간 속도 계산 중 오류가 발생했습니다: ${error}`
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPermissionStatus = () => {
    const {
      sdkAvailable,
      sdkStatus,
      permissionsGranted,
      grantedCount,
      totalCount,
    } = permissionStatus;

    return (
      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>📊 권한 상태</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>SDK 사용 가능:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: sdkAvailable ? '#4CAF50' : '#F44336' },
            ]}
          >
            {sdkAvailable ? '✅ 예' : '❌ 아니오'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>SDK 상태:</Text>
          <Text style={styles.statusValue}>{sdkStatus ?? 'Unknown'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>권한 부여됨:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: permissionsGranted ? '#4CAF50' : '#F44336' },
            ]}
          >
            {permissionsGranted ? '✅ 예' : '❌ 아니오'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>부여된 권한:</Text>
          <Text style={styles.statusValue}>
            {grantedCount}/{totalCount}
          </Text>
        </View>
      </View>
    );
  };

  const renderHealthData = () => {
    if (!healthData.available) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            건강 데이터를 사용할 수 없습니다.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.dataContainer}>
        <Text style={styles.sectionTitle}>📊 건강 데이터</Text>
        <Text style={styles.dataSource}>데이터 소스: {healthData.source}</Text>

        <View style={styles.dataGrid}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>👟 걸음 수:</Text>
            <Text style={styles.dataValue}>
              {healthData.steps?.toLocaleString() || 0} 걸음
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>📏 거리:</Text>
            <Text style={styles.dataValue}>
              {Math.round(((healthData.distance || 0) / 1000) * 100) / 100} km
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>🚀 평균 속도 (길찾기 전용):</Text>
            <Text style={styles.dataValue}>
              {healthData.speedCase1 && healthData.speedCase1 > 0
                ? `${healthData.speedCase1} km/h`
                : '데이터 없음'}
            </Text>
          </View>

          <View style={styles.descRow}>
            <Text style={styles.descText}>
              ≥ 2.5 km/h (실제 이동 목적의 보행)
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>🚶‍♂️ 평균 속도 (산책 전용):</Text>
            <Text style={styles.dataValue}>
              {healthData.speedCase2 && healthData.speedCase2 > 0
                ? `${healthData.speedCase2} km/h`
                : '데이터 없음'}
            </Text>
          </View>

          <View style={styles.descRow}>
            <Text style={styles.descText}>≥ 1.5 km/h (느린 산책 포함)</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>⚡ 최고 속도:</Text>
            <Text style={styles.dataValue}>
              {healthData.maxSpeed && healthData.maxSpeed > 0
                ? `${healthData.maxSpeed} km/h`
                : '데이터 없음'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Health Connect 관리자</Text>

      {renderPermissionStatus()}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={requestPermissions}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '처리 중...' : '권한 요청'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={getTodayHealthData}
          disabled={loading || !permissionStatus.permissionsGranted}
        >
          <Text style={styles.buttonText}>
            {loading ? '로딩 중...' : '오늘 데이터 가져오기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={getWeekHealthData}
          disabled={loading || !permissionStatus.permissionsGranted}
        >
          <Text style={styles.buttonText}>
            {loading ? '로딩 중...' : '주간 데이터 가져오기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.tertiaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={getAllTimeAverageSpeed}
          disabled={loading || !permissionStatus.permissionsGranted}
        >
          <Text style={styles.buttonText}>
            {loading ? '계산 중...' : '🌐 전체 기간 평균 속도 계산'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderHealthData()}

      {allTimeSpeed && (
        <View style={styles.dataContainer}>
          <Text style={styles.sectionTitle}>🌐 전체 기간 평균 속도</Text>
          <Text style={styles.dataSource}>
            총 {allTimeSpeed.totalRecords}개 속도 기록 분석
          </Text>

          <View style={styles.dataGrid}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>🚶 Case 1 평균:</Text>
              <Text style={styles.dataValue}>
                {allTimeSpeed.speedCase1} km/h
              </Text>
            </View>

            <View style={styles.descRow}>
              <Text style={styles.descText}>
                ≥ 2.5 km/h (실제 이동 목적의 보행)
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>🚶‍♂️ Case 2 평균:</Text>
              <Text style={styles.dataValue}>
                {allTimeSpeed.speedCase2} km/h
              </Text>
            </View>

            <View style={styles.descRow}>
              <Text style={styles.descText}>≥ 1.5 km/h (느린 산책 포함)</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>⚡ 최고 속도:</Text>
              <Text style={styles.dataValue}>{allTimeSpeed.maxSpeed} km/h</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  tertiaryButton: {
    backgroundColor: '#FF9500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dataSource: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  dataGrid: {
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  descRow: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: -4,
    marginBottom: 4,
  },
  descText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  dataLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  noDataContainer: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default HealthConnectManager;
