import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getRouteDetail } from '@/services/gpxRouteService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY_COLOR = '#2C6DE7';
const SECONDARY_TEXT = '#4A5968';

interface RouteDetailModalProps {
    visible: boolean;
    onClose: () => void;
    route: {
        route_id: number;
        route_name: string;
        distance_km: number;
        estimated_duration_minutes: number;
        total_elevation_gain_m: number;
        difficulty_level: string;
        start_point: {
            lat: number;
            lng: number;
        };
        description: string;
        distance_from_user: number | null;
    };
    currentLocation?: {
        latitude: number;
        longitude: number;
    } | null;
    kakaoJsKey: string;
}

const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
    visible,
    onClose,
    route,
    currentLocation,
    kakaoJsKey,
}) => {
    const [routeCoordinates, setRouteCoordinates] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // 모달이 열릴 때 경로 상세 정보 가져오기
    useEffect(() => {
        if (visible && route.route_id) {
            fetchRouteDetail();
        }
    }, [visible, route.route_id]);

    const fetchRouteDetail = async () => {
        try {
            setLoading(true);
            const detail = await getRouteDetail(route.route_id);
            console.log('✅ 경로 상세 데이터:', detail);
            
            if (detail.route && detail.route.route_coordinates) {
                setRouteCoordinates(detail.route.route_coordinates);
            }
        } catch (error) {
            console.error('❌ 경로 상세 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '#34A853';
            case 'moderate': return '#FBBC04';
            case 'hard': return '#EA4335';
            default: return '#999';
        }
    };

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '쉬움';
            case 'moderate': return '보통';
            case 'hard': return '어려움';
            default: return difficulty;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {route.route_name}
                        </Text>
                        <View style={[
                            styles.difficultyBadge,
                            { backgroundColor: getDifficultyColor(route.difficulty_level) + '20' }
                        ]}>
                            <Text style={[
                                styles.difficultyText,
                                { color: getDifficultyColor(route.difficulty_level) }
                            ]}>
                                {getDifficultyLabel(route.difficulty_level)}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialIcons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* 지도 */}
                <View style={styles.mapContainer}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                            <Text style={styles.loadingText}>경로를 불러오는 중...</Text>
                        </View>
                    ) : routeCoordinates ? (
                        <WebView
                            originWhitelist={['*']}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            style={{ flex: 1 }}
                            source={{
                                html: generateMapHTML(
                                    kakaoJsKey,
                                    route,
                                    routeCoordinates,
                                    currentLocation
                                )
                            }}
                            onMessage={(e) => console.log('[Map]', e.nativeEvent.data)}
                            onLoad={() => console.log('[Map] WebView loaded successfully')}
                            onError={(e) => console.error('[Map] WebView error:', e.nativeEvent)}
                        />
                    ) : (
                        <View style={styles.loadingContainer}>
                            <MaterialIcons name="map" size={48} color="#ccc" />
                            <Text style={styles.loadingText}>지도를 불러올 수 없습니다</Text>
                        </View>
                    )}
                </View>

                {/* 정보 */}
                <ScrollView style={styles.infoContainer}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <MaterialIcons name="straighten" size={24} color={PRIMARY_COLOR} />
                            <Text style={styles.statValue}>{route.distance_km.toFixed(1)}km</Text>
                            <Text style={styles.statLabel}>거리</Text>
                        </View>

                        <View style={styles.statBox}>
                            <MaterialIcons name="schedule" size={24} color={PRIMARY_COLOR} />
                            <Text style={styles.statValue}>{Math.round(route.estimated_duration_minutes)}분</Text>
                            <Text style={styles.statLabel}>예상 시간</Text>
                        </View>

                        <View style={styles.statBox}>
                            <MaterialIcons name="terrain" size={24} color={PRIMARY_COLOR} />
                            <Text style={styles.statValue}>{Math.round(route.total_elevation_gain_m)}m</Text>
                            <Text style={styles.statLabel}>고도 상승</Text>
                        </View>

                        <View style={styles.statBox}>
                            <MaterialIcons name="near-me" size={24} color={PRIMARY_COLOR} />
                            <Text style={styles.statValue}>
                                {route.distance_from_user ? route.distance_from_user.toFixed(1) : '0.0'}km
                            </Text>
                            <Text style={styles.statLabel}>내 위치에서</Text>
                        </View>
                    </View>

                    {route.description && (
                        <View style={styles.descriptionBox}>
                            <Text style={styles.descriptionTitle}>코스 특징</Text>
                            <Text style={styles.descriptionText}>{route.description}</Text>
                        </View>
                    )}

                    <View style={styles.locationBox}>
                        <Text style={styles.locationTitle}>시작 위치</Text>
                        <Text style={styles.locationText}>
                            위도: {route.start_point.lat.toFixed(6)}, 경도: {route.start_point.lng.toFixed(6)}
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

/**
 * 카카오맵 HTML 생성 함수
 * GeoJSON LineString 좌표를 카카오맵 Polyline으로 변환하여 표시
 */
