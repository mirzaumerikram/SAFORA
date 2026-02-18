from docx import Document

doc = Document('SAFORA_SRS1_IEEE_Format_Complete.docx')

in_section_6 = False
section_6_content = []

for p in doc.paragraphs:
    text = p.text.strip()
    
    if '6.' in text[:5] and 'Revised' in text:
        in_section_6 = True
    
    if in_section_6:
        section_6_content.append(text)
        
        if text.startswith('7.') or text.startswith('Appendix'):
            break

print("Section 6 Content:")
print("=" * 80)
for line in section_6_content[:30]:  # Print first 30 lines
    print(line)
