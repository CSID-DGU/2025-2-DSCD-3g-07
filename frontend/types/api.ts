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
  stations: Station[];
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
// Personalization API Types
// ============================================

export interface PersonalizationRequest {
  userId: string;
  healthData: {
    averageSteps: number;
    averageDistance: number;
    recentActivities: ActivityData[];
  };
}

export interface ActivityData {
  date: string;
  steps: number;
  distance: number;
  duration: number;
}

export interface PersonalizationResponse {
  userId: string;
  walkingSpeedFactor: number;
  fitnessLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  calculatedAt: string;
}

export interface PersonalizedRouteRequest extends TransitRouteRequest {
  userId: string;
  userWalkingSpeed?: number;
}

export interface PersonalizedRouteResponse extends TransitRouteResponse {
  personalized: {
    adjustedWalkTime: number;
    adjustedTotalTime: number;
    speedFactor: number;
  };
}

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
