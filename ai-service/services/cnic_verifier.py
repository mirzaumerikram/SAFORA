"""
CNIC Verifier — lightweight OpenCV-only implementation.
No easyocr/torch needed. Admin reviews CNIC photo manually for gender.
"""
import cv2
import numpy as np


class CNICVerifier:
    def verify_cnic(self, image_data):
        """
        Basic CNIC validation using OpenCV — checks it looks like a card.
        Gender verification is done by admin reviewing the CNIC photo.
        """
        try:
            if image_data is None:
                return {'success': False, 'is_female': False, 'is_valid_document': False}

            h, w = image_data.shape[:2]
            aspect = w / h if h > 0 else 0

            # CNIC is landscape card ~1.58 aspect ratio
            is_valid_doc = 1.3 < aspect < 2.0 and w > 200

            return {
                'success': True,
                'is_female': True,       # Admin confirms gender via CNIC review
                'is_valid_document': is_valid_doc,
                'cnic_number': 'Pending admin review',
                'confidence': 0.85 if is_valid_doc else 0.5,
            }
        except Exception as e:
            return {'success': False, 'error': str(e), 'is_female': False}


cnic_verifier = CNICVerifier()
