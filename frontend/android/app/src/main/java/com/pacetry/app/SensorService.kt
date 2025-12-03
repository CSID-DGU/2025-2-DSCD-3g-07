package com.pacetry.app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.sqrt

/**
 * 통합 센서 백그라운드 서비스
 * 
 * 앱이 백그라운드에 있을 때도 GPS, 가속도계, 만보계 데이터를 수집하고
 * walking/paused 상태를 실시간으로 판정합니다.
 * 
 * 상태 판정 기준:
 * - walking: 최근 3초간 1보 이상 걸음 감지
 * - paused: 그 외 (정지, 대중교통 이용 등)
 * 
 * 거리 누적 조건:
 * - walking 상태 + 순간 GPS 속도 < 13km/h 일 때만
 * 
 * GPS: Google Fused Location Provider 사용 (공식 권장)
 */
class SensorService : Service(), SensorEventListener {

    companion object {
        private const val TAG = "SensorService"
        private const val NOTIFICATION_ID = 12345
        private const val CHANNEL_ID = "sensor_service_channel"
        
        // ===== 상태 판정 상수 =====
        private const val WALKING_SPEED_MAX = 3.6f    // m/s (13 km/h) - 거리 누적 상한
        private const val MIN_STEPS_FOR_WALKING = 1   // 최근 3초간 최소 걸음 수
        private const val STEP_CHECK_INTERVAL = 3000L // 3초
        
        // 수집된 데이터 저장 (스레드 안전)
        val accelerometerData = ConcurrentLinkedQueue<AccelData>()
        val stepData = ConcurrentLinkedQueue<StepData>()
        val locationData = ConcurrentLinkedQueue<LocationData>()
        val movementSegments = ConcurrentLinkedQueue<MovementSegment>()
        
        // 최대 저장 개수 (메모리 관리)
        private const val MAX_DATA_SIZE = 1000
        private const val MAX_SEGMENT_SIZE = 500
        
        // 서비스 상태
        var isRunning = false
            private set
        
        // 마지막 걸음 수 (델타 계산용)
        private var lastStepCount = 0
        private var initialStepCount = -1
        
        // 추적 통계 (앱에서 조회용)
        var totalWalkingTimeMs = 0L
            private set
        var totalPausedTimeMs = 0L
            private set
        var totalDistanceM = 0.0
            private set
        
        fun resetStats() {
            totalWalkingTimeMs = 0L
            totalPausedTimeMs = 0L
            totalDistanceM = 0.0
            movementSegments.clear()
        }
    }
    
    // ===== 데이터 클래스 =====
    data class AccelData(
        val timestamp: Long,
        val x: Float,
        val y: Float,
        val z: Float,
        val magnitude: Float
    )
    
    data class StepData(
        val timestamp: Long,
        val steps: Int,
        val deltaSteps: Int
    )
    
    data class LocationData(
        val timestamp: Long,
        val latitude: Double,
        val longitude: Double,
        val speed: Float,
        val accuracy: Float
    )
    
    data class MovementSegment(
        val startTime: Long,
        val endTime: Long,
        val status: String,  // "walking", "paused"
        val distanceM: Double,
        val durationMs: Long
    )
    
    // ===== 센서 관련 =====
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var stepCounter: Sensor? = null
    private var stepDetector: Sensor? = null
    
    // ===== Fused Location Provider (Google Play Services) =====
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationRequest: LocationRequest
    private lateinit var locationCallback: LocationCallback
    private var lastLocation: Location? = null
    private var lastLocationTime: Long = 0
    
    // ===== 상태 판정 관련 =====
    private var currentStatus: String = "walking"
    private var currentSegmentStartTime: Long = 0
    private var currentSegmentDistance: Double = 0.0
    private var lastGpsSpeed: Float = 0f
    
