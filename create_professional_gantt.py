"""
Create Professional Gantt Chart for SAFORA Project
Clean, aligned, professional appearance
"""

from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('diagrams', exist_ok=True)

# Create high-resolution image
width, height = 2000, 1400
img = Image.new('RGB', (width, height), '#FFFFFF')
draw = ImageDraw.Draw(img)

# Load fonts
try:
    font_title = ImageFont.truetype("arialbd.ttf", 36)
    font_heading = ImageFont.truetype("arialbd.ttf", 22)
    font_normal = ImageFont.truetype("arial.ttf", 20)
    font_small = ImageFont.truetype("arial.ttf", 18)
except:
    font_title = font_heading = font_normal = font_small = ImageFont.load_default()

# Colors
colors = {
    'title': '#003366',
    'header_bg': '#4A90E2',
    'header_text': '#FFFFFF',
    'bar': '#5B9BD5',
    'bar_border': '#2E5C8A',
    'grid': '#CCCCCC',
    'text': '#000000',
    'bg': '#FFFFFF'
}

# Title
title_text = "Project Gantt Chart - SAFORA Development"
bbox = draw.textbbox((0, 0), title_text, font=font_title)
title_width = bbox[2] - bbox[0]
draw.text(((width - title_width) // 2, 40), title_text, fill=colors['title'], font=font_title)

# Chart dimensions
chart_start_x = 320
chart_start_y = 140
chart_width = 1600
chart_height = 1100
col_width = 200
row_height = 120

# Week headers
weeks = ['Week 1-2', 'Week 3-5', 'Week 6-8', 'Week 9-12', 
         'Week 13-15', 'Week 16-17', 'Week 18-19', 'Week 20-22']

# Draw header row
for i, week in enumerate(weeks):
    x = chart_start_x + i * col_width
    # Header cell background
    draw.rectangle([x, chart_start_y, x + col_width, chart_start_y + 50], 
                   fill=colors['header_bg'], outline=colors['bar_border'], width=2)
    # Header text
    bbox = draw.textbbox((0, 0), week, font=font_heading)
    text_width = bbox[2] - bbox[0]
    draw.text((x + (col_width - text_width) // 2, chart_start_y + 12), 
              week, fill=colors['header_text'], font=font_heading)

# Project phases with exact timing
phases = [
    ('Phase 1: Setup', 1, 2),              # Weeks 1-2
    ('Phase 2: Backend', 3, 5),            # Weeks 3-5
    ('Phase 3: AI Service', 6, 8),         # Weeks 6-8
    ('Phase 4: Mobile Apps', 9, 12),       # Weeks 9-12
    ('Phase 5: Dashboard', 16, 17),        # Weeks 16-17
    ('Phase 6: Safety', 13, 15),           # Weeks 13-15
    ('Phase 7: AI Training', 18, 19),      # Weeks 18-19
    ('Phase 8: Testing', 20, 22),          # Weeks 20-22
]

# Week to column mapping for perfect alignment
week_to_col = {
    1: 0, 2: 0,           # Week 1-2 -> Column 0
    3: 1, 4: 1, 5: 1,     # Week 3-5 -> Column 1
    6: 2, 7: 2, 8: 2,     # Week 6-8 -> Column 2
    9: 3, 10: 3, 11: 3, 12: 3,  # Week 9-12 -> Column 3
    13: 4, 14: 4, 15: 4,  # Week 13-15 -> Column 4
    16: 5, 17: 5,         # Week 16-17 -> Column 5
    18: 6, 19: 6,         # Week 18-19 -> Column 6
    20: 7, 21: 7, 22: 7   # Week 20-22 -> Column 7
}

# Draw grid lines
y = chart_start_y + 50
for i in range(9):  # 8 phases + 1
    draw.line([chart_start_x, y, chart_start_x + chart_width, y], 
              fill=colors['grid'], width=1)
    y += row_height

# Vertical grid lines
for i in range(9):  # 8 columns + 1
    x = chart_start_x + i * col_width
    draw.line([x, chart_start_y, x, chart_start_y + 50 + (row_height * 8)], 
              fill=colors['bar_border'], width=2)

# Draw phase rows
y_offset = chart_start_y + 50

for phase_name, start_week, end_week in phases:
    # Phase label on left
    label_x = 50
    label_y = y_offset + (row_height - 30) // 2
    draw.text((label_x, label_y), phase_name, fill=colors['text'], font=font_normal)
    
    # Calculate bar position
    start_col = week_to_col[start_week]
    end_col = week_to_col[end_week]
    
    # Calculate exact pixel positions
    bar_x_start = chart_start_x + (start_col * col_width) + 10
    bar_x_end = chart_start_x + ((end_col + 1) * col_width) - 10
    bar_y_top = y_offset + 15
    bar_y_bottom = y_offset + row_height - 15
    
    # Draw bar with shadow effect
    # Shadow
    draw.rectangle([bar_x_start + 4, bar_y_top + 4, bar_x_end + 4, bar_y_bottom + 4],
                   fill='#AAAAAA')
    # Main bar
    draw.rectangle([bar_x_start, bar_y_top, bar_x_end, bar_y_bottom],
                   fill=colors['bar'], outline=colors['bar_border'], width=3)
    
    # Duration label inside bar
    duration = end_week - start_week + 1
    duration_text = f"{duration} weeks"
    bbox = draw.textbbox((0, 0), duration_text, font=font_small)
    text_width = bbox[2] - bbox[0]
    text_x = (bar_x_start + bar_x_end - text_width) // 2
    text_y = (bar_y_top + bar_y_bottom - 20) // 2
    
    # Text background for readability
    draw.rectangle([text_x - 5, text_y - 2, text_x + text_width + 5, text_y + 22],
                   fill='#FFFFFF')
    draw.text((text_x, text_y), duration_text, fill=colors['text'], font=font_small)
    
    y_offset += row_height

# Legend
legend_y = chart_start_y + 50 + (row_height * 8) + 40
draw.text((chart_start_x, legend_y), "Legend:", fill=colors['text'], font=font_heading)

legend_y += 40
draw.rectangle([chart_start_x, legend_y, chart_start_x + 80, legend_y + 40],
               fill=colors['bar'], outline=colors['bar_border'], width=3)
draw.text((chart_start_x + 100, legend_y + 8), "Development Phase", 
          fill=colors['text'], font=font_normal)

# Project info
info_y = legend_y + 70
draw.text((chart_start_x, info_y), "Total Project Duration: 22 Weeks", 
          fill=colors['title'], font=font_heading)

img.save('diagrams/gantt_chart_professional.png')
print("✅ Professional Gantt chart created: gantt_chart_professional.png")
print("   • Perfect alignment with week columns")
print("   • Clean grid layout")
print("   • Professional styling with shadows")
print("   • Duration labels on each bar")
print("   • High resolution (2000x1400)")
