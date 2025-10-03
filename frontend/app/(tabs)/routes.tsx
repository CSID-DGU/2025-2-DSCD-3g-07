import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { id: 'recommended', label: '추천', helper: '맞춤 추천' },
  { id: 'distance', label: '거리별', helper: '목표 거리' },
  { id: 'time', label: '시간별', helper: '목표 시간' },
];

const SUGGESTIONS = ['현재 위치', '집', '회사', '지하철역'];
const FILTERS = ['강변 뷰', '숲길', '야경', '평지', '도전적'];

const ROUTES = {
  recommended: [
    {
      id: 'rec-1',
      title: '한강 둘레길',
      subtitle: '여의나루~서울색공원',
      distance: '3.6 km',
      duration: '48분',
      difficulty: '쉬움',
      highlight: '데크길과 노을 포인트',
      image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1100&q=60',
    },
    {
      id: 'rec-2',
      title: '서울숲 카페 투어',
      subtitle: '서울숲~카페거리',
      distance: '4.4 km',
      duration: '62분',
      difficulty: '보통',
      highlight: '카페 휴식과 포토존',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1100&q=60',
    },
  ],
  distance: [
    {
      id: 'dist-1',
      title: '5km 도전 코스',
      subtitle: '잠실 종합운동장 외곽',
      distance: '5.2 km',
      duration: '70분',
      difficulty: '보통',
      highlight: '1km마다 알림',
      image: 'https://images.unsplash.com/photo-1436450412740-6b988f486c6b?auto=format&fit=crop&w=1100&q=60',
    },
    {
      id: 'dist-2',
      title: '점심 산책로',
      subtitle: '망원공원~시장',
      distance: '2.2 km',
      duration: '30분',
      difficulty: '쉬움',
      highlight: '피니시 라인 먹거리',
      image: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1100&q=60',
    },
  ],
  time: [
    {
      id: 'time-1',
      title: '30분 점심 산책',
      subtitle: '시청~덕수궁 돌담길',
      distance: '2.3 km',
      duration: '32분',
      difficulty: '쉬움',
      highlight: '그늘과 벤치',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1100&q=60',
    },
    {
      id: 'time-2',
      title: '1시간 스카이라인',
      subtitle: '남산 야경 산책로',
      distance: '4.1 km',
      duration: '63분',
      difficulty: '도전적',
      highlight: '꾸준한 오르막과 전망대',
      image: 'https://images.unsplash.com/photo-1479705879471-baea15b10f82?auto=format&fit=crop&w=1100&q=60',
    },
  ],
} as const;

export default function RoutesScreen() {
  const [activeTab, setActiveTab] = useState('recommended');
  const [start, setStart] = useState('현재 위치');
  const [destination, setDestination] = useState('도착지를 입력하세요');
  const [filters, setFilters] = useState<string[]>(['강변 뷰']);

  const routes = useMemo(() => ROUTES[activeTab as keyof typeof ROUTES], [activeTab]);

  const toggleFilter = (item: string) => {
    setFilters((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.wrapper}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>걸을 코스 선택하기</Text>
            <Text style={styles.subtitle}>거리, 시간, 풍경을 내 걸음에 맞춰 조정하세요</Text>
          </View>
          <TouchableOpacity style={styles.recentButton}>
            <MaterialIcons name="history" size={20} color="#304FFE" />
            <Text style={styles.recentText}>기록</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>출발지</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="my-location" size={18} color="#304FFE" />
              <TextInput value={start} onChangeText={setStart} style={styles.inputField} />
              <MaterialIcons name="refresh" size={18} color="#9AA3B0" />
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>도착지</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="flag" size={18} color="#FF7043" />
              <TextInput value={destination} onChangeText={setDestination} style={styles.inputField} />
              <MaterialIcons name="bookmark" size={18} color="#9AA3B0" />
            </View>
          </View>
          <View style={styles.suggestionRow}>
            {SUGGESTIONS.map((value) => (
              <TouchableOpacity key={value} style={styles.suggestionChip} onPress={() => setDestination(value)}>
                <Text style={styles.suggestionText}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.ctaButton}>
            <MaterialIcons name="directions" size={18} color="#FFFFFF" />
            <Text style={styles.ctaText}>경로 검색</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                <Text style={[styles.tabHelper, active && styles.tabHelperActive]}>{tab.helper}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = filters.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => toggleFilter(item)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.routeList}>
          {routes.map((route) => (
            <View key={route.id} style={styles.routeCard}>
              <Image source={{ uri: route.image }} style={styles.thumbnail} />
              <View style={styles.routeContent}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeTitle}>{route.title}</Text>
                  <View style={styles.badge}>
                    <MaterialIcons name="emoji-nature" size={16} color="#304FFE" />
                    <Text style={styles.badgeText}>{route.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.routeSubtitle}>{route.subtitle}</Text>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <MaterialIcons name="straighten" size={16} color="#304FFE" />
                    <Text style={styles.metricText}>{route.distance}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <MaterialIcons name="schedule" size={16} color="#304FFE" />
                    <Text style={styles.metricText}>{route.duration}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <MaterialIcons name="terrain" size={16} color="#304FFE" />
                    <Text style={styles.metricText}>{route.highlight}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.routeButton}>
                  <Text style={styles.routeButtonText}>View detail</Text>
                  <MaterialIcons name="chevron-right" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  wrapper: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1E21',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#667085',
  },
  recentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(48,79,254,0.1)',
    borderRadius: 999,
  },
  recentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#304FFE',
  },
  card: {
    backgroundColor: '#F7F8FF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C6675',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#1C1E21',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E6F2',
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
    backgroundColor: '#E6ECFF',
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#304FFE',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#304FFE',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F8',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C7383',
  },
  tabLabelActive: {
    color: '#1C1E21',
  },
  tabHelper: {
    fontSize: 11,
    color: '#9AA3B0',
  },
  tabHelperActive: {
    color: '#667085',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#F1F2F6',
  },
  filterChipActive: {
    backgroundColor: '#304FFE',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C7383',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  routeList: {
    gap: 18,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  routeContent: {
    padding: 18,
    gap: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
  },
  routeSubtitle: {
    fontSize: 13,
    color: '#667085',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(48,79,254,0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#304FFE',
  },
  metricRow: {
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
    color: '#445160',
  },
  routeButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#304FFE',
  },
  routeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