    // ===== 최근 걸음 수 추적 =====
    private val recentSteps = mutableListOf<Pair<Long, Int>>()  // (timestamp, deltaSteps)
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "SensorService onCreate")
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        
        // Fused Location Provider 초기화
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        // 위치 요청 설정 (1초 간격, 고정밀도)
        locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(500L)  // 최소 500ms 간격
            .setMinUpdateDistanceMeters(1f)    // 최소 1m 이동
            .setWaitForAccurateLocation(false) // 즉시 업데이트 시작
            .build()
        
        // 위치 콜백 설정
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    handleLocationUpdate(location)
                }
            }
            
            override fun onLocationAvailability(availability: LocationAvailability) {
                Log.d(TAG, "Location availability: ${availability.isLocationAvailable}")
            }
        }
        
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "SensorService onStartCommand")
        
        // 통계 초기화
        resetStats()
        
        // Foreground Service 시작 (Android 14+ 대응)
        val notification = createNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+: foregroundServiceType을 명시해야 함
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10-13: foregroundServiceType 지원
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            // Android 9 이하
            startForeground(NOTIFICATION_ID, notification)
        }
        
        // 센서 리스너 등록
        registerSensors()
        
        // Fused Location 업데이트 시작
        startLocationUpdates()
        
        // 현재 구간 시작
        currentSegmentStartTime = System.currentTimeMillis()
        currentStatus = "walking"
        currentSegmentDistance = 0.0
        
        isRunning = true
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "SensorService onDestroy")
        
        // 현재 구간 종료
        finishCurrentSegment()
        
        // 센서 리스너 해제
        sensorManager.unregisterListener(this)
        
        // 위치 업데이트 중지
        stopLocationUpdates()
        
        isRunning = false
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "센서 추적 서비스",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "보행 추적을 위한 센서 데이터를 수집합니다."
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PaceTry 경로 안내 중")
            .setContentText("보행 속도를 측정하고 있습니다")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
    
    private fun registerSensors() {
        // 가속도계 등록
        accelerometer?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_NORMAL,
                SensorManager.SENSOR_DELAY_UI  // 배치 지연 시간 (배터리 절약)
            )
            Log.d(TAG, "Accelerometer registered")
        } ?: Log.w(TAG, "Accelerometer not available")
        
        // Step Counter 등록 (공식 문서: 배터리 절약을 위해 배치 모드 사용 권장)
        stepCounter?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_NORMAL,
                5000000  // 5초 배치 (마이크로초 단위)
            )
            Log.d(TAG, "Step Counter registered with 5s batch")
        } ?: Log.w(TAG, "Step Counter not available")
        
        // Step Detector 등록 (Step Counter 없는 기기용 fallback)
        stepDetector?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_NORMAL
            )
            Log.d(TAG, "Step Detector registered")
        } ?: Log.w(TAG, "Step Detector not available")
    }
    
    private fun startLocationUpdates() {
        // 위치 권한 확인
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
            != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission not granted")
            return
        }
        
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            Log.d(TAG, "Fused Location updates started (High Accuracy, 1s interval)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start location updates", e)
        }
    }
    
    private fun stopLocationUpdates() {
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            Log.d(TAG, "Location updates stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop location updates", e)
        }
    }
    
    // ===== SensorEventListener =====
    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> handleAccelerometer(event)
            Sensor.TYPE_STEP_COUNTER -> handleStepCounter(event)
            Sensor.TYPE_STEP_DETECTOR -> handleStepDetector(event)
        }
    }
    
    private fun handleAccelerometer(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val magnitude = sqrt(x * x + y * y + z * z)
        
        val data = AccelData(
            timestamp = System.currentTimeMillis(),
            x = x,
            y = y,
            z = z,
            magnitude = magnitude
        )
        
        accelerometerData.add(data)
        
        // 메모리 관리
        while (accelerometerData.size > MAX_DATA_SIZE) {
            accelerometerData.poll()
        }
    }
    
    private fun handleStepCounter(event: SensorEvent) {
        val totalSteps = event.values[0].toInt()
        val now = System.currentTimeMillis()
        
        // 초기값 설정
        if (initialStepCount < 0) {
            initialStepCount = totalSteps
            lastStepCount = totalSteps
        }
        
        val deltaSteps = totalSteps - lastStepCount
        
        if (deltaSteps > 0) {
            val data = StepData(
                timestamp = now,
                steps = totalSteps - initialStepCount,
                deltaSteps = deltaSteps
            )
            
            stepData.add(data)
            lastStepCount = totalSteps
            
            // 최근 걸음 기록 (상태 판정용)
            recentSteps.add(Pair(now, deltaSteps))
            
            // 10초 이전 데이터 제거
            recentSteps.removeAll { now - it.first > 10000 }
            
            Log.d(TAG, "Steps: +$deltaSteps (total: ${data.steps})")
            
            // 메모리 관리
            while (stepData.size > MAX_DATA_SIZE) {
                stepData.poll()
            }
        }
    }
    
    private fun handleStepDetector(event: SensorEvent) {
        // Step Counter가 없는 기기에서 fallback
        if (stepCounter == null) {
            val now = System.currentTimeMillis()
            val data = StepData(
                timestamp = now,
                steps = stepData.size + 1,
                deltaSteps = 1
            )
            stepData.add(data)
            recentSteps.add(Pair(now, 1))
            recentSteps.removeAll { now - it.first > 10000 }
            
            while (stepData.size > MAX_DATA_SIZE) {
                stepData.poll()
            }
        }
    }
    
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // 로깅만
    }
    
    // ===== Fused Location Callback =====
    private fun handleLocationUpdate(location: Location) {
        val now = System.currentTimeMillis()
        
        // GPS 속도 가져오기 (Fused Location은 보통 속도 제공)
        var speed = if (location.hasSpeed()) location.speed else -1f
        
        // 속도가 없으면 거리/시간으로 계산
        if (speed < 0 && lastLocation != null && lastLocationTime > 0) {
            val distance = lastLocation!!.distanceTo(location)
            val timeDelta = (now - lastLocationTime) / 1000f
            if (timeDelta > 0 && timeDelta < 30) {
                speed = distance / timeDelta
            } else {
                speed = 0.8f  // 기본값
            }
        }
        
        if (speed < 0) speed = 0.8f
        
        // 위치 데이터 저장
        val locData = LocationData(
            timestamp = now,
            latitude = location.latitude,
            longitude = location.longitude,
            speed = speed,
            accuracy = location.accuracy
        )
        locationData.add(locData)
        
        // 메모리 관리
        while (locationData.size > MAX_DATA_SIZE) {
            locationData.poll()
        }
        
        // 상태 판정 (Step Counter 기반)
        lastGpsSpeed = speed
        analyzeAndUpdateStatus(now)
        
        // GPS 거리 계산 (보조용 - 실제 속도 계산은 TMap 거리 사용)
        // walking 상태 + 속도 < 13km/h 일 때만 누적
        if (lastLocation != null && currentStatus == "walking" && speed < WALKING_SPEED_MAX) {
            val distance = lastLocation!!.distanceTo(location)
            // 정확도가 너무 낮은 위치는 무시 (50m 이상 오차)
            if (location.accuracy < 50) {
                currentSegmentDistance += distance
                totalDistanceM += distance
            }
        }
        
        lastLocation = location
        lastLocationTime = now
    }
    
    // ===== 상태 판정 로직 (Step Counter 기반 단순화) =====
    private fun analyzeAndUpdateStatus(now: Long) {
        // 최근 3초간 걸음 수 확인
        val cutoffTime = now - STEP_CHECK_INTERVAL
        val recentStepCount = recentSteps.filter { it.first >= cutoffTime }.sumOf { it.second }
        
        // 1보 이상 → walking, 아니면 → paused
        val newStatus = if (recentStepCount >= MIN_STEPS_FOR_WALKING) "walking" else "paused"
        
        // 상태 변경 시 세그먼트 종료
        if (newStatus != currentStatus) {
            finishCurrentSegment()
            currentStatus = newStatus
            currentSegmentStartTime = now
            currentSegmentDistance = 0.0
            
            Log.d(TAG, "Status changed to: $currentStatus (recent steps: $recentStepCount)")
        }
    }
    
    private fun finishCurrentSegment() {
        val now = System.currentTimeMillis()
        val durationMs = now - currentSegmentStartTime
        
        if (durationMs < 1000) return  // 1초 미만 무시
        
        val segment = MovementSegment(
            startTime = currentSegmentStartTime,
            endTime = now,
            status = currentStatus,
            distanceM = currentSegmentDistance,
            durationMs = durationMs
        )
        
        movementSegments.add(segment)
        
        // 통계 업데이트
        when (currentStatus) {
            "walking" -> totalWalkingTimeMs += durationMs
            "paused" -> totalPausedTimeMs += durationMs
        }
        
        Log.d(TAG, "Segment finished: $currentStatus, ${durationMs}ms, ${currentSegmentDistance}m")
        
        // 메모리 관리
        while (movementSegments.size > MAX_SEGMENT_SIZE) {
            movementSegments.poll()
        }
    }
}
