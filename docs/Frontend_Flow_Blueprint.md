# SAFORA: Frontend UI/UX Design Blueprint

This document specifies the complete user flow and screen requirements for the SAFORA Passenger and Driver apps.

## 1. Global Entry Point (Splash & Role Selection)

### 1.1 Splash Screen
- **Visuals**: SAFORA Logo animation, "Safety First for All" tagline.
- **Action**: Auto-transition to Onboarding or Dashboard depending on Auth state.

### 1.2 Language & Role Selection
- **Options**:
    - Select Language: Urdu / English (Crucial for local Sialkot/Pakistan market).
    - Select Role: **I am a Passenger** / **I am a Driver**.
- **Transition**: Leads to the Login/Signup screen corresponding to the role.

---

## 2. Authentication Flow (Phone-First)

### 2.1 Login / Signup Screen
- **Input**: Phone Number (Country code + Mobile).
- **Primary Action**: "Get OTP" button.
- **Terms**: Checkbox for "I agree to Safety Terms."

### 2.2 OTP Verification
- **Input**: 4-6 digit numeric keypad.
- **Action**: Auto-verify and redirect to **Profile Setup** (New User) or **Main Dashboard** (Existing User).

---

## 3. Passenger App Flow (The Ride Booking Cycle)

### 3.1 Main Dashboard (Home)
- **Primary View**: Interactive Map (Real-time location of nearby drivers).
- **Search Bar**: "Where to?" (Placeholder text).
- **Quick Links**: "Pink Pass" (Women's Safety), "Work," "Home."
- **Hamburger Menu**: Access to History, Payments, Safety Center.

### 3.2 Destination & Ride Type Selection
- **Action**: User enters destination.
- **Options Displayed**:
    - **Eco (Bike)**: Lowest price.
    - **Comfort (AC Car)**: Standard price.
    - **Pink (Women Only)**: Priority for female passengers and verified drivers.
- **Action**: "Confirm Ride Type" button showing Estimated Fare & Time.

### 3.3 Driver Search & Match
- **Visuals**: Pulse animation over the map. "Finding the safest driver for you..."
- **Transition**: Redirects to **Ride Details** once matched.

### 3.4 Live Tracking & Safety Screen
- **Info**: Driver Photo, Name, Plate Number, Rating.
- **Live View**: Movement of driver on map towards pickup.
- **Safety Buttons (Sticky)**:
    - **SOS**: One-tap alert to emergency contacts/police.
    - **Share Trip**: Live link to family.
    - **Call Driver**: VoIP/Anonymized calling.

---

## 4. Driver App Flow (The Fulfilment Cycle)

### 4.1 Driver Dashboard
- **Toggle**: **Offline / Online** (Giant green/red slider).
- **Stats Card**: Today’s Earnings, Total Trips, Rating.
- **Activity**: "Searching for Passengers..." if Online.

### 4.2 Ride Request Overlay
- **Info**: Pickup distance, Est. earning, Passenger rating.
- **Actions**: **Accept** (Swipe Right) / **Reject** (X Button).

### 4.3 Trip Navigation
- **View**: Auto-integration with Google Maps API.
- **Stages**:
    - **Arriving**: Navigation to Pickup.
    - **Passenger Onboard**: Action: "Start Ride" slider.
    - **Dropping Off**: Navigation to Destination.
    - **Arrived**: Action: "Finish Ride" button.

---

## 5. Post-Ride Experience (Review & Payment)

### 5.1 Feedback Screen
- **Rating**: 1-5 Stars.
- **Tags**: "Professional," "Clean Car," "Safe Driving."
- **Comment**: Text area.
- **Final Amount**: Total Fare breakdown.

---

## 6. Premium Theme Specifications for Designer
- **Palette**: Sleek Dark Mode (Deep Navy `#0A192F`, Neon Blue `#64FFDA`, Vibrant Purple `#BB86FC`).
- **Typography**: Sans-serif (Inter or Montserrat for high readability).
- **Dynamics**: Use Glassmorphism (semi-transparent cards) and smooth transitions (0.3s ease-in-out).
