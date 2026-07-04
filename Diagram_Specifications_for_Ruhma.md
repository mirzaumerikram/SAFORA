# SAFORA — Diagram Specifications (Code-Verified)

Every step below was verified directly against the current codebase (not guessed/AI-hallucinated). **Update:** all 8 discrepancies originally flagged here have since been fixed in code (see the summary table at the end for what changed) — the notes below are left in place with a **✅ FIXED** marker so you know exactly what changed and why, rather than silently rewriting history.

---

## DIAGRAM 4 — Activity Diagram: Passenger Ride Booking Flow

**Swimlanes:** Passenger App | Backend API | AI Pricing Service | Database | Driver App

1. **[Passenger App]** Passenger enters pickup + dropoff location, selects ride type (`standard` or `pink-pass`).
2. **[Passenger App]** Taps "Request Ride" → `POST /api/rides/request`.
3. **[Backend API]** Validates `pickupLocation` and `dropoffLocation` present.
   - **Decision:** Missing? → Return `400`, end flow.
4. **[Backend API]** Decision: `type === 'pink-pass'`?
   - **Yes →** Check `passUser.gender === 'female' AND passUser.pinkPassVerified === true`.
     - **Fails →** Return `403 "Pink Pass is strictly reserved for verified female passengers."`, end flow.
     - **Passes →** continue.
   - **No →** continue directly.
5. **[Backend API]** Compute distance: use client-supplied distance if provided, else Haversine formula on coordinates, else fallback `1.0` km.
6. **[Backend API]** Compute duration: client-supplied, else `max(5, distance × 3)` minutes.
7. **[Backend API]** Compute local fallback price: `distance×35 + duration×5 + 50`.
8. **[Backend API]** Decision: was a client price supplied?
   - **No →** Call **AI Pricing Service** (see Diagram 8) for a predicted price.
   - **Yes →** Skip AI call, use client price.
9. **[Database]** Create `Ride` document with `status: 'requested'`.
10. **[Backend API]** Attempt driver matching (see Diagram 7, steps 6-9) — wrapped so a matching failure never rolls back the already-saved ride.
11. **[Backend API]** Decision: driver matched?
    - **Yes →** Set `ride.status = 'matched'`, emit `ride:request` to that driver, send push notification. Continue to Diagram 11 (Driver Accept Ride).
    - **No →** ✅ **FIXED:** Ride still stays `status: 'requested'` (unmatched), but the backend now emits `ride:no-driver` to the passenger's ride room, and the Passenger App now listens for it and shows a "No Drivers Available" message instead of spinning forever.
12. **[Passenger App]** Shows "Searching for driver..." screen while polling and listening for real-time socket updates.
13. End (either "Driver Confirmed" happy path continues into Diagram 11, or passenger is shown "No Drivers Available" and can retry/cancel).

---

## DIAGRAM 5 — Activity Diagram: Driver Trip Execution Flow

**Swimlanes:** Driver App | Backend API | Database | Socket.io | Passenger App

1. **[Driver App]** Incoming ride modal appears (30-second countdown) → Driver taps **Accept**.
2. **[Backend API]** `POST /rides/:id/accept` → sets `ride.status = 'accepted'`, `ride.driver = <this driver>`. Emits `ride:accepted` to room `chat-<rideId>`. Sends push notification to passenger.
3. **[Driver App]** Navigates to Trip Navigation screen, phase = `en_route`.
4. **[Driver App]** Driver taps **"I have Arrived at Pickup"**.
   - ⚠ **CODE GAP:** This is a **local UI state change only** — no REST call, no DB write. Only a Socket.io event `driver:arrived` is emitted (relayed to `ride-<rideId>` room so the passenger app can show "driver arrived").
5. **[Driver App]** Phase → `arrived`. Driver taps **"Passenger Boarded — Start Ride"**.
6. **[Backend API]** `PATCH /rides/:id/status { status: 'started' }` → sets `ride.startedAt`. Emits `ride-status-updated`.
7. **[Backend API]** `SafetySentinel.startMonitoring()` begins (see Diagram 10) — builds a straight 2-point line between pickup/dropoff as the "planned route."
8. **[Driver App]** Phase → `onboard`. Driver taps **"Approaching Dropoff"**.
   - ⚠ **CODE GAP:** Local UI state only — no backend call at all.
