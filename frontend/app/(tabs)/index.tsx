import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import KakaoMapWithRoute from '@/components/KakaoMapWithRoute';
import { apiService } from '@/services/api';
import type { TransitRouteParams } from '@/services/api';
import { analyzeRouteSlope } from '@/services/elevationService';
import type { Itinerary, RouteElevationAnalysis, Leg } from '@/types/api';
import { searchPlaces, type PlaceSearchResult } from '@/services/placeSearchService';
import type { RoutePath } from '@/services/routeService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY_COLOR = '#2C6DE7';
const SECONDARY_TEXT = '#4A5968';
const LIGHT_BACKGROUND = '#F2F5FC';
const BORDER_COLOR = '#E6E9F2';

const SEARCH_BAR_HEIGHT = 240;
const BOTTOM_SHEET_MIN = 100;
const BOTTOM_SHEET_MAX = SCREEN_HEIGHT * 0.7;

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  totalTime: number;
  totalWalkTime: number;
  walkRatio: number;
  personalizedWalkTime: number;
  slopeAnalysis?: RouteElevationAnalysis | null;
  rawItinerary?: Itinerary | null;
  totalDistance?: number;
  legs?: Leg[];
}

const formatMinutes = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}초`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}분`;
  }
  return `${minutes}분 ${remainingSeconds}초`;
};

const extractRoutePath = (itinerary: Itinerary): RoutePath[] => {
  const coords: RoutePath[] = [];

  const pushCoord = (lat?: number, lng?: number) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const last = coords[coords.length - 1];
    if (!last || last.lat !== lat || last.lng !== lng) {
      coords.push({ lat, lng });
    }
  };

  if (!itinerary?.legs) {
    console.log('⚠️ No legs in itinerary');
    return coords;
  }

  console.log(`🗺️ Extracting route from ${itinerary.legs.length} legs`);

  itinerary.legs.forEach((leg, legIndex) => {
    console.log(`  Leg ${legIndex}: ${leg.mode}, steps: ${leg.steps?.length || 0}`);
    
    if (leg.steps && leg.steps.length > 0) {
      leg.steps.forEach((step, stepIndex) => {
        if (!step.linestring) {
          console.log(`    Step ${stepIndex}: No linestring`);
          return;
        }

        const pairs = step.linestring.trim().split(' ');
        console.log(`    Step ${stepIndex}: ${pairs.length} coordinate pairs`);

        pairs.forEach((pair) => {
          if (!pair) return;
          const parts = pair.split(',');
          if (parts.length !== 2) return;
          
          const [lngStr, latStr] = parts;
          if (!lngStr || !latStr) return;
          
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          pushCoord(lat, lng);
        });
      });
    } else {
      // steps가 없으면 시작점과 끝점만 추가
      console.log(`    Using start/end points only`);
      pushCoord(leg.start?.lat, leg.start?.lon);
      pushCoord(leg.end?.lat, leg.end?.lon);
    }
  });

  console.log(`✅ Extracted ${coords.length} total coordinates`);
  return coords;
};

const getModeIcon = (mode: string) => {
  switch (mode) {
    case 'WALK':
      return 'directions-walk';
    case 'BUS':
      return 'directions-bus';
    case 'SUBWAY':
      return 'subway';
    case 'TRAIN':
      return 'train';
    default:
      return 'directions';
  }
};

const getModeColor = (mode: string) => {
  switch (mode) {
    case 'WALK':
      return '#4CAF50';
    case 'BUS':
      return '#FF9800';
    case 'SUBWAY':
      return '#2196F3';
    case 'TRAIN':
      return '#9C27B0';
    default:
      return PRIMARY_COLOR;
  }
};

const getModeLabel = (mode: string) => {
  switch (mode) {
    case 'WALK':
      return '도보';
    case 'BUS':
      return '버스';
    case 'SUBWAY':
      return '지하철';
    case 'TRAIN':
      return '기차';
    default:
      return '이동';
  }
};

