# AWS 데이터베이스 마이그레이션 가이드

**작업 일자**: 2025년 11월 21일  
**담당**: AWS 담당자

---

## 📋 변경 사항

### `navigation_logs` 테이블 (5개 컬럼 추가)
```sql
ALTER TABLE navigation_logs 
ADD COLUMN active_walking_time_seconds INTEGER,  -- 실제 걷는 시간 (초)
ADD COLUMN paused_time_seconds INTEGER DEFAULT 0, -- 정지 시간 (초)
ADD COLUMN real_walking_speed_kmh NUMERIC(4,2),  -- 실측 속도 (km/h)
ADD COLUMN pause_count INTEGER DEFAULT 0,        -- 정지 구간 횟수
ADD COLUMN movement_data JSONB;                  -- 센서 원본 데이터
```

### `activity_speed_profile` 테이블 (1개 컬럼 추가)
```sql
ALTER TABLE activity_speed_profile 
ADD COLUMN speed_history JSONB DEFAULT '[]';   -- 속도 업데이트 이력
```

**중요**: 모든 컬럼 NULL 허용 → 기존 데이터 영향 없음



---

## 🔧 마이그레이션 스크립트

```sql
BEGIN;

-- 1. 컬럼 추가
ALTER TABLE navigation_logs 
ADD COLUMN IF NOT EXISTS active_walking_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS paused_time_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS real_walking_speed_kmh NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS movement_data JSONB;

ALTER TABLE activity_speed_profile 
ADD COLUMN IF NOT EXISTS speed_history JSONB DEFAULT '[]';

-- 2. 기존 데이터 초기화
UPDATE activity_speed_profile 
SET speed_history = '[]'::jsonb 
WHERE speed_history IS NULL;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_navigation_logs_movement_data 
ON navigation_logs USING GIN (movement_data);

CREATE INDEX IF NOT EXISTS idx_speed_profile_history 
ON activity_speed_profile USING GIN (speed_history);

-- 4. 제약조건 추가
ALTER TABLE navigation_logs 
ADD CONSTRAINT chk_real_walking_speed 
CHECK (real_walking_speed_kmh IS NULL OR 
       (real_walking_speed_kmh >= 0.5 AND real_walking_speed_kmh <= 10.0));

ALTER TABLE navigation_logs 
ADD CONSTRAINT chk_active_walking_time_seconds 
CHECK (active_walking_time_seconds IS NULL OR active_walking_time_seconds >= 0);

ALTER TABLE navigation_logs 
ADD CONSTRAINT chk_paused_time_seconds 
CHECK (paused_time_seconds >= 0);

ALTER TABLE navigation_logs 
ADD CONSTRAINT chk_pause_count 
CHECK (pause_count >= 0);

COMMIT;
```

---

## 🚀 실행 절차

### 1단계: 백업
```bash
pg_dump -h <AWS_RDS_ENDPOINT> -U <USERNAME> -d pacetry_db > backup.sql
```

### 2단계: 마이그레이션
```bash
psql -h <AWS_RDS_ENDPOINT> -U <USERNAME> -d pacetry_db -f migration_script.sql
```

### 3단계: 검증
```sql
-- 컬럼 확인
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'navigation_logs' 
  AND column_name IN ('active_walking_time_seconds', 'paused_time_seconds', 
                      'real_walking_speed_kmh', 'pause_count', 'movement_data');

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'activity_speed_profile' AND column_name = 'speed_history';
```

---

## ⚠️ 롤백 스크립트

```sql
BEGIN;

ALTER TABLE navigation_logs 
DROP COLUMN IF EXISTS active_walking_time_seconds,
DROP COLUMN IF EXISTS paused_time_seconds,
DROP COLUMN IF EXISTS real_walking_speed_kmh,
DROP COLUMN IF EXISTS pause_count,
DROP COLUMN IF EXISTS movement_data;

ALTER TABLE activity_speed_profile 
DROP COLUMN IF EXISTS speed_history;

DROP INDEX IF EXISTS idx_navigation_logs_movement_data;
DROP INDEX IF EXISTS idx_speed_profile_history;

COMMIT;
```

---

## ✅ 체크리스트

- [ ] DB 백업
- [ ] 마이그레이션 스크립트 실행
- [ ] 컬럼 추가 검증
- [ ] 롤백 스크립트 준비