9. **[Driver App]** Phase → `dropping`. Driver taps **"Complete Ride"** → confirms in modal.
10. **[Backend API]** `PATCH /rides/:id/status { status: 'completed' }` → sets `ride.completedAt`; ✅ **FIXED:** now also finalizes `ride.actualPrice = ride.estimatedPrice` (cash-settlement assumption — no card/wallet payment gateway exists, so the estimate becomes the final settled fare) and sets `ride.paymentStatus = 'paid'`, so the "PAID" badge shown later actually reflects a real backend field. Driver stats (`totalRides`, `totalEarnings`) increment using this finalized `actualPrice`. `SafetySentinel.stopMonitoring()` fires.
11. **[Driver App]** Navigates to Rate Passenger screen.
12. **Decision:** Driver submits a rating or taps Skip?
    - **Submit →** `POST /rides/:id/rate { raterRole: 'driver' }`. Optional AI sentiment tagging on comment text (3s timeout, silently defaults to "Neutral" on failure).
    - **Skip →** no rating recorded.
    - Either way, continue (even a failed submit still proceeds — non-blocking).
13. **[Driver App]** Navigates to Fare Breakdown screen (client recomputes a cosmetic fare breakdown locally; the "PAID" badge now corresponds to a real `paymentStatus: 'paid'` value set in step 10).
14. **[Driver App]** Taps "Done" → returns to Driver Dashboard. End flow.

**Side branch — mid-trip cancellation** (available at any phase except `done`):
- **[Driver App]** Taps Cancel → confirm dialog (⚠ **CODE GAP:** on native mobile, there's no real confirmation dialog — it's hardcoded to proceed immediately; only web shows a real `confirm()`).
- **[Backend API]** `POST /rides/:id/cancel { cancelledBy: 'driver' }` → sets `status: 'cancelled'`. Emits `ride:cancelled`.
  - ⚠ **CODE GAP:** This specific endpoint does **not** stop SafetySentinel monitoring (only the `/status` completed/cancelled path does) — a cancelled-via-this-route trip can leave a stale monitor running in memory.
  - ⚠ **CODE GAP:** This endpoint has no ownership check — any authenticated user (not just the assigned driver/passenger) can cancel any ride by ID.

---

## DIAGRAM 6 — Activity Diagram: SOS Emergency Response Flow

**Swimlanes:** Passenger App | SafetySentinel (background) | Backend API | Twilio | Admin Dashboard

**Branch A — Manual trigger:**
1. **[Passenger App]** Passenger long-presses SOS button (Safety screen) or taps always-visible SOS button (Tracking screen).
2. **[Passenger App]** Confirms in alert dialog.
3. **[Backend API]** `POST /safety/sos` → creates `Alert` doc (`type: 'sos'`, `severity: 'critical'`, `status: 'active'`). Emits `safety-alert` (broadcast to all connected clients, including Admin Dashboard).
4. **[Passenger App]** Separately emits socket `sos:trigger`, relayed by server as `sos:active` (global broadcast, no DB write — a lightweight parallel signal).

**Branch B — Automatic trigger (SafetySentinel):**
1. **[SafetySentinel]** Continuously receives driver GPS pings (`driver:location-update`) during an active (`started`) ride.
2. **[SafetySentinel]** Computes perpendicular distance from current position to the straight pickup→dropoff line.
   - **Decision:** distance > 500m?
     - **No →** reset deviation timer, keep monitoring.
     - **Yes →** start (or continue) a deviation timer.
       - **Decision:** has it been ≥30 seconds continuously deviated?
         - **No →** keep waiting (loop back to next GPS ping).
         - **Yes →** fire a `route-deviation` alert (severity `medium`) exactly once. Server creates an `Alert` doc and emits `safety:deviation-alert` to the ride room + `safety-alert` to admin.
