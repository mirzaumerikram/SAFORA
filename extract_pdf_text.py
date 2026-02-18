import PyPDF2
import os

pdf_path = r'c:\Users\mzees\OneDrive\Desktop\SAFORA\docs\SAFORA ppts.pdf'
output_path = r'c:\Users\mzees\OneDrive\Desktop\SAFORA\docs\SAFORA_ppts_extracted.txt'

def extract_text():
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found")
        return
    
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for i, page in enumerate(reader.pages):
                text += f"\n--- Page {i+1} ---\n"
                text += page.extract_text()
            
            with open(output_path, 'w', encoding='utf-8') as out:
                out.write(text)
            print(f"Extracted text to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_text()
