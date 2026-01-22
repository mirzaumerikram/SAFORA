"""
Generate visual diagrams for SAFORA SRS2 Document
Creates actual diagram images using Python libraries
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Create diagrams directory
os.makedirs('diagrams', exist_ok=True)

# Define colors
colors = {
    'bg': '#FFFFFF',
    'actor': '#FFE5B4',
    'usecase': '#87CEEB',
    'line': '#000000',
    'text': '#000000',
    'state': '#90EE90',
    'class': '#FFB6C1'
}

def create_use_case_diagram_passenger():
    """Create Use Case Diagram for Passenger"""
    width, height = 1400, 1000
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((500, 30), "Use Case Diagram - Passenger", fill=colors['text'], font=font_title)
    
    # Draw actor (stick figure)
    actor_x, actor_y = 150, 400
    # Head
    draw.ellipse([actor_x-20, actor_y-40, actor_x+20, actor_y], outline=colors['line'], width=2)
    # Body
    draw.line([actor_x, actor_y, actor_x, actor_y+60], fill=colors['line'], width=2)
    # Arms
    draw.line([actor_x, actor_y+20, actor_x-30, actor_y+40], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+20, actor_x+30, actor_y+40], fill=colors['line'], width=2)
    # Legs
    draw.line([actor_x, actor_y+60, actor_x-25, actor_y+100], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+60, actor_x+25, actor_y+100], fill=colors['line'], width=2)
    # Label
    draw.text((actor_x-35, actor_y+110), "Passenger", fill=colors['text'], font=font_normal)
    
    # System boundary
    draw.rectangle([350, 150, 1250, 850], outline=colors['line'], width=3)
    draw.text((650, 120), "SAFORA System", fill=colors['text'], font=font_title)
    
    # Use cases (ellipses)
    use_cases = [
        (700, 220, "Register Account"),
        (700, 320, "Login"),
        (700, 420, "Enroll in Pink Pass"),
        (700, 520, "Request Ride"),
        (1000, 220, "Track Ride"),
        (1000, 320, "Rate Driver"),
        (1000, 420, "Trigger SOS"),
        (1000, 520, "View History")
    ]
    
    for uc_x, uc_y, uc_text in use_cases:
        # Draw ellipse
        draw.ellipse([uc_x-120, uc_y-40, uc_x+120, uc_y+40], 
                     fill=colors['usecase'], outline=colors['line'], width=2)
        # Draw text
        bbox = draw.textbbox((0, 0), uc_text, font=font_small)
        text_width = bbox[2] - bbox[0]
        draw.text((uc_x - text_width//2, uc_y-10), uc_text, fill=colors['text'], font=font_small)
        # Draw line from actor to use case
        draw.line([actor_x+30, actor_y+50, uc_x-120, uc_y], fill=colors['line'], width=1)
    
    img.save('diagrams/usecase_passenger.png')
    print("✅ Created: usecase_passenger.png")

def create_use_case_diagram_driver():
    """Create Use Case Diagram for Driver"""
    width, height = 1400, 1000
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((500, 30), "Use Case Diagram - Driver", fill=colors['text'], font=font_title)
    
    # Draw actor
    actor_x, actor_y = 150, 400
    draw.ellipse([actor_x-20, actor_y-40, actor_x+20, actor_y], outline=colors['line'], width=2)
    draw.line([actor_x, actor_y, actor_x, actor_y+60], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+20, actor_x-30, actor_y+40], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+20, actor_x+30, actor_y+40], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+60, actor_x-25, actor_y+100], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+60, actor_x+25, actor_y+100], fill=colors['line'], width=2)
    draw.text((actor_x-25, actor_y+110), "Driver", fill=colors['text'], font=font_normal)
    
    # System boundary
    draw.rectangle([350, 150, 1250, 850], outline=colors['line'], width=3)
    draw.text((650, 120), "SAFORA System", fill=colors['text'], font=font_title)
    
    # Use cases
    use_cases = [
        (700, 220, "Register as Driver"),
        (700, 320, "Login"),
        (700, 420, "Update Availability"),
        (700, 520, "Accept/Reject Ride"),
        (1000, 270, "Navigate to Pickup"),
        (1000, 370, "Start Ride"),
        (1000, 470, "Complete Ride"),
        (1000, 570, "View Earnings")
    ]
    
    for uc_x, uc_y, uc_text in use_cases:
        draw.ellipse([uc_x-120, uc_y-40, uc_x+120, uc_y+40], 
                     fill=colors['usecase'], outline=colors['line'], width=2)
        bbox = draw.textbbox((0, 0), uc_text, font=font_small)
        text_width = bbox[2] - bbox[0]
        draw.text((uc_x - text_width//2, uc_y-10), uc_text, fill=colors['text'], font=font_small)
        draw.line([actor_x+30, actor_y+50, uc_x-120, uc_y], fill=colors['line'], width=1)
    
    img.save('diagrams/usecase_driver.png')
    print("✅ Created: usecase_driver.png")

def create_use_case_diagram_admin():
    """Create Use Case Diagram for Admin"""
    width, height = 1400, 900
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((500, 30), "Use Case Diagram - Admin", fill=colors['text'], font=font_title)
    
    # Draw actor
    actor_x, actor_y = 150, 350
    draw.ellipse([actor_x-20, actor_y-40, actor_x+20, actor_y], outline=colors['line'], width=2)
    draw.line([actor_x, actor_y, actor_x, actor_y+60], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+20, actor_x-30, actor_y+40], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+20, actor_x+30, actor_y+40], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+60, actor_x-25, actor_y+100], fill=colors['line'], width=2)
    draw.line([actor_x, actor_y+60, actor_x+25, actor_y+100], fill=colors['line'], width=2)
    draw.text((actor_x-25, actor_y+110), "Admin", fill=colors['text'], font=font_normal)
    
    # System boundary
    draw.rectangle([350, 150, 1250, 750], outline=colors['line'], width=3)
    draw.text((650, 120), "SAFORA System", fill=colors['text'], font=font_title)
    
    # Use cases
    use_cases = [
        (700, 250, "Monitor Active Rides"),
        (700, 370, "View Safety Alerts"),
        (700, 490, "Manage Users"),
        (1000, 250, "Generate Reports"),
        (1000, 370, "Analyze Heatmaps"),
        (1000, 490, "Resolve Alerts")
    ]
    
    for uc_x, uc_y, uc_text in use_cases:
        draw.ellipse([uc_x-120, uc_y-40, uc_x+120, uc_y+40], 
                     fill=colors['usecase'], outline=colors['line'], width=2)
        bbox = draw.textbbox((0, 0), uc_text, font=font_small)
        text_width = bbox[2] - bbox[0]
        draw.text((uc_x - text_width//2, uc_y-10), uc_text, fill=colors['text'], font=font_small)
        draw.line([actor_x+30, actor_y+50, uc_x-120, uc_y], fill=colors['line'], width=1)
    
    img.save('diagrams/usecase_admin.png')
    print("✅ Created: usecase_admin.png")

def create_class_diagram():
    """Create Class Diagram"""
    width, height = 1600, 1200
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((600, 30), "Class Diagram - SAFORA System", fill=colors['text'], font=font_title)
    
    # User class (base)
    x, y = 700, 150
    draw.rectangle([x-150, y, x+150, y+200], fill=colors['class'], outline=colors['line'], width=2)
    draw.line([x-150, y+40, x+150, y+40], fill=colors['line'], width=2)
    draw.line([x-150, y+140, x+150, y+140], fill=colors['line'], width=2)
    draw.text((x-30, y+10), "User", fill=colors['text'], font=font_normal)
    # Attributes
    attrs = ["- id: ObjectId", "- name: String", "- email: String", "- phone: String", "- password: String"]
    for i, attr in enumerate(attrs):
        draw.text((x-140, y+50+i*18), attr, fill=colors['text'], font=font_small)
    # Methods
    methods = ["+ register()", "+ login()", "+ updateProfile()"]
    for i, method in enumerate(methods):
        draw.text((x-140, y+150+i*18), method, fill=colors['text'], font=font_small)
    
    # Passenger class
    px, py = 300, 450
    draw.rectangle([px-150, py, px+150, py+180], fill=colors['class'], outline=colors['line'], width=2)
    draw.line([px-150, py+40, px+150, py+40], fill=colors['line'], width=2)
    draw.line([px-150, py+110, px+150, py+110], fill=colors['line'], width=2)
    draw.text((px-45, py+10), "Passenger", fill=colors['text'], font=font_normal)
    # Inheritance arrow
    draw.line([px+50, py, x-50, y+200], fill=colors['line'], width=2)
    draw.polygon([x-50, y+200, x-60, y+185, x-40, y+185], fill=colors['bg'], outline=colors['line'])
    # Attributes
    p_attrs = ["- emergencyContacts: Array", "- pinkPassVerified: Boolean"]
    for i, attr in enumerate(p_attrs):
        draw.text((px-140, py+50+i*18), attr, fill=colors['text'], font=font_small)
    # Methods  
    p_methods = ["+ enrollPinkPass()", "+ requestRide()", "+ trackRide()"]
    for i, method in enumerate(p_methods):
        draw.text((px-140, py+120+i*18), method, fill=colors['text'], font=font_small)
    
    # Driver class
    dx, dy = 700, 450
    draw.rectangle([dx-150, dy, dx+150, dy+200], fill=colors['class'], outline=colors['line'], width=2)
    draw.line([dx-150, dy+40, dx+150, dy+40], fill=colors['line'], width=2)
    draw.line([dx-150, dy+130, dx+150, dy+130], fill=colors['line'], width=2)
    draw.text((dx-30, dy+10), "Driver", fill=colors['text'], font=font_normal)
    # Inheritance arrow
    draw.line([dx, dy, x, y+200], fill=colors['line'], width=2)
    draw.polygon([x, y+200, x-10, y+185, x+10, y+185], fill=colors['bg'], outline=colors['line'])
    # Attributes
    d_attrs = ["- licenseNumber: String", "- vehicleInfo: Object", "- rating: Number", "- status: String"]
    for i, attr in enumerate(d_attrs):
        draw.text((dx-140, dy+50+i*18), attr, fill=colors['text'], font=font_small)
    # Methods
    d_methods = ["+ updateStatus()", "+ acceptRide()", "+ completeRide()"]
    for i, method in enumerate(d_methods):
        draw.text((dx-140, dy+140+i*18), method, fill=colors['text'], font=font_small)
    
    # Admin class
    ax, ay = 1100, 450
    draw.rectangle([ax-150, ay, ax+150, ay+180], fill=colors['class'], outline=colors['line'], width=2)
    draw.line([ax-150, ay+40, ax+150, ay+40], fill=colors['line'], width=2)
    draw.line([ax-150, ay+110, ax+150, ay+110], fill=colors['line'], width=2)
    draw.text((ax-30, ay+10), "Admin", fill=colors['text'], font=font_normal)
    # Inheritance arrow
    draw.line([ax-50, ay, x+50, y+200], fill=colors['line'], width=2)
    draw.polygon([x+50, y+200, x+40, y+185, x+60, y+185], fill=colors['bg'], outline=colors['line'])
    # Attributes
    a_attrs = ["- permissions: Array", "- department: String"]
    for i, attr in enumerate(a_attrs):
        draw.text((ax-140, ay+50+i*18), attr, fill=colors['text'], font=font_small)
    # Methods
    a_methods = ["+ monitorRides()", "+ viewAlerts()", "+ generateReports()"]
    for i, method in enumerate(a_methods):
        draw.text((ax-140, ay+120+i*18), method, fill=colors['text'], font=font_small)
    
    # Ride class
    rx, ry = 300, 900
    draw.rectangle([rx-150, ry, rx+150, ry+180], fill=colors['class'], outline=colors['line'], width=2)
    draw.line([rx-150, ry+40, rx+150, ry+40], fill=colors['line'], width=2)
    draw.line([rx-150, ry+110, rx+150, ry+110], fill=colors['line'], width=2)
    draw.text((rx-20, ry+10), "Ride", fill=colors['text'], font=font_normal)
    # Attributes
    r_attrs = ["- passenger: User", "- driver: Driver", "- pickup: Location", "- status: String"]
    for i, attr in enumerate(r_attrs):
        draw.text((rx-140, ry+50+i*18), attr, fill=colors['text'], font=font_small)
    # Methods
    r_methods = ["+ create()", "+ updateStatus()", "+ complete()"]
    for i, method in enumerate(r_methods):
        draw.text((rx-140, ry+120+i*18), method, fill=colors['text'], font=font_small)
    
    # Alert class
    alx, aly = 700, 900
    draw.rectangle([alx-150, aly, alx+150, aly+180], fill=colors['class'], outline=colors['line'], width=2)
    draw.line([alx-150, aly+40, alx+150, aly+40], fill=colors['line'], width=2)
    draw.line([alx-150, aly+110, alx+150, aly+110], fill=colors['line'], width=2)
    draw.text((alx-25, aly+10), "Alert", fill=colors['text'], font=font_normal)
    # Attributes
    al_attrs = ["- ride: Ride", "- type: String", "- severity: String", "- location: Location"]
    for i, attr in enumerate(al_attrs):
        draw.text((alx-140, aly+50+i*18), attr, fill=colors['text'], font=font_small)
    # Methods
    al_methods = ["+ create()", "+ notify()", "+ resolve()"]
    for i, method in enumerate(al_methods):
        draw.text((alx-140, aly+120+i*18), method, fill=colors['text'], font=font_small)
    
    img.save('diagrams/class_diagram.png')
    print("✅ Created: class_diagram.png")

def create_sequence_diagram_ride():
    """Create Sequence Diagram for Ride Request"""
    width, height = 1600, 1400
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((500, 30), "Sequence Diagram - Ride Request Flow", fill=colors['text'], font=font_title)
    
    # Actors/Objects
    actors = [
        (200, 120, "Passenger"),
        (500, 120, "Mobile App"),
        (800, 120, "Backend"),
        (1100, 120, "AI Service"),
        (1400, 120, "Driver")
    ]
    
    y_pos = 120
    for x, y, name in actors:
        # Draw box
        draw.rectangle([x-80, y, x+80, y+50], fill=colors['actor'], outline=colors['line'], width=2)
        bbox = draw.textbbox((0, 0), name, font=font_normal)
        text_width = bbox[2] - bbox[0]
        draw.text((x - text_width//2, y+15), name, fill=colors['text'], font=font_normal)
        # Draw lifeline (dashed line simulated)
        for dash_y in range(y+50, 1300, 10):
            draw.line([x, dash_y, x, min(dash_y+5, 1300)], fill=colors['line'], width=1)
    
    # Messages
    messages = [
        (200, 500, 200, "1: Select locations"),
        (500, 800, 250, "2: Request ride"),
        (800, 800, 300, "3: Calculate route"),
        (800, 1100, 350, "4: Predict price"),
        (1100, 800, 400, "5: Return price"),
        (800, 500, 450, "6: Return estimate"),
        (500, 200, 500, "7: Show estimate"),
        (200, 500, 550, "8: Confirm request"),
        (500, 800, 600, "9: Create ride"),
        (800, 1100, 650, "10: Match driver"),
        (1100, 800, 700, "11: Return best driver"),
        (800, 1400, 750, "12: Send ride request"),
        (1400, 800, 800, "13: Accept ride"),
        (800, 500, 850, "14: Notify passenger"),
        (500, 200, 900, "15: Show driver details")
    ]
    
    for start_x, end_x, y, text in messages:
        # Draw arrow
        draw.line([start_x, y, end_x, y], fill=colors['line'], width=2)
        # Arrow head
        if start_x < end_x:
            draw.polygon([end_x, y, end_x-10, y-5, end_x-10, y+5], fill=colors['line'])
        else:
            draw.polygon([end_x, y, end_x+10, y-5, end_x+10, y+5], fill=colors['line'])
        # Text
        mid_x = (start_x + end_x) // 2
        draw.text((mid_x-50, y-20), text, fill=colors['text'], font=font_small)
    
    img.save('diagrams/sequence_ride_request.png')
    print("✅ Created: sequence_ride_request.png")

def create_state_diagram_ride():
    """Create State Diagram for Ride"""
    width, height = 1400, 1000
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((500, 30), "State Diagram - Ride States", fill=colors['text'], font=font_title)
    
    # Start state
    draw.ellipse([50, 150, 90, 190], fill=colors['line'])
    
    # States
    states = [
        (300, 150, "REQUESTED"),
        (700, 150, "MATCHED"),
        (1100, 150, "DRIVER_EN_ROUTE"),
        (300, 400, "DRIVER_ARRIVED"),
        (700, 400, "IN_PROGRESS"),
        (1100, 400, "COMPLETED"),
        (700, 650, "CANCELLED")
    ]
    
    for x, y, name in states:
        # Draw rounded rectangle
        draw.rounded_rectangle([x-100, y-40, x+100, y+40], radius=20, 
                              fill=colors['state'], outline=colors['line'], width=2)
        bbox = draw.textbbox((0, 0), name, font=font_normal)
        text_width = bbox[2] - bbox[0]
        draw.text((x - text_width//2, y-10), name, fill=colors['text'], font=font_normal)
    
    # Transitions
    # Start -> REQUESTED
    draw.line([90, 170, 200, 170], fill=colors['line'], width=2)
    draw.polygon([200, 170, 190, 165, 190, 175], fill=colors['line'])
    
    # REQUESTED -> MATCHED
    draw.line([400, 150, 600, 150], fill=colors['line'], width=2)
    draw.polygon([600, 150, 590, 145, 590, 155], fill=colors['line'])
    draw.text((450, 130), "driver accepts", fill=colors['text'], font=font_small)
    
    # MATCHED -> DRIVER_EN_ROUTE
    draw.line([800, 150, 1000, 150], fill=colors['line'], width=2)
    draw.polygon([1000, 150, 990, 145, 990, 155], fill=colors['line'])
    draw.text((830, 130), "starts navigation", fill=colors['text'], font=font_small)
    
    # DRIVER_EN_ROUTE -> DRIVER_ARRIVED
    draw.line([1100, 190, 1100, 300, 400, 300, 400, 360], fill=colors['line'], width=2)
    draw.polygon([400, 360, 395, 350, 405, 350], fill=colors['line'])
    draw.text((600, 280), "arrives at pickup", fill=colors['text'], font=font_small)
    
    # DRIVER_ARRIVED -> IN_PROGRESS
    draw.line([400, 400, 600, 400], fill=colors['line'], width=2)
    draw.polygon([600, 400, 590, 395, 590, 405], fill=colors['line'])
    draw.text((450, 380), "passenger boards", fill=colors['text'], font=font_small)
    
    # IN_PROGRESS -> COMPLETED
    draw.line([800, 400, 1000, 400], fill=colors['line'], width=2)
    draw.polygon([1000, 400, 990, 395, 990, 405], fill=colors['line'])
    draw.text((830, 380), "destination reached", fill=colors['text'], font=font_small)
    
    # Multiple states -> CANCELLED
    draw.line([300, 190, 650, 610], fill=colors['line'], width=2)
    draw.polygon([650, 610, 645, 600, 655, 600], fill=colors['line'])
    
    draw.line([700, 190, 700, 610], fill=colors['line'], width=2)
    draw.polygon([700, 610, 695, 600, 705, 600], fill=colors['line'])
    
    img.save('diagrams/state_ride.png')
    print("✅ Created: state_ride.png")

def create_er_diagram():
    """Create Entity Relationship Diagram"""
    width, height = 1600, 1000
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((550, 30), "Entity Relationship Diagram", fill=colors['text'], font=font_title)
    
    # Users Entity
    ux, uy = 300, 250
    draw.rectangle([ux-120, uy, ux+120, uy+250], fill='#FFE5CC', outline=colors['line'], width=2)
    draw.rectangle([ux-120, uy, ux+120, uy+40], fill='#FFA500', outline=colors['line'], width=2)
    draw.text((ux-25, uy+10), "Users", fill=colors['text'], font=font_normal)
    attrs = ["_id: ObjectId (PK)", "name: String", "email: String", "phone: String", "password: String", "cnic: String", "role: String"]
    for i, attr in enumerate(attrs):
        draw.text((ux-110, uy+50+i*25), attr, fill=colors['text'], font=font_small)
    
    # Drivers Entity
    dx, dy = 900, 150
    draw.rectangle([dx-120, dy, dx+120, dy+300], fill='#E6F5FF', outline=colors['line'], width=2)
    draw.rectangle([dx-120, dy, dx+120, dy+40], fill='#4DA6FF', outline=colors['line'], width=2)
    draw.text((dx-30, dy+10), "Drivers", fill=colors['text'], font=font_normal)
    d_attrs = ["_id: ObjectId (PK)", "user: ObjectId (FK)", "licenseNumber: String", "vehicleInfo: Object", "rating: Number", "status: String", "location: GeoJSON", "idleTime: Number"]
    for i, attr in enumerate(d_attrs):
        draw.text((dx-110, dy+50+i*25), attr, fill=colors['text'], font=font_small)
    
    # Relationship: Users 1-1 Drivers
    draw.line([ux+120, uy+125, dx-120, dy+150], fill=colors['line'], width=2)
    draw.text((550, 250), "1:1", fill=colors['text'], font=font_normal)
    
    # Rides Entity
    rx, ry = 300, 650
    draw.rectangle([rx-120, ry, rx+120, ry+280], fill='#E6FFE6', outline=colors['line'], width=2)
    draw.rectangle([rx-120, ry, rx+120, ry+40], fill='#66CC66', outline=colors['line'], width=2)
    draw.text((rx-25, ry+10), "Rides", fill=colors['text'], font=font_normal)
    r_attrs = ["_id: ObjectId (PK)", "passenger: ObjectId (FK)", "driver: ObjectId (FK)", "pickupLocation: Object", "dropoffLocation: Object", "distance: Number", "estimatedPrice: Number", "status: String"]
    for i, attr in enumerate(r_attrs):
        draw.text((rx-110, ry+50+i*25), attr, fill=colors['text'], font=font_small)
    
    # Relationship: Users 1-N Rides
    draw.line([ux, uy+250, ux, ry], fill=colors['line'], width=2)
    draw.text((ux+10, 520), "1:N", fill=colors['text'], font=font_normal)
    
    # Relationship: Drivers 1-N Rides
    draw.line([dx, dy+300, dx, 600, rx+120, 790], fill=colors['line'], width=2)
    draw.text((750, 670), "1:N", fill=colors['text'], font=font_normal)
    
    # Alerts Entity
    ax, ay = 900, 670
    draw.rectangle([ax-120, ay, ax+120, ay+230], fill='#FFE6E6', outline=colors['line'], width=2)
    draw.rectangle([ax-120, ay, ax+120, ay+40], fill='#FF6666', outline=colors['line'], width=2)
    draw.text((ax-25, ay+10), "Alerts", fill=colors['text'], font=font_normal)
    a_attrs = ["_id: ObjectId (PK)", "ride: ObjectId (FK)", "type: String", "severity: String", "location: Object", "status: String", "resolvedAt: Date"]
    for i, attr in enumerate(a_attrs):
        draw.text((ax-110, ay+50+i*25), attr, fill=colors['text'], font=font_small)
    
    # Relationship: Rides 1-N Alerts
    draw.line([rx+120, ry+140, ax-120, ay+115], fill=colors['line'], width=2)
    draw.text((550, 760), "1:N", fill=colors['text'], font=font_normal)
    
    img.save('diagrams/er_diagram.png')
    print("✅ Created: er_diagram.png")

def create_component_diagram():
    """Create Component Diagram"""
    width, height = 1600, 1200
    img = Image.new('RGB', (width, height), colors['bg'])
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 24)
        font_normal = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((550, 30), "Component Diagram - System Architecture", fill=colors['text'], font=font_title)
    
    # Mobile Apps
    draw.rectangle([50, 150, 350, 400], fill='#E6F3FF', outline=colors['line'], width=3)
    draw.text((120, 160), "Mobile Applications", fill=colors['text'], font=font_normal)
    draw.rectangle([70, 200, 330, 250], fill='#B3D9FF', outline=colors['line'], width=2)
    draw.text((130, 215), "Passenger App", fill=colors['text'], font=font_small)
    draw.rectangle([70, 270, 330, 320], fill='#B3D9FF', outline=colors['line'], width=2)
    draw.text((150, 285), "Driver App", fill=colors['text'], font=font_small)
    draw.rectangle([70, 340, 330, 390], fill='#B3D9FF', outline=colors['line'], width=2)
    draw.text((120, 355), "Admin Dashboard", fill=colors['text'], font=font_small)
    
    # Backend Server
    draw.rectangle([550, 150, 900, 500], fill='#E6FFE6', outline=colors['line'], width=3)
    draw.text((630, 160), "Backend Server", fill=colors['text'], font=font_normal)
    components = ["API Gateway", "Auth Service", "User Management", "Ride Service", "Safety Sentinel", "Notification (Socket.io)"]
    for i, comp in enumerate(components):
        y_pos = 200 + i * 50
        draw.rectangle([570, y_pos, 880, y_pos+40], fill='#B3FFB3', outline=colors['line'], width=2)
        draw.text((650, y_pos+12), comp, fill=colors['text'], font=font_small)
    
    # AI Microservice
    draw.rectangle([1050, 150, 1500, 450], fill='#FFF0E6', outline=colors['line'], width=3)
    draw.text((1200, 160), "AI Microservice", fill=colors['text'], font=font_normal)
    ai_comps = ["Pink Pass Verification", "Price Prediction", "Driver Matching", "Sentiment Analysis"]
    for i, comp in enumerate(ai_comps):
        y_pos = 200 + i * 60
        draw.rectangle([1070, y_pos, 1480, y_pos+50], fill='#FFD9B3', outline=colors['line'], width=2)
        draw.text((1170, y_pos+15), comp, fill=colors['text'], font=font_small)
    
    # Database
    draw.rectangle([550, 650, 900, 900], fill='#F0E6FF', outline=colors['line'], width=3)
    draw.text((670, 660), "MongoDB Database", fill=colors['text'], font=font_normal)
    db_colls = ["Users Collection", "Drivers Collection", "Rides Collection", "Alerts Collection"]
    for i, coll in enumerate(db_colls):
        y_pos = 710 + i * 50
        draw.rectangle([570, y_pos, 880, y_pos+40], fill='#D9B3FF', outline=colors['line'], width=2)
        draw.text((650, y_pos+12), coll, fill=colors['text'], font=font_small)
    
    # External APIs
    draw.rectangle([1050, 650, 1500, 850], fill='#FFE6F0', outline=colors['line'], width=3)
    draw.text((1200, 660), "External APIs", fill=colors['text'], font=font_normal)
    ext_apis = ["Google Maps API", "Twilio SMS API"]
    for i, api in enumerate(ext_apis):
        y_pos = 710 + i * 60
        draw.rectangle([1070, y_pos, 1480, y_pos+50], fill='#FFB3D9', outline=colors['line'], width=2)
        draw.text((1200, y_pos+15), api, fill=colors['text'], font=font_small)
    
    # Connections
    # Mobile -> Backend
    draw.line([350, 275, 550, 325], fill=colors['line'], width=2)
    draw.polygon([550, 325, 540, 320, 540, 330], fill=colors['line'])
    draw.text((420, 285), "HTTPS", fill=colors['text'], font=font_small)
    
    # Backend -> AI
    draw.line([900, 325, 1050, 300], fill=colors['line'], width=2)
    draw.polygon([1050, 300, 1040, 295, 1040, 305], fill=colors['line'])
    draw.text((950, 285), "REST API", fill=colors['text'], font=font_small)
    
    # Backend -> Database
    draw.line([725, 500, 725, 650], fill=colors['line'], width=2)
    draw.polygon([725, 650, 720, 640, 730, 640], fill=colors['line'])
    draw.text((740, 560), "MongoDB Protocol", fill=colors['text'], font=font_small)
    
    # Backend -> External APIs
    draw.line([900, 400, 1050, 750], fill=colors['line'], width=2)
    draw.polygon([1050, 750, 1045, 740, 1055, 740], fill=colors['line'])
    draw.text([950, 550], "REST API", fill=colors['text'], font=font_small)
    
    img.save('diagrams/component_diagram.png')
    print("✅ Created: component_diagram.png")

# Generate all diagrams
print("Generating SAFORA SRS2 Diagrams...")
print("=" * 50)

create_use_case_diagram_passenger()
create_use_case_diagram_driver()
create_use_case_diagram_admin()
create_class_diagram()
create_sequence_diagram_ride()
create_state_diagram_ride()
create_er_diagram()
create_component_diagram()

print("=" * 50)
print(f"✅ All diagrams generated successfully in 'diagrams/' folder")
