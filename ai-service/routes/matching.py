from flask import Blueprint, request, jsonify
from services.driver_matching import driver_matching_service

matching_bp = Blueprint('matching', __name__)

@matching_bp.route('/rank-drivers', methods=['POST'])
def rank_drivers():
    """
    Rank drivers using weighted scoring algorithm
    
    Request body:
    {
        "drivers": [
            {
                "id": "driver_id",
                "location": {"lat": 31.5204, "lng": 74.3587},
                "rating": 4.5,
                "idle_time": 120,
                "total_online_time": 240,
                "gender": "female"
            }
        ],
        "passenger_location": {"lat": 31.5497, "lng": 74.3436},
        "is_pink_pass": false
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Request body is required'
            }), 400
        
        # Validate required fields
        if 'drivers' not in data or 'passenger_location' not in data:
            return jsonify({
                'error': 'Missing required fields: drivers, passenger_location'
            }), 400
        
        drivers = data['drivers']
        passenger_location = data['passenger_location']
        is_pink_pass = data.get('is_pink_pass', False)
        
        if not drivers:
            return jsonify({
                'ranked_drivers': [],
                'count': 0
            }), 200
        
        # Rank drivers
        ranked_drivers = driver_matching_service.rank_drivers(
            drivers,
            passenger_location,
            is_pink_pass
        )
        
        return jsonify({
            'ranked_drivers': ranked_drivers,
            'count': len(ranked_drivers),
            'is_pink_pass': is_pink_pass
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Server error during driver matching',
            'details': str(e)
        }), 500

@matching_bp.route('/health', methods=['GET'])
def health():
    """Health check for matching service"""
    return jsonify({
        'status': 'healthy',
        'service': 'driver-matching'
    }), 200
