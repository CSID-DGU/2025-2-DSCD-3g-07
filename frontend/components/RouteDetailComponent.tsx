import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TransitRouteResponse, RouteElevationAnalysis } from '../types/api';
import { formatTimeDifference } from '../services/elevationService';

interface RouteDetailComponentProps {
  routeData: TransitRouteResponse | null;
  slopeAnalysis?: RouteElevationAnalysis | null;
  routeMode?: 'transit' | 'walking';
  totalTime?: number;
  totalWalkTime?: number;
}

const RouteDetailComponent: React.FC<RouteDetailComponentProps> = ({
  routeData,
  slopeAnalysis,
  routeMode = 'walking',
  totalTime = 0,
  totalWalkTime = 0,
}) => {
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
      15: '급행',
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
            <Text style={styles.summaryText}>
              총 {formatTime(itinerary.totalTime)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="directions-walk" size={16} color="#4CAF50" />
            <Text style={styles.summaryText}>
              도보 {formatTime(itinerary.totalWalkTime)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="straighten" size={16} color="#FF9800" />
            <Text style={styles.summaryText}>
              {formatDistance(itinerary.totalDistance)}
            </Text>
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

        {/* 경사도 정보 */}
        {slopeAnalysis &&
          !slopeAnalysis.error &&
          slopeAnalysis.walk_legs_analysis.length > 0 && (
            <View style={styles.slopeSection}>
              <View style={styles.slopeDivider} />
              <View style={styles.slopeHeader}>
                <MaterialIcons name="terrain" size={18} color="#FF6B6B" />
                <Text style={styles.slopeHeaderText}>경사도 분석</Text>
              </View>
              <View style={styles.slopeRow}>
                <View style={styles.slopeItem}>
                  <Text style={styles.slopeLabel}>평균 경사</Text>
                  <Text style={styles.slopeValue}>
                    {(() => {
                      const totalDistance =
                        slopeAnalysis.walk_legs_analysis.reduce(
                          (sum, leg) => sum + leg.distance,
                          0
                        );
                      const weightedSum =
                        slopeAnalysis.walk_legs_analysis.reduce(
                          (sum, leg) => sum + leg.avg_slope * leg.distance,
                          0
                        );
                      return (weightedSum / totalDistance).toFixed(1);
                    })()}
                    %
                  </Text>
                </View>
                <View style={styles.slopeItem}>
                  <Text style={styles.slopeLabel}>보정 시간</Text>
                  <Text
                    style={[
                      styles.slopeValue,
                      (() => {
                        const value = slopeAnalysis.total_route_time_adjustment;
                        const isNegative = value < 0;
                        console.log('🎨 [보정 시간 색상]', {
                          value,
                          isNegative,
                          willApply: isNegative ? 'slopeValueDecrease (초록)' : 'slopeValueIncrease (빨강)'
                        });
                        return isNegative ? styles.slopeValueDecrease : styles.slopeValueIncrease;
                      })()
                    ]}
                  >
                    {formatTimeDifference(
                      slopeAnalysis.total_route_time_adjustment
                    )}
                  </Text>
                </View>
                <View style={styles.slopeItem}>
                  <Text style={styles.slopeLabel}>실제 예상</Text>
                  <Text style={styles.slopeValue}>
                    {Math.round(slopeAnalysis.total_adjusted_walk_time / 60)}분
                  </Text>
                </View>
              </View>

              {/* 횡단보도 정보 */}
              {slopeAnalysis.crosswalk_count !== undefined &&
                slopeAnalysis.crosswalk_count > 0 && (
                  <View style={styles.crosswalkSection}>
                    <View style={styles.crosswalkRow}>
                      <Text style={styles.crosswalkEmoji}>🚦</Text>
                      <Text style={styles.crosswalkText}>
                        횡단보도: {slopeAnalysis.crosswalk_count}개
                      </Text>
                      {slopeAnalysis.crosswalk_wait_time && (
                        <Text style={styles.crosswalkTime}>
                          (+{Math.floor(slopeAnalysis.crosswalk_wait_time / 60)}
                          분 {slopeAnalysis.crosswalk_wait_time % 60}초 대기)
                        </Text>
                      )}
                    </View>
                    {slopeAnalysis.total_time_with_crosswalk && (
                      <Text style={styles.crosswalkTotalTime}>
                        (참고용)횡단보도 포함 최종 보정 시간:{' '}
                        {(() => {
                          // 대중교통: 보행시간 + 대중교통 탑승시간
                          // 도보: 보행시간만
                          const finalTime = routeMode === 'transit'
                            ? slopeAnalysis.total_time_with_crosswalk + (totalTime - totalWalkTime)
                            : slopeAnalysis.total_time_with_crosswalk;
                          return `${Math.floor(finalTime / 60)}분 ${finalTime % 60}초`;
                        })()}
                      </Text>
                    )}
                  </View>
                )}

              {/* 경사도 이상 현상 설명 */}
              {(() => {
                const totalDistance = slopeAnalysis.walk_legs_analysis.reduce(
                  (sum, leg) => sum + leg.distance,
                  0
                );
                const weightedSum = slopeAnalysis.walk_legs_analysis.reduce(
                  (sum, leg) => sum + leg.avg_slope * leg.distance,
                  0
                );
                const avgSlope = weightedSum / totalDistance;
                const timeAdjustment =
                  slopeAnalysis.total_route_time_adjustment;

                // 모든 구간의 경사도 중 절대값 40% 이상인 경우 체크
                const hasExtremeSteepSlope =
                  slopeAnalysis.walk_legs_analysis.some(
                    leg =>
                      leg.segments?.some(
                        segment => Math.abs(segment.slope) >= 40
                      ) ||
                      Math.abs(leg.max_slope) >= 40 ||
                      Math.abs(leg.min_slope) >= 40
                  );

                // 내리막인데 시간이 증가한 경우
                const hasDownhillTimeIncrease =
                  avgSlope < -1 && timeAdjustment > 30;

                const warnings = [];

                // 엘리베이터 필요 (40% 이상 극단 경사)
                if (hasExtremeSteepSlope) {
                  warnings.push(
                    <View key="extreme" style={styles.slopeWarning}>
                      <MaterialIcons name="warning" size={16} color="#F44336" />
                      <Text style={styles.slopeWarningText}>
                        일부 구간에 경사도가 40% 이상인 급경사가 있습니다.
                        엘리베이터나 에스컬레이터 이용을 권장합니다.
                      </Text>
                    </View>
                  );
                }

                // 평균 경사가 음수(내리막)인데 시간이 증가한 경우
                if (hasDownhillTimeIncrease) {
                  warnings.push(
                    <View key="downhill" style={styles.slopeWarning}>
                      <MaterialIcons
                        name="info-outline"
                        size={16}
                        color="#FF9800"
                      />
                      <Text style={styles.slopeWarningText}>
                        일부 구간에 급경사가 있어 안전한 보행을 고려해 시간이
                        증가했습니다. 계단이나 승강기 이용을 권장드립니다.
                      </Text>
                    </View>
                  );
                }

                return warnings.length > 0 ? <>{warnings}</> : null;
              })()}

              {/* 구간별 경사도 미리보기 */}
              <View style={styles.slopePreview}>
                {slopeAnalysis.walk_legs_analysis
                  .slice(0, 3)
                  .map((leg, index) => {
                    // 환승 구간 체크
                    if (leg.is_transfer) {
                      return (
                        <View key={index} style={styles.slopePreviewItem}>
                          <Text style={styles.slopeEmoji}>🚇</Text>
                          <View style={styles.slopePreviewTextContainer}>
                            <Text style={styles.slopePreviewText}>
                              환승 구간: {leg.start_name} → {leg.end_name}
                            </Text>
                            <Text
                              style={[
                                styles.slopePreviewText,
                                { color: '#6B7280' },
                              ]}
                            >
                              실내 이동 (경사도/날씨 영향 없음)
                            </Text>
                          </View>
                        </View>
                      );
                    }

                    const getSlopeEmoji = (slope: number) => {
                      const absSlope = Math.abs(slope);
                      if (absSlope < 3) return '⚪';
                      if (absSlope < 5) return '🟢';
                      if (absSlope < 10) return '🟡';
                      if (absSlope < 15) return '🟠';
                      return '🔴';
                    };

                    const getSlopeDifficulty = (slope: number) => {
                      const absSlope = Math.abs(slope);
                      if (absSlope < 3) return '평지';
                      if (absSlope < 5) return '완만';
                      if (absSlope < 10) return '보통';
                      if (absSlope < 15) return '가파름';
                      return '매우 가파름';
                    };

                    const getOrderText = (index: number) => {
                      const orders = ['첫 번째', '두 번째', '세 번째'];
                      return orders[index] || `${index + 1}번째`;
                    };

                    return (
                      <View key={index} style={styles.slopePreviewItem}>
                        <Text style={styles.slopeEmoji}>
                          {getSlopeEmoji(leg.avg_slope)}
                        </Text>
                        <View style={styles.slopePreviewTextContainer}>
                          <Text style={styles.slopePreviewText}>
                            {getOrderText(index)} 보행 구간의 평균 경사도:
                          </Text>
                          <Text style={styles.slopePreviewText}>
                            {getSlopeDifficulty(leg.avg_slope)}{' '}
                            {leg.avg_slope.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                {slopeAnalysis.walk_legs_analysis.length > 3 && (
                  <Text style={styles.slopeMoreText}>
                    +{slopeAnalysis.walk_legs_analysis.length - 3}개 구간
                  </Text>
                )}
              </View>
            </View>
          )}
      </View>

      {/* 상세 경로 */}
      <View style={styles.routeCard}>
        <Text style={styles.routeTitle}>상세 경로</Text>
        {itinerary.legs?.map((leg, index) => (
          <View key={index} style={styles.legContainer}>
            <View style={styles.legHeader}>
              <View
                style={[
                  styles.modeIcon,
                  { backgroundColor: getModeColor(leg.mode) },
                ]}
              >
                <MaterialIcons
                  name={getModeIcon(leg.mode) as any}
                  size={20}
                  color="white"
                />
              </View>
              <View style={styles.legInfo}>
                <Text style={styles.legTitle}>
                  {leg.mode === 'WALK'
                    ? '도보'
                    : leg.mode === 'BUS'
                      ? `${leg.route} (${getRouteTypeText(leg.type || 0)})`
                      : leg.mode === 'SUBWAY'
                        ? leg.route
                        : leg.route || leg.mode}
                </Text>
                <Text style={styles.legSubtitle}>
                  {formatTime(leg.sectionTime)} · {formatDistance(leg.distance)}
                </Text>
              </View>
              <View style={styles.legTime}>
                <Text style={styles.timeText}>
                  {formatTime(leg.sectionTime)}
                </Text>
              </View>
            </View>

            <View style={styles.legDetails}>
              <View style={styles.stationInfo}>
                <MaterialIcons
                  name="radio-button-checked"
                  size={12}
                  color="#4CAF50"
                />
                <Text style={styles.stationName}>
                  {leg.start?.name || '출발지'}
                </Text>
              </View>

              {leg.mode !== 'WALK' &&
                (leg.passStopList?.stations ||
                  leg.passStopList?.stationList) && (
                  <View style={styles.passStops}>
                    <Text style={styles.passStopsText}>
                      {
                        (
                          leg.passStopList.stations ||
                          leg.passStopList.stationList ||
                          []
                        ).length
                      }
                      개 정류장 경유
                    </Text>
                    {(
                      leg.passStopList.stations ||
                      leg.passStopList.stationList ||
                      []
                    )
                      .slice(1, -1)
                      .map((station, idx) => (
                        <Text key={idx} style={styles.stopName}>
                          • {station.stationName}
                        </Text>
                      ))}
                  </View>
                )}

              {leg.mode === 'WALK' && leg.steps && (
                <View style={styles.walkSteps}>
                  {(() => {
                    console.log('🔍 [RouteDetail] Walk steps:', {
                      legIndex: index,
                      stepsCount: leg.steps.length,
                      firstStep: leg.steps[0],
                    });
                    return leg.steps.map((step, stepIndex) => (
                      <Text key={stepIndex} style={styles.stepText}>
                        • {step.description}
                      </Text>
                    ));
                  })()}
                </View>
              )}

              <View style={styles.stationInfo}>
                <MaterialIcons name="location-on" size={12} color="#F44336" />
                <Text style={styles.stationName}>
                  {leg.end?.name || '도착지'}
                </Text>
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
  // 경사도 스타일
  slopeSection: {
    marginTop: 16,
    paddingTop: 16,
  },
  slopeDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginBottom: 12,
  },
  slopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  slopeHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1E21',
  },
  slopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  slopeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  slopeLabel: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 4,
  },
  slopeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1E21',
  },
  slopeValueIncrease: {
    color: '#F44336',
  },
  slopeValueDecrease: {
    color: '#4CAF50',
  },
  slopeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  slopeWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#E65100',
    lineHeight: 16,
  },
  slopePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  slopePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  slopeEmoji: {
    fontSize: 12,
  },
  slopePreviewTextContainer: {
    flexDirection: 'column',
  },
  slopePreviewText: {
    fontSize: 11,
    color: '#667085',
    fontWeight: '500',
    maxWidth: 80,
  },
  slopeMoreText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    paddingVertical: 6,
  },
  // 횡단보도 스타일
  crosswalkSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  crosswalkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  crosswalkEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  crosswalkText: {
    fontSize: 14,
    color: '#1C1E21',
    fontWeight: '600',
  },
  crosswalkTime: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 8,
  },
  crosswalkTotalTime: {
    fontSize: 13,
    color: '#667085',
    marginTop: 4,
    marginLeft: 24,
  },
});

export default RouteDetailComponent;
