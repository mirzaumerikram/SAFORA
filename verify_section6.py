from docx import Document

doc = Document('SAFORA_SRS1_IEEE_Format_Complete_Updated.docx')

in_section_6 = False
section_6_content = []

for p in doc.paragraphs:
    text = p.text.strip()
    
    if text.startswith('6.') and 'Revised' in text:
        in_section_6 = True
    
    if in_section_6:
        if text:  # Only add non-empty paragraphs
            section_6_content.append(text)
        
        if text.startswith('7.') or text.startswith('Appendix'):
            break

print("Section 6 Updated Content Preview:")
print("=" * 80)
for i, line in enumerate(section_6_content[:50]):  # Print first 50 lines
    print(f"{i+1:3}. {line[:100]}")
print(f"\nTotal lines in Section 6: {len(section_6_content)}")
