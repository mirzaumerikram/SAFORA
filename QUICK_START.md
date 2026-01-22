# SAFORA Quick Start Guide

This guide will help you get started with the SAFORA project development.

## Initial Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and add your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/safora
JWT_SECRET=your_secure_jwt_secret_here_change_this
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
AI_SERVICE_URL=http://localhost:5001
```

Start the backend server:
```bash
npm run dev
```

Backend will be running on `http://localhost:5000`

### 2. AI Service Setup

```bash
cd ai-service
python -m venv venv

# On Windows
venv\Scripts\activate

# On Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edit `ai-service/.env` and configure:
```env
PORT=5001
FLASK_ENV=development
BACKEND_URL=http://localhost:5000
```

Start the AI service:
```bash
python app.py
```

AI service will be running on `http://localhost:5001`

### 3. MongoDB Setup

Install MongoDB Community Edition from https://www.mongodb.com/try/download/community

Start MongoDB:
```bash
# Windows (if installed as service)
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

Verify MongoDB is running:
```bash
mongosh
```

### 4. Testing the Setup

Test backend API:
```bash
curl http://localhost:5000
```

Expected response:
```json
{
  "message": "SAFORA Backend API - Running"
}
```

Test AI service:
```bash
curl http://localhost:5001
```

Expected response:
```json
{
  "message": "SAFORA AI Microservice - Running",
  "version": "1.0.0",
  "endpoints": [...]
}
```

## Next Steps

### Phase 2: Backend Core Development

1. **Uncomment routes in `backend/index.js`**:
   - `/api/auth` - Authentication routes
   - `/api/users` - User management
   - `/api/rides` - Ride management
   - `/api/safety` - Safety features

2. **Test authentication**:
   ```bash
   # Register a new user
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "phone": "+923001234567",
       "password": "password123",
       "cnic": "12345-1234567-1",
       "gender": "male",
       "role": "passenger"
     }'
   ```

3. **Implement Safety Sentinel**:
   - Create `backend/routes/safety.js`
   - Implement route deviation detection
   - Set up Twilio SMS alerts

4. **Implement Pink Pass verification**:
   - Create AI service route for Pink Pass
   - Integrate with backend

### Phase 3: AI Service Development

1. **Train Pink Pass liveness detection model**:
   - Collect training data (real faces vs. photos/videos)
   - Train CNN model using TensorFlow/Keras
   - Save model to `ai-service/models/liveness_model.h5`

2. **Train price prediction model**:
   - Collect historical ride data (or synthesize)
   - Train Linear Regression model
   - Save model to `ai-service/models/price_model.pkl`

3. **Implement API routes**:
   - `/api/pink-pass/verify`
   - `/api/pricing/predict`
   - `/api/matching/rank-drivers`

### Phase 4: Mobile Apps Development

1. **Initialize React Native projects**:
   ```bash
   # Passenger App
   cd passenger-app
   npx react-native init PassengerApp .
   
   # Driver App
   cd driver-app
   npx react-native init DriverApp .
   ```

2. **Install core dependencies**:
   ```bash
   npm install @react-navigation/native
   npm install react-native-maps
   npm install socket.io-client
   npm install axios
   ```

### Phase 5: Admin Dashboard Development

1. **Initialize React app**:
   ```bash
   cd admin-dashboard
   npx create-react-app .
   ```

2. **Install dependencies**:
   ```bash
   npm install @mui/material
   npm install recharts
   npm install socket.io-client
   npm install react-leaflet
   ```

## Development Workflow

1. **Git Setup** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial project setup"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Branch Strategy**:
   - `main` - Production-ready code
   - `develop` - Development branch
   - `feature/feature-name` - Feature branches

3. **Code Review**:
   - Create pull requests for all changes
   - Have team member review before merging

4. **Testing**:
   - Write unit tests for all backend routes
   - Write unit tests for AI services
   - Perform integration testing

## Useful Commands

### Backend
```bash
npm run dev      # Start development server
npm test         # Run tests
npm start        # Start production server
```

### AI Service
```bash
python app.py    # Start development server
pytest           # Run tests (after installing pytest)
```

### Mobile Apps
```bash
npm run android  # Run on Android
npm run ios      # Run on iOS
npm test         # Run tests
```

## Troubleshooting

### MongoDB Connection Issues
- Check if MongoDB is running: `mongosh`
- Verify connection string in `.env`
- Check firewall settings

### Backend Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Python Virtual Environment Issues
```bash
# Deactivate current venv
deactivate

# Remove and recreate
rm -rf venv
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Resources

- [Node.js Documentation](https://nodejs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [TensorFlow/Keras Guide](https://www.tensorflow.org/guide/keras)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Socket.io Documentation](https://socket.io/docs/v4/)

## Support

For questions or issues:
- Check the documentation in `docs/`
- Review the Phase 1 SRS document
- Contact your supervisor: Tanveer Ahmed
