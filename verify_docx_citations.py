from docx import Document
import os

def verify_docx(path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    doc = Document(path)
    citations = ["[1]", "[7]"]
    
    print(f"Searching for {citations} in the body of {path}...")
    
    for para in doc.paragraphs:
        # Ignore the References section (Section 7) to check if they are in the body
        if "7. REFERENCES" in para.text:
            print("--- Reached References Section ---")
        
        for c in citations:
            if c in para.text:
                print(f"Found {c} in paragraph: '{para.text[:100]}...'")

if __name__ == "__main__":
    verify_docx("SAFORA_SRS1_IEEE_Format_Complete_Final.docx")
