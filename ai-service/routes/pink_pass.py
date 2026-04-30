from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
import os
import uuid
import tempfile
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
        frames = []
        temp_filename = os.path.join(tempfile.gettempdir(), f"temp_video_{uuid.uuid4().hex}.mp4")
        
        try:
            with open(temp_filename, 'wb') as f:
                f.write(video_bytes)
            
            # Extract frames using OpenCV
            cap = cv2.VideoCapture(temp_filename)
            frame_count = 0
            # Read every nth frame to reduce processing time (e.g., 5 fps if video is 30fps)
            frame_skip = 5 
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count % frame_skip == 0:
                    frames.append(frame)
                frame_count += 1
                
                if len(frames) > 50:  # Cap at 50 frames to avoid memory issues
                    break
                    
            cap.release()
        finally:
            if os.path.exists(temp_filename):
                try:
                    os.remove(temp_filename)
                except Exception as e:
                    print(f"Error removing temp file: {e}")
        
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

@pink_pass_bp.route('/verify-frames', methods=['POST'])
def verify_pink_pass_frames():
    """
    Verify Pink Pass using individual captured frames (for web PWA + mobile).
    Accepts an array of base64 JPEG images instead of a video file.

    Request body:
    {
        "frames": ["base64_img1", "base64_img2", ...],
        "userId": "user_id"
    }
    """
    try:
        data = request.get_json()

        if not data or 'frames' not in data:
            return jsonify({'error': 'frames array is required'}), 400

        frame_b64_list = data['frames']
        user_id        = data.get('userId', 'unknown')

        if not isinstance(frame_b64_list, list) or len(frame_b64_list) < 3:
            return jsonify({
                'verified':  False,
                'reason':    'At least 3 frames are required for liveness detection.',
                'confidence': 0.0,
            }), 400

        # Decode each base64 image into an OpenCV frame
        frames = []
        for b64 in frame_b64_list:
            try:
                # Handle data-URI prefix if present (e.g., "data:image/jpeg;base64,...")
                if ',' in b64:
                    b64 = b64.split(',', 1)[1]
                img_bytes = base64.b64decode(b64)
                img_arr   = np.frombuffer(img_bytes, dtype=np.uint8)
                frame     = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
                if frame is not None:
                    frames.append(frame)
            except Exception as e:
                print(f"[verify-frames] skipping bad frame: {e}")
                continue

        if len(frames) < 3:
            return jsonify({
                'verified':  False,
                'reason':    'Could not decode enough valid frames. Ensure camera is working.',
                'confidence': 0.0,
            }), 400

        # Run liveness + gender verification
        result = liveness_detector.verify_liveness(frames)

        return jsonify({
            'verified':       result['verified'],
            'confidence':     result['confidence'],
            'reason':         result['reason'],
            'face_detected':  result.get('face_detected', False),
            'blink_detected': result.get('blink_detected', False),
            'frames_used':    len(frames),
            'userId':         user_id,
        }), 200

    except Exception as e:
        return jsonify({
            'error':   'Server error during frame verification',
            'details': str(e),
        }), 500


@pink_pass_bp.route('/health', methods=['GET'])
def health():
    """Health check for Pink Pass service"""
    return jsonify({
        'status': 'healthy',
        'service': 'pink-pass-verification'
    }), 200
