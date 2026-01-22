# SAFORA (Smart Ride)
## Software Requirements Specification - Phase 1

---

**Project Title:** SAFORA - Smart Ride  
**Project Advisor:** Tanveer Ahmed  
**Group ID:** 11  
**Team Members:**
- Mirza Umer Ikram (S3F22UBSCS081)
- Ruhma Bilal (S3F22UBSCS088)

**University of Central Punjab - Faculty of Information Technology**

---

## Revision History

| Version | Date | Reason for Change | Author |
|---------|------|-------------------|--------|
| 1.0 | January 15, 2026 | Initial Draft | Muhammad Zees, Ruhma Bilal |

---

## Abstract

SAFORA (Smart Ride) is an AI-powered ride-hailing platform implementing a **proactive safety paradigm** through: (1) **Pink Pass** - biometrically verified women-only mode with liveness detection, (2) **Safety Sentinel** - automated GPS monitoring detecting route deviations in real-time, and (3) **Smart Driver Selection** - AI-driven matching optimizing distance, rating, and fairness. The system uses MERN stack with Python/Flask AI microservice, employing Linear Regression for pricing, CNN for liveness verification, K-Means for demand heatmaps, and NLP for sentiment analysis.

---

# 1. Introduction and Background

## 1.1 Product (Problem Statement)

Current ride-hailing services in Pakistan suffer from three critical deficiencies:

**Problem 1: Reactive Safety** - Existing platforms rely on manual SOS buttons, ineffective when passengers cannot access their phones. No automated ride monitoring exists.

**Problem 2: Gender Verification Gaps** - Women-only modes use self-declaration without verification, allowing male drivers to use female accounts.

**Problem 3: Inefficient Driver Allocation** - Proximity-only matching causes monopolization by top-rated drivers and idle driver unemployment.

## 1.3 Scope

**In Scope:**
- User registration (Passenger/Driver/Admin) with CNIC verification
- Ride booking with real-time price estimation and GPS tracking
- Pink Pass enrollment with liveness detection (female passengers)
- Automated route deviation detection and dual alerts (admin + SMS)
- Smart driver matching using weighted algorithm
- Admin dashboard with heatmaps and sentiment analysis
- Payment (cash initially)

**Out of Scope:** Multi-city operations (Lahore only), third-party payment gateways, carpooling, advanced fraud detection.

## 1.4 Objectives

1. Implement automated route deviation detection with 95% accuracy
2. Achieve 98%+ liveness detection accuracy for Pink Pass
3. Reduce passenger wait time to <3 minutes
4. Provide AI price prediction with ±PKR 30 accuracy
5. Alert admins and emergency contacts within 30 seconds of anomaly

## 1.8 Completeness Criteria

- All user roles can register, authenticate, and perform core functions
- Pink Pass verification completes in <15 seconds
- Safety Sentinel monitors 100% of active rides
- Liveness detection: >95% TPR, <5% FPR
- Price prediction: R² > 0.85
- API response time <500ms for 95% of requests
- >80% code coverage for unit tests

## 1.10 Related Work

| Feature | Uber | Careem | InDrive | SAFORA |
|---------|------|--------|---------|--------|
| Automated Route Monitoring | ❌ | ❌ | ❌ | ✅ |
| Biometric Gender Verification | ❌ | ❌ | ❌ | ✅ |
| Proactive Alerts | ❌ | ❌ | ❌ | ✅ |
| AI Fair Pricing | ✅ | Partial | ❌ | ✅ |
| Driver Fairness Algorithm | ❌ | ❌ | ❌ | ✅ |

**Academic Research:** Zhang et al. (2021) showed ML models predict driver anomalies with 92% accuracy using GPS data. Patel et al. (2020) demonstrated CNN liveness detection achieves 98% accuracy in spoofing detection.

---

# 2. Overall Description

## 2.1 Product Features

**Pink Pass:** Two-layer verification (CNIC + liveness detection) using Haar Cascade for face detection and CNN for blink verification in <15 seconds.

**Safety Sentinel:** Monitors rides using point-to-line distance (Turf.js), triggering alerts if deviation >500m for >30 seconds or suspicious stops >5 minutes.

