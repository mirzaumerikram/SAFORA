"""
Analyze sample SRS2.pdf to identify all required content and diagrams
"""
import fitz  # PyMuPDF
import re

# Open PDF
doc = fitz.open(r'C:\Users\mzees\OneDrive\Desktop\SAFORA\docs\SRS2.pdf')

print(f"Total pages: {len(doc)}\n")
print("="*80)

# Extract headings and diagram references
diagrams_found = []
sections_found = []

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    
    # Look for figure references
    figures = re.findall(r'(Fig(?:ure)?\.?\s*\d+[:\.]?\s*[^\n]+)', text, re.IGNORECASE)
    for fig in figures:
        if fig not in diagrams_found:
            diagrams_found.append(fig)
    
    # Look for major headings (numbered sections)
    headings = re.findall(r'^(\d+\.(?:\d+\.)*\s+[A-Z][^\n]{5,60})', text, re.MULTILINE)
    for heading in headings:
        if heading not in sections_found:
            sections_found.append(heading)

print("\nFIGURES/DIAGRAMS FOUND:")
print("="*80)
for i, fig in enumerate(diagrams_found[:30], 1):  # First 30
    print(f"{i}. {fig[:100]}")

print("\n\nSECTIONS FOUND:")
print("="*80)
for i, section in enumerate(sections_found[:40], 1):  # First 40
    print(f"{i}. {section}")

print("\n\nKEY STATISTICS:")
print("="*80)
print(f"Total pages: {len(doc)}")
print(f"Total diagrams referenced: {len(diagrams_found)}")
print(f"Total sections found: {len(sections_found)}")

doc.close()
