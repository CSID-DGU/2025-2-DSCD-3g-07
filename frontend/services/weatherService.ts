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

// ?꾧꼍?꾨? 湲곗긽泥?寃⑹옄 醫뚰몴濡?蹂??
const convertToGrid = (lat: number, lon: number): { nx: number; ny: number } => {
  const RE = 6371.00877; // 吏援?諛섍꼍(km)
  const GRID = 5.0; // 寃⑹옄 媛꾧꺽(km)
  const SLAT1 = 30.0; // ?ъ쁺 ?꾨룄1(degree)
  const SLAT2 = 60.0; // ?ъ쁺 ?꾨룄2(degree)
  const OLON = 126.0; // 湲곗???寃쎈룄(degree)
  const OLAT = 38.0; // 湲곗????꾨룄(degree)
  const XO = 43; // 湲곗???X醫뚰몴(GRID)
  const YO = 136; // 湲곗???Y醫뚰몴(GRID)

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

// 湲곗긽泥?API?먯꽌 諛쒗몴 ?쒓컖 援ы븯湲?
// 湲곗긽泥??④린?덈낫??留ㅼ씪 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10 (8?? 諛쒗몴
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
  
  // 諛쒗몴 ?쒓컖 紐⑸줉 (02, 05, 08, 11, 14, 17, 20, 23??
  const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
  
  // ?꾩옱 ?쒓컖 ?댁쟾??媛??理쒓렐 諛쒗몴 ?쒓컖 李얘린
  let baseHour = baseHours[0] || 2; // 湲곕낯媛?
  for (let i = baseHours.length - 1; i >= 0; i--) {
    const bh = baseHours[i];
    if (bh !== undefined) {
      // 諛쒗몴 ?쒓컖? 10遺??꾨????ъ슜 媛??(?? 02??諛쒗몴??02:10遺??
      if (hour > bh || (hour === bh && minute >= 10)) {
        baseHour = bh;
        break;
      }
    }
  }
  
  // 留뚯빟 ?꾩옱 ?쒓컖??泥?諛쒗몴(02:10) ?댁쟾?대㈃ ?꾨궇 留덉?留?諛쒗몴(23:00) ?ъ슜
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

// 湲곗긽泥??곗씠?곕? OpenMeteo ?뺤떇?쇰줈 蹂??
const convertKMAToOpenMeteo = (
  kmaData: KMAWeatherItem[],
  lat: number,
  lon: number
): OpenMeteoResponse => {
  console.log('?봽 [?곗씠??蹂?? ?쒖옉:', {
    ?꾩껜??ぉ?? kmaData.length,
    移댄뀒怨좊━?? [...new Set(kmaData.map(d => d.category))].join(', ')
  });

  // ?꾩옱 ?쒓컖 湲곗? ?곗씠???뚯떛
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

  // ?쒓컙蹂꾨줈 ?곗씠??洹몃９??
  const dataByTime: Record<string, Record<string, string>> = {};
  
  kmaData.forEach(item => {
    const datetime = `${item.fcstDate}${item.fcstTime}`;
    if (!dataByTime[datetime]) {
      dataByTime[datetime] = {};
    }
    dataByTime[datetime][item.category] = item.fcstValue;
  });

  console.log('?뱤 [?곗씠??蹂?? ?쒓컙?蹂?洹몃９???꾨즺:', {
    ?쒓컙??? Object.keys(dataByTime).length,
    泥ル쾲吏몄떆媛? Object.keys(dataByTime).sort()[0]
  });

  // 泥?踰덉㎏ ?쒓컙?瑜??꾩옱 ?좎뵪濡??ъ슜
  const times = Object.keys(dataByTime).sort();
  if (times.length > 0 && times[0]) {
    const firstTime = times[0];
    const firstData = dataByTime[firstTime];
    
    if (firstData) {
      // ?꾩옱 ?좎뵪
      const temp = parseFloat(firstData.TMP || '0');
      const humidity = parseFloat(firstData.REH || '0');
      const pop = parseFloat(firstData.POP || '0');
      const pty = parseInt(firstData.PTY || '0');
      const sky = parseInt(firstData.SKY || '1');
      const wsd = parseFloat(firstData.WSD || '0');
      const vec = parseFloat(firstData.VEC || '0');
      
      // weather_code 怨꾩궛 (媛뺤닔?뺥깭 ?곗꽑)
      let weatherCode = 0;
      if (pty > 0) {
        weatherCode = pty === 1 ? 61 : pty === 2 ? 71 : pty === 3 ? 71 : 80;
      } else {
        weatherCode = sky === 1 ? 0 : sky === 3 ? 2 : 3;
      }

      console.log('?뵇 [?좎뵪 肄붾뱶 蹂??:', {
        ?먮낯媛? { PTY: pty, SKY: sky },
        蹂?섍껐怨? weatherCode,
        ?ㅻ챸: weatherCode === 0 ? '留묒쓬' : weatherCode === 2 ? '遺遺??먮┝' : weatherCode === 3 ? '?먮┝' : weatherCode === 61 ? '媛踰쇱슫 鍮? : weatherCode === 71 ? '媛踰쇱슫 ?? : '?뚮굹湲?
      });

      const current = {
        time: `${firstTime.substring(0, 4)}-${firstTime.substring(4, 6)}-${firstTime.substring(6, 8)}T${firstTime.substring(8, 10)}:00`,
        temperature_2m: temp,
        relative_humidity_2m: humidity,
        apparent_temperature: temp - (wsd * 0.5), // 媛꾨떒??泥닿컧?⑤룄 怨꾩궛
        precipitation: parseKMAPrecipAmount(firstData.PCP),
        rain: pty === 1 ? parseKMAPrecipAmount(firstData.PCP) : 0,
        weather_code: weatherCode,
        wind_speed_10m: wsd,
        wind_direction_10m: vec,
      };

      console.log('?뙜截?[?꾩옱 ?좎뵪]:', {
        ?쒓컖: current.time,
        湲곗삩: `${temp}??,
        ?듬룄: `${humidity}%`,
        媛뺤닔?뺣쪧: `${pop}%`,
        媛뺤닔?뺥깭: pty === 0 ? '?놁쓬' : pty === 1 ? '鍮? : pty === 2 ? '鍮??? : pty === 3 ? '?? : '?뚮굹湲?,
        ?섎뒛?곹깭: sky === 1 ? '留묒쓬' : sky === 3 ? '援щ쫫留롮쓬' : '?먮┝',
        ?띿냽: `${wsd}m/s`,
        蹂?섎맂肄붾뱶: weatherCode
      });

      // ?쒓컙蹂??곗씠??
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

  // ?곗씠?곌? ?놁쓣 寃쎌슦 湲곕낯媛?
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

// API ?묐떟???덉쟾?섍쾶 ?뚯떛?섎뒗 ?ы띁 ?⑥닔
const parseWeatherResponse = async (response: Response): Promise<KMAWeatherResponse> => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('??[湲곗긽泥?API] HTTP ?ㅻ쪟:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    throw new Error(`?좎뵪 API ?몄텧 ?ㅽ뙣: ${response.status} - ${errorText}`);
  }
  
  const data = (await response.json()) as any;
  console.log('?뱻 [湲곗긽泥?API] ?먮낯 JSON:', data);
  
  // ?먮윭 ?묐떟 泥댄겕
  if (data.response?.header?.resultCode !== '00') {
    const errorMsg = data.response?.header?.resultMsg || '?????녿뒗 ?ㅻ쪟';
    const errorCode = data.response?.header?.resultCode || 'UNKNOWN';
    
    console.error('??[湲곗긽泥?API] ?먮윭 ?묐떟:', {
      肄붾뱶: errorCode,
      硫붿떆吏: errorMsg,
      ?꾩껜?ㅻ뜑: data.response?.header
    });
    
    // NO_DATA ?먮윭??????곸꽭 ?ㅻ챸
    if (errorCode === '03' || errorMsg.includes('NO_DATA')) {
      throw new Error(`湲곗긽泥?API ?곗씠???놁쓬: ?붿껌???쒓컙????곗씠?곌? ?놁뒿?덈떎. 諛쒗몴 ?쒓컖???뺤씤?댁＜?몄슂. (?먮윭肄붾뱶: ${errorCode})`);
    }
    
    throw new Error(`湲곗긽泥?API ?ㅻ쪟: ${errorMsg} (?먮윭肄붾뱶: ${errorCode})`);
  }
  
  return data as KMAWeatherResponse;
};


// ?꾩옱 ?좎뵪 ?뺣낫留?媛?몄삤湲?
export const getCurrentWeather = async (lat: number, lon: number): Promise<OpenMeteoResponse> => {
  const { nx, ny } = convertToGrid(lat, lon);
  const { baseDate, baseTime } = getBaseTime();

  console.log('?뙇 [湲곗긽泥?API] ?좎뵪 ?붿껌:', {
    ?낅젰?꾩튂: { ?꾨룄: lat, 寃쎈룄: lon },
    寃⑹옄醫뚰몴: { nx, ny },
    諛쒗몴?쇱떆: { ?좎쭨: baseDate, ?쒓컖: baseTime },
    ?꾩옱?쒓컖: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
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
  console.log('?뵕 [湲곗긽泥?API] ?붿껌 URL:', apiUrl);

  const response = await fetch(apiUrl);
  const kmaData = await parseWeatherResponse(response);
  
  console.log('?벀 [湲곗긽泥?API] ?먮낯 ?묐떟:', {
    ?곹깭: kmaData.response?.header,
    ?꾩껜?묐떟: kmaData
  });
  
  // API ?묐떟 援ъ“ ?덉쟾?섍쾶 ?뺤씤
  const items = kmaData.response?.body?.items?.item;
  const totalCount = kmaData.response?.body?.totalCount;
  
  console.log('?뱤 [湲곗긽泥?API] ?곗씠???뺤씤:', {
    totalCount: totalCount,
    items議댁옱: !!items,
    items??? Array.isArray(items) ? 'array' : typeof items,
    items媛쒖닔: Array.isArray(items) ? items.length : 0
  });
  
  if (items && Array.isArray(items) && items.length > 0) {
    console.log('??[湲곗긽泥?API] ?곗씠???섑뵆:', items.slice(0, 3));
    
    const result = convertKMAToOpenMeteo(items, lat, lon);
    
    console.log('??[湲곗긽泥?API] 蹂?섎맂 ?곗씠??', {
      ?꾩옱?좎뵪: result.current,
      ?쒓컙蹂꾩삁蹂?媛쒖닔: result.hourly?.time.length || 0,
      ?쇰퀎?덈낫_媛쒖닔: result.daily?.time.length || 0
    });
    
    return result;
  }

  console.error('??[湲곗긽泥?API] ?곗씠???놁쓬:', kmaData);
  throw new Error('?좎뵪 ?곗씠?곕? 媛?몄삱 ???놁뒿?덈떎. API ?묐떟: ' + JSON.stringify(kmaData.response?.header || kmaData));
};

// ?쒓컙蹂??덈낫 ?ы븿?댁꽌 媛?몄삤湲?
export const getHourlyWeather = async (lat: number, lon: number, hours: number = 24): Promise<OpenMeteoResponse> => {
  return getCurrentWeather(lat, lon); // 湲곗긽泥?API???④린?덈낫???쒓컙蹂??곗씠???ы븿
};

// ?쇰퀎 ?덈낫 ?ы븿?댁꽌 媛?몄삤湲?
export const getDailyWeather = async (lat: number, lon: number, days: number = 7): Promise<OpenMeteoResponse> => {
  const { nx, ny } = convertToGrid(lat, lon);
  const { baseDate, baseTime } = getBaseTime();

  const params = new URLSearchParams({
    serviceKey: KMA_API_KEY,
    numOfRows: '290', // ??留롮? ?곗씠??媛?몄삤湲?
    pageNo: '1',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: nx.toString(),
    ny: ny.toString(),
  });

  const response = await fetch(`${KMA_BASE_URL}/getVilageFcst?${params}`);
  const kmaData = await parseWeatherResponse(response);
  
  // API ?묐떟 援ъ“ ?덉쟾?섍쾶 ?뺤씤
  const items = kmaData.response?.body?.items?.item;
  
  if (items && Array.isArray(items) && items.length > 0) {
    const result = convertKMAToOpenMeteo(items, lat, lon);
    
    // ?쇰퀎 ?곗씠??異붽? ?앹꽦
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

      // ?좎쭨蹂꾨줈 ?곗씠??洹몃９??
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

      // ?좎쭨蹂??듦퀎 怨꾩궛
      Object.keys(byDate).sort().forEach(date => {
        const data = byDate[date];
        if (data) {
          dailyData.time.push(date);
          dailyData.temperature_2m_max.push(Math.max(...data.temps));
          dailyData.temperature_2m_min.push(Math.min(...data.temps));
          dailyData.precipitation_sum.push(data.precips.reduce((a, b) => a + b, 0));
          dailyData.precipitation_probability_max.push(Math.max(...data.pops));
          dailyData.wind_speed_10m_max.push(Math.max(...data.winds));
          dailyData.weather_code.push(Math.max(...data.codes)); // 媛???낆쿇??肄붾뱶
        }
      });

      result.daily = dailyData;
    }

    return result;
  }

  console.error('??[湲곗긽泥?API] ?쇰퀎 ?곗씠???놁쓬:', kmaData);
  throw new Error('?좎뵪 ?곗씠?곕? 媛?몄삱 ???놁뒿?덈떎. API ?묐떟: ' + JSON.stringify(kmaData.response?.header || kmaData));
};

// 紐⑤뱺 ?뺣낫瑜??ы븿??醫낇빀 ?좎뵪 ?뺣낫
export const getCompleteWeather = async (
  lat: number, 
  lon: number, 
  hourlyHours: number = 48, 
  forecastDays: number = 7
): Promise<OpenMeteoResponse> => {
  return getDailyWeather(lat, lon, forecastDays);
};

// ?쒖슱 湲곕낯 醫뚰몴 (?뚯뒪?몄슜)
export const SEOUL_COORDS = {
  latitude: 37.5665,
  longitude: 126.9780
};

