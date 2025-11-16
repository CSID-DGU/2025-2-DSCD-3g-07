import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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
    console.log('RouteDetailModal render:', {
        visible,
        routeName: route.route_name,
        startPoint: route.start_point,
        currentLocation,
        kakaoJsKey
    });

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
                    <WebView
                        originWhitelist={['*']}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        style={{ flex: 1 }}
                        source={{
                            html: `
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
      const center = new kakao.maps.LatLng(${route.start_point.lat}, ${route.start_point.lng});
      
      const map = new kakao.maps.Map(document.getElementById('map'), {
        center: center,
        level: 5
      });

      ${currentLocation ? `
      new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${currentLocation.latitude}, ${currentLocation.longitude}),
        map: map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%2334A853" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'),
          new kakao.maps.Size(32, 32)
        )
      });
      ` : ''}

      new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${route.start_point.lat}, ${route.start_point.lng}),
        map: map,
        image: new kakao.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%234285F4" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'),
          new kakao.maps.Size(32, 32)
        )
      });

      new kakao.maps.Circle({
        center: center,
        radius: ${route.distance_km * 500},
        strokeWeight: 3,
        strokeColor: '#2C6DE7',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
        fillColor: '#2C6DE7',
        fillOpacity: 0.15,
        map: map
      });

      ${currentLocation ? `
      const bounds = new kakao.maps.LatLngBounds();
      bounds.extend(new kakao.maps.LatLng(${route.start_point.lat}, ${route.start_point.lng}));
      bounds.extend(new kakao.maps.LatLng(${currentLocation.latitude}, ${currentLocation.longitude}));
      map.setBounds(bounds);
      ` : ''}
    });
  </script>
</body>
</html>
                            `
                        }}
                        onMessage={(e) => console.log('[Map]', e.nativeEvent.data)}
                        onLoad={() => console.log('[Map] WebView loaded successfully')}
                        onError={(e) => console.error('[Map] WebView error:', e.nativeEvent)}
                    />
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
