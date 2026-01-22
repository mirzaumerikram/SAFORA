---
title: "SAFORA - Smart Ride: Software Requirements Specification Phase 1"
author: 
  - "Mirza Umer Ikram (S3F22UBSCS081)"
  - "Ruhma Bilal (S3F22UBSCS088)"
advisor: "Tanveer Ahmed"
group: "11"
date: "January 19, 2026"
---

# SAFORA (Smart Ride)
## Software Requirements Specification - Phase 1

**University of Central Punjab**  
**Faculty of Information Technology**  
**Department of Computer Science**

---

**Project Title:** SAFORA - Smart Ride  
**Project Advisor:** Tanveer Ahmed  
**Group ID:** 11  
**Team Members:**
- Mirza Umer Ikram (S3F22UBSCS081)
- Ruhma Bilal (S3F22UBSCS088)

**Date:** January 19, 2026

---

## Document Revision History

| Version | Date | Description | Author(s) |
|---------|------|-------------|-----------|
| 1.0 | January 15, 2026 | Initial Draft | Mirza Umer Ikram, Ruhma Bilal |
| 1.1 | January 19, 2026 | IEEE Format Update | Mirza Umer Ikram, Ruhma Bilal |

---

## Table of Contents

1. Introduction
   1.1 Purpose
   1.2 Scope
   1.3 Definitions, Acronyms, and Abbreviations
   1.4 References
   1.5 Overview

2. Overall Description
   2.1 Product Perspective
   2.2 Product Functions
   2.3 User Characteristics
   2.4 Constraints
   2.5 Assumptions and Dependencies

3. Specific Requirements
   3.1 Functional Requirements
   3.2 Non-Functional Requirements
   3.3 Interface Requirements

4. System Models
   4.1 Use Case Diagrams
   4.2 Sequence Diagrams
   4.3 Class Diagrams
   4.4 Entity Relationship Diagrams

5. Project Plan
   5.1 Development Methodology
   5.2 Timeline and Milestones
   5.3 Resource Allocation

6. Appendices

---

# 1. INTRODUCTION

## 1.1 Purpose

This Software Requirements Specification (SRS) document provides a complete description of the SAFORA (Smart Ride) system - an AI-powered ride-hailing platform implementing proactive safety measures. This document is intended for:

- Development team members
- Project stakeholders and supervisors
- Quality assurance personnel
- Future maintenance teams

The document follows IEEE Std 830-1998 guidelines for software requirements specifications.

## 1.2 Scope

**Product Name:** SAFORA (Smart Ride)

**Product Description:** SAFORA is an intelligent ride-hailing platform that addresses critical safety and efficiency gaps in existing transportation services through AI-driven proactive safety mechanisms.

### 1.2.1 Product Features

The system implements three core innovations:

**1. Pink Pass (Biometric Women-Only Mode)**
- Two-layer verification using CNIC and liveness detection
- Haar Cascade for face detection
- CNN-based blink verification for anti-spoofing
- Verification completion in <15 seconds

**2. Safety Sentinel (Automated Route Monitoring)**
- Real-time GPS tracking and route deviation detection
- Point-to-line distance calculation using Turf.js
- Automated alerts when deviation >500m for >30 seconds
- Dual notification system (admin dashboard + SMS to emergency contacts)

**3. Smart Driver Selection**
- AI-driven matching algorithm: Score = 0.50×Distance + 0.30×Rating + 0.20×Fairness
- Fairness metric: IdleTime/TotalOnlineTime (last 4 hours)
- Reduces driver monopolization and wait times

### 1.2.2 Benefits

- **For Passengers:** Enhanced safety through proactive monitoring, verified women-only rides, faster pickup times
- **For Drivers:** Fair ride distribution, reduced idle time, transparent rating system
- **For Administrators:** Real-time monitoring, automated alerts, data-driven insights

### 1.2.3 In Scope

- User registration and authentication (Passenger/Driver/Admin)
- Ride booking with real-time price estimation
- GPS-based tracking and route monitoring
- Pink Pass enrollment and verification
- Automated safety alerts
- Smart driver matching algorithm
- Admin dashboard with analytics
- Cash payment processing

### 1.2.4 Out of Scope

