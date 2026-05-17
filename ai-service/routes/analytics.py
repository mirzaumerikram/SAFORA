from flask import Blueprint, request, jsonify
from textblob import TextBlob
import numpy as np
from sklearn.cluster import KMeans

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/sentiment', methods=['POST'])
def analyze_sentiment():
    """
    Analyzes the sentiment of a given text string.
    Returns polarity (-1.0 to 1.0) and a categorical tag (Positive, Neutral, Negative).
    """
    data = request.get_json() or {}
    text = data.get('text', '')
    
    if not text.strip():
        return jsonify({
            'polarity': 0,
            'tag': 'Neutral'
        })
        
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    
    # Thresholds for classification
    if polarity > 0.1:
        tag = 'Positive'
    elif polarity < -0.1:
        tag = 'Negative'
    else:
        tag = 'Neutral'
        
    return jsonify({
        'polarity': polarity,
        'tag': tag
    })

@analytics_bp.route('/cluster-demand', methods=['POST'])
def cluster_demand():
    """
    Takes an array of [lat, lng] coordinates and finds hotspot centers using K-Means.
    """
    data = request.get_json() or {}
    coordinates = data.get('coordinates', [])
    k = data.get('clusters', 3) # Default to finding top 3 hotspots
    
    if not coordinates or len(coordinates) < k:
        return jsonify({
            'hotspots': []
        })
        
    # Convert to numpy array
    X = np.array(coordinates)
    
    try:
        # Run K-Means clustering
        kmeans = KMeans(n_clusters=k, random_state=42, n_init='auto')
        kmeans.fit(X)
        
        # Get the cluster centers (hotspots)
        centers = kmeans.cluster_centers_.tolist()
        
        # Format response
        hotspots = [{'lat': c[0], 'lng': c[1]} for c in centers]
        
        return jsonify({
            'hotspots': hotspots
        })
    except Exception as e:
        print(f"[Analytics] K-Means error: {e}")
        return jsonify({'error': str(e)}), 500
