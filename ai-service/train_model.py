"""
SAFORA AI Pricing Model — Training Script
==========================================
FYP26-CS-G11 | SAFORA — Safe Ride-Hailing for Women in Pakistan

Fare architecture
------------------
The fare shown to a rider has two parts:

  1. A transparent formula (BASE_FARE + RATE_PER_KM*distance + RATE_PER_MIN*duration)
     multiplied by a per-ride-type rate multiplier — see services/pricing.py.

  2. Real-time surge, taken entirely from the live marketplace signal already
     computed by the backend (online drivers vs active ride requests right now)
     plus a fixed rush-hour heuristic — see services/pricing.py.

What this script does
----------------------
This script does NOT do (2). We initially planned to train a model that
predicts a time-of-day demand multiplier from the Kaggle "Uber and Lyft
Dataset Boston, MA" data (ravi72munde/uber-lyft-cab-prices, cab_rides.csv),
but inspecting the data first showed that's not viable: `surge_multiplier`
is 1.0 for 97%+ of rows (exactly 1.0 for 100% of Uber rows — Uber's real
surge isn't exposed in this export), and the hour-of-day average of
price-vs-route-median ratio is flat (1.024-1.030 across all 24 hours).
There is no learnable temporal demand pattern in this dataset. Training a
"demand" model on it anyway would just produce a model that always predicts
~1.0 — not a real finding, and not something we want to present as "the AI
learned demand patterns" when it demonstrably didn't.

What the data IS good for: within each ride category, price is strongly
explained by distance alone (R^2 = 0.40-0.83 depending on category — checked
before writing this). So instead, this script uses real regression fits of
price-vs-distance, per category, to empirically derive SAFORA's per-type
rate multipliers (TYPE_MULTIPLIERS in services/pricing.py) — replacing
hand-picked numbers with numbers grounded in a real dataset, R^2 included.

Usage:
    cd ai-service
    python train_model.py

Input (place before running):
    models/cab_rides.csv        — raw Kaggle dataset (download manually)

Output:
    models/fare_calibration.pkl — {ride_type: {multiplier, r2, rate_per_km_usd,
                                    base_usd, n_samples}}, loaded by
                                    services/pricing.py at startup
    models/training_data.csv    — cleaned sample of the real rows used (for
                                    the SDD appendix / defence — real data,
                                    not synthetic)
"""

import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
import joblib

RAW_CSV_PATH = os.path.join('models', 'cab_rides.csv')
CALIBRATION_PATH = os.path.join('models', 'fare_calibration.pkl')
TRAINING_DATA_PATH = os.path.join('models', 'training_data.csv')

# Reference distance (km) at which each category's fitted line is compared,
# to derive a single multiplier relative to 'standard'. Chosen as a
# mid-range trip, inside the distance range actually present in the data.
REFERENCE_DISTANCE_KM = 3.0

# Which Kaggle ride names count as which SAFORA ride type. Only 'standard'
# has a genuine equivalent in the source data (UberX/Lyft — a single-rider
# car, same as SAFORA's standard tier). Everything else has no honest match:
# - 'eco' was originally mapped to Uber/Lyft's shared-*car* products
#   (UberPool/Shared/Lyft Line), but SAFORA's eco tier is a MOTORBIKE, not a
#   shared car — completely different cost structure, so that mapping never
#   should have been treated as data-derived in the first place.
# - 'pink-pass' means "verified female driver", not a vehicle class — mapping
#   it to Uber/Lyft's "Black"/"Lux" luxury tiers would conflate a safety
#   feature with a bigger car.
# - 'rickshaw' has no Boston equivalent at all.
# All three are set as manual multipliers below, calibrated to real Lahore
# market rates rather than an unrelated foreign vehicle category.
TYPE_GROUPS = {
    'standard':  ['UberX', 'Lyft'],                 # baseline tier
}

# Calibrated to real Lahore market rates (founder/local-market feedback,
# 2026-07-18), not derived from the Kaggle dataset — see TYPE_GROUPS comment
# above for why none of these three have an honest equivalent in it.
MANUAL_MULTIPLIERS = {
    'eco':       0.50,  # motorbike — cheapest option
    'rickshaw':  0.85,  # between bike and car
    'pink-pass': 1.05,  # verified female driver, same vehicle class as standard
}

