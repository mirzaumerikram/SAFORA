import zipfile
import xml.etree.ElementTree as ET
import sys
import io

def read_docx(path):
    try:
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        
        # The namespace for Word XML
        namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        paragraphs = []
        for paragraph in tree.findall('.//w:p', namespace):
            texts = [node.text for node in paragraph.findall('.//w:t', namespace) if node.text]
            if texts:
                paragraphs.append(''.join(texts))
                
        # Return properly encoded text handling ascii encoding errors
        return '\n'.join(paragraphs)
    except Exception as e:
        return f"Error reading document: {e}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Reconfigure stdout to utf-8 to avoid console printing errors on windows
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        print(read_docx(sys.argv[1]))