- Multi-city operations (Phase 1 limited to Lahore)
- Third-party payment gateway integration
- Carpooling/ride-sharing features
- Advanced fraud detection systems
- International operations

## 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CNN | Convolutional Neural Network |
| CNIC | Computerized National Identity Card |
| EAR | Eye Aspect Ratio |
| GPS | Global Positioning System |
| JWT | JSON Web Token |
| MERN | MongoDB, Express.js, React, Node.js |
| NLP | Natural Language Processing |
| PKR | Pakistani Rupees |
| REST | Representational State Transfer |
| SMS | Short Message Service |
| SOS | Emergency distress signal |
| SRS | Software Requirements Specification |
| TPR | True Positive Rate |
| FPR | False Positive Rate |

## 1.4 References

1. IEEE Std 830-1998, "IEEE Recommended Practice for Software Requirements Specifications"
2. Zhang, L., et al. (2021). "Machine Learning for Driver Anomaly Detection in Ride-Hailing Services." *Journal of Transportation Safety*, 15(3), 234-248.
3. Patel, R., et al. (2020). "CNN-Based Liveness Detection for Biometric Authentication." *IEEE Transactions on Biometrics*, 8(2), 112-125.
4. MongoDB Documentation. (2025). Retrieved from https://docs.mongodb.com
5. React Native Documentation. (2025). Retrieved from https://reactnative.dev
6. TensorFlow/Keras Documentation. (2025). Retrieved from https://www.tensorflow.org

## 1.5 Overview

This SRS document is organized as follows:

- **Section 2** provides an overall description of the SAFORA system, including product perspective, functions, user characteristics, and constraints.
- **Section 3** details specific functional and non-functional requirements.
- **Section 4** presents system models including use case, sequence, class, and ER diagrams.
- **Section 5** outlines the project plan with methodology, timeline, and resource allocation.
- **Section 6** contains appendices with supplementary information.

---

# 2. OVERALL DESCRIPTION

## 2.1 Product Perspective

SAFORA is a new, self-contained ride-hailing platform designed to address specific safety and efficiency gaps in existing services operating in Pakistan. The system consists of four main components:

### 2.1.1 System Architecture

**Backend Server (Node.js/Express)**
- RESTful API for all client applications
- Real-time communication via Socket.io
- MongoDB database for data persistence
- JWT-based authentication

**AI Microservice (Python/Flask)**
- Pink Pass liveness detection
- Price prediction using Linear Regression
- Smart driver matching algorithm
- Sentiment analysis and demand clustering

**Mobile Applications (React Native)**
- Passenger app for iOS and Android
- Driver app for iOS and Android
- Real-time GPS tracking
- In-app notifications

**Admin Dashboard (React.js)**
- Web-based monitoring interface
- Real-time safety alerts
- Analytics and reporting
- Heatmap visualization

### 2.1.2 System Interfaces

**Hardware Interfaces:**
- Mobile device GPS sensors
- Mobile device cameras (for Pink Pass verification)
- Server infrastructure (cloud or on-premise)

**Software Interfaces:**
- Google Maps API for routing and geocoding
- Twilio API for SMS notifications
- MongoDB database (v6.0+)
- Node.js runtime (v18+)
- Python runtime (v3.9+)

**Communication Interfaces:**
- HTTPS for secure API communication
- WebSocket (Socket.io) for real-time updates
- SMS for emergency notifications

## 2.2 Product Functions

### 2.2.1 User Management

**FR-UM-01:** The system shall allow users to register as Passenger, Driver, or Admin with CNIC verification.

**FR-UM-02:** The system shall authenticate users using email/phone and password with JWT token generation.

**FR-UM-03:** The system shall maintain user profiles with personal information, emergency contacts, and preferences.

### 2.2.2 Pink Pass Feature

**FR-PP-01:** The system shall allow female passengers to enroll in Pink Pass by submitting a video for liveness verification.

**FR-PP-02:** The system shall detect faces using Haar Cascade algorithm with >95% accuracy.

**FR-PP-03:** The system shall verify liveness using CNN-based blink detection with >98% accuracy and <5% false positive rate.

**FR-PP-04:** The system shall complete Pink Pass verification within 15 seconds.

