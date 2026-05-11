# SAFORA — Complete System Working Report
**For:** Prof. Tanveer Ahmed (Project Advisor)  
**Group:** FYP26-CS-G11 | Mirza Umer Ikram · Ruhma Bilal  
**Date:** May 2026  
**Document Purpose:** Full technical explanation of what the system does, how it works end-to-end, and what has been built

---

## 1. What SAFORA Is

SAFORA is a ride-hailing platform for Pakistan. It has the same surface-level function as Careem or InDriver — passengers book rides, drivers accept them, and the trip is tracked on a map. The difference is in what happens during the trip and how driver identity is verified before a ride begins.

The platform runs entirely in the browser as a Progressive Web App. There is no app store involved. A passenger in Lahore opens safora.me on their phone's browser, logs in with their phone number, and the full application runs. The same codebase serves both the passenger and driver interfaces — the role selected during login determines which screens are shown.

There are four deployable components in total:
- **Passenger and Driver PWA** — React Native with Expo Web, deployed at safora.me on Vercel
- **Admin Dashboard** — React with Vite, deployed at admin.safora.me on Vercel
- **Backend API** — Node.js 20 + Express 4, deployed on Railway
- **AI Microservice** — Python 3.11 + Flask, deployed on Railway

---

## 2. The Three Core Features

### 2.1 Pink Pass — Women-Only Rides

**The problem it solves:** Pakistani women using ride-hailing platforms have no guarantee that the driver is actually female, even when booking a "women preferred" category. SAFORA's Pink Pass eliminates this by requiring biometric identity verification before a driver can serve Pink Pass rides, and restricting the matching algorithm to only show certified female drivers for this ride type.

**How the verification pipeline works technically:**

Step 1 — CNIC Photo Capture  
The passenger or driver opens the Pink Pass enrollment screen. The app opens the device's rear camera. The user positions their CNIC (Computerized National Identity Card) in the frame and captures a photo. The photo is encoded to a base64 string on the device.

Step 2 — Liveness Video Recording  
The app then switches to the front camera. The user is shown an oval overlay and asked to look at the camera and blink or move slightly during an 8-second recording. The recording captures 6 frames at intervals and encodes them to base64.

Step 3 — Submission to AI Service  
The frontend sends `POST /api/pink-pass/enroll` to the Node.js backend with `{ cnics: <base64 CNIC photo>, livenessFrames: [<6 base64 frames>] }`.

Step 4 — AI Liveness Verification  
The backend forwards the frames to the AI microservice at `POST /api/pink-pass/verify-frames`. The AI service runs this logic in `services/liveness_detector.py`:
- Decodes each base64 frame to an OpenCV BGR image
- Runs OpenCV Haar Cascade face detection on each frame (frontal + profile cascades)
- Counts how many frames contain a detected face (minimum required: 3 frames)
- Computes a pixel-difference motion score between consecutive frames: average of `|frame[i] - frame[i-1]|` across all pixels on 80×60 thumbnails
- If motion score >= 3.0 AND face detected in >= 3 frames: liveness passes
- If motion score < 3.0: rejected as possible static photo spoof attempt

Step 5 — Outcome Handling  
- AI passes: `user.pinkPassStatus = 'approved'`, `user.pinkPassVerified = true`
- AI rejects: `user.pinkPassStatus = 'rejected'`
- AI service offline: `user.pinkPassStatus = 'pending_review'` — admin reviews manually

Step 6 — Admin Review  
When status is `pending_review`, the CNIC photo and first selfie frame are stored in the User document in MongoDB. The admin sees these in the admin dashboard under the Pink Pass Passengers queue. Admin clicks Approve or Reject. On any decision, the backend deletes both images from the database immediately (set to `undefined`) per PDPB 2023 requirements.

**How Pink Pass ride matching works:**  
When a passenger books a Pink Pass ride, the backend's `POST /api/rides/request` route filters the driver matching query:

