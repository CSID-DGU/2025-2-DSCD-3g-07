import { Platform } from 'react-native';
import { OpenMeteoResponse, KMAWeatherResponse, KMAWeatherItem, ParsedWeatherData } from '../types/weather';
import apiClient from '../utils/apiClient';



// KMA API Configuration
const KMA_BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// Use encoded API key as-is (no decodeURIComponent)
const KMA_API_KEY = 'fd3ec2dea8cbb11a251a2ce60843ea3236811fca06f2a8eb8f63426b208f35da';

const IS_WEB = Platform.OS === 'web';

interface KMAProxyPayload {
  requestedCoords?: { latitude: number; longitude: number };
  gridCoords?: { nx: number; ny: number };
  baseTime?: { date: string; time: string };
  raw?: KMAWeatherResponse;
}

const toKMANumber = (value?: string, fallback = 0): number => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return fallback;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapKMAWeatherCode = (pty: number, sky: number): number => {
  if (pty > 0) {
    switch (pty) {
      case 1:
        return 63; // 鍮?
      case 2:
        return 81; // 鍮???
      case 3:
        return 73; // ??
      case 4:
        return 80; // ?뚮굹湲?
      case 5:
        return 51; // 鍮쀫갑??
      case 6:
        return 66; // 吏꾨늿源⑤퉬
      case 7:
        return 75; // ?덈궇由?
      default:
        return 63;
    }
  }

  switch (sky) {
    case 1:
      return 0; // 留묒쓬
    case 3:
      return 2; // 援щ쫫 留롮쓬
    case 4:
      return 3; // ?먮┝
    default:
      return 0;
  }
};

const getDominantValue = (values: number[], fallback = 0): number => {
  if (!values.length) {
    return fallback;
  }

  const counts = new Map<number, number>();
  let bestValue = fallback;
  let bestCount = 0;

  values.forEach(rawValue => {
    const value = Number.isFinite(rawValue) ? rawValue : fallback;
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);

    if (count > bestCount) {
      bestCount = count;
      bestValue = value;
    }
  });

  return bestValue;
};


interface KMAFetchResult {
  data: KMAWeatherResponse;
  baseDate: string;
  baseTime: string;
  gridCoords: { nx: number; ny: number };
}

const fetchKMAData = async (
  lat: number,
  lon: number,
  numOfRows: number
): Promise<KMAFetchResult> => {
  const { baseDate, baseTime } = getBaseTime();
  const gridCoords = convertToGrid(lat, lon);

  if (IS_WEB) {
    try {
      const proxyPayload = await apiClient.get<KMAProxyPayload>('/api/weather/kma', {
        lat,
        lon,
        numOfRows,
        baseDate,
        baseTime,
      });

      const kmaData = await parseWeatherResponse(proxyPayload);

      return {
        data: kmaData,
        baseDate: proxyPayload.baseTime?.date || baseDate,
        baseTime: proxyPayload.baseTime?.time || baseTime,
        gridCoords: proxyPayload.gridCoords || gridCoords,
      };
    } catch (error) {
      console.error('ERROR [KMA Proxy] Request failed:', error);
      const message =
        'Backend server must be running to query KMA weather data. Please run the backend API and try again.';
      if (error instanceof Error) {
        throw new Error(`${message} (Reason: ${error.message})`);
      }
      throw new Error(message);
    }
  }

  if (!KMA_API_KEY) {
    throw new Error('KMA API key is not configured.');
  }

  const params = new URLSearchParams({
    serviceKey: KMA_API_KEY,
    numOfRows: String(numOfRows),
    pageNo: '1',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: gridCoords.nx.toString(),
    ny: gridCoords.ny.toString(),
  });

  const apiUrl = `${KMA_BASE_URL}/getVilageFcst?${params}`;
  // console.log('DEBUG [KMA API] Request params:', {
  //   baseDate,
  //   baseTime,
  //   gridCoords,
  //   numOfRows,
  // });

  const response = await fetch(apiUrl);
  const kmaData = await parseWeatherResponse(response);

  return {
    data: kmaData,
    baseDate,
    baseTime,
    gridCoords,
  };
};



