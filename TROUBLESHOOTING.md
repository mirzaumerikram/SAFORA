# Backend Troubleshooting

## The backend terminal has been running for 4+ minutes but not responding

### Check the Terminal Output

Look at the terminal where you ran `npm run dev`. You should see one of these:

**✅ SUCCESS - Server is running:**
```
Twilio credentials not configured - SMS alerts disabled
SAFORA Backend running on port 5000
MongoDB Connected: localhost
```

**❌ ERROR - Server crashed:**
```
[nodemon] app crashed - waiting for file changes before starting...
```

**⏳ STUCK - Waiting for something:**
```
(no output, just cursor blinking)
```

---

## If You See "app crashed"

The server crashed and nodemon is waiting. You need to:

1. **Press `Ctrl+C`** to stop nodemon
2. **Check what the error is** (scroll up in the terminal)
3. **Restart:** `npm run dev`

---

## If You See Nothing (Stuck)

MongoDB might not be connected. Let's check:

### 1. Check if MongoDB is Running

```powershell
# Check MongoDB service
Get-Service MongoDB*

# Or check if mongod process is running
Get-Process mongod -ErrorAction SilentlyContinue
```

### 2. Test MongoDB Connection

```powershell
mongosh
```

If this fails, MongoDB isn't running. Start it:

```powershell
# Option 1: Start as service
net start MongoDB

# Option 2: Start manually
mkdir C:\data\db -Force
mongod --dbpath C:\data\db
```

---

## Quick Fix: Restart Backend

In the backend terminal:

1. **Press `Ctrl+C`** to stop
2. **Run again:**
   ```powershell
   npm run dev
   ```

---

## Alternative: Check the Terminal Yourself

**Can you copy/paste the FULL output from the terminal where `npm run dev` is running?**

That will tell me exactly what's wrong!

---

## Meanwhile: Test AI Service

The AI service doesn't need MongoDB. Once `pip install` finishes:

```powershell
cd C:\Users\mzees\OneDrive\Desktop\SAFORA\ai-service
python app.py
```

Then test:
```powershell
Invoke-RestMethod -Uri "http://localhost:5001" -Method Get
```
