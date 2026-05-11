# SAFORA — Smart Ride

**Group ID:** FYP26-CS-G11 | University of Central Punjab, Lahore  
**Advisor:** Prof. Tanveer Ahmed  
**Team:** Mirza Umer Ikram (S3F22UBSCS081) · Ruhma Bilal (S3F22UBSCS088)

---

## What is SAFORA?

SAFORA is a ride-hailing platform built specifically for Pakistan. It runs as a Progressive Web App — passengers and drivers open it in their browser, no app store required. The platform has three user-facing interfaces: a passenger app, a driver app, and an admin dashboard. Behind them sits a Node.js backend, a Python AI microservice, a MongoDB Atlas database, and a Redis cache.

The project was motivated by a gap in existing platforms like Careem and InDriver: neither has a mechanism that actively monitors a trip in progress and intervenes when something goes wrong. SAFORA addresses this through three core systems — Pink Pass biometric verification, SafetySentinel GPS route monitoring, and AI-based fare prediction.

---

## Live Deployments

| Component | URL |
|---|---|
| Passenger PWA | https://safora.me |
| Admin Dashboard | https://admin.safora.me |
| Backend API | Railway (Node.js, Port 5000) |
| AI Microservice | Railway (Python/Flask) |
| Database | MongoDB Atlas M10 |

---

## Repository Structure