**Smart Driver Matching:** Weighted algorithm: `Score = 0.50×Distance + 0.30×Rating + 0.20×Fairness` where `Fairness = IdleTime/TotalOnlineTime` (last 4 hours).

**Price Prediction:** Linear Regression using 7 features (distance, duration, time, day, demand, area, traffic) with R² > 0.85.

**Admin Dashboard:** Real-time heatmaps (K-Means clustering), safety alerts, sentiment analysis (TextBlob), and analytics.

## 2.2 User Classes

**Passenger:** Individuals seeking rides. Basic smartphone proficiency. Goals: quick booking, safety, fair pricing. Usage: 3-10 rides/week.

**Driver:** Vehicle owners providing service. Moderate tech proficiency. Goals: consistent requests, maximize earnings. Usage: 4-8 hours online/day.

**Administrator:** Platform managers. High proficiency. Goals: real-time monitoring, dispute resolution, analytics. Usage: Full-time.

## 2.4 Design Constraints

**Architecture:** Microservice (Node.js/Express + Python/Flask AI service via REST APIs)  
**Mobile:** React Native (iOS 13+, Android 8.0+)  
**Real-time:** Socket.io (GPS updates every 5 seconds)  
**Data Privacy:** AES-256 encryption for CNIC, 30-day location retention  
**Timeline:** 6-8 months, 2 developers  
**Network:** Must work on 3G/4G  
**Battery:** <15% drain per hour for GPS tracking

---

# 3. Functional Requirements

## 3.1 Priority Use Cases

**Critical (High Priority):**
- UC-01: User Registration (Passenger)
- UC-02: User Registration (Driver)
- UC-03: User Authentication
- UC-04: Request Ride
- UC-05: Accept Ride (Driver)
- UC-08: Pink Pass Enrollment
- UC-09: Pink Pass Liveness Verification
- UC-10: Route Deviation Detection
- UC-11: Trigger Safety Alert

**Important (Medium Priority):**
- UC-12: Driver Matching Algorithm
- UC-13: Price Prediction
- UC-16: Admin Monitor Dashboard

## 3.2 Detailed Use Cases

### UC-01: User Registration (Passenger)

| Field | Description |
|-------|-------------|
| **ID** | UC-01 |
| **Priority** | High |
| **Actors** | Passenger, System |
| **Pre-conditions** | App downloaded |
| **Post-conditions** | Account created |

**Flow:**
1. User enters: Name, Email, Phone, Password, CNIC
2. System validates format and performs OCR on CNIC photo
3. System sends OTP via SMS
4. User enters OTP
5. System creates account and displays success

**Alternatives:** Invalid format → error; Phone exists → error; OTP expired → resend option

---

### UC-04: Request Ride

| Field | Description |
|-------|-------------|
| **ID** | UC-04 |
| **Priority** | High |
| **Actors** | Passenger, System, AI Service, Driver |
| **Pre-conditions** | Logged in, GPS enabled |
| **Post-conditions** | Ride request sent to driver |

**Flow:**
1. System detects GPS location and displays map
2. Passenger sets pickup and destination
3. System calculates route (Google Maps API)
4. AI Service predicts price using Linear Regression
5. System displays price breakdown
6. Passenger selects Standard/Pink Pass and confirms
7. System uses Smart Matching (UC-12) to find driver
8. System sends request to top-ranked driver

**Alternatives:** No GPS → error; Pink Pass not verified → redirect to UC-08; No drivers → retry message; Driver rejects → next driver (max 3 attempts)

---

### UC-08: Pink Pass Enrollment

| Field | Description |
|-------|-------------|
| **ID** | UC-08 |
| **Priority** | High |
| **Actors** | Female Passenger, System, AI Service |
| **Pre-conditions** | Registered as female |
| **Post-conditions** | Pink Pass activated |

**Flow:**
1. Passenger navigates to Profile → Pink Pass
2. System displays consent form
3. Passenger accepts and camera activates
4. System displays "Look at camera and blink naturally"
5. Passenger positions face and blinks (5-second video)
6. System sends to AI Service (UC-09)
7. AI performs: Haar Cascade face detection + CNN blink detection
8. If successful: System updates pinkPass=true

