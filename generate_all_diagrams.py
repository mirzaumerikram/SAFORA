"""
Generate comprehensive set of diagrams for SAFORA SRS2
Creates all required diagrams with larger, more readable text
"""

from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('diagrams', exist_ok=True)

# Define colors
colors = {
    'bg': '#FFFFFF',
    'actor': '#FFE5B4',
    'usecase': '#87CEEB',
    'line': '#000000',
    'text': '#000000',
    'state': '#90EE90',
    'class': '#FFB6C1',
    'header': '#003366',
    'gantt_task': '#4A90E2',
    'gantt_milestone': '#E74C3C'
}

def get_fonts():
    """Get fonts with fallback"""
    try:
        font_title = ImageFont.truetype("arial.ttf", 32)  # Larger
        font_heading = ImageFont.truetype("arialbd.ttf", 24)  # Bold, larger
        font_normal = ImageFont.truetype("arial.ttf", 20)  # Larger
        font_small = ImageFont.truetype("arial.ttf", 16)  # Larger
    except:
        font_title = ImageFont.load_default()
        font_heading = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    return font_title, font_heading, font_normal, font_small

def create_gantt_chart():
    """Create Gantt chart showing project timeline"""
    width, height = 1800, 1200
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    font_title, font_heading, font_normal, font_small = get_fonts()
    
    # Title
    draw.text((600, 30), "Project Gantt Chart - SAFORA Development", fill=colors['header'], font=font_title)
    
    # Timeline header
    start_x = 400
    start_y = 120
    col_width = 120
    row_height = 60
    
    # Draw timeline columns (weeks)
    weeks = ['Week 1-2', 'Week 3-5', 'Week 6-8', 'Week 9-12', 'Week 13-15', 
             'Week 16-17', 'Week 18-19', 'Week 20-22']
    
    for i, week in enumerate(weeks):
        x = start_x + i * col_width
        draw.rectangle([x, start_y, x + col_width, start_y + 40], outline=colors['line'], width=2)
        bbox = draw.textbbox((0, 0), week, font=font_small)
        text_width = bbox[2] - bbox[0]
        draw.text((x + (col_width - text_width) // 2, start_y + 10), week, fill=colors['text'], font=font_small)
    
    # Project phases
    phases = [
        ('Phase 1: Setup', 0, 2, colors['gantt_task']),
        ('Phase 2: Backend', 2, 3, colors['gantt_task']),
        ('Phase 3: AI Service', 5, 3, colors['gantt_task']),
        ('Phase 4: Mobile Apps', 8, 4, colors['gantt_task']),
        ('Phase 5: Dashboard', 15, 2, colors['gantt_task']),
        ('Phase 6: Safety', 12, 3, colors['gantt_task']),
        ('Phase 7: AI Training', 17, 2, colors['gantt_task']),
        ('Phase 8: Testing', 19, 3, colors['gantt_task']),
    ]
    
    y = start_y + 60
    for phase_name, start_week, duration, color in phases:
        # Phase label
        draw.text((50, y + 15), phase_name, fill=colors['text'], font=font_normal)
        
        # Draw task bar
        bar_x = start_x + (start_week * col_width // 2)
        bar_width = duration * col_width // 2
        draw.rectangle([bar_x, y, bar_x + bar_width, y + row_height - 10], 
                      fill=color, outline=colors['line'], width=2)
        
        y += row_height
    
    # Legend
    legend_y = y + 40
    draw.text((50, legend_y), "Legend:", fill=colors['text'], font=font_heading)
    draw.rectangle([50, legend_y + 40, 100, legend_y + 70], fill=colors['gantt_task'], outline=colors['line'], width=2)
    draw.text((120, legend_y + 45), "Development Phase", fill=colors['text'], font=font_normal)
    
    img.save('diagrams/gantt_chart.png')
    print("✅ Created: gantt_chart.png")

def create_combined_use_case():
    """Create combined use case diagram for entire system"""
    width, height = 1800, 1400
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    font_title, font_heading, font_normal, font_small = get_fonts()
    
    # Title
    draw.text((500, 30), "Complete System Use Case Diagram", fill=colors['header'], font=font_title)
    
    # Draw three actors
    actors = [
        (150, 400, "Passenger"),
        (150, 800, "Driver"),
        (1650, 600, "Admin")
    ]
    
    for actor_x, actor_y, name in actors:
        # Stick figure
        draw.ellipse([actor_x-25, actor_y-50, actor_x+25, actor_y], outline=colors['line'], width=3)
        draw.line([actor_x, actor_y, actor_x, actor_y+80], fill=colors['line'], width=3)
        draw.line([actor_x, actor_y+25, actor_x-40, actor_y+50], fill=colors['line'], width=3)
        draw.line([actor_x, actor_y+25, actor_x+40, actor_y+50], fill=colors['line'], width=3)
        draw.line([actor_x, actor_y+80, actor_x-35, actor_y+130], fill=colors['line'], width=3)
        draw.line([actor_x, actor_y+80, actor_x+35, actor_y+130], fill=colors['line'], width=3)
        draw.text((actor_x-40, actor_y+140), name, fill=colors['text'], font=font_heading)
    
    # System boundary
    draw.rectangle([400, 200, 1500, 1200], outline=colors['line'], width=4)
    draw.text((750, 150), "SAFORA System", fill=colors['header'], font=font_title)
    
    # Core use cases in center
    core_cases = [
        (950, 350, "User Authentication"),
        (950, 500, "Ride Management"),
        (950, 650, "Real-time Tracking"),
        (950, 800, "Payment Processing"),
        (950, 950, "Safety Monitoring"),
    ]
    
    for uc_x, uc_y, uc_text in core_cases:
        draw.ellipse([uc_x-150, uc_y-50, uc_x+150, uc_y+50], 
                    fill=colors['usecase'], outline=colors['line'], width=3)
        bbox = draw.textbbox((0, 0), uc_text, font=font_normal)
        text_width = bbox[2] - bbox[0]
        draw.text((uc_x - text_width//2, uc_y-12), uc_text, fill=colors['text'], font=font_normal)
    
    # Connect actors to use cases
    # Passenger connections
    for _, uc_y, _ in core_cases:
        draw.line([200, 450, 800, uc_y], fill=colors['line'], width=2)
    
    # Driver connections
    for _, uc_y, _ in core_cases[:4]:  # Driver doesn't access all features
        draw.line([200, 850, 800, uc_y], fill=colors['line'], width=2)
    
    # Admin connections
    for _, uc_y, _ in core_cases:
        draw.line([1600, 650, 1100, uc_y], fill=colors['line'], width=2)
    
    img.save('diagrams/combined_usecase.png')
    print("✅ Created: combined_usecase.png")

def create_detailed_class_diagram():
    """Create more comprehensive class diagram"""
    width, height = 2000, 1600
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    font_title, font_heading, font_normal, font_small = get_fonts()
    
    # Title
    draw.text((600, 30), "Complete Class Diagram - SAFORA System", fill=colors['header'], font=font_title)
    
    # Define all classes with more details
    classes = [
        # User hierarchy
        {
            'name': 'User',
            'x': 900, 'y': 150, 'width': 280, 'height': 250,
            'attrs': ['- id: ObjectId', '- name: String', '- email: String', '- phone: String', 
                     '- password: String', '- cnic: String', '- role: Enum'],
            'methods': ['+ register()', '+ login()', '+ logout()', '+ updateProfile()']
        },
        {
            'name': 'Passenger',
            'x': 400, 'y': 550, 'width': 300, 'height': 220,
            'attrs': ['- emergencyContacts: Array', '- pinkPassVerified: Boolean', '- rides: Array'],
            'methods': ['+ enrollPinkPass()', '+ requestRide()', '+ trackRide()', '+ rateDriver()']
        },
        {
            'name': 'Driver',
            'x': 900, 'y': 550, 'width': 280, 'height': 240,
            'attrs': ['- license: String', '- vehicle: Object', '- rating: Number', 
                     '- location: GeoJSON', '- status: Enum'],
            'methods': ['+ updateStatus()', '+ acceptRide()', '+ startRide()', '+ completeRide()']
        },
        {
            'name': 'Admin',
            'x': 1400, 'y': 550, 'width': 280, 'height': 200,
            'attrs': ['- permissions: Array', '- department: String'],
            'methods': ['+ monitorRides()', '+ viewAlerts()', '+ manageUsers()', '+ generateReports()']
        },
        # Other important classes
        {
            'name': 'Ride',
            'x': 400, 'y': 950, 'width': 350, 'height': 260,
            'attrs': ['- passenger: User', '- driver: Driver', '- pickup: Location', 
                     '- dropoff: Location', '- status: Enum', '- price: Number'],
            'methods': ['+ create()', '+ assign Driver()', '+ updateStatus()', '+ calculate Price()', '+ complete()']
        },
        {
            'name': 'Alert',
            'x': 950, 'y': 950, 'width': 320, 'height': 220,
            'attrs': ['- ride: Ride', '- type: String', '- severity: Enum', '- location: GeoJSON'],
            'methods': ['+ create()', '+ notify()', '+ escalate()', '+ resolve()']
        },
        {
            'name': 'Location',
            'x': 1450, 'y': 950, 'width': 280, 'height': 180,
            'attrs': ['- latitude: Number', '- longitude: Number', '- address: String'],
            'methods': ['+ getCoordinates()', '+ getAddress()', '+ calculateDistance()']
        },
    ]
    
    # Draw classes
    for cls in classes:
        x, y = cls['x'], cls['y']
        w, h = cls['width'], cls['height']
        
        # Class box
        draw.rectangle([x, y, x+w, y+h], fill=colors['class'], outline=colors['line'], width=3)
        
        # Class name (header section)
        draw.line([x, y+45, x+w, y+45], fill=colors['line'], width=3)
        bbox = draw.textbbox((0, 0), cls['name'], font=font_heading)
        text_width = bbox[2] - bbox[0]
        draw.text((x + (w - text_width)//2, y+12), cls['name'], fill=colors['text'], font=font_heading)
        
        # Attributes section
        attr_y = y + 55
        for attr in cls['attrs']:
            draw.text((x+10, attr_y), attr, fill=colors['text'], font=font_small)
            attr_y += 24
        
        # Separator
        draw.line([x, attr_y+5, x+w, attr_y+5], fill=colors['line'], width=2)
        
        # Methods section
        method_y = attr_y + 15
        for method in cls['methods']:
            draw.text((x+10, method_y), method, fill=colors['text'], font=font_small)
            method_y += 24
    
    # Draw inheritance relationships
    # User -> Passenger
    draw.line([540, 550, 1040, 400], fill=colors['line'], width=3)
    draw.polygon([1040, 400, 1025, 410, 1030, 425], fill=colors['bg'], outline=colors['line'], width=2)
    
    # User -> Driver
    draw.line([1040, 400, 1040, 550], fill=colors['line'], width=3)
    draw.polygon([1040, 400, 1030, 415, 1050, 415], fill=colors['bg'], outline=colors['line'], width=2)
    
    # User -> Admin
    draw.line([1540, 550, 1040, 400], fill=colors['line'], width=3)
    draw.polygon([1040, 400, 1055, 410, 1050, 425], fill=colors['bg'], outline=colors['line'], width=2)
    
    # Draw associations
    # Passenger -> Ride
    draw.line([550, 770, 550, 950], fill=colors['line'], width=2)
    draw.text((560, 850), "requests >", fill=colors['text'], font=font_small)
    
    # Driver -> Ride
    draw.line([1040, 790, 650, 950], fill=colors['line'], width=2)
    draw.text((800, 860), "< fulfills", fill=colors['text'], font=font_small)
    
    # Ride -> Alert
    draw.line([750, 1080, 950, 1080], fill=colors['line'], width=2)
    draw.text((820, 1090), "triggers >", fill=colors['text'], font=font_small)
    
    img.save('diagrams/class_diagram_complete.png')
    print("✅ Created: class_diagram_complete.png")

def create_large_sequence_diagram():
    """Create larger, more readable sequence diagram"""
    width, height = 2000, 1800
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    font_title, font_heading, font_normal, font_small = get_fonts()
    
    # Title
    draw.text((500, 30), "Ride Request Sequence Diagram (Detailed)", fill=colors['header'], font=font_title)
    
    # Actors/Objects with larger spacing
    actors = [
        (250, 150, "Passenger"),
        (550, 150, "Mobile App"),
        (900, 150, "Backend\nServer"),
        (1250, 150, "AI Service"),
        (1600, 150, "Database"),
    ]
    
    for x, y, name in actors:
        # Draw box
        draw.rectangle([x-100, y, x+100, y+70], fill=colors['actor'], outline=colors['line'], width=3)
        # Multi-line text support
        lines = name.split('\n')
        text_y = y + 15 if len(lines) == 1 else y + 5
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font_heading)
            text_width = bbox[2] - bbox[0]
            draw.text((x - text_width//2, text_y), line, fill=colors['text'], font=font_heading)
            text_y += 30
        
        # Draw lifeline (solid for clarity)
        for dash_y in range(y+70, 1650, 15):
            draw.line([x, dash_y, x, min(dash_y+10, 1650)], fill=colors['line'], width=2)
    
    # Messages with larger text
    messages = [
        (250, 550, 300, "1: Select locations", font_normal),
        (550, 900, 350, "2: Calculate route", font_normal),
        (900, 1250, 400, "3: Predict price", font_normal),
        (1250, 1600, 450, "4: Store ride data", font_normal),
        (1600, 1250, 500, "5: Return confirmation", font_normal),
        (1250, 900, 550, "6: Return price", font_normal),
        (900, 550, 600, "7: Show estimate", font_normal),
        (550, 250, 650, "8: Display to user", font_normal),
        (250, 550, 750, "9: Confirm booking", font_normal),
        (550, 900, 800, "10: Create ride request", font_normal),
        (900, 1250, 850, "11: Match driver (AI)", font_normal),
        (1250, 900, 900, "12: Return best driver", font_normal),
        (900, 250, 950, "13: Notify passenger", font_normal),
    ]
    
    for start_x, end_x, y, text, font in messages:
        # Draw arrow
        draw.line([start_x, y, end_x, y], fill=colors['line'], width=3)
        # Arrow head
        if start_x < end_x:
            draw.polygon([end_x, y, end_x-15, y-8, end_x-15, y+8], fill=colors['line'])
        else:
            draw.polygon([end_x, y, end_x+15, y-8, end_x+15, y+8], fill=colors['line'])
        # Text label
        mid_x = (start_x + end_x) // 2
        draw.rectangle([mid_x-120, y-30, mid_x+120, y-5], fill=colors['bg'])
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        draw.text((mid_x - text_width//2, y-28), text, fill=colors['text'], font=font)
    
    img.save('diagrams/sequence_ride_large.png')
    print("✅ Created: sequence_ride_large.png")

def create_activity_diagram_ride():
    """Create activity diagram for ride booking"""
    width, height = 1600, 1800
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    font_title, font_heading, font_normal, font_small = get_fonts()
    
    # Title
    draw.text((450, 30), "Activity Diagram - Ride Booking Process", fill=colors['header'], font=font_title)
    
    # Start node
    draw.ellipse([750, 120, 850, 220], fill=colors['line'])
    draw.text((765, 230), "START", fill=colors['text'], font=font_normal)
    
    # Activity nodes
    activities = [
        (800, 300, "Passenger opens app"),
        (800, 400, "Select pickup location"),
        (800, 500, "Select dropoff location"),
        (800, 650, "System calculates\nroute and price"),
        (800, 800, "Display estimate\nto passenger"),
        (800, 950, "Passenger confirms\nride request"),
        (800, 1100, "System matches\nsuitable driver"),
        (800, 1300, "Driver accepts ride"),
        (800, 1450, "Notify passenger\nwith driver details"),
    ]
    
    prev_y = 220
    for x, y, text in activities:
        # Draw rectangle
        draw.rounded_rectangle([x-150, y-40, x+150, y+40], radius=15,
                              fill=colors['state'], outline=colors['line'], width=3)
        # Multi-line text
        lines = text.split('\n')
        text_y = y - 12 * len(lines)
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font_normal)
            text_width = bbox[2] - bbox[0]
            draw.text((x - text_width//2, text_y), line, fill=colors['text'], font=font_normal)
            text_y += 24
        
        # Arrow from previous
        draw.line([800, prev_y, 800, y-40], fill=colors['line'], width=3)
        draw.polygon([800, y-40, 795, y-52, 805, y-52], fill=colors['line'])
        prev_y = y + 40
    
    # End node
    draw.ellipse([750, 1580, 850, 1680], fill=colors['line'])
    draw.ellipse([760, 1590, 840, 1670], fill=colors['bg'], outline=colors['line'], width=3)
    draw.text((775, 1690), "END", fill=colors['text'], font=font_normal)
    draw.line([800, prev_y, 800, 1580], fill=colors['line'], width=3)
    draw.polygon([800, 1580, 795, 1568, 805, 1568], fill=colors['line'])
    
    img.save('diagrams/activity_ride_booking.png')
    print("✅ Created: activity_ride_booking.png")

# Generate all diagrams
print("Generating comprehensive diagram set for SAFORA SRS2...")
print("="*80)

create_gantt_chart()
create_combined_use_case()
create_detailed_class_diagram()
create_large_sequence_diagram()
create_activity_diagram_ride()

print("="*80)
print("✅ All additional diagrams generated successfully!")
print("✅ diagrams now include:")
print("   • Gantt Chart (project timeline)")
print("   • Combined Use Case (all actors)")
print("   • Complete Class Diagram (all classes with relationships)")
print("   • Large Sequence Diagram (readable text)")
print("   • Activity Diagram (ride booking)")
