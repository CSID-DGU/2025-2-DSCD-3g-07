import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Button, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { samsungHealthService, SamsungHealthData } from '../services/samsungHealth';

interface SyncStatus {
  isConnected: boolean;
  lastSync?: Date;
  availableData: string[];
  connectionDetails: {
    samsungHealthInstalled: boolean;
    healthConnectAvailable: boolean;
    permissionsGranted: boolean;
    dataAccessible: boolean;
    recommendedActions: string[];
  };
}

const SamsungHealthTest: React.FC = () => {
  const [healthData, setHealthData] = useState<SamsungHealthData>({
    available: false,
    source: 'Not Available'
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
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
      await checkSyncStatus();
      setIsInitialized(true);
    } catch (error) {
      console.error('Samsung Health 초기화 실패:', error);
      Alert.alert('오류', 'Samsung Health 초기화에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await samsungHealthService.checkSyncStatus();
      setSyncStatus(status);
      console.log('Samsung Health 동기화 상태:', status);
    } catch (error) {
      console.error('동기화 상태 확인 실패:', error);
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      const granted = await samsungHealthService.requestHealthConnectPermissions();
      if (granted) {
        Alert.alert('성공', '권한이 허용되었습니다.');
        await checkSyncStatus();
      } else {
        Alert.alert('권한 필요', 'Samsung Health 데이터에 접근하려면 권한이 필요합니다.');
      }
    } catch (error) {
      console.error('권한 요청 실패:', error);
      Alert.alert('오류', '권한 요청에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestNativePermissions = async () => {
    setIsLoading(true);
    try {
      const granted = await samsungHealthService.requestHealthConnectNativePermissions();
      Alert.alert(
        '네이티브 권한 요청 결과',
        granted ? '권한이 허용되었습니다.' : '권한이 거부되었습니다.'
      );
      await checkSyncStatus();
    } catch (error) {
      console.error('네이티브 권한 요청 실패:', error);
      Alert.alert('오류', '네이티브 권한 요청에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const openHealthConnectSettings = async () => {
    try {
      await samsungHealthService.openHealthConnectSettings();
    } catch (error) {
      console.error('Health Connect 설정 열기 실패:', error);
      Alert.alert('오류', 'Health Connect 설정을 열 수 없습니다.');
    }
  };

  const openSamsungHealth = async () => {
    try {
      await samsungHealthService.openSamsungHealth();
      Alert.alert('성공', 'Samsung Health 앱을 열었습니다.');
    } catch (error) {
      console.error('Samsung Health 앱 열기 실패:', error);
      
      // 더 상세한 오류 메시지 제공
      let errorMessage = 'Samsung Health 앱을 열 수 없습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('No Activity found')) {
          errorMessage = 'Samsung Health 앱이 설치되지 않았거나 비활성화되었습니다. Play Store에서 다운로드하거나 활성화해주세요.';
        } else if (error.message.includes('Could not open URL')) {
          errorMessage = 'Samsung Health 앱을 실행할 수 없습니다. 앱이 올바르게 설치되었는지 확인해주세요.';
        } else if (error.message.includes('앱이 설치되어 있는지 확인')) {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Samsung Health 실행 실패', 
        errorMessage,
        [
          { text: '취소', style: 'cancel' },
          { 
            text: 'Play Store에서 다운로드', 
            onPress: () => {
              require('react-native').Linking.openURL('https://play.google.com/store/apps/details?id=com.sec.android.app.shealth');
            }
          }
        ]
      );
    }
  };

  const checkSamsungHealthInstalled = async () => {
    setIsLoading(true);
    try {
      const installed = await samsungHealthService.isSamsungHealthInstalled();
      
      if (installed) {
        Alert.alert(
          'Samsung Health 설치 상태',
          'Samsung Health가 설치되어 있습니다.',
          [
            { text: '확인', style: 'default' },
            { 
              text: '앱 열기', 
              onPress: () => openSamsungHealth()
            }
          ]
        );
      } else {
        Alert.alert(
          'Samsung Health 설치 상태',
          'Samsung Health가 설치되지 않았거나 감지할 수 없습니다.',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: 'Play Store에서 다운로드', 
              onPress: () => {
                require('react-native').Linking.openURL('https://play.google.com/store/apps/details?id=com.sec.android.app.shealth');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Samsung Health 설치 확인 실패:', error);
      Alert.alert('오류', 'Samsung Health 설치 상태를 확인할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkHealthConnectAvailability = async () => {
    setIsLoading(true);
    try {
      const availability = await samsungHealthService.checkHealthConnectAvailability();
      Alert.alert(
        'Health Connect 가용성',
        `사용 가능: ${availability.available ? '예' : '아니오'}\n상태: ${availability.status}`
      );
    } catch (error) {
      console.error('Health Connect 가용성 확인 실패:', error);
      Alert.alert('오류', 'Health Connect 가용성을 확인할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const testStepsData = async () => {
    if (!syncStatus.connectionDetails.permissionsGranted) {
      Alert.alert('권한 없음', '먼저 권한을 허용해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // Native 모듈에서 직접 걸음 수 데이터 읽기 테스트
      const { HealthConnectModule } = require('react-native').NativeModules;
      const steps = await HealthConnectModule.readStepsData();
      Alert.alert('걸음 수 테스트', `읽은 걸음 수: ${steps.toLocaleString()}`);
    } catch (error) {
      console.error('걸음 수 테스트 실패:', error);
      Alert.alert('오류', '걸음 수 데이터를 읽을 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const testSpeedData = async () => {
    if (!syncStatus.connectionDetails.permissionsGranted) {
      Alert.alert('권한 없음', '먼저 권한을 허용해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { HealthConnectModule } = require('react-native').NativeModules;
      const speedData = await HealthConnectModule.readSpeedData();
      Alert.alert(
        '속도 데이터 테스트',
        `평균 속도: ${speedData.averageSpeedKmh.toFixed(1)} km/h\n최고 속도: ${speedData.maxSpeedKmh.toFixed(1)} km/h\n기록 수: ${speedData.recordCount}`
      );
    } catch (error) {
      console.error('속도 데이터 테스트 실패:', error);
      Alert.alert('오류', '속도 데이터를 읽을 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const debugSchemeSupport = async () => {
    setIsLoading(true);
    const schemes = [
      'shealth://',
      'com.sec.android.app.shealth://',
      'samsunghealth://',
      'shealth://main',
      'market://details?id=com.sec.android.app.shealth'
    ];
    
    const results = [];
    
    for (const scheme of schemes) {
      try {
        const { Linking } = require('react-native');
        const canOpen = await Linking.canOpenURL(scheme);
        results.push(`${scheme}: ${canOpen ? '✅ 지원' : '❌ 미지원'}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push(`${scheme}: ❌ 오류 - ${errorMessage}`);
      }
    }
    
    setIsLoading(false);
    
    Alert.alert(
      'URL Scheme 지원 상태',
      results.join('\n'),
      [{ text: '확인' }]
    );
  };

  const readHealthData = async () => {
    if (!syncStatus.connectionDetails.permissionsGranted) {
      Alert.alert('권한 없음', '먼저 권한을 허용해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await samsungHealthService.readSamsungHealthData();
      setHealthData(data);
      console.log('읽은 건강 데이터:', data);
      Alert.alert('성공', '건강 데이터를 성공적으로 읽었습니다.');
    } catch (error) {
      console.error('건강 데이터 읽기 실패:', error);
      Alert.alert('오류', '건강 데이터 읽기에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSyncStatusColor = () => {
    if (!syncStatus.connectionDetails.healthConnectAvailable) return '#ff4444';
    if (!syncStatus.connectionDetails.permissionsGranted) return '#ff8800';
    if (syncStatus.isConnected) return '#00aa00';
    return '#888888';
  };

  const getSyncStatusText = () => {
    if (!syncStatus.connectionDetails.healthConnectAvailable) return 'Health Connect 사용 불가';
    if (!syncStatus.connectionDetails.permissionsGranted) return '권한 필요';
    if (syncStatus.isConnected) return '연결됨';
    return '연결 안됨';
  };

  if (isLoading && !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Samsung Health 초기화 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Samsung Health 테스트</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>동기화 상태</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getSyncStatusColor() }]}>
          <Text style={styles.statusText}>{getSyncStatusText()}</Text>
        </View>
        {syncStatus.lastSync && (
          <Text style={styles.lastSyncText}>
            마지막 동기화: {syncStatus.lastSync.toLocaleString('ko-KR')}
          </Text>
        )}
        {syncStatus.connectionDetails.recommendedActions.length > 0 && (
          <View style={styles.recommendationContainer}>
            <Text style={styles.recommendationTitle}>권장 사항:</Text>
            {syncStatus.connectionDetails.recommendedActions.map((action, index) => (
              <Text key={index} style={styles.recommendationText}>
                • {action}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.sectionTitle}>기본 제어</Text>
        <Button
          title="상태 새로고침"
          onPress={checkSyncStatus}
          disabled={isLoading}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="권한 요청 (Health Connect)"
          onPress={requestPermissions}
          disabled={isLoading || !syncStatus.connectionDetails.healthConnectAvailable}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="권한 요청 (네이티브)"
          onPress={requestNativePermissions}
          disabled={isLoading || !syncStatus.connectionDetails.healthConnectAvailable}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="데이터 읽기"
          onPress={readHealthData}
          disabled={isLoading || !syncStatus.connectionDetails.permissionsGranted}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.sectionTitle}>앱 및 설정</Text>
        <Button
          title="Samsung Health 앱 열기"
          onPress={openSamsungHealth}
          disabled={isLoading}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="Health Connect 설정"
          onPress={openHealthConnectSettings}
          disabled={isLoading}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="Samsung Health 설치 확인"
          onPress={checkSamsungHealthInstalled}
          disabled={isLoading}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="Health Connect 가용성 확인"
          onPress={checkHealthConnectAvailability}
          disabled={isLoading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.sectionTitle}>개별 데이터 테스트</Text>
        <Button
          title="걸음 수 테스트"
          onPress={testStepsData}
          disabled={isLoading || !syncStatus.connectionDetails.permissionsGranted}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="속도 데이터 테스트"
          onPress={testSpeedData}
          disabled={isLoading || !syncStatus.connectionDetails.permissionsGranted}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.sectionTitle}>디버깅 도구</Text>
        <Button
          title="URL Scheme 지원 상태 확인"
          onPress={debugSchemeSupport}
          disabled={isLoading}
        />
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>상세 연결 상태</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Samsung Health 설치:</Text>
          <Text style={[styles.detailValue, { 
            color: syncStatus.connectionDetails.samsungHealthInstalled ? '#00aa00' : '#ff4444' 
          }]}>
            {syncStatus.connectionDetails.samsungHealthInstalled ? '설치됨' : '설치 안됨'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Health Connect 사용 가능:</Text>
          <Text style={[styles.detailValue, { 
            color: syncStatus.connectionDetails.healthConnectAvailable ? '#00aa00' : '#ff4444' 
          }]}>
            {syncStatus.connectionDetails.healthConnectAvailable ? '사용 가능' : '사용 불가'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>권한 허용:</Text>
          <Text style={[styles.detailValue, { 
            color: syncStatus.connectionDetails.permissionsGranted ? '#00aa00' : '#ff4444' 
          }]}>
            {syncStatus.connectionDetails.permissionsGranted ? '허용됨' : '거부됨'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>데이터 접근 가능:</Text>
          <Text style={[styles.detailValue, { 
            color: syncStatus.connectionDetails.dataAccessible ? '#00aa00' : '#ff4444' 
          }]}>
            {syncStatus.connectionDetails.dataAccessible ? '가능' : '불가능'}
          </Text>
        </View>

        {syncStatus.availableData.length > 0 && (
          <View style={styles.availableDataContainer}>
            <Text style={styles.detailLabel}>사용 가능한 데이터:</Text>
            {syncStatus.availableData.map((dataType, index) => (
              <Text key={index} style={styles.availableDataText}>
                • {dataType}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.dataContainer}>
        <Text style={styles.sectionTitle}>건강 데이터 (최근 24시간)</Text>
        
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>걸음 수:</Text>
          <Text style={styles.dataValue}>{healthData.steps?.toLocaleString() || '데이터 없음'}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>거리:</Text>
          <Text style={styles.dataValue}>
            {healthData.distance ? `${(healthData.distance / 1000).toFixed(2)} km` : '데이터 없음'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>칼로리:</Text>
          <Text style={styles.dataValue}>
            {healthData.calories ? `${healthData.calories.toFixed(0)} kcal` : '데이터 없음'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>심박수:</Text>
          <Text style={styles.dataValue}>
            {healthData.heartRate ? `${healthData.heartRate} bpm` : '데이터 없음'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>수면 시간:</Text>
          <Text style={styles.dataValue}>
            {healthData.sleepDuration ? `${(healthData.sleepDuration / 60).toFixed(1)} 시간` : '데이터 없음'}
          </Text>
        </View>

        {healthData.speed && (
          <View style={styles.speedContainer}>
            <Text style={styles.dataLabel}>속도 정보:</Text>
            <View style={styles.speedData}>
              <Text style={styles.speedText}>
                평균: {healthData.speed.averageSpeedKmh.toFixed(1)} km/h
              </Text>
              <Text style={styles.speedText}>
                최고: {healthData.speed.maxSpeedKmh.toFixed(1)} km/h
              </Text>
              <Text style={styles.speedText}>
                기록 수: {healthData.speed.recordCount}개
              </Text>
            </View>
          </View>
        )}

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>데이터 소스:</Text>
          <Text style={[styles.dataValue, { 
            color: healthData.source === 'Health Connect' ? '#00aa00' : 
                   healthData.source === 'Samsung Health' ? '#0066cc' : '#ff4444' 
          }]}>
            {healthData.source}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>데이터 사용 가능:</Text>
          <Text style={[styles.dataValue, { color: healthData.available ? '#00aa00' : '#ff4444' }]}>
            {healthData.available ? '예' : '아니오'}
          </Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
  },
  buttonContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSpacer: {
    height: 10,
  },
  dataContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  speedContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  speedData: {
    marginTop: 5,
    marginLeft: 10,
  },
  speedText: {
    fontSize: 14,
    color: '#0066cc',
    marginBottom: 3,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  recommendationContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff8800',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  availableDataContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
  },
  availableDataText: {
    fontSize: 12,
    color: '#0066cc',
    marginLeft: 10,
    marginBottom: 2,
  },
});

export default SamsungHealthTest;