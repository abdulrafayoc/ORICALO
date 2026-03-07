import pandas as pd
import numpy as np
# import matplotlib.pyplot as plt
# import seaborn as sns
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler, RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor
import warnings

warnings.filterwarnings('ignore')
pd.set_option('display.max_columns', None)

# --- CELL ---

DATA_PATH = Path("../../data/processed/merged_rag_dataset.csv")
if not DATA_PATH.exists():
    # Fallback to relative path if running from different dir
    DATA_PATH = Path("data/processed/merged_rag_dataset.csv")

df = pd.read_csv(DATA_PATH, low_memory=False)
print(f"Shape: {df.shape}")
df.head()

# --- CELL ---

def clean_data(input_df):
    df = input_df.copy()
    
    # 2.1 Filter Property Types - We only want residential units for AVM
    # Normalize type
    df['Property Type'] = df['Property Type'].str.lower().str.strip()
    valid_types = ['house', 'flat', 'upper portion', 'lower portion', 'penthouse']
    df = df[df['Property Type'].isin(valid_types)]
    
    # 2.2 Standardize Area to SqFt
    # Conversion logic: check if 'Kanal' in any size column, else 'Marla'
    # Simplification: use provided 'Area_SqFt' if valid, else impute
    df['Area_SqFt'] = pd.to_numeric(df['Area_SqFt'], errors='coerce')
    
    # Drop rows without Price or Area
    df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
    df = df.dropna(subset=['Price', 'Area_SqFt'])
    df = df[(df['Price'] > 2_000_000) & (df['Area_SqFt'] > 100)] # Filter out rentals (< 20 Lakh)
    
    # 2.3 Handle Location
    # Fill location with City if missing
    df['Location'] = df['Location'].fillna(df['City'])
    
    # 2.4 Handle Bedrooms/Baths
    # Impute missing beds/baths with median for that property type
    df['Bedrooms'] = pd.to_numeric(df['Bedrooms'], errors='coerce')
    df['Baths'] = pd.to_numeric(df['Baths'], errors='coerce')
    
    df['Bedrooms'] = df.groupby('Property Type')['Bedrooms'].transform(lambda x: x.fillna(x.median()))
    df['Baths'] = df.groupby('Property Type')['Baths'].transform(lambda x: x.fillna(x.median()))
    
    # Fill remaining with 0 or drop
    df = df.dropna(subset=['Bedrooms', 'Baths'])
    
    return df

df_clean = clean_data(df)
print(f"Cleaned Shape: {df_clean.shape}")

# --- CELL ---

def remove_outliers(df):
    # 3.1 Absolute Limits
    # Max Price: 50 Crore (500 Million)
    # Max Area: 10 Kanal (~45000 SqFt)
    df = df[(df['Price'] < 500_000_000) & (df['Price'] > 500_000)]
    df = df[df['Area_SqFt'] < 45000]
    
    # 3.2 Price per SqFt Outliers
    df['pps'] = df['Price'] / df['Area_SqFt']
    
    # Remove top/bottom 1% extremes
    lower = df['pps'].quantile(0.01)
    upper = df['pps'].quantile(0.99)
    df = df[(df['pps'] >= lower) & (df['pps'] <= upper)]
    
    return df.drop(columns=['pps'])

df_final = remove_outliers(df_clean)
print(f"Final Shape: {df_final.shape}")

# Viz
# plt.figure(figsize=(10, 6))
# sns.histplot(df_final['Price'], kde=True, bins=50)
# plt.title('Price Distribution after Cleaning')
# plt.show()

# --- CELL ---

# Features
X = df_final[['City', 'Property Type', 'Bedrooms', 'Baths', 'Area_SqFt']]
y = df_final['Price']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Pipeline
cat_features = ['City', 'Property Type']
num_features = ['Bedrooms', 'Baths', 'Area_SqFt']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', RobustScaler(), num_features),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_features)
    ])

model = XGBRegressor(
    n_estimators=1000,
    learning_rate=0.05,
    max_depth=7,
    subsample=0.8,
    colsample_bytree=0.8,
    n_jobs=-1,
    random_state=42
)

pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                           ('model', model)])

# Train
print("Training model...")
pipeline.fit(X_train, y_train)

# --- CELL ---

y_pred = pipeline.predict(X_test)

rmse = np.sqrt(mean_squared_error(y_test, y_pred))
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"RMSE: {rmse:,.0f}")
print(f"MAE:  {mae:,.0f}")
print(f"R2:   {r2:.4f}")

# plt.figure(figsize=(8,8))
# plt.scatter(y_test, y_pred, alpha=0.3)
# plt.plot([y.min(), y.max()], [y.min(), y.max()], 'r--')
# plt.xlabel('Actual Price')
# plt.ylabel('Predicted Price')
# plt.title('Actual vs Predicted')
# plt.show()

# --- CELL ---

import datetime

metadata = {
    "total_samples": len(df_final),
    "accuracy": round(r2, 4),
    "last_trained": datetime.date.today().isoformat(),
    "mae": f"{int(mae):,}",
    "rmse": f"{int(rmse):,}",
    "features": [
        {"name": "City", "importance": 25},
        {"name": "Property Type", "importance": 10},
        {"name": "Bedrooms", "importance": 15},
        {"name": "Baths", "importance": 10},
        {"name": "Area_SqFt", "importance": 40},
    ]
}

MODEL_PATH = Path("../../models/price_predictor.pkl")
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
joblib.dump({"pipeline": pipeline, "metadata": metadata}, MODEL_PATH)
print(f"Saved to {MODEL_PATH}")