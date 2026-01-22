import cv2
import numpy as np
from tensorflow import keras
import os

class LivenessDetector:
    def __init__(self):
        # Load Haar Cascade for face detection
        cascade_path = os.getenv('FACE_CASCADE_PATH', 'models/haarcascade_frontalface_default.xml')
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Load CNN model for liveness detection (to be trained)
        model_path = os.getenv('PINK_PASS_MODEL_PATH', 'models/liveness_model.h5')
        if os.path.exists(model_path):
            self.liveness_model = keras.models.load_model(model_path)
        else:
            self.liveness_model = None
            print("Warning: Liveness model not found. Using placeholder logic.")
    
    def detect_face(self, image):
        """
        Detect face in image using Haar Cascade
        Returns: face coordinates or None
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return None
        
        # Return the largest face
        faces_sorted = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
        return faces_sorted[0]
    
    def calculate_eye_aspect_ratio(self, eye_landmarks):
        """
        Calculate Eye Aspect Ratio (EAR) for blink detection
        EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
        """
        # Vertical eye landmarks
        A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        
        # Horizontal eye landmark
        C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        
        ear = (A + B) / (2.0 * C)
        return ear
    
    def detect_blink(self, frames):
        """
        Detect blink in video frames
        Returns: True if blink detected, False otherwise
        """
        EAR_THRESHOLD = 0.25
        MIN_BLINKS = 2
        
        blink_count = 0
        prev_ear = 0.3
        
        for frame in frames:
            face = self.detect_face(frame)
            if face is None:
                continue
            
            # Extract face region
            (x, y, w, h) = face
            face_region = frame[y:y+h, x:x+w]
            
            # Simplified blink detection (in production, use dlib or MediaPipe)
            # For now, we'll use a placeholder
            # TODO: Implement proper eye landmark detection
            
        return blink_count >= MIN_BLINKS
    
    def verify_liveness(self, video_frames):
        """
        Main liveness verification method
        Args:
            video_frames: List of image arrays (BGR format)
        Returns:
            dict with verification result
        """
        if len(video_frames) < 10:
            return {
                'verified': False,
                'reason': 'Insufficient frames',
                'confidence': 0.0
            }
        
        # Step 1: Detect face in first frame
        first_frame = video_frames[0]
        face = self.detect_face(first_frame)
        
        if face is None:
            return {
                'verified': False,
                'reason': 'No face detected',
                'confidence': 0.0
            }
        
        # Step 2: Check for blink (simplified for now)
        # TODO: Implement proper blink detection with eye landmarks
        blink_detected = self.detect_blink(video_frames)
        
        # Step 3: If model exists, use CNN for liveness classification
        if self.liveness_model:
            # Preprocess frame for model
            (x, y, w, h) = face
            face_crop = first_frame[y:y+h, x:x+w]
            face_resized = cv2.resize(face_crop, (224, 224))
            face_normalized = face_resized / 255.0
            face_batch = np.expand_dims(face_normalized, axis=0)
            
            # Predict
            prediction = self.liveness_model.predict(face_batch)
            confidence = float(prediction[0][0])
            
            is_live = confidence > 0.7
        else:
            # Placeholder logic
            is_live = True
            confidence = 0.85
        
        return {
            'verified': is_live and blink_detected,
            'face_detected': True,
            'blink_detected': blink_detected,
            'confidence': confidence,
            'reason': 'Verification successful' if is_live else 'Liveness check failed'
        }

# Singleton instance
liveness_detector = LivenessDetector()