```
SAFORA/
├── backend/                    Node.js + Express API server
│   ├── config/
│   │   ├── database.js         MongoDB Atlas connection
│   │   └── redis.js            Redis client with in-memory fallback
│   ├── middleware/
│   │   └── auth.js             JWT verification + role authorisation
│   ├── models/
│   │   ├── User.js             Passenger/Driver/Admin schema
│   │   ├── Driver.js           Driver profile + 2dsphere geospatial index
│   │   ├── Ride.js             Ride lifecycle schema
│   │   └── Alert.js            SOS alert schema
│   ├── routes/
│   │   ├── auth.js             Firebase Phone Auth + JWT issuance
│   │   ├── rides.js            Ride booking, matching, status transitions
│   │   ├── drivers.js          Driver profile, location, earnings
│   │   ├── safety.js           SOS alert creation + Twilio SMS
│   │   ├── pinkpass.js         Pink Pass enrollment + AI verification
│   │   ├── admin.js            Admin operations
│   │   └── payment.js          Cash + Stripe card payment
│   ├── utils/
│   │   ├── SafetySentinel.js   GPS deviation monitoring (Turf.js)
│   │   ├── RideStateMachine.js State Pattern for ride lifecycle
│   │   └── mailer.js           Email via Resend (admin OTP rerouting)
│   └── index.js                Express server + Socket.io setup
│
├── Progressive web app/        React Native + Expo (Passenger + Driver PWA)
│   └── src/
│       ├── screens/
│       │   ├── main/           Passenger screens
│       │   └── driver/         Driver screens
│       ├── services/
│       │   ├── socket.service.ts  Socket.io client
│       │   └── api.service.ts     Axios HTTP client
│       ├── navigation/         React Navigation stack
│       └── context/            Auth, Theme, Language contexts
│
├── admin-dashboard/            React + Vite admin web app
│   └── src/
│       └── pages/              Dashboard, Drivers, Passengers, SOS, Map
│
└── ai-service/                 Python 3.11 + Flask AI microservice
    ├── app.py                  Flask app with three blueprints
    ├── train_model.py          LinearRegression training script
    ├── models/
    │   ├── price_model.pkl     Trained sklearn model
    │   └── training_data.csv   500-record synthetic dataset
    ├── services/
    │   ├── pricing.py          PricingService class
    │   └── liveness_detector.py  OpenCV Haar Cascade liveness check
    └── routes/
        ├── pricing.py          POST /api/pricing/predict
        └── pink_pass.py        POST /api/pink-pass/verify-frames
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Passenger/Driver PWA | React Native + Expo Web | 0.73 | Cross-platform browser app |
| Admin Dashboard | React + Vite | 18 + 5 | Admin operations web interface |
| Backend API | Node.js + Express | 20 + 4 | REST API and business logic |
| Real-time | Socket.io | 4.7 | Live GPS, ride events, in-app chat |
| Database | MongoDB Atlas M10 | 7 | Primary data store with 2dsphere |
| Cache | Redis (ioredis) | 7 | Driver location cache (30s TTL), JWT sessions |
| Authentication | Firebase Phone Auth | — | OTP delivery to Pakistani numbers |
| Auth tokens | jsonwebtoken (HS256) | 9 | 15-minute access + 7-day refresh |
| AI Service | Python 3.11 + Flask | 3.11 + 3 | Fare prediction + liveness detection |
| ML Model | scikit-learn LinearRegression | 1.3 | Fare prediction (trained on 500 synthetic records) |
| Computer Vision | OpenCV Haar Cascade | 4.x | Face detection + liveness motion scoring |
| Geospatial | Turf.js (@turf/turf) | 6.5 | Route deviation calculation in SafetySentinel |
| SMS | Twilio | 4.16 | SOS emergency contact SMS |
| Email | Resend + Nodemailer | — | Admin OTP rerouting |
| Payment | Stripe (backend-only) | 22 | Card payment intent (cash is primary) |
| Hosting | Railway | — | Backend + AI microservice |
| Hosting | Vercel | — | Passenger PWA + Admin Dashboard |

---

## Key Features

### Pink Pass — Women-Only Ride Category
A dedicated ride type that only matches passengers with female drivers who have completed biometric verification. The verification pipeline works as follows:

1. Female passenger captures CNIC photo using rear camera
2. Passenger records an 8-second liveness video using front camera
3. Video frames are sent to the AI microservice at `POST /api/pink-pass/verify-frames`
4. OpenCV Haar Cascade checks for face presence across minimum 3 frames
5. Pixel-difference motion scoring detects live person vs static photo (threshold: 3.0)
6. If AI passes, status goes to `approved`. If AI service is offline, status goes to `pending_review` for admin manual review
7. Admin reviews CNIC photo and approves or rejects via admin dashboard
8. Sensitive images are deleted from the database immediately after admin review

For drivers, the same pipeline applies — driver submits CNIC and liveness frames. Admin reviews and sets `pinkPassCertified: true` on the Driver document. Only drivers with `pinkPassCertified === true` and `user.gender === 'female'` appear as candidates for Pink Pass ride matching.

### SafetySentinel — Automatic Route Deviation Monitoring
A server-side process that monitors every active trip. It is implemented as a singleton class in `backend/utils/SafetySentinel.js`.

How it works:
1. When a ride status changes to `started`, `safetySentinel.startMonitoring(rideId, plannedRoute)` is called. The planned route is a two-coordinate straight line between pickup and dropoff stored as GeoJSON
2. The driver app emits `driver:location-update` Socket.io events during the trip
3. Each event calls `safetySentinel.updateLocation(rideId, {lat, lng})`
4. Turf.js `pointToLineDistance` calculates how far the driver is from the planned route
5. If deviation exceeds 500 metres, a timer starts. If deviation persists for 30 seconds, a `safety:deviation-alert` Socket.io event is emitted to the passenger
6. The passenger TrackingScreen shows a 30-second countdown. If the passenger does not respond, `handleAutoSOS` calls `POST /api/safety/alert` automatically
7. `POST /api/safety/alert` creates an Alert document in MongoDB with severity `critical`, emits a `safety-alert` Socket.io event to the admin dashboard, and sends Twilio SMS to the passenger's registered emergency contacts

The system also detects suspicious stops — if the vehicle moves less than 10 metres for more than 5 minutes, a `suspicious-stop` alert is triggered.

### AI Dynamic Pricing
The Python Flask microservice handles fare prediction. The main endpoint is `POST /api/pricing/predict`.

**In production (with trained model):** The `price_model.pkl` sklearn LinearRegression model takes 7 input features and returns a predicted fare in PKR:
- `distance_km` — ride distance calculated by Haversine formula in the Node.js backend
- `duration_min` — estimated duration (distance × 3 minutes/km)
- `time_of_day` — hour of day (0–23)
- `day_of_week` — day number (0=Monday, 6=Sunday)
- `demand_score` — 0=low, 1=medium, 2=high, 3=peak
- `ride_type` — 0=standard, 1=pink-pass, 2=eco
- `traffic_multiplier` — 1.0–1.8

**Fallback (if AI service offline):** The Node.js backend uses the formula `(distance × 35) + (duration × 5) + 50 PKR`. The fare is capped at PKR 3000 maximum.

The training dataset was generated synthetically using `train_model.py` with 500 records based on real Lahore ride pricing patterns. The model achieves R² > 0.95 on this dataset.

### Ride Lifecycle — State Machine
Every ride transitions through states enforced by `backend/utils/RideStateMachine.js`. The State Pattern prevents illegal transitions — attempting an invalid transition throws an error before any database write occurs.

Valid states and transitions:
```
requested → matched → accepted → started → completed
         ↘ cancelled (from any state before completed)
