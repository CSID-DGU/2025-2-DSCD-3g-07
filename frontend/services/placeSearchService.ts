// 카카오 로컬 API를 사용한 장소 검색 서비스
const KAKAO_REST_API_KEY = '39bab28c8bead59001f0ad345662d76e'; // 카카오 REST API 키
const KAKAO_LOCAL_API = 'https://dapi.kakao.com/v2/local/search/keyword.json';

export interface PlaceSearchResult {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도 (longitude)
  y: string; // 위도 (latitude)
  phone: string;
  distance?: string;
}

export interface PlaceSearchResponse {
  documents: PlaceSearchResult[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

/**
 * 카카오 로컬 API로 장소 검색
 * @param query 검색어 (예: "강남역", "스타벅스 홍대점")
 * @param x 중심 경도 (선택) - 현재 위치 기준 검색 시 사용
 * @param y 중심 위도 (선택) - 현재 위치 기준 검색 시 사용
 * @param radius 반경 (미터, 선택) - 기본값 20000m
 * @returns 장소 검색 결과 배열
 */
export const searchPlaces = async (
  query: string,
  x?: number,
  y?: number,
  radius: number = 20000
): Promise<PlaceSearchResult[]> => {
  if (!query || query.trim().length === 0) {
    console.log('🔍 [장소 검색] 검색어가 비어있음');
    return [];
  }

  try {
    console.log('🔍 [카카오 로컬 API] 장소 검색 시작:', {
      검색어: query,
      중심좌표: x && y ? `(${y}, ${x})` : '없음',
      반경: `${radius}m`,
    });

    // API 요청 URL 구성
    const params = new URLSearchParams({
      query: query.trim(),
      size: '15', // 최대 15개 결과
    });

    // 중심 좌표가 있으면 추가
    if (x && y) {
      params.append('x', x.toString());
      params.append('y', y.toString());
      params.append('radius', radius.toString());
    }

    const url = `${KAKAO_LOCAL_API}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as PlaceSearchResponse;

    console.log('✅ [카카오 로컬 API] 검색 성공:', {
      총결과수: data.meta.total_count,
      반환결과수: data.documents.length,
      결과목록: data.documents.map(d => d.place_name).join(', '),
    });

    return data.documents;
  } catch (error) {
    console.error('❌ [카카오 로컬 API] 검색 실패:', error);
    throw error;
  }
};

/**
 * 주소로 좌표 검색 (지오코딩)
 * @param address 주소 (예: "서울 강남구 역삼동 123-45")
 * @returns 좌표 정보 { latitude, longitude, address }
 */
export const geocodeAddress = async (
  address: string
): Promise<{ latitude: number; longitude: number; address: string } | null> => {
  try {
    console.log('🗺️ [지오코딩] 주소 → 좌표 변환:', address);

    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
      address
    )}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as any;

    if (data.documents && data.documents.length > 0) {
      const result = data.documents[0];
      const coords = {
        latitude: parseFloat(result.y),
        longitude: parseFloat(result.x),
        address: result.address_name,
      };

      console.log('✅ [지오코딩] 변환 성공:', coords);
      return coords;
    }

    console.log('⚠️ [지오코딩] 결과 없음');
    return null;
  } catch (error) {
    console.error('❌ [지오코딩] 실패:', error);
    return null;
  }
};

/**
 * 장소 검색 결과를 좌표로 변환
 * @param place 장소 검색 결과
 * @returns 좌표 { latitude, longitude }
 */
export const placeToCoordinates = (
  place: PlaceSearchResult
): { latitude: number; longitude: number } => {
  return {
    latitude: parseFloat(place.y),
    longitude: parseFloat(place.x),
  };
};

/**
 * 검색 결과 표시용 문자열 생성
 * @param place 장소 검색 결과
 * @returns 표시용 문자열 (예: "스타벅스 강남점 (서울 강남구 역삼동)")
 */
export const formatPlaceDisplay = (place: PlaceSearchResult): string => {
  const address = place.road_address_name || place.address_name;
  const addressShort = address.split(' ').slice(0, 3).join(' '); // 앞 3단어만
  return `${place.place_name} (${addressShort})`;
};