const parseKMAPrecipAmount = (value?: string): number => {

  if (!value) return 0;

  const normalized = value.trim();

  if (!normalized) return 0;



  if (normalized === '강수없음' || normalized === '적설없음') {
    return 0;
  }

  if (normalized.includes('mm 미만')) {
    const numeric = parseFloat(normalized.replace('mm 미만', '').trim());

    return Number.isFinite(numeric) ? numeric : 0;

  }



  const match = normalized.match(/-?\d+(\.\d+)?/);

  if (match) {

    const numeric = parseFloat(match[0]);

    return Number.isFinite(numeric) ? numeric : 0;

  }



  return 0;

};



export interface WeatherApiOptions {
  latitude: number;
  longitude: number;
  includeCurrent?: boolean;
  includeHourly?: boolean;
  includeDaily?: boolean;
  forecastDays?: number;
  timezone?: string;
}

// Convert WGS84 coordinates to KMA grid coordinates
const convertToGrid = (lat: number, lon: number): { nx: number; ny: number } => {
  const RE = 6371.00877; // Earth radius (km)
  const GRID = 5.0; // Grid spacing (km)
  const SLAT1 = 30.0; // Standard latitude 1 (degree)
  const SLAT2 = 60.0; // Standard latitude 2 (degree)
  const OLON = 126.0; // Base longitude (degree)
  const OLAT = 38.0; // Base latitude (degree)
  const XO = 43; // Base X coordinate (GRID)
  const YO = 136; // Base Y coordinate (GRID)

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  const theta = lon * DEGRAD - olon;
  const x = (re * sf) / Math.pow(ra, sn) * Math.sin(theta * sn);
  const y = ro - (re * sf) / Math.pow(ra, sn) * Math.cos(theta * sn);

  return {
    nx: Math.floor(x + XO + 0.5),
    ny: Math.floor(y + YO + 0.5),
  };
};

// 湲곗긽泥?API 諛쒗몴 ?쒓컖 怨꾩궛
// Calculate KMA API base time
// Data is released daily at 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10 (8 times total)
const getBaseTime = (): { baseDate: string; baseTime: string } => {
  const now = new Date();

  // Hermes(Android) does not fully support timeZone in toLocaleString, so shift manually to KST (UTC+9).
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
  const koreaTime = new Date(utcMillis + 9 * 60 * 60000);

  const year = koreaTime.getFullYear();
  const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
  const day = String(koreaTime.getDate()).padStart(2, '0');
  const hour = koreaTime.getHours();
  const minute = koreaTime.getMinutes();

  // Base time list (02, 05, 08, 11, 14, 17, 20, 23)
  const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];

  // Select the most recent base time based on current time
  let baseHour = baseHours[0] || 2; // Default
  for (let i = baseHours.length - 1; i >= 0; i--) {
    const bh = baseHours[i];
    if (bh !== undefined) {
      // Use data after 10 minutes from base time (e.g., 02:10 onwards for 02:00)
      if (hour > bh || (hour === bh && minute >= 10)) {
        baseHour = bh;
        break;
      }
    }
  }

  // If before first base time (02:10), use yesterday's 23:00 base
  if (hour < 2 || (hour === 2 && minute < 10)) {
    const yesterday = new Date(koreaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      baseDate: `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`,
      baseTime: '2300',
    };
  }

  return {
    baseDate: `${year}${month}${day}`,
    baseTime: `${String(baseHour).padStart(2, '0')}00`,
  };
};