**Alternatives:** Face not detected → retry with lighting; No blink → retry; Failed verification → "Try again or contact support"

---

### UC-10: Route Deviation Detection

| Field | Description |
|-------|-------------|
| **ID** | UC-10 |
| **Priority** | High |
| **Actors** | Safety Sentinel, System, Admin |
| **Pre-conditions** | Ride active |
| **Post-conditions** | Alert if deviation exceeds threshold |

**Flow:**
1. Ride begins, system retrieves planned route (Google Maps polyline)
2. Safety Sentinel monitors every 5 seconds
3. System calculates: `turf.pointToLineDistance(currentLocation, route)`
4. If distance >500m: Start timer
5. If sustained >30 seconds: Trigger alert (UC-11)

**Alternatives:** Distance normalizes <30sec → reset timer; GPS lost → wait 60sec then flag

---

### UC-11: Trigger Safety Alert

| Field | Description |
|-------|-------------|
| **ID** | UC-11 |
| **Priority** | High |
| **Actors** | System, Admin, Emergency Contacts |
| **Pre-conditions** | Anomaly detected or SOS pressed |
| **Post-conditions** | Alerts delivered |

**Flow:**
1. Anomaly detected or SOS pressed
2. System creates Alert record
3. System emits Socket.io event to admin dashboard
4. Admin receives pop-up notification
5. System retrieves emergency contacts
6. System sends SMS via Twilio: "SAFORA ALERT: [Name] may be in danger. Location: [Link]"
7. Admin can view live GPS feed

**Alternatives:** Twilio fails → retry 2x; No emergency contact → admin only

---

### UC-12: Driver Matching Algorithm

| Field | Description |
|-------|-------------|
| **ID** | UC-12 |
| **Priority** | High |
| **Actors** | System, AI Service |
| **Pre-conditions** | Ride request created |
| **Post-conditions** | Driver selected |

**Flow:**
1. System queries drivers: status="online", within 5km
2. For each driver calculate:
   - Distance Score: `1 - (distance_km/5)`
   - Rating Score: `rating/5`
   - Fairness Score: `idleTime/totalOnlineTime` (4hr window)
3. Compute: `0.50×Distance + 0.30×Rating + 0.20×Fairness`
4. Sort descending and send to top driver

**Alternatives:** No drivers 5km → expand to 10km; Pink Pass → filter gender="female" first

---

### UC-13: Price Prediction

| Field | Description |
|-------|-------------|
| **ID** | UC-13 |
| **Priority** | High |
| **Actors** | System, AI Service |
| **Pre-conditions** | Route calculated |
| **Post-conditions** | Price displayed |

**Flow:**
1. System calculates distance (km) and duration (min) via Google Maps
2. System extracts: hour, day, demand level, area, traffic multiplier
3. POST to AI Service: `/api/ai/predict-price`
4. AI loads Linear Regression model (price_model.pkl)
5. AI predicts: `price = model.predict(features)`
6. Returns: `{price: 285, breakdown: {base:50, distance:170, time:44, surge:21}}`
7. System displays: "Estimated Fare: PKR 285"

**Alternatives:** AI unavailable → fallback `Base + Distance×Rate`; Unrealistic price → apply bounds (MIN=50, MAX=2000)

---

## 3.3 Requirements Analysis and Modeling

**Required UML Diagrams (to be created):**

1. **Use Case Diagram:** 3 actors (Passenger, Driver, Admin) with all 12+ use cases
2. **Entity-Relationship Diagram:** Entities - User, Driver, Ride, Alert, Review, EmergencyContact
3. **Class Diagram:** User (base), Passenger/Driver (extends), Ride, SafetySentinel, AIService
4. **Sequence Diagram:** Complete ride flow + Pink Pass verification flow

---

# 4. Non-Functional Requirements

## 4.1 Performance

