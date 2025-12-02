/**
 * 움직임 추적 서비스 (하이브리드 방식)
 * 
 * GPS 속도 + 가속도계 센서를 결합하여 실제 보행 시간을 추적합니다.
 * - GPS 속도가 0.2 m/s (0.72 km/h) 이하일 때 → 가속도계로 움직임 확인
 * - GPS 속도가 5.0 m/s (18 km/h) 이상일 때 → 차량으로 판단
 * - 연속 5초 이상 정지 시 해당 구간을 pausedTime에 누적
 * - realWalkingSpeed = distance / activeWalkingTime
 */

import * as Location from 'expo-location';
import { Accelerometer, Pedometer } from 'expo-sensors';
import type { MovementSegment } from './navigationLogService';

const SPEED_THRESHOLD_MIN = 0.2; // m/s (0.72 km/h) - 이하면 정지로 간주 (GPS 오차 고려)
const SPEED_THRESHOLD_MAX = 5.0; // m/s (18 km/h) - 이상이면 확실히 차량 (일반인 달리기 한계)
const MIN_PAUSE_DURATION = 5; // 초 - pausedTime에 기록되는 최소 정지 시간
const STATE_CHANGE_HYSTERESIS = 3; // 초 - 상태 전환을 위한 히스테리시스 시간 (노이즈 방지)

// 가속도 패턴 분석용 상수
const ACCEL_STATIONARY_THRESHOLD = 0.15; // 정지 상태
const ACCEL_WALKING_MIN = 0.3; // 걷기 최소
const ACCEL_WALKING_MAX = 2.5; // 걷기 최대
const ACCEL_RUNNING_MIN = 2.0; // 뛰기 최소
const ACCEL_BUFFER_SIZE = 20; // 가속도 히스토리 버퍼 크기 (20초)

// Pedometer (만보계) 상수
const PEDOMETER_CHECK_INTERVAL = 5; // 초 - 걸음 수 체크 간격
const MIN_STEPS_FOR_WALKING = 3; // 최근 5초간 최소 걸음 수 (걷기 판정)

interface CurrentSegment {
    startTime: Date;
    status: 'walking' | 'paused';
    distanceM: number;
    startLocation?: Location.LocationObject;
    pendingStatusChange?: {
        newStatus: 'walking' | 'paused';
        since: Date;
    };
}

interface AccelReading {
    timestamp: number;
    magnitude: number;
    x: number;
    y: number;
    z: number;
}

class MovementTrackingService {
    private isTracking = false;
    private isPaused = false; // 🆕 일시정지 상태
    private currentSegment: CurrentSegment | null = null;
    private segments: MovementSegment[] = [];
    private lastLocation: Location.LocationObject | null = null;
    private locationSubscription: Location.LocationSubscription | null = null;
    private accelSubscription: any = null;

    // 가속도계 데이터 버퍼 (패턴 분석용)
    private accelBuffer: AccelReading[] = [];
    private currentAccelReading: AccelReading | null = null;

    // 추적 시작/종료 시각 (시간 동기화용)
    private trackingStartTime: Date | null = null;
    private trackingEndTime: Date | null = null;

    // 이전 GPS 속도 (null 처리용)
    private lastGpsSpeed: number = 0;
    private lastLocationTime: number = 0;

    // 이전 활동 상태 (GPS 불량 시 상태 유지용)
    private lastActivityType: 'stationary' | 'walking' | 'running' | 'vehicle' = 'walking';

    // Pedometer (만보계) 관련
    private pedometerSubscription: any = null;
    private pedometerAvailable: boolean = false;
    private lastStepCount: number = 0;
    private lastStepTime: number = 0;
    private recentStepCounts: { time: number; steps: number }[] = [];

    /**
     * 추적 시작
     */
    async startTracking(): Promise<void> {
        if (this.isTracking) {
            console.warn('⚠️ 이미 추적 중입니다.');
            return;
        }

        try {
            // 초기화
            this.segments = [];
            this.currentSegment = null;
            this.lastLocation = null;
            this.accelBuffer = [];
            this.currentAccelReading = null;
            this.trackingStartTime = new Date();
            this.trackingEndTime = null;
            this.lastStepCount = 0;
            this.lastStepTime = Date.now();
            this.recentStepCounts = [];

            // GPS 위치 추적 시작
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 1000, // 1초마다
                    distanceInterval: 1, // 1m마다
                },
                this.onLocationUpdate.bind(this)
            );

