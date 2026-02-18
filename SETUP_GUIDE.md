# SAFORA Development Setup Guide

## 📱 Your Local IP Address

**Your IP**: `192.168.247.1`

This is your **local network IP address** - it's completely **FREE** and already available on your computer!

---

## ✅ What Was Configured

I've already updated `passenger-app/src/utils/constants.ts` with your IP:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://192.168.247.1:5000/api',
  AI_SERVICE_URL: 'http://192.168.247.1:5001/api',
  TIMEOUT: 10000,
};
```

---

## 🚀 How to Run the Full Stack

### Step 1: Start Backend Server
```bash
cd backend
npm run dev
```
**Expected output**: `Server running on port 5000`

### Step 2: Start AI Service
```bash
cd ai-service
python app.py
```
**Expected output**: `Running on http://0.0.0.0:5001`

### Step 3: Run Passenger App
```bash
cd passenger-app
npm run android
```

---

## 📱 Testing on Physical Device

### Why Use Your Local IP?

When testing on a **physical Android/iOS device**:
- ❌ `localhost` won't work (it refers to the device itself)
- ✅ `192.168.247.1` works (your computer's IP on the network)

### Requirements
- Your phone and computer must be on the **same WiFi network**
- Backend must be running on your computer
- Firewall must allow connections on ports 5000 and 5001

---

## 🔧 Alternative Options

### Option 1: Android Emulator (Recommended for Testing)
If using Android Emulator, you can use:
```typescript
BASE_URL: 'http://10.0.2.2:5000/api'  // Special IP for emulator
```

### Option 2: Keep localhost (For Web Testing Only)
If you're only testing the backend via browser/Postman:
```typescript
BASE_URL: 'http://localhost:5000/api'
```

### Option 3: Cloud Deployment (Later, for Production)
For production, you'd deploy to:
- **Heroku** (Free tier available)
- **Railway** (Free tier available)
- **Render** (Free tier available)
- **AWS/Azure** (Paid, but more powerful)

---

## 🆓 Cost Breakdown

| Item | Cost |
|------|------|
| Local IP Address | **FREE** ✅ |
| Development Setup | **FREE** ✅ |
| Testing on WiFi | **FREE** ✅ |
| Android Emulator | **FREE** ✅ |
| Cloud Deployment (Optional) | **FREE** (with free tiers) ✅ |

**Total Cost: $0** 🎉

---

## 🔍 How to Find Your IP Again (If Needed)

### Windows (PowerShell):
```powershell
ipconfig | findstr IPv4
```

### Windows (Quick):
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}
```

Look for an IP like: `192.168.x.x` or `10.x.x.x`

---

## ⚠️ Troubleshooting

### Issue 1: "Network Error" in App
**Solution**: 
- Ensure backend is running (`npm run dev` in backend folder)
- Check if phone and computer are on same WiFi
- Try disabling Windows Firewall temporarily

### Issue 2: "Connection Refused"
**Solution**:
- Backend must listen on `0.0.0.0` (not just `localhost`)
- Check `backend/index.js` has: `app.listen(5000, '0.0.0.0')`

### Issue 3: IP Changed
**Solution**:
- Your IP might change if you reconnect to WiFi
- Re-run the IP detection command
- Update `constants.ts` with new IP

---

## 🎯 Next Steps

1. ✅ **IP Configured** (192.168.247.1)
2. ⏭️ **Start Backend** (`cd backend && npm run dev`)
3. ⏭️ **Start AI Service** (`cd ai-service && python app.py`)
4. ⏭️ **Run Passenger App** (`cd passenger-app && npm run android`)

---

## 📞 Need Help?

If you encounter any issues:
1. Check if backend is running (visit `http://192.168.247.1:5000` in browser)
2. Check if AI service is running (visit `http://192.168.247.1:5001` in browser)
3. Ensure phone and computer are on same WiFi network
4. Check Windows Firewall settings

---

**You're all set! No need to buy anything - everything is FREE!** 🎉
