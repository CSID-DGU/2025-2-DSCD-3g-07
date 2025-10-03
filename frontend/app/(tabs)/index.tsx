import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import KakaoMap from '@/components/KakaoMap';

const KAKAO_JS_KEY = 'd377e8ba6e5edd8176c63a3f97c9e17b';

const PRIMARY_COLOR = '#2C6DE7';
const SECONDARY_TEXT = '#4A5968';
const LIGHT_BACKGROUND = '#F2F5FC';
const BORDER_COLOR = '#E6E9F2';

const quickSearchChips = ['한강공원', '서울숲', '강남역', '회사'];

const quickActions = [
  { id: 'favorite', icon: 'bookmark', label: '즐겨찾기' },
  { id: 'recent', icon: 'history', label: '최근 경로' },
  { id: 'pace', icon: 'directions-walk', label: '페이스' },
  { id: 'share', icon: 'share', label: '공유' },
];

const todayHighlights = [
  {
    id: 'steps',
    title: '오늘 걸음 수',
    value: '6,420보',
    trend: '어제보다 +12%',
    icon: 'directions-walk',
  },
  {
    id: 'active',
    title: '활동 시간',
    value: '48분',
    trend: '지난주 대비 +8%',
    icon: 'schedule',
  },
  {
    id: 'calories',
    title: '칼로리 소모',
    value: '320 kcal',
    trend: '지난주 대비 +5%',
    icon: 'local-fire-department',
  },
];

