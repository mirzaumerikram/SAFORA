"""
SAFORA AI Pricing Model — Training Script
==========================================
FYP26-CS-G11 | SAFORA — Safe Ride-Hailing for Women in Pakistan

Generates 500 synthetic ride records based on real Pakistani ride-hailing
pricing patterns and trains a Linear Regression model.

Usage:
    cd ai-service
    python train_model.py

Output:
    models/price_model.pkl   — trained model
    models/training_data.csv — synthetic dataset (for documentation)
"""

import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib

# ─── Seed for reproducibility ────────────────────────────────────────────────
np.random.seed(42)
N = 500  # number of synthetic training samples

print("=" * 60)
print("  SAFORA Pricing Model — Training Script")
print("  FYP26-CS-G11")
print("=" * 60)

# ─── Generate Synthetic Dataset ──────────────────────────────────────────────
print(f"\n[1/4] Generating {N} synthetic ride records...")

# Feature: distance (km) — Lahore city rides range 2–30 km
distance_km = np.random.uniform(2.0, 30.0, N)

# Feature: duration (min) — correlated with distance + traffic noise
duration_min = distance_km * 3.0 + np.random.normal(0, 5, N)
duration_min = np.clip(duration_min, 5, 90).astype(int)

# Feature: time_of_day (hour 0–23) — rush hours = higher demand
time_of_day = np.random.randint(0, 24, N)

# Feature: day_of_week (0=Mon, 6=Sun)
day_of_week = np.random.randint(0, 7, N)

# Feature: demand_score (0=low, 1=medium, 2=high, 3=peak)
# Rush hours (7-9am, 5-8pm) and Fridays get higher demand
demand_score = np.zeros(N, dtype=int)
for i in range(N):
    h = time_of_day[i]
    d = day_of_week[i]
    if (7 <= h <= 9) or (17 <= h <= 20):   # rush hours
        demand_score[i] = np.random.choice([2, 3], p=[0.5, 0.5])
    elif d == 4:                             # Friday
        demand_score[i] = np.random.choice([1, 2], p=[0.5, 0.5])
    else:
        demand_score[i] = np.random.choice([0, 1, 2], p=[0.5, 0.35, 0.15])

# Feature: ride_type (0=standard, 1=pink-pass, 2=eco)
ride_type = np.random.choice([0, 1, 2], N, p=[0.6, 0.25, 0.15])

# Feature: traffic_multiplier (1.0 – 1.8)
traffic_multiplier = np.random.uniform(1.0, 1.8, N)

# ─── Target: Fare in PKR ─────────────────────────────────────────────────────
# Base formula: (distance * 35) + (duration * 5) + 50
# Demand multiplier: low=1.0, medium=1.2, high=1.5, peak=2.0
# Ride type: eco saves 15%, pink-pass costs 10% more
demand_multipliers = np.array([1.0, 1.2, 1.5, 2.0])
type_multipliers   = np.array([1.0, 1.10, 0.85])  # standard, pink-pass, eco

fare_base = (distance_km * 35) + (duration_min * 5) + 50
fare_demand = fare_base * demand_multipliers[demand_score]
fare_traffic = fare_demand * traffic_multiplier
fare_type = fare_traffic * type_multipliers[ride_type]

# Add realistic noise (±15%)
noise = np.random.normal(1.0, 0.08, N)
fare_final = np.clip(fare_type * noise, 50, 3000).round(2)

# ─── Build DataFrame ──────────────────────────────────────────────────────────
df = pd.DataFrame({
    'distance_km':        distance_km,
    'duration_min':       duration_min,
    'time_of_day':        time_of_day,
    'day_of_week':        day_of_week,
    'demand_score':       demand_score,
    'ride_type':          ride_type,
    'traffic_multiplier': traffic_multiplier,
    'fare_pkr':           fare_final,
})

print(f"  ✓ Dataset generated | shape: {df.shape}")
print(f"  Fare range: PKR {df['fare_pkr'].min():.0f} – {df['fare_pkr'].max():.0f}")
print(f"  Mean fare:  PKR {df['fare_pkr'].mean():.0f}")

# ─── Train / Test Split ───────────────────────────────────────────────────────
print("\n[2/4] Splitting dataset (80% train / 20% test)...")
X = df.drop('fare_pkr', axis=1).values
y = df['fare_pkr'].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"  ✓ Train: {len(X_train)} samples | Test: {len(X_test)} samples")

# ─── Train Model ──────────────────────────────────────────────────────────────
print("\n[3/4] Training LinearRegression model...")
model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mae    = mean_absolute_error(y_test, y_pred)
r2     = r2_score(y_test, y_pred)

print(f"  ✓ Model trained successfully!")
print(f"  R² Score:              {r2:.4f}  (1.0 = perfect)")
print(f"  Mean Absolute Error:   PKR {mae:.2f}")
print(f"\n  Feature Coefficients:")
feature_names = ['distance_km', 'duration_min', 'time_of_day', 'day_of_week',
                 'demand_score', 'ride_type', 'traffic_multiplier']
for name, coef in zip(feature_names, model.coef_):
    print(f"    {name:<22} {coef:+.4f}")
print(f"    {'intercept':<22} {model.intercept_:+.4f}")

# ─── Save Model ───────────────────────────────────────────────────────────────
print("\n[4/4] Saving model and dataset...")
os.makedirs('models', exist_ok=True)

# Save trained model
model_path = 'models/price_model.pkl'
joblib.dump(model, model_path)
print(f"  ✓ Model saved → {model_path}")

# Save training data for documentation / SDD appendix
csv_path = 'models/training_data.csv'
df.to_csv(csv_path, index=False)
print(f"  ✓ Training data saved → {csv_path}")

# ─── Quick Smoke Test ─────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  SMOKE TEST — Sample Predictions")
print("=" * 60)

loaded_model = joblib.load(model_path)

test_cases = [
    {"desc": "Short eco ride (3km, off-peak)",      "features": [3,  9,   10, 1, 0, 2, 1.0]},
    {"desc": "Medium standard ride (10km, medium)", "features": [10, 28,  14, 2, 1, 0, 1.2]},
    {"desc": "Long pink-pass (20km, rush hour)",    "features": [20, 55,  8,  0, 3, 1, 1.5]},
    {"desc": "City ride (7km, peak Friday)",        "features": [7,  22,  17, 4, 3, 0, 1.8]},
]

for case in test_cases:
    X_sample = np.array([case["features"]])
    predicted = loaded_model.predict(X_sample)[0]
    predicted = max(50, min(predicted, 3000))  # bounds
    print(f"  {case['desc']}")
    print(f"    → Predicted fare: PKR {predicted:.0f}\n")

print("=" * 60)
print("  ✅ SAFORA pricing model trained and ready!")
print(f"  Load with: joblib.load('{model_path}')")
print("=" * 60)
