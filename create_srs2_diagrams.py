"""
Create diagrams for SAFORA SRS2 document using mermaid-compatible format
"""

diagrams = {}

# Use Case Diagram - Passenger
diagrams['usecase_passenger'] = """
@startuml
left to right direction
actor Passenger

rectangle "SAFORA System" {
  usecase "Register Account" as UC1
  usecase "Login" as UC2
  usecase "Enroll in Pink Pass" as UC3
  usecase "Request Ride" as UC4
  usecase "Track Ride" as UC5
  usecase "Rate Driver" as UC6
  usecase "Trigger SOS" as UC7
  usecase "View Ride History" as UC8
}

Passenger --> UC1
Passenger --> UC2
Passenger --> UC3
Passenger --> UC4
Passenger --> UC5
Passenger --> UC6
Passenger --> UC7
Passenger --> UC8

@enduml
"""

# Use Case Diagram - Driver
diagrams['usecase_driver'] = """
@startuml
left to right direction
actor Driver

rectangle "SAFORA System" {
  usecase "Register as Driver" as UC1
  usecase "Login" as UC2
  usecase "Update Availability" as UC3
  usecase "Accept/Reject Ride" as UC4
  usecase "Navigate to Pickup" as UC5
  usecase "Start Ride" as UC6
  usecase "Complete Ride" as UC7
  usecase "View Earnings" as UC8
}

Driver --> UC1
Driver --> UC2
Driver --> UC3
Driver --> UC4
Driver --> UC5
Driver --> UC6
Driver --> UC7
Driver --> UC8

@enduml
"""

# Use Case Diagram - Admin
diagrams['usecase_admin'] = """
@startuml
left to right direction
actor Admin

rectangle "SAFORA System" {
  usecase "Monitor Active Rides" as UC1
  usecase "View Safety Alerts" as UC2
  usecase "Manage Users" as UC3
  usecase "Generate Reports" as UC4
  usecase "Analyze Heatmaps" as UC5
  usecase "Resolve Alerts" as UC6
}

Admin --> UC1
Admin --> UC2
Admin --> UC3
Admin --> UC4
Admin --> UC5
Admin --> UC6

@enduml
"""

# Save diagrams to files
import os
os.makedirs('diagrams', exist_ok=True)

for name, content in diagrams.items():
    with open(f'diagrams/{name}.txt', 'w') as f:
        f.write(content)

print("✅ Diagram files created in 'diagrams' folder")
print(f"   Created {len(diagrams)} diagram templates")
