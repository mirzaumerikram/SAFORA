# SAFORA 🛡️🚗

> **A Next-Generation, Safety-First Ride-Sharing Platform powered by AI.**

SAFORA is a comprehensive ride-hailing solution designed with an uncompromising focus on passenger safety, driver empowerment, and dynamic AI-driven efficiency. Built as a Final Year Project (FYP), SAFORA introduces groundbreaking features like **Pink Pass** for female-only rides, **SafetySentinel** for real-time route deviation tracking, and an **AI Pricing Engine** to ensure fair and accurate fare breakdowns.

---

## ✨ Core Features

### 🎀 Pink Pass (Female-Exclusive Rides)
- **Strict Identity Verification:** Uses AI-powered biometric liveness checks and CNIC verification to confirm female identity.
- **Gender Gating:** Ensures male accounts are strictly locked out of booking or driving for Pink Pass rides via backend security protocols.
- **Safe Environment:** Connects verified female passengers exclusively with certified female driver partners.

### 🛡️ SafetySentinel & Emergency SOS
- **Live Route Deviation Tracking:** Uses Socket.io and background GPS to monitor if a driver significantly deviates from the planned drop-off route.
- **Auto-SOS:** Automatically triggers a 30-second countdown for the passenger to confirm safety. If unresponsive, an SOS is dispatched to the admin/emergency contacts.
- **Manual SOS:** One-tap emergency button instantly alerts the SAFORA Safety Team and shares live coordinates.

### 🧠 Dynamic AI Pricing Engine
- **Fair Fare Calculation:** Utilizes time-of-day, traffic multipliers, distance (Haversine formula), and duration to predict prices accurately.
- **Vehicle Class Multipliers:** Accurately factors in vehicle tier premiums (Eco Bike, Auto Rickshaw, Comfort AC, Pink Pass) directly into base fares rather than artificial surge values.

### 👨‍✈️ Comprehensive Driver Dashboard
- **Real-Time Ride Lifecycle:** Smooth state-machine transitions (`requested` ➔ `matched` ➔ `accepted` ➔ `arrived` ➔ `started` ➔ `completed`).
- **Earnings Tracker:** Drivers can track total trips, ratings, and daily/weekly earnings dynamically.
- **Live GPS Broadcasting:** Continuous location updates emitted via WebSockets to ensure passengers always know where their driver is.

### 💻 Full-Stack Architecture
- **Passenger & Driver PWA:** A cross-platform Progressive Web App built with React Native / Expo Web.
- **Admin Dashboard:** A React-based web dashboard for monitoring live rides, managing users, and approving Pink Pass applicants.
- **Robust MERN Backend:** Scalable Node/Express server with a MongoDB database handling complex geospatial queries (`$near`) for driver matching.

---

## 🛠️ Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend (PWA)** | React Native, Expo Web, React Navigation, Axios |
| **Admin Dashboard** | React, Vite, TailwindCSS |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose) |
| **Real-Time** | Socket.io (Bi-directional GPS & Ride States) |
| **Integrations** | Resend (Email OTPs), Google Maps/Places API, Custom AI Microservice |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB connection string
- Google Maps API Key
- Resend API Key

### 1. Clone the Repository
```bash
git clone https://github.com/mirzaumerikram/SAFORA.git
cd SAFORA
```

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your .env variables (MONGO_URI, JWT_SECRET, RESEND_API_KEY)
npm run dev
```

### 3. PWA (Passenger/Driver) Setup
```bash
cd "Progressive web app"
npm install
# Configure your .env variables
npm run web
```

### 4. Admin Dashboard Setup
```bash
cd admin-dashboard
npm install
npm run dev
```

---

## 📱 Application Flow

1. **Onboarding:** Users authenticate via SMS/Email OTP.
2. **Ride Selection:** Passengers enter drop-off locations (powered by Google Places API) and select ride types.
3. **Matching Engine:** The backend queries MongoDB for the nearest available drivers using Geospatial Indexes.
4. **Live Tracking:** Once accepted, WebSockets synchronize the driver's GPS coordinates with the passenger's map.
5. **Completion & Feedback:** Upon drop-off, accurate dynamic fares are calculated, and dual-sided ratings are submitted.

---

## 🔐 Security & Reliability
- **PWA Service Worker:** Enables aggressive caching for offline resilience (Requires cache refresh on major updates).
- **JWT Authentication:** Role-based access control (RBAC) securely separates Passenger, Driver, and Admin routes.
- **Data Integrity:** Strict Mongoose schemas and server-side validation prevent edge-case bypasses (e.g., male Pink Pass bookings).

---
*Designed & Developed for Final Year Project (FYP) Evaluation.*
