package com.pacetry.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.widget.TextView
import android.widget.ScrollView
import android.widget.LinearLayout
import android.view.ViewGroup
import android.graphics.Color
import android.util.TypedValue

/**
 * Health Connect 권한에 대한 개인정보처리방침 설명을 표시하는 Activity
 * 공식 문서 요구사항: https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started?hl=ko#privacy_rationale
 */
class PermissionsRationaleActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 프로그래매틱하게 레이아웃 생성
        val scrollView = ScrollView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setPadding(40, 40, 40, 40)
        }
        
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        
        // 제목
        val titleView = TextView(this).apply {
            text = "PaceTry Health Connect 권한 사용 안내"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor("#333333"))
            setPadding(0, 0, 0, 30)
        }
        
        // 내용
        val contentView = TextView(this).apply {
            text = """
                PaceTry 앱이 Health Connect를 통해 건강 데이터에 접근하는 이유와 사용 방법을 설명드립니다.
                
                📊 수집하는 데이터:
                • 걸음 수 (Steps): 일일 활동량 추적
                • 이동 거리 (Distance): 운동 기록 분석
                • 소모 칼로리 (Active Calories): 에너지 소비 계산
                • 운동 세션 (Exercise Sessions): 운동 패턴 분석
                
                🔒 데이터 보안:
                • 모든 건강 데이터는 기기에 로컬로 저장됩니다
                • 데이터는 암호화되어 보호됩니다
                • 사용자의 명시적 동의 없이는 데이터를 공유하지 않습니다
                
                📱 사용 목적:
                • 개인 건강 관리 및 피트니스 목표 설정
                • 운동 진행 상황 모니터링
                • 건강한 라이프스타일 권장사항 제공
                
                ⚙️ 권한 관리:
                • Health Connect 설정에서 언제든지 권한을 취소할 수 있습니다
                • 특정 데이터 유형에 대한 접근만 선택적으로 허용할 수 있습니다
                
                📋 준수사항:
                • GDPR 및 개인정보보호법을 준수합니다
                • 의료 진단이나 치료 목적으로 사용되지 않습니다
                • 데이터는 피트니스 및 웰빙 목적으로만 사용됩니다
                
                문의사항이 있으시면 앱 내 설정에서 연락처를 확인해주세요.
            """.trimIndent()
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setLineSpacing(8f, 1.2f)
            setTextColor(Color.parseColor("#666666"))
        }
        
        container.addView(titleView)
        container.addView(contentView)
        scrollView.addView(container)
        
        setContentView(scrollView)
        
        // 액션바 설정
        supportActionBar?.apply {
            title = "권한 사용 안내"
            setDisplayHomeAsUpEnabled(true)
        }
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}