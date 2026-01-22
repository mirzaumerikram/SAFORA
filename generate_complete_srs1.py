"""
Complete SRS1 Document Generator for SAFORA Project (v3)
Generates IEEE-formatted Word document with:
- Dynamic Table of Contents
- Headers (on subsequent pages)
- Footers with Page Numbers
- Professional Styling
"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def set_cell_border(cell, **kwargs):
    """Set cell borders"""
    tc = cell._element
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_element = OxmlElement(f'w:{edge}')
        edge_element.set(qn('w:val'), 'single')
        edge_element.set(qn('w:sz'), '4')
        edge_element.set(qn('w:space'), '0')
        edge_element.set(qn('w:color'), '000000')
        tcBorders.append(edge_element)
    
    tcPr.append(tcBorders)

def add_table_with_data(doc, headers, rows, col_widths=None):
    """Create a formatted table"""
    table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    if col_widths:
        for i, width in enumerate(col_widths):
            for cell in table.columns[i].cells:
                cell.width = Cm(width)
    
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_border(cell)
    
    for row_idx, row_data in enumerate(rows):
        for col_idx, cell_data in enumerate(row_data):
            cell = table.rows[row_idx + 1].cells[col_idx]
            cell.text = str(cell_data)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_border(cell)
    
    return table

def create_element(name):
    return OxmlElement(name)

def create_attribute(element, name, value):
    element.set(qn(name), value)

def add_page_number(paragraph):
    """Add dynamic page number"""
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
    # Add simple text
    run = paragraph.add_run()
    
    # Start Field
    fldChar1 = create_element('w:fldChar')
    create_attribute(fldChar1, 'w:fldCharType', 'begin')
    
    # Field Instr
    instrText = create_element('w:instrText')
    create_attribute(instrText, 'xml:space', 'preserve')
    instrText.text = "PAGE"
    
    # Separator
    fldChar2 = create_element('w:fldChar')
    create_attribute(fldChar2, 'w:fldCharType', 'separate')
    
    # End Field
    fldChar3 = create_element('w:fldChar')
    create_attribute(fldChar3, 'w:fldCharType', 'end')
    
    run._element.append(fldChar1)
    run._element.append(instrText)
    run._element.append(fldChar2)
    run._element.append(fldChar3)

def add_toc(doc):
    """Insert native TOC field"""
    paragraph = doc.add_paragraph()
    run = paragraph.add_run()
    
    fldChar1 = create_element('w:fldChar')
    create_attribute(fldChar1, 'w:fldCharType', 'begin')
    
    instrText = create_element('w:instrText')
    create_attribute(instrText, 'xml:space', 'preserve')
    instrText.text = 'TOC \\o "1-3" \\h \\z \\u'
    
    fldChar2 = create_element('w:fldChar')
    create_attribute(fldChar2, 'w:fldCharType', 'separate')
    
    fldChar3 = create_element('w:fldChar')
    create_attribute(fldChar3, 'w:fldCharType', 'end')
    
    run._element.append(fldChar1)
    run._element.append(instrText)
    run._element.append(fldChar2)
    run._element.append(fldChar3)

def set_update_fields_on_open(doc):
    """Force TOC update on open"""
    settings = doc.settings.element
    element_proxy = create_element('w:updateFields')
    create_attribute(element_proxy, 'w:val', 'true')
    settings.append(element_proxy)

# ==================== MAIN SCRIPT ====================
doc = Document()

# Set default font
style = doc.styles['Normal']
font = style.font
font.name = 'Times New Roman'
font.size = Pt(12)

# ==================== HEADERS & FOOTERS ====================
# Configure to have a different first page (Title page has no H/F)
section = doc.sections[0]
section.different_first_page_header_footer = True

# Header for subsequent pages
header = section.header
header_para = header.paragraphs[0]
header_para.text = "SAFORA (Smart Ride) - SRS Phase 1"
header_para.style = doc.styles['Header']
header_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT

# Footer for subsequent pages
footer = section.footer
footer_para = footer.paragraphs[0]
footer_para.text = "Group ID: 11\tPage "
footer_para.style = doc.styles['Footer']

# Add page number field
add_page_number(footer_para)

# Adjust tab stops for footer to align text left and page number right
tab_stops = footer_para.paragraph_format.tab_stops
tab_stops.add_tab_stop(Inches(6.5), WD_TAB_ALIGNMENT.RIGHT)

# ==================== TITLE PAGE ====================
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_run = title.add_run('SAFORA (Smart Ride)\n')
title_run.font.size = Pt(20)
title_run.font.bold = True
title_run.font.name = 'Times New Roman'

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle_run = subtitle.add_run('Software Requirements Specification\nPhase 1')
subtitle_run.font.size = Pt(18)
subtitle_run.font.bold = True
subtitle_run.font.name = 'Times New Roman'

doc.add_paragraph()
doc.add_paragraph()

uni = doc.add_paragraph()
uni.alignment = WD_ALIGN_PARAGRAPH.CENTER
uni_run = uni.add_run('University of Central Punjab\n')
uni_run.font.bold = True
uni_run.font.size = Pt(14)
uni.add_run('Faculty of Information Technology\n').font.size = Pt(12)
uni.add_run('Department of Computer Science').font.size = Pt(12)

doc.add_paragraph()
doc.add_paragraph()

details = doc.add_paragraph()
details.alignment = WD_ALIGN_PARAGRAPH.CENTER
details.add_run('Project Title: ').font.bold = True
details.add_run('SAFORA - Smart Ride\n\n')
details.add_run('Project Advisor: ').font.bold = True
details.add_run('Tanveer Ahmed\n\n')
details.add_run('Group ID: ').font.bold = True
details.add_run('11\n\n')

team = details.add_run('Team Members:\n')
team.font.bold = True
details.add_run('Mirza Umer Ikram (S3F22UBSCS081)\n')
details.add_run('Ruhma Bilal (S3F22UBSCS088)\n\n')

date_run = details.add_run('Date: January 19, 2026')
date_run.font.bold = True

doc.add_page_break()

# ==================== DOCUMENT REVISION HISTORY ====================
doc.add_heading('Document Revision History', level=1)

revision_headers = ['Version', 'Date', 'Description', 'Author(s)']
revision_data = [
    ['1.0', 'January 15, 2026', 'Initial Draft', 'Mirza Umer Ikram, Ruhma Bilal'],
    ['1.1', 'January 19, 2026', 'IEEE Format Update', 'Mirza Umer Ikram, Ruhma Bilal']
]
add_table_with_data(doc, revision_headers, revision_data, [2, 3, 6, 5])
doc.add_paragraph()

# ==================== TABLE OF CONTENTS ====================
doc.add_heading('Table of Contents', level=1)
doc.add_paragraph('Note: Right-click and select "Update Field" to refresh the Table of Contents if needed.')

# Insert native Word TOC field
add_toc(doc)

doc.add_page_break()

# ==================== 1. INTRODUCTION ====================
doc.add_heading('1. INTRODUCTION', level=1)

doc.add_heading('1.1 Purpose', level=2)
doc.add_paragraph(
    'This Software Requirements Specification (SRS) document provides a complete description of the SAFORA '
    '(Smart Ride) system - an AI-powered ride-hailing platform implementing proactive safety measures. '
    'This document is intended for:'
)
doc.add_paragraph('Development team members', style='List Bullet')
doc.add_paragraph('Project stakeholders and supervisors', style='List Bullet')
doc.add_paragraph('Quality assurance personnel', style='List Bullet')
doc.add_paragraph('Future maintenance teams', style='List Bullet')
doc.add_paragraph()
doc.add_paragraph('The document follows IEEE Std 830-1998 guidelines for software requirements specifications.')

doc.add_heading('1.2 Scope', level=2)
p = doc.add_paragraph()
p.add_run('Product Name: ').font.bold = True
p.add_run('SAFORA (Smart Ride)')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Product Description: ').font.bold = True
p.add_run(
    'SAFORA is an intelligent ride-hailing platform that addresses critical safety and efficiency gaps in '
    'existing transportation services through AI-driven proactive safety mechanisms.'
)

doc.add_heading('1.2.1 Product Features', level=3)
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('1. Pink Pass (Biometric Women-Only Mode)\n').font.bold = True
doc.add_paragraph('Two-layer verification using CNIC and liveness detection', style='List Bullet')
doc.add_paragraph('Haar Cascade for face detection', style='List Bullet')
doc.add_paragraph('CNN-based blink verification for anti-spoofing', style='List Bullet')
doc.add_paragraph('Verification completion in <15 seconds', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('2. Safety Sentinel (Automated Route Monitoring)\n').font.bold = True
doc.add_paragraph('Real-time GPS tracking and route deviation detection', style='List Bullet')
doc.add_paragraph('Point-to-line distance calculation using Turf.js', style='List Bullet')
doc.add_paragraph('Automated alerts when deviation >500m for >30 seconds', style='List Bullet')
doc.add_paragraph('Dual notification system (admin dashboard + SMS to emergency contacts)', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('3. Smart Driver Selection\n').font.bold = True
doc.add_paragraph('AI-driven matching algorithm: Score = 0.50*Distance + 0.30*Rating + 0.20*Fairness', style='List Bullet')
doc.add_paragraph('Fairness metric: IdleTime/TotalOnlineTime (last 4 hours)', style='List Bullet')
doc.add_paragraph('Reduces driver monopolization and wait times', style='List Bullet')

doc.add_heading('1.2.2 Benefits', level=3)
p = doc.add_paragraph()
p.add_run('For Passengers: ').font.bold = True
p.add_run('Enhanced safety through proactive monitoring, verified women-only rides, faster pickup times')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('For Drivers: ').font.bold = True
p.add_run('Fair ride distribution, reduced idle time, transparent rating system')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('For Administrators: ').font.bold = True
p.add_run('Real-time monitoring, automated alerts, data-driven insights')

doc.add_heading('1.2.3 In Scope', level=3)
doc.add_paragraph('User registration and authentication (Passenger/Driver/Admin)', style='List Bullet')
doc.add_paragraph('Ride booking with real-time price estimation', style='List Bullet')
doc.add_paragraph('GPS-based tracking and route monitoring', style='List Bullet')
doc.add_paragraph('Pink Pass enrollment and verification', style='List Bullet')
doc.add_paragraph('Automated safety alerts', style='List Bullet')
doc.add_paragraph('Smart driver matching algorithm', style='List Bullet')
doc.add_paragraph('Admin dashboard with analytics', style='List Bullet')
doc.add_paragraph('Cash payment processing', style='List Bullet')

doc.add_heading('1.2.4 Out of Scope', level=3)
doc.add_paragraph('Multi-city operations (Phase 1 limited to Lahore)', style='List Bullet')
doc.add_paragraph('Third-party payment gateway integration', style='List Bullet')
doc.add_paragraph('Carpooling/ride-sharing features', style='List Bullet')
doc.add_paragraph('Advanced fraud detection systems', style='List Bullet')
doc.add_paragraph('International operations', style='List Bullet')

doc.add_page_break()

doc.add_heading('1.3 Definitions, Acronyms, and Abbreviations', level=2)

definitions_headers = ['Term', 'Definition']
definitions_data = [
    ['AI', 'Artificial Intelligence'],
    ['API', 'Application Programming Interface'],
    ['CNN', 'Convolutional Neural Network'],
    ['CNIC', 'Computerized National Identity Card'],
    ['EAR', 'Eye Aspect Ratio'],
    ['GPS', 'Global Positioning System'],
    ['JWT', 'JSON Web Token'],
    ['MERN', 'MongoDB, Express.js, React, Node.js'],
    ['NLP', 'Natural Language Processing'],
    ['PKR', 'Pakistani Rupees'],
    ['REST', 'Representational State Transfer'],
    ['SMS', 'Short Message Service'],
    ['SOS', 'Emergency distress signal'],
    ['SRS', 'Software Requirements Specification'],
    ['TPR', 'True Positive Rate'],
    ['FPR', 'False Positive Rate']
]
add_table_with_data(doc, definitions_headers, definitions_data, [4, 12])
doc.add_paragraph()

doc.add_heading('1.4 References', level=2)
doc.add_paragraph('[1] IEEE Std 830-1998, "IEEE Recommended Practice for Software Requirements Specifications"', style='List Number')
doc.add_paragraph('[2] Zhang, L., et al. (2021). "Machine Learning for Driver Anomaly Detection in Ride-Hailing Services." Journal of Transportation Safety, 15(3), 234-248.', style='List Number')
doc.add_paragraph('[3] Patel, R., et al. (2020). "CNN-Based Liveness Detection for Biometric Authentication." IEEE Transactions on Biometrics, 8(2), 112-125.', style='List Number')
doc.add_paragraph('[4] MongoDB Documentation. (2025). Retrieved from https://docs.mongodb.com', style='List Number')
doc.add_paragraph('[5] React Native Documentation. (2025). Retrieved from https://reactnative.dev', style='List Number')
doc.add_paragraph('[6] TensorFlow/Keras Documentation. (2025). Retrieved from https://www.tensorflow.org', style='List Number')

doc.add_heading('1.5 Overview', level=2)
doc.add_paragraph('This SRS document is organized as follows:')
doc.add_paragraph('Section 2 provides an overall description of the SAFORA system, including product perspective, functions, user characteristics, and constraints.', style='List Bullet')
doc.add_paragraph('Section 3 details specific functional and non-functional requirements.', style='List Bullet')
doc.add_paragraph('Section 4 presents system models including use case, sequence, class, and ER diagrams.', style='List Bullet')
doc.add_paragraph('Section 5 outlines the project plan with methodology, timeline, and resource allocation.', style='List Bullet')
doc.add_paragraph('Section 6 contains appendices with supplementary information.', style='List Bullet')

doc.add_page_break()

# ==================== 2. OVERALL DESCRIPTION ====================
doc.add_heading('2. OVERALL DESCRIPTION', level=1)

doc.add_heading('2.1 Product Perspective', level=2)
doc.add_paragraph('SAFORA is a new, self-contained ride-hailing platform designed to address specific safety and efficiency gaps in existing services operating in Pakistan. The system consists of four main components:')

doc.add_heading('2.1.1 System Architecture', level=3)
p = doc.add_paragraph()
p.add_run('Backend Server (Node.js/Express)\n').font.bold = True
doc.add_paragraph('RESTful API for all client applications', style='List Bullet')
doc.add_paragraph('Real-time communication via Socket.io', style='List Bullet')
doc.add_paragraph('MongoDB database for data persistence', style='List Bullet')
doc.add_paragraph('JWT-based authentication', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('AI Microservice (Python/Flask)\n').font.bold = True
doc.add_paragraph('Pink Pass liveness detection', style='List Bullet')
doc.add_paragraph('Price prediction using Linear Regression', style='List Bullet')
doc.add_paragraph('Smart driver matching algorithm', style='List Bullet')
doc.add_paragraph('Sentiment analysis and demand clustering', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Mobile Applications (React Native)\n').font.bold = True
doc.add_paragraph('Passenger app for iOS and Android', style='List Bullet')
doc.add_paragraph('Driver app for iOS and Android', style='List Bullet')
doc.add_paragraph('Real-time GPS tracking', style='List Bullet')
doc.add_paragraph('In-app notifications', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Admin Dashboard (React.js)\n').font.bold = True
doc.add_paragraph('Web-based monitoring interface', style='List Bullet')
doc.add_paragraph('Real-time safety alerts', style='List Bullet')
doc.add_paragraph('Analytics and reporting', style='List Bullet')
doc.add_paragraph('Heatmap visualization', style='List Bullet')

doc.add_heading('2.1.2 System Interfaces', level=3)
p = doc.add_paragraph()
p.add_run('Hardware Interfaces:\n').font.bold = True
doc.add_paragraph('Mobile device GPS sensors', style='List Bullet')
doc.add_paragraph('Mobile device cameras (for Pink Pass verification)', style='List Bullet')
doc.add_paragraph('Server infrastructure (cloud or on-premise)', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Software Interfaces:\n').font.bold = True
doc.add_paragraph('Google Maps API for routing and geocoding', style='List Bullet')
doc.add_paragraph('Twilio API for SMS notifications', style='List Bullet')
doc.add_paragraph('MongoDB database (v6.0+)', style='List Bullet')
doc.add_paragraph('Node.js runtime (v18+)', style='List Bullet')
doc.add_paragraph('Python runtime (v3.9+)', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Communication Interfaces:\n').font.bold = True
doc.add_paragraph('HTTPS for secure API communication', style='List Bullet')
doc.add_paragraph('WebSocket (Socket.io) for real-time updates', style='List Bullet')
doc.add_paragraph('SMS for emergency notifications', style='List Bullet')

doc.add_page_break()

doc.add_heading('2.2 Product Functions', level=2)

func_headers = ['Function', 'Description', 'Priority']
func_data = [
    ['User Management', 'Registration, authentication, profile management for all user roles', 'High'],
    ['Pink Pass', 'Biometric verification for women-only rides using liveness detection', 'High'],
    ['Ride Booking', 'Request rides with price estimation and driver matching', 'High'],
    ['Safety Sentinel', 'Automated route monitoring with deviation detection', 'Critical'],
    ['Driver Management', 'Driver registration, status tracking, fairness metrics', 'High'],
    ['Admin Dashboard', 'Real-time monitoring, alerts, analytics, and reporting', 'Medium']
]
add_table_with_data(doc, func_headers, func_data, [4, 9, 3])
doc.add_paragraph()

doc.add_heading('2.3 User Characteristics', level=2)

user_headers = ['User Type', 'Technical Expertise', 'Primary Needs', 'Usage Frequency']
user_data = [
    ['Passengers', 'Basic smartphone usage', 'Safe, affordable, reliable transportation', 'Daily to weekly'],
    ['Drivers', 'Basic smartphone and navigation', 'Fair ride distribution, consistent income', 'Daily'],
    ['Administrators', 'Moderate to advanced', 'Monitor safety, manage users, analyze data', 'Daily']
]
add_table_with_data(doc, user_headers, user_data, [3, 4, 5, 4])
doc.add_paragraph()

doc.add_heading('2.4 Constraints', level=2)
doc.add_heading('2.4.1 Regulatory Constraints', level=3)
doc.add_paragraph('Must comply with Pakistan\'s data protection regulations', style='List Bullet')
doc.add_paragraph('CNIC verification required for all users', style='List Bullet')
doc.add_paragraph('SMS notifications must follow PTCL guidelines', style='List Bullet')

doc.add_heading('2.4.2 Technical Constraints', level=3)
doc.add_paragraph('Mobile apps must support Android 8.0+ and iOS 13.0+', style='List Bullet')
doc.add_paragraph('Backend must handle 1000+ concurrent users', style='List Bullet')
doc.add_paragraph('API response time must be <500ms for 95% of requests', style='List Bullet')
doc.add_paragraph('GPS accuracy must be within 10 meters', style='List Bullet')

doc.add_heading('2.4.3 Business Constraints', level=3)
doc.add_paragraph('Phase 1 limited to Lahore city', style='List Bullet')
doc.add_paragraph('Cash-only payments initially', style='List Bullet')
doc.add_paragraph('Development timeline: 22 weeks', style='List Bullet')
doc.add_paragraph('Budget constraints for cloud infrastructure', style='List Bullet')

doc.add_heading('2.5 Assumptions and Dependencies', level=2)
doc.add_heading('2.5.1 Assumptions', level=3)
doc.add_paragraph('Users have smartphones with GPS and camera capabilities', style='List Bullet')
doc.add_paragraph('Reliable internet connectivity (3G/4G/WiFi) available', style='List Bullet')
doc.add_paragraph('Google Maps API will remain accessible and affordable', style='List Bullet')
doc.add_paragraph('Twilio SMS service will maintain 99% uptime', style='List Bullet')

doc.add_heading('2.5.2 Dependencies', level=3)
doc.add_paragraph('MongoDB database availability', style='List Bullet')
doc.add_paragraph('Third-party API services (Google Maps, Twilio)', style='List Bullet')
doc.add_paragraph('Mobile OS platform stability', style='List Bullet')
doc.add_paragraph('Cloud infrastructure reliability', style='List Bullet')

doc.add_page_break()

# ==================== 3. SPECIFIC REQUIREMENTS ====================
doc.add_heading('3. SPECIFIC REQUIREMENTS', level=1)
doc.add_heading('3.1 Functional Requirements', level=2)

fr_headers = ['ID', 'Requirement', 'Priority']
fr_data = [
    ['FR-01', 'System shall allow user registration with CNIC verification', 'High'],
    ['FR-02', 'System shall authenticate users using JWT tokens', 'High'],
    ['FR-03', 'System shall allow Pink Pass enrollment with video upload', 'High'],
    ['FR-04', 'System shall detect faces using Haar Cascade (>95% accuracy)', 'High'],
    ['FR-05', 'System shall verify liveness using CNN (>98% accuracy, <5% FPR)', 'Critical'],
    ['FR-06', 'System shall complete Pink Pass verification within 15 seconds', 'High'],
    ['FR-07', 'System shall allow ride requests with pickup/dropoff locations', 'High'],
    ['FR-08', 'System shall predict ride price using AI (+/- PKR 30 accuracy)', 'High'],
    ['FR-09', 'System shall match drivers using weighted algorithm', 'High'],
    ['FR-10', 'System shall monitor rides with GPS tracking (5-second intervals)', 'Critical'],
    ['FR-11', 'System shall detect route deviation (>500m for >30 seconds)', 'Critical'],
    ['FR-12', 'System shall send alerts to admin and emergency contacts within 30s', 'Critical'],
    ['FR-13', 'System shall track driver online/offline status and location', 'High'],
    ['FR-14', 'System shall calculate driver fairness metric', 'Medium'],
    ['FR-15', 'System shall display real-time safety alerts on admin dashboard', 'High']
]
add_table_with_data(doc, fr_headers, fr_data, [2, 11, 3])
doc.add_paragraph()

doc.add_heading('3.2 Non-Functional Requirements', level=2)
nfr_headers = ['Category', 'Requirement', 'Metric']
nfr_data = [
    ['Performance', 'API response time', '<500ms for 95% requests'],
    ['Performance', 'Pink Pass verification time', '<15 seconds'],
    ['Performance', 'Concurrent users support', '1000+ users'],
    ['Security', 'Password hashing', 'bcrypt (cost factor 10)'],
    ['Security', 'CNIC encryption', 'AES-256'],
    ['Security', 'API communication', 'HTTPS/TLS 1.3'],
    ['Reliability', 'System uptime', '99% during business hours'],
    ['Reliability', 'Safety features availability', '99.9%'],
    ['Usability', 'Minimum font size', '14px'],
    ['Usability', 'Language support', 'Urdu and English'],
    ['Maintainability', 'Code coverage', '>80% for unit tests'],
    ['Maintainability', 'Code standards', 'ESLint and PEP 8']
]
add_table_with_data(doc, nfr_headers, nfr_data, [3, 8, 5])
doc.add_paragraph()

doc.add_heading('3.3 Interface Requirements', level=2)
doc.add_heading('3.3.1 User Interfaces', level=3)
p = doc.add_paragraph()
p.add_run('Mobile App Screens:\n').font.bold = True
doc.add_paragraph('Authentication (Login/Register)', style='List Number')
doc.add_paragraph('Home/Dashboard', style='List Number')
doc.add_paragraph('Ride Booking', style='List Number')
doc.add_paragraph('Pink Pass Enrollment', style='List Number')
doc.add_paragraph('Ride Tracking', style='List Number')
doc.add_paragraph('Ride History', style='List Number')
doc.add_paragraph('Profile Management', style='List Number')
doc.add_paragraph('Emergency SOS', style='List Number')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Admin Dashboard Pages:\n').font.bold = True
doc.add_paragraph('Real-time Monitoring', style='List Number')
doc.add_paragraph('Safety Alerts', style='List Number')
doc.add_paragraph('User Management', style='List Number')
doc.add_paragraph('Analytics & Reports', style='List Number')
doc.add_paragraph('Heatmap Visualization', style='List Number')

doc.add_heading('3.3.2 Hardware Interfaces', level=3)
doc.add_paragraph('GPS sensor for location tracking', style='List Bullet')
doc.add_paragraph('Camera for Pink Pass verification', style='List Bullet')
doc.add_paragraph('Network interface for API communication', style='List Bullet')

doc.add_heading('3.3.3 Software Interfaces', level=3)
doc.add_paragraph('Google Maps API v3 for routing and geocoding', style='List Bullet')
doc.add_paragraph('Twilio REST API for SMS notifications', style='List Bullet')
doc.add_paragraph('MongoDB database driver', style='List Bullet')
doc.add_paragraph('Socket.io for WebSocket communication', style='List Bullet')

doc.add_page_break()

# ==================== 4. SYSTEM MODELS ====================
doc.add_heading('4. SYSTEM MODELS', level=1)
doc.add_heading('4.1 Use Case Diagrams', level=2)
doc.add_paragraph('The system includes use cases for three primary actors: Passengers, Drivers, and Administrators.')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Passenger Use Cases:\n').font.bold = True
doc.add_paragraph('Register Account', style='List Bullet')
doc.add_paragraph('Login', style='List Bullet')
doc.add_paragraph('Enroll in Pink Pass', style='List Bullet')
doc.add_paragraph('Request Ride', style='List Bullet')
doc.add_paragraph('Track Ride', style='List Bullet')
doc.add_paragraph('Rate Driver', style='List Bullet')
doc.add_paragraph('Trigger SOS', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Driver Use Cases:\n').font.bold = True
doc.add_paragraph('Register as Driver', style='List Bullet')
doc.add_paragraph('Update Availability', style='List Bullet')
doc.add_paragraph('Accept/Reject Ride', style='List Bullet')
doc.add_paragraph('Navigate to Pickup', style='List Bullet')
doc.add_paragraph('Complete Ride', style='List Bullet')
doc.add_paragraph('View Earnings', style='List Bullet')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Admin Use Cases:\n').font.bold = True
doc.add_paragraph('Monitor Active Rides', style='List Bullet')
doc.add_paragraph('View Safety Alerts', style='List Bullet')
doc.add_paragraph('Manage Users', style='List Bullet')
doc.add_paragraph('Generate Reports', style='List Bullet')
doc.add_paragraph('Analyze Heatmaps', style='List Bullet')

doc.add_heading('4.2 Sequence Diagrams', level=2)
doc.add_heading('4.2.1 Ride Request Flow', level=3)
doc.add_paragraph('1. Passenger selects pickup/dropoff locations', style='List Number')
doc.add_paragraph('2. System calculates route and price', style='List Number')
doc.add_paragraph('3. System matches optimal driver', style='List Number')
doc.add_paragraph('4. Driver receives notification', style='List Number')
doc.add_paragraph('5. Driver accepts ride', style='List Number')
doc.add_paragraph('6. Passenger receives driver details', style='List Number')
doc.add_paragraph('7. Ride begins with GPS tracking', style='List Number')

doc.add_heading('4.2.2 Safety Alert Flow', level=3)
doc.add_paragraph('1. Safety Sentinel detects route deviation', style='List Number')
doc.add_paragraph('2. System creates alert record', style='List Number')
doc.add_paragraph('3. Admin dashboard receives Socket.io notification', style='List Number')
doc.add_paragraph('4. Emergency contacts receive SMS', style='List Number')
doc.add_paragraph('5. Admin reviews and resolves alert', style='List Number')

doc.add_heading('4.3 Class Diagrams', level=2)
class_headers = ['Class Name', 'Attributes', 'Methods']
class_data = [
    ['User', 'id, name, email, phone, password, role', 'register(), login(), updateProfile()'],
    ['Passenger', 'emergencyContacts, pinkPassVerified', 'enrollPinkPass(), requestRide()'],
    ['Driver', 'licenseNumber, vehicleInfo, rating, location', 'updateStatus(), acceptRide()'],
    ['Ride', 'passenger, driver, pickup, dropoff, status', 'create(), updateStatus(), complete()'],
    ['Alert', 'ride, type, severity, location', 'create(), notify(), resolve()']
]
add_table_with_data(doc, class_headers, class_data, [3, 7, 6])
doc.add_paragraph()

doc.add_heading('4.4 Entity Relationship Diagrams', level=2)
er_headers = ['Entity', 'Attributes', 'Relationships']
er_data = [
    ['Users', '_id, name, email, phone, cnic, gender, role', 'One-to-One with Drivers'],
    ['Drivers', '_id, user, license, vehicle, rating, location', 'One-to-Many with Rides'],
    ['Rides', '_id, passenger, driver, pickup, dropoff, status', 'Many-to-One with Passengers/Drivers'],
    ['Alerts', '_id, ride, type, severity, location', 'Many-to-One with Rides']
]
add_table_with_data(doc, er_headers, er_data, [3, 7, 6])
doc.add_paragraph()

doc.add_page_break()

# ==================== 5. PROJECT PLAN ====================
doc.add_heading('5. PROJECT PLAN', level=1)
doc.add_heading('5.1 Development Methodology', level=2)
p = doc.add_paragraph()
p.add_run('Methodology: ').font.bold = True
p.add_run('Agile Scrum with 2-week sprints')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Rationale: ').font.bold = True
p.add_run('Agile allows iterative development, frequent testing, and flexibility to adapt to changing requirements.')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Team Roles:\n').font.bold = True
doc.add_paragraph('Mirza Umer Ikram: Backend Development, AI Services', style='List Bullet')
doc.add_paragraph('Ruhma Bilal: Frontend Development, UI/UX Design', style='List Bullet')
doc.add_paragraph('Tanveer Ahmed: Project Advisor, Technical Guidance', style='List Bullet')

doc.add_heading('5.2 Timeline and Milestones', level=2)
timeline_headers = ['Phase', 'Duration', 'Tasks', 'Status']
timeline_data = [
    ['Phase 1: Setup', 'Weeks 1-2', 'Project structure, environment setup, SRS', 'Completed'],
    ['Phase 2: Backend', 'Weeks 3-5', 'Express server, MongoDB, authentication, APIs', 'Completed'],
    ['Phase 3: AI Service', 'Weeks 6-8', 'Flask app, liveness detection, pricing, matching', 'Completed'],
    ['Phase 4: Mobile Apps', 'Weeks 9-12', 'React Native apps, authentication, booking UI', 'Pending'],
    ['Phase 5: Dashboard', 'Weeks 16-17', 'React.js dashboard, monitoring, analytics', 'Pending'],
    ['Phase 6: Safety', 'Weeks 13-15', 'GPS tracking, Safety Sentinel, alerts', 'Completed'],
    ['Phase 7: AI Training', 'Weeks 18-19', 'Train models, K-Means clustering', 'Pending'],
    ['Phase 8: Testing', 'Weeks 20-22', 'Unit, integration, UAT, deployment', 'Pending']
]
add_table_with_data(doc, timeline_headers, timeline_data, [3, 3, 7, 3])
doc.add_paragraph()

doc.add_heading('5.3 Resource Allocation', level=2)
resource_headers = ['Resource Type', 'Description', 'Quantity/Cost']
resource_data = [
    ['Human Resources', 'Developers (Full-time)', '2'],
    ['Human Resources', 'Project Advisor (Part-time)', '1'],
    ['Technical Resources', 'Development laptops', '2'],
    ['Technical Resources', 'Cloud hosting (AWS/DigitalOcean)', 'PKR 10,000/month'],
    ['Technical Resources', 'API costs (Google Maps, Twilio)', 'PKR 5,000/month'],
    ['Technical Resources', 'Testing devices (Android/iOS)', 'PKR 50,000 (one-time)'],
    ['Budget', 'Total Estimated Budget', 'PKR 140,000']
]
add_table_with_data(doc, resource_headers, resource_data, [4, 7, 5])
doc.add_paragraph()

doc.add_page_break()

# ==================== 6. APPENDICES ====================
doc.add_heading('6. APPENDICES', level=1)
doc.add_heading('6.1 Glossary', level=2)
p = doc.add_paragraph()
p.add_run('Liveness Detection: ').font.bold = True
p.add_run('Biometric technique to determine if a face is from a live person or a photograph/video.')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Point-to-Line Distance: ').font.bold = True
p.add_run('Geometric calculation measuring shortest distance between a point and a line segment.')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Weighted Algorithm: ').font.bold = True
p.add_run('Scoring method that assigns different importance levels to multiple factors.')
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Fairness Metric: ').font.bold = True
p.add_run('Quantitative measure ensuring equitable distribution of resources.')

doc.add_heading('6.2 AI Model Specifications', level=2)
ai_headers = ['Model', 'Algorithm', 'Features/Architecture', 'Expected Performance']
ai_data = [
    ['Pink Pass CNN', 'Convolutional Neural Network', '3 conv layers + 2 dense layers', '>98% accuracy, <5% FPR'],
    ['Price Prediction', 'Linear Regression', '7 features (distance, time, demand, etc.)', 'R2 >0.85'],
    ['Driver Matching', 'Weighted Scoring', '50% Distance + 30% Rating + 20% Fairness', 'N/A']
]
add_table_with_data(doc, ai_headers, ai_data, [3, 3, 6, 4])
doc.add_paragraph()

doc.add_heading('6.3 Technology Stack', level=2)
tech_headers = ['Component', 'Technology', 'Version']
tech_data = [
    ['Backend', 'Node.js', 'v18+'],
    ['Backend', 'Express.js', 'v4.18'],
    ['Backend', 'MongoDB', 'v6.0'],
    ['Backend', 'Socket.io', 'v4.7'],
    ['AI Service', 'Python', 'v3.9+'],
    ['AI Service', 'Flask', 'v3.1'],
    ['AI Service', 'TensorFlow/Keras', 'v2.20'],
    ['AI Service', 'OpenCV', 'v4.13'],
    ['AI Service', 'scikit-learn', 'v1.8'],
    ['Mobile Apps', 'React Native', 'v0.72+'],
    ['Admin Dashboard', 'React.js', 'v18+']
]
add_table_with_data(doc, tech_headers, tech_data, [4, 7, 3])
doc.add_paragraph()

doc.add_page_break()

# ==================== DOCUMENT APPROVAL ====================
doc.add_heading('Document Approval', level=1)
doc.add_paragraph('This Software Requirements Specification has been reviewed and approved by:')
doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Project Advisor:\n').font.bold = True
p.add_run('Tanveer Ahmed\n')
p.add_run('Date: _______________')
doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Team Members:\n').font.bold = True
p.add_run('Mirza Umer Ikram (S3F22UBSCS081)\n')
p.add_run('Date: _______________')
doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.add_run('Ruhma Bilal (S3F22UBSCS088)\n')
p.add_run('Date: _______________')
doc.add_paragraph()
doc.add_paragraph()

try:
    set_update_fields_on_open(doc)
    print("Enabled automatic field updates on document open.")
except Exception as e:
    print(f"Warning: Could not set updateFields trigger: {e}")

output_path = 'SAFORA_SRS1_IEEE_Format_Complete.docx'
doc.save(output_path)
print(f"✅ Document generated: {output_path}")