// Convert KMA data to OpenMeteo schema
const convertKMAToOpenMeteo = (
  kmaData: KMAWeatherItem[],
  lat: number,
  lon: number
): OpenMeteoResponse => {
  // console.log('DEBUG [KMA->OpenMeteo] Conversion start:', {
  //   totalItems: kmaData.length,
  //   categories: [...new Set(kmaData.map(d => d.category))].join(', '),
  // });

  // Prepare hourly data structure based on current time
  const hourlyData: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  } = {
    time: [],
    temperature_2m: [],
    relative_humidity_2m: [],
    precipitation_probability: [],
    precipitation: [],
    weather_code: [],
    wind_speed_10m: [],
    wind_direction_10m: [],
  };

  // Group data by time
  const dataByTime: Record<string, Record<string, string>> = {};

  kmaData.forEach(item => {
    const datetime = `${item.fcstDate}${item.fcstTime}`;
    if (!dataByTime[datetime]) {
      dataByTime[datetime] = {};
    }
    dataByTime[datetime][item.category] = item.fcstValue;
  });

  // console.log('DEBUG [KMA->OpenMeteo] Time-grouped data:', {
  //   timeSlotCount: Object.keys(dataByTime).length,
  //   earliestTimestamp: Object.keys(dataByTime).sort()[0],
  // });

  // Use first time slot as current weather
  const times = Object.keys(dataByTime).sort();
  if (times.length > 0 && times[0]) {
    const firstTime = times[0];
    const firstData = dataByTime[firstTime];

    if (firstData) {
      // Current conditions
      const temp = toKMANumber(firstData.TMP);
      const humidity = toKMANumber(firstData.REH);
      const pop = toKMANumber(firstData.POP);
      const pty = toKMANumber(firstData.PTY);
      const sky = toKMANumber(firstData.SKY, 1);
      const wsd = toKMANumber(firstData.WSD);
      const vec = toKMANumber(firstData.VEC);

      // Determine weather_code (precipitation/sky condition mapping)
      const weatherCode = mapKMAWeatherCode(pty, sky);

      const precipitationAmount = parseKMAPrecipAmount(firstData.PCP);
      const rainAmount =
        pty === 1 || pty === 2 || pty === 4 || pty === 5 || pty === 6
          ? precipitationAmount
          : 0;

      // console.log('DEBUG [Weather code mapping]:', {
      //   raw: { PTY: pty, SKY: sky },
      //   weatherCode,
      // });

      const current = {
        time: `${firstTime.substring(0, 4)}-${firstTime.substring(4, 6)}-${firstTime.substring(6, 8)}T${firstTime.substring(8, 10)}:00`,
        temperature_2m: temp,
        relative_humidity_2m: humidity,
        apparent_temperature: temp - (wsd * 0.5), // Simple feels-like approximation
        precipitation: precipitationAmount,
        rain: rainAmount,
        weather_code: weatherCode,
        wind_speed_10m: wsd,
        wind_direction_10m: vec,
      };

      // console.log('DEBUG [Current weather result]:', {
      //   timestamp: current.time,
      //   temperature: `${temp}C`,
      //   humidity: `${humidity}%`,
      //   precipitationProbability: `${pop}%`,
      //   precipitationAmount,
      //   rainAmount,
      //   windSpeed: `${wsd}m/s`,
      //   weatherCode,
      // });

      // Add hourly data
      times.forEach(time => {
        const data = dataByTime[time];
        if (data) {
          const datetime = `${time.substring(0, 4)}-${time.substring(4, 6)}-${time.substring(6, 8)}T${time.substring(8, 10)}:00`;

          const temp = toKMANumber(data.TMP);
          const humidity = toKMANumber(data.REH);
          const pop = toKMANumber(data.POP);
          const pty = toKMANumber(data.PTY);
          const sky = toKMANumber(data.SKY, 1);
          const wsd = toKMANumber(data.WSD);
          const vec = toKMANumber(data.VEC);

          const precipitationAmount = parseKMAPrecipAmount(data.PCP);
          const weatherCode = mapKMAWeatherCode(pty, sky);

          hourlyData.time.push(datetime);
          hourlyData.temperature_2m.push(temp);
          hourlyData.relative_humidity_2m.push(humidity);
          hourlyData.precipitation_probability.push(pop);
          hourlyData.precipitation.push(precipitationAmount);
          hourlyData.weather_code.push(weatherCode);
          hourlyData.wind_speed_10m.push(wsd);
          hourlyData.wind_direction_10m.push(vec);
        }
      });

      return {
        latitude: lat,
        longitude: lon,
        timezone: 'Asia/Seoul',
        current,
        hourly: hourlyData,
      };
    }
  }

  // Return default values if no data available
  return {
    latitude: lat,
    longitude: lon,
    timezone: 'Asia/Seoul',
    current: {
      time: new Date().toISOString(),
      temperature_2m: 0,
      relative_humidity_2m: 0,
      apparent_temperature: 0,
      precipitation: 0,
      rain: 0,
      weather_code: 0,
      wind_speed_10m: 0,
      wind_direction_10m: 0,
    },
  };
};

