import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KakaoMap from '@/components/KakaoMap';
import { apiService } from '@/services/api';
import type { ApiResponse, TransitRouteParams } from '@/services/api';
import { analyzeRouteSlope, formatTime as formatSlopeTime, formatTimeDifference } from '@/services/elevationService';
import type { RouteElevationAnalysis } from '@/types/api';

const PRIMARY_COLOR = '#2C6DE7';
const SECONDARY_TEXT = '#4A5968';
const LIGHT_BACKGROUND = '#F2F5FC';
const BORDER_COLOR = '#E6E9F2';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  totalTime: number;
  totalWalkTime: number;
  walkRatio: number;
  walkingSections: any[];
  personalizedWalkTime: number;
  slopeAnalysis?: RouteElevationAnalysis | null;
  rawItinerary?: any; // Tmap 원본 데이터
}

export default function HomeScreen() {
  const [startLocation, setStartLocation] = useState<LocationData | null>(null);
  const [endLocation, setEndLocation] = useState<LocationData | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [searchMode, setSearchMode] = useState<'start' | 'end' | null>(null);

  // 현재 위치 가져오기
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '현재 위치를 사용하려면 위치 권한이 필요합니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressText = address ? [
        address.city,
        address.district,
        address.street,
      ].filter(Boolean).join(' ') : '현재 위치';

      const locationData: LocationData = {
        address: addressText,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setStartLocation(locationData);
      setStartInput(addressText);

    } catch (error) {
      console.error('위치 가져오기 실패:', error);
      Alert.alert('오류', '현재 위치를 가져올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 경로 검색
  const searchRoute = async () => {
    if (!startLocation || !endLocation) {
      Alert.alert('알림', '출발지와 도착지를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const params: TransitRouteParams = {
        start_x: startLocation.longitude,
        start_y: startLocation.latitude,
        end_x: endLocation.longitude,
        end_y: endLocation.latitude,
        user_id: 'default_user',
        user_age: 25,
        fatigue_level: 3,
      };

      const response = await apiService.getTransitRoute(params);

      if (response.data) {
        let slopeAnalysis: RouteElevationAnalysis | null = null;
        let tmapItinerary = null;

        // Backend 응답에서 Tmap 데이터 추출
        // apiService.getTransitRoute는 Tmap 원본 응답을 반환함
        try {
          // response.data가 Tmap 응답 형식인 경우
          if (response.data.metaData?.plan?.itineraries?.[0]) {
            tmapItinerary = response.data.metaData.plan.itineraries[0];

            // 경사도 분석 실행
            console.log('경사도 분석 시작...');
            slopeAnalysis = await analyzeRouteSlope(tmapItinerary);
            console.log('경사도 분석 완료:', slopeAnalysis);
          }
          // 또는 raw_tmap_data 필드가 있는 경우
          else if (response.data.raw_tmap_data?.metaData?.plan?.itineraries?.[0]) {
            tmapItinerary = response.data.raw_tmap_data.metaData.plan.itineraries[0];

            console.log('경사도 분석 시작...');
            slopeAnalysis = await analyzeRouteSlope(tmapItinerary);
            console.log('경사도 분석 완료:', slopeAnalysis);
          }
        } catch (slopeError) {
          console.warn('경사도 분석 실패 (경로 정보는 정상 표시):', slopeError);
        }

        setRouteInfo({
          totalTime: response.data.total_time_minutes,
          totalWalkTime: response.data.total_walk_time_minutes,
          walkRatio: response.data.walk_ratio_percent,
          walkingSections: response.data.walking_sections,
          personalizedWalkTime: response.data.total_personalized_walk_time_minutes,
          slopeAnalysis: slopeAnalysis,
          rawItinerary: tmapItinerary,
        });

        console.log('경로 검색 성공:', response.data);
      } else {
        Alert.alert('오류', response.error || '경로를 검색할 수 없습니다.');
      }

    } catch (error) {
      console.error('경로 검색 실패:', error);
      Alert.alert('오류', '경로를 검색할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 장소 검색 (간단한 더미 데이터)
  const searchPlace = (query: string, type: 'start' | 'end') => {
    // 실제로는 카카오 로컬 API 등을 사용
    const dummyPlaces: { [key: string]: LocationData } = {
      '강남역': { address: '서울 강남구 강남역', latitude: 37.4979, longitude: 127.0276 },
      '홍대입구역': { address: '서울 마포구 홍대입구역', latitude: 37.5570, longitude: 126.9229 },
      '여의도공원': { address: '서울 영등포구 여의도공원', latitude: 37.5289, longitude: 126.9338 },
      '서울숲': { address: '서울 성동구 서울숲', latitude: 37.5443, longitude: 127.0374 },
      '한강공원': { address: '서울 용산구 한강공원', latitude: 37.5285, longitude: 126.9332 },
    };

    const place = dummyPlaces[query];
    if (place) {
      if (type === 'start') {
        setStartLocation(place);
        setStartInput(place.address);
      } else {
        setEndLocation(place);
        setEndInput(place.address);
      }
      setSearchMode(null);
    }
  };

  const quickPlaces = ['강남역', '홍대입구역', '여의도공원', '서울숲', '한강공원'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PaceTry</Text>
        <Text style={styles.headerSubtitle}>나만의 속도로 가는 길</Text>
      </View>

      {/* 검색 영역 */}
      <View style={styles.searchContainer}>
        {/* 출발지 */}
        <View style={styles.searchRow}>
          <View style={styles.searchIconContainer}>
            <View style={[styles.dot, styles.startDot]} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="출발지를 입력하세요"
            value={startInput}
            onChangeText={setStartInput}
            onFocus={() => setSearchMode('start')}
          />
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
          >
            <MaterialIcons name="my-location" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>

        {/* 교환 버튼 */}
        <View style={styles.swapButtonContainer}>
          <TouchableOpacity
            style={styles.swapButton}
            onPress={() => {
              const temp = startLocation;
              const tempInput = startInput;
              setStartLocation(endLocation);
              setStartInput(endInput);
              setEndLocation(temp);
              setEndInput(tempInput);
            }}
          >
            <MaterialIcons name="swap-vert" size={20} color={SECONDARY_TEXT} />
          </TouchableOpacity>
        </View>

        {/* 도착지 */}
        <View style={styles.searchRow}>
          <View style={styles.searchIconContainer}>
            <View style={[styles.dot, styles.endDot]} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="도착지를 입력하세요"
            value={endInput}
            onChangeText={setEndInput}
            onFocus={() => setSearchMode('end')}
          />
          {endInput.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setEndInput('');
                setEndLocation(null);
              }}
            >
              <MaterialIcons name="close" size={20} color={SECONDARY_TEXT} />
            </TouchableOpacity>
          )}
        </View>

        {/* 검색 버튼 */}
        <TouchableOpacity
          style={[styles.searchButton, (!startLocation || !endLocation) && styles.searchButtonDisabled]}
          onPress={searchRoute}
          disabled={!startLocation || !endLocation || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="search" size={20} color="white" />
              <Text style={styles.searchButtonText}>경로 검색</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 빠른 검색 칩 */}
      {searchMode && (
        <View style={styles.quickSearchContainer}>
          <Text style={styles.quickSearchTitle}>빠른 검색</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quickPlaces.map((place) => (
              <TouchableOpacity
                key={place}
                style={styles.quickChip}
                onPress={() => searchPlace(place, searchMode)}
              >
                <MaterialIcons name="place" size={16} color={PRIMARY_COLOR} />
                <Text style={styles.quickChipText}>{place}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 지도 영역 */}
      <View style={styles.mapContainer}>
        <KakaoMap
          jsKey="d377e8ba6e5edd8176c63a3f97c9e17b"
          lat={startLocation?.latitude || 37.5665}
          lng={startLocation?.longitude || 126.9780}
        />
      </View>

      {/* 경로 정보 */}
      {routeInfo && (
        <View style={styles.routeInfoContainer}>
          <ScrollView>
            <View style={styles.routeInfoHeader}>
              <MaterialIcons name="directions-transit" size={24} color={PRIMARY_COLOR} />
              <Text style={styles.routeInfoTitle}>추천 경로</Text>
            </View>

            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <MaterialIcons name="schedule" size={20} color={SECONDARY_TEXT} />
                <Text style={styles.statValue}>{Math.round(routeInfo.totalTime)}분</Text>
                <Text style={styles.statLabel}>총 시간</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <MaterialIcons name="directions-walk" size={20} color={SECONDARY_TEXT} />
                <Text style={styles.statValue}>{Math.round(routeInfo.totalWalkTime)}분</Text>
                <Text style={styles.statLabel}>도보 시간</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <MaterialIcons name="person" size={20} color={PRIMARY_COLOR} />
                <Text style={[styles.statValue, { color: PRIMARY_COLOR }]}>
                  {Math.round(routeInfo.personalizedWalkTime)}분
                </Text>
                <Text style={styles.statLabel}>나의 속도</Text>
              </View>
            </View>

            {/* 경사도 정보 */}
            {routeInfo.slopeAnalysis && !routeInfo.slopeAnalysis.error && (
              <View style={styles.slopeInfoCard}>
                <View style={styles.slopeHeader}>
                  <MaterialIcons name="terrain" size={20} color="#FF6B6B" />
                  <Text style={styles.slopeTitle}>경사도 분석</Text>
                </View>

                <View style={styles.slopeStats}>
                  <View style={styles.slopeStatItem}>
                    <Text style={styles.slopeLabel}>평균 경사</Text>
                    <Text style={styles.slopeValue}>
                      {routeInfo.slopeAnalysis.walk_legs_analysis.length > 0
                        ? (
                          routeInfo.slopeAnalysis.walk_legs_analysis.reduce(
                            (sum, leg) => sum + Math.abs(leg.avg_slope),
                            0
                          ) / routeInfo.slopeAnalysis.walk_legs_analysis.length
                        ).toFixed(1)
                        : '0.0'}%
                    </Text>
                  </View>

                  <View style={styles.slopeStatItem}>
                    <Text style={styles.slopeLabel}>보정 시간</Text>
                    <Text style={[
                      styles.slopeValue,
                      routeInfo.slopeAnalysis.total_route_time_adjustment > 0
                        ? { color: '#FF6B6B' }
                        : { color: '#4CAF50' }
                    ]}>
                      {routeInfo.slopeAnalysis.total_route_time_adjustment > 0 ? '+' : ''}
                      {formatTimeDifference(routeInfo.slopeAnalysis.total_route_time_adjustment)}
                    </Text>
                  </View>

                  <View style={styles.slopeStatItem}>
                    <Text style={styles.slopeLabel}>실제 예상</Text>
                    <Text style={styles.slopeValue}>
                      {Math.round(routeInfo.slopeAnalysis.total_adjusted_walk_time / 60)}분
                    </Text>
                  </View>
                </View>

                {/* 경사도 세부 정보 */}
                <View style={styles.slopeDetails}>
                  {routeInfo.slopeAnalysis.walk_legs_analysis.map((leg, index) => {
                    const getSlopeEmoji = (slope: number) => {
                      const absSlope = Math.abs(slope);
                      if (absSlope < 3) return '⚪';
                      if (absSlope < 5) return '🟢';
                      if (absSlope < 10) return '🟡';
                      if (absSlope < 15) return '🟠';
                      return '🔴';
                    };

                    const getSlopeDifficulty = (slope: number) => {
                      const absSlope = Math.abs(slope);
                      if (absSlope < 3) return '평지';
                      if (absSlope < 5) return '완만';
                      if (absSlope < 10) return '보통';
                      if (absSlope < 15) return '가파름';
                      return '매우 가파름';
                    };

                    return (
                      <View key={index} style={styles.slopeDetailItem}>
                        <Text style={styles.slopeDetailEmoji}>{getSlopeEmoji(leg.avg_slope)}</Text>
                        <View style={styles.slopeDetailInfo}>
                          <Text style={styles.slopeDetailName} numberOfLines={1}>
                            {leg.start_name} → {leg.end_name}
                          </Text>
                          <Text style={styles.slopeDetailStats}>
                            {leg.distance}m · {getSlopeDifficulty(leg.avg_slope)} ({leg.avg_slope.toFixed(1)}%)
                            {leg.time_diff !== 0 && (
                              <Text style={leg.time_diff > 0 ? styles.timeDiffPlus : styles.timeDiffMinus}>
                                {' '}({leg.time_diff > 0 ? '+' : ''}{Math.round(leg.time_diff / 60)}분)
                              </Text>
                            )}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.walkingSections}>
              <Text style={styles.sectionTitle}>
                도보 구간 ({routeInfo.walkingSections.length}개)
              </Text>
              {routeInfo.walkingSections.map((section, index) => (
                <View key={index} style={styles.sectionItem}>
                  <View style={styles.sectionIcon}>
                    <MaterialIcons name="directions-walk" size={16} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.sectionInfo}>
                    <Text style={styles.sectionName}>
                      {section.start_name} → {section.end_name}
                    </Text>
                    <Text style={styles.sectionDetail}>
                      {section.distance_meters}m · {Math.round(section.section_time_seconds / 60)}분
                      {section.personalized_time_seconds && (
                        <Text style={{ color: PRIMARY_COLOR }}>
                          {' '}(나: {Math.round(section.personalized_time_seconds / 60)}분)
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* 경로 정보가 없을 때 안내 */}
      {!routeInfo && !searchMode && (
        <View style={styles.emptyState}>
          <MaterialIcons name="directions" size={48} color={BORDER_COLOR} />
          <Text style={styles.emptyStateTitle}>출발지와 도착지를 입력하세요</Text>
          <Text style={styles.emptyStateSubtitle}>
            나만의 속도에 맞춘 경로를 찾아드립니다
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: SECONDARY_TEXT,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchIconContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  startDot: {
    backgroundColor: '#4CAF50',
  },
  endDot: {
    backgroundColor: '#F44336',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#333',
  },
  currentLocationButton: {
    marginLeft: 8,
    padding: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
  },
  swapButtonContainer: {
    alignItems: 'center',
    marginVertical: -6,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LIGHT_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: BORDER_COLOR,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quickSearchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  quickSearchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SECONDARY_TEXT,
    marginBottom: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 4,
  },
  quickChipText: {
    fontSize: 14,
    color: '#333',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  routeInfoContainer: {
    maxHeight: 300,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  routeInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: BORDER_COLOR,
  },
  walkingSections: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SECONDARY_TEXT,
    marginBottom: 12,
  },
  sectionItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_BACKGROUND,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LIGHT_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionInfo: {
    flex: 1,
    gap: 4,
  },
  sectionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sectionDetail: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  emptyState: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SECONDARY_TEXT,
    marginTop: 12,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: SECONDARY_TEXT,
    marginTop: 4,
    opacity: 0.7,
  },
  // 경사도 관련 스타일
  slopeInfoCard: {
    backgroundColor: '#FFF9F0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE5CC',
  },
  slopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  slopeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  slopeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  slopeStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  slopeLabel: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  slopeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  slopeDetails: {
    gap: 8,
  },
  slopeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  slopeDetailEmoji: {
    fontSize: 20,
  },
  slopeDetailInfo: {
    flex: 1,
    gap: 4,
  },
  slopeDetailName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  slopeDetailStats: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  timeDiffPlus: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  timeDiffMinus: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});