package com.pacetry.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.sqrt

/**
 * 센서 백그라운드 서비스
 * 
 * 앱이 백그라운드에 있을 때도 가속도계와 만보계 데이터를 수집합니다.
 * Foreground Service로 실행되어 Android의 백그라운드 제한을 우회합니다.
 */
class SensorService : Service(), SensorEventListener {

    companion object {
        private const val TAG = "SensorService"
        private const val NOTIFICATION_ID = 12345
        private const val CHANNEL_ID = "sensor_service_channel"
        
        // 수집된 데이터 저장 (스레드 안전)
        val accelerometerData = ConcurrentLinkedQueue<AccelData>()
        val stepData = ConcurrentLinkedQueue<StepData>()
        
        // 최대 저장 개수 (메모리 관리)
        private const val MAX_DATA_SIZE = 1000
        
        // 서비스 상태
        var isRunning = false
            private set
        
        // 마지막 걸음 수 (델타 계산용)
        private var lastStepCount = 0
        private var initialStepCount = -1
    }
    
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
    
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var stepCounter: Sensor? = null
    private var stepDetector: Sensor? = null
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "SensorService onCreate")
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "SensorService onStartCommand")
        
        // Foreground Service 시작
        startForeground(NOTIFICATION_ID, createNotification())
        
        // 센서 리스너 등록
        registerSensors()
        
        isRunning = true
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "SensorService onDestroy")
        
        // 센서 리스너 해제
        sensorManager.unregisterListener(this)
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
        // 가속도계 등록 (1초 간격)
        accelerometer?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_NORMAL // ~200ms
            )
            Log.d(TAG, "Accelerometer registered")
        } ?: Log.w(TAG, "Accelerometer not available")
        
        // Step Counter 등록 (걸음 수 누적)
        stepCounter?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_NORMAL
            )
            Log.d(TAG, "Step Counter registered")
        } ?: Log.w(TAG, "Step Counter not available")
        
        // Step Detector 등록 (걸음 감지 이벤트)
        stepDetector?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_NORMAL
            )
            Log.d(TAG, "Step Detector registered")
        } ?: Log.w(TAG, "Step Detector not available")
    }
    
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
        
        // 메모리 관리: 오래된 데이터 제거
        while (accelerometerData.size > MAX_DATA_SIZE) {
            accelerometerData.poll()
        }
    }
    
    private fun handleStepCounter(event: SensorEvent) {
        val totalSteps = event.values[0].toInt()
        
        // 초기값 설정
        if (initialStepCount < 0) {
            initialStepCount = totalSteps
            lastStepCount = totalSteps
        }
        
        val deltaSteps = totalSteps - lastStepCount
        
        if (deltaSteps > 0) {
            val data = StepData(
                timestamp = System.currentTimeMillis(),
                steps = totalSteps - initialStepCount,
                deltaSteps = deltaSteps
            )
            
            stepData.add(data)
            lastStepCount = totalSteps
            
            Log.d(TAG, "Steps: +$deltaSteps (total: ${data.steps})")
            
            // 메모리 관리
            while (stepData.size > MAX_DATA_SIZE) {
                stepData.poll()
            }
        }
    }
    
    private fun handleStepDetector(event: SensorEvent) {
        // Step Detector는 한 걸음마다 이벤트 발생
        // Step Counter가 없는 기기에서 fallback으로 사용
        if (stepCounter == null) {
            val data = StepData(
                timestamp = System.currentTimeMillis(),
                steps = stepData.size + 1,
                deltaSteps = 1
            )
            stepData.add(data)
            
            while (stepData.size > MAX_DATA_SIZE) {
                stepData.poll()
            }
        }
    }
    
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // 센서 정확도 변경 로깅
        val sensorName = sensor?.name ?: "Unknown"
        val accuracyStr = when (accuracy) {
            SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> "HIGH"
            SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "MEDIUM"
            SensorManager.SENSOR_STATUS_ACCURACY_LOW -> "LOW"
            SensorManager.SENSOR_STATUS_UNRELIABLE -> "UNRELIABLE"
            else -> "UNKNOWN"
        }
        Log.d(TAG, "Sensor accuracy changed: $sensorName -> $accuracyStr")
    }
}