// Helper to safely parse API response
type KMAResponseSource = Response | KMAWeatherResponse | KMAProxyPayload | undefined | null;
const parseWeatherResponse = async (source: KMAResponseSource): Promise<KMAWeatherResponse> => {
  if (!source) {
    throw new Error('KMA API response payload is empty.');
  }

  let payload: unknown = source;

  if (typeof Response !== 'undefined' && source instanceof Response) {
    if (!source.ok) {
      const errorText = await source.text();
      console.error('ERROR [KMA API] HTTP failure:', {
        status: source.status,
        statusText: source.statusText,
        body: errorText,
      });
      throw new Error(`KMA API request failed: ${source.status} - ${errorText}`);
    }

    try {
      payload = (await source.json()) as unknown;
    } catch (error) {
      console.error('ERROR [KMA API] JSON parse error:', error);
      throw new Error('Unable to parse KMA API response JSON.');
    }
  } else if (typeof source === 'object' && source !== null && 'raw' in source && (source as KMAProxyPayload).raw) {
    return parseWeatherResponse((source as KMAProxyPayload).raw);
  }

  if (typeof payload !== 'object' || payload === null || !('response' in payload)) {
    console.error('ERROR [KMA API] Unexpected response shape:', payload);
    throw new Error('KMA API response structure is invalid.');
  }

  const data = payload as KMAWeatherResponse;
  // console.log('DEBUG [KMA API] Parsed JSON:', data);

  const header = data.response?.header;
  if (!header) {
    console.error('ERROR [KMA API] Missing header in payload:', data);
    throw new Error('KMA API response header is missing.');
  }

  if (header.resultCode !== '00') {
    const errorMsg = header.resultMsg || 'Unknown error';
    const errorCode = header.resultCode || 'UNKNOWN';

    console.error('ERROR [KMA API] Error payload received:', {
      errorCode,
      errorMsg,
      header,
    });

    if (errorCode === '03' || errorMsg.includes('NO_DATA')) {
      throw new Error(
        `KMA API returned NO_DATA for the requested time window. Please verify the base time. (code: ${errorCode})`,
      );
    }

    throw new Error(`KMA API error: ${errorMsg} (code: ${errorCode})`);
  }

  return data;
};


// Get current weather only (single request)
export const getCurrentWeather = async (lat: number, lon: number): Promise<OpenMeteoResponse> => {
  // Request sufficient data (60 items = 12 categories × 5 time slots)
  // This ensures we get all weather categories (TMP, PTY, SKY, etc.) for multiple hours
  const { data, baseDate, baseTime, gridCoords } = await fetchKMAData(lat, lon, 60);

  // console.log('DEBUG [KMA API] Request summary:', {
  //   requestedCoords: { latitude: lat, longitude: lon },
  //   gridCoords,
  //   baseTime: { date: baseDate, time: baseTime },
  //   mode: 'CURRENT_ONLY',
  // });

  const items = data.response?.body?.items?.item;
  const totalCount = data.response?.body?.totalCount ?? 0;

  // console.log('DEBUG [KMA API] Item summary:', {
  //   totalCount,
  //   hasItems: Array.isArray(items) && items.length > 0,
  //   itemCount: Array.isArray(items) ? items.length : 0,
  //   itemSample: Array.isArray(items) ? items.slice(0, 3) : undefined,
  // });

  if (Array.isArray(items) && items.length > 0) {
    const result = convertKMAToOpenMeteo(items, lat, lon);

    // console.log('DEBUG [KMA API] Converted result:', {
    //   current: result.current,
    //   hourlyCount: result.hourly?.time.length ?? 0,
    //   dailyCount: result.daily?.time.length ?? 0,
    // });

    return result;
  }

  console.error('ERROR [KMA API] Missing items in response:', {
    header: data.response?.header,
    meta: { baseDate, baseTime, gridCoords },
  });
  throw new Error('KMA API did not return any forecast items.');
};

export const getHourlyWeather = async (lat: number, lon: number, hours: number = 24): Promise<OpenMeteoResponse> => {
  // 시간별 예보: 60개 데이터 요청
  const { data, baseDate, baseTime, gridCoords } = await fetchKMAData(lat, lon, 60);

  const items = data.response?.body?.items?.item;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('KMA API did not return any forecast items.');
  }

  return convertKMAToOpenMeteo(items, lat, lon);
};

