import joblib
import os

class PricingService:
    """
    Fare = transparent formula (base + per-km + per-min, scaled by a
           per-type rate multiplier, floored at a per-type minimum)
           x demand multiplier

    The per-type rate multipliers (TYPE_MULTIPLIERS) come from
    models/fare_calibration.pkl — real regression fits of price-vs-distance
    per ride category on the Kaggle "Uber and Lyft Dataset Boston, MA"
    dataset (R^2 = 0.4-0.83 per category). See train_model.py for how it's
    derived and why (an earlier design tried to predict a time-of-day demand
    multiplier from that same dataset, but the data doesn't support it —
    documented in train_model.py). If the calibration file isn't present,
    falls back to manually-set default multipliers.

    Real-time surge comes entirely from the live marketplace signal (online
    drivers vs active ride requests right now, computed by the backend) plus
    a fixed rush-hour heuristic — this is real, not simulated, data about the
    current state of the marketplace.
    """

    # Calibrated to real Lahore market rates (founder/local-market feedback,
    # 2026-07-18) after the Kaggle-derived absolute price level came out too
    # low across the board, and pink-pass (same vehicle class as standard,
    # just a verified driver) was overpriced as if it were a premium tier.
    # 'standard' stays anchored at 1.0 and is the one type genuinely backed by
    # the Kaggle regression (see train_model.py); the others have no honest
    # equivalent in that dataset (no motorbike/rickshaw category, and pink-pass
    # isn't a vehicle class at all) so they're set directly from local rates.
    DEFAULT_TYPE_MULTIPLIERS = {
        'eco':       0.50,
        'rickshaw':  0.85,
        'standard':  1.0,
        'pink-pass': 1.05,
    }

    def __init__(self):
        calibration_path = os.getenv('FARE_CALIBRATION_PATH', 'models/fare_calibration.pkl')
        self.TYPE_MULTIPLIERS = dict(self.DEFAULT_TYPE_MULTIPLIERS)
        self.calibration_source = 'manual_default'
        if os.path.exists(calibration_path):
            try:
                calibration = joblib.load(calibration_path)
                for ride_type, stats in calibration.items():
                    if 'multiplier' in stats:
                        self.TYPE_MULTIPLIERS[ride_type] = stats['multiplier']
                self.calibration_source = 'kaggle_regression'
                print(f"[OK] Fare calibration loaded from {calibration_path}: {self.TYPE_MULTIPLIERS}")
            except Exception as e:
                print(f"[WARN] Failed to load fare calibration ({e}). Using manual defaults.")
        else:
            print("[WARN] Fare calibration not found. Using manual default multipliers. Run train_model.py to generate it.")

        # Pricing constants — the transparent, defensible part of the fare.
        # Raised ~1.6x from the original 50/25/3 (2026-07-18) to match real
        # Lahore market rates — the original constants were an initial
        # estimate that priced every ride type too low once checked against
        # actual local fares, not something the Kaggle data could validate
        # (it only supports relative per-km scaling within itself, not PKR
        # absolute levels — see train_model.py).
        self.BASE_FARE = 80  # PKR
        self.RATE_PER_KM = 40  # PKR
        self.RATE_PER_MIN = 5  # PKR

        # The formula is a linear fit and can underprice a short trip below
        # what any real driver would accept. These floors are applied per
        # type after TYPE_MULTIPLIERS, so a short ride never quotes below a
        # realistic minimum.
        self.MIN_FARES = {
            'eco':       180,
            'rickshaw':  280,
            'standard':  380,
            'pink-pass': 420,
        }

        # Live marketplace signal (online drivers vs active ride requests
        # right now, computed by the backend) — the sole source of real-time
        # surge, since no reliable temporal demand signal could be derived
        # from the reference dataset (see train_model.py).
        self.LIVE_DEMAND_MULTIPLIERS = {
            'low': 1.0,
            'medium': 1.05,
            'high': 1.15,
            'peak': 1.3,
        }

    def predict_price(self, features):
        """
        Predict ride price = formula fare x demand multiplier

        Args:
            features: dict with keys:
                - distance (km)
                - duration (minutes)
                - type (str: 'eco' | 'rickshaw' | 'standard' | 'pink-pass')
                - time_of_day / hour_of_day (0-23)
                - day_of_week (0-6, Monday=0)
                - demand_level (optional 'low'/'medium'/'high'/'peak' — live
                  marketplace signal)

        Returns:
            dict with predicted price and breakdown
        """
        distance = float(features.get('distance', 0))
        duration = float(features.get('duration', 0))
        ride_type = str(features.get('type', 'standard')).lower()
        hour_of_day = features.get('hour_of_day', features.get('time_of_day', 12))
        day_of_week = features.get('day_of_week', 0)
        demand_level = features.get('demand_level', 'low')

        type_multiplier = self.TYPE_MULTIPLIERS.get(ride_type, 1.0)
        min_fare = self.MIN_FARES.get(ride_type, 50)

        base_calculation = self.BASE_FARE + (distance * self.RATE_PER_KM) + (duration * self.RATE_PER_MIN)
        formula_fare = base_calculation * type_multiplier

        demand_multiplier = self._demand_multiplier(hour_of_day, day_of_week, demand_level)
        predicted_price = formula_fare * demand_multiplier

        # Cap: demand can never more than double the formula fare, so surge
        # pricing on short trips stays bounded and explainable.
        fare_cap = 2.0 * formula_fare
        cap_applied = predicted_price > fare_cap
        predicted_price = max(min_fare, min(predicted_price, fare_cap))
        predicted_price = round(min(predicted_price, 3000))

        # Breakdown rows must always sum to exactly predicted_price, including
        # after the min-fare floor / cap above (which the raw formula math
        # doesn't account for) — otherwise a rider comparing the receipt's line
        # items against the total sees numbers that don't add up, which reads
        # as "this is fake/hardcoded" even when it isn't.
        breakdown = self._calculate_breakdown(distance, duration, type_multiplier, demand_multiplier, predicted_price)

        return {
            'estimated_price': predicted_price,
            'breakdown': breakdown,
            'currency': 'PKR',
            'demand_multiplier': round(demand_multiplier, 3),
            'rate_calibration_source': self.calibration_source,
            'cap_applied': cap_applied,
            'fare_cap': round(fare_cap, 2)
        }

    def _demand_multiplier(self, hour_of_day, day_of_week, demand_level):
        """Live marketplace signal x a fixed rush-hour heuristic — neither
        claims to be ML, both are honest, explainable real-time adjustments."""
        live_marketplace_multiplier = self.LIVE_DEMAND_MULTIPLIERS.get(demand_level, 1.0)

        is_rush_hour = (7 <= hour_of_day <= 9) or (17 <= hour_of_day <= 20)
        is_friday = day_of_week == 4
        rush_hour_multiplier = 1.4 if is_rush_hour else (1.15 if is_friday else 1.0)

        return min(live_marketplace_multiplier * rush_hour_multiplier, 2.5)

    def _calculate_breakdown(self, distance, duration, type_multiplier, demand_multiplier, predicted_price):
        """Calculate price breakdown. Components are scaled so they always sum
        to exactly `predicted_price` — the raw formula math (base + per-km +
        per-min, each x type_multiplier, plus demand_charge) can land above or
        below that once the min-fare floor / surge cap in predict_price() has
        adjusted the final number, so every component is rescaled by the same
        factor rather than left to silently disagree with the total."""
        base = self.BASE_FARE * type_multiplier
        distance_cost = distance * self.RATE_PER_KM * type_multiplier
        time_cost = duration * self.RATE_PER_MIN * type_multiplier

        subtotal = base + distance_cost + time_cost
        demand_amount = subtotal * (demand_multiplier - 1.0)
        raw_total = subtotal + demand_amount

        scale = (predicted_price / raw_total) if raw_total > 0 else 1.0

        return {
            'base_fare': round(base * scale, 2),
            'distance_cost': round(distance_cost * scale, 2),
            'time_cost': round(time_cost * scale, 2),
            'type_multiplier': round(type_multiplier, 2),
            'demand_charge': round(demand_amount * scale, 2),
        }

# Singleton instance
pricing_service = PricingService()
