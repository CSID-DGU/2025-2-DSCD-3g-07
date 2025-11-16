import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { healthConnectService } from '@/services/healthConnect';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY_COLOR = '#2C6DE7';
const SECONDARY_TEXT = '#4A5968';
const LIGHT_BACKGROUND = '#F2F5FC';
const BORDER_COLOR = '#E6E9F2';

type SearchMode = 'distance' | 'time';

interface CurrentLocation {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: number;
}

interface RouteRecommendation {
  id: string;
  name: string;
  distance: number; // km
  duration: number; // minutes
  difficulty: 'easy' | 'moderate' | 'hard';
  startPoint: {
    lat: number;
    lng: number;
    address: string;
  };
  distanceFromUser: number; // km
  elevation: number; // meters
  description: string;
}

export default function CourseScreen() {
  // 상태 관리
  const [searchMode, setSearchMode] = useState<SearchMode>('distance');
  const [inputValue, setInputValue] = useState('');
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [walkingSpeed, setWalkingSpeed] = useState<number | null>(null); // km/h
  const [routes, setRoutes] = useState<RouteRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  // 앱 시작 시 사용자 도보 속도 불러오기
  useEffect(() => {
    loadUserWalkingSpeed();
  }, []);

  const loadUserWalkingSpeed = async () => {
    try {
      const speeds = await healthConnectService.getAllTimeAverageSpeeds();
      if (speeds.speedCase1 && speeds.speedCase1 > 0) {
        setWalkingSpeed(speeds.speedCase1); // km/h
        console.log(`✅ 사용자 도보 속도: ${speeds.speedCase1.toFixed(2)} km/h`);
      } else {
        // 기본값: 평균 도보 속도 4.5 km/h
        setWalkingSpeed(4.5);
        console.log('⚠️ 도보 속도 데이터 없음, 기본값 사용: 4.5 km/h');
      }
    } catch (error) {
      console.error('도보 속도 로드 실패:', error);
      setWalkingSpeed(4.5);
    }
  };

  // 현재 위치 가져오기
  const fetchCurrentLocation = useCallback(async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('권한 필요', '위치 권한이 필요합니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // 역지오코딩으로 주소 가져오기
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // 상세 주소 포맷
      const detailedAddress = [
        address?.city,
        address?.district,
        address?.subregion || address?.street,
        address?.streetNumber || address?.name
      ]
        .filter(Boolean)
        .join(' ') || '현재 위치';

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: detailedAddress,
        timestamp: Date.now(),
      });

      Alert.alert('완료', detailedAddress);
    } catch (error) {
      console.error('위치 가져오기 실패:', error);
      Alert.alert('오류', '현재 위치를 가져올 수 없습니다.');
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  // 경로 검색
  const searchRoutes = async () => {
    if (!inputValue) {
      Alert.alert('알림', `${searchMode === 'distance' ? '거리' : '시간'}를 입력해주세요.`);
      return;
    }

    if (!currentLocation) {
      Alert.alert('알림', '현재 위치를 먼저 설정해주세요.');
      return;
    }

    if (!walkingSpeed) {
      Alert.alert('알림', '사용자 속도 정보를 불러오는 중입니다.');
      return;
    }

    try {
      setLoading(true);
      
      const value = parseFloat(inputValue);
      if (isNaN(value) || value <= 0) {
        Alert.alert('오류', '올바른 값을 입력해주세요.');
        return;
      }

      // API 호출 (백엔드 구현 필요)
      const params = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        walkingSpeed: walkingSpeed,
        ...(searchMode === 'distance' 
          ? { targetDistance: value } 
          : { targetDuration: value }
        ),
      };

      console.log('🔍 경로 검색:', params);

      // TODO: 실제 API 호출
      // const response = await fetch(`${API_BASE_URL}/api/routes/recommend`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(params),
      // });
      // const data = await response.json();
      // setRoutes(data.routes);

      // 임시 목업 데이터
      const mockRoutes: RouteRecommendation[] = [
        {
          id: '1',
          name: '한강 둘레길',
          distance: searchMode === 'distance' ? value : (value / 60) * walkingSpeed,
          duration: searchMode === 'time' ? value : (value / walkingSpeed) * 60,
          difficulty: 'easy',
          startPoint: {
            lat: 37.5219,
            lng: 126.9245,
            address: '서울 영등포구 여의도동',
          },
          distanceFromUser: 1.2,
          elevation: 5,
          description: '평탄한 강변길, 야경 명소',
        },
        {
          id: '2',
          name: '서울숲 산책로',
          distance: searchMode === 'distance' ? value * 0.9 : (value / 60) * walkingSpeed * 0.9,
          duration: searchMode === 'time' ? value * 0.95 : ((value * 0.9) / walkingSpeed) * 60,
          difficulty: 'easy',
          startPoint: {
            lat: 37.5447,
            lng: 127.0384,
            address: '서울 성동구 성수동1가',
          },
          distanceFromUser: 2.5,
          elevation: 10,
          description: '숲길과 잔디밭, 카페 근처',
        },
        {
          id: '3',
          name: '남산 순환로',
          distance: searchMode === 'distance' ? value * 1.1 : (value / 60) * walkingSpeed * 1.1,
          duration: searchMode === 'time' ? value * 1.1 : ((value * 1.1) / walkingSpeed) * 60,
          difficulty: 'moderate',
          startPoint: {
            lat: 37.5512,
            lng: 126.9882,
            address: '서울 중구 예장동',
          },
          distanceFromUser: 3.8,
          elevation: 120,
          description: '경사 있음, 도심 야경',
        },
      ];

      setRoutes(mockRoutes);
      
    } catch (error) {
      console.error('경로 검색 실패:', error);
      Alert.alert('오류', '경로 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#34C759';
      case 'moderate': return '#FF9500';
      case 'hard': return '#FF3B30';
      default: return SECONDARY_TEXT;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'moderate': return '보통';
      case 'hard': return '어려움';
      default: return difficulty;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>코스 추천</Text>
          <Text style={styles.headerSubtitle}>
            개인 맞춤 경로를 찾아보세요
          </Text>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 검색 모드 선택 */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                searchMode === 'distance' && styles.modeButtonActive,
              ]}
              onPress={() => setSearchMode('distance')}
            >
              <MaterialIcons
                name="straighten"
                size={20}
                color={searchMode === 'distance' ? 'white' : SECONDARY_TEXT}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  searchMode === 'distance' && styles.modeButtonTextActive,
                ]}
              >
                거리
              </Text>
              {walkingSpeed && searchMode === 'distance' && (
                <Text style={styles.speedInfo}>
                  {walkingSpeed.toFixed(1)}km/h
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                searchMode === 'time' && styles.modeButtonActive,
              ]}
              onPress={() => setSearchMode('time')}
            >
              <MaterialIcons
                name="schedule"
                size={20}
                color={searchMode === 'time' ? 'white' : SECONDARY_TEXT}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  searchMode === 'time' && styles.modeButtonTextActive,
                ]}
              >
                시간
              </Text>
              {walkingSpeed && searchMode === 'time' && (
                <Text style={styles.speedInfo}>
                  {walkingSpeed.toFixed(1)}km/h
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 입력 영역 */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              목표 {searchMode === 'distance' ? '거리' : '시간'}
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={searchMode === 'distance' ? '5' : '30'}
                placeholderTextColor="#999"
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="numeric"
              />
              <Text style={styles.inputUnit}>
                {searchMode === 'distance' ? 'km' : '분'}
              </Text>
            </View>

            {/* 예상 정보 */}
            {inputValue && walkingSpeed && (
              <View style={styles.estimationBox}>
                <Ionicons name="information-circle" size={16} color={PRIMARY_COLOR} />
                <Text style={styles.estimationText}>
                  {searchMode === 'distance'
                    ? `약 ${Math.round((parseFloat(inputValue) / walkingSpeed) * 60)}분 소요 예상`
                    : `약 ${((parseFloat(inputValue) / 60) * walkingSpeed).toFixed(1)}km 이동 예상`
                  }
                </Text>
              </View>
            )}
          </View>

          {/* 현재 위치 설정 */}
          <View style={styles.locationSection}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={fetchCurrentLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              ) : (
                <>
                  <MaterialIcons
                    name={currentLocation ? "my-location" : "location-searching"}
                    size={20}
                    color={currentLocation ? PRIMARY_COLOR : SECONDARY_TEXT}
                  />
                  <Text style={[
                    styles.locationButtonText,
                    currentLocation && styles.locationButtonTextActive
                  ]}>
                    {currentLocation ? '현재 위치 설정됨' : '현재 위치 설정'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* 현재 위치 정보 표시 */}
            {currentLocation && currentLocation.address && (
              <View style={styles.locationInfo}>
                <View style={styles.locationInfoRow}>
                  <MaterialIcons name="place" size={16} color={PRIMARY_COLOR} />
                  <Text style={styles.locationInfoText}>
                    {currentLocation.address}
                  </Text>
                </View>
                <View style={styles.locationInfoRow}>
                  <MaterialIcons name="info-outline" size={14} color={SECONDARY_TEXT} />
                  <Text style={styles.locationInfoSubtext}>
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 검색 버튼 */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              (!inputValue || !currentLocation) && styles.searchButtonDisabled,
            ]}
            onPress={searchRoutes}
            disabled={!inputValue || !currentLocation || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="search" size={22} color="white" />
                <Text style={styles.searchButtonText}>경로 찾기</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 경로 목록 */}
          {routes.length > 0 && (
            <View style={styles.routesSection}>
              <Text style={styles.routesSectionTitle}>
                추천 경로 {routes.length}개
              </Text>

              {routes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={styles.routeCard}
                  onPress={() => {
                    // TODO: 경로 상세 화면으로 이동
                    Alert.alert(route.name, route.description);
                  }}
                >
                  <View style={styles.routeCardHeader}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(route.difficulty) + '20' }
                    ]}>
                      <Text style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(route.difficulty) }
                      ]}>
                        {getDifficultyLabel(route.difficulty)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.routeAddress}>
                    {route.startPoint.address}
                  </Text>

                  <View style={styles.routeStats}>
                    <View style={styles.routeStat}>
                      <MaterialIcons name="straighten" size={16} color={SECONDARY_TEXT} />
                      <Text style={styles.routeStatText}>
                        {route.distance.toFixed(1)}km
                      </Text>
                    </View>

                    <View style={styles.routeStat}>
                      <MaterialIcons name="schedule" size={16} color={SECONDARY_TEXT} />
                      <Text style={styles.routeStatText}>
                        {Math.round(route.duration)}분
                      </Text>
                    </View>

                    <View style={styles.routeStat}>
                      <MaterialIcons name="near-me" size={16} color={SECONDARY_TEXT} />
                      <Text style={styles.routeStatText}>
                        {route.distanceFromUser.toFixed(1)}km
                      </Text>
                    </View>

                    {route.elevation > 0 && (
                      <View style={styles.routeStat}>
                        <MaterialIcons name="terrain" size={16} color={SECONDARY_TEXT} />
                        <Text style={styles.routeStatText}>
                          {route.elevation}m
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.routeDescription}>
                    {route.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 안내 메시지 */}
          {routes.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <MaterialIcons name="explore" size={64} color={BORDER_COLOR} />
              <Text style={styles.emptyStateTitle}>
                경로를 검색해보세요
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                목표 거리 또는 시간을 입력하고{'\n'}
                현재 위치를 설정한 후 검색하세요
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D2A3B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: SECONDARY_TEXT,
  },
  content: {
    flex: 1,
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: SECONDARY_TEXT,
  },
  modeButtonTextActive: {
    color: 'white',
  },
  speedInfo: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  inputSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D2A3B',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 24,
    fontWeight: '600',
    color: '#1D2A3B',
  },
  inputUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: SECONDARY_TEXT,
    marginLeft: 8,
  },
  estimationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: PRIMARY_COLOR + '10',
    borderRadius: 8,
  },
  estimationText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
  locationSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SECONDARY_TEXT,
  },
  locationButtonTextActive: {
    color: PRIMARY_COLOR,
  },
  locationInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: PRIMARY_COLOR + '08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR + '20',
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationInfoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1D2A3B',
  },
  locationInfoSubtext: {
    flex: 1,
    fontSize: 11,
    color: SECONDARY_TEXT,
    fontFamily: 'monospace',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
  },
  searchButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  routesSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  routesSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2A3B',
    marginBottom: 16,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2A3B',
    flex: 1,
  },
  difficultyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeAddress: {
    fontSize: 13,
    color: SECONDARY_TEXT,
    marginBottom: 12,
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeStatText: {
    fontSize: 13,
    color: SECONDARY_TEXT,
    fontWeight: '500',
  },
  routeDescription: {
    fontSize: 14,
    color: SECONDARY_TEXT,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D2A3B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: SECONDARY_TEXT,
    textAlign: 'center',
    lineHeight: 20,
  },
});
