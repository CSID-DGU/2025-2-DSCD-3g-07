// 기상청 API 타입 정의
export interface KMAWeatherResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      dataType: string;
      items: {
        item: KMAWeatherItem[];
      };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

export interface KMAWeatherItem {
  baseDate: string;      // 발표일자
  baseTime: string;      // 발표시각
  category: string;      // 자료구분코드
  fcstDate: string;      // 예보일자
  fcstTime: string;      // 예보시각
  fcstValue: string;     // 예보값
  nx: number;            // 예보지점 X좌표
  ny: number;            // 예보지점 Y좌표
}

// 단기예보 카테고리
export type KMACategory = 
  | 'POP'  // 강수확률 (%)
  | 'PTY'  // 강수형태 (코드값)
  | 'PCP'  // 1시간 강수량 (mm)
  | 'REH'  // 습도 (%)
  | 'SNO'  // 1시간 신적설 (cm)
  | 'SKY'  // 하늘상태 (코드값)
  | 'TMP'  // 1시간 기온 (℃)
  | 'TMN'  // 일 최저기온 (℃)
  | 'TMX'  // 일 최고기온 (℃)
  | 'UUU'  // 풍속(동서성분) (m/s)
  | 'VVV'  // 풍속(남북성분) (m/s)
  | 'WAV'  // 파고 (M)
  | 'VEC'  // 풍향 (deg)
  | 'WSD'; // 풍속 (m/s)

// 파싱된 날씨 데이터
export interface ParsedWeatherData {
  datetime: string;
  temperature?: number;        // 기온 (℃)
  humidity?: number;          // 습도 (%)
  precipitationProb?: number; // 강수확률 (%)
  precipitation?: string;     // 강수량
  precipitationType?: number; // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기)
  skyCondition?: number;      // 하늘상태 (1:맑음, 3:구름많음, 4:흐림)
  windSpeed?: number;         // 풍속 (m/s)
  windDirection?: number;     // 풍향 (deg)
  snowfall?: string;          // 적설량
}

// 통합 날씨 응답 (기존 코드와 호환성 유지)
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
}

// 하위 호환성을 위한 타입 별칭
export type OpenMeteoCurrentWeather = OpenMeteoResponse['current'];
export type OpenMeteoHourlyWeather = NonNullable<OpenMeteoResponse['hourly']>;
export type OpenMeteoDailyWeather = NonNullable<OpenMeteoResponse['daily']>;


// 날씨 코드를 한국어로 변환 (기상청 API 기반)
export const getWeatherDescription = (skyCode?: number, ptyCode?: number): { description: string; emoji: string } => {
  // 강수형태 우선 (PTY)
  if (ptyCode !== undefined && ptyCode > 0) {
    const ptyDescriptions: Record<number, { description: string; emoji: string }> = {
      1: { description: '비', emoji: '🌧️' },
      2: { description: '비/눈', emoji: '�️' },
      3: { description: '눈', emoji: '❄️' },
      4: { description: '소나기', emoji: '⛈️' },
      5: { description: '빗방울', emoji: '�️' },
      6: { description: '빗방울/눈날림', emoji: '�️' },
      7: { description: '눈날림', emoji: '�️' },
    };
    return ptyDescriptions[ptyCode] || { description: '알 수 없음', emoji: '❓' };
  }

  // 하늘상태 (SKY)
  if (skyCode !== undefined) {
    const skyDescriptions: Record<number, { description: string; emoji: string }> = {
      1: { description: '맑음', emoji: '☀️' },
      3: { description: '구름많음', emoji: '⛅' },
      4: { description: '흐림', emoji: '☁️' },
    };
    return skyDescriptions[skyCode] || { description: '알 수 없음', emoji: '❓' };
  }

  return { description: '정보없음', emoji: '❓' };
};

// Open Meteo 호환 함수 (기존 코드 지원)
export const getWeatherDescriptionFromCode = (code: number): { description: string; emoji: string } => {
  // 하늘상태로 간주 (1, 3, 4)
  if (code <= 4) {
    return getWeatherDescription(code, 0);
  }
  
  const weatherCodes: Record<number, { description: string; emoji: string }> = {
    0: { description: '맑음', emoji: '☀️' },
    1: { description: '대체로 맑음', emoji: '�️' },
    2: { description: '부분적으로 흐림', emoji: '⛅' },
    3: { description: '흐림', emoji: '☁️' },
    45: { description: '안개', emoji: '�️' },
    48: { description: '서리 안개', emoji: '�️' },
    51: { description: '가벼운 이슬비', emoji: '🌦️' },
    53: { description: '보통 이슬비', emoji: '🌦️' },
    55: { description: '강한 이슬비', emoji: '�️' },
    61: { description: '가벼운 비', emoji: '�️' },
    63: { description: '보통 비', emoji: '🌧️' },
    65: { description: '강한 비', emoji: '🌧️' },
    71: { description: '가벼운 눈', emoji: '🌨️' },
    73: { description: '보통 눈', emoji: '❄️' },
    75: { description: '강한 눈', emoji: '❄️' },
    80: { description: '가벼운 소나기', emoji: '🌦️' },
    81: { description: '보통 소나기', emoji: '⛈️' },
    82: { description: '강한 소나기', emoji: '⛈️' },
    95: { description: '뇌우', emoji: '⛈️' },
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