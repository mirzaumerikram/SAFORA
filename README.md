# SAFORA — Smart Ride
**FYP26-CS-G11 | University of Central Punjab**

Safe and intelligent ride-sharing platform with Pink Pass (female-only rides), real-time SOS, GPS tracking, and AI-powered safety monitoring.

---

## Project Structure
```
SAFORA/
├── backend/          # Node.js + Express API (port 5000)
├── passenger-app/    # React Native + Expo (passenger)
├── admin-dashboard/  # React + Vite (admin panel, port 3001)
├── driver-app/       # React Native (driver)
└── ai-service/       # Flask + Python (AI pricing & safety)
```

---

## Setup Instructions

### 1. Backend
```bash
cd backend
cp .env.example .env
# Fill in .env with your values (ask team lead for credentials)
npm install
node seedUsers.js    # creates test accounts (run once)
node index.js        # starts on port 5000
```

### 2. Passenger App
```bash
cd passenger-app
npm install
npx expo start --host lan    # scan QR with Expo Go on Android
```

### 3. Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev          # opens on http://localhost:3001
```

---

## Test Accounts (after running seedUsers.js)

| Role      | Phone            | OTP   | Email                  | Password   |
|-----------|-----------------|-------|------------------------|-----------|
| Admin     | +923000000001   | 12345 | admin@safora.pk        | admin1234 |
| Passenger | +923000000002   | 12345 | passenger@safora.pk    | pass1234  |
| Driver    | +923000000003   | 12345 | driver@safora.pk       | driver1234|

---

## Environment Variables
Copy `backend/.env.example` to `backend/.env` and fill in values.
**Never commit the `.env` file.**

---

## Tech Stack
- **Backend**: Node.js 18, Express.js, MongoDB Atlas, Socket.io
- **Mobile**: React Native 0.81, Expo 54, TypeScript
- **Admin**: React 18, Vite
- **Auth**: Firebase Phone Auth, JWT
- **Payment**: Stripe (test mode)
- **Maps**: react-native-maps
- **Real-time**: Socket.io