const planSuggestions = [
  {
    id: 'plan-1',
    title: '여유 있는 강변 산책',
    summary: '여의나루-선셋 포인트 왕복 코스',
    distance: '3.6 km',
    duration: '48분',
    calories: '180 kcal',
    surface: '평탄한 데크와 산책로',
    highlight: '노을 전망이 좋은 구간 포함',
    mood: '느긋하게',
    color: '#2C6DE7',
  },
  {
    id: 'plan-2',
    title: '점심시간 속도 플랜',
    summary: '망원시장까지 빠르게 다녀오기',
    distance: '2.4 km',
    duration: '32분',
    calories: '120 kcal',
    surface: '도심 보도, 완만한 경사',
    highlight: '신호 대기 적고 인파가 적은 경로',
    mood: '빠르게',
    color: '#2F9BFF',
  },
  {
    id: 'plan-3',
    title: '서울숲 사진 스팟',
    summary: '서울숲 포토존을 따라 걷기',
    distance: '4.2 km',
    duration: '58분',
    calories: '214 kcal',
    surface: '포장 산책로와 잔잔한 자갈길',
    highlight: '카페와 전망 데크를 지나는 길',
    mood: '풍경 감상',
    color: '#27A26E',
  },
];

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(height * 0.88, 750);
const PEEK_HEIGHT = 120;
const SHEET_POSITIONS = {
  expanded: 20,
  middle: SHEET_HEIGHT * 0.45,
  collapsed: SHEET_HEIGHT - PEEK_HEIGHT,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function HomeScreen() {
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [startText, setStartText] = useState('현재 위치');
  const [endText, setEndText] = useState('도착지를 입력하세요');
  const [search, setSearch] = useState('');

  const sheetValue = useRef(new Animated.Value(SHEET_POSITIONS.collapsed)).current;
  const sheetPosition = useRef(SHEET_POSITIONS.collapsed);
  const dragOffset = useRef(SHEET_POSITIONS.collapsed);

  const requestLocation = useCallback(async () => {
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        alert('위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
        return;
      }
      setStatus('granted');
      const position = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced
      });
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch (error) {
      console.warn('[location] failed', error);
      setStatus('denied');
      alert('위치 정보를 가져올 수 없습니다. 다시 시도해주세요.');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const snapTo = useCallback(
    (target: number) => {
      Animated.spring(sheetValue, {
        toValue: target,
        useNativeDriver: true,
        damping: 18,
        stiffness: 160,
      }).start(() => {
        sheetPosition.current = target;
      });
    },
    [sheetValue],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          sheetValue.stopAnimation();
          dragOffset.current = sheetPosition.current;
        },
        onPanResponderMove: (_, gesture) => {
          const next = clamp(dragOffset.current + gesture.dy, SHEET_POSITIONS.expanded, SHEET_POSITIONS.collapsed);
          sheetValue.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = clamp(dragOffset.current + gesture.dy, SHEET_POSITIONS.expanded, SHEET_POSITIONS.collapsed);
          const targets = [SHEET_POSITIONS.expanded, SHEET_POSITIONS.middle, SHEET_POSITIONS.collapsed];
          const closest = targets.reduce((prev, curr) => (Math.abs(curr - next) < Math.abs(prev - next) ? curr : prev));
          snapTo(closest);
        },
      }),
    [snapTo, sheetValue],
  );

  const openPlanner = useCallback(() => snapTo(SHEET_POSITIONS.middle), [snapTo]);
  const expandPlanner = useCallback(() => snapTo(SHEET_POSITIONS.expanded), [snapTo]);
  const collapsePlanner = useCallback(() => snapTo(SHEET_POSITIONS.collapsed), [snapTo]);

  const statusLabel = useMemo(() => {
    if (status === 'granted' && coords) {
      return `최근 업데이트 (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
    }
    if (status === 'denied') {
      return '위치 권한이 필요해요';
    }
    return '현재 위치를 불러오는 중...';
  }, [status, coords]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.mapContainer}>
        {coords ? (
          <KakaoMap jsKey={KAKAO_JS_KEY} lat={coords.lat} lng={coords.lng} />
        ) : (
          <View style={styles.mapPlaceholder}>
            <MaterialIcons name="map" size={64} color={PRIMARY_COLOR} />
            <Text style={styles.mapPlaceholderTitle}>지도를 불러오는 중</Text>
            <Text style={styles.mapPlaceholderSubtitle}>{statusLabel}</Text>
          </View>
        )}

        <View style={styles.overlayTop}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color="#7F8C8D" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="어디로 가시나요?"
              placeholderTextColor="#98A2B3"
              style={styles.searchInput}
              onFocus={openPlanner}
              returnKeyType="search"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <MaterialIcons name="close" size={16} color="#B0B7C3" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.chipRow}>
            {quickSearchChips.map((item) => (
              <TouchableOpacity key={item} style={styles.chip} onPress={openPlanner}>
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.overlayButtons}>
          <TouchableOpacity style={styles.roundButton} onPress={requestLocation}>
            <MaterialIcons name="my-location" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundButton} onPress={expandPlanner}>
            <MaterialIcons name="alt-route" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={[styles.routeSheet, { transform: [{ translateY: sheetValue }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity activeOpacity={1} onPress={expandPlanner}>
          <View style={styles.sheetHandle} />
        </TouchableOpacity>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>걷기 계획</Text>
            <Text style={styles.sheetSubtitle}>내 걸음에 맞는 맞춤 경로를 확인해 보세요</Text>
          </View>
          <TouchableOpacity style={styles.sheetClose} onPress={collapsePlanner}>
            <MaterialIcons name="expand-more" size={22} color={SECONDARY_TEXT} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>빠른 실행</Text>
            <View style={styles.quickActionRow}>
              {quickActions.map((item) => (
                <TouchableOpacity key={item.id} style={styles.quickAction} onPress={openPlanner}>
                  <View style={styles.quickIconCircle}>
                    <MaterialIcons name={item.icon as any} size={20} color={PRIMARY_COLOR} />
                  </View>
                  <Text style={styles.quickLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>오늘의 요약</Text>
            <View style={styles.highlightRow}>
              {todayHighlights.map((item) => (
                <View key={item.id} style={styles.highlightCard}>
                  <View style={styles.highlightHeader}>
                    <MaterialIcons name={item.icon as any} size={18} color={PRIMARY_COLOR} />
                    <Text style={styles.highlightTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.highlightValue}>{item.value}</Text>
                  <Text style={styles.highlightTrend}>{item.trend}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.sectionBlock, styles.formBlock]}>
            <Text style={styles.sectionTitle}>도보 경로 입력</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="my-location" size={18} color={PRIMARY_COLOR} />
              <TextInput value={startText} onChangeText={setStartText} style={styles.inputField} />
              <MaterialIcons name="swap-vert" size={18} color="#B0B7C3" />
            </View>
            <View style={styles.inputRow}>
              <MaterialIcons name="flag" size={18} color="#FF7A64" />
              <TextInput value={endText} onChangeText={setEndText} style={styles.inputField} />
              <MaterialIcons name="bookmark" size={18} color="#B0B7C3" />
            </View>
            <View style={styles.suggestionRow}>
              {['집', '회사', '지하철역', '공원'].map((item) => (
                <TouchableOpacity key={item} style={styles.suggestionChip} onPress={() => setEndText(item)}>
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.planButton} onPress={expandPlanner}>
              <MaterialIcons name="directions" size={18} color="#FFFFFF" />
              <Text style={styles.planButtonText}>경로 검색</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>추천 걷기 코스</Text>
              <TouchableOpacity style={styles.sectionMore} onPress={expandPlanner}>
                <Text style={styles.sectionMoreText}>더 보기</Text>
                <MaterialIcons name="chevron-right" size={18} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>
            <View>
              {planSuggestions.map((plan) => (
                <View key={plan.id} style={[styles.planCard, { borderLeftColor: plan.color }]}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <View style={[styles.planBadge, { backgroundColor: `${plan.color}1A` }]}> 
                      <MaterialIcons name="emoji-emotions" size={14} color={plan.color} />
                      <Text style={[styles.planBadgeText, { color: plan.color }]}>{plan.mood}</Text>
                    </View>
                  </View>
                  <Text style={styles.planSummary}>{plan.summary}</Text>
                  <View style={styles.planMetrics}>
                    <View style={styles.metricItem}>
                      <MaterialIcons name="straighten" size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.metricText}>{plan.distance}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <MaterialIcons name="schedule" size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.metricText}>{plan.duration}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <MaterialIcons name="local-fire-department" size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.metricText}>{plan.calories}</Text>
                    </View>
                  </View>
                  <View style={styles.planDetailsRow}>
                    <MaterialIcons name="terrain" size={16} color={plan.color} />
                    <Text style={styles.planDetailText}>{plan.surface}</Text>
                  </View>
                  <View style={styles.planDetailsRow}>
                    <MaterialIcons name="assistant" size={16} color={plan.color} />
                    <Text style={styles.planDetailText}>{plan.highlight}</Text>
                  </View>
                  <TouchableOpacity style={[styles.planAction, { backgroundColor: plan.color }]}>
                    <Text style={styles.planActionText}>이 경로로 시작</Text>
                    <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E8EEFF',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F8FAFF',
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1E21',
  },
  mapPlaceholderSubtitle: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  overlayTop: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 22,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1E21',
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2F6',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#00000010',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  overlayButtons: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    gap: 12,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#00000030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  routeSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#00000040',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
    paddingBottom: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: BORDER_COLOR,
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: SECONDARY_TEXT,
    marginTop: 4,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LIGHT_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 80,
    gap: 20,
  },
  sectionBlock: {
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1E21',
  },
  sectionCaption: {
    fontSize: 12,
    color: SECONDARY_TEXT,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionMoreText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${PRIMARY_COLOR}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY_TEXT,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 8,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY_TEXT,
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1E21',
  },
  highlightTrend: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
  formBlock: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#F7F9FD',
    borderWidth: 1,
    borderColor: '#E2E7F4',
    gap: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#1C1E21',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E6EEFF',
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  planButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
  },
  planButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    borderLeftWidth: 5,
    gap: 12,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1E21',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planSummary: {
    fontSize: 13,
    color: SECONDARY_TEXT,
  },
  planMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    color: SECONDARY_TEXT,
  },
  planDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planDetailText: {
    fontSize: 12,
    color: SECONDARY_TEXT,
  },
  planAction: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  planActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
