import easyocr
import cv2
import numpy as np
import re

class CNICVerifier:
    def __init__(self):
        # Initialize reader for English and Urdu (though Urdu support is basic)
        self.reader = easyocr.Reader(['en'])
        
    def verify_cnic(self, image_data):
        """
        Extracts details from CNIC image and verifies gender.
        :param image_data: OpenCV image array
        :return: dict with extracted details and verification status
        """
        try:
            # Perform OCR
            results = self.reader.readtext(image_data)
            extracted_text = " ".join([res[1] for res in results])
            
            # 1. Detect Gender
            is_female = False
            if re.search(r'Female|F', extracted_text, re.IGNORECASE):
                is_female = True
            
            # 2. Extract CNIC Number (Format: 00000-0000000-0)
            cnic_match = re.search(r'\d{5}-\d{7}-\d', extracted_text)
            cnic_number = cnic_match.group(0) if cnic_match else "Not Found"
            
            # 3. Detect "Identity Card" text to confirm it's a CNIC
            is_valid_doc = False
            if re.search(r'Identity|Card|Pakistan', extracted_text, re.IGNORECASE):
                is_valid_doc = True

            # Logic: In Pakistan, odd last digit = Male, even last digit = Female (usually)
            # But we rely primarily on the "Gender" field from OCR.
            
            return {
                "success": True,
                "is_female": is_female,
                "cnic_number": cnic_number,
                "is_valid_document": is_valid_doc,
                "raw_text": extracted_text[:200], # for debugging
                "confidence": 0.85 if is_female and is_valid_doc else 0.4
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "is_female": False
            }

cnic_verifier = CNICVerifier()
