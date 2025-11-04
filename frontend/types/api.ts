/**
 * API 요청/응답 타입 정의
 */

// ============================================
// Health API Types
// ============================================

export interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
}

// ============================================
// Transit API Types
// ============================================

export interface TransitRouteRequest {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startName?: string;
  endName?: string;
  lang?: 0 | 1; // 0: 한국어, 1: 영어
}

export interface TransitRouteResponse {
  type: string;
  features: Feature[];
  metaData: MetaData;
}

export interface Feature {
  type: string;
  geometry: Geometry;
  properties: Properties;
}

export interface Geometry {
  type: string;
  coordinates: number[] | number[][];
}

export interface Properties {
  totalTime: number;
  totalDistance: number;
  totalWalkTime: number;
  totalWalkDistance: number;
  payment: number;
  busTransitCount: number;
  subwayTransitCount: number;
  legs: Leg[];
  index: number;
  fare?: Fare;
}

export interface Leg {
  mode: string;
  sectionTime: number;
  distance: number;
  start?: Location;
  end?: Location;
  steps?: Step[];
  routeColor?: string;
  routeName?: string;
  route?: string;
  service?: number;
  type?: number;
  routeId?: string;
  passStopList?: PassStop;
}

export interface Location {
  name: string;
  lon: number;
  lat: number;
  stationID?: string;
}

export interface Step {
  description: string;
  linestring: string;
  distance: number;
  duration: number;
}

export interface PassStop {
  stations?: Station[];
  stationList?: Station[];
}

export interface Station {
  stationID: string;
  stationName: string;
  x: number;
  y: number;
  index: number;
}

export interface Fare {
  regular: FareDetail;
}

export interface FareDetail {
  totalFare: number;
  currency: {
    symbol: string;
    currency: string;
    currencyCode: string;
  };
}

export interface MetaData {
  requestParameters: {
    startX: string;
    startY: string;
    endX: string;
    endY: string;
  };
  plan: {
    itineraries: Itinerary[];
  };
}

export interface Itinerary {
  fare: Fare;
  totalTime: number;
  totalDistance: number;
  totalWalkTime: number;
  totalWalkDistance: number;
  legs: Leg[];
}

// ============================================
// Elevation & Slope Analysis Types
// ============================================

export interface SlopeSegment {
  distance: number;
  elevation_start: number;
  elevation_end: number;
  elevation_diff: number;
  slope: number;
  is_uphill: boolean;
  speed_factor: number;
  time: number;
}

export interface WalkLegAnalysis {
  leg_index: number;
  start_name: string;
  end_name: string;
  distance: number;
  original_time: number;
  adjusted_time: number;
  time_diff: number;
  avg_slope: number;
  max_slope: number;
  min_slope: number;
  segments: SlopeSegment[];
  is_transfer?: boolean;  // 환승(실내) 구간 여부
  user_speed_factor?: number;
  slope_factor?: number;
  weather_factor?: number;
  final_factor?: number;
}

export interface RouteElevationAnalysis {
  walk_legs_analysis: WalkLegAnalysis[];
  total_original_walk_time: number;
  total_adjusted_walk_time: number;
  total_route_time_adjustment: number;
  // 횡단보도 정보
  crosswalk_count?: number;
  crosswalk_wait_time?: number;
  total_time_with_crosswalk?: number;
  // 기타 정보
  sampled_coords_count?: number;
  original_coords_count?: number;
  user_speed_mps?: number;          // 사용자 평균 속도
  weather_applied?: boolean;         // 날씨 보정 적용 여부
  factors?: {                        // 통합 계수 정보
    user_speed_factor: number;
    slope_factor: number;
    weather_factor: number;
    final_factor: number;
  };
  error?: string;
}

export interface AnalyzeSlopeRequest {
  itinerary: Itinerary;
  api_key?: string;
  user_speed_mps?: number; // m/s - Health Connect Case 1 평균 속도
  weather_data?: {         // 날씨 데이터
    temp_c: number;
    pty: number;
    rain_mm_per_h?: number;
    snow_cm_per_h?: number;
  };
}

export interface ElevationData {
  location: MapCoordinates;
  elevation: number;
}

export interface SlopeCategory {
  type: 'flat' | 'gentle' | 'moderate' | 'steep' | 'very_steep';
  label: string;
  range: string;
  speedFactor: number; // 참고용 (실제 계산은 Tobler's Function 사용)
  color: string;
}

/**
 * 경사도 카테고리 정의 (UI 표시용)
 * 
 * 주의: speedFactor는 참고용입니다.
 * 실제 보행 시간 계산은 백엔드의 Tobler's Hiking Function을 사용하여
 * 연속적이고 더 정확한 속도 계수를 적용합니다.
 */
export const SLOPE_CATEGORIES: Record<string, SlopeCategory> = {
  flat: {
    type: 'flat',
    label: '평지',
    range: '0-3%',
    speedFactor: 1.0,
    color: '#4CAF50'
  },
  gentle: {
    type: 'gentle',
    label: '완만한 오르막',
    range: '3-5%',
    speedFactor: 0.84, // Tobler's Function 근사값
    color: '#8BC34A'
  },
  moderate: {
    type: 'moderate',
    label: '보통 오르막',
    range: '5-10%',
    speedFactor: 0.65, // Tobler's Function 근사값
    color: '#FFC107'
  },
  steep: {
    type: 'steep',
    label: '가파른 오르막',
    range: '10-15%',
    speedFactor: 0.42, // Tobler's Function 근사값
    color: '#FF9800'
  },
  very_steep: {
    type: 'very_steep',
    label: '매우 가파름',
    range: '15%+',
    speedFactor: 0.25, // Tobler's Function 근사값
    color: '#F44336'
  }
};

// ============================================
// Future: Personalization API Types (예정)
// ============================================

// 향후 개인화 기능 추가시 사용할 타입들
// export interface PersonalizationRequest {
//   userId: string;
//   healthData: {
//     averageSteps: number;
//     averageDistance: number;
//     recentActivities: ActivityData[];
//   };
// }

// export interface PersonalizedRouteResponse extends TransitRouteResponse {
//   personalized: {
//     adjustedWalkTime: number;
//     adjustedTotalTime: number;
//     speedFactor: number;
//   };
// }

// ============================================
// Map API Types
// ============================================

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends MapCoordinates {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  coordinate: MapCoordinates;
  title: string;
  description?: string;
  type: 'start' | 'end' | 'transit' | 'poi';
}

export interface RoutePolyline {
  coordinates: MapCoordinates[];
  strokeColor: string;
  strokeWidth: number;
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================
// Common Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}