```javascript
if (type === 'pink-pass') {
    matchedDriver = nearbyDrivers.find(
        d => d.user.gender === 'female' && d.pinkPassCertified
    );
}
```

Only drivers within 15km who are `status: online`, have `user.gender === 'female'`, and have `pinkPassCertified === true` on their Driver document will appear as candidates. If no such driver exists, the passenger is shown a "no driver available" message.

---

### 2.2 SafetySentinel — Automatic Route Deviation Detection

**The problem it solves:** When a driver deviates from the expected route during a trip, the passenger may not realise immediately, may not feel safe to confront the driver, and has no automated system to call for help on their behalf. SafetySentinel watches every active trip on the server and triggers an alert automatically — the passenger does not need to do anything.

**How it works technically:**

The SafetySentinel is a JavaScript class in `backend/utils/SafetySentinel.js`. It is instantiated once when the backend server starts and stored on the Express app object:

```javascript
const safetySentinel = new SafetySentinel(io);
app.set('safetySentinel', safetySentinel);
```

**Starting monitoring:**  
When a driver marks a ride as `started` via `PATCH /api/rides/:id/status`, the backend calls:
```javascript
safetySentinel.startMonitoring(ride._id.toString(), [
    ride.pickupLocation.coordinates,
    ride.dropoffLocation.coordinates
]);
```
The planned route is stored as a two-coordinate GeoJSON LineString (a straight line from pickup to dropoff). The system uses this as the reference baseline.

**Real-time deviation checking:**  
The driver app continuously emits `driver:location-update` Socket.io events with `{ rideId, driverId, lat, lng }`. The Socket.io server in `backend/index.js` receives each event and calls:
```javascript
const alert = await safetySentinel.updateLocation(rideId, { lat, lng });
```

Inside `updateLocation()`:
1. The current GPS point is converted to a Turf.js Point: `turf.point([lng, lat])`
2. The planned route is converted to a Turf.js LineString: `turf.lineString(plannedRoute)`
3. Distance is calculated: `turf.pointToLineDistance(currentPoint, routeLine, { units: 'meters' })`
4. If distance > 500 metres, the deviation timer starts
5. If deviation has persisted for 30 seconds (30,000ms), the alert fires

**What happens when alert fires:**  
The `updateLocation` method returns an alert object with type `route-deviation`. The Socket.io server emits two events:
- `safety:deviation-alert` to room `ride-<rideId>` — the passenger's phone receives this
- `safety-alert` to all connections — the admin dashboard receives this

**What the passenger sees:**  
The passenger's TrackingScreen receives the `safety:deviation-alert` event. A modal appears with the deviation description and a 30-second countdown timer. The passenger has two options:
1. Tap "I Am Safe" — dismisses the alert, countdown stops
2. Do nothing — when countdown reaches zero, `handleAutoSOS` runs automatically

**Auto-SOS execution:**  
`handleAutoSOS` calls `POST /api/safety/alert` with `{ message: 'Auto-SOS: Passenger did not respond to deviation alert within 30 seconds.' }`. This endpoint:
1. Creates an Alert document in MongoDB with `severity: critical`, `status: active`
2. Emits `safety-alert` Socket.io event to the admin dashboard
3. Fetches the passenger's `emergencyContacts` array from their User document
4. If Twilio is configured, sends SMS to each emergency contact: `"SAFORA ALERT: [name] may be in danger. Type: route-deviation. Location: https://maps.google.com/?q=[lat],[lng]"`

The system also detects suspicious stops (vehicle moves less than 10 metres for more than 5 minutes) and triggers a `suspicious-stop` alert through the same mechanism.

---

### 2.3 AI Dynamic Pricing Engine

**The problem it solves:** Flat-rate or opaque pricing creates distrust. SAFORA shows passengers a transparent fare breakdown before they confirm a booking.

**How the AI service works:**

The Python Flask AI microservice is deployed separately from the Node.js backend. When a passenger requests a fare estimate, the backend calls `POST /api/pricing/predict` on the AI service:

