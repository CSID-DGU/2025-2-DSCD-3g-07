# AWS 프로덕션 DB 마이그레이션 지침서
## 속도 프로필 컬럼명 변경 (speed_case1, speed_case2)

**작성일**: 2025-11-23  
**대상 테이블**: `activity_speed_profile`  
**변경 유형**: 컬럼 삭제 및 컬럼명 변경  
**예상 소요 시간**: 5분 이내  
**다운타임**: 없음 (Zero-downtime migration)

---

## 1. 변경 사항 요약

### 삭제할 컬럼 (6개)
- `avg_speed_uphill_kmh`
- `avg_speed_downhill_kmh`
- `max_speed_kmh`
- `min_speed_kmh`
- `speed_variance`
- `confidence_score`

### 컬럼명 변경 (2개)
- `avg_speed_flat_kmh` → `speed_case1`
- `avg_speed_slow_walk_kmh` → `speed_case2`

### 변경 이유
- 불필요한 컬럼 제거로 DB 최적화
- 명확한 컬럼명으로 가독성 향상 (Case1: 경로 안내용, Case2: 코스 추천용)

---

## 2. 사전 확인 사항

### ✅ 현재 테이블 구조 확인
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_speed_profile'
ORDER BY ordinal_position;
```

**예상 결과**:
```
profile_id               | integer
user_id                  | integer
activity_type            | character varying(20)
avg_speed_flat_kmh       | numeric(4,2)
avg_speed_slow_walk_kmh  | numeric(4,2)
data_points_count        | integer
last_updated             | timestamp
created_at               | timestamp
speed_history            | jsonb
(그 외 삭제 대상 컬럼들...)
```

### ✅ 데이터 건수 확인
```sql
SELECT COUNT(*) as total_records FROM activity_speed_profile;
```

---

## 3. 백업 (필수)

### 3-1. 테이블 전체 백업
```sql
CREATE TABLE activity_speed_profile_backup_20251123 AS 
SELECT * FROM activity_speed_profile;
```

### 3-2. 백업 확인
```sql
SELECT COUNT(*) FROM activity_speed_profile_backup_20251123;
-- 원본 테이블과 건수가 동일해야 함
```

---

## 4. 마이그레이션 SQL (순서대로 실행)

### Step 1: 불필요한 컬럼 삭제
```sql
-- 6개 컬럼 삭제 (존재하지 않을 수 있으므로 IF EXISTS 사용)
ALTER TABLE activity_speed_profile 
DROP COLUMN IF EXISTS avg_speed_uphill_kmh;

ALTER TABLE activity_speed_profile 
DROP COLUMN IF EXISTS avg_speed_downhill_kmh;

ALTER TABLE activity_speed_profile 
DROP COLUMN IF EXISTS max_speed_kmh;

ALTER TABLE activity_speed_profile 
DROP COLUMN IF EXISTS min_speed_kmh;

ALTER TABLE activity_speed_profile 
DROP COLUMN IF EXISTS speed_variance;

ALTER TABLE activity_speed_profile 
DROP COLUMN IF EXISTS confidence_score;
```

### Step 2: 컬럼명 변경
```sql
-- avg_speed_flat_kmh → speed_case1
ALTER TABLE activity_speed_profile 
RENAME COLUMN avg_speed_flat_kmh TO speed_case1;

-- avg_speed_slow_walk_kmh → speed_case2
ALTER TABLE activity_speed_profile 
RENAME COLUMN avg_speed_slow_walk_kmh TO speed_case2;
```

---

## 5. 검증 (마이그레이션 후 확인)

### 5-1. 컬럼 구조 확인
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_speed_profile'
ORDER BY ordinal_position;
```

**기대 결과**:
```
profile_id         | integer
user_id            | integer
activity_type      | character varying(20)
speed_case1        | numeric(4,2)         ← 변경됨
speed_case2        | numeric(4,2)         ← 변경됨
data_points_count  | integer
last_updated       | timestamp
created_at         | timestamp
speed_history      | jsonb
```

### 5-2. 데이터 무결성 확인
```sql
-- 데이터 건수 확인 (백업과 동일해야 함)
SELECT COUNT(*) FROM activity_speed_profile;

-- 샘플 데이터 확인 (NULL 값 없어야 함)
SELECT profile_id, user_id, speed_case1, speed_case2 
FROM activity_speed_profile 
LIMIT 10;

-- NULL 값 체크
SELECT COUNT(*) 
FROM activity_speed_profile 
WHERE speed_case1 IS NULL OR speed_case2 IS NULL;
-- 결과: 0이어야 함
```

### 5-3. 컬럼 타입 확인
```sql
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'activity_speed_profile' 
AND column_name IN ('speed_case1', 'speed_case2');
```

