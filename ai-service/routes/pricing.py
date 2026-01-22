from flask import Blueprint, request, jsonify
from services.pricing import pricing_service

pricing_bp = Blueprint('pricing', __name__)

@pricing_bp.route('/predict', methods=['POST'])
def predict_price():
    """
    Predict ride price using Linear Regression
    
    Request body:
    {
        "distance": 10.5,
        "duration": 25,
        "time_of_day": 14,
        "day_of_week": 2,
        "demand_level": "medium",
        "origin_area": 0,
        "traffic_multiplier": 1.2
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Request body is required'
            }), 400
        
        # Validate required fields
        required_fields = ['distance', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Get prediction
        result = pricing_service.predict_price(data)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Server error during price prediction',
            'details': str(e)
        }), 500

@pricing_bp.route('/health', methods=['GET'])
def health():
    """Health check for pricing service"""
    return jsonify({
        'status': 'healthy',
        'service': 'price-prediction'
    }), 200