print("=" * 60)
print("  SAFORA Fare-Rate Calibration — Training Script")
print("  FYP26-CS-G11")
print("=" * 60)

if not os.path.exists(RAW_CSV_PATH):
    raise SystemExit(
        f"\n[ERROR] {RAW_CSV_PATH} not found.\n\n"
        "Download the Kaggle dataset 'Uber and Lyft Dataset Boston, MA'\n"
        "(ravi72munde/uber-lyft-cab-prices), and place cab_rides.csv at:\n"
        f"  {os.path.abspath(RAW_CSV_PATH)}\n"
    )

# ─── Load & Clean Real Dataset ────────────────────────────────────────────────
print(f"\n[1/3] Loading {RAW_CSV_PATH}...")
raw = pd.read_csv(RAW_CSV_PATH)
raw = raw.dropna(subset=['distance', 'price', 'name'])
raw = raw[raw['distance'] > 0]
print(f"  [OK] {len(raw)} usable rows after cleaning")

# ─── Fit price ~ distance per SAFORA ride type ────────────────────────────────
print("\n[2/3] Fitting price ~ distance per ride type...")
calibration = {}
for safora_type, kaggle_names in TYPE_GROUPS.items():
    subset = raw[raw['name'].isin(kaggle_names)]
    if len(subset) < 30:
        print(f"  [SKIP] {safora_type}: only {len(subset)} samples")
        continue

    X = subset[['distance']].values
    y = subset['price'].values
    model = LinearRegression().fit(X, y)
    r2 = r2_score(y, model.predict(X))

    rate_per_km_usd = float(model.coef_[0])
    base_usd = float(model.intercept_)
    reference_price = rate_per_km_usd * REFERENCE_DISTANCE_KM + base_usd

    calibration[safora_type] = {
        'rate_per_km_usd': rate_per_km_usd,
        'base_usd': base_usd,
        'reference_price_usd': reference_price,
        'r2': r2,
        'n_samples': len(subset),
    }
    print(f"  {safora_type:<12} n={len(subset):6d}  R2={r2:.3f}  "
          f"rate/km=${rate_per_km_usd:.2f}  base=${base_usd:.2f}  "
          f"price@{REFERENCE_DISTANCE_KM}km=${reference_price:.2f}")

# ─── Derive multipliers relative to 'standard' ────────────────────────────────
standard_ref = calibration['standard']['reference_price_usd']
for safora_type, stats in calibration.items():
    stats['multiplier'] = round(stats['reference_price_usd'] / standard_ref, 3)

# Ride types with no honest Kaggle equivalent get a documented manual
# multiplier instead of a regression fit — see MANUAL_MULTIPLIERS above.
for safora_type, multiplier in MANUAL_MULTIPLIERS.items():
    calibration[safora_type] = {
        'multiplier': multiplier,
        'r2': None,
        'rate_per_km_usd': None,
        'base_usd': None,
        'n_samples': 0,
        'note': 'manually set, no honest Kaggle equivalent category exists',
    }

print("\n  Derived TYPE_MULTIPLIERS (relative to standard = 1.0):")
for safora_type, stats in calibration.items():
    print(f"    {safora_type:<12} {stats['multiplier']:.3f}")

# ─── Save Calibration + Sample of Real Data Used ──────────────────────────────
print("\n[3/3] Saving calibration and training data sample...")
os.makedirs('models', exist_ok=True)

joblib.dump(calibration, CALIBRATION_PATH)
print(f"  [OK] Calibration saved -> {CALIBRATION_PATH}")

used_names = [n for names in TYPE_GROUPS.values() for n in names]
sample = raw[raw['name'].isin(used_names)][['distance', 'name', 'price', 'time_stamp']]
sample = sample.sample(n=min(2000, len(sample)), random_state=42)
sample.to_csv(TRAINING_DATA_PATH, index=False)
print(f"  [OK] Training data sample saved -> {TRAINING_DATA_PATH}")
print(f"  (source: Kaggle 'Uber and Lyft Dataset Boston, MA', ravi72munde/uber-lyft-cab-prices)")

print("\n" + "=" * 60)
print("  Calibration complete. services/pricing.py loads")
print(f"  {CALIBRATION_PATH} at startup and uses these multipliers")
print("  instead of hand-picked constants.")
print("=" * 60)
