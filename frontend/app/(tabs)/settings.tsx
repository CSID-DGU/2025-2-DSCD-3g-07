
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../../contexts/AuthContext";
import { getNavigationLogs, type NavigationLogResponse } from "../../services/navigationLogService";

const PRIMARY = "#2C6DE7";
const MUTED = "#6B7280";
const EMPHASIS = "#111827";
const CARD_BG = "#FFFFFF";
const BORDER = "#E6EAF2";
const SURFACE = "#F5F7FB";
const POSITIVE = "#10B981";
const WARNING = "#F59E0B";

const LOG_MIN_DISTANCE_M = 100;
const LOG_MIN_DURATION_SEC = 60;
const EXCLUDED_LOGS_KEY = "@pacetry_excluded_logs";
const DEFAULT_ERROR_MESSAGE = "데이터를 불러오지 못했습니다. 다시 시도해 주세요.";

const toFriendlyError = (error: unknown) => {
  if (error instanceof Error) {
    if (!error.message || error.message === "[object Object]" || error.message === "{}") {
      return DEFAULT_ERROR_MESSAGE;
    }
    return error.message;
  }

  if (typeof error === "string") {
    return error || DEFAULT_ERROR_MESSAGE;
  }

  if (error && typeof error === "object") {
    try {
      const serialized = JSON.stringify(error);
      return serialized && serialized !== "{}" ? serialized : DEFAULT_ERROR_MESSAGE;
    } catch {
      return DEFAULT_ERROR_MESSAGE;
    }
  }

  return DEFAULT_ERROR_MESSAGE;
};

type DerivedStats = {
  period_days: number;
  total_navigations: number;
  walking_count: number;
  transit_count: number;
  total_distance_km: number;
  total_time_hours: number;
  avg_time_difference_seconds: number;
  accuracy_rate: number;
  avg_user_speed_factor?: number | null;
  avg_slope_factor?: number | null;
  avg_weather_factor?: number | null;
  last_active_at?: string | null;
  longest_distance_km?: number | null;
  avg_distance_km?: number | null;
  avg_duration_minutes?: number | null;
  walk_ratio_percent?: number | null;
};

type BarDatum = { label: string; value: number; unit?: string; color?: string };

const formatNumber = (value?: number | null, digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(digits);
};

