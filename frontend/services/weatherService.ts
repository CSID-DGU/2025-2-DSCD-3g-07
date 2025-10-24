import { OpenMeteoResponse } from '../types/weather';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';

export interface WeatherApiOptions {
  latitude: number;
  longitude: number;
  includeCurrent?: boolean;
  includeHourly?: boolean;
  includeDaily?: boolean;
  forecastDays?: number;
  timezone?: string;
}

// API 응답을 안전하게 파싱하는 헬퍼 함수
const parseWeatherResponse = async (response: Response): Promise<OpenMeteoResponse> => {
  if (!response.ok) {
    throw new Error(`날씨 API 호출 실패: ${response.status}`);
  }
  return response.json() as Promise<OpenMeteoResponse>;
};

// 현재 날씨 정보만 가져오기
export const getCurrentWeather = async (lat: number, lon: number): Promise<OpenMeteoResponse> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m'
    ].join(','),
    timezone: 'Asia/Seoul',
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}/forecast?${params}`);
  return parseWeatherResponse(response);
};

// 시간별 예보 포함해서 가져오기
export const getHourlyWeather = async (lat: number, lon: number, hours: number = 24): Promise<OpenMeteoResponse> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'snow_depth',
      'weather_code',
      'pressure_msl',
      'surface_pressure',
      'cloud_cover',
      'visibility',
      'evapotranspiration',
      'et0_fao_evapotranspiration',
      'vapour_pressure_deficit',
      'wind_speed_10m',
      'wind_speed_80m',
      'wind_speed_120m',
      'wind_speed_180m',
      'wind_direction_10m',
      'wind_direction_80m',
      'wind_direction_120m',
      'wind_direction_180m',
      'wind_gusts_10m',
      'temperature_80m',
      'temperature_120m',
      'temperature_180m',
      'soil_temperature_0cm',
      'soil_temperature_6cm',
      'soil_temperature_18cm',
      'soil_temperature_54cm',
      'soil_moisture_0_1cm',
      'soil_moisture_1_3cm',
      'soil_moisture_3_9cm',
      'soil_moisture_9_27cm',
      'soil_moisture_27_81cm'
    ].join(','),
    forecast_hours: hours.toString(),
    timezone: 'Asia/Seoul',
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}/forecast?${params}`);
  return parseWeatherResponse(response);
};

// 일별 예보 포함해서 가져오기
export const getDailyWeather = async (lat: number, lon: number, days: number = 7): Promise<OpenMeteoResponse> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'daylight_duration',
      'sunshine_duration',
      'uv_index_max',
      'uv_index_clear_sky_max',
      'precipitation_sum',
      'rain_sum',
      'showers_sum',
      'snowfall_sum',
      'precipitation_hours',
      'precipitation_probability_max',
      'precipitation_probability_min',
      'precipitation_probability_mean',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
      'shortwave_radiation_sum',
      'et0_fao_evapotranspiration'
    ].join(','),
    forecast_days: days.toString(),
    timezone: 'Asia/Seoul',
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}/forecast?${params}`);
  return parseWeatherResponse(response);
};

// 모든 정보를 포함한 종합 날씨 정보
export const getCompleteWeather = async (
  lat: number, 
  lon: number, 
  hourlyHours: number = 48, 
  forecastDays: number = 7
): Promise<OpenMeteoResponse> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'snow_depth',
      'weather_code',
      'pressure_msl',
      'surface_pressure',
      'cloud_cover',
      'visibility',
      'evapotranspiration',
      'et0_fao_evapotranspiration',
      'vapour_pressure_deficit',
      'wind_speed_10m',
      'wind_speed_80m',
      'wind_speed_120m',
      'wind_speed_180m',
      'wind_direction_10m',
      'wind_direction_80m',
      'wind_direction_120m',
      'wind_direction_180m',
      'wind_gusts_10m',
      'temperature_80m',
      'temperature_120m',
      'temperature_180m',
      'soil_temperature_0cm',
      'soil_temperature_6cm',
      'soil_temperature_18cm',
      'soil_temperature_54cm',
      'soil_moisture_0_1cm',
      'soil_moisture_1_3cm',
      'soil_moisture_3_9cm',
      'soil_moisture_9_27cm',
      'soil_moisture_27_81cm'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'daylight_duration',
      'sunshine_duration',
      'uv_index_max',
      'uv_index_clear_sky_max',
      'precipitation_sum',
      'rain_sum',
      'showers_sum',
      'snowfall_sum',
      'precipitation_hours',
      'precipitation_probability_max',
      'precipitation_probability_min',
      'precipitation_probability_mean',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
      'shortwave_radiation_sum',
      'et0_fao_evapotranspiration'
    ].join(','),
    forecast_hours: hourlyHours.toString(),
    forecast_days: forecastDays.toString(),
    timezone: 'Asia/Seoul',
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}/forecast?${params}`);
  return parseWeatherResponse(response);
};

// 서울 기본 좌표 (테스트용)
export const SEOUL_COORDS = {
  latitude: 37.5665,
  longitude: 126.9780
};