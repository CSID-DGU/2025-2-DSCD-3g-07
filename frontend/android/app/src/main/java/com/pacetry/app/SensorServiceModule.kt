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
 * 센서 서비스 React Native 모듈
 * 
 * JavaScript에서 백그라운드 센서 서비스를 제어할 수 있게 합니다.
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
                promise.reject("PERMISSION_DENIED", "필요한 권한이 없습니다. ACTIVITY_RECOGNITION 권한을 허용해주세요.")
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
        // Step Counter, Step Detector 센서 접근에 필요함
        // 가속도계(TYPE_ACCELEROMETER)는 별도 권한 불필요
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
        
        // 참고: BODY_SENSORS/BODY_SENSORS_BACKGROUND는 심박수, 체온 등 생체신호 센서용
        // 가속도계, Step Counter에는 필요 없음
        
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
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_FAILED", e.message)
        }
    }

    /**
     * 배터리 최적화 제외 여부 확인
     * 일부 제조사에서 백그라운드 서비스가 종료되는 것을 방지하기 위해 필요
     */
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                val packageName = reactApplicationContext.packageName
                promise.resolve(powerManager.isIgnoringBatteryOptimizations(packageName))
            } else {
                // Android 6.0 미만에서는 배터리 최적화가 없음
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check battery optimization", e)
            promise.reject("CHECK_FAILED", e.message)
        }
    }

    /**
     * 배터리 최적화 제외 설정 화면 열기
     * 사용자가 직접 배터리 최적화 제외를 설정하도록 안내
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
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
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check sensor availability", e)
            promise.reject("CHECK_FAILED", e.message)
        }
    }
}