export default function HomeScreen() {
  // 기본 상태
  const [startLocation, setStartLocation] = useState<LocationData | null>(null);
  const [endLocation, setEndLocation] = useState<LocationData | null>(null);
  const [routePath, setRoutePath] = useState<RoutePath[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 경로 옵션 관련 상태 (여러 경로)
  const [routeOptions, setRouteOptions] = useState<Itinerary[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // 검색 관련 상태
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // UI 상태
  const [searchBarVisible, setSearchBarVisible] = useState(true);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [showRouteList, setShowRouteList] = useState(true); // 경로 목록 표시 여부

  // 애니메이션
  const searchBarTranslateY = useSharedValue(0);
  const bottomSheetHeight = useSharedValue(0);
  const bottomSheetTranslateY = useRef(0);

  // 검색창 Pan Responder
  const searchPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          // 위로 드래그 - 숨기기
          searchBarTranslateY.value = Math.max(gestureState.dy, -SEARCH_BAR_HEIGHT);
        } else {
          // 아래로 드래그 - 보이기
          searchBarTranslateY.value = Math.min(gestureState.dy, 0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          // 위로 50px 이상 드래그하면 숨김
          searchBarTranslateY.value = withSpring(-SEARCH_BAR_HEIGHT, {
            damping: 20,
            stiffness: 90,
          });
          runOnJS(setSearchBarVisible)(false);
        } else {
          // 원위치
          searchBarTranslateY.value = withSpring(0, {
            damping: 20,
            stiffness: 90,
          });
          runOnJS(setSearchBarVisible)(true);
        }
      },
    })
  ).current;

  // 바텀시트 Pan Responder
  const bottomPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = bottomSheetHeight.value - gestureState.dy;
        if (newHeight >= BOTTOM_SHEET_MIN && newHeight <= BOTTOM_SHEET_MAX) {
          bottomSheetHeight.value = newHeight;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // 아래로 100px 이상 드래그하면 최소화
          bottomSheetHeight.value = withSpring(BOTTOM_SHEET_MIN, {
            damping: 20,
            stiffness: 90,
          });
        } else if (gestureState.dy < -100) {
          // 위로 100px 이상 드래그하면 최대화
          bottomSheetHeight.value = withSpring(BOTTOM_SHEET_MAX, {
            damping: 20,
            stiffness: 90,
          });
        }
      },
    })
  ).current;

  // 현재 위치 가져오기
  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '위치 권한이 필요합니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationData: LocationData = {
        address: address ? `${address.city || ''} ${address.district || ''}`.trim() || '현재 위치' : '현재 위치',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (activeInput === 'start') {
        setStartLocation(locationData);
        setStartInput(locationData.address);
        setSearchResults([]);
        setActiveInput(null);
      } else if (activeInput === 'end') {
        setEndLocation(locationData);
        setEndInput(locationData.address);
        setSearchResults([]);
        setActiveInput(null);
      }

      Alert.alert('위치 설정 완료', locationData.address);
    } catch (error) {
      console.error('위치 가져오기 실패:', error);
      Alert.alert('오류', '현재 위치를 가져올 수 없습니다.');
    }
  }, [activeInput]);

  // 장소 검색
  const handleSearch = useCallback(async (query: string, inputType: 'start' | 'end') => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchPlaces(query.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('검색 실패:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // 검색어 변경 핸들러
  useEffect(() => {
    if (activeInput === 'start' && startInput) {
      const timer = setTimeout(() => {
        handleSearch(startInput, 'start');
      }, 300);
      return () => clearTimeout(timer);
    } else if (activeInput === 'end' && endInput) {
      const timer = setTimeout(() => {
        handleSearch(endInput, 'end');
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [startInput, endInput, activeInput, handleSearch]);

  // 검색 결과 선택
  const handleSelectPlace = useCallback((place: PlaceSearchResult) => {
    const locationData: LocationData = {
      address: place.place_name,
      latitude: parseFloat(place.y),
      longitude: parseFloat(place.x),
    };

    if (activeInput === 'start') {
      setStartLocation(locationData);
      setStartInput(place.place_name);
    } else if (activeInput === 'end') {
      setEndLocation(locationData);
      setEndInput(place.place_name);
    }

    setSearchResults([]);
    setActiveInput(null);
  }, [activeInput]);

  // 출발지/도착지 교환
  const handleSwapLocations = () => {
    const tempLocation = startLocation;
    const tempInput = startInput;
    setStartLocation(endLocation);
    setStartInput(endInput);
    setEndLocation(tempLocation);
    setEndInput(tempInput);
  };

  // 경로 검색
  const handleSearchRoute = async () => {
    if (!startLocation || !endLocation) {
      Alert.alert('알림', '출발지와 도착지를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setSearchResults([]);
      setActiveInput(null);

      const params: TransitRouteParams = {
        start_x: startLocation.longitude,
        start_y: startLocation.latitude,
        end_x: endLocation.longitude,
        end_y: endLocation.latitude,
        lang: 0,
        format: 'json',
        count: 10, // 최대 10개 경로 요청
      };

      console.log('🔍 Transit API Request:', params);
      const response = await apiService.getTransitRoute(params);
      console.log('📦 Full API Response:', JSON.stringify(response.data, null, 2));

      const itineraries = response.data?.metaData?.plan?.itineraries || [];
      console.log(`🗺️ Received ${itineraries.length} route options`);

      if (itineraries.length === 0) {
        Alert.alert('경로 없음', '경로를 찾을 수 없습니다.');
        return;
      }

      // 모든 경로 옵션 저장
      setRouteOptions(itineraries);
      setSelectedRouteIndex(0);
      setShowRouteList(true);

      // 첫 번째 경로 표시
      const firstItinerary = itineraries[0];
      console.log('🗺️ First itinerary structure:', JSON.stringify(firstItinerary, null, 2).substring(0, 1000));
      console.log('🗺️ Processing itinerary with', firstItinerary.legs?.length || 0, 'legs');
      
      // 각 leg의 구조 상세 로깅
      firstItinerary.legs?.forEach((leg: any, idx: number) => {
        console.log(`  Leg ${idx}:`);
        console.log(`    - mode: ${leg.mode}`);
        console.log(`    - steps: ${leg.steps?.length || 0}`);
        if (leg.steps && leg.steps.length > 0) {
          leg.steps.forEach((step: any, stepIdx: number) => {
            console.log(`      Step ${stepIdx}:`);
            console.log(`        - linestring exists: ${!!step.linestring}`);
            if (step.linestring) {
              const coords = step.linestring.trim().split(' ');
              console.log(`        - coord count: ${coords.length}`);
              console.log(`        - first coord: ${coords[0]}`);
              console.log(`        - last coord: ${coords[coords.length - 1]}`);
            }
          });
        }
      });
      
      const path = extractRoutePath(firstItinerary);
      console.log('✅ Route path extracted:', path.length, 'coordinates');
      if (path.length > 0) {
        console.log('  First coord:', path[0]);
        console.log('  Last coord:', path[path.length - 1]);
      }
      setRoutePath(path);

      const totalTimeSec = firstItinerary.totalTime || 0;
      const totalWalkTimeSec = firstItinerary.totalWalkTime || 0;

      // 경사도 분석 (에러 시 무시)
      let slopeAnalysis: RouteElevationAnalysis | null = null;
      try {
        slopeAnalysis = await analyzeRouteSlope(firstItinerary);
      } catch (error) {
        console.warn('⚠️ 경사도 분석 실패 (경로는 정상 표시):', error);
      }

      setRouteInfo({
        totalTime: totalTimeSec,
        totalWalkTime: totalWalkTimeSec,
        walkRatio: totalTimeSec > 0 ? (totalWalkTimeSec / totalTimeSec) * 100 : 0,
        personalizedWalkTime: slopeAnalysis?.total_adjusted_walk_time || totalWalkTimeSec,
        slopeAnalysis,
        rawItinerary: firstItinerary,
        totalDistance: firstItinerary.totalDistance || 0,
        legs: firstItinerary.legs || [],
      });

      // 검색창 숨기기
      searchBarTranslateY.value = withSpring(-SEARCH_BAR_HEIGHT, {
        damping: 20,
        stiffness: 90,
      });
      setSearchBarVisible(false);

      // 바텀시트 올리기
      bottomSheetHeight.value = withSpring(BOTTOM_SHEET_MAX, {
        damping: 20,
        stiffness: 90,
      });
    } catch (error) {
      console.error('❌ 경로 검색 실패:', error);
      Alert.alert('오류', '경로 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 경로 선택 함수
  const handleSelectRoute = useCallback((index: number) => {
    const selected = routeOptions[index];
    setSelectedRouteIndex(index);

    const path = extractRoutePath(selected);
    setRoutePath(path);

    const totalTimeSec = selected.totalTime || 0;
    const totalWalkTimeSec = selected.totalWalkTime || 0;

    setRouteInfo({
      totalTime: totalTimeSec,
      totalWalkTime: totalWalkTimeSec,
      walkRatio: totalTimeSec > 0 ? (totalWalkTimeSec / totalTimeSec) * 100 : 0,
      personalizedWalkTime: totalWalkTimeSec,
      slopeAnalysis: null,
      rawItinerary: selected,
      totalDistance: selected.totalDistance || 0,
      legs: selected.legs || [],
    });

    setShowRouteList(false);
    setShowRouteDetails(false);
  }, [routeOptions]);

  const animatedSearchBarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: searchBarTranslateY.value }],
    };
  });

  const animatedBottomSheetStyle = useAnimatedStyle(() => {
    return {
      height: bottomSheetHeight.value,
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* 지도 (전체 화면) */}
      <View style={styles.mapContainer}>
        <KakaoMapWithRoute
          jsKey="d377e8ba6e5edd8176c63a3f97c9e17b"
          startLat={startLocation?.latitude || 37.5665}
          startLng={startLocation?.longitude || 126.978}
          endLat={endLocation?.latitude || 37.5665}
          endLng={endLocation?.longitude || 126.978}
          paths={routePath}
        />
      </View>

      {/* 검색창 보이기 버튼 (숨겨져 있을 때) */}
      {!searchBarVisible && (
        <TouchableOpacity
          style={styles.showSearchButton}
          onPress={() => {
            searchBarTranslateY.value = withSpring(0, {
              damping: 20,
              stiffness: 90,
            });
            setSearchBarVisible(true);
          }}
        >
          <MaterialIcons name="search" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* 검색창 (드래그 가능) */}
      <Animated.View
        style={[styles.searchOverlay, animatedSearchBarStyle]}
        {...searchPanResponder.panHandlers}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.dragHandle}>
            <View style={styles.dragBar} />
          </View>
          
          <View style={styles.searchContainer}>
            {/* 출발지 */}
            <View style={styles.searchRow}>
              <View style={styles.searchIconContainer}>
                <View style={[styles.dot, styles.startDot]} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="출발지를 입력하세요"
                placeholderTextColor="#999"
                value={startInput}
                onChangeText={setStartInput}
                onFocus={() => setActiveInput('start')}
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
                onPress={handleSwapLocations}
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
                placeholderTextColor="#999"
                value={endInput}
                onChangeText={setEndInput}
                onFocus={() => setActiveInput('end')}
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
              onPress={handleSearchRoute}
              disabled={!startLocation || !endLocation || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialIcons name="search" size={22} color="white" />
                  <Text style={styles.searchButtonText}>경로 검색</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 검색 결과 리스트 */}
          {activeInput && (startInput || endInput) && searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
                {searching ? (
                  <View style={styles.searchingIndicator}>
                    <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                    <Text style={styles.searchingText}>검색 중...</Text>
                  </View>
                ) : (
                  searchResults.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectPlace(place)}
                    >
                      <View style={styles.resultIconContainer}>
                        <MaterialIcons name="place" size={24} color={PRIMARY_COLOR} />
                      </View>
                      <View style={styles.resultTextContainer}>
                        <Text style={styles.resultPlaceName}>{place.place_name}</Text>
                        <Text style={styles.resultAddress}>
                          {place.road_address_name || place.address_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>

      {/* 바텀시트 (경로 정보) - 드래그 가능 */}
      {routeInfo && (
        <Animated.View
          style={[styles.bottomSheet, animatedBottomSheetStyle]}
        >
          <View {...bottomPanResponder.panHandlers} style={styles.bottomSheetHandle}>
            <View style={styles.dragBar} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.bottomSheetContent}>
            {/* 경로 목록 (여러 경로 옵션) */}
            {showRouteList && routeOptions.length > 0 && (
              <View>
                <Text style={styles.routeListTitle}>
                  경로 옵션 ({routeOptions.length}개)
                </Text>
                {routeOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.routeOptionItem,
                      selectedRouteIndex === index && styles.routeOptionItemSelected,
                    ]}
                    onPress={() => handleSelectRoute(index)}
                  >
                    <View style={styles.routeOptionHeader}>
                      <Text style={styles.routeOptionNumber}>경로 {index + 1}</Text>
                      {selectedRouteIndex === index && (
                        <MaterialIcons name="check-circle" size={20} color={PRIMARY_COLOR} />
                      )}
                    </View>
                    <View style={styles.routeOptionStats}>
                      <View style={styles.routeOptionStat}>
                        <MaterialIcons name="schedule" size={16} color={SECONDARY_TEXT} />
                        <Text style={styles.routeOptionStatText}>
                          {formatMinutes(option.totalTime || 0)}
                        </Text>
                      </View>
                      <View style={styles.routeOptionStat}>
                        <MaterialIcons name="directions-walk" size={16} color={SECONDARY_TEXT} />
                        <Text style={styles.routeOptionStatText}>
                          {formatMinutes(option.totalWalkTime || 0)}
                        </Text>
                      </View>
                      <View style={styles.routeOptionStat}>
                        <MaterialIcons name="straighten" size={16} color={SECONDARY_TEXT} />
                        <Text style={styles.routeOptionStatText}>
                          {((option.totalDistance || 0) / 1000).toFixed(1)}km
                        </Text>
                      </View>
                    </View>
                    {/* 경로 미리보기 (버스/지하철) */}
                    <View style={styles.routePreview}>
                      {option.legs?.map((leg, legIdx) => {
                        if (leg.mode === 'WALK') return null;
                        return (
                          <View key={legIdx} style={styles.routePreviewItem}>
                            <MaterialIcons
                              name={getModeIcon(leg.mode) as any}
                              size={14}
                              color={getModeColor(leg.mode)}
                            />
                            <Text style={styles.routePreviewText}>
                              {leg.route || getModeLabel(leg.mode)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.hideRouteListButton}
                  onPress={() => setShowRouteList(false)}
                >
                  <Text style={styles.hideRouteListButtonText}>선택한 경로 보기</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 요약 정보 */}
            {!showRouteDetails && !showRouteList && (
              <TouchableOpacity
                style={styles.routeSummary}
                onPress={() => setShowRouteDetails(true)}
              >
                <View style={styles.routeInfoHeader}>
                  <MaterialIcons name="directions" size={24} color={PRIMARY_COLOR} />
                  <Text style={styles.routeInfoTitle}>추천 경로</Text>
                  <MaterialIcons name="chevron-right" size={24} color={SECONDARY_TEXT} />
                </View>

                <View style={styles.routeStats}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="straighten" size={20} color={SECONDARY_TEXT} />
                    <Text style={styles.statValue}>
                      {((routeInfo.totalDistance || 0) / 1000).toFixed(1)}km
                    </Text>
                    <Text style={styles.statLabel}>거리</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <MaterialIcons name="schedule" size={20} color={SECONDARY_TEXT} />
                    <Text style={styles.statValue}>{formatMinutes(routeInfo.totalTime)}</Text>
                    <Text style={styles.statLabel}>총 시간</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <MaterialIcons name="directions-walk" size={20} color={SECONDARY_TEXT} />
                    <Text style={styles.statValue}>{formatMinutes(routeInfo.totalWalkTime)}</Text>
                    <Text style={styles.statLabel}>도보 시간</Text>
                  </View>
                </View>

                {/* 경로 목록 다시 보기 버튼 */}
                {routeOptions.length > 1 && (
                  <TouchableOpacity
                    style={styles.showRouteListButton}
                    onPress={() => setShowRouteList(true)}
                  >
                    <MaterialIcons name="list" size={20} color={PRIMARY_COLOR} />
                    <Text style={styles.showRouteListButtonText}>
                      다른 경로 보기 ({routeOptions.length}개)
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}

            {/* 상세 경로 정보 (카카오맵 스타일) */}
            {showRouteDetails && routeInfo.legs && (
              <View>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowRouteDetails(false)}
                >
                  <MaterialIcons name="arrow-back" size={24} color={PRIMARY_COLOR} />
                  <Text style={styles.backButtonText}>돌아가기</Text>
                </TouchableOpacity>

                <Text style={styles.routeDetailsTitle}>상세 경로</Text>

                {routeInfo.legs.map((leg, index) => (
                  <View key={index} style={styles.legItem}>
                    <View style={styles.legHeader}>
                      <View
                        style={[
                          styles.legIconContainer,
                          { backgroundColor: `${getModeColor(leg.mode)}20` },
                        ]}
                      >
                        <MaterialIcons
                          name={getModeIcon(leg.mode) as any}
                          size={24}
                          color={getModeColor(leg.mode)}
                        />
                      </View>
                      <View style={styles.legInfo}>
                        <Text style={styles.legMode}>{getModeLabel(leg.mode)}</Text>
                        <Text style={styles.legRoute}>
                          {leg.start?.name || '출발'} → {leg.end?.name || '도착'}
                        </Text>
                      </View>
                      <View style={styles.legStats}>
                        <Text style={styles.legTime}>{formatMinutes(leg.sectionTime || 0)}</Text>
                        <Text style={styles.legDistance}>
                          {((leg.distance || 0) / 1000).toFixed(1)}km
                        </Text>
                      </View>
                    </View>

                    {/* 버스/지하철 노선 정보 */}
                    {(leg.mode === 'BUS' || leg.mode === 'SUBWAY') && leg.route && (
                      <View style={styles.routeInfo}>
                        <Text style={styles.routeName}>{leg.route}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  showSearchButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#222',
  },
  currentLocationButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LIGHT_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButtonContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  swapButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: LIGHT_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LIGHT_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  searchResultsContainer: {
    maxHeight: 250,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchResultsList: {
    maxHeight: 250,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  searchingText: {
    fontSize: 14,
    color: SECONDARY_TEXT,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  resultIconContainer: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
    gap: 4,
  },
  resultPlaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultAddress: {
    fontSize: 13,
    color: SECONDARY_TEXT,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  routeSummary: {
    gap: 16,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeInfoTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1D2A3B',
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: LIGHT_BACKGROUND,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2A3B',
  },
  statLabel: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: BORDER_COLOR,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  routeDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2A3B',
    marginBottom: 16,
  },
  legItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legInfo: {
    flex: 1,
    gap: 4,
  },
  legMode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D2A3B',
  },
  legRoute: {
    fontSize: 13,
    color: SECONDARY_TEXT,
  },
  legStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  legTime: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  legDistance: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  routeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  // 경로 목록 스타일
  routeListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2A3B',
    marginBottom: 16,
  },
  routeOptionItem: {
    padding: 16,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeOptionItemSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  routeOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeOptionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2A3B',
  },
  routeOptionStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  routeOptionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeOptionStatText: {
    fontSize: 14,
    color: SECONDARY_TEXT,
  },
  routePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  routePreviewText: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  hideRouteListButton: {
    marginTop: 8,
    padding: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    alignItems: 'center',
  },
  hideRouteListButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  showRouteListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
  },
  showRouteListButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
});
