import csv

with open('navigation_logs_export_20251204_165448_filled.csv', 'r', encoding='utf-8-sig') as f:
    reader = list(csv.DictReader(f))

print(f"{'log_id':>6} | {'time_diff':>10} | {'accuracy':>10}")
print('-' * 35)

for row in reader:
    log_id = row['log_id']
    time_diff = row['time_difference_seconds']
    accuracy = row['accuracy_percent']
    print(f"{log_id:>6} | {time_diff:>10} | {accuracy:>10}%")