```javascript
const pricingResponse = await axios.post(`${aiServiceUrl}/api/pricing/predict`, {
    distance,           // km, calculated by Haversine formula
    duration,           // estimated minutes (distance * 3)
    time_of_day,        // current hour (0-23)
    day_of_week,        // 0=Monday, 6=Sunday
    demand_level,       // 'medium' (default)
    origin_area,        // 0 (default)
    traffic_multiplier  // 1.0 (default)
}, { timeout: 3000 });
```

**The ML model:**  
The `price_model.pkl` is a scikit-learn LinearRegression model trained on 500 synthetic ride records generated by `train_model.py`. The training data was designed to reflect real Lahore ride pricing patterns:
- Base fare: PKR 50
- Distance rate: PKR 35/km
- Time rate: PKR 5/minute
- Demand multipliers: low=1.0, medium=1.2, high=1.5, peak=2.0
- Ride type multipliers: standard=1.0, pink-pass=1.1, eco=0.85
- Traffic multiplier: 1.0–1.8
- ±8% random noise added

The model achieves R² > 0.95 on the test split.

**Fallback behaviour:**  
If the AI service is unreachable (3-second timeout), the backend calculates: `(distance × 35) + (duration × 5) + 50`. The fare is capped at PKR 3000 maximum regardless of which calculation is used.

---

## 3. Complete Ride Journey — Step by Step

This section walks through a complete ride from the moment a passenger opens the app to the moment the trip ends.

### Step 1: Authentication
The passenger opens safora.me. They enter their phone number. Firebase Phone Auth sends an OTP SMS to that number. The passenger enters the code. The app sends `POST /api/auth/verify-firebase-token` with the Firebase `idToken`. The backend verifies the token with Firebase's REST API, finds or creates the User document, and returns a SAFORA JWT (HS256, 15-minute expiry). The app stores the JWT in AsyncStorage.

### Step 2: Booking a Ride
The passenger taps "Where to?" on the home screen. The Google Places API provides location autocomplete. The passenger selects a destination. The app sends `POST /api/rides/request` with pickup coordinates, dropoff coordinates, and ride type (standard, pink-pass, or eco).

The backend:
1. Calculates distance using the Haversine formula
2. Estimates duration: `distance × 3` minutes
3. Calls the AI service for fare prediction (3-second timeout, fallback if unavailable)
4. Creates a Ride document in MongoDB with status `requested`
5. Queries the Driver collection using MongoDB `$near` operator with `$maxDistance: 15000` metres, filtering for `status: online`
6. For pink-pass: additionally filters `user.gender === 'female'` and `pinkPassCertified === true`
7. If a driver is found, sets `ride.status = 'matched'` and emits `ride:request` Socket.io event to room `driver:<driverDocId>`
8. Returns the ride ID, estimated price, and `driverMatched: true/false` to the passenger

### Step 3: Driver Receives Request
The driver app is connected to Socket.io room `driver-<driverDocId>`. It receives the `ride:request` event and shows the Ride Request screen with a 30-second countdown, the passenger's pickup and dropoff addresses, the estimated fare in PKR, and the distance.

The driver swipes to accept. The app calls `PATCH /api/rides/:id/accept`. The backend:
1. Validates the ride is still in `matched` or `requested` status
2. Sets `ride.status = 'accepted'`
3. Emits `ride:accepted` Socket.io event to room `ride-<rideId>`

If the driver rejects, `PATCH /api/rides/:id/reject` sets `ride.status = 'requested'` and `ride.driver = null`, and emits `ride:no-driver` to the passenger.

### Step 4: Live Tracking
The passenger's app receives `ride:accepted` and navigates to the TrackingScreen. The TrackingScreen joins Socket.io room `ride-<rideId>`.

The driver app begins broadcasting GPS coordinates via `driver:location-update` events. The Socket.io server relays these to the passenger as `driver:location` events. The passenger's map marker updates in real time.