- API response: <500ms (95% of requests)
- Price prediction: <2 seconds
- Driver matching: <3 seconds
- Liveness verification: <15 seconds
- Support 100 concurrent rides
- GPS updates: every 5 seconds
- Socket.io latency: <200ms

## 4.2 Safety

- 100% rides monitored by Safety Sentinel
- Deviation detection: <10 seconds
- Alert delivery: >99% success rate
- Dual alerts (SMS + dashboard) for redundancy
- Logs retained 90 days minimum

## 4.3 Security

- Password: min 8 chars (alphanumeric + special)
- JWT tokens: 24-hour expiration
- OTP: 6 digits, 5-minute validity
- HTTPS/TLS for all APIs
- AES-256 for CNIC storage
- Biometric data encrypted separately
- RBAC: Drivers cannot access Pink Pass data

---

# 5. Other Requirements

**Localization:** English/Urdu, PKR currency, Pakistan timezone (UTC+5)  
**Legal:** Terms acceptance required, driver background checks, PDPB compliance  
**Usability:** Material Design/HIG, max 3 taps for primary actions, color-coded alerts

---

# 6. Revised Project Plan

## 6.1 Timeline (22 Weeks)

| Phase | Weeks | Key Deliverables |
|-------|-------|------------------|
| Setup | 1-2 | Repos, MongoDB, scaffolding |
| Backend Core | 3-5 | Auth, Ride APIs, Socket.io |
| AI Microservice | 6-8 | Pink Pass, Price model, Matching |
| Mobile Apps | 9-12 | Passenger/Driver apps, Maps |
| Safety Features | 13-15 | Safety Sentinel, Alerts, SMS |
| Admin Dashboard | 16-17 | Monitoring, Heatmaps, Analytics |
| Advanced AI | 18-19 | K-Means, Sentiment analysis |
| Testing & Deploy | 20-22 | UAT, Documentation, Presentation |

## 6.2 Milestones

| Milestone | Week | Deliverable |
|-----------|------|-------------|
| M1: Infrastructure Ready | 2 | All repos, DB connected |
| M2: Backend MVP | 5 | Ride booking functional |
| M3: AI Deployed | 8 | Pink Pass + Pricing working |
| M4: Mobile Beta | 12 | End-to-end ride flow |
| M5: Safety Live | 15 | Monitoring + Alerts tested |
| M6: Dashboard Complete | 17 | Full admin capabilities |
| M7: Production Ready | 22 | All features tested |

---

# 7. References

1. Zhang, L. et al. (2021). "Machine Learning for Real-Time Driver Monitoring." *IEEE Trans. ITS*, 22(6).
2. Patel, K. et al. (2020). "Secure Face Unlock: Spoof Detection." *IEEE Trans. Info Forensics*, 11(10).
3. Uber Safety Features. https://www.uber.com/safety
4. Google Maps Directions API. https://developers.google.com/maps/documentation/directions
5. Twilio SMS API. https://www.twilio.com/docs/sms
6. Socket.io Documentation. https://socket.io/docs

---

# 8. Appendices

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Pink Pass | Biometrically verified women-only mode |
| Safety Sentinel | Background monitoring service for rides |
| Liveness Detection | AI verification of physical presence |
| Haar Cascade | Face detection algorithm |
| CNN | Convolutional Neural Network for image analysis |
| EAR | Eye Aspect Ratio for blink detection |
| K-Means | Clustering algorithm for heatmaps |
| Socket.io | Real-time bidirectional communication library |
| JWT | JSON Web Token for authentication |
| CNIC | Pakistan National Identity Card |

## Appendix B: IV&V Report

**Project:** SAFORA (Smart Ride)  
**Date:** January 15, 2026  
**Reviewer:** Sir Tanveer Ahmed

| Requirement | Status |
|-------------|--------|
| Functional requirements with use cases | ✅ Verified |
| Non-functional requirements | ✅ Verified |
| UML diagrams planned | ⚠️ Pending Phase 2 |
| Timeline realistic | ✅ Verified |
| Technology stack justified | ✅ Verified |
| AI models defined | ✅ Verified |

**Advisor Signature:** _________________________  
**Date:** January 15, 2026

---

**END OF DOCUMENT**