function generateMapHTML(
    kakaoJsKey: string,
    route: any,
    routeCoordinates: any,
    currentLocation?: { latitude: number; longitude: number } | null
): string {
    // GeoJSON coordinates 추출
    let coordinates: number[][] = [];
    
    try {
        if (typeof routeCoordinates === 'string') {
            routeCoordinates = JSON.parse(routeCoordinates);
        }
        
        if (routeCoordinates && routeCoordinates.coordinates) {
            coordinates = routeCoordinates.coordinates;
        }
    } catch (error) {
        console.error('❌ GeoJSON 파싱 실패:', error);
    }

    // GeoJSON은 [경도, 위도] 순서이므로 카카오맵용 [위도, 경도]로 변환
    const pathCoords = coordinates.map(([lng, lat]) => ({
        lat,
        lng,
    }));

    console.log('🗺️ 경로 좌표 개수:', pathCoords.length);

    return `
<!doctype html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1, width=device-width" />
  <style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}&autoload=false"></script>
  <script>
    kakao.maps.load(function () {
      console.log('카카오맵 로드 완료');
      
      const pathCoords = ${JSON.stringify(pathCoords)};
      console.log('경로 좌표 개수:', pathCoords.length);
      
      // 경로 중심점 계산
      let centerLat = ${route.start_point.lat};
      let centerLng = ${route.start_point.lng};
      
      if (pathCoords.length > 0) {
        const sumLat = pathCoords.reduce((sum, coord) => sum + coord.lat, 0);
        const sumLng = pathCoords.reduce((sum, coord) => sum + coord.lng, 0);
        centerLat = sumLat / pathCoords.length;
        centerLng = sumLng / pathCoords.length;
      }
      
      const center = new kakao.maps.LatLng(centerLat, centerLng);
      
      const map = new kakao.maps.Map(document.getElementById('map'), {
        center: center,
        level: 5
      });

      // 1️⃣ GPX 경로 그리기 (녹색 라인)
      if (pathCoords.length > 0) {
        const linePath = pathCoords.map(coord => new kakao.maps.LatLng(coord.lat, coord.lng));
        
        const polyline = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 5,
          strokeColor: '#34C759',
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        
        polyline.setMap(map);
        console.log('✅ 경로 라인 표시 완료');
        
        // 경로 전체가 보이도록 지도 영역 조정
        const bounds = new kakao.maps.LatLngBounds();
        linePath.forEach(point => bounds.extend(point));
        
        ${currentLocation ? `
        bounds.extend(new kakao.maps.LatLng(${currentLocation.latitude}, ${currentLocation.longitude}));
        ` : ''}
        
        map.setBounds(bounds);
      }

      // 2️⃣ 시작점 마커 (파란색)
      if (pathCoords.length > 0) {
        const startCoord = pathCoords[0];
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(startCoord.lat, startCoord.lng),
          map: map,
          image: new kakao.maps.MarkerImage(
            'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="%234285F4" stroke="white" stroke-width="3"/><circle cx="18" cy="18" r="8" fill="white"/></svg>'),
            new kakao.maps.Size(36, 36)
          )
        });
      }

      // 3️⃣ 종료점 마커 (빨간색)
      if (pathCoords.length > 1) {
        const endCoord = pathCoords[pathCoords.length - 1];
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(endCoord.lat, endCoord.lng),
          map: map,
          image: new kakao.maps.MarkerImage(
            'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="%23EA4335" stroke="white" stroke-width="3"/><circle cx="18" cy="18" r="8" fill="white"/></svg>'),
            new kakao.maps.Size(36, 36)
          )
        });
      }

      // 4️⃣ 현재 위치 마커 (녹색)
      ${currentLocation ? `
      new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${currentLocation.latitude}, ${currentLocation.longitude}),
        map: map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%2334C759" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'),
          new kakao.maps.Size(32, 32)
        )
      });
      ` : ''}
      
      console.log('✅ 지도 렌더링 완료');
    });
  </script>
</body>
</html>
    `;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E6E9F2',
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1F2E',
        flex: 1,
    },
    difficultyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    difficultyText: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeButton: {
        padding: 8,
    },
    mapContainer: {
        height: SCREEN_HEIGHT * 0.4,
        backgroundColor: '#f0f0f0',
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: SECONDARY_TEXT,
    },
    infoContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        minWidth: (SCREEN_WIDTH - 56) / 2,
        backgroundColor: '#F2F5FC',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1F2E',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: SECONDARY_TEXT,
        marginTop: 4,
    },
    descriptionBox: {
        backgroundColor: '#F2F5FC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    descriptionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1F2E',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: SECONDARY_TEXT,
        lineHeight: 20,
    },
    locationBox: {
        backgroundColor: '#F2F5FC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    locationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1F2E',
        marginBottom: 8,
    },
    locationText: {
        fontSize: 12,
        color: SECONDARY_TEXT,
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    placeholderText: {
        fontSize: 14,
        color: '#666',
    },
});

export default RouteDetailModal;
