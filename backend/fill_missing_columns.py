import csv

# 읽기
with open('navigation_logs_export_20251204_165448.csv', 'r', encoding='utf-8-sig') as f:
    reader = list(csv.DictReader(f))
    fieldnames = list(reader[0].keys())

# 계산
for row in reader:
    estimated = int(row['estimated_time_seconds']) if row['estimated_time_seconds'] else 0
    actual = int(row['actual_time_seconds']) if row['actual_time_seconds'] else 0
    
    # time_difference_seconds 계산: actual - estimated
    if not row['time_difference_seconds'] and estimated and actual:
        row['time_difference_seconds'] = actual - estimated
    
    # accuracy_percent 계산: 100 - |diff| / estimated * 100
    if not row['accuracy_percent'] and estimated > 0 and actual > 0:
        diff = abs(actual - estimated)
        accuracy = round(100 - (diff / estimated * 100), 2)
        row['accuracy_percent'] = accuracy

# 저장
with open('navigation_logs_export_20251204_165448_filled.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(reader)

print('완료! navigation_logs_export_20251204_165448_filled.csv 저장됨')

# 검증
print()
print('=== 검증 (일부 로그) ===')
for row in reader[:10]:
    print(f"log_id={row['log_id']}: time_diff={row['time_difference_seconds']}, accuracy={row['accuracy_percent']}%")
