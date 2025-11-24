import pandas as pd

df = pd.read_csv('data/crosswalk.csv')

print(f"총 횡단보도 수: {len(df)}")
print(f"평균 대기시간: {df['red'].mean():.1f}초")
print(f"중간값: {df['red'].median():.1f}초")
print()

# 백분위수
percentiles = df['red'].quantile([0.25, 0.5, 0.75, 0.9, 0.95])
print("백분위수:")
for p, v in percentiles.items():
    print(f"  {int(p*100)}%: {v}초")
print()

# 96~146초 범위의 횡단보도가 몇 개인지
in_range = df[(df['red'] >= 96) & (df['red'] <= 146)]
print(f"96~146초 범위의 횡단보도: {len(in_range)}개 ({len(in_range)/len(df)*100:.1f}%)")
print()

# 대기시간 분포
bins = [0, 50, 80, 100, 120, 150, 200, 250]
df['range'] = pd.cut(df['red'], bins=bins)
print("대기시간 분포:")
print(df['range'].value_counts().sort_index())
