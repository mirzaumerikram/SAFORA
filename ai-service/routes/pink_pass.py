from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
from services.liveness_detector import liveness_detector

pink_pass_bp = Blueprint('pink_pass', __name__)

@pink_pass_bp.route('/verify', methods=['POST'])
def verify_pink_pass():
    """
    Verify Pink Pass using liveness detection
    
    Request body:
    {
        "video": "base64_encoded_video",
        "userId": "user_id"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'video' not in data:
            return jsonify({
                'error': 'Video data is required'
            }), 400
        
        video_base64 = data['video']
        user_id = data.get('userId', 'unknown')
        
        # Decode base64 video
        try:
            video_bytes = base64.b64decode(video_base64)
        except Exception as e:
            return jsonify({
                'error': 'Invalid base64 video data',
                'details': str(e)
            }), 400
        
        # Convert video bytes to frames
        # For now, we'll use a simplified approach
        # In production, use OpenCV to extract frames from video
        
        # Placeholder: Create dummy frames for testing
        # TODO: Implement proper video frame extraction
        frames = []
        
        # For testing, create a simple frame from the first part of video
        # In production, extract multiple frames from the video
        nparr = np.frombuffer(video_bytes[:1000], np.uint8)
        
        # Create a dummy frame for testing
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frames = [dummy_frame] * 15  # Simulate 15 frames
        
        # Verify liveness
        result = liveness_detector.verify_liveness(frames)
        
        return jsonify({
            'verified': result['verified'],
            'confidence': result['confidence'],
            'reason': result['reason'],
            'face_detected': result.get('face_detected', False),
            'blink_detected': result.get('blink_detected', False),
            'userId': user_id
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Server error during verification',
            'details': str(e)
        }), 500

@pink_pass_bp.route('/health', methods=['GET'])
def health():
    """Health check for Pink Pass service"""
    return jsonify({
        'status': 'healthy',
        'service': 'pink-pass-verification'
    }), 200