**FR-PP-05:** The system shall only match Pink Pass rides with verified female drivers.

### 2.2.3 Ride Booking

**FR-RB-01:** The system shall allow passengers to request rides by specifying pickup and dropoff locations.

**FR-RB-02:** The system shall calculate estimated price using AI price prediction model (±PKR 30 accuracy).

**FR-RB-03:** The system shall match passengers with drivers using smart driver selection algorithm.

**FR-RB-04:** The system shall provide real-time ride status updates to both passenger and driver.

**FR-RB-05:** The system shall track ride duration, distance, and route in real-time.

### 2.2.4 Safety Sentinel

**FR-SS-01:** The system shall monitor all active rides using GPS tracking at 5-second intervals.

**FR-SS-02:** The system shall calculate point-to-line distance between current location and planned route.

**FR-SS-03:** The system shall trigger route deviation alert if distance >500m for >30 seconds.

**FR-SS-04:** The system shall detect suspicious stops if vehicle stationary for >5 minutes.

**FR-SS-05:** The system shall send parallel alerts to admin dashboard (Socket.io) and emergency contacts (SMS) within 30 seconds.

### 2.2.5 Driver Management

**FR-DM-01:** The system shall allow drivers to register with license and vehicle information.

**FR-DM-02:** The system shall track driver online/offline status and location.

**FR-DM-03:** The system shall calculate driver fairness metric: IdleTime/TotalOnlineTime (last 4 hours).

**FR-DM-04:** The system shall maintain driver ratings based on passenger feedback.

### 2.2.6 Admin Dashboard

**FR-AD-01:** The system shall display real-time safety alerts with severity levels.

**FR-AD-02:** The system shall generate demand heatmaps using K-Means clustering.

**FR-AD-03:** The system shall analyze passenger feedback using TextBlob sentiment analysis.

**FR-AD-04:** The system shall provide analytics on rides, drivers, and safety incidents.

## 2.3 User Characteristics

### 2.3.1 Passengers
- **Technical Expertise:** Basic smartphone usage
- **Age Range:** 18-65 years
- **Primary Needs:** Safe, affordable, reliable transportation
- **Usage Frequency:** Daily to weekly

### 2.3.2 Drivers
- **Technical Expertise:** Basic smartphone and navigation app usage
- **Requirements:** Valid driver's license, registered vehicle
- **Primary Needs:** Fair ride distribution, consistent income
- **Usage Frequency:** Daily (professional drivers)

### 2.3.3 Administrators
- **Technical Expertise:** Moderate to advanced computer skills
- **Responsibilities:** Monitor safety, manage users, analyze data
- **Usage Frequency:** Daily during business hours

## 2.4 Constraints

### 2.4.1 Regulatory Constraints
- Must comply with Pakistan's data protection regulations
- CNIC verification required for all users
- SMS notifications must follow PTCL guidelines

### 2.4.2 Technical Constraints
- Mobile apps must support Android 8.0+ and iOS 13.0+
- Backend must handle 1000+ concurrent users
- API response time must be <500ms for 95% of requests
- GPS accuracy must be within 10 meters

### 2.4.3 Business Constraints
- Phase 1 limited to Lahore city
- Cash-only payments initially
- Development timeline: 22 weeks
- Budget constraints for cloud infrastructure

## 2.5 Assumptions and Dependencies

### 2.5.1 Assumptions
- Users have smartphones with GPS and camera capabilities
- Reliable internet connectivity (3G/4G/WiFi) available
- Google Maps API will remain accessible and affordable
- Twilio SMS service will maintain 99% uptime

### 2.5.2 Dependencies
- MongoDB database availability
- Third-party API services (Google Maps, Twilio)
- Mobile OS platform stability
- Cloud infrastructure reliability

---

# 3. SPECIFIC REQUIREMENTS

## 3.1 Functional Requirements

### 3.1.1 Authentication and Authorization

**FR-3.1.1-01:** User Registration
- **Description:** System shall allow new users to create accounts
- **Input:** Name, email, phone, password, CNIC, gender, role
- **Processing:** Validate CNIC format, hash password, generate JWT
- **Output:** User account created, authentication token
- **Priority:** High

