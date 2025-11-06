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
  Platform,
} from 'react-native';
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

interface LocationCoords {
  latitude: number;
  longitude: number;
  locationName?: string;
}

export default function WeatherTestScreen() {
  const [weatherData, setWeatherData] = useState<OpenMeteoResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [includeForecasts, setIncludeForecasts] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

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
    withForecasts: boolean = false,
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
        예보포함: withForecasts,
      });

      let data: OpenMeteoResponse;

      if (withForecasts) {
        // 모든 정보 포함 (48시간 예보 + 7일 예보)
        data = await getCompleteWeather(
          coords.latitude,
          coords.longitude,
          48,
          7
        );
      } else {
        // 현재 날씨만
        data = await getCurrentWeather(coords.latitude, coords.longitude);
      }

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
    await fetchWeatherData(includeForecasts);
    setRefreshing(false);
  };

  const handleLocationToggle = async (enabled: boolean) => {
    if (enabled) {
      setUseCurrentLocation(true);

      const coords = currentLocation || (await getCurrentLocation());
      if (!coords) {
        setUseCurrentLocation(false);
        return;
      }

      await fetchWeatherData(includeForecasts, coords);
    } else {
      setUseCurrentLocation(false);
      await fetchWeatherData(includeForecasts, SEOUL_COORDS);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const renderCurrentWeather = () => {
    if (!weatherData?.current) return null;

    const current = weatherData.current;
    const weather = getWeatherDescriptionFromCode(current.weather_code);
    const windDir = getWindDirection(current.wind_direction_10m);

    console.log('🎨 [UI 렌더링] 현재 날씨:', {
      원본코드: current.weather_code,
      변환결과: weather,
      기온: current.temperature_2m,
    });

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌡️ 현재 날씨</Text>

        <View style={styles.weatherMain}>
          <Text style={styles.emoji}>{weather.emoji}</Text>
          <Text style={styles.temperature}>
            {Math.round(current.temperature_2m)}°C
          </Text>
          <Text style={styles.weatherDesc}>{weather.description}</Text>
        </View>

        <View style={styles.weatherDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>체감온도:</Text>
            <Text style={styles.detailValue}>
              {Math.round(current.apparent_temperature)}°C
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>습도:</Text>
            <Text style={styles.detailValue}>
              {current.relative_humidity_2m}%
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>풍속:</Text>
            <Text style={styles.detailValue}>
              {current.wind_speed_10m} m/s ({windDir})
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>강수량:</Text>
            <Text style={styles.detailValue}>{current.precipitation} mm</Text>
          </View>

          {current.rain > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>비:</Text>
              <Text style={styles.detailValue}>{current.rain} mm</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderLocationInfo = () => {
    if (!weatherData) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 위치 정보</Text>
        <View style={styles.weatherDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>위도:</Text>
            <Text style={styles.detailValue}>
              {weatherData.latitude.toFixed(4)}°
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>경도:</Text>
            <Text style={styles.detailValue}>
              {weatherData.longitude.toFixed(4)}°
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>시간대:</Text>
            <Text style={styles.detailValue}>{weatherData.timezone}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHourlyPreview = () => {
    if (!weatherData?.hourly || !weatherData.hourly.time) return null;

    const hourly = weatherData.hourly;
    const next6Hours = hourly.time.slice(0, 6);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ 시간별 예보 (6시간)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {next6Hours.map((time, index) => {
            const hour = new Date(time).getHours();
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
                <Text style={styles.hourlyRain}>{precipitation}%</Text>
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
    const next5Days = daily.time.slice(0, 5);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 일별 예보 (5일)</Text>
        {next5Days.map((dateStr, index) => {
          const date = new Date(dateStr);
          const dayName = date.toLocaleDateString('ko-KR', {
            weekday: 'short',
          });
          const maxTemp = Math.round(daily.temperature_2m_max[index] || 0);
          const minTemp = Math.round(daily.temperature_2m_min[index] || 0);
          const weatherCode = daily.weather_code[index] || 0;
          const weather = getWeatherDescriptionFromCode(weatherCode);
          const precip = daily.precipitation_sum[index] || 0;
          const pop = daily.precipitation_probability_max[index] || 0;

          return (
            <View key={index} style={styles.dailyItem}>
              <View style={styles.dailyLeft}>
                <Text style={styles.dayName}>{dayName}</Text>
                <Text style={styles.dailyEmoji}>{weather.emoji}</Text>
              </View>
              <View style={styles.dailyCenter}>
                <Text style={styles.dailyDesc}>{weather.description}</Text>
                {precip > 0 && (
                  <Text style={styles.dailyRain}>
                    강수 {precip.toFixed(1)}mm
                  </Text>
                )}
                {pop > 0 && <Text style={styles.dailyRain}>확률 {pop}%</Text>}
              </View>
              <View style={styles.dailyRight}>
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>🌤️ 기상청 날씨 API 테스트</Text>
        <Text style={styles.subtitle}>
          {useCurrentLocation && currentLocation
            ? currentLocation.locationName || '현재 위치'
            : '서울 지역'}
        </Text>
      </View>

      <View style={styles.locationControl}>
        <View style={styles.locationToggle}>
          <Text style={styles.locationLabel}>📍 현재 위치 사용</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              useCurrentLocation && styles.toggleButtonActive,
            ]}
            onPress={() => handleLocationToggle(!useCurrentLocation)}
            disabled={locationLoading}
          >
            <Text
              style={[
                styles.toggleText,
                useCurrentLocation && styles.toggleTextActive,
              ]}
            >
              {locationLoading
                ? '위치 가져오는 중...'
                : useCurrentLocation
                  ? 'ON'
                  : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {useCurrentLocation && currentLocation && (
          <View style={styles.coordsDisplay}>
            <Text style={styles.coordsText}>
              위도: {currentLocation.latitude.toFixed(4)}° / 경도:{' '}
              {currentLocation.longitude.toFixed(4)}°
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, !includeForecasts && styles.buttonActive]}
          onPress={() => {
            setIncludeForecasts(false);
            fetchWeatherData(false);
          }}
        >
          <Text style={styles.buttonText}>현재 날씨만</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, includeForecasts && styles.buttonActive]}
          onPress={() => {
            setIncludeForecasts(true);
            fetchWeatherData(true);
          }}
        >
          <Text style={styles.buttonText}>전체 정보</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>날씨 정보를 가져오는 중...</Text>
        </View>
      )}

      {weatherData && !loading && (
        <>
          {renderLocationInfo()}
          {renderCurrentWeather()}
          {renderHourlyPreview()}
          {renderDailyPreview()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  locationControl: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: 'white',
  },
  coordsDisplay: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loading: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
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
  weatherMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  weatherDesc: {
    fontSize: 18,
    color: '#666',
  },
  weatherDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hourlyItem: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    minWidth: 80,
  },
  hourlyTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  hourlyEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  hourlyRain: {
    fontSize: 12,
    color: '#007AFF',
  },
  dailyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dailyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  dailyEmoji: {
    fontSize: 20,
  },
  dailyCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  dailyDesc: {
    fontSize: 14,
    color: '#333',
  },
  dailyRain: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  dailyRight: {
    alignItems: 'flex-end',
    width: 100,
  },
  dailyTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dailyUV: {
    fontSize: 12,
    marginTop: 2,
  },
});