```

When status changes to `started`: SafetySentinel monitoring begins  
When status changes to `completed` or `cancelled`: SafetySentinel monitoring stops

### Real-Time Communication (Socket.io)
The Socket.io server runs within the same Node.js process on the same HTTP server instance. Room naming convention:
- `ride-<rideId>` — passenger joins this room after booking to receive driver location and status updates
- `driver-<driverDocId>` — driver joins this room on login to receive incoming ride requests

Important: the room uses the **Driver document `_id`** (from `GET /api/drivers/me`), not the User `_id`. The backend emits `ride:request` to `driver-${matchedDriver._id}`.

### In-App Chat
Real-time anonymous messaging between passenger and driver during an active ride. Messages are emitted via `chat:send` Socket.io events and broadcast to room `chat-<rideId>`. Messages are also persisted to the Ride document `chatMessages` array in MongoDB.

### Admin Dashboard
Available at admin.safora.me. Admins log in with a phone number where the OTP is rerouted to a master email address via Resend. The dashboard provides:
- Live overview: total rides today, active drivers, SOS alerts count
- Live map showing driver positions in Lahore (Google Maps embed)
- Driver verification queue with approve/reject controls
- Pink Pass passenger verification queue with CNIC and selfie photo review
- SOS alerts panel with passenger name, location, and timestamp
- Full user list with edit and delete capabilities
- Admin account management (add/remove admin roles)

---

## Authentication Flow

1. User enters phone number in app
2. Firebase Phone Auth sends OTP SMS to the number
3. User enters OTP in app — Firebase returns an `idToken`
4. App calls `POST /api/auth/verify-firebase-token` with `{ idToken }`
5. Backend calls Firebase REST API to verify the token and extract the phone number
6. Backend finds or creates the User document
7. Backend signs and returns a SAFORA JWT (HS256, 15-minute expiry)
8. App stores JWT in AsyncStorage and includes it as `Authorization: Bearer <token>` on all subsequent API calls

For admin login, the admin enters their phone number which triggers `POST /api/auth/send-otp` — the OTP is rerouted to a configured master email address via Resend, not SMS. The admin then submits the code via `POST /api/auth/verify-otp` to receive a JWT.

---

## Local Development Setup

### Prerequisites
- Node.js 20 LTS
- Python 3.11
- MongoDB Atlas connection string (M10 tier required for geospatial queries)
- Firebase project with Phone Auth enabled
- Google Maps Platform API key with Places and Maps JavaScript APIs enabled

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, FIREBASE_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, REDIS_URL, AI_SERVICE_URL
node index.js
```

### AI Microservice
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python train_model.py        # Generates models/price_model.pkl
python app.py                # Starts Flask on port 5001
```

### Passenger + Driver PWA
```bash
cd "Progressive web app"
npm install
# Create .env.local with EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SOCKET_URL, EXPO_PUBLIC_MAPS_KEY
npx expo start --web
```

### Admin Dashboard
```bash
cd admin-dashboard
npm install
# Create .env with VITE_API_URL pointing to backend
npm run dev
```

---

## Environment Variables

### Backend `.env`
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret
JWT_EXPIRE=15m
FIREBASE_API_KEY=your_firebase_web_api_key
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
REDIS_URL=redis://...
AI_SERVICE_URL=https://your-ai-service.railway.app
STRIPE_SECRET_KEY=sk_test_...   (optional - cash is default)
RESEND_API_KEY=re_...
ADMIN_EMAIL=your@email.com
```

