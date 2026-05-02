from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
import os
import uuid
import tempfile
from services.liveness_detector import liveness_detector
from services.cnic_verifier import cnic_verifier

pink_pass_bp = Blueprint('pink_pass', __name__)

@pink_pass_bp.route('/verify-frames', methods=['POST'])
def verify_pink_pass_frames():
    """
    Verify Pink Pass using individual captured frames + optional CNIC photo.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        frame_b64_list = data.get('frames', [])
        cnic_b64       = data.get('cnic', None)
        user_id        = data.get('userId', 'unknown')

        verification_results = {
            "liveness": {"verified": False, "confidence": 0},
            "cnic": {"verified": False, "details": None}
        }

        # 1. Verify Liveness if frames provided
        if frame_b64_list and len(frame_b64_list) >= 3:
            frames = []
            for b64 in frame_b64_list:
                try:
                    if ',' in b64: b64 = b64.split(',', 1)[1]
                    img_bytes = base64.b64decode(b64)
                    img_arr   = np.frombuffer(img_bytes, dtype=np.uint8)
                    frame     = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
                    if frame is not None: frames.append(frame)
                except: continue
            
            if len(frames) >= 3:
                liveness_res = liveness_detector.verify_liveness(frames)
                verification_results["liveness"] = liveness_res

        # 2. Verify CNIC if provided
        if cnic_b64:
            try:
                if ',' in cnic_b64: cnic_b64 = cnic_b64.split(',', 1)[1]
                cnic_bytes = base64.b64decode(cnic_b64)
                cnic_arr   = np.frombuffer(cnic_bytes, dtype=np.uint8)
                cnic_img   = cv2.imdecode(cnic_arr, cv2.IMREAD_COLOR)
                
                if cnic_img is not None:
                    cnic_res = cnic_verifier.verify_cnic(cnic_img)
                    verification_results["cnic"] = {
                        "verified": cnic_res.get("is_female", False) and cnic_res.get("is_valid_document", False),
                        "details": cnic_res
                    }
            except Exception as e:
                print(f"[verify-frames] CNIC processing failed: {e}")

        # Final decision
        # For auto-verification, both should be true. 
        # If one is false, it might still go to admin review depending on confidence.
        overall_verified = verification_results["liveness"]["verified"] and \
                          (verification_results["cnic"]["verified"] if cnic_b64 else True)

        return jsonify({
            'verified':       overall_verified,
            'liveness':       verification_results["liveness"],
            'cnic':           verification_results["cnic"],
            'userId':         user_id,
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

@pink_pass_bp.route('/health', methods=['GET'])
def health():
    """Health check for Pink Pass service"""
    return jsonify({
        'status': 'healthy',
        'service': 'pink-pass-verification'
    }), 200
