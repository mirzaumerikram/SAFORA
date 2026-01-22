import fitz  # PyMuPDF

# Open PDF
doc = fitz.open(r'C:\Users\mzees\OneDrive\Desktop\SAFORA\docs\SRS2.pdf')

print(f"Total pages: {len(doc)}\n")

# Extract text from each page
for page_num in range(min(20, len(doc))):
    page = doc[page_num]
    text = page.get_text()
    print(f"\n{'='*60}")
    print(f"PAGE {page_num + 1}")
    print('='*60)
    print(text[:2000])  # First 2000 characters of each page
    
doc.close()
