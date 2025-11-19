import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KakaoMapWithRoute from '../../components/KakaoMapWithRoute';
import {
  searchPedestrianRoute,
  RouteResponse,
} from '../../services/routeService';
import {
  searchPlaces,
  PlaceSearchResult,
  placeToCoordinates,
  formatPlaceDisplay,
} from '../../services/placeSearchService';

// 카카오맵 JS 키 (환경변수로 관리)
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY || '9a91bb579fe8e58cc9e5e25d6a073869';

const TABS = [
  { id: 'recommended', label: '추천', helper: '맞춤 추천' },
  { id: 'distance', label: '거리별', helper: '목표 거리' },
  { id: 'time', label: '시간별', helper: '목표 시간' },
];

const SUGGESTIONS = ['현재 위치', '집', '회사', '지하철역'];
const FILTERS = ['강변 뷰', '숲길', '야경', '평지', '도전적'];

const ROUTES = {
  recommended: [
    {
      id: 'rec-1',
      title: '한강 둘레길',
      subtitle: '여의나루~서울색공원',
      distance: '3.6 km',
      duration: '48분',
      difficulty: '쉬움',
      highlight: '데크길과 노을 포인트',
      image:
        'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1100&q=60',
    },
    {
      id: 'rec-2',
      title: '서울숲 카페 투어',
      subtitle: '서울숲~카페거리',
      distance: '4.4 km',
      duration: '62분',
      difficulty: '보통',
      highlight: '카페 휴식과 포토존',
      image:
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1100&q=60',
    },
  ],
  distance: [
    {
      id: 'dist-1',
      title: '5km 도전 코스',
      subtitle: '잠실 종합운동장 외곽',
      distance: '5.2 km',
      duration: '70분',
      difficulty: '보통',
      highlight: '1km마다 알림',
      image:
        'https://images.unsplash.com/photo-1436450412740-6b988f486c6b?auto=format&fit=crop&w=1100&q=60',
    },
    {
      id: 'dist-2',
      title: '점심 산책로',
      subtitle: '망원공원~시장',
      distance: '2.2 km',
      duration: '30분',
      difficulty: '쉬움',
      highlight: '피니시 라인 먹거리',
      image:
        'https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1100&q=60',
    },
  ],
  time: [
    {
      id: 'time-1',
      title: '30분 점심 산책',
      subtitle: '시청~덕수궁 돌담길',
      distance: '2.3 km',
      duration: '32분',
      difficulty: '쉬움',
      highlight: '그늘과 벤치',
      image:
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1100&q=60',
    },
    {
      id: 'time-2',
      title: '1시간 스카이라인',
      subtitle: '남산 야경 산책로',
      distance: '4.1 km',
      duration: '63분',
      difficulty: '도전적',
      highlight: '꾸준한 오르막과 전망대',
      image:
        'https://images.unsplash.com/photo-1479705879471-baea15b10f82?auto=format&fit=crop&w=1100&q=60',
    },
  ],
} as const;

