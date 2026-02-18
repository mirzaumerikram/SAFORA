# SAFORA 30 Detailed Use Cases (IEEE Format Template)

This document contains the 30 detailed use cases for the SAFORA project, formatted according to the specific template provided (split Actor/System actions and Typical/Alternate flows).

---

## 4.1.1 Passenger Use Cases

### 3.1 Passenger Registration
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-01 |
| **Purpose** | Allows a new passenger to create a basic account profile. |
| **Priority** | High |
| **Pre-conditions** | App is installed; Smartphone has internet connectivity. |
| **Post-conditions** | Basic account record created in database. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger selects 'Sign Up' | System displays registration form |
| 2 | Passenger enters Name, Email, and Phone Number | System validates email format |
| 3 | Passenger creates a secure password | System encrypts and stores password |
| 4 | | System confirms account creation |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Invalid email format | System displays error message and prompts for correction |

---

### 3.2 Register with CNIC OCR
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-02 |
| **Purpose** | Verifies identity by extracting data from CNIC using AI OCR. |
| **Priority** | High |
| **Pre-conditions** | UC-01 in progress; Camera permissions granted. |
| **Post-conditions** | Identity verified; Account fully activated. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger takes photo of CNIC (Front/Back) | System activates AI OCR module |
| 2 | | System extracts CNIC number and Gender |
| 3 | | System validates CNIC with government records |
| 4 | Passenger enters received OTP | System verifies phone number and activates account |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Blurred photo detected | System prompts user to retake the photo |

---

### 3.3 Passenger Login
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-03 |
| **Purpose** | Authentication via credentials for secure access. |
| **Priority** | High |
| **Pre-conditions** | Account exists and is verified. |
| **Post-conditions** | Access granted to passenger dashboard. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | User enters Email/Phone and Password | System checks credentials against database |
| 2 | | System generates 24-hour JWT token |
| 3 | | System redirects to Home screen |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Incorrect credentials | System displays "Invalid Credentials" and locks after 5 attempts |

---

### 3.4 Update Profile & Emergency Contacts
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-04 |
| **Purpose** | Manage personal details and safety contacts for the Safety Sentinel. |
| **Priority** | Medium |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | Profile and safety contacts updated. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger navigates to 'Profile Settings' | System displays current profile data |
| 2 | Passenger updates personal info or adds 5 Emergency Contacts | System validates inputs |
| 3 | Passenger selects 'Save' | System updates records in MongoDB |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Invalid phone number for contact | System highlights the error and prevents saving |

---

### 3.5 Pink Pass Enrollment (Identity Scan)
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-05 |
| **Purpose** | Initial phase of women-only mode activation involving document check. |
| **Priority** | High |
| **Pre-conditions** | Logged in; Registered as Female via CNIC OCR. |
| **Post-conditions** | System ready for biometric verification. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger selects 'Pink Pass' registration | System checks gender metadata |
| 2 | Passenger grants camera permissions | System prepares biometric liveness check |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Gender is not 'Female' | System restricts access to this feature |

---

### 3.6 Pink Pass Liveness Check
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-06 |
| **Purpose** | AI-driven biometric check using face detection and blink detection. |
| **Priority** | High |
| **Pre-conditions** | UC-05 completed. |
| **Post-conditions** | Pink Pass activated for the user. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger blinks/smiles at camera | System captures video frames |
| 2 | | AI Service calculates EAR and liveness score |
| 3 | | System activates Pink Pass status if score > 0.95 |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Spoof detected (e.g., photo) | System denies verification and logs the attempt |

---

### 3.7 Request Ride (Standard/Pink Pass)
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-07 |
| **Purpose** | Booking a ride after selecting destination and ride type. |
| **Priority** | High |
| **Pre-conditions** | Logged in; Location services enabled. |
| **Post-conditions** | Ride request broadcasted to matching drivers. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger sets destination on map | System displays available car categories |
| 2 | Passenger selects 'Standard' or 'Pink Pass' (if eligible) | System calculates trip parameters |
| 3 | Passenger clicks 'Confirm Request' | System starts matching algorithm |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | No drivers available | System notifies user to try again later |

---

### 3.8 AI Price Prediction & Estimation
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-08 |
| **Purpose** | Calculates fair transparent pricing based on demand and traffic. |
| **Priority** | Medium |
| **Pre-conditions** | Destination set in UC-07. |
| **Postconditions** | Passenger views expected cost before confirming. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | | System sends trip data to AI microservice |
| 2 | | AI Model predicts price using Linear Regression |
| 3 | | System factors in surge and traffic |
| 4 | | System displays 'Estimated Fare' with breakdown |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | AI Service offline | System uses fallback distance-based calculation |

---

### 3.9 Track Ride & Real-time ETA
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-09 |
| **Purpose** | Live monitoring of the driver's approach and trip progress. |
| **Priority** | High |
| **Pre-conditions** | Ride accepted or active. |
| **Post-conditions** | Passenger views live progress on map. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | | System polls driver GPS every 5 seconds |
| 2 | | System updates car icon and ETA on passenger map |
| 3 | | System triggers 'Driver Arrived' notification when < 100m |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | GPS signal lost | System displays "Poor connection" and shows last known location |

