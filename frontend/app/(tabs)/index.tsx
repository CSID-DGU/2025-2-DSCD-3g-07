import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
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
import {
  searchPlaces,
  type PlaceSearchResult,
} from '@/services/placeSearchService';
import type { RoutePath } from '@/services/routeService';
import { useWeatherContext } from '@/contexts/WeatherContext';
import { useAuth } from '@/contexts/AuthContext';
import { healthConnectService } from '@/services/healthConnect';
import { locationService, type CurrentLocation } from '@/services/locationService';
import { saveNavigationLog, extractNavigationLogData } from '@/services/navigationLogService';
import { movementTrackingService } from '@/services/movementTrackingService';
import WeatherButton from '@/components/WeatherButton';
import { useRouter } from 'expo-router';
import {
  initializePermissions,
  ensureNavigationPermissions,
  type PermissionCheckResult
} from '@/utils/permissionUtils';

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

  // 경로 좌표 추출
  itinerary.legs.forEach((leg, legIndex) => {
    // 🔥 핵심: passShape 먼저 확인! (대중교통 구간용)
    if (leg.passShape && leg.passShape.linestring) {
      const pairs = leg.passShape.linestring.trim().split(' ');
      pairs.forEach((pair: string) => {
        if (!pair) return;
        const parts = pair.split(',');
        if (parts.length !== 2) return;

        const [lngStr, latStr] = parts;
        if (!lngStr || !latStr) return;

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        pushCoord(lat, lng);
      });
    }
    // 도보 구간의 steps 처리
    else if (leg.steps && leg.steps.length > 0) {
      leg.steps.forEach((step, stepIndex) => {
        if (!step.linestring) return;

        const pairs = step.linestring.trim().split(' ');
        pairs.forEach(pair => {
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
    }
    // fallback: start/end만 있는 경우
    else if (leg.start && leg.end) {
      pushCoord(leg.start?.lat, leg.start?.lon);
      pushCoord(leg.end?.lat, leg.end?.lon);
    }
  });

  console.log(`✅ 경로 좌표 추출: ${coords.length}개`);
  return coords;
};

// 🆕 각 leg별로 좌표를 추출하는 함수 (지도 표시용)
const extractLegsWithCoords = (itinerary: Itinerary): Array<Leg & { coords: RoutePath[] }> => {
  if (!itinerary?.legs) return [];

  return itinerary.legs.map((leg, legIndex) => {
    const coords: RoutePath[] = [];

    const pushCoord = (lat?: number, lng?: number) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const last = coords[coords.length - 1];
      if (!last || last.lat !== lat || last.lng !== lng) {
        coords.push({ lat, lng });
      }
    };

    // passShape 먼저 확인 (대중교통 구간)
    if (leg.passShape && leg.passShape.linestring) {
      const pairs = leg.passShape.linestring.trim().split(' ');
      pairs.forEach((pair: string) => {
        if (!pair) return;
        const parts = pair.split(',');
        if (parts.length !== 2) return;

        const [lngStr, latStr] = parts;
        if (!lngStr || !latStr) return;

        pushCoord(parseFloat(latStr), parseFloat(lngStr));
      });
    }
    // 도보 구간의 steps 처리
    else if (leg.steps && leg.steps.length > 0) {
      leg.steps.forEach((step) => {
        if (!step.linestring) return;

        const pairs = step.linestring.trim().split(' ');
        pairs.forEach(pair => {
          if (!pair) return;
          const parts = pair.split(',');
          if (parts.length !== 2) return;

          const [lngStr, latStr] = parts;
          if (!lngStr || !latStr) return;

          pushCoord(parseFloat(latStr), parseFloat(lngStr));
        });
      });
    }
    // fallback: start/end만 있는 경우
    else if (leg.start && leg.end) {
      pushCoord(leg.start?.lat, leg.start?.lon);
      pushCoord(leg.end?.lat, leg.end?.lon);
    }

    return {
      ...leg,
      coords,
    };
  });
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
  // 날씨 Context 사용
  const { weatherData } = useWeatherContext();

  // 인증 Context 사용
  const { user } = useAuth();

  // Router
  const router = useRouter();

  // 기본 상태
  const [startLocation, setStartLocation] = useState<LocationData | null>(null);
  const [endLocation, setEndLocation] = useState<LocationData | null>(null);
  const [routePath, setRoutePath] = useState<RoutePath[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [walkingSpeedCase1, setWalkingSpeedCase1] = useState<number | null>(
    null
  );
  const [walkingSpeedCase2, setWalkingSpeedCase2] = useState<number | null>(
    null
  );

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
  const [routeMode, setRouteMode] = useState<'transit' | 'walking'>('transit'); // 경로 모드 (대중교통 / 도보)

  // 현재 위치 추적 상태
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [centerOnLocation, setCenterOnLocation] = useState(false);
  const [trackingMode, setTrackingMode] = useState(false); // 실시간 추적 모드

  // 안내 시작/종료 상태
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationStartTime, setNavigationStartTime] = useState<Date | null>(null);
  const [navigationLog, setNavigationLog] = useState<any[]>([]);

  // 애니메이션
  const searchBarTranslateY = useSharedValue(0);
  const bottomSheetHeight = useSharedValue(0);

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
          searchBarTranslateY.value = Math.max(
            gestureState.dy,
            -SEARCH_BAR_HEIGHT
          );
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

  // 앱 첫 실행 시 권한 초기화 (통합 권한 유틸리티 사용)
  useEffect(() => {
    const initPermissions = async () => {
      try {
        console.log('📋 앱 시작 - 권한 초기화 중...');
        const result = await initializePermissions();

        if (result.allGranted) {
          console.log('✅ 모든 권한 허용됨');
        } else {
          console.log(`⚠️ 일부 권한 누락: ${result.missingPermissions.join(', ')}`);
        }
      } catch (error) {
        console.warn('⚠️ 권한 초기화 실패:', error);
      }
    };

    initPermissions();
  }, []);

  // DB에서 사용자 보행 속도 가져오기 함수 (재사용 가능)
  const fetchWalkingSpeed = async () => {
    try {
      const result = await apiService.getSpeedProfile();
      if (result.data?.speed_case1) {
        // km/h를 m/s로 변환
        const speedMs1 = result.data.speed_case1 / 3.6;
        setWalkingSpeedCase1(speedMs1);
        console.log(
          `✅ 보행 속도 로드 (Case1): ${result.data.speed_case1.toFixed(2)} km/h (${speedMs1.toFixed(3)} m/s)`
        );
      }
      if (result.data?.speed_case2) {
        const speedMs2 = result.data.speed_case2 / 3.6;
        setWalkingSpeedCase2(speedMs2);
        console.log(
          `✅ 보행 속도 로드 (Case2): ${result.data.speed_case2.toFixed(2)} km/h (${speedMs2.toFixed(3)} m/s)`
        );
      }
    } catch (error) {
      // 로그인하지 않은 경우 조용히 무시 (기본값 사용)
      console.log('ℹ️ 로그인 필요 - 기본 속도 사용');
    }
  };

  // 컴포넌트 마운트 시 속도 로드
  useEffect(() => {
    fetchWalkingSpeed();
  }, []);

  // 컴포넌트 언마운트 시 위치 추적 중지
  useEffect(() => {
    return () => {
      locationService.stopTracking();
    };
  }, []);

  // 현재 위치 추적 버튼 핸들러
  const handleCurrentLocationPress = async () => {
    if (isTracking) {
      // 추적 중지
      locationService.stopTracking();
      setIsTracking(false);
      setTrackingMode(false); // 추적 모드 해제
      setCurrentLocation(null);
      Alert.alert('위치 추적 중지', '실시간 위치 추적이 중지되었습니다.');
    } else {
      // 추적 시작
      const success = await locationService.startTracking((location) => {
        setCurrentLocation(location);
        console.log('📍 위치 업데이트:', location);
      });

      if (success) {
        setIsTracking(true);
        setCenterOnLocation(true);  // 첫 번째는 중심 이동
        setTrackingMode(true); // 추적 모드 활성화

        // 1초 후 일회성 중심 이동 플래그 해제 (추적 모드는 유지)
        setTimeout(() => setCenterOnLocation(false), 1000);

        Alert.alert(
          '위치 추적 시작',
          '실시간 위치 추적이 시작되었습니다.\n\n• 5m 이상 이동 시 지도가 따라갑니다\n• 지도를 움직이면 추적이 일시 중지되고\n  3초 후 자동으로 다시 추적합니다'
        );
      } else {
        Alert.alert('위치 추적 실패', '위치 권한을 확인해주세요.');
      }
    }
  };

  // 현재 위치 가져오기
  const getCurrentLocation = useCallback(async () => {
    try {
      // 로딩 표시
      if (activeInput === 'start') {
        setStartInput('위치 검색 중...');
      } else if (activeInput === 'end') {
        setEndInput('위치 검색 중...');
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '위치 권한이 필요합니다.');
        if (activeInput === 'start') setStartInput('');
        else if (activeInput === 'end') setEndInput('');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // Balanced -> High로 변경
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // 상세 주소 포맷: 시 + 구 + 동 + 도로명/지번
      const detailedAddress = [
        address?.city,
        address?.district,
        address?.subregion || address?.street,
        address?.streetNumber || address?.name
      ]
        .filter(Boolean)
        .join(' ') || '현재 위치';

      const locationData: LocationData = {
        address: detailedAddress,
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
      if (activeInput === 'start') setStartInput('');
      else if (activeInput === 'end') setEndInput('');
    }
  }, [activeInput]);

  // 장소 검색
  const handleSearch = useCallback(
    async (query: string, inputType: 'start' | 'end') => {
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
    },
    []
  );

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
  const handleSelectPlace = useCallback(
    (place: PlaceSearchResult) => {
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
    },
    [activeInput]
  );

  // 출발지/도착지 교환
  const handleSwapLocations = () => {
    const tempLocation = startLocation;
    const tempInput = startInput;
    setStartLocation(endLocation);
    setStartInput(endInput);
    setEndLocation(tempLocation);
    setEndInput(tempInput);
  };

  // 안내 시작/종료 핸들러
  const handleNavigationToggle = async () => {
    if (isNavigating) {
      // 안내 종료
      const endTime = new Date();
      const duration = navigationStartTime
        ? (endTime.getTime() - navigationStartTime.getTime()) / 1000
        : 0;

      // 움직임 추적 중지 및 데이터 수집
      movementTrackingService.stopTracking();
      const trackingData = movementTrackingService.getCurrentData();

      console.log('📊 움직임 추적 데이터:', trackingData);

      // 로그 데이터 준비
      const log = {
        startTime: navigationStartTime,
        endTime,
        duration,
        route: routeInfo,
        startLocation,
        endLocation,
        routeMode,
        trackingData,
      };

      setNavigationLog(prev => [...prev, log]);
      console.log('📊 Navigation Log:', log);

      // 기본 결과 메시지 생성
      let resultMessage =
        `총 소요 시간: ${Math.floor(duration / 60)}분 ${Math.floor(duration % 60)}초\n` +
        `실제 걷기: ${Math.floor(trackingData.activeWalkingTime / 60)}분 ${trackingData.activeWalkingTime % 60}초\n` +
        `보행 멈춤 시간: ${Math.floor(trackingData.pausedTime / 60)}분 ${trackingData.pausedTime % 60}초\n` +
        `평균 속도: ${(trackingData.realSpeed * 3.6).toFixed(2)} km/h`;

      // DB에 저장 (로그인한 경우만)
      if (navigationStartTime && routeInfo && startLocation && endLocation && user) {
        try {
          const logData = await extractNavigationLogData(
            routeInfo,
            startLocation,
            endLocation,
            routeMode,
            navigationStartTime,
            endTime,
            weatherData, // 날씨 데이터 전달
            trackingData // 움직임 추적 데이터 전달
          );

          const savedLog = await saveNavigationLog(user.user_id, logData);
          console.log('✅ 네비게이션 로그 저장 완료:', savedLog);

          // 🔔 예측 시간과 실제 시간 차이 확인 (±20% 이상이면 알림)
          const estimatedTime = logData.estimated_time_seconds;
          const actualTime = logData.actual_time_seconds;
          const timeDifference = Math.abs(actualTime - estimatedTime);
          const differencePercent = (timeDifference / estimatedTime) * 100;

          const hasSignificantDifference = differencePercent >= 20;

          // 5분 이상 걸었고 차이가 크면 자동 업데이트 알림 추가
          if (hasSignificantDifference && trackingData.activeWalkingTime >= 300) {
            resultMessage += `\n\n⚠️ 예상 시간과 ${differencePercent.toFixed(0)}% 차이가 발생했습니다.\n실제 속도를 반영하여 다음 예측을 개선합니다.`;
          }

          // 🔄 속도 프로필 새로고침 (백엔드에서 업데이트된 값 가져오기)
          await fetchWalkingSpeed();
          console.log('🔄 속도 프로필 새로고침 완료');
        } catch (error) {
          console.error('❌ 네비게이션 로그 저장 실패:', error);
          resultMessage += '\n\n⚠️ 서버 저장에 실패했습니다.\n데이터는 앱 내에만 임시 저장되었으며,\n앱을 종료하면 사라집니다.';
        }
      } else if (!user) {
        console.log('ℹ️ 로그인하지 않아 네비게이션 로그를 저장하지 않습니다.');
        resultMessage += '\n\n💡 로그인하면 이동 기록이 저장됩니다.';
      }

      // 사용자에게 결과 표시
      if (navigationStartTime && routeInfo && startLocation && endLocation) {
        Alert.alert('안내 종료', resultMessage);
      } else {
        // navigationStartTime 등이 없는 경우
        Alert.alert(
          '안내 종료',
          `총 소요 시간: ${Math.floor(duration / 60)}분 ${Math.floor(duration % 60)}초\n` +
          `실제 걷기: ${Math.floor(trackingData.activeWalkingTime / 60)}분 ${trackingData.activeWalkingTime % 60}초\n` +
          `보행 멈춤 시간: ${Math.floor(trackingData.pausedTime / 60)}분 ${trackingData.pausedTime % 60}초\n` +
          `평균 속도: ${(trackingData.realSpeed * 3.6).toFixed(2)} km/h`
        );
      }

      // 위치 추적 중지
      if (isTracking) {
        locationService.stopTracking();
        setIsTracking(false);
        setTrackingMode(false); // 추적 모드 해제
        setCurrentLocation(null);
      }

      // 백그라운드 위치 추적 중지
      await locationService.stopBackgroundTracking();

      setIsNavigating(false);
      setNavigationStartTime(null);
    } else {
      // 안내 시작 전 권한 확인
      const hasPermissions = await ensureNavigationPermissions();
      if (!hasPermissions) {
        console.warn('⚠️ 필수 권한이 없어 안내를 시작할 수 없습니다.');
        return;
      }

      // 안내 시작
      setIsNavigating(true);
      setNavigationStartTime(new Date());

      // 위치 추적 자동 시작
      if (!isTracking) {
        locationService.startTracking((location) => {
          setCurrentLocation(location);
        });
        setIsTracking(true);
        setCenterOnLocation(true);
        setTrackingMode(true); // 추적 모드 활성화
        setTimeout(() => setCenterOnLocation(false), 1000);
      }

      // 백그라운드 위치 추적 시작
      const backgroundSuccess = await locationService.startBackgroundTracking();

      if (!backgroundSuccess) {
        console.warn('⚠️ 백그라운드 위치 추적을 시작할 수 없습니다. 포어그라운드 추적만 사용합니다.');
      }

      // 움직임 추적 시작
      try {
        await movementTrackingService.startTracking();
        Alert.alert(
          '안내 시작',
          backgroundSuccess
            ? '경로 안내 및 백그라운드 보행속도 측정이 시작되었습니다.\n\n앱을 백그라운드로 전환해도 위치 추적이 계속됩니다.'
            : '경로 안내 및 실제 보행속도 측정이 시작되었습니다.'
        );
      } catch (error) {
        console.error('❌ 움직임 추적 시작 실패:', error);
        Alert.alert('안내 시작', '경로 안내가 시작되었습니다. (보행속도 측정 비활성화)');
      }
    }
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
      setRouteMode('transit'); // 대중교통 모드 설정

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

      const itineraries = response.data?.metaData?.plan?.itineraries || [];
      console.log(`✅ 경로 ${itineraries.length}개 검색 완료`);

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
      const path = extractRoutePath(firstItinerary);
      setRoutePath(path);

      const totalTimeSec = firstItinerary.totalTime || 0;
      const totalWalkTimeSec = firstItinerary.totalWalkTime || 0;

      // 🔍 디버깅: leg별 sectionTime 확인
      const legWalkTimes =
        firstItinerary.legs
          ?.filter((leg: any) => leg.mode === 'WALK')
          .map((leg: any) => leg.sectionTime || 0) || [];
      const sumOfLegWalkTimes = legWalkTimes.reduce(
        (a: number, b: number) => a + b,
        0
      );

      console.log('🔍 [도보 시간 디버깅]');
      console.log(
        `  - totalWalkTime (API): ${totalWalkTimeSec}초 (${Math.floor(totalWalkTimeSec / 60)}분 ${totalWalkTimeSec % 60}초)`
      );
      console.log(
        `  - leg별 sectionTime 합계: ${sumOfLegWalkTimes}초 (${Math.floor(sumOfLegWalkTimes / 60)}분 ${sumOfLegWalkTimes % 60}초)`
      );
      console.log(`  - 차이: ${totalWalkTimeSec - sumOfLegWalkTimes}초`);
      console.log(`  - 개별 leg 시간:`, legWalkTimes);

      // 경사도 분석 (에러 시 무시)
      let slopeAnalysis: RouteElevationAnalysis | null = null;
      try {
        // 사용자 속도와 날씨 데이터를 함께 전달
        slopeAnalysis = await analyzeRouteSlope(
          firstItinerary,
          undefined, // apiKey
          walkingSpeedCase1 || undefined, // walkingSpeed (m/s) - Health Connect Case 1
          weatherData || undefined // 날씨 데이터
        );

        const logParts = ['✅ 경사도 분석 완료'];
        if (walkingSpeedCase1) {
          logParts.push(
            `사용자 속도: ${(walkingSpeedCase1 * 3.6).toFixed(2)} km/h`
          );
        }
        if (weatherData) {
          logParts.push(`날씨 포함`);
        }
        console.log(logParts.join(' - '));
      } catch (error) {
        console.warn('⚠️ 경사도 분석 실패 (경로는 정상 표시):', error);
      }

      setRouteInfo({
        totalTime: totalTimeSec,
        totalWalkTime: totalWalkTimeSec,
        walkRatio:
          totalTimeSec > 0 ? (totalWalkTimeSec / totalTimeSec) * 100 : 0,
        personalizedWalkTime:
          slopeAnalysis?.total_adjusted_walk_time || totalWalkTimeSec,
        slopeAnalysis,
        rawItinerary: firstItinerary,
        totalDistance: firstItinerary.totalDistance || 0,
        legs: extractLegsWithCoords(firstItinerary), // 각 leg에 coords 포함
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

  // 보행자 전용 경로 검색
  const handleSearchWalkingRoute = async () => {
    if (!startLocation || !endLocation) {
      Alert.alert('알림', '출발지와 도착지를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setSearchResults([]);
      setActiveInput(null);
      setRouteMode('walking'); // 도보 모드 설정

      const params = {
        start_x: startLocation.longitude,
        start_y: startLocation.latitude,
        end_x: endLocation.longitude,
        end_y: endLocation.latitude,
        start_name: startLocation.address,
        end_name: endLocation.address,
        user_speed_mps: walkingSpeedCase1 || undefined, // 사용자 보행속도 전달
        weather_data: weatherData || undefined, // 날씨 데이터 전달
      };

      console.log('🚶 Walking API Request:', params);
      const response = await apiService.getWalkingRoute(params);

      if (!response.data || response.data.type !== 'FeatureCollection') {
        Alert.alert('오류', '보행자 경로를 찾을 수 없습니다.');
        return;
      }

      // GeoJSON features에서 경로 데이터 추출
      const features = response.data.features || [];
      const totalDistance = response.data.properties?.totalDistance || 0;
      const totalTime = response.data.properties?.totalTime || 0;

      // 경로 좌표 추출 (LineString features만)
      const coords: RoutePath[] = [];
      features.forEach((feature: any) => {
        if (
          feature.geometry?.type === 'LineString' &&
          feature.geometry?.coordinates
        ) {
          feature.geometry.coordinates.forEach(
            ([lng, lat]: [number, number]) => {
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                coords.push({ lat, lng });
              }
            }
          );
        }
      });

      console.log(
        `🗺️ Extracted ${coords.length} coordinates from walking route`
      );

      if (coords.length === 0) {
        Alert.alert('오류', '경로 좌표를 추출할 수 없습니다.');
        return;
      }

      setRoutePath(coords);

      // 백엔드 데이터 확인
      console.log('🔍 도보 경로 데이터:', {
        metaData: !!response.data?.metaData,
        itinerary: !!response.data?.metaData?.plan?.itineraries?.[0],
        steps:
          response.data?.metaData?.plan?.itineraries?.[0]?.legs?.[0]?.steps
            ?.length,
        crosswalk_count: response.data?.elevation_analysis?.crosswalk_count,
      });

      // 첫 3개 steps 확인
      const firstSteps =
        response.data?.metaData?.plan?.itineraries?.[0]?.legs?.[0]?.steps?.slice(
          0,
          3
        );
      console.log('🔍 첫 3개 steps:', firstSteps);

      // 백엔드에서 제공한 itinerary 사용 (이미 완전한 구조)
      const walkingItinerary: Itinerary = response.data?.metaData?.plan
        ?.itineraries?.[0] || {
        legs: [
          {
            mode: 'WALK',
            sectionTime: totalTime,
            distance: totalDistance,
            start: {
              lat: startLocation.latitude,
              lon: startLocation.longitude,
              name: startLocation.address,
            },
            end: {
              lat: endLocation.latitude,
              lon: endLocation.longitude,
              name: endLocation.address,
            },
            steps: [],
          },
        ],
        totalTime,
        totalWalkTime: totalTime,
        totalDistance: totalDistance,
        totalWalkDistance: totalDistance,
        fare: {
          regular: {
            totalFare: 0,
            currency: { symbol: '₩', currency: 'KRW', currencyCode: 'KRW' },
          },
        },
      };

      // 백엔드에서 받은 경사도 분석 결과 사용
      const slopeAnalysis = response.data?.elevation_analysis || null;

      setRouteInfo({
        totalTime: totalTime,
        totalWalkTime: totalTime,
        walkRatio: 100, // 100% 도보
        personalizedWalkTime:
          slopeAnalysis?.total_adjusted_walk_time || totalTime,
        slopeAnalysis,
        rawItinerary: walkingItinerary,
        totalDistance: totalDistance,
        legs: extractLegsWithCoords(walkingItinerary), // 각 leg에 coords 포함
      });

      // 경로 옵션 초기화 (보행자 경로는 1개만)
      setRouteOptions([walkingItinerary]);
      setSelectedRouteIndex(0);
      setShowRouteList(false);
      setRouteMode('walking');

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
      console.error('❌ 보행자 경로 검색 실패:', error);
      Alert.alert('오류', '보행자 경로 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 경로 선택 함수
  const handleSelectRoute = useCallback(
    async (index: number) => {
      const selected = routeOptions[index];
      if (!selected) return;

      setSelectedRouteIndex(index);

      const path = extractRoutePath(selected);
      setRoutePath(path);

      const totalTimeSec = selected.totalTime || 0;
      const totalWalkTimeSec = selected.totalWalkTime || 0;

      // 선택한 경로에 대해서도 경사도 분석 수행
      let slopeAnalysis: RouteElevationAnalysis | null = null;
      try {
        slopeAnalysis = await analyzeRouteSlope(
          selected,
          undefined, // apiKey
          walkingSpeedCase1 || undefined,
          weatherData || undefined
        );
        console.log('✅ 선택한 경로 경사도 분석 완료:', slopeAnalysis);
      } catch (error) {
        console.error('❌ 경사도 분석 실패:', error);
      }

      setRouteInfo({
        totalTime: totalTimeSec,
        totalWalkTime: totalWalkTimeSec,
        walkRatio:
          totalTimeSec > 0 ? (totalWalkTimeSec / totalTimeSec) * 100 : 0,
        personalizedWalkTime:
          slopeAnalysis?.total_adjusted_walk_time || totalWalkTimeSec,
        slopeAnalysis,
        rawItinerary: selected,
        totalDistance: selected.totalDistance || 0,
        legs: extractLegsWithCoords(selected), // 각 leg에 coords 포함
      });

      setShowRouteList(false);
      setShowRouteDetails(false);
    },
    [routeOptions, weatherData, walkingSpeedCase1]
  );

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
          jsKey={process.env.EXPO_PUBLIC_KAKAO_JS_KEY || '9a91bb579fe8e58cc9e5e25d6a073869'}
          startLat={startLocation?.latitude || 37.5665}
          startLng={startLocation?.longitude || 126.978}
          endLat={endLocation?.latitude || 37.5665}
          endLng={endLocation?.longitude || 126.978}
          paths={routePath}
          routeMode={routeMode}
          currentLocation={currentLocation}
          centerOnCurrentLocation={centerOnLocation}
          trackingMode={trackingMode}
          legs={routeInfo?.legs}
        />
      </View>

      {/* 우하단 버튼 그룹 */}
      <View style={styles.bottomRightButtons}>
        {/* 현재 위치 추적 버튼 */}
        <TouchableOpacity
          style={[
            styles.currentLocationTrackButton,
            isTracking && styles.currentLocationTrackButtonActive
          ]}
          onPress={handleCurrentLocationPress}
        >
          <Ionicons
            name={isTracking ? "navigate" : "navigate-outline"}
            size={20}
            color={isTracking ? "#FFFFFF" : "#2C6DE7"}
          />
        </TouchableOpacity>

        {/* 날씨 버튼 */}
        <WeatherButton
          temperature={weatherData?.temp_c}
          weatherEmoji={
            weatherData?.pty === 1 ? '🌧️' : // 비
              weatherData?.pty === 2 ? '🌨️' : // 진눈깨비
                weatherData?.pty === 3 ? '❄️' : // 눈
                  '☀️' // 맑음
          }
          onPress={() => router.push('/weather')}
        />
      </View>

      {/* 위치 정보 표시 (디버깅용, 선택사항) */}
      {currentLocation && isTracking && (
        <View style={styles.locationInfoDebug}>
          <Text style={styles.locationDebugText}>
            📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
          {currentLocation.heading !== null && (
            <Text style={styles.locationDebugText}>
              🧭 {currentLocation.heading.toFixed(0)}°
            </Text>
          )}
          <Text style={styles.locationDebugText}>
            📏 ±{currentLocation.accuracy.toFixed(0)}m
          </Text>
        </View>
      )}

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
        <SafeAreaView edges={[]}>
          <View style={styles.dragHandle}>
            <View style={styles.dragBar} />
          </View>

          <View style={styles.searchContainer}>
            {/* 출발지/도착지 입력 그룹 */}
            <View style={styles.locationInputGroup}>
              {/* 좌측 아이콘 영역 */}
              <View style={styles.leftIconColumn}>
                <View style={[styles.dot, styles.startDot]} />
                <View style={styles.connectingLine} />
                <View style={[styles.dot, styles.endDot]} />
              </View>

              {/* 입력 필드 영역 */}
              <View style={styles.inputColumn}>
                {/* 출발지 */}
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="출발지를 입력하세요"
                    placeholderTextColor="#999"
                    value={startInput}
                    onChangeText={setStartInput}
                    onFocus={() => setActiveInput('start')}
                  />
                  {activeInput === 'start' && (
                    <TouchableOpacity
                      style={styles.inlineButton}
                      onPress={getCurrentLocation}
                    >
                      <MaterialIcons
                        name="my-location"
                        size={18}
                        color={PRIMARY_COLOR}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 도착지 */}
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="도착지를 입력하세요"
                    placeholderTextColor="#999"
                    value={endInput}
                    onChangeText={setEndInput}
                    onFocus={() => setActiveInput('end')}
                  />
                  {endInput.length > 0 && activeInput === 'end' && (
                    <TouchableOpacity
                      style={styles.inlineButton}
                      onPress={() => {
                        setEndInput('');
                        setEndLocation(null);
                      }}
                    >
                      <MaterialIcons
                        name="close"
                        size={18}
                        color={SECONDARY_TEXT}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 우측 교환 버튼 */}
              <TouchableOpacity
                style={styles.swapButton}
                onPress={handleSwapLocations}
              >
                <MaterialIcons
                  name="swap-vert"
                  size={24}
                  color={SECONDARY_TEXT}
                />
              </TouchableOpacity>
            </View>

            {/* 검색 버튼 */}
            <View style={styles.searchButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.searchButton,
                  styles.transitButton,
                  (!startLocation || !endLocation) &&
                  styles.searchButtonDisabled,
                ]}
                onPress={handleSearchRoute}
                disabled={!startLocation || !endLocation || loading}
              >
                {loading && routeMode === 'transit' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialIcons
                      name="directions-bus"
                      size={22}
                      color="white"
                    />
                    <Text style={styles.searchButtonText}>대중교통</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.searchButton,
                  styles.walkingButton,
                  (!startLocation || !endLocation) &&
                  styles.searchButtonDisabled,
                ]}
                onPress={handleSearchWalkingRoute}
                disabled={!startLocation || !endLocation || loading}
              >
                {loading && routeMode === 'walking' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialIcons
                      name="directions-walk"
                      size={22}
                      color="white"
                    />
                    <Text style={styles.searchButtonText}>도보</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 검색 결과 리스트 */}
          {activeInput &&
            (startInput || endInput) &&
            searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <ScrollView
                  style={styles.searchResultsList}
                  keyboardShouldPersistTaps="handled"
                >
                  {searching ? (
                    <View style={styles.searchingIndicator}>
                      <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                      <Text style={styles.searchingText}>검색 중...</Text>
                    </View>
                  ) : (
                    searchResults.map(place => (
                      <TouchableOpacity
                        key={place.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectPlace(place)}
                      >
                        <View style={styles.resultIconContainer}>
                          <MaterialIcons
                            name="place"
                            size={24}
                            color={PRIMARY_COLOR}
                          />
                        </View>
                        <View style={styles.resultTextContainer}>
                          <Text style={styles.resultPlaceName}>
                            {place.place_name}
                          </Text>
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
        <Animated.View style={[styles.bottomSheet, animatedBottomSheetStyle]}>
          <View
            {...bottomPanResponder.panHandlers}
            style={styles.bottomSheetHandle}
          >
            <View style={styles.dragBar} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.bottomSheetContent}
          >
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
                      selectedRouteIndex === index &&
                      styles.routeOptionItemSelected,
                    ]}
                    onPress={() => handleSelectRoute(index)}
                  >
                    <View style={styles.routeOptionHeader}>
                      <Text style={styles.routeOptionNumber}>
                        경로 {index + 1}
                      </Text>
                      {selectedRouteIndex === index && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={PRIMARY_COLOR}
                        />
                      )}
                    </View>
                    <View style={styles.routeOptionStats}>
                      <View style={styles.routeOptionStat}>
                        <MaterialIcons
                          name="schedule"
                          size={16}
                          color={SECONDARY_TEXT}
                        />
                        <Text style={styles.routeOptionStatText}>
                          {formatMinutes(option.totalTime || 0)}
                        </Text>
                      </View>
                      <View style={styles.routeOptionStat}>
                        <MaterialIcons
                          name="directions-walk"
                          size={16}
                          color={SECONDARY_TEXT}
                        />
                        <Text style={styles.routeOptionStatText}>
                          {formatMinutes(option.totalWalkTime || 0)}
                        </Text>
                      </View>
                      <View style={styles.routeOptionStat}>
                        <MaterialIcons
                          name="straighten"
                          size={16}
                          color={SECONDARY_TEXT}
                        />
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
                  <Text style={styles.hideRouteListButtonText}>
                    선택한 경로 보기
                  </Text>
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
                  <MaterialIcons
                    name="directions"
                    size={24}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.routeInfoTitle}>추천 경로</Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={SECONDARY_TEXT}
                  />
                </View>

                <View style={styles.routeStats}>
                  <View style={styles.statItem}>
                    <MaterialIcons
                      name="straighten"
                      size={20}
                      color={SECONDARY_TEXT}
                    />
                    <Text style={styles.statValue}>
                      {((routeInfo.totalDistance || 0) / 1000).toFixed(1)}km
                    </Text>
                    <Text style={styles.statLabel}>거리</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <MaterialIcons
                      name="schedule"
                      size={20}
                      color={SECONDARY_TEXT}
                    />
                    <Text style={styles.statValue}>
                      {formatMinutes(routeInfo.totalTime)}
                    </Text>
                    <Text style={styles.statLabel}>총 시간</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <MaterialIcons
                      name="directions-walk"
                      size={20}
                      color={SECONDARY_TEXT}
                    />
                    <Text style={styles.statValue}>
                      {routeInfo.slopeAnalysis?.total_original_walk_time
                        ? formatMinutes(
                          routeInfo.slopeAnalysis.total_original_walk_time
                        )
                        : formatMinutes(routeInfo.totalWalkTime)}
                    </Text>
                    <Text style={styles.statLabel}>도보 시간(보정 전)</Text>
                  </View>
                </View>

                {/* 안내 시작/종료 버튼 */}
                <TouchableOpacity
                  style={[
                    styles.navigationButton,
                    isNavigating && styles.navigationButtonActive
                  ]}
                  onPress={handleNavigationToggle}
                >
                  <MaterialIcons
                    name={isNavigating ? "stop" : "navigation"}
                    size={20}
                    color="white"
                  />
                  <Text style={styles.navigationButtonText}>
                    {isNavigating ? '안내 종료' : '안내 시작'}
                  </Text>
                </TouchableOpacity>

                {/* 보행 경로 분석 (통합) */}
                {routeInfo.slopeAnalysis &&
                  !routeInfo.slopeAnalysis.error &&
                  routeInfo.slopeAnalysis.walk_legs_analysis &&
                  routeInfo.slopeAnalysis.walk_legs_analysis.length > 0 && (
                    <View style={styles.slopeAnalysisContainer}>
                      <View style={styles.slopeAnalysisHeader}>
                        <MaterialIcons
                          name="analytics"
                          size={18}
                          color="#4F46E5"
                        />
                        <Text style={styles.slopeAnalysisTitle}>
                          보행 경로 분석
                        </Text>
                      </View>

                      {/* 상단 요약 정보 */}
                      <View style={styles.slopeStatsRow}>
                        <View style={styles.slopeStatItem}>
                          <Text style={styles.slopeStatLabel}>평균 경사</Text>
                          <Text style={styles.slopeStatValue}>
                            {(() => {
                              const legs =
                                routeInfo.slopeAnalysis.walk_legs_analysis;
                              if (!legs || legs.length === 0) {
                                return '0.0';
                              }
                              const totalDistance = legs.reduce(
                                (sum, leg) => sum + (leg.distance || 0),
                                0
                              );
                              if (totalDistance === 0) {
                                return '0.0';
                              }
                              const weightedSum = legs.reduce(
                                (sum, leg) =>
                                  sum +
                                  (leg.avg_slope || 0) * (leg.distance || 0),
                                0
                              );
                              return (weightedSum / totalDistance).toFixed(1);
                            })()}
                            %
                          </Text>
                        </View>

                        <View style={styles.slopeStatItem}>
                          <Text style={styles.slopeStatLabel}>총 보정</Text>
                          <Text
                            style={[
                              styles.slopeStatValue,
                              routeInfo.slopeAnalysis.total_adjusted_walk_time <
                                routeInfo.slopeAnalysis.total_original_walk_time
                                ? styles.slopeStatValueDecrease
                                : styles.slopeStatValueIncrease,
                            ]}
                          >
                            {(() => {
                              const impact =
                                routeInfo.slopeAnalysis.total_adjusted_walk_time -
                                routeInfo.slopeAnalysis.total_original_walk_time;
                              const sign = impact > 0 ? '+' : '-';
                              return `${sign}${Math.floor(Math.abs(impact) / 60)}분 ${Math.abs(impact) % 60}초`;
                            })()}
                          </Text>
                        </View>

                        <View style={styles.slopeStatItem}>
                          <Text style={styles.slopeStatLabel}>예상 시간</Text>
                          <Text style={styles.slopeStatValue}>
                            {Math.floor(
                              routeInfo.slopeAnalysis.total_adjusted_walk_time / 60
                            )}
                            분 {routeInfo.slopeAnalysis.total_adjusted_walk_time % 60}초
                          </Text>
                        </View>
                      </View>

                      {/* 순차 적용 분석 */}
                      <View style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTopWidth: 1,
                        borderTopColor: '#E6E9F2',
                      }}>
                        {/* 사용자 속도 */}
                        {routeInfo.slopeAnalysis.factors?.user_speed_factor && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                            paddingHorizontal: 8,
                          }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>🚶</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                fontSize: 13,
                                color: '#374151',
                                fontWeight: '500',
                              }}>
                                사용자 속도: {walkingSpeedCase1 ? (walkingSpeedCase1 * 3.6).toFixed(2) : '4.00'} km/h
                              </Text>
                              <Text style={{
                                fontSize: 12,
                                color: '#6B7280',
                                marginTop: 2,
                              }}>
                                → {(() => {
                                  const originalTime = routeInfo.slopeAnalysis.total_original_walk_time;
                                  const factor = routeInfo.slopeAnalysis.factors.user_speed_factor;
                                  const afterTime = Math.round(originalTime * factor);
                                  const impact = afterTime - originalTime;
                                  const sign = impact > 0 ? '+' : impact < 0 ? '-' : '';
                                  const percentage = (1 - factor) * 100;
                                  const percentSign = factor < 1 ? '-' : factor > 1 ? '+' : '';
                                  return `${Math.floor(afterTime / 60)}분 ${afterTime % 60}초 (${sign}${Math.floor(Math.abs(impact) / 60)}분 ${Math.abs(impact) % 60}초, ${percentSign}${Math.abs(percentage).toFixed(0)}%)`;
                                })()}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* 날씨 */}
                        {weatherData && routeInfo.slopeAnalysis.factors?.weather_factor && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                            paddingHorizontal: 8,
                          }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>🌤️</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                fontSize: 13,
                                color: '#374151',
                                fontWeight: '500',
                              }}>
                                날씨: {weatherData.temp_c}°C
                              </Text>
                              <Text style={{
                                fontSize: 12,
                                color: '#6B7280',
                                marginTop: 2,
                              }}>
                                → {(() => {
                                  const originalTime = routeInfo.slopeAnalysis.total_original_walk_time;
                                  const userFactor = routeInfo.slopeAnalysis.factors.user_speed_factor;
                                  const weatherFactor = routeInfo.slopeAnalysis.factors.weather_factor;
                                  const beforeTime = Math.round(originalTime * userFactor);
                                  const afterTime = Math.round(beforeTime * weatherFactor);
                                  const impact = afterTime - beforeTime;
                                  const sign = impact > 0 ? '+' : impact < 0 ? '-' : '';
                                  const percentage = (1 - weatherFactor) * 100;
                                  const percentSign = weatherFactor < 1 ? '-' : weatherFactor > 1 ? '+' : '';
                                  return `${Math.floor(afterTime / 60)}분 ${afterTime % 60}초 (${sign}${Math.floor(Math.abs(impact) / 60)}분 ${Math.abs(impact) % 60}초, ${percentSign}${Math.abs(percentage).toFixed(0)}%)`;
                                })()}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* 경사도 */}
                        {routeInfo.slopeAnalysis.factors?.slope_factor && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                            paddingHorizontal: 8,
                          }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>🏔️</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                fontSize: 13,
                                color: '#374151',
                                fontWeight: '500',
                              }}>
                                경사도: {(() => {
                                  const legs = routeInfo.slopeAnalysis.walk_legs_analysis;
                                  const totalDistance = legs.reduce((sum, leg) => sum + (leg.distance || 0), 0);
                                  const weightedSum = legs.reduce(
                                    (sum, leg) => sum + (leg.avg_slope || 0) * (leg.distance || 0),
                                    0
                                  );
                                  const avgSlope = totalDistance > 0 ? (weightedSum / totalDistance) : 0;
                                  return avgSlope > 0 ? `오르막 ${avgSlope.toFixed(1)}%` : avgSlope < 0 ? `내리막 ${Math.abs(avgSlope).toFixed(1)}%` : '평지';
                                })()}
                              </Text>
                              <Text style={{
                                fontSize: 12,
                                color: '#6B7280',
                                marginTop: 2,
                              }}>
                                → {(() => {
                                  const originalTime = routeInfo.slopeAnalysis.total_original_walk_time;
                                  const userFactor = routeInfo.slopeAnalysis.factors.user_speed_factor;
                                  const weatherFactor = routeInfo.slopeAnalysis.factors.weather_factor;
                                  const finalTime = routeInfo.slopeAnalysis.total_adjusted_walk_time;

                                  // 실제 적용된 경사도 계수를 역산 (정확한 값)
                                  const beforeTime = Math.round(originalTime * userFactor * weatherFactor);
                                  const actualSlopeFactor = beforeTime > 0 ? finalTime / beforeTime : 1.0;

                                  const afterTime = finalTime; // 실제 최종 시간 사용
                                  const impact = afterTime - beforeTime;
                                  const sign = impact > 0 ? '+' : impact < 0 ? '-' : '';
                                  const percentage = (1 - actualSlopeFactor) * 100;
                                  const percentSign = actualSlopeFactor < 1 ? '-' : actualSlopeFactor > 1 ? '+' : '';
                                  return `${Math.floor(afterTime / 60)}분 ${afterTime % 60}초 (${sign}${Math.floor(Math.abs(impact) / 60)}분 ${Math.abs(impact) % 60}초, ${percentSign}${Math.abs(percentage).toFixed(0)}%)`;
                                })()}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* 하단 설명 */}
                      <View
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: '#E6E9F2',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#6B7280',
                            lineHeight: 16,
                          }}
                        >
                          💡 보정 전 도보 시간({Math.floor(routeInfo.slopeAnalysis.total_original_walk_time / 60)}분 {routeInfo.slopeAnalysis.total_original_walk_time % 60}초)에 모든 요소를 순차 적용한 결과입니다.
                        </Text>
                        {routeInfo.slopeAnalysis.walk_legs_analysis.some(
                          leg => leg.is_transfer
                        ) && (
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#9CA3AF',
                                lineHeight: 14,
                                marginTop: 4,
                              }}
                            >
                              ℹ️ 환승(실내) 구간은 경사도와 날씨 영향 없이 개인 속도만 반영됩니다.
                            </Text>
                          )}
                      </View>

                      {/* 경사도 경고 */}
                      {(() => {
                        const totalDistance =
                          routeInfo.slopeAnalysis.walk_legs_analysis.reduce(
                            (sum, leg) => sum + leg.distance,
                            0
                          );
                        const weightedSum =
                          routeInfo.slopeAnalysis.walk_legs_analysis.reduce(
                            (sum, leg) => sum + leg.avg_slope * leg.distance,
                            0
                          );
                        const avgSlope = weightedSum / totalDistance;
                        const timeAdjustment =
                          routeInfo.slopeAnalysis.total_route_time_adjustment;

                        // 모든 구간의 경사도 중 절대값 40% 이상인 경우 체크
                        const hasExtremeSteepSlope =
                          routeInfo.slopeAnalysis.walk_legs_analysis.some(
                            leg =>
                              leg.segments?.some(
                                segment => Math.abs(segment.slope) >= 40
                              ) ||
                              Math.abs(leg.max_slope) >= 40 ||
                              Math.abs(leg.min_slope) >= 40
                          );

                        // 내리막인데 시간이 증가한 경우
                        const hasDownhillTimeIncrease =
                          avgSlope < -1 && timeAdjustment > 30;

                        const warnings = [];

                        // 엘리베이터 필요 (40% 이상 극단 경사)
                        if (hasExtremeSteepSlope) {
                          warnings.push(
                            <View key="extreme" style={styles.slopeWarning}>
                              <MaterialIcons
                                name="warning"
                                size={16}
                                color="#F44336"
                              />
                              <Text style={styles.slopeWarningText}>
                                일부 구간에 경사도가 40% 이상인 급경사가
                                있습니다. 엘리베이터나 에스컬레이터 이용을
                                권장합니다.
                              </Text>
                            </View>
                          );
                        }

                        // 평균 경사가 음수(내리막)인데 시간이 증가한 경우
                        if (hasDownhillTimeIncrease) {
                          warnings.push(
                            <View key="downhill" style={styles.slopeWarning}>
                              <MaterialIcons
                                name="info-outline"
                                size={16}
                                color="#FF9800"
                              />
                              <Text style={styles.slopeWarningText}>
                                일부 구간에 급경사가 있어 안전한 보행을 고려해
                                시간이 증가했습니다. 계단이나 승강기 이용을
                                권장드립니다.
                              </Text>
                            </View>
                          );
                        }

                        return warnings.length > 0 ? <>{warnings}</> : null;
                      })()}
                    </View>
                  )}

                {/* 횡단보도 개수 및 예상 대기시간 */}
                {routeInfo.slopeAnalysis?.crosswalk_count !== undefined &&
                  routeInfo.slopeAnalysis.crosswalk_count > 0 && (
                    <View style={styles.crosswalkCountContainer}>
                      <View style={styles.crosswalkHeader}>
                        <Text style={styles.crosswalkIcon}>🚦</Text>
                        <Text style={styles.crosswalkTitle}>
                          횡단보도: {routeInfo.slopeAnalysis.crosswalk_count}개
                        </Text>
                        {typeof routeInfo.slopeAnalysis.crosswalk_wait_time === "number" &&
                          routeInfo.slopeAnalysis.crosswalk_wait_time > 0 && (
                            <Text style={styles.crosswalkWaitTime}>
                              (+
                              {Math.floor(
                                routeInfo.slopeAnalysis.crosswalk_wait_time / 60
                              )}
                              분{' '}
                              {routeInfo.slopeAnalysis.crosswalk_wait_time % 60}초
                              대기)
                            </Text>
                          )}
                      </View>
                    </View>
                  )}

                {/* 횡단보도 포함 최종 보정 시간 */}
                {routeInfo.slopeAnalysis?.crosswalk_count !== undefined &&
                  routeInfo.slopeAnalysis.crosswalk_count > 0 &&
                  typeof routeInfo.slopeAnalysis.crosswalk_wait_time === "number" &&
                  routeInfo.slopeAnalysis.crosswalk_wait_time > 0 &&
                  typeof routeInfo.slopeAnalysis.total_time_with_crosswalk === "number" && (
                    <View style={styles.crosswalkFinalTimeContainer}>
                      <Text style={styles.crosswalkFinalTimeTitle}>
                        (참고용)횡단보도 포함 보정 시간
                      </Text>
                      <Text style={styles.crosswalkFinalTimeValue}>
                        {(() => {
                          // 대중교통: 보행시간 + 대중교통 탑승시간
                          // 도보: 보행시간만
                          const finalTime = routeMode === 'transit'
                            ? routeInfo.slopeAnalysis.total_time_with_crosswalk +
                            (routeInfo.totalTime - routeInfo.totalWalkTime)
                            : routeInfo.slopeAnalysis.total_time_with_crosswalk;
                          return `${Math.floor(finalTime / 60)}분 ${finalTime % 60}초`;
                        })()}
                      </Text>
                      <Text style={styles.crosswalkFinalTimeNote}>
                        모든 횡단보도를 최대로 기다린다는 가정하에{'\n'}도출된 예상 시간입니다.
                      </Text>
                    </View>
                  )}

                {/* 경로 목록 다시 보기 버튼 */}
                {routeOptions.length > 1 && (
                  <TouchableOpacity
                    style={styles.showRouteListButton}
                    onPress={() => setShowRouteList(true)}
                  >
                    <MaterialIcons
                      name="list"
                      size={20}
                      color={PRIMARY_COLOR}
                    />
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
                  <MaterialIcons
                    name="arrow-back"
                    size={24}
                    color={PRIMARY_COLOR}
                  />
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
                        <Text style={styles.legMode}>
                          {getModeLabel(leg.mode)}
                        </Text>
                        <Text style={styles.legRoute}>
                          {leg.start?.name || '출발'} →{' '}
                          {leg.end?.name || '도착'}
                        </Text>
                      </View>
                      <View style={styles.legStats}>
                        <Text style={styles.legTime}>
                          {formatMinutes(leg.sectionTime || 0)}
                        </Text>
                        <Text style={styles.legDistance}>
                          {((leg.distance || 0) / 1000).toFixed(1)}km
                        </Text>
                      </View>
                    </View>

                    {/* 버스/지하철 노선 정보 */}
                    {(leg.mode === 'BUS' || leg.mode === 'SUBWAY') &&
                      leg.route && (
                        <View style={styles.routeInfo}>
                          <Text style={styles.routeName}>{leg.route}</Text>
                        </View>
                      )}

                    {/* 도보 상세 경로 */}
                    {leg.mode === 'WALK' &&
                      leg.steps &&
                      leg.steps.length > 0 && (
                        <View style={styles.walkStepsContainer}>
                          {leg.steps.map((step, stepIndex) =>
                            step.description ? (
                              <Text key={stepIndex} style={styles.walkStepText}>
                                • {step.description}
                              </Text>
                            ) : null
                          )}
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
  locationInputGroup: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leftIconColumn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginRight: 12,
  },
  connectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#DDD',
    marginVertical: 4,
  },
  inputColumn: {
    flex: 1,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    paddingHorizontal: 14,
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
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  startDot: {
    backgroundColor: '#4285F4',
  },
  endDot: {
    backgroundColor: '#EA4335',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#222',
  },
  inlineButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LIGHT_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 8,
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
  swapButtonRight: {
    position: 'absolute',
    right: -48,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  swapButtonContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  searchButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  searchButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  transitButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  walkingButton: {
    backgroundColor: '#10B981', // 초록색 (도보)
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
    textAlign: 'center',
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
  walkStepsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    gap: 8,
  },
  walkStepText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
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
  additionalInfoContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 12,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: SECONDARY_TEXT,
  },
  infoImpact: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  infoImpactIncrease: {
    color: '#F44336',
  },
  infoImpactDecrease: {
    color: '#4CAF50',
  },
  // 경사도 분석 스타일
  slopeAnalysisContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2ffff',
  },
  slopeAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  slopeAnalysisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000ff',
  },
  slopeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  slopeStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  slopeStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  slopeStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1E21',
  },
  slopeStatValueIncrease: {
    color: '#F44336',
  },
  slopeStatValueDecrease: {
    color: '#4CAF50',
  },
  slopeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  slopeWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
  // 횡단보도 개수 정보 스타일
  crosswalkCountContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#ebf7ffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6a8fd4ff',
  },
  crosswalkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  crosswalkIcon: {
    fontSize: 20,
  },
  crosswalkTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#262626ff',
  },
  crosswalkWaitTime: {
    fontSize: 14,
    color: '#262626ff',
    fontWeight: '500',
  },
  // 횡단보도 포함 최종 시간 스타일
  crosswalkFinalTimeContainer: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#F3E5F5',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#AB47BC',
  },
  crosswalkFinalTimeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  crosswalkFinalTimeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  crosswalkFinalTimeNote: {
    fontSize: 11,
    color: '#000000',
    lineHeight: 15,
  },
  // 레거시 (사용 안함)
  crosswalkTotalTime: {
    fontSize: 15,
    color: '#2C6DE7',
    fontWeight: '600',
    marginTop: 8,
    paddingLeft: 28,
  },
  // 안내 시작/종료 버튼 스타일
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
  },
  navigationButtonActive: {
    backgroundColor: '#EA4335',
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  // 우하단 버튼 그룹
  bottomRightButtons: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    gap: 12,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  // 현재 위치 추적 버튼 스타일
  currentLocationTrackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationTrackButtonActive: {
    backgroundColor: '#2C6DE7',
  },
  // 위치 정보 디버깅 스타일
  locationInfoDebug: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  locationDebugText: {
    fontSize: 11,
    color: '#1C1E21',
    fontFamily: 'monospace',
  },
});