3. **[Passenger App]** Receives `safety:deviation-alert` → shows a modal with a **second, independent 30-second countdown** and two options: "I Am Safe" (dismiss) or "Send SOS Now".
   - **Decision:** Passenger responds within 30s?
     - **"I Am Safe" →** dismiss, end this branch.
     - **"Send SOS Now" →** proceed to step 4.
     - **No response, timer expires →** automatically proceeds to step 4 (`handleAutoSOS`).
4. **[Backend API]** `POST /safety/sos` fires (same endpoint as manual trigger, message auto-filled: "Auto-SOS: Passenger did not respond to deviation alert within 30 seconds."). Same `safety-alert` broadcast as Branch A.

**Convergence — after any SOS alert is created (via `/safety/alert`, the ride-scoped variant used for deviation/suspicious-stop types, not the plain `/safety/sos` route):**
5. **[Backend API]** Emits `safety-alert` to Admin Dashboard **first**.
6. **[Backend API]** Independently (parallel, non-blocking) attempts Twilio SMS to configured emergency contacts.
   - **Decision (per-contact, wrapped independently):** SMS send succeeds or fails?
     - Either outcome is caught internally and never propagates as an error — the admin notification in step 5 already happened regardless, and the HTTP response always returns `201`.
7. **[Admin Dashboard]** Receives `safety-alert`, displays it in the SOS Alerts list.
8. **[Admin Dashboard]** Admin chooses one of three actions on an active alert:
   - **Resolve** → `PATCH /safety/alerts/:id/resolve` → sets `status: 'resolved'`. Emits `alert-resolved`.
   - **✅ FIXED — Escalate to Police** → `PATCH /safety/alerts/:id/escalate` → sets `status: 'escalated'`, records `escalatedAt`/`escalatedBy`/`escalationNotes`. Emits `alert-escalated`, which the dashboard listens for in real time. This is now a real, implemented **opt** fragment (only valid from `status: 'active'`).
   - *(Alternative: Admin taps Delete → `DELETE /admin/alerts/:id`, removes the record entirely.)*

✅ **FIXED:** "Escalate to Police" is now a real feature — `Alert.status` enum includes `'escalated'`, the backend endpoint above exists, and the Admin Dashboard has a working "Escalate to Police" button plus a corresponding filter tab (replacing the old dead "Handling" tab that nothing ever set).

---

## DIAGRAM 7 — Sequence Diagram: Ride Booking Flow

**Participants:** Passenger App, RidesController (`backend/routes/rides.js`), Database, AI Pricing Service, Socket.io, Driver App

1. Passenger App → RidesController: `POST /rides/request { pickupLocation, dropoffLocation, type }`
2. RidesController → RidesController: validate required fields (`alt` — missing → return `400`, end)
3. **alt** `type === 'pink-pass'`
   - RidesController → Database: check `passUser.gender`, `passUser.pinkPassVerified`
   - **alt** not eligible → RidesController → Passenger App: `403` response, end
   - **else** eligible → continue
