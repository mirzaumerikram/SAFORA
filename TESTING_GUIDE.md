# SAFORA Testing Guide

## Prerequisites

Before testing, ensure you have:
- ✅ Node.js (v18+) installed
- ✅ Python (v3.9+) installed
- ✅ MongoDB installed and running
- ✅ Git Bash or PowerShell terminal

---

## Step 1: Install MongoDB (if not already installed)

### Windows:
1. Download MongoDB Community Edition from https://www.mongodb.com/try/download/community
2. Run the installer (choose "Complete" installation)
3. Install as a Windows Service (recommended)

### Start MongoDB:
```bash
# Check if MongoDB is running
mongosh

# If not running, start it:
net start MongoDB
```

---

## Step 2: Backend Setup

### 2.1 Install Dependencies

```bash
cd C:\Users\mzees\OneDrive\Desktop\SAFORA\backend
npm install
```

### 2.2 Configure Environment

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development

# MongoDB (local)
MONGODB_URI=mongodb://localhost:27017/safora

# JWT Secret (change this!)
JWT_SECRET=safora_super_secret_key_change_this_in_production
JWT_EXPIRE=24h

# AI Service
AI_SERVICE_URL=http://localhost:5001

# Twilio (optional for now - can test without SMS)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps API (optional for now)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 2.3 Start Backend Server

```bash
npm run dev
```

**Expected output:**
```
SAFORA Backend running on port 5000
MongoDB Connected: localhost
```

---

## Step 3: AI Service Setup

### 3.1 Create Virtual Environment

Open a **new terminal** (keep backend running):

```bash
cd C:\Users\mzees\OneDrive\Desktop\SAFORA\ai-service

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# You should see (venv) in your terminal prompt
```

### 3.2 Install Dependencies

```bash
pip install -r requirements.txt
```

### 3.3 Configure Environment

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` file:
```env
PORT=5001
FLASK_ENV=development

# Backend API
BACKEND_URL=http://localhost:5000
```

### 3.4 Start AI Service

```bash
python app.py
```

**Expected output:**
```
 * Running on http://0.0.0.0:5001
 * Debug mode: on
```

---

## Step 4: Test the APIs

### 4.1 Test Backend Health

Open a **new terminal** and run:

```bash
curl http://localhost:5000
```

**Expected response:**
```json
{
  "message": "SAFORA Backend API - Running"
}
```

### 4.2 Test AI Service Health

```bash
curl http://localhost:5001
```

**Expected response:**
```json
{
  "message": "SAFORA AI Microservice - Running",
  "version": "1.0.0",
  "endpoints": [...]
}
```

---

## Step 5: Test User Registration

### 5.1 Register a Passenger

```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Passenger\",\"email\":\"passenger@test.com\",\"phone\":\"+923001234567\",\"password\":\"password123\",\"cnic\":\"12345-1234567-1\",\"gender\":\"female\",\"role\":\"passenger\"}"
```

**Expected response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Test Passenger",
    "email": "passenger@test.com",
    "role": "passenger"
  }
}
```

**Save the token!** You'll need it for authenticated requests.

### 5.2 Register a Driver

```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Driver\",\"email\":\"driver@test.com\",\"phone\":\"+923009876543\",\"password\":\"password123\",\"cnic\":\"54321-7654321-1\",\"gender\":\"female\",\"role\":\"driver\"}"
```

---

## Step 6: Test Authentication

### 6.1 Login

```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"passenger@test.com\",\"password\":\"password123\"}"
```

---

## Step 7: Test AI Services

### 7.1 Test Price Prediction

```bash
curl -X POST http://localhost:5001/api/pricing/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"distance\":10.5,\"duration\":25,\"time_of_day\":14,\"day_of_week\":2,\"demand_level\":\"medium\",\"origin_area\":0,\"traffic_multiplier\":1.2}"
```

**Expected response:**
```json
{
  "estimated_price": 312.5,
  "breakdown": {
    "base_fare": 50,
    "distance_cost": 262.5,
    "time_cost": 75,
    "surge_charge": 50,
    "traffic_charge": 25
  },
  "currency": "PKR"
}
```

### 7.2 Test Driver Matching

