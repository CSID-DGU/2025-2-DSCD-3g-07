import React, { useState, useEffect, useMemo } from 'react';
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
    PanResponder,
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
    onLogCourseUse?: (route: RouteDetailModalProps['route']) => void;
}

const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
    visible,
    onClose,
    route,
    currentLocation,
    kakaoJsKey,
    onLogCourseUse,
}) => {
    const [routeCoordinates, setRouteCoordinates] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    const panResponder = useMemo(() =>
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy < -30) {
                    setIsMapExpanded(true);
                } else if (gesture.dy > 30) {
                    setIsMapExpanded(false);
                }
            },
        }), []);

    // 모달이 열릴 때 경로 상세 정보 가져오기
    useEffect(() => {
        if (visible && route.route_id) {
            fetchRouteDetail();
        }
    }, [visible, route.route_id]);

    const fetchRouteDetail = async () => {
        try {
            setLoading(true);
            console.log('🔍 경로 상세 조회 시작:', route.route_id);

            const detail = await getRouteDetail(route.route_id);
            console.log('✅ 경로 상세 응답:', {
                hasRoute: !!detail.route,
                hasCoordinates: !!detail.route?.route_coordinates,
                coordinatesType: typeof detail.route?.route_coordinates,
            });

            if (detail.route && detail.route.route_coordinates) {
                console.log('📍 좌표 데이터 설정:', detail.route.route_coordinates);
                setRouteCoordinates(detail.route.route_coordinates);
            } else {
                console.warn('⚠️ 좌표 데이터 없음');
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

    // 예상 시간 계산 (비정상적인 값이면 거리 기반으로 재계산)
    const getEstimatedDuration = () => {
        const duration = route.estimated_duration_minutes;
        const distance = route.distance_km;
        
        // 합리적인 시간 범위 체크 (도보 기준 1km당 10~20분)
        const minReasonable = distance * 8;   // 매우 빠른 속도 (7.5km/h)
        const maxReasonable = distance * 25;  // 매우 느린 속도 (2.4km/h)
        
        if (duration >= minReasonable && duration <= maxReasonable) {
            return Math.round(duration);
        }
        
        // 비정상적인 값이면 평균 도보 속도(5km/h)로 재계산
        return Math.round((distance / 5) * 60);
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
                <View style={[
                    styles.mapContainer,
                    { height: isMapExpanded ? SCREEN_HEIGHT * 0.68 : SCREEN_HEIGHT * 0.4 }
                ]}>
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

                    {routeCoordinates && (
                        <View style={styles.mapLegend} pointerEvents="none">
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#F9A825' }]} />
                                <Text style={styles.legendLabel}>시작</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#EA4335' }]} />
                                <Text style={styles.legendLabel}>도착</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                                <Text style={styles.legendLabel}>내 위치</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendLine, { backgroundColor: '#2C6DE7' }]} />
                                <Text style={styles.legendLabel}>경로</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* 정보 */}
                <ScrollView
                    style={styles.infoContainer}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setIsMapExpanded((prev) => !prev)}
                        {...panResponder.panHandlers}
                    >
                        <View style={styles.dragHandle}>
                            <View style={styles.dragHandleBar} />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <MaterialIcons name="straighten" size={24} color={PRIMARY_COLOR} />
                            <Text style={styles.statValue}>{route.distance_km.toFixed(1)}km</Text>
                            <Text style={styles.statLabel}>거리</Text>
                        </View>

                        <View style={styles.statBox}>
                            <MaterialIcons name="schedule" size={24} color={PRIMARY_COLOR} />
                            <Text style={styles.statValue}>{getEstimatedDuration()}분</Text>
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
                        <Text style={styles.locationTitle}>위치 안내</Text>

                        <View style={styles.locationRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#F9A825' }]} />
                            <View style={styles.locationRowTexts}>
                                <Text style={styles.locationRowLabel}>시작 위치</Text>
                                <Text style={styles.locationText}>
                                    위도: {route.start_point.lat.toFixed(6)}, 경도: {route.start_point.lng.toFixed(6)}
                                </Text>
                            </View>
                        </View>

                        {currentLocation ? (
                            <View style={styles.locationRow}>
                                <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                                <View style={styles.locationRowTexts}>
                                    <Text style={styles.locationRowLabel}>내 현재 위치</Text>
                                    <Text style={styles.locationText}>
                                        위도: {currentLocation.latitude.toFixed(6)}, 경도: {currentLocation.longitude.toFixed(6)}
                                    </Text>
                                    <Text style={styles.locationSubText}>
                                        시작점까지 {route.distance_from_user ? `${route.distance_from_user.toFixed(1)}km` : '-'} 거리
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.locationSubText}>내 위치 정보가 설정되지 않았습니다.</Text>
                        )}
                    </View>

                    {onLogCourseUse ? (
                        <TouchableOpacity
                            style={styles.logButton}
                            onPress={() => onLogCourseUse(route)}
                        >
                            <MaterialIcons name="check-circle" size={20} color="#fff" />
                            <Text style={styles.logButtonText}>이 코스 이용 기록 저장</Text>
                        </TouchableOpacity>
                    ) : null}
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
        let parsedCoords = routeCoordinates;

        if (typeof routeCoordinates === 'string') {
            console.log('📝 문자열 좌표 파싱 중...');
            parsedCoords = JSON.parse(routeCoordinates);
        }

        if (parsedCoords && parsedCoords.coordinates) {
            coordinates = parsedCoords.coordinates;
            console.log('✅ 좌표 추출 성공:', coordinates.length, '개');
        } else {
            console.warn('⚠️ coordinates 필드 없음:', parsedCoords);
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

      // 핀 마커 생성 함수 (Home 탭과 동일한 스타일)
      const createPinMarker = (lat, lng, color, label) => {
        // 글자 수에 따라 마커 크기 조정
        const isLong = label.length > 2;
        const width = isLong ? 44 : 36;
        const height = isLong ? 52 : 44;
        const cx = width / 2;
        const pinTop = 2;
        const pinBottom = height - 2;
        const circleY = 16;
        const circleR = isLong ? 10 : 8;
        const fontSize = isLong ? 7 : 8;
        const textY = circleY + 3;
        
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
          '<defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.25"/></filter></defs>' +
          '<path d="M' + cx + ' ' + pinTop + ' C' + (cx-8) + ' ' + pinTop + ' ' + (cx-14) + ' ' + (pinTop+6) + ' ' + (cx-14) + ' ' + (pinTop+14) + ' C' + (cx-14) + ' ' + (pinTop+19) + ' ' + (cx-11) + ' ' + (pinTop+24) + ' ' + (cx-7) + ' ' + (pinTop+28) + ' L' + cx + ' ' + pinBottom + ' L' + (cx+7) + ' ' + (pinTop+28) + ' C' + (cx+11) + ' ' + (pinTop+24) + ' ' + (cx+14) + ' ' + (pinTop+19) + ' ' + (cx+14) + ' ' + (pinTop+14) + ' C' + (cx+14) + ' ' + (pinTop+6) + ' ' + (cx+8) + ' ' + pinTop + ' ' + cx + ' ' + pinTop + ' Z" fill="' + color + '" stroke="white" stroke-width="2" filter="url(#shadow)"/>' +
          '<circle cx="' + cx + '" cy="' + circleY + '" r="' + circleR + '" fill="white"/>' +
          '<text x="' + cx + '" y="' + textY + '" font-size="' + fontSize + '" font-weight="bold" text-anchor="middle" fill="' + color + '">' + label + '</text>' +
          '</svg>';

        return new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
          map: map,
          image: new kakao.maps.MarkerImage(
            'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
            new kakao.maps.Size(width, height),
            { offset: new kakao.maps.Point(cx, height) }
          ),
          zIndex: 100,
        });
      };

      // 1️⃣ GPX 경로 그리기 (파란 라인)
      if (pathCoords.length > 0) {
        const linePath = pathCoords.map(coord => new kakao.maps.LatLng(coord.lat, coord.lng));
        
        const polyline = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 5,
          strokeColor: '#2C6DE7',
          strokeOpacity: 0.9,
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

      // 2️⃣ 시작점 마커 (노란/주황색 핀)
      if (pathCoords.length > 0) {
        const startCoord = pathCoords[0];
        createPinMarker(startCoord.lat, startCoord.lng, '#F9A825', '출발');
      }

      // 3️⃣ 종료점 마커 (빨간색 핀)
      if (pathCoords.length > 1) {
        const endCoord = pathCoords[pathCoords.length - 1];
        createPinMarker(endCoord.lat, endCoord.lng, '#EA4335', '도착');
      }

      // 4️⃣ 현재 위치 마커 (녹색 핀) - "나" 한 글자로 표시
      ${currentLocation ? `
      createPinMarker(${currentLocation.latitude}, ${currentLocation.longitude}, '#34C759', '나');
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
        position: 'relative',
        overflow: 'hidden',
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
    mapLegend: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E6E9F2',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendLine: {
        width: 18,
        height: 4,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 12,
        color: '#1A1F2E',
        fontWeight: '600',
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
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 10,
    },
    locationRowTexts: {
        flex: 1,
        gap: 2,
    },
    locationRowLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1F2E',
    },
    locationSubText: {
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
    dragHandle: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    dragHandleBar: {
        width: 50,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#D1D5DB',
    },
    logButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 80,
    },
    logButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default RouteDetailModal;