Simultaneously, each GPS ping from the driver is processed by SafetySentinel for route deviation checking (described in Section 2.2).

### Step 5: Pickup and Trip Start
The driver marks themselves as arrived. The driver app calls `PATCH /api/rides/:id/status` with `{ status: 'accepted' }` (already in accepted state — this updates the driver's local phase display). When the passenger boards and confirms, the driver calls `PATCH /api/rides/:id/status` with `{ status: 'started' }`.

The backend:
1. `RideStateMachine.validateTransition('accepted', 'started')` — confirms valid
2. Sets `ride.status = 'started'` and `ride.startedAt = new Date()`
3. Calls `safetySentinel.startMonitoring(ride._id.toString(), plannedRoute)`
4. Emits `ride-status-updated` with `status: 'started'` to room `ride-<rideId>`

SafetySentinel is now active for this ride.

### Step 6: Trip in Progress
The driver navigates to the destination. GPS coordinates are broadcast continuously. SafetySentinel checks each ping. The passenger can see the driver moving on the map. The SOS button is always visible on the passenger's TrackingScreen.

If the driver deviates significantly (> 500m for > 30 seconds), the deviation alert modal appears on the passenger's screen with a 30-second countdown.

The passenger and driver can chat via the in-app chat. Messages flow through Socket.io room `chat-<rideId>` and are saved to `ride.chatMessages` in MongoDB.

### Step 7: Trip Completion
The driver calls `PATCH /api/rides/:id/status` with `{ status: 'completed' }`.

The backend:
1. `RideStateMachine.validateTransition('started', 'completed')` — confirms valid
2. Sets `ride.status = 'completed'` and `ride.completedAt = new Date()`
3. Calls `safetySentinel.stopMonitoring(ride._id.toString())`
4. Emits `ride-status-updated` with `status: 'completed'` to room `ride-<rideId>`

The passenger's app receives the completed status and navigates to the Rating/Payment screen after 1.5 seconds.

### Step 8: Payment and Rating
The passenger sees the fare breakdown and selects a payment method. Cash payment calls `POST /api/payment/cash` which sets `ride.paymentMethod = 'cash'` and `ride.paymentStatus = 'paid'`. Card payment creates a Stripe payment intent (Stripe credentials required — cash is the current default).

Both passenger and driver submit ratings. Ratings are stored on the Ride document under `rating.passengerRating` and `rating.driverRating`.

---

## 4. Admin Dashboard Operations

The admin dashboard at admin.safora.me provides oversight and management capabilities.

**Login:** Admin enters their phone number. The OTP is rerouted to the admin's email address via Resend rather than sent via SMS (to avoid Twilio costs for internal use). Admin enters the code from email.

**Dashboard Overview:** Shows live counts of total rides today, active drivers, SOS alerts today, and registered passengers. These are fetched from `GET /api/admin/dashboard` which runs 8 parallel MongoDB queries.

**Live Map:** Shows driver positions in Lahore using a Google Maps embed. Positions update via Socket.io `safety-alert` events.

**Driver Approval:** Shows all drivers with `backgroundCheck.status: pending`. Admin reviews driver details (name, CNIC, license number, vehicle information) and clicks Approve or Reject. Approval calls `PATCH /api/admin/drivers/:id/approve`.

**Pink Pass Queue:** Two separate tabs — one for pending driver Pink Pass applications, one for pending passenger Pink Pass applications. Admin reviews the submitted CNIC photo and selfie. After decision, the images are permanently deleted from the database.

**SOS Alerts:** Shows active alerts with passenger name, location link, driver details, and timestamp. Admin can mark as resolved via `PATCH /api/safety/alerts/:id/resolve`.

**User Management:** Full user list with pagination. Admin can edit user details or permanently delete accounts.

**Admin Management:** Master admin can add new admin accounts or remove admin roles. New admin created with `POST /api/admin/add`. Role removal via `DELETE /api/admin/:id`.

---

## 5. Data Storage

MongoDB Atlas M10 is used. The M10 tier is required because the free tier does not support the `$near` geospatial operator, which is essential for driver matching.

**Collections:**
- `users` — all user accounts regardless of role, with embedded `emergencyContacts` array
- `drivers` — driver-specific data with 2dsphere index on `currentLocation`
- `rides` — full ride lifecycle with embedded `chatMessages` array
- `alerts` — SOS alerts with `notificationsSent` subdocument tracking which contacts received SMS

**Redis (ioredis):**
- `driver:loc:<driverId>` — driver's last known GPS coordinates, 30-second TTL
- `session:<userId>` — JWT session token, 900-second TTL (matches JWT expiry)

If `REDIS_URL` is not configured, a JavaScript Map-based in-memory fallback is used automatically. All callers work without modification.

---

## 6. Security Implementation

**JWT Authentication:** Every API request (except login) requires `Authorization: Bearer <token>`. The middleware in `backend/middleware/auth.js` verifies the token using `JWT_SECRET` and attaches `{ userId, role }` to `req.user`. Role-based access uses the `authorize(role)` middleware.

**OTP Rate Limiting:** Maximum 5 OTP requests per 15 minutes per IP address. Maximum 10 verification attempts per 15 minutes per IP.

**API Rate Limiting:** 100 requests per minute per IP address using `express-rate-limit`.

**Input Validation:** Joi schema validation on admin routes. Mongoose schema validation on all database writes.

**Biometric Data:** CNIC photos and selfie frames are stored temporarily only for admin review. They are set to `undefined` (removed from the MongoDB document) immediately after admin makes an approve/reject decision.

**CORS:** The backend explicitly whitelists `safora.me`, `admin.safora.me`, and localhost development ports. Unknown origins are rejected in production.

---

## 7. What Is Fully Working vs Partially Implemented

### Fully Working
- Firebase Phone Auth OTP login for all user types
- Ride booking with Haversine distance calculation
- AI fare prediction (with fallback formula)
- Driver matching using MongoDB `$near` geospatial query
- Pink Pass driver matching filter
- Socket.io real-time events (all room types)
- SafetySentinel backend GPS deviation detection
- SafetySentinel frontend 30-second countdown and auto-SOS
- Manual SOS from both passenger and driver screens
- SOS Alert document creation + Twilio SMS dispatch
- Pink Pass enrollment and liveness detection
- Admin dashboard all panels
- Driver earnings screen with real API data
- In-app chat (Socket.io events + MongoDB persistence)
- Cash payment marking
- Post-ride rating submission

### Partially Implemented
- In-app chat: Socket.io messaging works but the chat history screen (reading from MongoDB `chatMessages`) does not have a complete UI
- SafetySentinel auto-Alert document creation: the deviation alert is emitted to the passenger and admin via Socket.io, but the automatic backend creation of an Alert MongoDB document on deviation (without requiring the frontend to call `POST /api/safety/alert`) is not yet fully wired

### Not Implemented
- Stripe card payment UI (backend route exists, Stripe credentials not configured)
- PWA installation prompt and offline service worker support

---

## 8. Deployment

### Backend (Railway)
Deployed from the `backend/` directory. Railway uses `nixpacks.toml` for build configuration. Environment variables are set in Railway's project settings. The server starts with `node index.js`. Port is provided by Railway via `process.env.PORT`.

### AI Microservice (Railway)
Deployed from the `ai-service/` directory. Uses `Dockerfile` with `python:3.10-slim` base image and `libgl1` installed for OpenCV. Railway sets the PORT environment variable. The service starts with `python app.py`.

### Passenger PWA + Admin Dashboard (Vercel)
Both deployed from their respective directories on Vercel. Vercel auto-detects Expo Web and React + Vite builds. Environment variables (API URL, Maps key) are set in Vercel project settings.

---

*This document reflects the actual implemented state of the SAFORA system as of May 2026.*  
*FYP26-CS-G11 | University of Central Punjab*
