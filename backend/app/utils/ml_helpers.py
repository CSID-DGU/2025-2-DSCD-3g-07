import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
from typing import Any


def train_personalization_model(data_path: str) -> None:
    """
    개인화 모델 학습
    
    Args:
        data_path: 학습 데이터 CSV 파일 경로
    """
    df = pd.read_csv(data_path)
    X = df[["distance_m", "user_age", "fatigue_level"]]
    y = df["adjustment_factor"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    model = LinearRegression()
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    print(f"Model MSE: {mse}")
    joblib.dump(model, "personalization_model.pkl")
    return model


def predict_adjustment(
    model: Any, distance_m: float, user_age: int, fatigue_level: int
) -> float:
    """
    조정 계수 예측
    
    Args:
        model: 학습된 모델
        distance_m: 거리 (미터)
        user_age: 사용자 나이
        fatigue_level: 피로도 (1-10)
    
    Returns:
        예측된 조정 계수 (0.8 ~ 1.5 범위)
    """
    input_data = [[distance_m, user_age, fatigue_level]]
    factor = model.predict(input_data)[0]
    return max(0.8, min(1.5, factor))
