# 湲곗긽泥?API ?꾪솚 媛?대뱶

## 媛쒖슂
Open Meteo API?먯꽌 湲곗긽泥??④린?덈낫 API濡??꾪솚?덉뒿?덈떎.
## Local Testing Checklist
- Run the FastAPI backend (`uvicorn backend.app.main:app --reload`) so the `/weather/kma` proxy can reach the public KMA API on behalf of the web client.
- Add `KMA_SERVICE_KEY=<decoded_service_key>` (or `KMA_API_KEY`) to `backend/.env`. The proxy reads this secret; the frontend no longer embeds the key when targeting web.
- Expo web/native builds reuse `frontend/utils/apiClient`. Confirm the detected base URL resolves to the backend (the console logs the chosen host during startup).
- When GPS permissions are disabled, the Weather Test screen defaults to Seoul (`37.5665, 126.9780`). Toggle the location switch to validate both fallback and real-location flows.

## Manual Verification Guide
1. Start the backend and hit `GET /api-health`; the Weather Test screen should log the resolved API base URL.
2. In the Weather Test tab with location disabled, fetch weather data and confirm current/hourly fields differ and `weather_code` matches the mapped KMA `PTY/SKY` combination.
3. Enable location permissions and fetch again; ensure the console shows different grid coordinates and precipitation fields fall back to `0` when KMA omits values.
4. Use the browser network panel (web) or Metro logs (native) to verify calls go to `/api/weather/kma` instead of the public domain?봳his confirms the CORS-safe proxy path.
5. Test edge cases (rapid toggles, times outside supported base windows) and confirm the UI surfaces the descriptive errors thrown by `parseWeatherResponse`.


## 蹂寃쎌궗??

### 1. API ?붾뱶?ъ씤??蹂寃?
- **?댁쟾**: Open Meteo API (`https://api.open-meteo.com/v1/forecast`)
- **?꾩옱**: 湲곗긽泥??④린?덈낫 API (`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`)

### 2. API ??
- **API ??*: `fd3ec2dea8cbb11a251a2ce60843ea3236811fca06f2a8eb8f63426b208f35da`
- **?꾩튂**: `frontend/services/weatherService.ts`

### 3. 二쇱슂 蹂寃??뚯씪

#### `frontend/types/weather.ts`
- 湲곗긽泥?API ????뺤쓽 異붽?:
  - `KMAWeatherResponse`: 湲곗긽泥?API ?묐떟 ???
  - `KMAWeatherItem`: 湲곗긽泥??좎뵪 ??ぉ ???
  - `KMACategory`: 湲곗긽泥?移댄뀒怨좊━ 肄붾뱶
  - `ParsedWeatherData`: ?뚯떛???좎뵪 ?곗씠??
  
- `OpenMeteoResponse` ???媛꾩냼??(?섏쐞 ?명솚???좎?)
- `getWeatherDescription()` ?⑥닔 ?낅뜲?댄듃:
  - 湲곗긽泥?SKY(?섎뒛?곹깭)? PTY(媛뺤닔?뺥깭) 肄붾뱶 吏??
  - 湲곗〈 肄붾뱶 吏?먯쓣 ?꾪븳 `getWeatherDescriptionFromCode()` 異붽?

#### `frontend/services/weatherService.ts`
- **?덈줈???⑥닔??*:
  - `convertToGrid()`: ?꾧꼍????湲곗긽泥?寃⑹옄 醫뚰몴 蹂??
  - `getBaseTime()`: 湲곗긽泥?API 諛쒗몴 ?쒓컖 怨꾩궛
  - `convertKMAToOpenMeteo()`: 湲곗긽泥??곗씠????OpenMeteo ?뺤떇 蹂??

- **?낅뜲?댄듃???⑥닔??*:
  - `getCurrentWeather()`: 湲곗긽泥?API ?몄텧
  - `getHourlyWeather()`: 湲곗긽泥??④린?덈낫 ?곗씠??諛섑솚
  - `getDailyWeather()`: ?쒓컙蹂??곗씠?곗뿉???쇰퀎 ?듦퀎 ?앹꽦
  - `getCompleteWeather()`: 醫낇빀 ?좎뵪 ?뺣낫 諛섑솚

