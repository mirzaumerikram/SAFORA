# MongoDB Post-Installation Setup

## After MongoDB Installation Completes

### Step 1: Verify Installation

Open a **new** PowerShell terminal and run:

```powershell
mongod --version
```

You should see version information like:
```
db version v7.0.x
```

---

### Step 2: Start MongoDB

MongoDB should be running as a Windows service. Verify with:

```powershell
# Check service status
Get-Service MongoDB

# If not running, start it:
net start MongoDB
```

**Alternative**: If not installed as service, start manually:
```powershell
# Create data directory
mkdir C:\data\db

# Start MongoDB
mongod --dbpath C:\data\db
```

---

### Step 3: Test MongoDB Connection

```powershell
# Connect to MongoDB shell
mongosh
```

You should see:
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017
Using MongoDB: 7.0.x
```

Type `exit` to quit mongosh.

---

### Step 4: Configure Backend

Your backend `.env` is already configured for local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/safora
```

No changes needed! ✅

---

### Step 5: Start Backend

```powershell
cd C:\Users\mzees\OneDrive\Desktop\SAFORA\backend
npm install
npm run dev
```

**Expected output:**
```
SAFORA Backend running on port 5000
MongoDB Connected: localhost
```

---

### Step 6: Start AI Service (New Terminal)

```powershell
cd C:\Users\mzees\OneDrive\Desktop\SAFORA\ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

---

### Step 7: Test Everything!

```powershell
# Test backend
curl http://localhost:5000

# Register a user
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"phone\":\"+923001234567\",\"password\":\"password123\",\"cnic\":\"12345-1234567-1\",\"gender\":\"female\",\"role\":\"passenger\"}"

# Test AI service
curl -X POST http://localhost:5001/api/pricing/predict -H "Content-Type: application/json" -d "{\"distance\":10,\"duration\":20,\"time_of_day\":14,\"day_of_week\":2,\"demand_level\":\"medium\",\"origin_area\":0,\"traffic_multiplier\":1.0}"
```

---

## Troubleshooting

**"MongoDB service not found"**
- MongoDB might not be installed as a service
- Start manually: `mongod --dbpath C:\data\db`

**"Port 27017 already in use"**
- MongoDB is already running ✅
- Just proceed to Step 4

**"Connection refused"**
- Check if MongoDB is running: `Get-Service MongoDB`
- Or check Task Manager for `mongod.exe`

---

## Quick Commands Reference

```powershell
# Start MongoDB service
net start MongoDB

# Stop MongoDB service
net stop MongoDB

# Check if running
Get-Service MongoDB

# Connect to database
mongosh

# View databases (in mongosh)
show dbs

# Use SAFORA database
use safora

# View collections
show collections

# View users
db.users.find()
```

---

Let me know once MongoDB installation completes and I'll help you test everything! 🚀