**FR-3.1.1-02:** User Login
- **Description:** System shall authenticate existing users
- **Input:** Email/phone and password
- **Processing:** Verify credentials, generate JWT token
- **Output:** Authentication token, user profile
- **Priority:** High

### 3.1.2 Pink Pass Verification

**FR-3.1.2-01:** Video Upload
- **Description:** Female passengers can upload video for verification
- **Input:** 5-10 second video file (max 10MB)
- **Processing:** Extract frames, detect face, verify liveness
- **Output:** Verification status (approved/rejected), confidence score
- **Priority:** High

**FR-3.1.2-02:** Liveness Detection
- **Description:** System shall detect live human face vs. photo/video
- **Input:** Video frames
- **Processing:** Haar Cascade face detection + CNN blink detection
- **Output:** Liveness score (0-1), blink count, verification result
- **Priority:** High

### 3.1.3 Ride Management

**FR-3.1.3-01:** Ride Request
- **Description:** Passengers can request rides
- **Input:** Pickup location, dropoff location, ride type (standard/pink-pass)
- **Processing:** Calculate route, predict price, match driver
- **Output:** Estimated price, estimated time, matched driver
- **Priority:** High

**FR-3.1.3-02:** Driver Matching
- **Description:** System shall match optimal driver to passenger
- **Input:** Passenger location, available drivers, ride type
- **Processing:** Calculate weighted scores for all nearby drivers
- **Output:** Ranked list of drivers, top match selected
- **Priority:** High

### 3.1.4 Safety Monitoring

**FR-3.1.4-01:** Route Deviation Detection
- **Description:** System shall detect when ride deviates from planned route
- **Input:** Current GPS location, planned route polyline
- **Processing:** Calculate point-to-line distance using Turf.js
- **Output:** Deviation distance, alert trigger if threshold exceeded
- **Priority:** Critical

**FR-3.1.4-02:** Emergency Alert System
- **Description:** System shall send alerts when safety anomaly detected
- **Input:** Alert type, ride details, passenger info
- **Processing:** Send Socket.io notification to admin, SMS to emergency contacts
- **Output:** Alert notifications sent, confirmation receipts
- **Priority:** Critical

## 3.2 Non-Functional Requirements

### 3.2.1 Performance Requirements

**NFR-3.2.1-01:** Response Time
- API endpoints shall respond within 500ms for 95% of requests
- Pink Pass verification shall complete within 15 seconds
- Driver matching shall complete within 3 seconds

**NFR-3.2.1-02:** Throughput
- System shall support 1000+ concurrent users
- System shall handle 100+ simultaneous rides
- Database shall process 10,000+ transactions per hour

**NFR-3.2.1-03:** Scalability
- System architecture shall support horizontal scaling
- Database shall support sharding for future growth
- API shall be stateless to enable load balancing

### 3.2.2 Security Requirements

**NFR-3.2.2-01:** Authentication
- All API endpoints shall require JWT authentication
- Passwords shall be hashed using bcrypt (cost factor 10)
- JWT tokens shall expire after 24 hours

**NFR-3.2.2-02:** Data Protection
- CNIC data shall be encrypted using AES-256
- All API communication shall use HTTPS/TLS 1.3
- Personal data shall comply with Pakistan data protection laws

**NFR-3.2.2-03:** Authorization
- Role-based access control (Passenger/Driver/Admin)
- Admin-only access to dashboard and analytics
- Drivers can only access assigned ride details

### 3.2.3 Reliability Requirements

**NFR-3.2.3-01:** Availability
- System shall maintain 99% uptime during business hours
- Planned maintenance windows shall not exceed 4 hours/month
- Critical safety features shall have 99.9% availability

**NFR-3.2.3-02:** Fault Tolerance
- System shall gracefully handle third-party API failures
- SMS alerts shall have fallback notification mechanisms
- Database shall have automated backup every 6 hours

### 3.2.4 Usability Requirements

**NFR-3.2.4-01:** User Interface
- Mobile apps shall follow platform design guidelines (Material/iOS)
- Critical actions shall require confirmation
- Error messages shall be clear and actionable

**NFR-3.2.4-02:** Accessibility
- Text shall be readable with minimum font size 14px
- Color contrast shall meet WCAG 2.1 AA standards
- UI shall support Urdu and English languages