#### `frontend/components/WeatherTestScreen.tsx`
- ?쒕ぉ 蹂寃? "湲곗긽泥??좎뵪 API ?뚯뒪??
- 遺덊븘?뷀븳 ?꾨뱶 ?쒓굅 (elevation, generationtime_ms, ??
- `getWeatherDescriptionFromCode()` ?ъ슜

### 4. 湲곗긽泥?API ?곗씠??援ъ“

#### 移댄뀒怨좊━ 肄붾뱶
- `POP`: 媛뺤닔?뺣쪧 (%)
- `PTY`: 媛뺤닔?뺥깭 (0:?놁쓬, 1:鍮? 2:鍮??? 3:?? 4:?뚮굹湲?
- `PCP`: 1?쒓컙 媛뺤닔??(mm)
- `REH`: ?듬룄 (%)
- `SNO`: 1?쒓컙 ?좎쟻??(cm)
- `SKY`: ?섎뒛?곹깭 (1:留묒쓬, 3:援щ쫫留롮쓬, 4:?먮┝)
- `TMP`: 1?쒓컙 湲곗삩 (??
- `TMN`: ??理쒖?湲곗삩 (??
- `TMX`: ??理쒓퀬湲곗삩 (??
- `VEC`: ?랁뼢 (deg)
- `WSD`: ?띿냽 (m/s)

#### 寃⑹옄 醫뚰몴 蹂??
湲곗긽泥?API???꾧꼍?꾧? ?꾨땶 寃⑹옄 醫뚰몴(nx, ny)瑜??ъ슜?⑸땲??
- Lambert Conformal Conic ?ъ쁺踰??ъ슜
- ?쒖슱(37.5665째N, 126.9780째E) ??(60, 127)

### 5. ?섏쐞 ?명솚??
湲곗〈 肄붾뱶????명솚?깆쓣 ?꾪빐 OpenMeteo ?묐떟 ?뺤떇???좎??⑸땲??
- `OpenMeteoResponse` ?명꽣?섏씠???좎?
- 湲곗긽泥??곗씠?곕? OpenMeteo ?뺤떇?쇰줈 蹂??
- 湲곗〈 而댄룷?뚰듃?먯꽌 ?섏젙 理쒖냼??

### 6. ?쒗븳?ы빆
- **諛쒗몴 ?쒓컖**: 湲곗긽泥?API??2?쒓컙 ???곗씠???쒓났
- **?덈낫 踰붿쐞**: ?④린?덈낫??3?쇨컙???쒓컙蹂??덈낫 ?쒓났
- **寃⑹옄 ?⑥쐞**: ??5km ?댁긽??

## ?뚯뒪??諛⑸쾿

### 1. ???ㅽ뻾
```bash
cd frontend
npm start
```

### 2. ?좎뵪 ?뚯뒪???붾㈃
- ?깆뿉??"Weather Test" ??쑝濡??대룞
- "?좎뵪 媛?몄삤湲? 踰꾪듉 ?대┃
- ?꾩옱 ?꾩튂 ?먮뒗 ?쒖슱 ?좎뵪 ?뺤씤

### 3. ?뺤씤 ?ы빆
- ???꾩옱 ?좎뵪 ?뺣낫 ?쒖떆
- ???쒓컙蹂??덈낫 (理쒕? 72?쒓컙)
- ???쇰퀎 ?덈낫 (理쒕? 3??
- ??媛뺤닔 ?뺣낫 (?뺣쪧, ?뺥깭, ??
- ???띿냽, ?듬룄 ???곸꽭 ?뺣낫

## API ??蹂댁븞
?꾩옱 API ?ㅺ? 肄붾뱶???섎뱶肄붾뵫?섏뼱 ?덉뒿?덈떎. ?꾨줈?뺤뀡 ?섍꼍?먯꽌??

1. ?섍꼍 蹂?섎줈 愿由?
```typescript
const KMA_API_KEY = process.env.EXPO_PUBLIC_KMA_API_KEY || '';
```

2. `.env` ?뚯씪 ?앹꽦:
```
EXPO_PUBLIC_KMA_API_KEY=your_api_key_here
```

3. `.gitignore`??異붽?:
```
.env
.env.local
```

## 李멸퀬 ?먮즺
- [湲곗긽泥??④린?덈낫 API 臾몄꽌](https://www.data.go.kr/data/15084084/openapi.do)
- [湲곗긽泥?寃⑹옄 醫뚰몴 蹂??媛?대뱶](https://www.kma.go.kr/images/weather/lifenindustry/timeseries_XML.pdf)