---

### 3.10 In-App Communication (Chat)
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-10 |
| **Purpose** | Secure chat between passenger and driver without sharing numbers. |
| **Priority** | Medium |
| **Pre-conditions** | Ride assigned. |
| **Post-conditions** | Successful coordination between parties. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger/Driver sends text message | System delivers via Socket.io |
| 2 | | System issues push notification to recipient |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Network failure | System displays "Failed to send" with retry option |
---

### 3.11 Respond to 'Are you okay?' Safety Prompt
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-11 |
| **Purpose** | Responding to automated system checks during anomalies. |
| **Priority** | High |
| **Pre-conditions** | Safety Sentinel detects deviation (UC-26). |
| **Post-conditions** | Alert either suppressed or escalated. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | | System detects deviation and triggers safety prompt |
| 2 | Passenger taps 'I am safe' within 30s | System logs response and resets deviation timer |
| 3 | | System resumes background monitoring |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger taps 'Help!' or timer expires | System triggers Emergency Protocol (UC-12) |

---

### 3.12 Trigger Manual SOS
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-12 |
| **Purpose** | Manual emergency trigger in case of immediate threat. |
| **Priority** | High |
| **Pre-conditions** | Ride active. |
| **Post-conditions** | Emergency protocol activated. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger taps red SOS button | System activates immediate emergency mode |
| 2 | | System broadcasts location to Admin dashboard |
| 3 | | System sends automated SMS to all emergency contacts |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Accidental trigger (taps 'Cancel' in 5s) | System logs the event but suppresses alerts |

---

### 3.13 Ride Feedback & Sentiment Submission
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-13 |
| **Purpose** | Providing rating and textual feedback for AI analysis. |
| **Priority** | Medium |
| **Pre-conditions** | Ride completed. |
| **Post-conditions** | Sentiment data stored for platform quality control. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Passenger submits 1-5 star rating and comment | System saves rating to driver profile |
| 2 | | AI Service analyzes text for sentiment score |
| 3 | | System flags negative sentiment to Admin |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Feedback contains prohibited language | System censors/rejects feedback and notifies Admin |

---

### 3.14 View Personal Ride History
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-14 |
| **Purpose** | Accessing previous trips and spending history. |
| **Priority** | Low |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | History log displayed. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | User navigates to 'Ride History' | System fetches records from MongoDB |
| 2 | | System displays list of past trips with costs |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | No history found | System displays "No rides found" message |

---

## 4.1.2 Driver Use Cases

### 3.15 Driver Registration
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-15 |
| **Purpose** | Sign-up process for drivers including documentation. |
| **Priority** | High |
| **Pre-conditions** | Valid license and vehicle documents available. |
| **Post-conditions** | Driver account created (Status: Pending Approval). |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver enters personal info and car category | System displays document upload interface |
| 2 | Driver uploads License, CNIC, and Registration | System saves encrypted files to storage |
| 3 | Driver submits application | System creates 'Pending' account in database |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Expired documents uploaded | System flags expiration dates and warns user |

---

### 3.16 Driver PWA Login
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-16 |
| **Purpose** | Secure access to the driver's Progressive Web App interface. |
| **Priority** | High |
| **Pre-conditions** | Account created and approved. |
| **Post-conditions** | Driver accesses management tools. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver enters credentials via PWA | System validates user and token |
| 2 | | System launches Driver Dashboard |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Account not yet approved | System displays "Approval in Progress" status page |

---

### 3.17 Toggle Availability (Online/Offline)
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-17 |
| **Purpose** | Managing whether the driver is ready to receive requests. |
| **Priority** | High |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | Status updated in real-time server state. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver toggles 'Go Online' | System starts background GPS tracking |
| 2 | | System adds driver to matching pool |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Low battery warning | System displays alert recommending charger connection |

---

### 3.18 Accept/Reject Ride
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-18 |
| **Purpose** | Responding to incoming matched ride requests. |
| **Priority** | High |
| **Pre-conditions** | Driver online; Successfully matched by AI. |
| **Post-conditions** | Ride assigned to the driver. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | | System triggers ringing alert on Driver app |
| 2 | Driver accepts within 15s | System confirms the match |
| 3 | | System sends driver details to passenger |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver rejects or timer expires | System removes driver from this match and re-runs AI matching |

---

### 3.19 Navigate to Pickup/Destination
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-19 |
| **Purpose** | Using integrated Google Maps for turn-by-turn guidance. |
| **Priority** | High |
| **Pre-conditions** | Ride accepted. |
| **Post-conditions** | Efficient arrival at target location. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver taps 'Start Navigation' | System launches Google Maps SDK with route |
| 2 | | System monitors distance progress |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Maps API quota exceeded | System provides static route/address as fallback |

---

### 3.20 Manage Ride Status
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-20 |
| **Purpose** | Tracking the physical progression of the passenger journey. |
| **Priority** | High |
| **Pre-conditions** | Ride assigned. |
| **Post-conditions** | Ride state transitioned in backend. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver marks 'Arrived' at pickup | System notifies passenger |
| 2 | Driver marks 'Start Ride' after boarding | System begins billing and safety monitoring |
| 3 | Driver marks 'End Ride' at destination | System stops billing and triggers payment summary |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver ends ride early | System flags for Admin review and prompts for reason |