            // 가속도계 추적 시작
            Accelerometer.setUpdateInterval(1000); // 1초마다
            this.accelSubscription = Accelerometer.addListener((data) => {
                const magnitude = Math.sqrt(
                    data.x * data.x + data.y * data.y + data.z * data.z
                );

                const reading: AccelReading = {
                    timestamp: Date.now(),
                    magnitude,
                    x: data.x,
                    y: data.y,
                    z: data.z,
                };

                this.currentAccelReading = reading;
                this.accelBuffer.push(reading);

                // 버퍼 크기 제한 (최근 20개만 유지)
                if (this.accelBuffer.length > ACCEL_BUFFER_SIZE) {
                    this.accelBuffer.shift();
                }
            });

            // 🆕 Pedometer (만보계) 추적 시작
            this.pedometerAvailable = await Pedometer.isAvailableAsync();
            if (this.pedometerAvailable) {
                this.pedometerSubscription = Pedometer.watchStepCount((result) => {
                    const now = Date.now();
                    const stepDelta = result.steps - this.lastStepCount;

                    if (stepDelta > 0) {
                        this.recentStepCounts.push({ time: now, steps: stepDelta });
                        console.log(`👣 걸음 감지: +${stepDelta} (총 ${result.steps})`);
                    }

                    this.lastStepCount = result.steps;
                    this.lastStepTime = now;

                    // 최근 10초 이내 데이터만 유지
                    this.recentStepCounts = this.recentStepCounts.filter(
                        (r) => now - r.time < 10000
                    );
                });
                console.log('✅ Pedometer 추적 시작');
            } else {
                console.warn('⚠️ Pedometer 사용 불가 - 가속도계만 사용');
            }

            this.isTracking = true;

            // 첫 걸음 구간 시작
            this.startNewSegment('walking');

