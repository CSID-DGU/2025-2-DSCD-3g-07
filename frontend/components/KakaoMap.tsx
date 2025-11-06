import { View } from 'react-native';
import { WebView } from 'react-native-webview';

const html = (jsKey: string, lat: number, lng: number) => `
<!doctype html><html><head>
  <meta name="viewport" content="initial-scale=1, width=device-width" />
  <!-- autoload=false 필수: 로드 완료 후 콜백에서 지도 생성 -->
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false"></script>
  <style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    // SDK가 로드된 뒤에만 실행
    kakao.maps.load(function () {
      const center = new kakao.maps.LatLng(${lat}, ${lng});
      const map = new kakao.maps.Map(document.getElementById('map'), {
        center, level: 3
      });
      new kakao.maps.Marker({ position: center, map });
      // 디버깅용 메시지(필요시)
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage("KAKAO_MAP_READY");
      }
    });
  </script>
</body></html>
`;

export default function KakaoMap({
  jsKey,
  lat,
  lng,
}: {
  jsKey: string;
  lat: number;
  lng: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={['*']}
        javaScriptEnabled // 안드로이드 기본 true지만 명시적으로 켜두자
        domStorageEnabled // 로컬스토리지 등 사용 허용
        onMessage={e => {
          // "KAKAO_MAP_READY" 수신되면 콘솔에 표시(개발 확인용)
          console.log('WebView:', e.nativeEvent.data);
        }}
        source={{ html: html(jsKey, lat, lng) }}
      />
    </View>
  );
}
