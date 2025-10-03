import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split


def train_personalization_model(data_path):
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


def predict_adjustment(model, distance_m, user_age, fatigue_level):
    input_data = [[distance_m, user_age, fatigue_level]]
    factor = model.predict(input_data)[0]
    return max(0.8, min(1.5, factor))