export default function RoutesScreen() {
  const [activeTab, setActiveTab] = useState('recommended');
  const [start, setStart] = useState('현재 위치');
  const [destination, setDestination] = useState('');
  const [filters, setFilters] = useState<string[]>(['강변 뷰']);

  // 경로 검색 상태
  const [searching, setSearching] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [showMap, setShowMap] = useState(false);

  // 장소 검색 상태
  const [startSearchResults, setStartSearchResults] = useState<
    PlaceSearchResult[]
  >([]);
  const [destSearchResults, setDestSearchResults] = useState<
    PlaceSearchResult[]
  >([]);
  const [showStartResults, setShowStartResults] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);
  const [selectedStartCoords, setSelectedStartCoords] = useState({
    lat: 37.5665,
    lng: 126.978,
  }); // 서울시청
  const [selectedDestCoords, setSelectedDestCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const routes = useMemo(
    () => ROUTES[activeTab as keyof typeof ROUTES],
    [activeTab]
  );

  // 출발지 검색
  const handleStartSearch = async (text: string) => {
    setStart(text);

    if (text.trim().length >= 2) {
      try {
        const results = await searchPlaces(
          text,
          selectedStartCoords.lng,
          selectedStartCoords.lat
        );
        setStartSearchResults(results);
        setShowStartResults(results.length > 0);
      } catch (error) {
        console.error('출발지 검색 실패:', error);
        setStartSearchResults([]);
        setShowStartResults(false);
      }
    } else {
      setStartSearchResults([]);
      setShowStartResults(false);
    }
  };

  // 도착지 검색
  const handleDestSearch = async (text: string) => {
    setDestination(text);

    if (text.trim().length >= 2) {
      try {
        const results = await searchPlaces(
          text,
          selectedStartCoords.lng,
          selectedStartCoords.lat
        );
        setDestSearchResults(results);
        setShowDestResults(results.length > 0);
      } catch (error) {
        console.error('도착지 검색 실패:', error);
        setDestSearchResults([]);
        setShowDestResults(false);
      }
    } else {
      setDestSearchResults([]);
      setShowDestResults(false);
    }
  };

  // 출발지 선택
  const handleSelectStart = (place: PlaceSearchResult) => {
    setStart(formatPlaceDisplay(place));
    const coords = placeToCoordinates(place);
    setSelectedStartCoords({ lat: coords.latitude, lng: coords.longitude });
    setShowStartResults(false);
    setStartSearchResults([]);
    console.log('✅ 출발지 선택:', { name: place.place_name, coords });
  };

  // 도착지 선택
  const handleSelectDest = (place: PlaceSearchResult) => {
    setDestination(formatPlaceDisplay(place));
    const coords = placeToCoordinates(place);
    setSelectedDestCoords({ lat: coords.latitude, lng: coords.longitude });
    setShowDestResults(false);
    setDestSearchResults([]);
    console.log('✅ 도착지 선택:', { name: place.place_name, coords });
  };

  // 경로 검색 함수
  const handleSearchRoute = async () => {
    if (!destination.trim()) {
      Alert.alert('알림', '도착지를 입력해주세요');
      return;
    }

    if (!selectedDestCoords) {
      Alert.alert('알림', '도착지 목록에서 선택해주세요');
      return;
    }

    try {
      setSearching(true);
      console.log('🔍 경로 검색 시작:', { start, destination });

      // 티맵 API로 경로 검색
      const result = await searchPedestrianRoute({
        startX: selectedStartCoords.lng,
        startY: selectedStartCoords.lat,
        endX: selectedDestCoords.lng,
        endY: selectedDestCoords.lat,
        startName: start,
        endName: destination,
      });

      setRouteResult(result);
      setShowMap(true);

      console.log('✅ 경로 검색 완료:', result);
    } catch (error) {
      console.error('❌ 경로 검색 실패:', error);
      Alert.alert('오류', '경로를 찾을 수 없습니다');
    } finally {
      setSearching(false);
    }
  };

  const toggleFilter = (item: string) => {
    setFilters(prev =>
      prev.includes(item)
        ? prev.filter(value => value !== item)
        : [...prev, item]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.wrapper}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>걸을 코스 선택하기</Text>
            <Text style={styles.subtitle}>
              거리, 시간, 풍경을 내 걸음에 맞춰 조정하세요
            </Text>
          </View>
          <TouchableOpacity style={styles.recentButton}>
            <MaterialIcons name="history" size={20} color="#304FFE" />
            <Text style={styles.recentText}>기록</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>출발지</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="my-location" size={18} color="#304FFE" />
              <TextInput
                value={start}
                onChangeText={handleStartSearch}
                onFocus={() =>
                  setShowStartResults(startSearchResults.length > 0)
                }
                placeholder="출발지를 입력하세요"
                style={styles.inputField}
              />
              {start.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setStart('');
                    setStartSearchResults([]);
                    setShowStartResults(false);
                  }}
                >
                  <MaterialIcons name="clear" size={18} color="#9AA3B0" />
                </TouchableOpacity>
              )}
            </View>
            {/* 출발지 검색 결과 */}
            {showStartResults && (
              <View style={styles.searchResults}>
                <FlatList
                  data={startSearchResults}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => handleSelectStart(item)}
                    >
                      <MaterialIcons name="place" size={20} color="#304FFE" />
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultName}>
                          {item.place_name}
                        </Text>
                        <Text style={styles.searchResultAddress}>
                          {item.address_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                />
              </View>
            )}
          </View>
          <View style={styles.separator} />
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>도착지</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="flag" size={18} color="#FF7043" />
              <TextInput
                value={destination}
                onChangeText={handleDestSearch}
                onFocus={() => setShowDestResults(destSearchResults.length > 0)}
                placeholder="도착지를 입력하세요"
                style={styles.inputField}
              />
              {destination.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setDestination('');
                    setDestSearchResults([]);
                    setShowDestResults(false);
                    setSelectedDestCoords(null);
                  }}
                >
                  <MaterialIcons name="clear" size={18} color="#9AA3B0" />
                </TouchableOpacity>
              )}
            </View>
            {/* 도착지 검색 결과 */}
            {showDestResults && (
              <View style={styles.searchResults}>
                <FlatList
                  data={destSearchResults}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => handleSelectDest(item)}
                    >
                      <MaterialIcons name="place" size={20} color="#FF7043" />
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultName}>
                          {item.place_name}
                        </Text>
                        <Text style={styles.searchResultAddress}>
                          {item.address_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                />
              </View>
            )}
          </View>
          <View style={styles.suggestionRow}>
            {SUGGESTIONS.map(value => (
              <TouchableOpacity
                key={value}
                style={styles.suggestionChip}
                onPress={() => handleDestSearch(value)}
              >
                <Text style={styles.suggestionText}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSearchRoute}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="directions" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>경로 검색</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          {TABS.map(tab => {
            const active = tab.id === activeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
                <Text
                  style={[styles.tabHelper, active && styles.tabHelperActive]}
                >
                  {tab.helper}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(item => {
            const active = filters.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => toggleFilter(item)}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.routeList}>
          {routes.map(route => (
            <View key={route.id} style={styles.routeCard}>
              <Image source={{ uri: route.image }} style={styles.thumbnail} />
              <View style={styles.routeContent}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeTitle}>{route.title}</Text>
                  <View style={styles.badge}>
                    <MaterialIcons
                      name="emoji-nature"
                      size={16}
                      color="#304FFE"
                    />
                    <Text style={styles.badgeText}>{route.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.routeSubtitle}>{route.subtitle}</Text>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <MaterialIcons
                      name="straighten"
                      size={16}
                      color="#304FFE"
                    />
                    <Text style={styles.metricText}>{route.distance}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <MaterialIcons name="schedule" size={16} color="#304FFE" />
                    <Text style={styles.metricText}>{route.duration}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <MaterialIcons name="terrain" size={16} color="#304FFE" />
                    <Text style={styles.metricText}>{route.highlight}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.routeButton}>
                  <Text style={styles.routeButtonText}>View detail</Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 경로 결과 지도 모달 */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.mapHeader}>
            <TouchableOpacity
              onPress={() => setShowMap(false)}
              style={styles.mapCloseButton}
            >
              <MaterialIcons name="close" size={24} color="#1A1F2E" />
            </TouchableOpacity>
            <View style={styles.mapHeaderInfo}>
              <Text style={styles.mapHeaderTitle}>경로 안내</Text>
              {routeResult && (
                <Text style={styles.mapHeaderSubtitle}>
                  {(routeResult.totalDistance / 1000).toFixed(2)}km ·{' '}
                  {Math.round(routeResult.totalTime / 60)}분
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.mapStartButton}>
              <Text style={styles.mapStartText}>시작</Text>
            </TouchableOpacity>
          </View>

          {routeResult && (
            <KakaoMapWithRoute
              jsKey={KAKAO_JS_KEY}
              startLat={37.5665}
              startLng={126.978}
              endLat={37.5511}
              endLng={126.9882}
              paths={routeResult.paths}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  wrapper: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1E21',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#667085',
  },
  recentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(48,79,254,0.1)',
    borderRadius: 999,
  },
  recentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#304FFE',
  },
  card: {
    backgroundColor: '#F7F8FF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C6675',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#1C1E21',
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 250,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultText: {
    flex: 1,
    gap: 4,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1E21',
  },
  searchResultAddress: {
    fontSize: 12,
    color: '#667085',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E6F2',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E6ECFF',
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#304FFE',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#304FFE',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F8',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C7383',
  },
  tabLabelActive: {
    color: '#1C1E21',
  },
  tabHelper: {
    fontSize: 11,
    color: '#9AA3B0',
  },
  tabHelperActive: {
    color: '#667085',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#F1F2F6',
  },
  filterChipActive: {
    backgroundColor: '#304FFE',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C7383',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  routeList: {
    gap: 18,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  routeContent: {
    padding: 18,
    gap: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
  },
  routeSubtitle: {
    fontSize: 13,
    color: '#667085',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(48,79,254,0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#304FFE',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    color: '#445160',
  },
  routeButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#304FFE',
  },
  routeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 지도 모달 스타일
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mapCloseButton: {
    padding: 8,
  },
  mapHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1F2E',
  },
  mapHeaderSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 2,
  },
  mapStartButton: {
    backgroundColor: '#304FFE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  mapStartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
