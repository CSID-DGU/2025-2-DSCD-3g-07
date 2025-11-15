import * as Location from 'expo-location';

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  timestamp: number;
}

class LocationService {
  private subscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;

  /**
   * 위치 추적 시작
   * @param callback 위치 업데이트 시 호출될 콜백 함수
   * @returns 성공 여부
   */
  async startTracking(
    callback: (location: CurrentLocation) => void
  ): Promise<boolean> {
    try {
      // 1. 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('❌ 위치 권한이 거부되었습니다');
        return false;
      }

      // 2. 이미 추적 중이면 중지
      if (this.isTracking) {
        await this.stopTracking();
      }

      // 3. 위치 추적 시작
      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // 네비게이션용 최고 정확도
          timeInterval: 500, // 0.5초마다 업데이트 (더 빠른 반응)
          distanceInterval: 1, // 1m 이동 시 업데이트 (민감하게)
        },
        (location) => {
          const currentLocation: CurrentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            heading: location.coords.heading,
            timestamp: location.timestamp,
          };

          callback(currentLocation);
        }
      );

      this.isTracking = true;
      console.log('✅ 위치 추적 시작됨');
      return true;
    } catch (error) {
      console.error('❌ 위치 추적 시작 실패:', error);
      return false;
    }
  }

  /**
   * 위치 추적 중지
   */
  async stopTracking(): Promise<void> {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isTracking = false;
    console.log('🛑 위치 추적 중지됨');
  }

  /**
   * 현재 추적 상태 확인
   */
  getTrackingStatus(): boolean {
    return this.isTracking;
  }

  /**
   * 현재 위치 한 번만 가져오기 (추적 시작하지 않음)
   */
  async getCurrentLocation(): Promise<CurrentLocation | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('❌ 위치 권한이 거부되었습니다');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        heading: location.coords.heading,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('❌ 현재 위치 가져오기 실패:', error);
      return null;
    }
  }
}

// 싱글톤 인스턴스 export
export const locationService = new LocationService();
