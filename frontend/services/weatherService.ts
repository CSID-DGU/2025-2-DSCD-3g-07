import { OpenMeteoResponse, KMAWeatherResponse, KMAWeatherItem, ParsedWeatherData } from '../types/weather';



// 기상청 API 설정

const KMA_BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// API 키는 인코딩된 상태를 사용 (decodeURIComponent 하지 않음)

const KMA_API_KEY = 'fd3ec2dea8cbb11a251a2ce60843ea3236811fca06f2a8eb8f63426b208f35da';



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

// 위경도 -> 기상청 격자 좌표 변환
const convertToGrid = (lat: number, lon: number): { nx: number; ny: number } => {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 표준 위도1(degree)
  const SLAT2 = 60.0; // 표준 위도2(degree)
  const OLON = 126.0; // 기준 경도(degree)
  const OLAT = 38.0; // 기준 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

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

// 기상청 API 발표 시각 계산
// 단기예보는 매일 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10 총 8회 발표
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
  
  // 발표 시각 목록 (02, 05, 08, 11, 14, 17, 20, 23시)
  const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
  
  // 현재 시각 기준 가장 최근 발표 시각 선택
  let baseHour = baseHours[0] || 2; // 기본값
  for (let i = baseHours.length - 1; i >= 0; i--) {
    const bh = baseHours[i];
    if (bh !== undefined) {
      // 발표는 발표 시각 기준 10분 후부터 활용 (예: 02시는 02:10 이후)
      if (hour > bh || (hour === bh && minute >= 10)) {
        baseHour = bh;
        break;
      }
    }
  }
  
  // 하루 첫 발표(02:10) 이전이면 전날 23:00 발표 사용
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

// 기상청 데이터를 OpenMeteo 포맷으로 변환
const convertKMAToOpenMeteo = (
  kmaData: KMAWeatherItem[],
  lat: number,
  lon: number
): OpenMeteoResponse => {
  console.log('DEBUG [KMA->OpenMeteo] 변환 시작:', {
    totalItems: kmaData.length,
    categories: [...new Set(kmaData.map(d => d.category))].join(', '),
  });

  // 현재 시각 기준 기초 데이터 구조 준비
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

  // 시각별로 데이터 그룹화
  const dataByTime: Record<string, Record<string, string>> = {};
  
  kmaData.forEach(item => {
    const datetime = `${item.fcstDate}${item.fcstTime}`;
    if (!dataByTime[datetime]) {
      dataByTime[datetime] = {};
    }
    dataByTime[datetime][item.category] = item.fcstValue;
  });

  console.log('DEBUG [KMA->OpenMeteo] 타임라인 그룹 완료:', {
    timeSlotCount: Object.keys(dataByTime).length,
    earliestTimestamp: Object.keys(dataByTime).sort()[0],
  });

  // 첫 번째 시간대를 현재 날씨로 사용
  const times = Object.keys(dataByTime).sort();
  if (times.length > 0 && times[0]) {
    const firstTime = times[0];
    const firstData = dataByTime[firstTime];
    
    if (firstData) {
      // 현재 조건
      const temp = parseFloat(firstData.TMP || '0');
      const humidity = parseFloat(firstData.REH || '0');
      const pop = parseFloat(firstData.POP || '0');
      const pty = parseInt(firstData.PTY || '0');
      const sky = parseInt(firstData.SKY || '1');
      const wsd = parseFloat(firstData.WSD || '0');
      const vec = parseFloat(firstData.VEC || '0');
      
      // weather_code 결정 (강수/하늘 상태 매핑)
      let weatherCode = 0;
      if (pty > 0) {
        weatherCode = pty === 1 ? 61 : pty === 2 ? 71 : pty === 3 ? 71 : 80;
      } else {
        weatherCode = sky === 1 ? 0 : sky === 3 ? 2 : 3;
      }

      const weatherLabel =
        weatherCode === 0 ? '맑음' :
        weatherCode === 2 ? '부분 흐림' :
        weatherCode === 3 ? '흐림' :
        weatherCode === 61 ? '약한 비' :
        weatherCode === 71 ? '약한 눈' :
        '강수';
      const precipitationType =
        pty === 0 ? '없음' :
        pty === 1 ? '비' :
        pty === 2 ? '비/눈' :
        pty === 3 ? '눈' :
        '소나기';
      const skyLabel = sky === 1 ? '맑음' : sky === 3 ? '구름 많음' : '흐림';

      console.log('DEBUG [날씨 코드 매핑]:', {
        raw: { PTY: pty, SKY: sky },
        weatherCode,
        weatherLabel,
      });

      const current = {
        time: `${firstTime.substring(0, 4)}-${firstTime.substring(4, 6)}-${firstTime.substring(6, 8)}T${firstTime.substring(8, 10)}:00`,
        temperature_2m: temp,
        relative_humidity_2m: humidity,
        apparent_temperature: temp - (wsd * 0.5), // 체감온도를 단순 보정
        precipitation: parseKMAPrecipAmount(firstData.PCP),
        rain: pty === 1 ? parseKMAPrecipAmount(firstData.PCP) : 0,
        weather_code: weatherCode,
        wind_speed_10m: wsd,
        wind_direction_10m: vec,
      };

      console.log('DEBUG [현재 날씨 변환 결과]:', {
        timestamp: current.time,
        temperature: `${temp}C`,
        humidity: `${humidity}%`,
        precipitationProbability: `${pop}%`,
        precipitationType,
        sky: skyLabel,
        windSpeed: `${wsd}m/s`,
        weatherCode,
        weatherLabel,
      });

      // 시간별 데이터 적재
      times.forEach(time => {
        const data = dataByTime[time];
        if (data) {
          const datetime = `${time.substring(0, 4)}-${time.substring(4, 6)}-${time.substring(6, 8)}T${time.substring(8, 10)}:00`;
          
          const temp = parseFloat(data.TMP || '0');
          const humidity = parseFloat(data.REH || '0');
          const pop = parseFloat(data.POP || '0');
          const pty = parseInt(data.PTY || '0');
          const sky = parseInt(data.SKY || '1');
          const wsd = parseFloat(data.WSD || '0');
          const vec = parseFloat(data.VEC || '0');
          
          let weatherCode = 0;
          if (pty > 0) {
            weatherCode = pty === 1 ? 61 : pty === 2 ? 71 : pty === 3 ? 71 : 80;
          } else {
            weatherCode = sky === 1 ? 0 : sky === 3 ? 2 : 3;
          }

          hourlyData.time.push(datetime);
          hourlyData.temperature_2m.push(temp);
          hourlyData.relative_humidity_2m.push(humidity);
          hourlyData.precipitation_probability.push(pop);
          hourlyData.precipitation.push(parseKMAPrecipAmount(data.PCP));
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

  // 데이터가 없을 때는 기본값 반환
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

// API 응답을 안전하게 파싱하는 헬퍼
const parseWeatherResponse = async (response: Response): Promise<KMAWeatherResponse> => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('ERROR [기상청 API] HTTP 오류:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`기상청 API 요청 실패: ${response.status} - ${errorText}`);
  }
  
  const data = (await response.json()) as any;
  console.log('DEBUG [기상청 API] 원본 JSON:', data);
  
  // 오류 응답 검사
  if (data.response?.header?.resultCode !== '00') {
    const errorMsg = data.response?.header?.resultMsg || '알 수 없는 오류';
    const errorCode = data.response?.header?.resultCode || 'UNKNOWN';
    
    console.error('ERROR [기상청 API] 오류 응답:', {
      errorCode,
      errorMsg,
      header: data.response?.header,
    });
    
    // NO_DATA 오류는 상세 안내
    if (errorCode === '03' || errorMsg.includes('NO_DATA')) {
      throw new Error(`기상청 API 데이터 없음: 요청한 기준 시간에 데이터가 존재하지 않습니다. 발표 시각을 다시 확인해주세요. (오류코드: ${errorCode})`);
    }
    
    throw new Error(`기상청 API 오류: ${errorMsg} (오류코드: ${errorCode})`);
  }
  
  return data as KMAWeatherResponse;
};


// 현재 날씨 한 번 조회
export const getCurrentWeather = async (lat: number, lon: number): Promise<OpenMeteoResponse> => {
  const { nx, ny } = convertToGrid(lat, lon);
  const { baseDate, baseTime } = getBaseTime();

  console.log('DEBUG [기상청 API] 요청 파라미터:', {
    requestedCoords: { latitude: lat, longitude: lon },
    gridCoords: { nx, ny },
    baseTime: { date: baseDate, time: baseTime },
    nowKST: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
  });

  const params = new URLSearchParams({
    serviceKey: KMA_API_KEY,
    numOfRows: '60',
    pageNo: '1',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: nx.toString(),
    ny: ny.toString(),
  });

  const apiUrl = `${KMA_BASE_URL}/getVilageFcst?${params}`;
  console.log('DEBUG [기상청 API] 요청 URL:', apiUrl);

  const response = await fetch(apiUrl);
  const kmaData = await parseWeatherResponse(response);
  
  console.log('DEBUG [기상청 API] 응답 요약:', {
    header: kmaData.response?.header,
    raw: kmaData,
  });
  
  // API 응답 구조 확인
  const items = kmaData.response?.body?.items?.item;
  const totalCount = kmaData.response?.body?.totalCount;
  
  console.log('DEBUG [기상청 API] 아이템 확인:', {
    totalCount: totalCount,
    hasItems: !!items,
    itemsType: Array.isArray(items) ? 'array' : typeof items,
    itemCount: Array.isArray(items) ? items.length : 0,
  });
  
  if (items && Array.isArray(items) && items.length > 0) {
    console.log('DEBUG [기상청 API] 원시 데이터 샘플:', items.slice(0, 3));
    
    const result = convertKMAToOpenMeteo(items, lat, lon);
    
    console.log('DEBUG [기상청 API] 변환 결과:', {
      current: result.current,
      hourlyCount: result.hourly?.time.length || 0,
      dailyCount: result.daily?.time.length || 0,
    });
    
    return result;
  }

  console.error('ERROR [기상청 API] 데이터 없음:', kmaData);
  throw new Error('날씨 데이터를 가져올 수 없습니다. API 응답을 확인해주세요: ' + JSON.stringify(kmaData.response?.header || kmaData));
};

// 시간별 예보 조회 (현재는 단기예보 API 결과 재사용)
export const getHourlyWeather = async (lat: number, lon: number, hours: number = 24): Promise<OpenMeteoResponse> => {
  return getCurrentWeather(lat, lon); // 기상청 API 응답을 시간별 예보로 활용
};

// 일별 예보 조회
export const getDailyWeather = async (lat: number, lon: number, days: number = 7): Promise<OpenMeteoResponse> => {
  const { nx, ny } = convertToGrid(lat, lon);
  const { baseDate, baseTime } = getBaseTime();

  const params = new URLSearchParams({
    serviceKey: KMA_API_KEY,
    numOfRows: '290', // 가능한 많은 데이터를 확보하기 위한 충분한 row 수
    pageNo: '1',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: nx.toString(),
    ny: ny.toString(),
  });

  const response = await fetch(`${KMA_BASE_URL}/getVilageFcst?${params}`);
  const kmaData = await parseWeatherResponse(response);
  
  // API 응답 유효성 확인
  const items = kmaData.response?.body?.items?.item;
  
  if (items && Array.isArray(items) && items.length > 0) {
    const result = convertKMAToOpenMeteo(items, lat, lon);
    
    // 일별 데이터 구성
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

      // 날짜별로 데이터 누적
      const byDate: Record<string, {
        temps: number[];
        precips: number[];
        pops: number[];
        winds: number[];
        codes: number[];
      }> = {};

      result.hourly.time.forEach((time, idx) => {
        const dateMatch = time.split('T');
        if (dateMatch && dateMatch[0]) {
          const date = dateMatch[0];
          if (!byDate[date]) {
            byDate[date] = { temps: [], precips: [], pops: [], winds: [], codes: [] };
          }
          if (result.hourly) {
            const temp = result.hourly.temperature_2m[idx];
            const precip = result.hourly.precipitation[idx];
            const pop = result.hourly.precipitation_probability[idx];
            const wind = result.hourly.wind_speed_10m[idx];
            const code = result.hourly.weather_code[idx];
            
            if (temp !== undefined) byDate[date].temps.push(temp);
            if (precip !== undefined) byDate[date].precips.push(precip);
            if (pop !== undefined) byDate[date].pops.push(pop);
            if (wind !== undefined) byDate[date].winds.push(wind);
            if (code !== undefined) byDate[date].codes.push(code);
          }
        }
      });

      // 날짜별 요약 계산
      Object.keys(byDate).sort().forEach(date => {
        const data = byDate[date];
        if (data) {
          dailyData.time.push(date);
          dailyData.temperature_2m_max.push(Math.max(...data.temps));
          dailyData.temperature_2m_min.push(Math.min(...data.temps));
          dailyData.precipitation_sum.push(data.precips.reduce((a, b) => a + b, 0));
          dailyData.precipitation_probability_max.push(Math.max(...data.pops));
          dailyData.wind_speed_10m_max.push(Math.max(...data.winds));
          dailyData.weather_code.push(Math.max(...data.codes)); // 강수 우선 순서를 고려해 최대값 사용
        }
      });

      result.daily = dailyData;
    }

    return result;
  }

  console.error('ERROR [기상청 API] 일별 데이터 없음:', kmaData);
  throw new Error('일별 날씨 데이터를 가져올 수 없습니다. API 응답을 확인해주세요: ' + JSON.stringify(kmaData.response?.header || kmaData));
};

// 전체 날씨 조회
export const getCompleteWeather = async (
  lat: number, 
  lon: number, 
  hourlyHours: number = 48, 
  forecastDays: number = 7
): Promise<OpenMeteoResponse> => {
  return getDailyWeather(lat, lon, forecastDays);
};

// 서울 기본 좌표 (테스트용)
export const SEOUL_COORDS = {
  latitude: 37.5665,
  longitude: 126.9780
};
