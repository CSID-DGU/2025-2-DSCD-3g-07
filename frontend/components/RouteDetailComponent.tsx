import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TransitRouteResponse } from '../types/api';

interface RouteDetailComponentProps {
  routeData: TransitRouteResponse | null;
}

const RouteDetailComponent: React.FC<RouteDetailComponentProps> = ({ routeData }) => {
  if (!routeData?.metaData?.plan?.itineraries?.[0]) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="directions" size={48} color="#ccc" />
        <Text style={styles.emptyText}>경로 정보가 없습니다</Text>
      </View>
    );
  }

  const itinerary = routeData.metaData.plan.itineraries[0];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'WALK':
        return 'directions-walk';
      case 'BUS':
        return 'directions-bus';
      case 'SUBWAY':
        return 'directions-subway';
      case 'TRAIN':
        return 'train';
      default:
        return 'directions';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'WALK':
        return '#4CAF50';
      case 'BUS':
        return '#FF9800';
      case 'SUBWAY':
        return '#2196F3';
      case 'TRAIN':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const getRouteTypeText = (type: number) => {
    // T맵 공식 문서 기준 버스 타입
    const busTypes: { [key: number]: string } = {
      1: '일반',
      2: '좌석',
      3: '마을',
      4: '직행좌석',
      5: '공항',
      6: '간선급행',
      10: '외곽',
      11: '간선',
      12: '지선',
      13: '순환',
      14: '광역',
      15: '급행'
    };
    return busTypes[type] || '기타';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    return `${minutes}분`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 경로 요약 정보 */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>경로 요약</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="schedule" size={16} color="#304FFE" />
            <Text style={styles.summaryText}>총 {formatTime(itinerary.totalTime)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="directions-walk" size={16} color="#4CAF50" />
            <Text style={styles.summaryText}>도보 {formatTime(itinerary.totalWalkTime)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="straighten" size={16} color="#FF9800" />
            <Text style={styles.summaryText}>{formatDistance(itinerary.totalDistance)}</Text>
          </View>
        </View>
        {itinerary.fare?.regular?.totalFare && (
          <View style={styles.fareRow}>
            <MaterialIcons name="payment" size={16} color="#F44336" />
            <Text style={styles.fareText}>
              {itinerary.fare.regular.totalFare.toLocaleString()}원
            </Text>
          </View>
        )}
      </View>

      {/* 상세 경로 */}
      <View style={styles.routeCard}>
        <Text style={styles.routeTitle}>상세 경로</Text>
        {itinerary.legs?.map((leg, index) => (
          <View key={index} style={styles.legContainer}>
            <View style={styles.legHeader}>
              <View style={[styles.modeIcon, { backgroundColor: getModeColor(leg.mode) }]}>
                <MaterialIcons 
                  name={getModeIcon(leg.mode) as any} 
                  size={20} 
                  color="white" 
                />
              </View>
              <View style={styles.legInfo}>
                <Text style={styles.legTitle}>
                  {leg.mode === 'WALK' ? '도보' : 
                   leg.mode === 'BUS' ? `${leg.route} (${getRouteTypeText(leg.type || 0)})` :
                   leg.mode === 'SUBWAY' ? leg.route :
                   leg.route || leg.mode}
                </Text>
                <Text style={styles.legSubtitle}>
                  {formatTime(leg.sectionTime)} · {formatDistance(leg.distance)}
                </Text>
              </View>
              <View style={styles.legTime}>
                <Text style={styles.timeText}>{formatTime(leg.sectionTime)}</Text>
              </View>
            </View>

            <View style={styles.legDetails}>
              <View style={styles.stationInfo}>
                <MaterialIcons name="radio-button-checked" size={12} color="#4CAF50" />
                <Text style={styles.stationName}>{leg.start?.name || '출발지'}</Text>
              </View>
              
              {leg.mode !== 'WALK' && (leg.passStopList?.stations || leg.passStopList?.stationList) && (
                <View style={styles.passStops}>
                  <Text style={styles.passStopsText}>
                    {(leg.passStopList.stations || leg.passStopList.stationList || []).length}개 정류장 경유
                  </Text>
                  {(leg.passStopList.stations || leg.passStopList.stationList || []).slice(1, -1).map((station, idx) => (
                    <Text key={idx} style={styles.stopName}>
                      • {station.stationName}
                    </Text>
                  ))}
                </View>
              )}

              {leg.mode === 'WALK' && leg.steps && (
                <View style={styles.walkSteps}>
                  {leg.steps.map((step, stepIndex) => (
                    <Text key={stepIndex} style={styles.stepText}>
                      • {step.description}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.stationInfo}>
                <MaterialIcons name="location-on" size={12} color="#F44336" />
                <Text style={styles.stationName}>{leg.end?.name || '도착지'}</Text>
              </View>
            </View>

            {index < (itinerary.legs?.length || 0) - 1 && (
              <View style={styles.connector}>
                <View style={styles.connectorLine} />
                <MaterialIcons name="more-vert" size={16} color="#ddd" />
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 14,
    color: '#445160',
    fontWeight: '500',
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E6F2',
  },
  fareText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  routeCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 20,
  },
  legContainer: {
    marginBottom: 20,
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  legInfo: {
    flex: 1,
  },
  legTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1E21',
  },
  legSubtitle: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },
  legTime: {
    backgroundColor: '#F7F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#304FFE',
  },
  legDetails: {
    paddingLeft: 52,
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stationName: {
    fontSize: 14,
    color: '#1C1E21',
    fontWeight: '500',
  },
  passStops: {
    backgroundColor: '#F7F8FF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  passStopsText: {
    fontSize: 12,
    color: '#304FFE',
    fontWeight: '600',
    marginBottom: 8,
  },
  stopName: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 2,
  },
  walkSteps: {
    backgroundColor: '#F1F8E9',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  stepText: {
    fontSize: 11,
    color: '#4CAF50',
    marginBottom: 2,
  },
  connector: {
    alignItems: 'center',
    marginVertical: 8,
  },
  connectorLine: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
    position: 'absolute',
  },
});

export default RouteDetailComponent;