```bash
curl -X POST http://localhost:5001/api/matching/rank-drivers ^
  -H "Content-Type: application/json" ^
  -d "{\"drivers\":[{\"id\":\"driver1\",\"location\":{\"lat\":31.5204,\"lng\":74.3587},\"rating\":4.5,\"idle_time\":120,\"total_online_time\":240,\"gender\":\"female\"},{\"id\":\"driver2\",\"location\":{\"lat\":31.5497,\"lng\":74.3436},\"rating\":4.8,\"idle_time\":60,\"total_online_time\":240,\"gender\":\"female\"}],\"passenger_location\":{\"lat\":31.5497,\"lng\":74.3436},\"is_pink_pass\":true}"
```

**Expected response:**
```json
{
  "ranked_drivers": [
    {
      "driver_id": "driver2",
      "score": 0.9234,
      "distance_km": 0.5,
      "rating": 4.8,
      ...
    },
    ...
  ],
  "count": 2
}
```

---

## Step 8: Test with Postman (Recommended)

### 8.1 Install Postman
Download from https://www.postman.com/downloads/

### 8.2 Import Collection

Create a new collection called "SAFORA API" with these requests:

**1. Register User**
- Method: POST
- URL: `http://localhost:5000/api/auth/register`
- Body (JSON):
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+923001234567",
  "password": "password123",
  "cnic": "12345-1234567-1",
  "gender": "female",
  "role": "passenger"
}
```

**2. Login**
- Method: POST
- URL: `http://localhost:5000/api/auth/login`
- Body (JSON):
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**3. Predict Price**
- Method: POST
- URL: `http://localhost:5001/api/pricing/predict`
- Body (JSON):
```json
{
  "distance": 10,
  "duration": 20,
  "time_of_day": 14,
  "day_of_week": 2,
  "demand_level": "medium",
  "origin_area": 0,
  "traffic_multiplier": 1.0
}
```

---

## Step 9: Check MongoDB Data

### 9.1 Connect to MongoDB

```bash
mongosh
```

### 9.2 View Databases

```javascript
show dbs
use safora
```

### 9.3 View Collections

```javascript
show collections
```

### 9.4 View Users

```javascript
db.users.find().pretty()
```

### 9.5 Count Documents

```javascript
db.users.countDocuments()
```

---

## Troubleshooting

### Backend won't start

**Error: "MongoDB connection failed"**
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
net start MongoDB
```

**Error: "Port 5000 already in use"**
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or change PORT in .env file
```

### AI Service won't start

**Error: "No module named 'flask'"**
```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Error: "Port 5001 already in use"**
```bash
# Change PORT in .env file to 5002
```

### CORS Errors

If testing from a browser:
```javascript
// Add to backend index.js
app.use(cors({
  origin: '*', // For development only!
  credentials: true
}));
```

---

## Quick Test Script

Save this as `test_api.ps1`:

```powershell
# Test Backend
Write-Host "Testing Backend..." -ForegroundColor Green
$response = Invoke-RestMethod -Uri "http://localhost:5000" -Method Get
Write-Host $response.message

# Test AI Service
Write-Host "`nTesting AI Service..." -ForegroundColor Green
$response = Invoke-RestMethod -Uri "http://localhost:5001" -Method Get
Write-Host $response.message

# Test Registration
Write-Host "`nTesting User Registration..." -ForegroundColor Green
$body = @{
    name = "Test User"
    email = "test@example.com"
    phone = "+923001234567"
    password = "password123"
    cnic = "12345-1234567-1"
    gender = "female"
    role = "passenger"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
Write-Host "User registered: $($response.user.name)"

Write-Host "`nAll tests passed!" -ForegroundColor Green
```

Run it:
```bash
powershell -ExecutionPolicy Bypass -File test_api.ps1
```

---

## Next Steps

Once basic testing works:

1. **Test Pink Pass Enrollment** (requires video upload - use Postman)
2. **Test Ride Request Flow** (requires authenticated user)
3. **Test Safety Alerts** (requires active ride)
4. **Test Driver Location Updates** (requires driver account)

---

## Summary

**To test everything:**

1. ✅ Start MongoDB: `net start MongoDB`
2. ✅ Start Backend: `cd backend && npm run dev`
3. ✅ Start AI Service: `cd ai-service && venv\Scripts\activate && python app.py`
4. ✅ Test with curl or Postman
5. ✅ Check MongoDB for data: `mongosh`

**All working?** You're ready to build the mobile apps! 🚀
