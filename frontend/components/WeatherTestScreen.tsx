import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  getCurrentWeather,
  getCompleteWeather,
  SEOUL_COORDS,
} from '../services/weatherService';
import {
  OpenMeteoResponse,
  getWeatherDescriptionFromCode,
  getWindDirection,
} from '../types/weather';
import {
  searchPlaces,
  type PlaceSearchResult,
} from '../services/placeSearchService';

interface LocationCoords {
  latitude: number;
  longitude: number;
  locationName?: string;
}

export default function WeatherTestScreen() {
  const router = useRouter();
  const [weatherData, setWeatherData] = useState<OpenMeteoResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationCoords | null>(null);

  // 현재 위치 가져오기
  const getCurrentLocation = async (): Promise<LocationCoords | null> => {
    try {
      setLocationLoading(true);

      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '현재 위치의 날씨를 가져오려면 위치 권한이 필요합니다.',
          [{ text: '확인' }]
        );
        setLocationLoading(false);
        return null;
      }

      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 역지오코딩으로 주소 가져오기 (선택적)
      let locationName = '현재 위치';
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address) {
          locationName =
            [address.city, address.district, address.street]
              .filter(Boolean)
              .join(' ') || '현재 위치';
        }
      } catch (error) {
        console.warn('[weather] reverse geocoding failed', error);
      }

      const coords: LocationCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        locationName,
      };

      setCurrentLocation(coords);
      console.log('[weather] 현재 위치:', coords);

      setLocationLoading(false);
      return coords;
    } catch (error) {
      console.error('[weather] 위치 가져오기 실패:', error);
      Alert.alert('오류', '현재 위치를 가져올 수 없습니다.');
      setLocationLoading(false);
      return null;
    }
  };

  const fetchWeatherData = async (
    coordsOverride?: { latitude: number; longitude: number }
  ) => {
    try {
      setLoading(true);

      // 사용할 좌표 결정
      let coords = coordsOverride ?? SEOUL_COORDS;
      if (!coordsOverride && useCurrentLocation && currentLocation) {
        coords = currentLocation;
      }

      console.log('[weather] 날씨 데이터 요청:', {
        좌표: coords,
      });

      // 항상 전체 정보 가져오기 (48시간 예보 + 7일 예보)
      const data = await getCompleteWeather(
        coords.latitude,
        coords.longitude,
        48,
        7
      );

      setWeatherData(data);
      console.log('[weather] 날씨 데이터 가져오기 성공:', {
        온도: data.current?.temperature_2m,
        날씨코드: data.current?.weather_code,
      });
    } catch (error) {
      console.error('[weather] 날씨 데이터 가져오기 실패:', error);

      let errorMessage = '날씨 정보를 가져올 수 없습니다.';
      if (error instanceof Error) {
        if (
          error.message.includes('504') ||
          error.message.includes('Gateway')
        ) {
          errorMessage =
            '서버 응답 시간이 초과되었습니다.\n백엔드 서버가 실행 중인지 확인해주세요.';
        } else if (error.message.includes('Network')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('timeout')) {
          errorMessage =
            '요청 시간이 초과되었습니다.\n잠시 후 다시 시도해주세요.';
        }
      }

      Alert.alert('오류', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWeatherData();
    setRefreshing(false);
  };

  const handleLocationToggle = async (enabled: boolean) => {
    if (enabled) {
      setUseCurrentLocation(true);
      setSelectedLocation(null);
      setSearchQuery('');
      setShowSearchResults(false);

      const coords = currentLocation || (await getCurrentLocation());
      if (!coords) {
        setUseCurrentLocation(false);
        return;
      }

      await fetchWeatherData(coords);
    } else {
      setUseCurrentLocation(false);
      await fetchWeatherData(SEOUL_COORDS);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await searchPlaces(query);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('검색 실패:', error);
    }
  };

  const handleSelectPlace = async (place: PlaceSearchResult) => {
    const location: LocationCoords = {
      latitude: place.y,
      longitude: place.x,
      locationName: place.place_name,
    };

    setSelectedLocation(location);
    setSearchQuery(place.place_name);
    setShowSearchResults(false);
    setUseCurrentLocation(false);

    await fetchWeatherData(location);
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const renderCurrentWeather = () => {
    if (!weatherData?.current) return null;

    const current = weatherData.current;
    const weather = getWeatherDescriptionFromCode(current.weather_code);
    const windDir = getWindDirection(current.wind_direction_10m);

    return (
      <View style={styles.currentWeatherCard}>
        <View style={styles.mainWeather}>
          <Text style={styles.emoji}>{weather.emoji}</Text>
          <View style={styles.tempContainer}>
            <Text style={styles.temperature}>
              {Math.round(current.temperature_2m)}°
            </Text>
            <Text style={styles.weatherDesc}>{weather.description}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <MaterialIcons name="thermostat" size={24} color="#FF6B6B" />
            <Text style={styles.detailLabel}>체감</Text>
            <Text style={styles.detailValue}>
              {Math.round(current.apparent_temperature)}°
            </Text>
          </View>

          <View style={styles.detailCard}>
            <MaterialIcons name="opacity" size={24} color="#4ECDC4" />
            <Text style={styles.detailLabel}>습도</Text>
            <Text style={styles.detailValue}>
              {current.relative_humidity_2m}%
            </Text>
          </View>

          <View style={styles.detailCard}>
            <MaterialIcons name="air" size={24} color="#95E1D3" />
            <Text style={styles.detailLabel}>풍속</Text>
            <Text style={styles.detailValue}>
              {current.wind_speed_10m}m/s
            </Text>
          </View>

          <View style={styles.detailCard}>
            <MaterialIcons name="water-drop" size={24} color="#5DADE2" />
            <Text style={styles.detailLabel}>강수</Text>
            <Text style={styles.detailValue}>{current.precipitation}mm</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLocationInfo = () => {
    if (!weatherData) return null;

    let locationName = '서울';
    if (useCurrentLocation && currentLocation?.locationName) {
      locationName = currentLocation.locationName;
    } else if (selectedLocation?.locationName) {
      locationName = selectedLocation.locationName;
    }

    return (
      <View style={styles.locationInfo}>
        <MaterialIcons name="place" size={20} color="white" />
        <Text style={styles.locationText}>{locationName}</Text>
      </View>
    );
  };

  const renderHourlyPreview = () => {
    if (!weatherData?.hourly || !weatherData.hourly.time) return null;

    const hourly = weatherData.hourly;
    const next12Hours = hourly.time.slice(0, 12);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>시간별 예보</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hourlyScroll}
        >
          {next12Hours.map((time, index) => {
            const date = new Date(time);
            const hour = date.getHours();
            const temp = Math.round(hourly.temperature_2m[index] || 0);
            const precipitation = hourly.precipitation_probability[index] || 0;
            const weather = getWeatherDescriptionFromCode(
              hourly.weather_code[index] || 0
            );

            return (
              <View key={index} style={styles.hourlyItem}>
                <Text style={styles.hourlyTime}>{hour}시</Text>
                <Text style={styles.hourlyEmoji}>{weather.emoji}</Text>
                <Text style={styles.hourlyTemp}>{temp}°</Text>
                {precipitation > 0 && (
                  <Text style={styles.hourlyRain}>💧{precipitation}%</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderDailyPreview = () => {
    if (!weatherData?.daily || !weatherData.daily.time) return null;

    const daily = weatherData.daily;
    const next7Days = daily.time.slice(0, 7);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>주간 예보</Text>
        {next7Days.map((dateStr, index) => {
          const date = new Date(dateStr);
          const dayName = index === 0 ? '오늘' : date.toLocaleDateString('ko-KR', {
            weekday: 'short',
          });
          const maxTemp = Math.round(daily.temperature_2m_max[index] || 0);
          const minTemp = Math.round(daily.temperature_2m_min[index] || 0);
          const weatherCode = daily.weather_code[index] || 0;
          const weather = getWeatherDescriptionFromCode(weatherCode);
          const pop = daily.precipitation_probability_max[index] || 0;

          return (
            <View key={index} style={styles.dailyItem}>
              <View style={styles.dailyLeft}>
                <Text style={styles.dayName}>{dayName}</Text>
              </View>
              <View style={styles.dailyCenter}>
                <Text style={styles.dailyEmoji}>{weather.emoji}</Text>
                <Text style={styles.dailyDesc}>{weather.description}</Text>
              </View>
              <View style={styles.dailyRight}>
                {pop > 0 && (
                  <Text style={styles.dailyRain}>💧 {pop}%</Text>
                )}
                <Text style={styles.dailyTemp}>
                  {maxTemp}° / {minTemp}°
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>날씨</Text>
          <View style={styles.headerSpacer} />
        </View>
        {renderLocationInfo()}
        
        {/* 검색창 */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="지역을 검색하세요"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowSearchResults(true);
              }
            }}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              style={styles.clearButton}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleLocationToggle(!useCurrentLocation)}
              disabled={locationLoading}
              style={styles.locationButtonInSearch}
            >
              <MaterialIcons 
                name={useCurrentLocation ? "my-location" : "location-on"} 
                size={20} 
                color={useCurrentLocation ? "#2C6DE7" : "#666"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 검색 결과 */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchResultItem}
                onPress={() => handleSelectPlace(result)}
              >
                <MaterialIcons name="place" size={20} color="#666" />
                <View style={styles.searchResultText}>
                  <Text style={styles.searchResultName}>{result.place_name}</Text>
                  <Text style={styles.searchResultAddress}>{result.address_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !weatherData ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2C6DE7" />
            <Text style={styles.loadingText}>날씨 정보를 불러오는 중...</Text>
          </View>
        ) : weatherData ? (
          <>
            {renderCurrentWeather()}
            {renderHourlyPreview()}
            {renderDailyPreview()}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#2C6DE7',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  locationButtonInSearch: {
    padding: 4,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 200,
    left: 20,
    right: 20,
    maxHeight: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 13,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  currentWeatherCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 80,
    marginRight: 20,
  },
  tempContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#2C6DE7',
  },
  weatherDesc: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  hourlyScroll: {
    gap: 12,
  },
  hourlyItem: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    minWidth: 70,
    gap: 8,
  },
  hourlyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  hourlyEmoji: {
    fontSize: 32,
  },
  hourlyTemp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  hourlyRain: {
    fontSize: 12,
    color: '#5DADE2',
    fontWeight: '600',
  },
  dailyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dailyLeft: {
    width: 60,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dailyCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyEmoji: {
    fontSize: 28,
  },
  dailyDesc: {
    fontSize: 15,
    color: '#666',
  },
  dailyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dailyRain: {
    fontSize: 12,
    color: '#5DADE2',
    fontWeight: '600',
  },
  dailyTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
