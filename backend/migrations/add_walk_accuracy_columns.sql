-- 보행 시간 예측 정확도 측정을 위한 새 컬럼 추가
-- 실행: psql -U your_user -d your_database -f add_walk_accuracy_columns.sql

-- 1. 예측 보행 시간 (횡단보도 1/3 포함)
ALTER TABLE navigation_logs 
ADD COLUMN IF NOT EXISTS estimated_walk_time_seconds INTEGER;

-- 2. 보행 시간 차이 (실제 - 예측)
ALTER TABLE navigation_logs 
ADD COLUMN IF NOT EXISTS walk_time_difference_seconds INTEGER;

-- 3. 보행 예측 정확도 (%)
ALTER TABLE navigation_logs 
ADD COLUMN IF NOT EXISTS walk_accuracy_percent NUMERIC(5, 2);

-- 컬럼 설명 추가 (PostgreSQL)
COMMENT ON COLUMN navigation_logs.estimated_walk_time_seconds IS '예측 보행 시간 (횡단보도 대기 1/3 포함, 초)';
COMMENT ON COLUMN navigation_logs.walk_time_difference_seconds IS '보행 시간 차이 (실제 - 예측, 초)';
COMMENT ON COLUMN navigation_logs.walk_accuracy_percent IS '보행 예측 정확도 (%)';

-- 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'navigation_logs' 
AND column_name IN ('estimated_walk_time_seconds', 'walk_time_difference_seconds', 'walk_accuracy_percent');
