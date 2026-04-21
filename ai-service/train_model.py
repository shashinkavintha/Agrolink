import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import os

def train():
    file_path = "/Users/shashinkavintha/Downloads/Vegetables_fruit_prices_with_climate (1).csv"
    print(f"Loading data from {file_path}...")
    
    # Read CSV
    df = pd.read_csv(file_path)
    
    # Preprocessing
    # The 'Crop Yield Impact Score' has 's' which needs to be numeric
    df['Crop Yield Impact Score'] = pd.to_numeric(df['Crop Yield Impact Score'], errors='coerce')
    df['Crop Yield Impact Score'] = df['Crop Yield Impact Score'].fillna(df['Crop Yield Impact Score'].mean())
    df['Temperature (∞C)'] = pd.to_numeric(df['Temperature (∞C)'], errors='coerce').fillna(df['Temperature (∞C)'].mean())
    
    df['Date'] = pd.to_datetime(df['Date'])
    df['Month'] = df['Date'].dt.month
    
    # Separate Fruits and Vegetables to create a single 'Commodity' based model
    # Fruit rows
    df_fruits = df[['Month', 'Region', 'Temperature (∞C)', 'Rainfall (mm)', 'Humidity (%)', 'Crop Yield Impact Score', 'fruit_Commodity', 'fruit_Price per Unit (LKR/kg)']].copy()
    df_fruits.columns = ['Month', 'Region', 'Temperature', 'Rainfall', 'Humidity', 'YieldScore', 'Commodity', 'Price']
    
    # Vegetable rows
    df_veggies = df[['Month', 'Region', 'Temperature (∞C)', 'Rainfall (mm)', 'Humidity (%)', 'Crop Yield Impact Score', 'vegitable_Commodity', 'vegitable_Price per Unit (LKR/kg)']].copy()
    df_veggies.columns = ['Month', 'Region', 'Temperature', 'Rainfall', 'Humidity', 'YieldScore', 'Commodity', 'Price']
    
    # Combine
    data = pd.concat([df_fruits, df_veggies], ignore_index=True)
    
    # Drop rows with NaN price if any
    data = data.dropna(subset=['Price'])
    
    # Label Encoding
    le_region = LabelEncoder()
    data['Region'] = le_region.fit_transform(data['Region'])
    
    le_commodity = LabelEncoder()
    data['Commodity'] = le_commodity.fit_transform(data['Commodity'])
    
    # Split features and target
    X = data[['Month', 'Region', 'Temperature', 'Rainfall', 'Humidity', 'YieldScore', 'Commodity']]
    y = data['Price']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Model
    print("Training Random Forest model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    score = model.score(X_test, y_test)
    print(f"Model R^2 Score: {score:.4f}")
    
    # Save Everything
    joblib.dump(model, 'price_model.joblib')
    joblib.dump(le_region, 'le_region.joblib')
    joblib.dump(le_commodity, 'le_commodity.joblib')
    
    # Save feature names for reference in API
    with open('features.txt', 'w') as f:
        f.write(",".join(X.columns))
        
    print("Training complete. Files saved: price_model.joblib, le_region.joblib, le_commodity.joblib")

if __name__ == "__main__":
    train()
