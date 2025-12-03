package com.pacetry.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

/**
 * 통합 센서 서비스 React Native 모듈
 * 
 * JavaScript에서 백그라운드 센서 서비스를 제어할 수 있게 합니다.
 * GPS + 가속도계 + Pedometer를 통합 관리하고 상태 판정 결과를 제공합니다.
 */
class SensorServiceModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SensorServiceModule"
        const val NAME = "SensorServiceModule"
    }

    override fun getName(): String = NAME

    /**
     * 센서 서비스 시작
     */
    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val context = reactApplicationContext
            
            // 권한 체크
            if (!hasRequiredPermissions()) {
                promise.reject("PERMISSION_DENIED", "필요한 권한이 없습니다. ACTIVITY_RECOGNITION 및 위치 권한을 허용해주세요.")
                return
            }
            
            val intent = Intent(context, SensorService::class.java)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            
            Log.d(TAG, "SensorService started")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start SensorService", e)
            promise.reject("START_FAILED", e.message)
        }
    }

    /**
     * 센서 서비스 중지
     */
    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, SensorService::class.java)
            context.stopService(intent)
            
            Log.d(TAG, "SensorService stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop SensorService", e)
            promise.reject("STOP_FAILED", e.message)
        }
    }

    /**
     * 서비스 실행 상태 확인
     */
    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(SensorService.isRunning)
    }

    /**
     * 수집된 가속도계 데이터 가져오기 (및 클리어)
     */
    @ReactMethod
    fun getAccelerometerData(promise: Promise) {
        try {
            val dataArray = WritableNativeArray()
            
            while (SensorService.accelerometerData.isNotEmpty()) {
                val data = SensorService.accelerometerData.poll() ?: break
                
                val map = WritableNativeMap().apply {
                    putDouble("timestamp", data.timestamp.toDouble())
                    putDouble("x", data.x.toDouble())
                    putDouble("y", data.y.toDouble())
                    putDouble("z", data.z.toDouble())
                    putDouble("magnitude", data.magnitude.toDouble())
                }
                dataArray.pushMap(map)
            }
            
            promise.resolve(dataArray)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get accelerometer data", e)
            promise.reject("GET_DATA_FAILED", e.message)
        }
    }

    /**
     * 수집된 걸음 수 데이터 가져오기 (및 클리어)
     */
    @ReactMethod
    fun getStepData(promise: Promise) {
        try {
            val dataArray = WritableNativeArray()
            
            while (SensorService.stepData.isNotEmpty()) {
                val data = SensorService.stepData.poll() ?: break
                
                val map = WritableNativeMap().apply {
                    putDouble("timestamp", data.timestamp.toDouble())
                    putInt("steps", data.steps)
                    putInt("deltaSteps", data.deltaSteps)
                }
                dataArray.pushMap(map)
            }
            
            promise.resolve(dataArray)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get step data", e)
            promise.reject("GET_DATA_FAILED", e.message)
        }
    }

    /**
     * 수집된 위치 데이터 가져오기 (및 클리어)
     */
    @ReactMethod
    fun getLocationData(promise: Promise) {
        try {
            val dataArray = WritableNativeArray()
            
            while (SensorService.locationData.isNotEmpty()) {
                val data = SensorService.locationData.poll() ?: break
                
                val map = WritableNativeMap().apply {
                    putDouble("timestamp", data.timestamp.toDouble())
                    putDouble("latitude", data.latitude)
                    putDouble("longitude", data.longitude)
                    putDouble("speed", data.speed.toDouble())
                    putDouble("accuracy", data.accuracy.toDouble())
                }
                dataArray.pushMap(map)
            }
            
            promise.resolve(dataArray)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get location data", e)
            promise.reject("GET_DATA_FAILED", e.message)
        }
    }

    /**
     * 🆕 움직임 구간 데이터 가져오기 (백그라운드에서 판정된 walking/paused 구간)
     */
    @ReactMethod
    fun getMovementSegments(promise: Promise) {
        try {
            val dataArray = WritableNativeArray()
            
            for (segment in SensorService.movementSegments) {
                val map = WritableNativeMap().apply {
                    putDouble("startTime", segment.startTime.toDouble())
                    putDouble("endTime", segment.endTime.toDouble())
                    putString("status", segment.status)
                    putDouble("distanceM", segment.distanceM)
                    putDouble("durationMs", segment.durationMs.toDouble())
                }
                dataArray.pushMap(map)
            }
            
            promise.resolve(dataArray)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get movement segments", e)
            promise.reject("GET_DATA_FAILED", e.message)
        }
    }

    /**
     * 🆕 추적 통계 조회 (실시간)
     */
    @ReactMethod
    fun getTrackingStats(promise: Promise) {
        try {
            val result = WritableNativeMap().apply {
                putDouble("totalWalkingTimeMs", SensorService.totalWalkingTimeMs.toDouble())
                putDouble("totalPausedTimeMs", SensorService.totalPausedTimeMs.toDouble())
                putDouble("totalDistanceM", SensorService.totalDistanceM)
                putInt("segmentCount", SensorService.movementSegments.size)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get tracking stats", e)
            promise.reject("GET_STATS_FAILED", e.message)
        }
    }

    /**
     * 🆕 통계 및 구간 데이터 초기화
     */
    @ReactMethod
    fun resetStats(promise: Promise) {
        try {
            SensorService.resetStats()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to reset stats", e)
            promise.reject("RESET_FAILED", e.message)
        }
    }

    /**
     * 최근 N초간 걸음 수 조회
     */
    @ReactMethod
    fun getRecentStepCount(seconds: Int, promise: Promise) {
        try {
            val cutoffTime = System.currentTimeMillis() - (seconds * 1000)
            var totalSteps = 0
            
            for (data in SensorService.stepData) {
                if (data.timestamp >= cutoffTime) {
                    totalSteps += data.deltaSteps
                }
            }
            
            promise.resolve(totalSteps)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get recent step count", e)
            promise.reject("GET_STEPS_FAILED", e.message)
        }
    }

    /**
     * 최근 가속도 평균 크기 조회
     */
    @ReactMethod
    fun getRecentAccelMagnitude(seconds: Int, promise: Promise) {
        try {
            val cutoffTime = System.currentTimeMillis() - (seconds * 1000)
            var sum = 0.0
            var count = 0
            
            for (data in SensorService.accelerometerData) {
                if (data.timestamp >= cutoffTime) {
                    sum += data.magnitude
                    count++
                }
            }
            
            val avg = if (count > 0) sum / count else 0.0
            promise.resolve(avg)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get recent accel magnitude", e)
            promise.reject("GET_ACCEL_FAILED", e.message)
        }
    }

    /**
     * 필요한 권한이 있는지 확인
     */
    @ReactMethod
    fun hasPermissions(promise: Promise) {
        promise.resolve(hasRequiredPermissions())
    }

    private fun hasRequiredPermissions(): Boolean {
        val context = reactApplicationContext
        
        // Android 10+ (API 29+)에서 ACTIVITY_RECOGNITION 필요
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACTIVITY_RECOGNITION
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                Log.w(TAG, "ACTIVITY_RECOGNITION 권한 없음")
                return false
            }
        }
        
        // 위치 권한 확인
        if (ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "ACCESS_FINE_LOCATION 권한 없음")
            return false
        }
        
        return true
    }

    /**
     * 데이터 클리어
     */
    @ReactMethod
    fun clearData(promise: Promise) {
        try {
            SensorService.accelerometerData.clear()
            SensorService.stepData.clear()
            SensorService.locationData.clear()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_FAILED", e.message)
        }
    }

    /**
     * 배터리 최적화 제외 여부 확인
     */
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                val packageName = reactApplicationContext.packageName
                promise.resolve(powerManager.isIgnoringBatteryOptimizations(packageName))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check battery optimization", e)
            promise.reject("CHECK_FAILED", e.message)
        }
    }

    /**
     * 배터리 최적화 제외 설정 화면 열기
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val packageName = reactApplicationContext.packageName
                
                // 먼저 직접 요청 시도 (시스템 다이얼로그)
                try {
                    val directIntent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactApplicationContext.startActivity(directIntent)
                    Log.d(TAG, "Direct battery optimization request started")
                    promise.resolve(true)
                    return
                } catch (e: Exception) {
                    Log.w(TAG, "Direct request failed, trying app settings: ${e.message}")
                }
                
                // 실패 시 앱별 배터리 설정 화면으로 이동
                try {
                    val settingsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:$packageName")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactApplicationContext.startActivity(settingsIntent)
                    Log.d(TAG, "Opened app settings for battery configuration")
                    promise.resolve(true)
                    return
                } catch (e2: Exception) {
                    Log.e(TAG, "Failed to open app settings: ${e2.message}")
                }
                
                // 최종 fallback: 배터리 최적화 전체 목록
                val listIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(listIntent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request battery optimization exemption", e)
            promise.reject("REQUEST_FAILED", e.message)
        }
    }

    /**
     * 센서 사용 가능 여부 확인
     */
    @ReactMethod
    fun checkSensorAvailability(promise: Promise) {
        try {
            val context = reactApplicationContext
            val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as android.hardware.SensorManager
            
            val result = WritableNativeMap().apply {
                putBoolean("accelerometer", sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ACCELEROMETER) != null)
                putBoolean("stepCounter", sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_COUNTER) != null)
                putBoolean("stepDetector", sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_DETECTOR) != null)
                putBoolean("gps", context.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_LOCATION_GPS))
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check sensor availability", e)
            promise.reject("CHECK_FAILED", e.message)
        }
    }
}