### 3.2.5 Maintainability Requirements

**NFR-3.2.5-01:** Code Quality
- Code coverage shall exceed 80% for unit tests
- Code shall follow ESLint and PEP 8 standards
- API documentation shall be maintained using Swagger/OpenAPI

**NFR-3.2.5-02:** Monitoring
- System shall log all errors and exceptions
- Performance metrics shall be tracked and visualized
- Safety alerts shall be logged with full audit trail

## 3.3 Interface Requirements

### 3.3.1 User Interfaces

**Mobile App Screens:**
1. Authentication (Login/Register)
2. Home/Dashboard
3. Ride Booking
4. Pink Pass Enrollment
5. Ride Tracking
6. Ride History
7. Profile Management
8. Emergency SOS

**Admin Dashboard Pages:**
1. Real-time Monitoring
2. Safety Alerts
3. User Management
4. Analytics & Reports
5. Heatmap Visualization

### 3.3.2 Hardware Interfaces

- GPS sensor for location tracking
- Camera for Pink Pass verification
- Network interface for API communication

### 3.3.3 Software Interfaces

- Google Maps API v3 for routing and geocoding
- Twilio REST API for SMS notifications
- MongoDB database driver
- Socket.io for WebSocket communication

### 3.3.4 Communication Interfaces

- HTTPS (TLS 1.3) for API requests
- WebSocket for real-time updates
- SMS for emergency notifications

---

# 4. SYSTEM MODELS

## 4.1 Use Case Diagrams

### 4.1.1 Passenger Use Cases
- Register Account
- Login
- Enroll in Pink Pass
- Request Ride
- Track Ride
- Rate Driver
- Trigger SOS

### 4.1.2 Driver Use Cases
- Register as Driver
- Update Availability
- Accept/Reject Ride
- Navigate to Pickup
- Complete Ride
- View Earnings

### 4.1.3 Admin Use Cases
- Monitor Active Rides
- View Safety Alerts
- Manage Users
- Generate Reports
- Analyze Heatmaps

## 4.2 Sequence Diagrams

### 4.2.1 Ride Request Flow
1. Passenger selects pickup/dropoff locations
2. System calculates route and price
3. System matches optimal driver
4. Driver receives notification
5. Driver accepts ride
6. Passenger receives driver details
7. Ride begins with GPS tracking

### 4.2.2 Safety Alert Flow
1. Safety Sentinel detects route deviation
2. System creates alert record
3. Admin dashboard receives Socket.io notification
4. Emergency contacts receive SMS
5. Admin reviews and resolves alert

## 4.3 Class Diagrams

### 4.3.1 Core Classes
- User (base class)
- Passenger (extends User)
- Driver (extends User)
- Admin (extends User)
- Ride
- Alert
- Location

## 4.4 Entity Relationship Diagrams

### 4.4.1 Database Schema

**Users Collection:**
- _id, name, email, phone, password, cnic, gender, role
- verified, pinkPassVerified, emergencyContacts

**Drivers Collection:**
- _id, user (ref), licenseNumber, vehicleInfo
- rating, totalRides, status, currentLocation
- idleTime, onlineTime

**Rides Collection:**
- _id, passenger (ref), driver (ref)
- pickupLocation, dropoffLocation, plannedRoute
- distance, estimatedPrice, actualPrice
- status, type, timestamps

**Alerts Collection:**
- _id, ride (ref), type, severity
- location, description, status
- notificationsSent, resolvedAt

---

# 5. PROJECT PLAN

## 5.1 Development Methodology

**Methodology:** Agile Scrum with 2-week sprints

**Rationale:** Agile allows iterative development, frequent testing, and flexibility to adapt to changing requirements.

**Team Roles:**
- Mirza Umer Ikram: Backend Development, AI Services
- Ruhma Bilal: Frontend Development, UI/UX Design
- Tanveer Ahmed: Project Advisor, Technical Guidance

## 5.2 Timeline and Milestones

### Phase 1: Project Setup (Weeks 1-2) ✅ COMPLETED
- [x] Project structure creation
- [x] Development environment setup
- [x] SRS documentation