**기대 결과**:
```
speed_case1 | numeric | 4 | 2
speed_case2 | numeric | 4 | 2
```

---

## 6. 롤백 방법 (문제 발생 시)

### 방법 1: 백업에서 복원
```sql
-- 현재 테이블 삭제
DROP TABLE activity_speed_profile;

-- 백업에서 복원
ALTER TABLE activity_speed_profile_backup_20251123 
RENAME TO activity_speed_profile;
```

### 방법 2: 컬럼명만 롤백
```sql
ALTER TABLE activity_speed_profile 
RENAME COLUMN speed_case1 TO avg_speed_flat_kmh;

ALTER TABLE activity_speed_profile 
RENAME COLUMN speed_case2 TO avg_speed_slow_walk_kmh;
```

---

## 7. 배포 체크리스트

### 배포 전
- [ ] 백업 완료 확인
- [ ] 현재 테이블 구조 문서화
- [ ] 데이터 건수 기록
- [ ] 롤백 계획 검토

### 배포 중
- [ ] Step 1 (컬럼 삭제) 실행
- [ ] Step 2 (컬럼명 변경) 실행
- [ ] 각 단계별 에러 확인

### 배포 후
- [ ] 컬럼 구조 검증 완료
- [ ] 데이터 건수 일치 확인
- [ ] NULL 값 없음 확인
- [ ] 샘플 데이터 조회 성공
- [ ] 백엔드 서버 재시작
- [ ] API 테스트 (GET /api/profile/speed)
- [ ] 프론트엔드 테스트 (속도 프로필 조회/수정)

---

## 8. 코드 배포 순서 (중요!)

**⚠️ 반드시 이 순서대로 배포해야 합니다:**

1. **DB 마이그레이션** (이 문서의 Step 1, 2 실행)
2. **백엔드 배포** (새 코드: speed_case1, speed_case2 사용)
3. **프론트엔드 배포** (새 코드: speed_case1, speed_case2 사용)

**이유**: 
- DB를 먼저 변경하면 기존 백엔드가 일시적으로 에러 발생 가능
- 하지만 컬럼명 변경은 즉시 적용되므로 백엔드를 빠르게 배포하면 다운타임 최소화
- 백엔드가 먼저 배포되면 프론트엔드는 점진적 배포 가능

---

## 9. 예상 이슈 및 대응

### 이슈 1: 컬럼이 존재하지 않음
**증상**: `column "avg_speed_flat_kmh" does not exist`  
**원인**: 이미 마이그레이션 완료되었거나 다른 환경  
**대응**: 현재 컬럼 구조 확인 후 필요한 단계만 실행

### 이슈 2: 백엔드 에러 (마이그레이션 직후)
**증상**: `column "speed_case1" does not exist`  
**원인**: 백엔드가 아직 구 버전 (avg_speed_flat_kmh 사용 중)  
**대응**: 백엔드를 신버전으로 즉시 배포

### 이슈 3: 데이터 손실
**증상**: 레코드 수 불일치  
**원인**: 마이그레이션 중 예상치 못한 에러  
**대응**: 즉시 롤백 (6번 항목 참조)

---

## 10. 담당자 연락처

**개발팀**:
- 담당자: [이름]
- 연락처: [전화번호]
- 이메일: [이메일]

**긴급 상황 시**:
- Slack 채널: #pacetry-emergency
- 전화: [긴급 연락처]

---

## 11. 참고 자료

### 로컬 개발 환경 마이그레이션 스크립트
- `backend/migrations/remove_unused_speed_columns.py`
- `backend/migrations/reorder_columns.py`
- 실행 방법: `python migrations/[파일명].py`

### 변경된 코드 파일 목록
**백엔드**:
- `backend/app/models.py`
- `backend/app/crud.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/personalization.py`

**프론트엔드**:
- `frontend/services/api.ts`
- `frontend/app/(auth)/register.tsx`
- `frontend/app/(tabs)/course.tsx`

---

## 12. 최종 확인 스크립트 (마이그레이션 완료 후)

```bash
# PostgreSQL 접속 후 실행
psql -h [호스트] -U [사용자] -d [데이터베이스]

\d activity_speed_profile  -- 테이블 구조 확인

SELECT 
    COUNT(*) as total,
    COUNT(speed_case1) as case1_count,
    COUNT(speed_case2) as case2_count,
    AVG(speed_case1) as avg_case1,
    AVG(speed_case2) as avg_case2
FROM activity_speed_profile;
-- 모든 카운트가 동일하고, 평균값이 합리적이어야 함 (case1: 4-5, case2: 3-4)
```

---

**작성자**: GitHub Copilot  
**검토 필요**: AWS 운영팀, 백엔드 팀장  
**승인 필요**: CTO, DevOps 리드
