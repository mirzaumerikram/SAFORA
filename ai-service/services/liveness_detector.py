import cv2
import numpy as np
import mediapipe as mp
import os
import traceback

# Import DeepFace for gender classification. 
# It will automatically download the facial recognition weights on first run.
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("Warning: DeepFace not installed. Gender classification will be skipped.")

class LivenessDetector:
    def __init__(self):
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        # We only need 1 face, and we want higher accuracy
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Left eye landmark indices in MediaPipe Face Mesh
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        # Right eye landmark indices in MediaPipe Face Mesh
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]
        
        # EAR threshold to indicate a blink (eyes closed)
        self.EAR_THRESHOLD = 0.21
        
    def _euclidean_distance(self, p1, p2):
        return np.linalg.norm(np.array(p1) - np.array(p2))
        
    def _calculate_ear(self, landmarks, eye_indices, frame_width, frame_height):
        """
        Calculate Eye Aspect Ratio (EAR) for a single eye
        """
        # Get coordinates
        pts = []
        for idx in eye_indices:
            landmark = landmarks.landmark[idx]
            x = int(landmark.x * frame_width)
            y = int(landmark.y * frame_height)
            pts.append((x, y))
            
        # Vertical distances
        v1 = self._euclidean_distance(pts[1], pts[5])
        v2 = self._euclidean_distance(pts[2], pts[4])
        
        # Horizontal distance
        h = self._euclidean_distance(pts[0], pts[3])
        
        # EAR formula
        ear = (v1 + v2) / (2.0 * h)
        return ear

    def detect_gender(self, frame):
        """
        Use DeepFace to classify the gender of the face in the frame.
        Returns: True if female, False otherwise, and the confidence score.
        """
        if not DEEPFACE_AVAILABLE:
            print("DeepFace not available. Bypassing gender check.")
            return True, 1.0, "DeepFace not installed"
            
        try:
            # DeepFace.analyze expects BGR image (OpenCV format)
            # enforce_detection=False so it doesn't crash if face is slightly out of frame
            results = DeepFace.analyze(
                img_path=frame, 
                actions=['gender'], 
                enforce_detection=True,
                silent=True
            )
            
            # DeepFace can return a list if multiple faces are found. Grab the first.
            if isinstance(results, list):
                result = results[0]
            else:
                result = results
                
            gender_dict = result.get('gender', {})
            
            # DeepFace returns {'Woman': 99.9, 'Man': 0.1}
            woman_confidence = gender_dict.get('Woman', 0.0)
            man_confidence = gender_dict.get('Man', 0.0)
            
            is_female = woman_confidence > man_confidence and woman_confidence > 80.0
            
            return is_female, woman_confidence, "Gender verified" if is_female else "Gender mismatch"
            
        except Exception as e:
            print(f"Gender classification error: {str(e)}")
            traceback.print_exc()
            return False, 0.0, f"Gender detection failed: {str(e)}"

    def verify_liveness(self, video_frames):
        """
        Main verification method that checks BOTH Liveness (blinking) and Gender.
        Args:
            video_frames: List of image arrays (BGR format) from OpenCV
        Returns:
            dict with verification result
        """
        if not video_frames or len(video_frames) < 5:
            return {
                'verified': False,
                'reason': 'Insufficient video frames extracted',
                'confidence': 0.0
            }
            
        blink_detected = False
        face_detected = False
        ear_history = []
        
        # 1. Check Liveness (Blink Detection) across all frames
        for frame in video_frames:
            # MediaPipe needs RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            
            if results.multi_face_landmarks:
                face_detected = True
                landmarks = results.multi_face_landmarks[0]
                h, w, _ = frame.shape
                
                left_ear = self._calculate_ear(landmarks, self.LEFT_EYE, w, h)
                right_ear = self._calculate_ear(landmarks, self.RIGHT_EYE, w, h)
                
                avg_ear = (left_ear + right_ear) / 2.0
                ear_history.append(avg_ear)
                
        # Analyze EAR history to find a blink
        # A blink is a drop in EAR followed by a rise
        if face_detected and len(ear_history) > 3:
            for i in range(1, len(ear_history) - 1):
                # If current EAR is below threshold, and previous/next are higher
                if ear_history[i] < self.EAR_THRESHOLD:
                    if ear_history[i-1] > ear_history[i] and ear_history[i+1] >= ear_history[i]:
                        blink_detected = True
                        break
                        
        if not face_detected:
            return {
                'verified': False,
                'reason': 'No face detected in video',
                'confidence': 0.0,
                'face_detected': False,
                'blink_detected': False
            }
            
        if not blink_detected:
             return {
                'verified': False,
                'reason': 'Liveness failed. No natural blink detected. Please record a real video.',
                'confidence': 0.0,
                'face_detected': True,
                'blink_detected': False
            }

        # 2. Check Gender on the clearest frame (usually the middle one)
        middle_idx = len(video_frames) // 2
        best_frame = video_frames[middle_idx]
        
        is_female, gender_confidence, gender_reason = self.detect_gender(best_frame)
        
        if not is_female:
            return {
                'verified': False,
                'reason': f'Pink Pass is for females only. {gender_reason}',
                'confidence': gender_confidence,
                'face_detected': True,
                'blink_detected': True
            }

        # If we made it here, it's a real live female!
        return {
            'verified': True,
            'face_detected': True,
            'blink_detected': True,
            'confidence': gender_confidence, # Use gender confidence as the primary confidence metric
            'reason': 'Pink Pass Biometric Verification Successful'
        }

# Singleton instance
liveness_detector = LivenessDetector()