// Get daily forecast
export const getDailyWeather = async (lat: number, lon: number, days: number = 7): Promise<OpenMeteoResponse> => {
  const { data, baseDate, baseTime, gridCoords } = await fetchKMAData(lat, lon, 290);

  const items = data.response?.body?.items?.item;

  if (!Array.isArray(items) || items.length === 0) {
    console.error('ERROR [KMA API] Missing items in response:', {
      header: data.response?.header,
      meta: { baseDate, baseTime, gridCoords },
    });
    throw new Error('KMA API did not return any forecast items.');
  }

  const result = convertKMAToOpenMeteo(items, lat, lon);

  if (result.hourly) {
    const dailyData: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      precipitation_probability_max: number[];
      wind_speed_10m_max: number[];
    } = {
      time: [],
      weather_code: [],
      temperature_2m_max: [],
      temperature_2m_min: [],
      precipitation_sum: [],
      precipitation_probability_max: [],
      wind_speed_10m_max: [],
    };

    const byDate: Record<string, {
      temps: number[];
      precips: number[];
      pops: number[];
      winds: number[];
      codes: number[];
    }> = {};

    result.hourly.time.forEach((timestamp, idx) => {
      const [date] = timestamp.split('T');
      if (!date) {
        return;
      }

      if (!byDate[date]) {
        byDate[date] = { temps: [], precips: [], pops: [], winds: [], codes: [] };
      }

      const hourly = result.hourly;
      if (!hourly) return; // Safety check for hourly data

      const temp = hourly.temperature_2m[idx];
      const precip = hourly.precipitation[idx];
      const pop = hourly.precipitation_probability[idx];
      const wind = hourly.wind_speed_10m[idx];
      const code = hourly.weather_code[idx];

      if (Number.isFinite(temp) && temp !== undefined) {
        byDate[date].temps.push(temp);
      }
      if (Number.isFinite(precip) && precip !== undefined) {
        byDate[date].precips.push(precip);
      }
      if (Number.isFinite(pop) && pop !== undefined) {
        byDate[date].pops.push(pop);
      }
      if (Number.isFinite(wind) && wind !== undefined) {
        byDate[date].winds.push(wind);
      }
      if (Number.isFinite(code) && code !== undefined) {
        byDate[date].codes.push(code);
      }
    });

    Object.keys(byDate).sort().forEach(date => {
      const bucket = byDate[date];
      if (!bucket) return; // Safety check

      dailyData.time.push(date);
      dailyData.temperature_2m_max.push(bucket.temps.length ? Math.max(...bucket.temps) : 0);
      dailyData.temperature_2m_min.push(bucket.temps.length ? Math.min(...bucket.temps) : 0);
      dailyData.precipitation_sum.push(bucket.precips.reduce((sum, value) => sum + value, 0));
      dailyData.precipitation_probability_max.push(bucket.pops.length ? Math.max(...bucket.pops) : 0);
      dailyData.wind_speed_10m_max.push(bucket.winds.length ? Math.max(...bucket.winds) : 0);
      dailyData.weather_code.push(getDominantValue(bucket.codes, 0));
    });

    if (days > 0 && dailyData.time.length > days) {
      const limit = Math.max(1, Math.min(days, dailyData.time.length));
      dailyData.time = dailyData.time.slice(0, limit);
      dailyData.weather_code = dailyData.weather_code.slice(0, limit);
      dailyData.temperature_2m_max = dailyData.temperature_2m_max.slice(0, limit);
      dailyData.temperature_2m_min = dailyData.temperature_2m_min.slice(0, limit);
      dailyData.precipitation_sum = dailyData.precipitation_sum.slice(0, limit);
      dailyData.precipitation_probability_max = dailyData.precipitation_probability_max.slice(0, limit);
      dailyData.wind_speed_10m_max = dailyData.wind_speed_10m_max.slice(0, limit);
    }

    result.daily = dailyData;
  }

  return result;
};

export const getCompleteWeather = async (
  lat: number,
  lon: number,
  hourlyHours: number = 48,
  forecastDays: number = 7
): Promise<OpenMeteoResponse> => {
  return getDailyWeather(lat, lon, forecastDays);
};

// Seoul default coordinates (for testing)
export const SEOUL_COORDS = {
  latitude: 37.5665,
  longitude: 126.9780
};