---

### 3.21 View Earnings & Fairness Score
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-21 |
| **Purpose** | Financial transparency including equitable distribution metrics. |
| **Priority** | Medium |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | Driver informed of work-life balance and pay. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver opens 'Earnings' tab | System aggregates daily/weekly revenue data |
| 2 | | System calculates 'Fairness Score' (Idle vs Working time) |
| 3 | | System displays earnings charts and score |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Database timeout | System displays "Service temporarily unavailable" |

---

### 3.22 Rate Passenger
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-22 |
| **Purpose** | Providing reciprocal feedback on passenger behavior. |
| **Priority** | Medium |
| **Pre-conditions** | Ride ended. |
| **Post-conditions** | Reciprocal accountability maintained. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Driver selects 1-5 star rating | System displays optional comment box |
| 2 | Driver submits feedback | System updates passenger's average rating |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Rating out of range | System displays error and prompts for valid selection |

---

## 4.1.3 Admin Use Cases

### 3.23 Admin Secure Login
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-23 |
| **Purpose** | Restricted access to the platform command center. |
| **Priority** | High |
| **Pre-conditions** | Admin credentials assigned. |
| **Post-conditions** | Secure admin session started. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin enters credentials | System validates against secure auth-server |
| 2 | | System grants access to Monitoring Dashboard |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Login from unrecognized IP | System triggers secondary MFA (planned) or flags the login |

---

### 3.24 Real-time Live Monitoring Map
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-24 |
| **Purpose** | Overview of all active operations across Lahore. |
| **Priority** | High |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | Visual situational awareness for Admin. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin opens 'Live Map' | System fetches all active ride locations |
| 2 | | System renders dynamic icons using Socket.io |
| 3 | | System refreshes icons every 5 seconds |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Socket.io disconnection | System attempts reconnect and displays "Offline" badge |

---

### 3.25 Safety Sentinel Alert Management
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-25 |
| **Purpose** | Centralized handling of automated safety escalations. |
| **Priority** | High |
| **Pre-conditions** | Anomaly detected (UC-26) or SOS triggered (UC-12). |
| **Post-conditions** | Alert incident handled or resolved. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | | System flashes red Critical Alert on dashboard |
| 2 | Admin clicks alert | System centers map on the incident location |
| 3 | | System displays live stream of Passenger/Driver data |
| 4 | Admin clicks 'Resolve' after protocol | System logs the resolution steps and clears alert |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin fails to respond in 2 minutes | System auto-escalates to senior security team |

---

### 3.26 Route Deviation Monitoring (Auto)
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-26 |
| **Purpose** | Automated background logic for path safety. |
| **Priority** | High |
| **Pre-conditions** | Ride is currently in 'Active' state. |
| **Post-conditions** | Autonomous safety monitoring performed. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | | System calculates distance from planned route polyline |
| 2 | | System detects deviation > 500m |
| 3 | | System triggers 'Are you okay?' Prompt (UC-11) |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Minor deviation (< 500m) | System logs local telemetry but does not alert |

---

### 3.27 Manage User Verification & Suspend
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-27 |
| **Purpose** | Moderation of accounts to ensure platform integrity. |
| **Priority** | Medium |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | User base remains verified and safe. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin reviews 'Pending Approval' queue | System displays registration documents |
| 2 | Admin approves or suspends user | System updates User status and sends notification |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Documents found to be fraudulent | System permanently bans CNIC and notifies law enforcement |

---

### 3.28 Generate AI Demand Heatmaps
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-28 |
| **Purpose** | Business intelligence for optimizing driver distribution. |
| **Priority** | Medium |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | Data-driven operational insight. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin selects 'Heatmap' tool | System sends parameters to AI Service |
| 2 | | AI Service performs K-Means clustering on demand spikes |
| 3 | | System renders color-coded density map |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Insufficient data for clustering | System displays "No heatmap available for this period" |

---

### 3.29 Analyze Feedback Sentiment Analytics
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-29 |
| **Purpose** | Automated screening of thousands of reviews. |
| **Priority** | Medium |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | Quality assurance at scale. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin opens 'Sentiment Analytics' dashboard | System fetches AI-processed sentiment scores |
| 2 | | System displays trends and flags low-sentiment items |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Sudden drop in sentiment | System triggers automated alert to Admin |

---

### 3.30 System Reports & Export
| Field | Details |
| :--- | :--- |
| **Identifier** | UC-30 |
| **Purpose** | Generating statutory and performance reports. |
| **Priority** | Low |
| **Pre-conditions** | Logged in. |
| **Post-conditions** | Audit-ready documentation. |

**Typical Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Admin selects date range and data type | System generates report preview |
| 2 | Admin clicks 'Export' | System generates and downloads PDF/CSV file |

**Alternate Course of Action**
| S# | Actor Action | System Response |
| :--- | :--- | :--- |
| 1 | Large report generation | System background-processes and notifies via email |
