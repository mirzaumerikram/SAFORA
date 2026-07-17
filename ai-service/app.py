from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB

# Pink Pass verification (MediaPipe + DeepFace)
from routes.pink_pass import pink_pass_bp
app.register_blueprint(pink_pass_bp, url_prefix='/api/pink-pass')

# Pricing — ML Model Integration
from flask import Blueprint
import joblib
import numpy as np
import datetime
import os

pricing_bp = Blueprint('pricing', __name__)

# Load the ML model at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'price_model.pkl')
try:
    price_model = joblib.load(MODEL_PATH)
    print(f"[AI Service] Successfully loaded ML pricing model from {MODEL_PATH}")
except Exception as e:
    print(f"[AI Service] Warning: Could not load price_model.pkl: {e}. Will use fallback formula.")
    price_model = None

# Applied as an explicit multiplier on the standard fare, model and fallback formula
# both use this, rather than trusting the trained model's raw ordinal ride_type
# feature, which cannot reliably encode a clean per-type discount or premium.
TYPE_MULTIPLIERS = {
    'eco':       0.55,  # bike, cheapest option
    'rickshaw':  0.75,  # between bike and car
    'standard':  1.0,   # car, baseline
    'pink-pass': 1.15,  # verified female driver, premium
}

@pricing_bp.route('/predict', methods=['POST'])
def predict_price():
    data = request.get_json() or {}
    distance_km = float(data.get('distance', 5))
    duration_min = float(data.get('duration', 15))
    
    if price_model is not None:
        try:
            # Extract real-time features for the ML model
            now = datetime.datetime.now()
            time_of_day = now.hour
            day_of_week = now.weekday() # 0 = Monday, 6 = Sunday

            # Demand score: prefer the real marketplace signal computed by the
            # backend (actual online drivers vs active ride requests near the
            # pickup point) over a fixed time-of-day guess. Only fall back to
            # the rush-hour heuristic if the caller did not supply one.
            demand_level_map = {'low': 0, 'medium': 1, 'high': 2, 'peak': 3}
            demand_level_str = data.get('demand_level')
            if demand_level_str in demand_level_map:
                demand_score = demand_level_map[demand_level_str]
            else:
                demand_score = 0
                if (7 <= time_of_day <= 9) or (17 <= time_of_day <= 20):
                    demand_score = 2 # High demand (rush hour)
                elif day_of_week == 4: # Friday
                    demand_score = 1 # Medium demand

            # Ride type parsing. The model treats ride_type as a raw ordinal number
            # (0/1/2), which a linear regression cannot reliably turn into a clean
            # per-type discount or premium, in practice this made eco land more
            # expensive than rickshaw for some trips, and pink-pass land cheaper
            # than standard. So the model is only ever asked to predict the
            # standard (ride_type=0) fare, and every type's real price is that
            # standard fare times an explicit, easy-to-explain multiplier below.
            ride_type_str = data.get('type', 'standard').lower()
            type_multiplier = TYPE_MULTIPLIERS.get(ride_type_str, 1.0)

            traffic_multiplier = float(data.get('traffic', 1.2))

            # Build feature array to match the training data. ride_type is always 0
            # (standard) here, see comment above.
            features = np.array([[
                distance_km,
                duration_min,
                time_of_day,
                day_of_week,
                demand_score,
                0,
                traffic_multiplier
            ]])

            # Predict the standard fare, then apply the explicit type multiplier.
            predicted = price_model.predict(features)[0] * type_multiplier

            estimated_price = round(max(50, min(predicted, 3000))) # enforce bounds

            return jsonify({
                'estimated_price': estimated_price,
                'currency': 'PKR',
                'method': 'ai_ml_model',
                'demand_score': demand_score,
                'demand_source': 'live_marketplace' if demand_level_str in demand_level_map else 'time_of_day_heuristic'
            })
        except Exception as e:
            print(f"[AI Service] ML prediction failed: {e}")
            
    # Fallback math formula if model fails or isn't loaded
    fallback_type = data.get('type', 'standard').lower()
    estimated_price = (distance_km * 35) + (duration_min * 5) + 50
    estimated_price = estimated_price * TYPE_MULTIPLIERS.get(fallback_type, 1.0)
    estimated_price = round(estimated_price)
    return jsonify({
        'estimated_price': estimated_price,
        'currency': 'PKR', 
        'method': 'fallback_formula'
    })

app.register_blueprint(pricing_bp, url_prefix='/api/pricing')

# Matching — simple nearest-first fallback
matching_bp = Blueprint('matching', __name__)

@matching_bp.route('/rank-drivers', methods=['POST'])
def rank_drivers():
    data = request.get_json() or {}
    drivers = data.get('drivers', [])
    ranked = sorted(drivers, key=lambda d: d.get('distance', 999))
    return jsonify({'ranked_drivers': ranked})

app.register_blueprint(matching_bp, url_prefix='/api/matching')

# Analytics — NLP Sentiment and K-Means Clustering
from routes.analytics import analytics_bp
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')


@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'SAFORA AI Service',
        'version': '2.0.0',
        'endpoints': [
            '/api/pink-pass/verify-frames',
            '/api/pricing/predict',
            '/api/matching/rank-drivers',
        ]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
