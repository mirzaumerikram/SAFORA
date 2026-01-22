# SAFORA (Smart Ride)

**Final Year Project - AI-Powered Ride-Hailing Platform with Proactive Safety**

## Team
- **Mirza Umer Ikram** (S3F22UBSCS081)
- **Ruhma Bilal** (S3F22UBSCS088)
- **Supervisor**: Tanveer Ahmed

## Project Description

SAFORA is an innovative ride-hailing platform that implements **proactive safety** through AI-powered features:

### Key Features

1. **Pink Pass** - Biometrically verified women-only mode with liveness detection
2. **Safety Sentinel** - Automated GPS monitoring for route deviations
3. **Smart Driver Selection** - AI-driven matching optimizing distance, rating, and fairness

### Technical Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express.js, Socket.io |
| AI Service | Python, Flask, TensorFlow, OpenCV, scikit-learn |
| Mobile Apps | React Native |
| Admin Dashboard | React.js |
| Database | MongoDB |
| Real-time | Socket.io |
| Maps | Google Maps API |
| SMS | Twilio |

## Project Structure

```
SAFORA/
├── backend/                # Node.js/Express backend API
│   ├── config/            # Database configuration
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   ├── middleware/        # Auth, validation middleware
│   ├── controllers/       # Route controllers
│   ├── utils/             # Helper functions
│   └── index.js           # Server entry point
│
├── ai-service/            # Python/Flask AI microservice
│   ├── services/          # AI service implementations
│   │   ├── liveness_detector.py    # Pink Pass verification
│   │   ├── pricing.py              # Price prediction (Linear Regression)
│   │   └── driver_matching.py     # Smart driver matching
│   ├── models/            # Trained ML models
│   ├── utils/             # Helper functions
│   └── app.py             # Flask app entry point
│
├── passenger-app/         # React Native passenger app
│   └── README.md          # To be implemented
│
├── driver-app/            # React Native driver app
│   └── README.md          # To be implemented
│
├── admin-dashboard/       # React.js admin dashboard
│   └── README.md          # To be implemented
│
└── docs/                  # Project documentation
    └── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- MongoDB (v6.0+)
- React Native CLI (for mobile apps)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### AI Service Setup

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python app.py
```

### Mobile Apps Setup

```bash
# Passenger App
cd passenger-app
npm install
npm run android  # or npm run ios

# Driver App
cd driver-app
npm install
npm run android  # or npm run ios
```

### Admin Dashboard Setup

```bash
cd admin-dashboard
npm install
npm start
```

## Core Features Implementation

### 1. Pink Pass (Biometric Verification)
- **Technology**: OpenCV (Haar Cascade) + TensorFlow (CNN)
- **Process**: Face detection → Liveness detection (blink verification) → Verification status
- **Location**: `ai-service/services/liveness_detector.py`

### 2. Safety Sentinel (Route Monitoring)
- **Technology**: Turf.js (point-to-line distance)
- **Triggers**: Route deviation >500m for >30 seconds
- **Alerts**: Parallel dispatch to admin dashboard (Socket.io) and emergency contacts (Twilio SMS)
- **Location**: Backend safety routes (to be implemented)

### 3. Smart Driver Matching
- **Algorithm**: Weighted sum (50% Distance + 30% Rating + 20% Fairness)
- **Fairness Metric**: IdleTime / TotalOnlineTime (last 4 hours)
- **Location**: `ai-service/services/driver_matching.py`

### 4. Price Prediction
- **Model**: Linear Regression (7 features)
- **Features**: Distance, Duration, Time of Day, Day of Week, Demand Level, Origin Area, Traffic Multiplier
- **Location**: `ai-service/services/pricing.py`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Rides
- `POST /api/rides/request` - Request a ride
- `GET /api/rides/:id` - Get ride details
- `PATCH /api/rides/:id/status` - Update ride status

### AI Service
- `POST /api/pink-pass/verify` - Verify Pink Pass (to be implemented)
- `POST /api/pricing/predict` - Predict ride price
- `POST /api/matching/rank-drivers` - Rank drivers (to be implemented)

## Development Roadmap

### ✅ Phase 0: Documentation (Completed)
- [x] Phase 1 SRS Document
- [x] Project folder structure

### 🔄 Phase 1: Project Setup & Infrastructure (Current)
- [x] Initialize project repositories
- [x] Create backend scaffold
- [x] Create AI service scaffold
- [ ] Set up MongoDB database
- [ ] Install dependencies

### 📋 Phase 2: Backend Core (Weeks 3-5)
- [ ] Express server with routing
- [ ] MongoDB connection and schemas
- [ ] Authentication system (JWT)
- [ ] User management APIs
- [ ] Ride request and matching logic
- [ ] Socket.io real-time communication

### 📋 Phase 3: AI Microservice (Weeks 6-8)
- [ ] Pink Pass face detection
- [ ] Pink Pass liveness detection
- [ ] Price prediction model training
- [ ] Driver matching algorithm
- [ ] RESTful API endpoints

### 📋 Phase 4: Mobile Apps (Weeks 9-12)
- [ ] Passenger app (React Native)
- [ ] Driver app (React Native)
- [ ] Authentication screens
- [ ] Ride booking interface
- [ ] Real-time tracking UI

### 📋 Phase 5: Admin Dashboard (Weeks 16-17)
- [ ] React.js dashboard
- [ ] Analytics and monitoring
- [ ] Heatmap visualization (K-Means)
- [ ] Safety alert system

### 📋 Phase 6: Safety Features (Weeks 13-15)
- [ ] GPS tracking system
- [ ] Safety Sentinel implementation
- [ ] Alert system (Socket.io + Twilio)
- [ ] SOS emergency features

### 📋 Phase 7: Testing & Deployment (Weeks 20-22)
- [ ] Unit tests
- [ ] Integration tests
- [ ] UAT
- [ ] Production deployment

## Documentation

Detailed documentation can be found in the `docs/` folder:

- [API Documentation](docs/API_DOCUMENTATION.md) (To be created)
- [Database Schema](docs/DATABASE_SCHEMA.md) (To be created)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) (To be created)
- [Phase 1 SRS](SAFORA_Phase1_SRS_Condensed.md)

## License

This project is part of a Final Year Project for University of Central Punjab.

## Contact

For queries, contact:
- Mirza Umer Ikram - S3F22UBSCS081
- Ruhma Bilal - S3F22UBSCS088
- Supervisor: Tanveer Ahmed
