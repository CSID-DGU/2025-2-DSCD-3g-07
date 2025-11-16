import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { RoutePath } from '../services/routeService';
import { useEffect, useRef } from 'react';
import type { CurrentLocation } from '../services/locationService';
import type { Leg } from '../types/api';

interface KakaoMapWithRouteProps {
  jsKey: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  paths?: RoutePath[]; // 경로 좌표들
  routeMode?: 'transit' | 'walking'; // 경로 모드 (대중교통 / 도보)
  currentLocation?: CurrentLocation | null; // 현재 위치 (실시간 추적)
  centerOnCurrentLocation?: boolean; // 현재 위치로 지도 중심 이동 여부
  legs?: Leg[]; // 구간 정보 (대중교통용)
}

const html = (
  jsKey: string,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  paths?: RoutePath[],
  routeMode?: 'transit' | 'walking',
  centerOnCurrentLocation?: boolean,
  legs?: Leg[]
) => `
<!doctype html><html><head>
  <meta name="viewport" content="initial-scale=1, width=device-width" />
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false"></script>
  <style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    let currentLocationMarker = null;
    let accuracyCircle = null;
    let map = null;
    
    kakao.maps.load(function () {
      // 지도 중심 (출발지와 도착지 중간)
      const centerLat = (${startLat} + ${endLat}) / 2;
      const centerLng = (${startLng} + ${endLng}) / 2;
      const center = new kakao.maps.LatLng(centerLat, centerLng);
      
      map = new kakao.maps.Map(document.getElementById('map'), {
        center,
        level: 5 // 줌 레벨
      });

      // 출발지 마커 (파란색)
      const startMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${startLat}, ${startLng}),
        map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%234285F4" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'),
          new kakao.maps.Size(32, 32)
        )
      });

      // 도착지 마커 (빨간색)
      const endMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${endLat}, ${endLng}),
        map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%23EA4335" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'),
          new kakao.maps.Size(32, 32)
        )
      });

      ${
        paths && paths.length > 0 && legs && legs.length > 0 && routeMode === 'transit'
          ? `
      // 대중교통 경로: 구간별 색상 적용
      const legs = ${JSON.stringify(legs)};
      const pathCoords = ${JSON.stringify(paths)};
      
      // 각 leg의 시작점과 끝점을 찾아서 구간별로 그리기
      let currentIndex = 0;
      
      legs.forEach((leg, legIndex) => {
        const legDistance = leg.distance || 0;
        const legSteps = leg.steps || [];
        
        // leg의 좌표 수 추정 (거리 기반)
        let estimatedCoordCount = 0;
        if (leg.passShape && leg.passShape.linestring) {
          estimatedCoordCount = leg.passShape.linestring.split(' ').length;
        } else if (legSteps.length > 0) {
          legSteps.forEach(step => {
            if (step.linestring) {
              estimatedCoordCount += step.linestring.split(' ').length;
            }
          });
        }
        
        // 구간 좌표 추출
        const endIndex = Math.min(currentIndex + estimatedCoordCount, pathCoords.length);
        const legCoords = pathCoords.slice(currentIndex, endIndex);
        
        if (legCoords.length > 0) {
          const linePath = legCoords.map(p => new kakao.maps.LatLng(p.lat, p.lng));
          
          // 모드에 따른 색상 및 스타일
          let strokeColor, strokeWeight, strokeStyle;
          
          switch(leg.mode) {
            case 'WALK':
              strokeColor = '#34C759'; // 초록색 (도보)
              strokeWeight = 5;
              strokeStyle = 'solid';
              break;
            case 'BUS':
              strokeColor = '#FF9500'; // 오렌지색 (버스)
              strokeWeight = 6;
              strokeStyle = 'solid';
              break;
            case 'SUBWAY':
              strokeColor = leg.route ? '#0066FF' : '#2196F3'; // 지하철 노선별 색상 (기본 파란색)
              strokeWeight = 7;
              strokeStyle = 'solid';
              break;
            default:
              strokeColor = '#4285F4';
              strokeWeight = 5;
              strokeStyle = 'solid';
          }
          
          const polyline = new kakao.maps.Polyline({
            path: linePath,
            strokeWeight: strokeWeight,
            strokeColor: strokeColor,
            strokeOpacity: 0.9,
            strokeStyle: strokeStyle
          });
          
          polyline.setMap(map);
          
          // 환승 지점 마커 (버스/지하철 환승)
          if (legIndex > 0 && legIndex < legs.length - 1) {
            const prevLeg = legs[legIndex - 1];
            if ((prevLeg.mode === 'BUS' || prevLeg.mode === 'SUBWAY') && 
                (leg.mode === 'BUS' || leg.mode === 'SUBWAY')) {
              // 환승 지점
              const transferPos = linePath[0];
              const transferMarker = new kakao.maps.Marker({
                position: transferPos,
                map,
                image: new kakao.maps.MarkerImage(
                  'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="%23FF9500" stroke="white" stroke-width="2"/><text x="10" y="14" font-size="10" text-anchor="middle" fill="white" font-weight="bold">T</text></svg>'),
                  new kakao.maps.Size(20, 20)
                )
              });
            }
          }
        }
        
        currentIndex = endIndex;
      });

      // 경로가 모두 보이도록 지도 범위 조정
      const bounds = new kakao.maps.LatLngBounds();
      pathCoords.forEach(p => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
      map.setBounds(bounds);
      `
          : paths && paths.length > 0
          ? `
      // 단일 경로 (도보 또는 기본)
      const pathCoords = ${JSON.stringify(paths)};
      const linePath = pathCoords.map(p => new kakao.maps.LatLng(p.lat, p.lng));
      
      const isWalking = ${routeMode === 'walking'};
      const strokeColor = isWalking ? '#34C759' : '#4285F4';
      const strokeWeight = isWalking ? 6 : 5;
      const strokeStyle = isWalking ? 'solid' : 'solid';
      
      const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: strokeWeight,
        strokeColor: strokeColor,
        strokeOpacity: 0.9,
        strokeStyle: strokeStyle
      });
      
      polyline.setMap(map);

      const bounds = new kakao.maps.LatLngBounds();
      linePath.forEach(point => bounds.extend(point));
      map.setBounds(bounds);
      `
          : `
      // 경로가 없으면 출발지와 도착지만 보이도록
      const bounds = new kakao.maps.LatLngBounds();
      bounds.extend(new kakao.maps.LatLng(${startLat}, ${startLng}));
      bounds.extend(new kakao.maps.LatLng(${endLat}, ${endLng}));
      map.setBounds(bounds);
      `
      }

      // 현재 위치 마커 생성 함수
      window.updateCurrentLocation = function(lat, lng, heading, accuracy) {
        // 기존 마커 제거
        if (currentLocationMarker) {
          currentLocationMarker.setMap(null);
        }
        if (accuracyCircle) {
          accuracyCircle.setMap(null);
        }
        
        // 화살표 SVG (heading에 따라 회전)
        const rotation = heading !== null ? heading : 0;
        const arrowSvg = \`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#4A90E2" opacity="0.3"/>
            <circle cx="20" cy="20" r="8" fill="#4A90E2"/>
            <path d="M20 8 L26 18 L14 18 Z" fill="#FFFFFF" 
                  transform="rotate(\${rotation} 20 20)"/>
          </svg>
        \`;
        
        const encodedSvg = 'data:image/svg+xml;base64,' + btoa(arrowSvg);
        const imageSize = new kakao.maps.Size(40, 40);
        const imageOption = { offset: new kakao.maps.Point(20, 20) };
        
        const markerImage = new kakao.maps.MarkerImage(encodedSvg, imageSize, imageOption);
        
        // 마커 생성
        currentLocationMarker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
          image: markerImage,
          zIndex: 999  // 다른 마커보다 위에 표시
        });
        
        currentLocationMarker.setMap(map);
        
        // 정확도 원 표시
        if (accuracy && accuracy > 0) {
          accuracyCircle = new kakao.maps.Circle({
            center: new kakao.maps.LatLng(lat, lng),
            radius: accuracy,  // 미터 단위
            strokeWeight: 1,
            strokeColor: '#4A90E2',
            strokeOpacity: 0.5,
            fillColor: '#4A90E2',
            fillOpacity: 0.1
          });
          
          accuracyCircle.setMap(map);
        }
        
        // 지도 중심 이동 (옵션)
        if (${centerOnCurrentLocation}) {
          map.setCenter(new kakao.maps.LatLng(lat, lng));
        }
      };

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage("KAKAO_MAP_WITH_ROUTE_READY");
      }
    });
  </script>
</body></html>
`;

export default function KakaoMapWithRoute({
  jsKey,
  startLat,
  startLng,
  endLat,
  endLng,
  paths,
  routeMode = 'transit', // 기본값: 대중교통
  currentLocation,
  centerOnCurrentLocation = false,
  legs,
}: KakaoMapWithRouteProps) {
  const webViewRef = useRef<WebView>(null);

  // 현재 위치 업데이트 (useEffect)
  useEffect(() => {
    if (webViewRef.current && currentLocation) {
      const script = `
        if (window.updateCurrentLocation) {
          window.updateCurrentLocation(
            ${currentLocation.latitude},
            ${currentLocation.longitude},
            ${currentLocation.heading || 0},
            ${currentLocation.accuracy}
          );
        }
        true;
      `;
      
      webViewRef.current.injectJavaScript(script);
    }
  }, [currentLocation]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={e => {
          console.log('WebView:', e.nativeEvent.data);
        }}
        source={{
          html: html(
            jsKey,
            startLat,
            startLng,
            endLat,
            endLng,
            paths,
            routeMode,
            centerOnCurrentLocation,
            legs
          ),
        }}
      />
    </View>
  );
}
