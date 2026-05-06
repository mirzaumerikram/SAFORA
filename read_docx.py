import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            return ' '.join([node.text for node in tree.findall('.//w:t', ns) if node.text])
    except Exception as e:
        return str(e)

print(get_docx_text('60_percent.docx'))
