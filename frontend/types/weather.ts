// Open-Meteo API 타입 정의
export interface OpenMeteoCurrentWeather {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
}

export interface OpenMeteoHourlyWeather {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  rain: number[];
  showers: number[];
  snowfall: number[];
  snow_depth: number[];
  weather_code: number[];
  pressure_msl: number[];
  surface_pressure: number[];
  cloud_cover: number[];
  visibility: number[];
  evapotranspiration: number[];
  et0_fao_evapotranspiration: number[];
  vapour_pressure_deficit: number[];
  wind_speed_10m: number[];
  wind_speed_80m: number[];
  wind_speed_120m: number[];
  wind_speed_180m: number[];
  wind_direction_10m: number[];
  wind_direction_80m: number[];
  wind_direction_120m: number[];
  wind_direction_180m: number[];
  wind_gusts_10m: number[];
  temperature_80m: number[];
  temperature_120m: number[];
  temperature_180m: number[];
  soil_temperature_0cm: number[];
  soil_temperature_6cm: number[];
  soil_temperature_18cm: number[];
  soil_temperature_54cm: number[];
  soil_moisture_0_1cm: number[];
  soil_moisture_1_3cm: number[];
  soil_moisture_3_9cm: number[];
  soil_moisture_9_27cm: number[];
  soil_moisture_27_81cm: number[];
}

export interface OpenMeteoDailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  sunrise: string[];
  sunset: string[];
  daylight_duration: number[];
  sunshine_duration: number[];
  uv_index_max: number[];
  uv_index_clear_sky_max: number[];
  precipitation_sum: number[];
  rain_sum: number[];
  showers_sum: number[];
  snowfall_sum: number[];
  precipitation_hours: number[];
  precipitation_probability_max: number[];
  precipitation_probability_min: number[];
  precipitation_probability_mean: number[];
  wind_speed_10m_max: number[];
  wind_gusts_10m_max: number[];
  wind_direction_10m_dominant: number[];
  shortwave_radiation_sum: number[];
  et0_fao_evapotranspiration: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: OpenMeteoCurrentWeather;
  hourly_units?: Record<string, string>;
  hourly?: OpenMeteoHourlyWeather;
  daily_units?: Record<string, string>;
  daily?: OpenMeteoDailyWeather;
}

// 날씨 코드를 한국어로 변환
export const getWeatherDescription = (code: number): { description: string; emoji: string } => {
  const weatherCodes: Record<number, { description: string; emoji: string }> = {
    0: { description: '맑음', emoji: '☀️' },
    1: { description: '대체로 맑음', emoji: '🌤️' },
    2: { description: '부분적으로 흐림', emoji: '⛅' },
    3: { description: '흐림', emoji: '☁️' },
    45: { description: '안개', emoji: '🌫️' },
    48: { description: '서리 안개', emoji: '🌫️' },
    51: { description: '가벼운 이슬비', emoji: '🌦️' },
    53: { description: '보통 이슬비', emoji: '🌦️' },
    55: { description: '강한 이슬비', emoji: '🌦️' },
    56: { description: '가벼운 얼어붙은 이슬비', emoji: '🌧️' },
    57: { description: '강한 얼어붙은 이슬비', emoji: '🌧️' },
    61: { description: '가벼운 비', emoji: '🌧️' },
    63: { description: '보통 비', emoji: '🌧️' },
    65: { description: '강한 비', emoji: '🌧️' },
    66: { description: '가벼운 얼어붙은 비', emoji: '🌧️' },
    67: { description: '강한 얼어붙은 비', emoji: '🌧️' },
    71: { description: '가벼운 눈', emoji: '🌨️' },
    73: { description: '보통 눈', emoji: '❄️' },
    75: { description: '강한 눈', emoji: '❄️' },
    77: { description: '진눈깨비', emoji: '🌨️' },
    80: { description: '가벼운 소나기', emoji: '🌦️' },
    81: { description: '보통 소나기', emoji: '⛈️' },
    82: { description: '강한 소나기', emoji: '⛈️' },
    85: { description: '가벼운 눈 소나기', emoji: '🌨️' },
    86: { description: '강한 눈 소나기', emoji: '❄️' },
    95: { description: '뇌우', emoji: '⛈️' },
    96: { description: '가벼운 우박을 동반한 뇌우', emoji: '⛈️' },
    99: { description: '강한 우박을 동반한 뇌우', emoji: '⛈️' },
  };

  return weatherCodes[code] || { description: '알 수 없음', emoji: '❓' };
};

// 풍향을 한국어로 변환
export const getWindDirection = (degrees: number): string => {
  const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index] || '북';
};

// UV 지수 설명
export const getUVIndexDescription = (uvIndex: number): { level: string; color: string } => {
  if (uvIndex <= 2) return { level: '낮음', color: '#00E400' };
  if (uvIndex <= 5) return { level: '보통', color: '#FFFF00' };
  if (uvIndex <= 7) return { level: '높음', color: '#FF8C00' };
  if (uvIndex <= 10) return { level: '매우 높음', color: '#FF0000' };
  return { level: '위험', color: '#8B00FF' };
};