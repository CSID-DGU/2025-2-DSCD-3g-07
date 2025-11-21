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

      // 출발지 마커 (카카오맵 스타일 - 파란색 핀)
      const startMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${startLat}, ${startLng}),
        map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58"><defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/></filter></defs><path d="M24 2 C13 2 4 11 4 22 C4 28 8 34 14 40 L24 56 L34 40 C40 34 44 28 44 22 C44 11 35 2 24 2 Z" fill="#4A90E2" stroke="white" stroke-width="2" filter="url(#shadow)"/><circle cx="24" cy="22" r="12" fill="white"/><text x="24" y="27" font-size="11" font-weight="bold" text-anchor="middle" fill="#4A90E2">출발</text></svg>'),
          new kakao.maps.Size(48, 58),
          { offset: new kakao.maps.Point(24, 58) }
        ),
        zIndex: 100
      });

      // 도착지 마커 (카카오맵 스타일 - 빨간색 핀)
      const endMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${endLat}, ${endLng}),
        map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58"><defs><filter id="shadow2" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/></filter></defs><path d="M24 2 C13 2 4 11 4 22 C4 28 8 34 14 40 L24 56 L34 40 C40 34 44 28 44 22 C44 11 35 2 24 2 Z" fill="#EA4335" stroke="white" stroke-width="2" filter="url(#shadow2)"/><circle cx="24" cy="22" r="12" fill="white"/><text x="24" y="27" font-size="11" font-weight="bold" text-anchor="middle" fill="#EA4335">도착</text></svg>'),
          new kakao.maps.Size(48, 58),
          { offset: new kakao.maps.Point(24, 58) }
        ),
        zIndex: 100
      });

      ${
        paths && paths.length > 0 && legs && legs.length > 0 && routeMode === 'transit'
          ? `
      // 대중교통 경로: 구간별 색상 적용
      const legs = ${JSON.stringify(legs)};
      
      // 각 leg를 순회하며 표시
      legs.forEach((leg, legIndex) => {
        // leg.coords가 있으면 사용, 없으면 건너뛰기
        if (!leg.coords || leg.coords.length === 0) {
          console.log('Skipping leg', legIndex, '- no coords');
          return;
        }
        
        const linePath = leg.coords.map(p => new kakao.maps.LatLng(p.lat, p.lng));
        
        // 모드에 따른 색상 및 스타일 (카카오맵 스타일)
        let strokeColor, outlineColor, strokeWeight, strokeStyle;
        
        switch(leg.mode) {
          case 'WALK':
            strokeColor = '#5DBE6C';      // 밝은 초록색 (도보)
            outlineColor = '#FFFFFF';     // 흰색 외곽선
            strokeWeight = 5;
            strokeStyle = 'solid';
            break;
          case 'BUS':
            strokeColor = '#5AB3F0';      // 밝은 파란색 (버스)
            outlineColor = '#FFFFFF';     // 흰색 외곽선
            strokeWeight = 6;
            strokeStyle = 'solid';
            break;
          case 'SUBWAY':
            strokeColor = '#FF6B35';      // 주황색 (지하철)
            outlineColor = '#FFFFFF';     // 흰색 외곽선
            strokeWeight = 7;
            strokeStyle = 'solid';
            break;
          default:
            strokeColor = '#5AB3F0';
            outlineColor = '#FFFFFF';
            strokeWeight = 6;
            strokeStyle = 'solid';
        }
        
        // 외곽선 (outline) - 흰색으로 통일
        const outlinePolyline = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: strokeWeight + 3,
          strokeColor: outlineColor,
          strokeOpacity: 1.0,
          strokeStyle: strokeStyle,
          zIndex: 1
        });
        outlinePolyline.setMap(map);
        
        // 메인 경로선
        const polyline = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: strokeWeight,
          strokeColor: strokeColor,
          strokeOpacity: 1.0,
          strokeStyle: strokeStyle,
          zIndex: 2
        });
        polyline.setMap(map);
        
        // 도보 구간에 점선 패턴 추가
        if (leg.mode === 'WALK') {
          const dashPolyline = new kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            strokeOpacity: 0.9,
            strokeStyle: 'dash',
            zIndex: 3
          });
          dashPolyline.setMap(map);
        }
        
        // 🚏 각 구간의 시작점에 교통수단 아이콘 마커 추가 (버스/지하철만)
        if (linePath.length > 0 && (leg.mode === 'BUS' || leg.mode === 'SUBWAY')) {
          const startPos = linePath[0];
          let iconSvg = '';
          
          if (leg.mode === 'BUS') {
            // 버스 아이콘
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#5AB3F0" stroke="white" stroke-width="2"/><path d="M10 11h12v8H10z" fill="white"/><rect x="11" y="13" width="4" height="4" fill="#5AB3F0"/><rect x="17" y="13" width="4" height="4" fill="#5AB3F0"/><rect x="12" y="20" width="2" height="2" rx="1" fill="white"/><rect x="18" y="20" width="2" height="2" rx="1" fill="white"/></svg>';
          } else if (leg.mode === 'SUBWAY') {
            // 지하철 아이콘
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#FF6B35" stroke="white" stroke-width="2"/><rect x="10" y="11" width="12" height="10" rx="2" fill="white"/><circle cx="13" cy="19" r="1.5" fill="#FF6B35"/><circle cx="19" cy="19" r="1.5" fill="#FF6B35"/><rect x="11" y="13" width="10" height="4" fill="#FF6B35"/></svg>';
          }
          
          const modeMarker = new kakao.maps.Marker({
            position: startPos,
            map,
            image: new kakao.maps.MarkerImage(
              'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg),
              new kakao.maps.Size(32, 32),
              { offset: new kakao.maps.Point(16, 16) }
            ),
            zIndex: 20
          });
        }
        
        // 환승 지점 마커 (버스/지하철 환승)
        if (legIndex > 0 && legIndex < legs.length - 1) {
          const prevLeg = legs[legIndex - 1];
          if ((prevLeg.mode === 'BUS' || prevLeg.mode === 'SUBWAY') && 
              (leg.mode === 'BUS' || leg.mode === 'SUBWAY')) {
            // 환승 지점 - 카카오맵 스타일
            const transferPos = linePath[0];
            const transferMarker = new kakao.maps.Marker({
              position: transferPos,
              map,
              image: new kakao.maps.MarkerImage(
                'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="white" stroke="#666" stroke-width="1.5"/><circle cx="14" cy="14" r="10" fill="#FF6B35"/><text x="14" y="18" font-size="11" text-anchor="middle" fill="white" font-weight="bold">환</text></svg>'),
                new kakao.maps.Size(28, 28),
                { offset: new kakao.maps.Point(14, 14) }
              ),
              zIndex: 25
            });
          }
        }
      });

      // 경로가 모두 보이도록 지도 범위 조정
      const bounds = new kakao.maps.LatLngBounds();
      legs.forEach(leg => {
        if (leg.coords) {
          leg.coords.forEach(p => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
        }
      });
      map.setBounds(bounds);
      `
          : paths && paths.length > 0
          ? `
      // 단일 경로 (도보 또는 기본) - RouteLine 스타일 적용
      const pathCoords = ${JSON.stringify(paths)};
      const linePath = pathCoords.map(p => new kakao.maps.LatLng(p.lat, p.lng));
      
      const isWalking = ${routeMode === 'walking'};
      
      // 색상 및 스타일 설정
      const strokeColor = isWalking ? '#34C759' : '#4285F4';
      const outlineColor = isWalking ? '#2A9D47' : '#1967D2';
      const strokeWeight = isWalking ? 6 : 7;
      
      // 외곽선 (outline)
      const outlinePolyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: strokeWeight + 4,
        strokeColor: outlineColor,
        strokeOpacity: 0.5,
        strokeStyle: 'solid',
        zIndex: 1
      });
      outlinePolyline.setMap(map);
      
      // 메인 경로선
      const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: strokeWeight,
        strokeColor: strokeColor,
        strokeOpacity: 1.0,
        strokeStyle: 'solid',
        zIndex: 2
      });
      polyline.setMap(map);
      
      // 도보 경로는 점선 패턴 추가
      if (isWalking) {
        const dashPolyline = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.9,
          strokeStyle: 'dash',
          zIndex: 3
        });
        dashPolyline.setMap(map);
      }

      const bounds = new kakao.maps.LatLngBounds();
      linePath.forEach(point => bounds.extend(point));
      map.setBounds(bounds);
          });
        }
      }

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
