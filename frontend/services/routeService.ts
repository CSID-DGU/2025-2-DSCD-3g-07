// 티맵 경로 탐색 API 서비스
export interface RouteRequest {
  startX: number; // 출발지 경도
  startY: number; // 출발지 위도
  endX: number; // 도착지 경도
  endY: number; // 도착지 위도
  startName?: string;
  endName?: string;
}

export interface RouteResponse {
  type: 'pedestrian' | 'transit' | 'car';
  totalDistance: number; // 총 거리 (m)
  totalTime: number; // 총 시간 (초)
  totalWalkTime?: number; // 도보 시간 (초)
  paths: RoutePath[];
}

export interface RoutePath {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  mode: 'WALK' | 'BUS' | 'SUBWAY' | 'CAR';
  distance: number;
  time: number;
  startName: string;
  endName: string;
  path?: RoutePath[];
  routeName?: string; // 버스/지하철 노선명
}

const TMAP_API_KEY = process.env.EXPO_PUBLIC_TMAP_API_KEY || 'uAD0x6MeRK3WiaTxMW3ck23uBsilTxXA7hLk0Lo4';
const TMAP_PEDESTRIAN_URL =
  'https://apis.openapi.sk.com/tmap/routes/pedestrian';
const TMAP_TRANSIT_URL = 'https://apis.openapi.sk.com/transit/routes';

// 도보 경로 검색
export const searchPedestrianRoute = async (
  request: RouteRequest
): Promise<RouteResponse> => {
  console.log('🚶 [티맵 API] 도보 경로 검색:', request);

  try {
    const response = await fetch(
      `${TMAP_PEDESTRIAN_URL}?version=1&format=json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          appKey: TMAP_API_KEY,
        },
        body: JSON.stringify({
          startX: request.startX.toString(),
          startY: request.startY.toString(),
          endX: request.endX.toString(),
          endY: request.endY.toString(),
          reqCoordType: 'WGS84GEO',
          resCoordType: 'WGS84GEO',
          startName: request.startName || '출발지',
          endName: request.endName || '도착지',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`티맵 API 오류: ${response.status}`);
    }

    const data = (await response.json()) as any;

    // 간단한 요약 로그만 출력
    const featureCount = data.features?.length || 0;
    console.log(`✅ 도보 경로 응답: ${featureCount}개 구간`);

    // 티맵 응답을 우리 형식으로 변환
    const paths: RoutePath[] = [];
    let totalDistance = 0;
    let totalTime = 0;

    if (data.features) {
      data.features.forEach((feature: any) => {
        if (feature.geometry.type === 'LineString') {
          // 경로 좌표 추가
          feature.geometry.coordinates.forEach((coord: number[]) => {
            if (coord[0] !== undefined && coord[1] !== undefined) {
              paths.push({
                lng: coord[0],
                lat: coord[1],
              });
            }
          });
        }

        // 거리와 시간 누적
        if (feature.properties) {
          totalDistance += feature.properties.distance || 0;
          totalTime += feature.properties.time || 0;
        }
      });
    }

    const result: RouteResponse = {
      type: 'pedestrian',
      totalDistance,
      totalTime,
      paths,
    };

    console.log('✅ [티맵 API] 변환 완료:', {
      거리: `${(totalDistance / 1000).toFixed(2)}km`,
      시간: `${Math.round(totalTime / 60)}분`,
      좌표수: paths.length,
    });

    return result;
  } catch (error) {
    console.error('❌ [티맵 API] 도보 경로 검색 실패:', error);
    throw error;
  }
};

// 대중교통 경로 검색
export const searchTransitRoute = async (
  request: RouteRequest
): Promise<RouteResponse> => {
  console.log('🚌 [티맵 API] 대중교통 경로 검색:', request);

  try {
    const params = new URLSearchParams({
      startX: request.startX.toString(),
      startY: request.startY.toString(),
      endX: request.endX.toString(),
      endY: request.endY.toString(),
      format: 'json',
      count: '3', // 최대 3개 경로
    });

    const response = await fetch(`${TMAP_TRANSIT_URL}?${params}`, {
      headers: {
        appKey: TMAP_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`티맵 API 오류: ${response.status}`);
    }

    const data = (await response.json()) as any;

    // 간단한 요약 로그만 출력
    const itineraryCount = data.metaData?.plan?.itineraries?.length || 0;
    console.log(`✅ 대중교통 경로 응답: ${itineraryCount}개 경로`);

    // 첫 번째 경로만 사용
    const itinerary = data.metaData?.plan?.itineraries?.[0];
    if (!itinerary) {
      throw new Error('경로를 찾을 수 없습니다');
    }

    // 경로 좌표 추출 (간단히 시작/끝점만)
    const paths: RoutePath[] = [
      { lat: request.startY, lng: request.startX },
      { lat: request.endY, lng: request.endX },
    ];

    const result: RouteResponse = {
      type: 'transit',
      totalDistance: itinerary.totalDistance || 0,
      totalTime: itinerary.totalTime || 0,
      totalWalkTime: itinerary.totalWalkTime || 0,
      paths,
    };

    console.log('✅ [티맵 API] 대중교통 변환 완료:', {
      거리: `${(result.totalDistance / 1000).toFixed(2)}km`,
      시간: `${Math.round(result.totalTime / 60)}분`,
      도보시간: `${Math.round((result.totalWalkTime || 0) / 60)}분`,
    });

    return result;
  } catch (error) {
    console.error('❌ [티맵 API] 대중교통 경로 검색 실패:', error);
    throw error;
  }
};

// 주소 → 좌표 변환 (카카오 API 사용 가능)
export const geocodeAddress = async (
  address: string
): Promise<{ lat: number; lng: number } | null> => {
  // TODO: 카카오 로컬 API로 주소 검색 구현
  // 지금은 간단히 서울 좌표 반환
  console.log('📍 주소 검색:', address);

  // 기본값: 서울시청
  return {
    lat: 37.5665,
    lng: 126.978,
  };
};
