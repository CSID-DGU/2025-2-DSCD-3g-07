# 팀 공지 - 보행 속도 자동 업데이트 시스템

**날짜**: 2025년 11월 21일  
**영향 범위**: Backend, Frontend, Database

---

## 🔄 시스템 동작 흐름

```
1. 회원가입 → 초기 프로필 생성 (4 km/h 또는 Health Connect 데이터)
2. 경로 안내 → GPS/가속도계로 실제 보행 속도 측정 (정지 시간 제외)
3. 경로 완료 → 역산 계산 (경사도/날씨 영향 제거) → 가중평균 (70:30) → 프로필 자동 업데이트
4. 다음 경로 → 업데이트된 속도로 더 정확한 예상 시간 제공
```

---

## 📊 데이터베이스 변경 (NULL 허용 - 기존 데이터 영향 없음)

```sql
-- navigation_logs: 5개 컬럼
active_walking_time_seconds, paused_time_seconds, real_walking_speed_kmh, pause_count, movement_data

-- activity_speed_profile: 1개 컬럼
speed_history JSONB DEFAULT '[]'
```

---

## 🔧 Backend 변경

### 수정된 파일
- `app/models.py`: speed_history 컬럼
- `app/crud.py`: 가중평균 업데이트 함수
- `app/utils/Factors_Affecting_Walking_Speed.py`: 역산 함수
- `app/routers/auth.py`: 회원가입 시 초기 프로필 생성
- `app/routers/navigation_logs.py`: 자동 업데이트 로직
- `app/routers/personalization.py`: **(신규)** 프로필 API

### 신규 API
```
GET  /api/profile/speed    # 프로필 조회
PUT  /api/profile/speed    # 수동 업데이트
```

---

## 📱 Frontend 작업 상태

### ✅ 완료된 작업
1. **센서 데이터 수집**: `expo-sensors` + 가속도계 (`services/movementTrackingService.ts`)
2. **API 전송 필드**: active_walking_time, real_walking_speed_kmh, movement_data 전송 (`services/navigationLogService.ts`)
3. **Alert UI**: 예상 vs 실제 시간 비교 후 속도 업데이트 제안 (`app/(tabs)/index.tsx`)

**Frontend 작업 모두 완료됨**

---

## 🧪 로컬 테스트 완료

✅ 기본 시나리오 / Health Connect 시나리오  
✅ 가중평균 (70:30) / 역산 계산  
✅ JSONB 이력 저장/조회

**테스트**: `backend/test_speed_profile_scenario.py`, `test_health_connect_scenario.py`

---

## 🚀 배포 체크리스트

### AWS
- [ ] DB 백업 및 마이그레이션 (`docs/AWS_DATABASE_MIGRATION_GUIDE.md` 참고)

### Backend
- [ ] 최신 코드 pull → API 서버 재배포

### Frontend
- [x] 센서 데이터 수집 완료
- [x] API 전송 필드 추가 완료
- [x] Alert UI 구현 완료

### QA
- [ ] 회원가입 → 경로 안내 → 프로필 자동 업데이트 확인

---

**Note**: Backend 먼저 배포 가능 (기존 데이터 영향 없음), Frontend 순차 배포