### Phase 2: Backend Core (Weeks 3-5) ✅ COMPLETED
- [x] Express server with routing
- [x] MongoDB schemas and connection
- [x] JWT authentication system
- [x] User management APIs

### Phase 3: AI Microservice (Weeks 6-8) ✅ COMPLETED
- [x] Flask application structure
- [x] Pink Pass liveness detection
- [x] Price prediction model
- [x] Driver matching algorithm

### Phase 4: Mobile Apps (Weeks 9-12)
- [ ] React Native project setup
- [ ] Authentication screens
- [ ] Ride booking interface
- [ ] Real-time tracking UI

### Phase 5: Admin Dashboard (Weeks 16-17)
- [ ] React.js dashboard
- [ ] Real-time monitoring
- [ ] Analytics and reports
- [ ] Heatmap visualization

### Phase 6: Safety Features (Weeks 13-15) ✅ COMPLETED
- [x] GPS tracking system
- [x] Safety Sentinel implementation
- [x] Alert system (Socket.io + Twilio)
- [x] SOS emergency features

### Phase 7: AI Model Training (Weeks 18-19)
- [ ] Collect training data
- [ ] Train Pink Pass CNN model
- [ ] Train price prediction model
- [ ] Implement K-Means clustering

### Phase 8: Testing & Deployment (Weeks 20-22)
- [ ] Unit testing
- [ ] Integration testing
- [ ] User acceptance testing
- [ ] Production deployment

## 5.3 Resource Allocation

### 5.3.1 Human Resources
- 2 Developers (Full-time)
- 1 Project Advisor (Part-time)

### 5.3.2 Technical Resources
- Development laptops (2)
- Cloud hosting (AWS/DigitalOcean)
- Third-party APIs (Google Maps, Twilio)
- Testing devices (Android/iOS)

### 5.3.3 Budget Estimate
- Cloud infrastructure: PKR 10,000/month
- API costs: PKR 5,000/month
- Testing devices: PKR 50,000 (one-time)
- Miscellaneous: PKR 10,000

**Total Estimated Budget:** PKR 140,000

---

# 6. APPENDICES

## 6.1 Glossary

**Liveness Detection:** Biometric technique to determine if a face is from a live person or a photograph/video.

**Point-to-Line Distance:** Geometric calculation measuring shortest distance between a point and a line segment.

**Weighted Algorithm:** Scoring method that assigns different importance levels to multiple factors.

**Fairness Metric:** Quantitative measure ensuring equitable distribution of resources.

## 6.2 Analysis Models

### 6.2.1 AI Model Specifications

**Pink Pass CNN Model:**
- Input: Video frames (480x640 RGB)
- Architecture: 3 convolutional layers + 2 dense layers
- Output: Liveness probability (0-1)
- Training data: 10,000+ face images (live vs. spoofed)

**Price Prediction Model:**
- Algorithm: Linear Regression
- Features: 7 (distance, duration, time, day, demand, area, traffic)
- Target: Ride price in PKR
- Expected R²: >0.85

**Driver Matching Algorithm:**
- Scoring formula: 0.50×Distance + 0.30×Rating + 0.20×Fairness
- Distance: Haversine calculation
- Rating: Average passenger ratings (1-5)
- Fairness: IdleTime/TotalOnlineTime (last 4 hours)

## 6.3 Technology Stack

**Backend:**
- Node.js v18+
- Express.js v4.18
- MongoDB v6.0
- Socket.io v4.7
- JWT, bcrypt, Twilio

**AI Service:**
- Python v3.9+
- Flask v3.1
- TensorFlow/Keras v2.20
- OpenCV v4.13
- scikit-learn v1.8

**Mobile Apps:**
- React Native v0.72+
- React Navigation
- Socket.io Client
- Google Maps SDK

**Admin Dashboard:**
- React.js v18+
- Material-UI
- Recharts
- Leaflet (maps)

---

## Document Approval

This Software Requirements Specification has been reviewed and approved by:

**Project Advisor:**  
Tanveer Ahmed  
Date: _______________

**Team Members:**  
Mirza Umer Ikram (S3F22UBSCS081)  
Date: _______________

Ruhma Bilal (S3F22UBSCS088)  
Date: _______________

---

**End of Document**
