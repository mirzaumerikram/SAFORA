import re
import os
from fpdf import FPDF
from fpdf.fonts import FontFace
from fpdf.enums import Align

class UseCasePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            self.set_font('helvetica', 'B', 16)
            self.cell(0, 10, 'SAFORA - 30 Detailed Use Cases', new_x="LMARGIN", new_y="NEXT", align='C')
            self.ln(5)

    def chapter_title(self, label):
        self.set_font('helvetica', 'B', 14)
        self.cell(0, 10, label, new_x="LMARGIN", new_y="NEXT", align='L')
        self.ln(2)

def generate_pdf(use_cases, output_path):
    pdf = UseCasePDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    for i, uc in enumerate(use_cases):
        pdf.add_page()
        pdf.chapter_title(f"3.{i+1} {uc['Name']}")
        
        # 1. Base Info Table
        with pdf.table(col_widths=(40, 140), text_align="LEFT", border=1, padding=2) as table:
            row = table.row()
            row.cell("Identifier", style=FontFace(emphasis="BOLD"))
            row.cell(uc['Identifier'])
            
            row = table.row()
            row.cell("Purpose", style=FontFace(emphasis="BOLD"))
            row.cell(uc['Purpose'])
            
            row = table.row()
            row.cell("Priority", style=FontFace(emphasis="BOLD"))
            row.cell(uc['Priority'])
            
            row = table.row()
            row.cell("Pre-conditions", style=FontFace(emphasis="BOLD"))
            row.cell(uc['Pre-conditions'])
            
            row = table.row()
            row.cell("Post-conditions", style=FontFace(emphasis="BOLD"))
            row.cell(uc['Post-conditions'])
            
        pdf.ln(5)
        
        # 2. Typical Course of Action
        if uc['Typical']:
            pdf.set_font('helvetica', 'B', 12)
            pdf.cell(0, 10, "Typical Course of Action", new_x="LMARGIN", new_y="NEXT")
            with pdf.table(col_widths=(10, 85, 85), text_align=("CENTER", "LEFT", "LEFT"), border=1, padding=2) as table:
                header = table.row()
                header.cell("S#", style=FontFace(emphasis="BOLD"))
                header.cell("Actor Action", style=FontFace(emphasis="BOLD"))
                header.cell("System Response", style=FontFace(emphasis="BOLD"))
                
                for step in uc['Typical']:
                    row = table.row()
                    for cell_data in step:
                        row.cell(cell_data)
        
        pdf.ln(5)
        
        # 3. Alternate Course of Action
        if uc['Alternate']:
            pdf.set_font('helvetica', 'B', 12)
            pdf.cell(0, 10, "Alternate Course of Action", new_x="LMARGIN", new_y="NEXT")
            with pdf.table(col_widths=(10, 85, 85), text_align=("CENTER", "LEFT", "LEFT"), border=1, padding=2) as table:
                header = table.row()
                header.cell("S#", style=FontFace(emphasis="BOLD"))
                header.cell("Actor Action", style=FontFace(emphasis="BOLD"))
                header.cell("System Response", style=FontFace(emphasis="BOLD"))
                
                for step in uc['Alternate']:
                    row = table.row()
                    for cell_data in step:
                        row.cell(cell_data)

    pdf.output(output_path)

def parse_md_to_use_cases(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    sections = re.split(r'### \d+\.\d+ ', content)[1:]
    use_cases = []

    for section in sections:
        lines = section.split('\n')
        name = lines[0].strip()
        
        uc_data = {'Name': name, 'Typical': [], 'Alternate': []}

        # Extract Fields
        for field in ['Identifier', 'Purpose', 'Priority', 'Pre-conditions', 'Post-conditions']:
            match = re.search(fr'\*\*{field}\*\* \| (.*?)(?:\s*\|)?$', section, re.MULTILINE)
            uc_data[field] = match.group(1).strip().replace('|', '').strip() if match else ''

        # Extract Tables
        # Typical
        typ_match = re.search(r'\*\*Typical Course of Action\*\*\n\| S# \| Actor Action \| System Response \|\n\| :--- \| :--- \| :--- \|\n(.*?)(?=\n\n\*\*Alt|\n\n---|$)', section, re.DOTALL)
        if typ_match:
            for line in typ_match.group(1).strip().split('\n'):
                parts = [p.strip() for p in line.split('|')[1:-1]]
                if len(parts) == 3: uc_data['Typical'].append(parts)

        # Alternate
        alt_match = re.search(r'\*\*Alternate Course of Action\*\*\n\| S# \| Actor Action \| System Response \|\n\| :--- \| :--- \| :--- \|\n(.*?)(?=\n\n---|$)', section, re.DOTALL)
        if alt_match:
            for line in alt_match.group(1).strip().split('\n'):
                parts = [p.strip() for p in line.split('|')[1:-1]]
                if len(parts) == 3: uc_data['Alternate'].append(parts)

        use_cases.append(uc_data)
    
    return use_cases

if __name__ == "__main__":
    md_file = "SAFORA_30_Use_Cases.md"
    output_pdf = "SAFORA_30_Use_Cases.pdf"
    
    if os.path.exists(md_file):
        data = parse_md_to_use_cases(md_file)
        generate_pdf(data, output_pdf)
        print(f"Successfully generated {output_pdf}")
    else:
        print(f"Error: {md_file} not found")