### AI Service `.env`
```
PORT=5001
PRICE_MODEL_PATH=models/price_model.pkl
```

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/verify-firebase-token | Verify Firebase OTP token, issue SAFORA JWT |
| POST | /api/auth/send-otp | Admin login step 1 — send OTP to registered email |
| POST | /api/auth/verify-otp | Admin login step 2 — verify OTP, issue JWT |
| POST | /api/auth/register | Traditional registration (fallback) |

### Rides
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/rides/request | Create ride request, calculate fare, match driver |
| POST | /api/rides/:id/accept | Driver accepts ride |
| PATCH | /api/rides/:id/reject | Driver rejects, ride returns to pool |
| PATCH | /api/rides/:id/status | Update ride status (state machine validated) |
| GET | /api/rides/:id | Get ride details |

### Drivers
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/drivers/me | Get current driver's full profile |
| POST | /api/drivers/register | Register as driver |
| PATCH | /api/drivers/status | Toggle online/offline |
| PATCH | /api/drivers/location | Update GPS location |
| GET | /api/drivers/earnings | Get earnings stats and recent rides |

### Safety
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/safety/alert | Create SOS alert + send Twilio SMS |
| GET | /api/safety/alerts | Get active alerts (admin only) |
| PATCH | /api/safety/alerts/:id/resolve | Resolve alert |

### Pink Pass
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/pink-pass/enroll | Submit CNIC + liveness frames for verification |
| GET | /api/pink-pass/status | Get current Pink Pass status |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/dashboard | Platform overview stats |
| GET | /api/admin/drivers/pending | Drivers awaiting background check approval |
| PATCH | /api/admin/drivers/:id/approve | Approve driver |
| PATCH | /api/admin/drivers/:id/reject | Reject driver |
| GET | /api/admin/pinkpass/passengers/pending | Pending passenger Pink Pass applications |
| PATCH | /api/admin/pinkpass/passengers/:id/verify | Approve or reject passenger Pink Pass |
| GET | /api/admin/users | All users with pagination |

### AI Service
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/pricing/predict | Predict fare in PKR |
| POST | /api/pink-pass/verify-frames | Liveness detection on video frames |
| GET | /health | Health check |

### Payment
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/payment/cash | Mark ride as cash paid |
| POST | /api/payment/create-intent | Create Stripe payment intent |
| POST | /api/payment/confirm | Confirm card payment |

---

## Socket.io Events Reference

### Client → Server
| Event | Payload | Description |
|---|---|---|
| join:ride | `{ rideId }` | Passenger joins ride room |
| join:driver | `{ driverId }` | Driver joins personal room |
| driver:location-update | `{ rideId, driverId, lat, lng }` | Driver GPS broadcast |
| sos:trigger | `{ rideId, timestamp }` | Manual SOS from driver side |
| chat:join | `{ rideId }` | Join chat room |
| chat:send | `{ rideId, text, sender, senderName }` | Send chat message |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| ride:request | ride details | New ride request to driver |
| ride:accepted | `{ rideId, driverId }` | Driver accepted — to passenger |
| ride:no-driver | `{ rideId }` | No driver found / driver rejected |
| ride-status-updated | `{ rideId, status }` | Ride status change |
| driver:location | `{ lat, lng }` | Live driver location to passenger |
| safety:deviation-alert | alert details | SafetySentinel deviation alert |
| safety-alert | alert details | SOS alert to admin dashboard |
| sos:active | `{ rideId, timestamp }` | SOS broadcast |
| chat:message | message object | Chat message to both parties |

---

## Team Responsibilities

| Member | Phase 3 (DTS) Primary Work |
|---|---|
| Mirza Umer Ikram | Backend API development (all routes), AI microservice (Flask + OpenCV + sklearn), SafetySentinel implementation (Turf.js), RideStateMachine, Socket.io server, MongoDB schema design, Redis integration, Firebase Phone Auth integration, Passenger PWA screens, Driver PWA screens, Railway deployment, Vercel deployment |
| Ruhma Bilal | DTS documentation, UML diagrams (Architecture, ERD, Class, Activity, Sequence, DFD, State, Collaboration, Event Trace), test case specification, IV&V report, UI/UX design, Admin Dashboard frontend, quality assurance |

---

*SAFORA — Safety First For All*  
*FYP26-CS-G11 | University of Central Punjab, Lahore, Pakistan | 2026*