4. RidesController → RidesController: compute `distance` (Haversine or client-supplied), `duration`, local fallback `estimatedPrice`
5. **alt** no client-supplied price
   - RidesController → AI Pricing Service: `POST /api/pricing/predict { distance, duration, time_of_day, day_of_week, demand_level:'medium', ride_type:<0|1|2>, traffic_multiplier:1.0 }` *(✅ FIXED: sends `ride_type` — matching the model's training feature order — instead of the unused `origin_area`; see Diagram 8 for internals)*
   - **alt** AI service responds → use returned `estimated_price`
   - **else** AI service times out/errors (3s timeout) → silently keep local fallback price (no error shown to passenger)
6. RidesController → Database: create `Ride { status: 'requested', ... }`
7. RidesController → Database: query nearby drivers — `Driver.find()` with a geospatial `$near` filter, `limit(10)` *(✅ FIXED: `status: 'online'` filter and `$maxDistance: 15000` (15km) radius cap are both restored/enforced — previously commented out)*
8. **alt** `type === 'pink-pass'`
   - RidesController: filter candidates where `driver.gender === 'female' AND driver.pinkPassStatus === 'approved'`
   - ✅ **FIXED:** previously checked a non-existent field `pinkPassCertified`, which always evaluated false. Now correctly checks the real `pinkPassStatus` field, so pink-pass rides can actually match an admin-approved female driver.
   - **else** standard ride → pick `nearbyDrivers[0]` (nearest of the top 10, no further logic)
9. **alt** a driver was matched
   - RidesController → Database: `ride.status = 'matched'`, `ride.driver = <id>`
   - RidesController → Socket.io: emit `ride:request` to room `driver-<driverId>`
   - Socket.io → Driver App: `ride:request` event delivered
   - RidesController → Driver App: push notification (fire-and-forget, own try/catch)
   - RidesController → Passenger App: `201 { ride: { id, estimatedPrice, status:'matched', driverMatched:true } }`
10. **else** no driver matched
    - Ride stays `status:'requested'`, `driver: null`. ✅ **FIXED:** backend now emits `ride:no-driver` to the passenger's ride room so the app can surface this instead of polling blindly.
    - RidesController → Passenger App: `201 { ride: { ..., status:'requested', driverMatched:false } }`

---

## DIAGRAM 8 — Sequence Diagram: AI Dynamic Pricing

**Participants:** RidesController (backend), Flask Pricing Route (`ai-service/routes/pricing.py`), PricingService (`ai-service/services/pricing.py`), Trained Model (`price_model.pkl`, optional)

1. RidesController → Flask Pricing Route: `POST /api/pricing/predict { distance, duration, time_of_day, day_of_week, demand_level, ride_type, traffic_multiplier }`
2. Flask Pricing Route: validate `distance`/`duration` present (`alt` missing → `400`, end)
3. Flask Pricing Route → PricingService: `predict_price(data)`
4. **alt** trained model file (`models/price_model.pkl`) was loaded successfully at service startup
   - PricingService: build 7-feature vector `[distance, duration, time_of_day, day_of_week, encode_demand(demand_level), ride_type, traffic_multiplier]`
   - PricingService → Trained Model: `model.predict(X)`
   - ✅ **FIXED:** previously position 6 was `origin_area` (always `0`) at inference time, but the model was trained with `ride_type` in that slot — a real feature-order mismatch. Now both request payload and inference vector use `ride_type` (0=standard, 1=pink-pass, 2=eco), matching `train_model.py`'s training order exactly.
5. **else** no trained model available (file missing)
   - PricingService: use fallback formula: `subtotal = 50 (base) + distance×25 + duration×3`; `predicted_price = subtotal × surge_multiplier[demand_level] × traffic_multiplier` (surge multipliers: low=1.0, medium=1.2, high=1.5, peak=2.0)
6. PricingService: apply fare cap regardless of which branch was used — `fare_cap = 2 × base_calculation`; clamp `predicted_price` between `base_fare` and `fare_cap`; flag `cap_applied` if clamping occurred
7. PricingService → Flask Pricing Route: return `{ estimated_price, breakdown, currency:'PKR', cap_applied, fare_cap }`
8. Flask Pricing Route → RidesController: `200 { ...same payload }`
9. RidesController: use `estimated_price` as the ride's final `estimatedPrice`

*(Note: `train_model.py` is a separate, manually-run offline script that generates 500 synthetic samples and trains the `LinearRegression` model — it is not part of the live request path and does not belong in this sequence diagram, only mentioned here for context.)*

---

## DIAGRAM 9 — Sequence Diagram: Pink Pass Verification

**Participants:** Passenger App (CNIC screen), Passenger App (Liveness/Camera screen), PinkPassController (`backend/routes/pinkpass.js`), AI Service — CNIC Verifier, AI Service — Liveness Detector, Database

1. Passenger App (CNIC screen): captures CNIC photo, runs **client-side-only** Tesseract OCR pre-check (regex for Pakistani ID keywords + CNIC number pattern).
2. Passenger App (CNIC screen): parity-checks the last digit of the extracted CNIC number as a **proxy for gender** (odd = male, even = female) — this is a local heuristic, not a real gender-verification method.
   - **alt** last digit odd (flagged as male)
     - Passenger App → PinkPassController: `POST /pink-pass/reject-security { reason: "Automated rejection: Male CNIC detected" }`
     - PinkPassController → Database: permanently set `pinkPassStatus = 'rejected'`
     - End flow (this device-side check can be bypassed entirely, since it's just a UI gate — the actual server-side check happens later at `/enroll` regardless)
   - **else** last digit even (proceeds as female) → continue to liveness capture
3. Passenger App (Liveness screen): captures a short burst of camera frames.
4. Passenger App: runs a **client-side motion pre-check** (grayscale pixel-diff heuristic, threshold 2.5) purely to decide whether to bother calling the backend — not authoritative.
5. Passenger App → PinkPassController: `POST /pink-pass/enroll { cnics: [...], livenessFrames: [...] }`
6. PinkPassController → Database: check `user.gender === 'female'` (the real, authoritative eligibility gate — based on the profile field set at registration, **not** derived from the CNIC image).
   - **alt** not female → PinkPassController → Passenger App: `403 "Pink Pass is only available for female passengers"`, flow ends here immediately.
   - **else** female → continue
7. PinkPassController → AI Service (CNIC Verifier): `POST /api/pink-pass/verify-frames` (45s timeout)
8. AI Service — CNIC Verifier: checks image aspect ratio only (does it "look like a card") — ⚠ **CODE GAP:** this is **not** OCR or ML gender detection; it hardcodes `is_female: True` with a code comment stating gender is ultimately confirmed by human admin review, not AI.
9. AI Service — Liveness Detector: runs Haar Cascade face detection across submitted frames (needs ≥2 frames with a detected face, else fail: "Face not clearly visible").
10. AI Service — Liveness Detector: computes frame-to-frame grayscale pixel motion score across up to 12 consecutive frame pairs (threshold 3.0), fails with "no movement detected" if below threshold.
    - ⚠ **CODE GAP:** No true blink-detection or eye-aspect-ratio analysis is performed, despite UI copy claiming "MediaPipe Face Mesh + DeepFace" — that text does not match the real implementation (Haar Cascades + pixel-diff only, deliberately lightweight to run in 128MB RAM).
11. **alt** both face-detection and motion checks pass (`overall_verified = true`)
    - AI Service → PinkPassController: `{ verified: true }`
    - PinkPassController → Database: `pinkPassStatus = 'pending_review'` — ⚠ **CODE GAP:** `pinkPassVerified` is **never set to true** here even on a full pass; it requires a separate manual admin action (no such admin-approve route exists for passengers in the current code — only drivers have one).
    - PinkPassController → Passenger App: `200 { success: true }`
    - Passenger App: ⚠ **CODE GAP:** despite the pass genuinely still being `pending_review` server-side, the app **locally overwrites its own cached user state** to claim `pinkPassVerified: true, pinkPassStatus: 'approved'` — this is cosmetic/optimistic UI only and does not reflect the real backend record.
12. **else** liveness or face check fails
    - AI Service → PinkPassController: `{ verified: false, reason }`
    - PinkPassController → Database: `pinkPassStatus = 'rejected'`
    - PinkPassController → Passenger App: `400 { success: false, message: reason }`
13. **opt** Passenger retries after failure (bounded, up to 3 attempts)
    - ✅ **FIXED:** `User.pinkPassAttempts` now tracks failed AI-rejected attempts server-side. Each explicit AI rejection increments it and the error response includes `attemptsLeft`. Once 3 attempts are used and the status is `'rejected'`, `/enroll` returns `429 "Maximum verification attempts reached. Please contact support for manual review."` instead of allowing further retries. A successful scan resets the counter to 0.

*(Note: the driver-side Pink Pass application (`/pink-pass/driver-apply`) is a similar but separate flow with one more notable gap: if the AI service is unreachable, its catch block treats the driver as `verified: true` by default — fail-open, the opposite of a fail-closed security posture. Worth mentioning to Ruhma if a driver-side variant diagram is also needed.)*

---

## DIAGRAM 10 — Sequence Diagram: SOS Alert Flow

**Participants:** Passenger App, SafetySentinel, Backend API, Database, Twilio, Socket.io, Admin Dashboard

1. **alt** Manual trigger
   - Passenger App → Backend API: `POST /safety/sos { location, message }`
   - Backend API → Database: create `Alert { type:'sos', severity:'critical', status:'active' }`
   - Backend API → Socket.io: emit `safety-alert` (global broadcast)
2. **else** Automatic trigger (SafetySentinel)
   - Driver App → Backend API (via socket): `driver:location-update` (continuous, during any `started` ride)
   - Backend API → SafetySentinel: `updateLocation(rideId, coords)`
   - SafetySentinel: compute perpendicular distance to the straight pickup→dropoff line
   - **alt** distance > 500m sustained for ≥30 seconds (only fires once via an internal flag, not every tick)
     - SafetySentinel → Backend API: return `route-deviation` alert object
     - Backend API → Database: create `Alert { type:'route-deviation', severity:'medium' }`
     - Backend API → Socket.io: emit `safety:deviation-alert` to room `ride-<rideId>` **and** `safety-alert` to Admin Dashboard
     - Socket.io → Passenger App: `safety:deviation-alert` received → show modal, start independent 30-second response countdown
     - **alt** Passenger taps "I Am Safe" → dismiss, end this branch
     - **else** Passenger taps "Send SOS Now" OR countdown expires with no response
       - Passenger App → Backend API: `POST /safety/sos` (auto-filled message if timeout-triggered)
       - *(same effects as Manual trigger branch above)*
   - **else** deviation resolves before 30s, or no deviation → keep monitoring, no alert
3. **par** (after any alert creation via the ride-scoped `/safety/alert` route) — the following two happen concurrently, not sequentially:
   - Backend API → Socket.io → Admin Dashboard: `safety-alert` (this always happens, regardless of what follows)
   - Backend API → Twilio: attempt SMS to each configured emergency contact
     - **alt** SMS succeeds → mark `sent: true` for that contact
     - **else** SMS fails (invalid credentials, network error, etc.) → mark `sent: false`, error is caught internally, per-contact — never bubbles up, never blocks the response
   - Backend API → Passenger App: `201` response regardless of SMS outcomes; `notificationsSent.smsCount` reflects only successes
4. Admin Dashboard → Backend API: one of:
   - `PATCH /safety/alerts/:id/resolve` → `alert.status = 'resolved'` → emit `alert-resolved`
   - **✅ FIXED — opt: Escalate to Police** → `PATCH /safety/alerts/:id/escalate` → `alert.status = 'escalated'`, sets `escalatedAt`/`escalatedBy` → emit `alert-escalated` (only valid from `status: 'active'`)
   - *(Admin instead deletes: `DELETE /admin/alerts/:id` → record removed entirely)*

---

## DIAGRAM 11 — Sequence Diagram: Driver Accept Ride

**Participants:** Backend API, Database, Socket.io, Driver App, Passenger App

1. Backend API → Database: query nearby drivers, `limit(10)`, geospatial sort. ✅ **FIXED:** `status: 'online'` filter and a 15km (`$maxDistance: 15000`) radius cap are now enforced (previously both commented out).
2. **alt** `type === 'pink-pass'`
   - Backend API: filter for `driver.gender === 'female' AND driver.pinkPassStatus === 'approved'`
   - ✅ **FIXED:** previously checked a non-existent `pinkPassCertified` field (always false, so pink-pass rides could never match). Now correctly uses the real `pinkPassStatus` field.
3. **else** standard ride → select `nearbyDrivers[0]` (nearest candidate, no loop through multiple candidates)
4. **alt** a driver was selected
   - Backend API → Socket.io: emit `ride:request` to room `driver-<driverId>` — single driver only, no simultaneous multi-broadcast
   - Socket.io → Driver App: `ride:request` received → show incoming-ride modal, start **30-second** countdown (DTS text corrected to match code — code uses 30 seconds consistently in both the Driver Dashboard modal and the standalone Ride Request screen)
   - **alt** Driver taps Accept within 30s
     - Driver App → Backend API: `POST /rides/:id/accept`
     - Backend API → Database: `ride.status = 'accepted'`, `ride.driver = <id>` (overwrites any prior match unconditionally, no state-machine validation on this endpoint)
     - Backend API → Socket.io: emit `ride:accepted` to room `chat-<rideId>` *(note: this is the chat room, not the ride room — relies on the passenger having already joined that chat room for real-time delivery)*
     - Socket.io → Passenger App: `ride:accepted` received → navigate to Tracking screen
     - Backend API → Driver App: push notification (independent, fire-and-forget)
   - **else** countdown reaches 0 with no response (or driver explicitly rejects)
     - Driver App → Backend API: `PATCH /rides/:id/reject`
     - Backend API → Database: adds this driver to `ride.excludedDrivers`, sets `ride.status = 'requested'`, `ride.driver = null`
     - ✅ **FIXED — real re-broadcast loop:** Backend API immediately re-runs driver matching (same query as step 1, excluding all previously-rejected drivers via `$nin`) and, if a next-nearest candidate exists, re-emits `ride:request` to that driver's room — repeating this same 30-second accept/reject cycle. Only when candidates are fully exhausted does it emit `ride:no-driver` to the passenger's ride room, which the Passenger App now listens for and displays as "No Drivers Available."
5. **else** no driver was selected in the first place → same `ride:no-driver` signal is emitted and now surfaced to the passenger (see Diagram 4, step 11).

---

## Summary of Discrepancies — All Fixed

| # | Issue | Where | Fix Applied |
|---|---|---|---|
| 1 | Pink Pass rides could never match a driver (`pinkPassCertified` field doesn't exist) | `rides.js` driver matching | ✅ Now checks the real field: `pinkPassStatus === 'approved'` |
| 2 | No re-broadcast to next driver on reject/timeout | `rides.js` reject handler | ✅ Extracted shared `attemptDriverMatch()`; reject handler now excludes rejected drivers and re-matches to the next-nearest one; passenger app now listens for final `ride:no-driver` |
| 3 | Acceptance window is 30s in code, DTS text said 15s | `DriverDashboard.tsx`, `RideRequestScreen.tsx`, DTS docx | ✅ DTS document text corrected to 30s (matches code — code was left unchanged since 30s is the working, tested value) |
| 4 | No "escalate to police" feature existed | SOS flow | ✅ Added `Alert.status: 'escalated'`, new `PATCH /safety/alerts/:id/escalate` endpoint, real Admin Dashboard button + socket event, replacing the old dead "Handling" tab |
| 5 | Pink Pass retry limit didn't exist (unlimited retries) | Pink Pass screens | ✅ Added `pinkPassAttempts` counter (User + Driver models), capped at 3, enforced server-side with `429` once exhausted |
| 6 | AI pricing model feature-order mismatch (training vs inference) | `pricing.py` vs `train_model.py` | ✅ Backend now sends `ride_type` (matching training encoding) instead of the unused `origin_area` |
| 7 | No driver ride-radius cap enforced | `rides.js` matching query | ✅ Restored `status: 'online'` filter and `$maxDistance: 15000` (15km) radius cap |
| 8 | No real payment flow — `actualPrice`/`paymentStatus` fields never used | Ride completion | ✅ On completion, `actualPrice` is finalized from `estimatedPrice` and `paymentStatus` is set to `'paid'` (cash-settlement model) |

**Note for testing/demo purposes:** fix #7 (restoring the online-status + radius filter) means driver matching will now only succeed if test/demo drivers are actually marked `status: 'online'` and within 15km of the pickup point — if your test drivers were relying on the previous bypass, make sure they're toggled online before demoing ride requests.
