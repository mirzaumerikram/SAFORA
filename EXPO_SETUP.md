# SAFORA Passenger App - Expo Setup Guide

## ✅ Why Expo is Perfect for You

- **Only 500 MB** needed (vs 10-15 GB for Android Studio)
- **No Android Studio** required
- **Test on your phone** directly with Expo Go app
- **Fast setup** (15 minutes)

---

## 🚀 Quick Setup Steps

### Step 1: Install Expo Go on Your Phone

**Android**: https://play.google.com/store/apps/details?id=host.exp.exponent  
**iOS**: https://apps.apple.com/app/expo-go/id982107779

### Step 2: Install Expo CLI (I'll do this for you)

```bash
npm install -g expo-cli
```

### Step 3: Start the App

```bash
cd passenger-app
npx expo start
```

### Step 4: Scan QR Code

- Open Expo Go app on your phone
- Scan the QR code shown in terminal
- App will load on your phone!

---

## 📱 How It Works

1. Your phone and PC must be on **same WiFi**
2. Expo bundles the app and sends it to your phone
3. You can test Login/Register screens immediately
4. Changes auto-reload on your phone

---

## ⚠️ Important Notes

- Backend URL is already configured: `http://192.168.247.1:5000`
- Make sure backend is running: `npm run dev` in backend folder
- Make sure AI service is running: `python app.py` in ai-service folder

---

## 🎯 What You Can Test

✅ Login screen  
✅ Register screen  
✅ Form validation  
✅ API calls to backend  
✅ Error handling  
✅ Loading states  

---

**Ready to start? I'll set up Expo for you now!**
