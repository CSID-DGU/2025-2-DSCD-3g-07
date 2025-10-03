import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  readTodayStepsAndDistance,
  requestHealthConnectPermissions,
  type HealthResult,
} from '../../health';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type ScreenState = {
  status: LoadState;
  data?: HealthResult;
  error?: string;
};

const PRIMARY_COLOR = '#2C6DE7';
const CARD_BACKGROUND = '#F6F8FD';
const TEXT_DARK = '#1C1E21';
const TEXT_MUTED = '#5B6572';

export default function StatsScreen() {
  const [state, setState] = useState<ScreenState>({ status: 'idle' });
  const [refreshing, setRefreshing] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setState((current) => ({ status: 'loading', data: current.data }));
    try {
      const result = await readTodayStepsAndDistance();
      setState({ status: 'ready', data: result });
    } catch (error: any) {
      setState({
        status: 'error',
        error: error?.message ?? 'Failed to load Health Connect data.',
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const onRequestPermissions = useCallback(async () => {
    setPermissionMessage('Requesting permissions...');
    const { success, error } = await requestHealthConnectPermissions();
    if (success) {
      setPermissionMessage('Permissions granted. Updating stats...');
      await loadData();
      setPermissionMessage(null);
      return;
    }
    setPermissionMessage(error ?? 'Permission request was denied.');
  }, [loadData]);

  const summary = useMemo(() => {
    if (!state.data) {
      return null;
    }

    const distanceKm = state.data.totalMeters / 1000;
    const formattedDistance = distanceKm >= 0.1
      ? `${distanceKm.toFixed(2)} km`
      : `${state.data.totalMeters} m`;

    return [
      {
        id: 'steps',
        icon: 'directions-walk' as const,
        label: 'Steps',
        value: formatNumber(state.data.totalSteps),
      },
      {
        id: 'distance',
        icon: 'route' as const,
        label: 'Distance',
        value: formattedDistance,
      },
      {
        id: 'speed',
        icon: 'speed' as const,
        label: 'Avg speed',
        value:
          state.data.averageSpeedKmh > 0
            ? `${state.data.averageSpeedKmh.toFixed(2)} km/h`
            : 'N/A',
        hint:
          state.data.averageSpeedMps > 0
            ? `${state.data.averageSpeedMps.toFixed(2)} m/s`
            : undefined,
      },
    ];
  }, [state.data]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Today&apos;s Health Summary</Text>
        <Text style={styles.subtitle}>
          Data is aggregated locally via Health Connect. Pull to refresh for the latest sync.
        </Text>

        {permissionMessage ? (
          <View style={styles.messageCard}>
            <MaterialIcons name="info" size={18} color={PRIMARY_COLOR} />
            <Text style={styles.messageText}>{permissionMessage}</Text>
          </View>
        ) : null}

        {state.status === 'loading' && !state.data ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Loading Health Connect data...</Text>
          </View>
        ) : null}

        {state.status === 'error' ? (
          <View style={styles.errorBlock}>
            <MaterialIcons name="error-outline" size={20} color="#E53935" />
            <Text style={styles.errorText}>{state.error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
              <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {state.data ? (
          <View style={styles.summaryGrid}>
            {summary?.map((item) => (
              <View key={item.id} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <MaterialIcons name={item.icon} size={20} color={PRIMARY_COLOR} />
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
                <Text style={styles.summaryValue}>{item.value}</Text>
                {item.hint ? (
                  <Text style={styles.summaryHint}>{item.hint}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {state.data ? (
          <View style={styles.detailsCard}>
            <View style={styles.detailsRow}>
              <MaterialIcons name="insights" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.detailsTitle}>Source</Text>
            </View>
            <Text style={styles.detailsBody}>
              {state.data.source}
              {state.data.isDemoData ? ' (demo data)' : ''}
            </Text>
            <Text style={styles.detailsTimestamp}>
              Updated at {new Date(state.data.timestamp).toLocaleTimeString()}
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={onRequestPermissions}>
              <MaterialIcons name="lock-open" size={18} color={PRIMARY_COLOR} />
              <Text style={styles.permissionText}>Manage Health Connect permissions</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F0FF',
    padding: 12,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 13,
    color: TEXT_DARK,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  errorBlock: {
    gap: 12,
    backgroundColor: '#FDECEA',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 140,
    padding: 16,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    gap: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  summaryHint: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  detailsCard: {
    gap: 12,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8F2',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  detailsBody: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  detailsTimestamp: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  permissionButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  permissionText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
});