const formatDistance = (meters?: number) => {
  if (meters === undefined || meters === null) return "-";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDurationMinutes = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return "-";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}분`;
};

const formatDelta = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return "-";
  const sign = seconds > 0 ? "+" : "";
  const minutes = Math.round(seconds / 60);
  return `${sign}${minutes}분`;
};

const formatHours = (hours?: number) => {
  if (hours === undefined || hours === null) return "-";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "기록 없음";
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const formatDateShort = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
};

const isPlanOnlyLog = (log: NavigationLogResponse) => {
  const estimated = log.estimated_time_seconds ?? 0;
  const actual = log.actual_time_seconds ?? 0;
  const hasMovement = !!log.movement_data || !!log.active_walking_time_seconds;
  const timeGapSmall = Math.abs(actual - estimated) < 5; // 거의 동일하면 실제 이동 없이 저장됐을 가능성
  return !hasMovement && timeGapSmall;
};

const isMeaningfulLog = (log: NavigationLogResponse) => {
  const hasDistance = (log.total_distance_m ?? 0) >= LOG_MIN_DISTANCE_M;
  const hasDuration = (log.actual_time_seconds ?? 0) >= LOG_MIN_DURATION_SEC;
  return hasDistance && hasDuration && !isPlanOnlyLog(log);
};
const StatCard = ({
  label,
  value,
  subValue,
  icon,
  tint = PRIMARY,
  onPress,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={!onPress} style={{ width: '48%' }}>
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subValue ? <Text style={styles.statSub}>{subValue}</Text> : null}
      {onPress ? (
        <View style={styles.statMore}>
          <Text style={styles.statMoreText}>자세히 보기</Text>
          <Ionicons name="chevron-forward" size={14} color="#A0AEC0" />
        </View>
      ) : null}
    </View>
  </TouchableOpacity>
);

const InsightCard = ({ label, value, subValue, icon, tint = PRIMARY }: {
  label: string;
  value: string;
  subValue?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
}) => (
  <View style={styles.insightCard}>
    <View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}>
      <Ionicons name={icon} size={16} color={tint} />
    </View>
    <Text style={styles.insightLabel}>{label}</Text>
    <Text style={styles.insightValue}>{value}</Text>
    {subValue ? <Text style={styles.insightSub}>{subValue}</Text> : null}
  </View>
);

const BarChart = ({ title, data, unit }: { title: string; data: BarDatum[]; unit?: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={styles.insightBox}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Ionicons name="stats-chart-outline" size={16} color={PRIMARY} />
      </View>
      {data.map((item, index) => {
        const width = Math.min(100, Math.round((item.value / max) * 100));
        return (
          <View key={`${title}-${item.label}-${index}`} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${width}%`, backgroundColor: item.color || PRIMARY }]} />
            </View>
            <Text style={styles.barValue}>
              {item.value}
              {unit || item.unit || ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const ChartModal = ({ visible, onClose, title, bars, description }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  bars: BarDatum[];
  description?: string;
}) => {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>
          {description ? <Text style={styles.modalDesc}>{description}</Text> : null}
          <View style={{ gap: 8, marginTop: 8 }}>
            {bars.map(bar => {
              const width = Math.min(100, Math.round((bar.value / max) * 100));
              return (
                <View key={`${title}-${bar.label}`} style={styles.modalBarRow}>
                  <Text style={styles.modalBarLabel}>{bar.label}</Text>
                  <View style={styles.modalBarTrack}>
                    <View style={[styles.modalBarFill, { width: `${width}%`, backgroundColor: bar.color || PRIMARY }]} />
                  </View>
                  <Text style={styles.modalBarValue}>
                    {bar.value}
                    {bar.unit || ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const computeDerivedStats = (logs: NavigationLogResponse[]): DerivedStats => {
  if (!logs.length) {
    return {
      period_days: 30,
      total_navigations: 0,
      walking_count: 0,
      transit_count: 0,
      total_distance_km: 0,
      total_time_hours: 0,
      avg_time_difference_seconds: 0,
      accuracy_rate: 0,
    };
  }

  const totalDistanceKm = logs.reduce((sum, log) => sum + (log.total_distance_m || 0), 0) / 1000;
  const totalTimeHours = logs.reduce((sum, log) => sum + (log.actual_time_seconds || 0), 0) / 3600;
  const totalCount = logs.length;
  const walkingCount = logs.filter(log => log.route_mode === 'walking').length;
  const transitCount = logs.filter(log => log.route_mode === 'transit').length;
  const avgTimeDiffSeconds = logs.reduce((sum, log) => sum + (log.time_difference_seconds || 0), 0) / totalCount;

  const accurateCount = logs.reduce((sum, log) => {
    if (!log.estimated_time_seconds) return sum;
    const diffRatio = Math.abs((log.actual_time_seconds - log.estimated_time_seconds) / log.estimated_time_seconds);
    return diffRatio <= 0.2 ? sum + 1 : sum;
  }, 0);

  const numWith = (key: keyof NavigationLogResponse) => logs.filter(log => log[key] !== null && log[key] !== undefined).length;

  const avgUserSpeed =
    numWith('user_speed_factor') > 0
      ? logs.reduce((sum, log) => sum + (log.user_speed_factor || 0), 0) / numWith('user_speed_factor')
      : null;
  const avgSlope =
    numWith('slope_factor') > 0
      ? logs.reduce((sum, log) => sum + (log.slope_factor || 0), 0) / numWith('slope_factor')
      : null;
  const avgWeather =
    numWith('weather_factor') > 0
      ? logs.reduce((sum, log) => sum + (log.weather_factor || 0), 0) / numWith('weather_factor')
      : null;

  const longestDistanceKm = logs.reduce((max, log) => Math.max(max, log.total_distance_m || 0), 0) / 1000;

  return {
    period_days: 30,
    total_navigations: totalCount,
    walking_count: walkingCount,
    transit_count: transitCount,
    total_distance_km: Number(totalDistanceKm.toFixed(2)),
    total_time_hours: Number(totalTimeHours.toFixed(2)),
    avg_time_difference_seconds: Number(avgTimeDiffSeconds.toFixed(0)),
    accuracy_rate: totalCount ? Number(((accurateCount / totalCount) * 100).toFixed(1)) : 0,
    avg_user_speed_factor: avgUserSpeed !== null ? Number(avgUserSpeed.toFixed(3)) : null,
    avg_slope_factor: avgSlope !== null ? Number(avgSlope.toFixed(3)) : null,
    avg_weather_factor: avgWeather !== null ? Number(avgWeather.toFixed(3)) : null,
    last_active_at: logs[0]?.started_at ?? null,
    longest_distance_km: longestDistanceKm ? Number(longestDistanceKm.toFixed(1)) : null,
    avg_distance_km: totalCount ? Number((totalDistanceKm / totalCount).toFixed(1)) : null,
    avg_duration_minutes: totalCount ? Math.round((totalTimeHours * 60) / totalCount) : null,
    walk_ratio_percent: totalCount ? Math.round((walkingCount / totalCount) * 100) : null,
  };
};
export default function SettingsScreen() {
  const { user, isAuthenticated, logout } = useAuth();

  const [rawLogs, setRawLogs] = useState<NavigationLogResponse[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<NavigationLogResponse[]>([]);
  const [excludedLogIds, setExcludedLogIds] = useState<Set<number>>(new Set());
  const [applyShortFilter, setApplyShortFilter] = useState(true);
  const [applyExclude, setApplyExclude] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ visible: boolean; title: string; bars: BarDatum[]; description?: string }>(
    { visible: false, title: '', bars: [] },
  );

  const loadExcludedLogIds = async (): Promise<Set<number>> => {
    try {
      const stored = await AsyncStorage.getItem(EXCLUDED_LOGS_KEY);
      if (!stored) return new Set();
      return new Set(JSON.parse(stored) as number[]);
    } catch (error) {
      console.warn('Failed to load excluded log ids', error);
      return new Set();
    }
  };

  const saveExcludedLogIds = async (ids: Set<number>) => {
    try {
      await AsyncStorage.setItem(EXCLUDED_LOGS_KEY, JSON.stringify(Array.from(ids)));
    } catch (error) {
      console.warn('Failed to save excluded log ids', error);
    }
  };

  const applyFilters = useCallback(
    (logs: NavigationLogResponse[], excluded: Set<number>) => {
      let result = [...logs];
      if (applyShortFilter) result = result.filter(isMeaningfulLog);
      if (applyExclude) result = result.filter(log => !excluded.has(log.log_id));
      setFilteredLogs(result);
    },
    [applyExclude, applyShortFilter],
  );

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setRawLogs([]);
      setFilteredLogs([]);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const excluded = await loadExcludedLogIds();
      setExcludedLogIds(excluded);
      const logsResponse = await getNavigationLogs(user.user_id, { limit: 100 });
      const ordered = logsResponse.logs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      setRawLogs(ordered);
      applyFilters(ordered, excluded);
    } catch (error) {
      const message = toFriendlyError(error);
      setErrorMessage(message);
      console.error('Settings data fetch failed:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [applyFilters, isAuthenticated, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters(rawLogs, excludedLogIds);
  }, [applyFilters, rawLogs, excludedLogIds]);

  const derivedStats = useMemo(() => computeDerivedStats(filteredLogs), [filteredLogs]);

  const paceSummary = useMemo(() => {
    if (!derivedStats.total_distance_km || !derivedStats.total_time_hours) return null;
    const hours = derivedStats.total_time_hours || 0;
    if (hours === 0) return null;
    const paceMinutes = Math.round((hours * 60) / derivedStats.total_distance_km);
    return `${paceMinutes}분/km`;
  }, [derivedStats]);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            Alert.alert('완료', '로그아웃 되었습니다.', [{ text: '확인', onPress: () => router.replace('/(auth)/login') }]);
          } catch {
            Alert.alert('에러', '로그아웃에 실패했어요.');
          }
        },
      },
    ]);
  };

  const handleLogin = () => router.push('/(auth)/login');

  const onRefresh = useCallback(() => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    loadData();
  }, [isAuthenticated, loadData]);
  const handleLogDetail = (log: NavigationLogResponse) => {
    Alert.alert(
      '기록 상세',
      [
        `모드: ${log.route_mode === 'walking' ? '보행' : '대중교통'}`,
        `거리: ${formatDistance(log.total_distance_m)}`,
        `이동 시간: ${formatDurationMinutes(log.actual_time_seconds)}`,
        `예측 오차: ${formatDelta(log.time_difference_seconds)}`,
        `시작: ${formatDate(log.started_at)}`,
        `종료: ${formatDate(log.ended_at)}`,
      ].join('\n'),
      [
        { text: '닫기', style: 'cancel' },
        {
          text: excludedLogIds.has(log.log_id) ? '제외 해제' : '이 기록 제외',
          style: 'destructive',
          onPress: async () => {
            const updated = new Set(excludedLogIds);
            if (updated.has(log.log_id)) updated.delete(log.log_id);
            else updated.add(log.log_id);
            setExcludedLogIds(updated);
            await saveExcludedLogIds(updated);
            applyFilters(rawLogs, updated);
          },
        },
      ],
    );
  };

  const toggleExclude = async (logId: number) => {
    const updated = new Set(excludedLogIds);
    if (updated.has(logId)) updated.delete(logId);
    else updated.add(logId);
    setExcludedLogIds(updated);
    await saveExcludedLogIds(updated);
    applyFilters(rawLogs, updated);
  };

  const resetExcludes = async () => {
    const cleared = new Set<number>();
    setExcludedLogIds(cleared);
    await saveExcludedLogIds(cleared);
    applyFilters(rawLogs, cleared);
  };

  const excludedLogsList = rawLogs.filter(log => excludedLogIds.has(log.log_id));
  const insightLogs = filteredLogs.slice(0, 7);
  const lastFive = filteredLogs.slice(0, 5);

  const avgDistanceValue =
    derivedStats.avg_distance_km !== null && derivedStats.avg_distance_km !== undefined
      ? `${formatNumber(derivedStats.avg_distance_km, 1)} km`
      : '-';
  const avgDurationValue =
    derivedStats.avg_duration_minutes !== null && derivedStats.avg_duration_minutes !== undefined
      ? `${derivedStats.avg_duration_minutes} 분`
      : '-';
  const walkRatioValue =
    derivedStats.walk_ratio_percent !== null && derivedStats.walk_ratio_percent !== undefined
      ? `${derivedStats.walk_ratio_percent}%`
      : '-';
  const longestValue =
    derivedStats.longest_distance_km !== null && derivedStats.longest_distance_km !== undefined
      ? `${formatNumber(derivedStats.longest_distance_km, 1)} km`
      : '-';

  const distanceBars: BarDatum[] =
    insightLogs.length > 0
      ? insightLogs.map(log => ({
          label: formatDateShort(log.started_at),
          value: Number(((log.total_distance_m || 0) / 1000).toFixed(1)),
          unit: ' km',
          color: '#4F46E5',
        }))
      : [{ label: '데이터 없음', value: 0, unit: '', color: '#CBD5E1' }];

  const timeBars: BarDatum[] =
    insightLogs.length > 0
      ? insightLogs.map(log => ({
          label: formatDateShort(log.started_at),
          value: Math.round((log.actual_time_seconds || 0) / 60),
          unit: ' 분',
          color: '#0EA5E9',
        }))
      : [{ label: '데이터 없음', value: 0, unit: '', color: '#CBD5E1' }];

  const openChartModal = (type: 'distance' | 'time' | 'accuracy' | 'personalization') => {
    switch (type) {
      case 'distance':
        setModalState({
          visible: true,
          title: '거리 추이',
          bars: distanceBars,
          description: '최근 7회 이동 거리',
        });
        return;
      case 'time':
        setModalState({
          visible: true,
          title: '이동 시간 추이',
          bars: timeBars,
          description: '최근 7회 이동 시간',
        });
        return;
      case 'accuracy':
        setModalState({
          visible: true,
          title: '예측 정확도',
          bars: [
            { label: '정확도', value: derivedStats.accuracy_rate, unit: '%', color: WARNING },
            { label: '평균 오차(분)', value: Math.round(derivedStats.avg_time_difference_seconds / 60), unit: ' 분', color: '#F97316' },
          ],
          description: '예측 값 대비 ±20% 이내 비율과 평균 오차',
        });
        return;
      case 'personalization':
        setModalState({
          visible: true,
          title: '개인화 계수',
          bars: [
            { label: '보행 계수', value: derivedStats.avg_user_speed_factor ?? 0, unit: 'x', color: '#7C3AED' },
            { label: '경사', value: derivedStats.avg_slope_factor ?? 0, unit: '', color: '#6EE7B7' },
            { label: '날씨', value: derivedStats.avg_weather_factor ?? 0, unit: '', color: '#60A5FA' },
          ],
          description: '실제 이동에 반영된 개인 보정 계수입니다.',
        });
        return;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyBox}>
      <Ionicons name="cloud-offline-outline" size={22} color={MUTED} />
      <Text style={styles.emptyText}>표시할 데이터가 없습니다.</Text>
    </View>
  );

  const renderRecentLogs = () => {
    if (!lastFive.length) return renderEmptyState();
    return lastFive.map(log => (
      <TouchableOpacity key={log.log_id} style={styles.logCard} onPress={() => handleLogDetail(log)} activeOpacity={0.9}>
        <View style={styles.logIconBox}>
          <Ionicons name={log.route_mode === 'walking' ? 'walk-outline' : 'bus-outline'} size={18} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.logTitle} numberOfLines={1}>
            {log.start_location || '출발지'} → {log.end_location || '도착지'}
          </Text>
          <Text style={styles.logMeta}>
            {formatDistance(log.total_distance_m)} · {formatDurationMinutes(log.actual_time_seconds)} · {formatDate(log.started_at)}
          </Text>
          <Text style={styles.logSubMeta}>
            예측 대비 {formatDelta(log.time_difference_seconds)} · {log.route_mode === 'walking' ? '보행' : '대중교통'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleExclude(log.log_id)}
          style={[styles.excludeChip, excludedLogIds.has(log.log_id) ? styles.excludeChipOff : styles.excludeChipOn]}
        >
          <Text style={[styles.excludeChipText, excludedLogIds.has(log.log_id) ? { color: MUTED } : { color: CARD_BG }]}>
            {excludedLogIds.has(log.log_id) ? '제외 해제' : '제외'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    ));
  };

  const renderExcludedManager = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>제외한 기록</Text>
        <TouchableOpacity onPress={resetExcludes} style={styles.sectionAction}>
          <Ionicons name="refresh" size={14} color={PRIMARY} />
          <Text style={styles.sectionActionText}>모두 포함</Text>
        </TouchableOpacity>
      </View>
      {excludedLogsList.length === 0 ? (
        <Text style={styles.sectionHint}>제외된 기록이 없습니다.</Text>
      ) : (
        <View style={styles.excludedBox}>
          <Text style={styles.excludedText}>{excludedLogsList.length}개 제외됨 · 요약에 반영하지 않아요.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {excludedLogsList.map(log => (
              <TouchableOpacity key={log.log_id} onPress={() => handleLogDetail(log)} style={styles.excludedPill}>
                <Text style={styles.excludedPillText}>
                  {formatDateShort(log.started_at)} · {formatDistance(log.total_distance_m)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );


  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { flex: 1, justifyContent: 'center' }]}>
          <View style={styles.emptyBox}>
            <Ionicons name="person-circle-outline" size={52} color={PRIMARY} />
            <Text style={[styles.emptyText, { marginTop: 8 }]}>로그인 후 MY 탭을 사용할 수 있습니다.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>로그인하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.section, { marginTop: 4 }]}>
          <View style={[styles.profileRow, { alignItems: 'flex-start' }]}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={28} color={PRIMARY} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.userName}>{user?.nickname || '사용자'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={CARD_BG} />
                  <Text style={styles.statusText}>로그인됨</Text>
                </View>
                <TouchableOpacity style={styles.ghostButton} onPress={onRefresh}>
                  <Ionicons name="refresh" size={14} color={PRIMARY} />
                  <Text style={styles.ghostButtonText}>데이터 새로고침</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
              <Text style={styles.secondaryButtonText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderStacked}>
            <Text style={styles.sectionTitle}>필터</Text>
            <Text style={styles.sectionHint}>요약과 그래프는 선택한 필터 기준으로 계산돼요.</Text>
          </View>
          <View style={[styles.chipRow, { gap: 10 }]}>
            <TouchableOpacity
              style={[styles.chip, applyShortFilter && styles.chipActive]}
              onPress={() => setApplyShortFilter(v => !v)}
            >
              <Ionicons
                name={applyShortFilter ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={applyShortFilter ? CARD_BG : MUTED}
              />
              <Text
                style={[
                  styles.chipText,
                  applyShortFilter ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                짧은 기록 제외
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, applyExclude && styles.chipActive]}
              onPress={() => setApplyExclude(v => !v)}
            >
              <Ionicons
                name={applyExclude ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={applyExclude ? CARD_BG : MUTED}
              />
              <Text
                style={[
                  styles.chipText,
                  applyExclude ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                제외한 기록 빼기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chipGhost} onPress={resetExcludes}>
              <Ionicons name="refresh" size={14} color={PRIMARY} />
              <Text style={styles.chipGhostText}>제외 초기화</Text>
              <Text style={[styles.chipGhostText, { color: MUTED }]}>({excludedLogIds.size}건)</Text>
            </TouchableOpacity>
          </View>
        </View>



        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>활동 요약 (최근 30일)</Text>
            <View style={styles.sectionAction}>
              <Ionicons name="information-circle-outline" size={14} color={PRIMARY} />
              <Text style={styles.sectionActionText}>필터 적용됨</Text>
            </View>
          </View>
          {isLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 16 }} />
          ) : filteredLogs.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.statGrid}>
              <StatCard
                label="총 이동 거리"
                value={`${derivedStats.total_distance_km.toFixed(1)} km`}
                subValue={`보행 ${derivedStats.walking_count} · 대중교통 ${derivedStats.transit_count}`}
                icon="navigate-outline"
                onPress={() => openChartModal('distance')}
              />
              <StatCard
                label="이동 시간"
                value={formatHours(derivedStats.total_time_hours)}
                subValue={paceSummary ? `평균 페이스 ${paceSummary}` : '페이스 계산 불가'}
                icon="time-outline"
                tint="#10B981"
                onPress={() => openChartModal('time')}
              />
              <StatCard
                label="예측 정확도"
                value={`${derivedStats.accuracy_rate.toFixed(0)}%`}
                subValue={`평균 오차 ${formatDelta(derivedStats.avg_time_difference_seconds)}`}
                icon="speedometer-outline"
                tint={WARNING}
                onPress={() => openChartModal('accuracy')}
              />
              <StatCard
                label="개인화 계수"
                value={
                  derivedStats.avg_user_speed_factor
                    ? `${derivedStats.avg_user_speed_factor.toFixed(2)}x`
                    : '데이터 수집 필요'
                }
                subValue={`경사 ${derivedStats.avg_slope_factor ?? '-'}, 날씨 ${derivedStats.avg_weather_factor ?? '-'}`}
                icon="trending-up-outline"
                tint="#7C3AED"
                onPress={() => openChartModal('personalization')}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderStacked}>
            <Text style={styles.sectionTitle}>추가 인사이트</Text>
            <Text style={styles.sectionHint}>주요 지표와 추이를 함께 보여줘요.</Text>
          </View>
          <View style={styles.insightGrid}>
            <InsightCard label="평균 이동 거리" value={avgDistanceValue} subValue={`${derivedStats.total_navigations}건 기준`} icon="map-outline" />
            <InsightCard label="평균 이동 시간" value={avgDurationValue} subValue={`${derivedStats.total_navigations}건 기준`} icon="hourglass-outline" tint="#6366F1" />
            <InsightCard label="보행 비율" value={walkRatioValue} subValue={`총 ${derivedStats.total_navigations}건`} icon="walk-outline" tint="#10B981" />
            <InsightCard
              label="최장 이동 거리"
              value={longestValue}
              subValue={derivedStats.last_active_at ? formatDate(derivedStats.last_active_at) : '최근 활동 기록 없음'}
              icon="trending-up-outline"
              tint="#A855F7"
            />
          </View>
          <BarChart title="이동 거리 추이" data={distanceBars} unit=" km" />
          <BarChart title="이동 시간 추이" data={timeBars} unit=" 분" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderStacked}>
            <Text style={styles.sectionTitle}>최근 기록 (최신 5개)</Text>
            <Text style={styles.sectionHint}>카드를 눌러 제외/복구를 선택할 수 있습니다.</Text>
          </View>
          {renderRecentLogs()}
        </View>

        {renderExcludedManager()}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={16} color={WARNING} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      <ChartModal
        visible={modalState.visible}
        onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
        title={modalState.title}
        bars={modalState.bars}
        description={modalState.description}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  container: { padding: 16, gap: 12, paddingBottom: 24 },
  section: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeaderStacked: { marginBottom: 12, gap: 6, alignItems: 'flex-start' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: EMPHASIS },
  sectionHint: { fontSize: 12, color: MUTED, flexShrink: 1 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: '800', color: EMPHASIS },
  userEmail: { fontSize: 13, color: MUTED, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: POSITIVE, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: CARD_BG, fontWeight: '700', fontSize: 12 },
  ghostButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  ghostButtonText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  secondaryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  secondaryButtonText: { color: EMPHASIS, fontWeight: '700' },
  primaryButton: { marginTop: 12, backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryButtonText: { color: CARD_BG, fontWeight: '700', textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: CARD_BG },
  chipTextInactive: { color: MUTED },
  chipGhost: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: `${PRIMARY}10`, borderWidth: 1, borderColor: PRIMARY },
  chipGhostText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  statCard: { backgroundColor: SURFACE, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BORDER, gap: 8 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: MUTED, fontSize: 12, fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '800', color: EMPHASIS },
  statSub: { fontSize: 12, color: MUTED },
  statMore: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statMoreText: { fontSize: 12, color: '#A0AEC0', fontWeight: '600' },
  insightBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, gap: 10 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insightTitle: { fontSize: 14, fontWeight: '700', color: EMPHASIS },
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 8 },
  insightCard: { width: '48%', backgroundColor: SURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER, gap: 6 },
  insightLabel: { fontSize: 12, color: MUTED, fontWeight: '700' },
  insightValue: { fontSize: 18, fontWeight: '800', color: EMPHASIS },
  insightSub: { fontSize: 12, color: MUTED },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 48, fontSize: 12, color: MUTED },
  barTrack: { flex: 1, height: 8, backgroundColor: '#EEF2F7', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { width: 64, textAlign: 'right', fontSize: 12, color: EMPHASIS, fontWeight: '700' },
  logCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  logIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center' },
  logTitle: { fontSize: 14, fontWeight: '700', color: EMPHASIS },
  logMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  logSubMeta: { fontSize: 12, color: MUTED },
  excludeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  excludeChipOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  excludeChipOff: { backgroundColor: CARD_BG, borderColor: BORDER },
  excludeChipText: { fontSize: 12, fontWeight: '700' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  emptyText: { color: MUTED, fontSize: 13 },
  excludedBox: { padding: 12, borderRadius: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  excludedText: { color: EMPHASIS, fontWeight: '700' },
  excludedPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, marginRight: 8 },
  excludedPillText: { color: MUTED, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', borderRadius: 14, backgroundColor: CARD_BG, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: EMPHASIS },
  modalDesc: { marginTop: 6, color: MUTED, fontSize: 13 },
  modalBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBarLabel: { width: 80, fontSize: 12, color: MUTED },
  modalBarTrack: { flex: 1, height: 10, backgroundColor: '#EEF2F7', borderRadius: 999, overflow: 'hidden' },
  modalBarFill: { height: '100%', borderRadius: 999 },
  modalBarValue: { width: 52, textAlign: 'right', fontSize: 12, color: EMPHASIS, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' },
  errorText: { color: '#92400E', fontSize: 13 },
});