            console.log('✅ 움직임 추적 시작');
        } catch (error) {
            console.error('❌ 움직임 추적 시작 실패:', error);
            throw error;
        }
    }

    /**
     * 추적 종료
     */
    stopTracking(): void {
        if (!this.isTracking) {
            return;
        }

        // 현재 진행 중인 구간 종료
        if (this.currentSegment) {
            this.finishCurrentSegment();
        }

        // 구독 해제
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        if (this.accelSubscription) {
            this.accelSubscription.remove();
            this.accelSubscription = null;
        }

        // 🆕 Pedometer 구독 해제
        if (this.pedometerSubscription) {
            this.pedometerSubscription.remove();
            this.pedometerSubscription = null;
        }

        this.trackingEndTime = new Date();
        this.isTracking = false;
        this.currentSegment = null; // 명시적으로 null 설정
        console.log('✅ 움직임 추적 종료');
    }

    /**
     * GPS 위치 업데이트 핸들러
     */
    private onLocationUpdate(location: Location.LocationObject): void {
        // GPS 속도 처리 (null 대비)
        let gpsSpeed = location.coords.speed;

        // GPS 속도가 null이면 거리/시간 기반 계산, 실패 시 보행 속도 기본값 사용
        if (gpsSpeed === null || gpsSpeed === undefined) {
            if (this.lastLocation && this.lastLocationTime > 0) {
                const distance = this.calculateDistance(
                    this.lastLocation.coords.latitude,
                    this.lastLocation.coords.longitude,
                    location.coords.latitude,
                    location.coords.longitude
                );
                const timeDelta = (Date.now() - this.lastLocationTime) / 1000; // 초
                if (timeDelta > 0 && timeDelta < 10) { // 10초 이내
                    gpsSpeed = distance / timeDelta; // m/s
                } else {
                    // 시간 차이가 크면 보행 속도 기본값 사용 (차량 속도 유지 안 함)
                    gpsSpeed = this.lastGpsSpeed > SPEED_THRESHOLD_MAX ? 0.8 : this.lastGpsSpeed;
                    console.log(`⏱️ GPS null (시간차 ${timeDelta.toFixed(1)}초) → 기본값 ${(gpsSpeed * 3.6).toFixed(2)} km/h`);
                }
            } else {
                // 이전 위치가 없으면 느린 걷기 속도로 가정 (보수적)
                gpsSpeed = 0.8; // m/s (약 2.9 km/h)
                console.log(`🆕 GPS null (초기) → 기본값 ${(gpsSpeed * 3.6).toFixed(2)} km/h`);
            }
        }

        // 유효한 GPS 속도 저장
        if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0) {
            this.lastGpsSpeed = gpsSpeed;
        }
        this.lastLocationTime = Date.now();

        // 일시정지 중이면 무시
        if (this.isPaused) {
            return;
        }

        if (!this.currentSegment) {
            return;
        }

        // 가속도계 패턴 분석
        const activityType = this.analyzeActivityType(gpsSpeed);
        console.log(`📊 GPS: ${(gpsSpeed * 3.6).toFixed(2)} km/h → ${activityType}`);

        // 하이브리드 판단 (차량은 정지로 취급하여 대기 시간에 포함)
        const isMoving = activityType === 'walking' || activityType === 'running';

        // 거리 계산 (이전 위치가 있고, 걷기/뛰기 상태일 때만)
        // 차량/정지 구간은 거리 누적 제외하여 실제 보행 거리만 추적
        if (this.lastLocation && (activityType === 'walking' || activityType === 'running')) {
            const distance = this.calculateDistance(
                this.lastLocation.coords.latitude,
                this.lastLocation.coords.longitude,
                location.coords.latitude,
                location.coords.longitude
            );
            this.currentSegment.distanceM += distance;
        }

        this.lastLocation = location;

        // 상태 전환 판단 (히스테리시스 적용)
        const desiredStatus = isMoving ? 'walking' : 'paused';

        if (desiredStatus !== this.currentSegment.status) {
            // 상태 변경 필요
            if (!this.currentSegment.pendingStatusChange) {
                // 상태 변경 대기 시작
                this.currentSegment.pendingStatusChange = {
                    newStatus: desiredStatus,
                    since: new Date(),
                };
            } else if (this.currentSegment.pendingStatusChange.newStatus === desiredStatus) {
                // 같은 방향으로 상태 변경 대기 중
                const waitedSeconds = Math.floor(
                    (Date.now() - this.currentSegment.pendingStatusChange.since.getTime()) / 1000
                );

                if (waitedSeconds >= STATE_CHANGE_HYSTERESIS) {
                    // 충분히 대기했으므로 상태 전환
                    this.finishCurrentSegment();
                    this.startNewSegment(desiredStatus);
                }
            } else {
                // 다른 방향으로 바뀜 (노이즈) - 대기 리셋
                this.currentSegment.pendingStatusChange = {
                    newStatus: desiredStatus,
                    since: new Date(),
                };
            }
        } else {
            // 현재 상태 유지 - 대기 취소
            this.currentSegment.pendingStatusChange = undefined;
        }
    }

    /**
     * 새 구간 시작
     */
    private startNewSegment(status: 'walking' | 'paused'): void {
        this.currentSegment = {
            startTime: new Date(),
            status,
            distanceM: 0,
            startLocation: this.lastLocation || undefined,
        };
    }

    /**
     * 현재 구간 종료
     */
    private finishCurrentSegment(): void {
        if (!this.currentSegment) {
            return;
        }

        const endTime = new Date();
        const durationSeconds = Math.floor(
            (endTime.getTime() - this.currentSegment.startTime.getTime()) / 1000
        );

        // 구간이 너무 짧으면 무시 (1초 미만)
        if (durationSeconds < 1) {
            return;
        }

        // walking 구간: 시간 기반 필터링 (거리는 GPS 신호 불량 시 부정확하므로 체크 안 함)
        // 3초 미만의 짧은 walking 구간만 무시 (노이즈 제거)
        if (this.currentSegment.status === 'walking' && durationSeconds < 3) {
            console.log(`⚠️ 구간 무시: walking이지만 ${durationSeconds}초로 너무 짧음 (노이즈)`);
            return;
        }

        // paused 구간도 모두 기록

        const avgSpeed = durationSeconds > 0
            ? this.currentSegment.distanceM / durationSeconds
            : 0;

        const segment: MovementSegment = {
            start_time: this.currentSegment.startTime.toISOString(),
            end_time: endTime.toISOString(),
            distance_m: Math.round(this.currentSegment.distanceM * 100) / 100,
            duration_seconds: durationSeconds,
            avg_speed_ms: Math.round(avgSpeed * 100) / 100,
            status: this.currentSegment.status,
        };

        this.segments.push(segment);

        console.log(`📊 구간 종료: ${segment.status} - ${segment.duration_seconds}초, ${segment.distance_m}m`);
    }

    /**
     * 현재 구간의 지속 시간 계산 (초)
     */
    private getCurrentSegmentDuration(): number {
        if (!this.currentSegment) {
            return 0;
        }
        return Math.floor((Date.now() - this.currentSegment.startTime.getTime()) / 1000);
    }

    /**
     * 활동 유형 분석 (Pedometer 최우선, GPS + 가속도계 보조)
     */
    private analyzeActivityType(gpsSpeed: number): 'stationary' | 'walking' | 'running' | 'vehicle' {
        const hasAccelData = this.currentAccelReading && this.accelBuffer.length >= 5;

        // ===== 0단계: Pedometer로 걸음 수 확인 (최우선) =====
        const recentSteps = this.getRecentStepCount(PEDOMETER_CHECK_INTERVAL);
        const hasRecentSteps = recentSteps >= MIN_STEPS_FOR_WALKING;

        if (hasRecentSteps) {
            // 최근 5초간 3걸음 이상 → 무조건 walking (GPS/가속도계 무시)
            console.log(`👣 Pedometer: 최근 ${PEDOMETER_CHECK_INTERVAL}초간 ${recentSteps}걸음 → walking 확정`);
            this.lastActivityType = 'walking';
            return 'walking';
        }

        // ===== 1단계: GPS로 명확한 경우 먼저 판단 =====

        // 확실한 차량 (18 km/h 이상)
        if (gpsSpeed > SPEED_THRESHOLD_MAX) {
            this.lastActivityType = 'vehicle';
            return 'vehicle';
        }

        // 매우 느림 (0.72 km/h 이하) → 가속도계 우선 판단
        if (gpsSpeed < SPEED_THRESHOLD_MIN) {
            if (hasAccelData) {
                const accelVariance = this.calculateAccelVariance();
                const isPeriodic = this.detectPeriodicPattern();
                const avgAccelMagnitude = this.getAverageAccelMagnitude();

                // 가속도계에 움직임이 감지되면 walking (GPS 신호 불량 가능성)
                if (isPeriodic || accelVariance > ACCEL_STATIONARY_THRESHOLD || avgAccelMagnitude > 0.2) {
                    console.log(`🚶 느린 GPS(${(gpsSpeed * 3.6).toFixed(2)} km/h)지만 가속도계 움직임 감지 → walking`);
                    this.lastActivityType = 'walking';
                    return 'walking';
                }
                // 가속도계도 움직임 없으면 정지
                if (accelVariance < ACCEL_STATIONARY_THRESHOLD && avgAccelMagnitude < 0.15) {
                    console.log(`🛑 GPS + 가속도계 모두 정지 → stationary`);
                    this.lastActivityType = 'stationary';
                    return 'stationary';
                }
            }
            // 가속도계 데이터 없으면: 이전 상태 유지 (GPS 신호 불량 가능성)
            // 단, 이전이 stationary였으면 walking으로 (보수적 판단 방지)
            const fallbackActivity = this.lastActivityType === 'stationary' ? 'walking' : this.lastActivityType;
            console.log(`⚠️ 느린 GPS(${(gpsSpeed * 3.6).toFixed(2)} km/h), 가속도계 없음 → ${fallbackActivity} (이전 상태 유지)`);
            return fallbackActivity === 'vehicle' ? 'walking' : fallbackActivity;
        }

        // ===== 2단계: 보행 속도 범위 (0.72 ~ 18 km/h) =====
        // GPS + 가속도계 혼합 판단

        if (!hasAccelData) {
            // 가속도계 데이터 없으면 GPS 속도만으로 판단
            if (gpsSpeed < 2.0) {
                this.lastActivityType = 'walking';
                return 'walking';      // < 7.2 km/h
            }
            if (gpsSpeed < 4.0) {
                this.lastActivityType = 'running';
                return 'running';      // < 14.4 km/h
            }
            this.lastActivityType = 'vehicle';
            return 'vehicle';                          // >= 14.4 km/h (차량)
        }

        // 가속도계 패턴 분석
        const accelVariance = this.calculateAccelVariance();
        const isPeriodic = this.detectPeriodicPattern();
        const avgAccelMagnitude = this.getAverageAccelMagnitude();

        // 빠른 속도 (4 m/s = 14.4 km/h 이상) → 대부분 차량
        if (gpsSpeed >= 4.0) {
            // 주기적 패턴 + 강한 움직임 → 매우 빠른 뛰기 (드물)
            if (isPeriodic && avgAccelMagnitude > ACCEL_RUNNING_MIN) {
                this.lastActivityType = 'running';
                return 'running';
            }
            // 그 외는 차량
            this.lastActivityType = 'vehicle';
            return 'vehicle';
        }

        // 중간 속도 (2.5 ~ 4 m/s = 9 ~ 14.4 km/h) → 뛰기 또는 느린 차량
        if (gpsSpeed >= 2.5) {
            // 주기적 패턴 있으면 뛰기
            if (isPeriodic && avgAccelMagnitude >= ACCEL_WALKING_MIN) {
                this.lastActivityType = 'running';
                return 'running';
            }
            // 불규칙 진동 → 차량
            if (!isPeriodic && accelVariance > 0.3) {
                this.lastActivityType = 'vehicle';
                return 'vehicle';
            }
            // 애매하면 뛰기
            this.lastActivityType = 'running';
            return 'running';
        }

        // 보행 속도 (0.2 ~ 2.5 m/s = 0.72 ~ 9 km/h)
        // 주기적 패턴 + 강한 움직임 → 뛰기
        if (isPeriodic && avgAccelMagnitude > ACCEL_RUNNING_MIN) {
            this.lastActivityType = 'running';
            return 'running';
        }

        // 주기적 패턴 + 중간 움직임 → 걷기
        if (isPeriodic && avgAccelMagnitude >= ACCEL_WALKING_MIN) {
            this.lastActivityType = 'walking';
            return 'walking';
        }

        // 기본값: GPS 속도 기준
        if (gpsSpeed > 2.0) {
            this.lastActivityType = 'running';
            return 'running';   // > 7.2 km/h
        }
        this.lastActivityType = 'walking';
        return 'walking';
    }

    /**
     * 가속도 분산 계산 (변화량의 표준편차)
     */
    private calculateAccelVariance(): number {
        if (this.accelBuffer.length < 2) {
            return 0;
        }

        const magnitudes = this.accelBuffer.map(r => r.magnitude);
        const mean = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;
        const squaredDiffs = magnitudes.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / magnitudes.length;

        return Math.sqrt(variance); // 표준편차 반환
    }

    /**
     * 주기적 패턴 감지 (걷기/뛰기는 규칙적, 차량은 불규칙)
     */
    private detectPeriodicPattern(): boolean {
        if (this.accelBuffer.length < 10) {
            return false;
        }

        // 최근 10개 데이터의 피크(최댓값) 간격 계산
        const magnitudes = this.accelBuffer.slice(-10).map(r => r.magnitude);
        const peaks: number[] = [];

        for (let i = 1; i < magnitudes.length - 1; i++) {
            const prev = magnitudes[i - 1];
            const curr = magnitudes[i];
            const next = magnitudes[i + 1];

            if (prev !== undefined && curr !== undefined && next !== undefined) {
                if (curr > prev && curr > next) {
                    peaks.push(i);
                }
            }
        }

        // 피크가 2개 이상 있고, 간격이 일정하면 주기적
        if (peaks.length >= 2) {
            const intervals: number[] = [];
            for (let i = 1; i < peaks.length; i++) {
                const curr = peaks[i];
                const prev = peaks[i - 1];
                if (curr !== undefined && prev !== undefined) {
                    intervals.push(curr - prev);
                }
            }

            // 간격의 표준편차가 작으면 규칙적
            const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
            const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;

            return Math.sqrt(variance) < 1.5; // 간격 차이가 1.5초 이내면 규칙적
        }

        return false;
    }

    /**
     * 평균 가속도 크기 계산
     */
    private getAverageAccelMagnitude(): number {
        if (this.accelBuffer.length === 0) {
            return 0;
        }

        const sum = this.accelBuffer.reduce((acc, reading) => acc + reading.magnitude, 0);
        return sum / this.accelBuffer.length;
    }

    /**
     * 🆕 최근 N초간 걸음 수 조회
     */
    private getRecentStepCount(seconds: number): number {
        if (!this.pedometerAvailable || this.recentStepCounts.length === 0) {
            return 0;
        }

        const cutoffTime = Date.now() - seconds * 1000;
        const recentSteps = this.recentStepCounts
            .filter((r) => r.time >= cutoffTime)
            .reduce((sum, r) => sum + r.steps, 0);

        return recentSteps;
    }

    /**
     * 두 좌표 간 거리 계산 (Haversine formula)
     */
    private calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371e3; // 지구 반지름 (m)
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * 현재 추적 데이터 조회
     */
    getCurrentData(): {
        activeWalkingTime: number;
        pausedTime: number;
        realSpeed: number;
        pauseCount: number;
        segments: MovementSegment[];
    } {
        // 이미 종료된 구간만 사용 (중복 방지)
        const allSegments = [...this.segments];

        const walkingSegments = allSegments.filter(s => s.status === 'walking');
        const pausedSegments = allSegments.filter(s => s.status === 'paused');

        let activeWalkingTime = walkingSegments.reduce(
            (sum, s) => sum + s.duration_seconds,
            0
        );
        let pausedTime = pausedSegments.reduce(
            (sum, s) => sum + s.duration_seconds,
            0
        );
        const totalDistance = walkingSegments.reduce(
            (sum, s) => sum + s.distance_m,
            0
        );

        // 시간 동기화: 실제 총 시간과 구간 합계 차이를 마지막 상태에 추가
        if (this.trackingStartTime && this.trackingEndTime) {
            const actualTotalSeconds = Math.floor(
                (this.trackingEndTime.getTime() - this.trackingStartTime.getTime()) / 1000
            );
            const measuredTotalSeconds = activeWalkingTime + pausedTime;
            const lostSeconds = actualTotalSeconds - measuredTotalSeconds;

            if (lostSeconds > 0) {
                // 손실 시간을 마지막 구간의 상태에 추가
                if (allSegments.length > 0) {
                    const lastSegment = allSegments[allSegments.length - 1];
                    if (lastSegment && lastSegment.status === 'walking') {
                        activeWalkingTime += lostSeconds;
                        console.log(`🔄 시간 동기화: ${lostSeconds}초 손실 → 걷기에 추가`);
                    } else {
                        pausedTime += lostSeconds;
                        console.log(`🔄 시간 동기화: ${lostSeconds}초 손실 → 정지에 추가`);
                    }
                } else {
                    // 구간이 없으면 걷기로 간주
                    activeWalkingTime += lostSeconds;
                    console.log(`🔄 시간 동기화: ${lostSeconds}초 손실 → 걷기에 추가 (구간 없음)`);
                }
                console.log(`   측정: ${measuredTotalSeconds}초, 실제: ${actualTotalSeconds}초, 보정 후: ${activeWalkingTime + pausedTime}초`);
            } else if (lostSeconds < 0) {
                console.warn(`⚠️ 측정 시간이 실제보다 ${-lostSeconds}초 더 많음 (비정상)`);
            }
        }

        const realSpeed = activeWalkingTime > 0
            ? totalDistance / activeWalkingTime
            : 0;

        return {
            activeWalkingTime,
            pausedTime,
            realSpeed: Math.round(realSpeed * 100) / 100,
            pauseCount: pausedSegments.length,
            segments: allSegments,
        };
    }

    /**
     * 실제 걷는 시간 조회 (초)
     */
    getActiveWalkingTime(): number {
        return this.getCurrentData().activeWalkingTime;
    }

    /**
     * 정지 시간 조회 (초)
     */
    getPausedTime(): number {
        return this.getCurrentData().pausedTime;
    }

    /**
     * 실제 보행속도 조회 (m/s)
     */
    getRealWalkingSpeed(): number {
        return this.getCurrentData().realSpeed;
    }

    /**
     * 추적 중 여부
     */
    getIsTracking(): boolean {
        return this.isTracking;
    }

    /**
     * 🆕 추적 일시정지 (대중교통 탑승 시)
     */
    pauseTracking(): void {
        if (!this.isTracking) {
            console.warn('⚠️ 추적 중이 아닙니다.');
            return;
        }

        if (this.isPaused) {
            console.warn('⚠️ 이미 일시정지 상태입니다.');
            return;
        }

        // 현재 구간 종료
        if (this.currentSegment) {
            this.finishCurrentSegment();
        }

        this.isPaused = true;
        console.log('⏸️ 움직임 추적 일시정지 (대중교통 탑승)');
    }

    /**
     * 🆕 추적 재개 (도보 구간 시작 시)
     */
    resumeTracking(): void {
        if (!this.isTracking) {
            console.warn('⚠️ 추적 중이 아닙니다.');
            return;
        }

        if (!this.isPaused) {
            console.warn('⚠️ 일시정지 상태가 아닙니다.');
            return;
        }

        this.isPaused = false;

        // 새로운 걷기 구간 시작
        this.startNewSegment('walking');

        console.log('▶️ 움직임 추적 재개 (도보 구간 시작)');
    }

    /**
     * 🆕 일시정지 상태 확인
     */
    getIsPaused(): boolean {
        return this.isPaused;
    }
}

// 싱글톤 인스턴스 내보내기
export const movementTrackingService = new MovementTrackingService();
