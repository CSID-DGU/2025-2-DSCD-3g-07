package com.pacetry.app

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class HealthConnectModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "HealthConnectModule"
    }

    /**
     * Health Connect 앱이 설치되어 있는지 확인
     */
    @ReactMethod
    fun isHealthConnectInstalled(promise: Promise) {
        try {
            val packageName = "com.google.android.apps.healthdata"
            val packageManager = reactContext.packageManager
            
            try {
                packageManager.getPackageInfo(packageName, 0)
                Log.d("HealthConnect", "Health Connect is installed")
                promise.resolve(true)
            } catch (e: PackageManager.NameNotFoundException) {
                Log.d("HealthConnect", "Health Connect is NOT installed")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e("HealthConnect", "Error checking Health Connect installation", e)
            promise.reject("ERROR", "Failed to check Health Connect installation", e)
        }
    }

    /**
     * Health Connect 설정 화면 열기
     */
    @ReactMethod
    fun openHealthConnectSettings(promise: Promise) {
        try {
            Log.d("HealthConnect", "Attempting to open Health Connect settings...")
            
            // Health Connect 권한 관리 화면 Intent
            val intent = Intent("androidx.health.ACTION_MANAGE_HEALTH_PERMISSIONS")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            // Health Connect 앱 패키지 지정
            intent.setPackage("com.google.android.apps.healthdata")
            
            // 우리 앱의 권한 페이지로 직접 이동
            intent.putExtra("android.provider.extra.PACKAGE_NAME", reactContext.packageName)
            
            // Intent가 처리 가능한지 확인
            val packageManager = reactContext.packageManager
            val resolveInfo = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
            
            if (resolveInfo != null) {
                val activity = reactContext.currentActivity
                if (activity != null) {
                    activity.startActivity(intent)
                } else {
                    reactContext.startActivity(intent)
                }
                Log.d("HealthConnect", "Successfully opened Health Connect settings")
                promise.resolve(true)
            } else {
                Log.w("HealthConnect", "Health Connect settings Intent cannot be resolved")
                // Intent를 처리할 수 없으면 Play Store로
                openPlayStore(promise)
            }
        } catch (e: Exception) {
            Log.e("HealthConnect", "Failed to open Health Connect settings", e)
            // 실패하면 Play Store로
            openPlayStore(promise)
        }
    }

    /**
     * Play Store에서 Health Connect 열기
     */
    private fun openPlayStore(promise: Promise) {
        try {
            Log.d("HealthConnect", "Opening Play Store for Health Connect...")
            
            val playStoreIntent = Intent(Intent.ACTION_VIEW)
            playStoreIntent.data = Uri.parse("market://details?id=com.google.android.apps.healthdata")
            playStoreIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            val activity = reactContext.currentActivity
            if (activity != null) {
                activity.startActivity(playStoreIntent)
            } else {
                reactContext.startActivity(playStoreIntent)
            }
            
            Log.d("HealthConnect", "Opened Play Store")
            promise.resolve(false)
        } catch (playStoreError: Exception) {
            Log.e("HealthConnect", "Failed to open Play Store", playStoreError)
            promise.reject("ERROR", "Cannot open Health Connect or Play Store", playStoreError)
        }
    }
}
