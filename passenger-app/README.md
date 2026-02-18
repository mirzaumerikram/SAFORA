# SAFORA Passenger App

React Native mobile application for SAFORA passengers - Safe and Affordable Ride-Sharing for All.

## 🎨 Design System

### Color Scheme
- **Primary**: `#6C63FF` (Purple - Trust & Safety)
- **Secondary**: `#FF6584` (Pink - Pink Pass feature)
- **Success**: `#4CAF50` (Green)
- **Warning**: `#FF9800` (Orange)
- **Background**: `#F5F7FA` (Light gray)

### Features
- Modern gradient buttons
- Clean input fields with icons
- Card-based layouts with shadows
- Smooth animations
- Professional UI/UX

---

## 📁 Project Structure

```
passenger-app/
├── src/
│   ├── screens/
│   │   └── auth/
│   │       ├── LoginScreen.tsx          ✅ Complete
│   │       └── RegisterScreen.tsx       ✅ Complete
│   │
│   ├── components/
│   │   └── common/
│   │       ├── Button.tsx               ✅ Complete
│   │       └── Input.tsx                ✅ Complete
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx             ✅ Complete
│   │   └── AuthNavigator.tsx            ✅ Complete
│   │
│   ├── services/
│   │   ├── api.ts                       ✅ Complete
│   │   └── auth.service.ts              ✅ Complete
│   │
│   └── utils/
│       ├── theme.ts                     ✅ Complete
│       └── constants.ts                 ✅ Complete
│
├── App.tsx                              ✅ Complete
└── package.json                         ✅ Complete
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd passenger-app
npm install
```

### 2. Configure Backend URL

Edit `src/utils/constants.ts`:
```typescript
export const API_CONFIG = {
  BASE_URL: 'http://YOUR_IP:5000/api',  // Change to your backend IP
  AI_SERVICE_URL: 'http://YOUR_IP:5001/api',
  TIMEOUT: 10000,
};
```

### 3. Run the App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
cd ios && pod install && cd ..
npm run ios
```

---

## ✅ Completed Features

### Authentication
- ✅ Login Screen with email/password
- ✅ Register Screen with full validation
- ✅ Password show/hide toggle
- ✅ Form validation (email, phone, password)
- ✅ Terms & Conditions checkbox
- ✅ JWT token management
- ✅ AsyncStorage integration

### Components
- ✅ Gradient Button component (primary, secondary, outline variants)
- ✅ Input component with icons and error states
- ✅ Loading states
- ✅ Navigation setup

### Services
- ✅ API service with axios interceptors
- ✅ Auth service (login, register, logout)
- ✅ Token auto-injection
- ✅ Error handling

---

## 📋 Next Steps

### Phase 4 Remaining
- [ ] Home Screen with map
- [ ] Ride Booking interface
- [ ] Real-time GPS tracking
- [ ] Pink Pass enrollment flow
- [ ] Profile screen
- [ ] Ride history

### Phase 5
- [ ] Socket.io integration for real-time updates
- [ ] Push notifications
- [ ] SOS emergency button
- [ ] Chat with driver

---

## 🔧 Tech Stack

- **React Native** 0.73.0
- **React Navigation** 6.x
- **Axios** for API calls
- **AsyncStorage** for local storage
- **React Native Vector Icons** for icons
- **React Native Linear Gradient** for gradients
- **TypeScript** for type safety

---

## 📱 Screenshots

*Coming soon after running the app*

---

## 🎯 API Integration

### Backend Endpoints Used
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Authentication Flow
1. User enters credentials
2. API call to backend
3. JWT token stored in AsyncStorage
4. Token auto-injected in subsequent requests
5. Auto-redirect on token expiry

---

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### Android Build Issues
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### iOS Build Issues
```bash
cd ios && pod install && cd ..
npm run ios
```

---

## 👥 Team

- **Mirza Umer Ikram** - Lead Developer
- **Ruhma Bilal** - Documentation & QA

---

## 📄 License

SAFORA © 2026 - Final Year Project
