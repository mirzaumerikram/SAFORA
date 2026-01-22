# Quick Test Without MongoDB

## Test AI Service Only (No Database Required)

The AI service works independently and doesn't need MongoDB!

### 1. Start AI Service

```bash
cd C:\Users\mzees\OneDrive\Desktop\SAFORA\ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2. Test Price Prediction

```bash
curl -X POST http://localhost:5001/api/pricing/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"distance\":10,\"duration\":20,\"time_of_day\":14,\"day_of_week\":2,\"demand_level\":\"medium\",\"origin_area\":0,\"traffic_multiplier\":1.0}"
```

### 3. Test Driver Matching

```bash
curl -X POST http://localhost:5001/api/matching/rank-drivers ^
  -H "Content-Type: application/json" ^
  -d "{\"drivers\":[{\"id\":\"d1\",\"location\":{\"lat\":31.52,\"lng\":74.35},\"rating\":4.5,\"idle_time\":120,\"total_online_time\":240,\"gender\":\"female\"}],\"passenger_location\":{\"lat\":31.55,\"lng\":74.34},\"is_pink_pass\":false}"
```

This lets you test the AI algorithms immediately without any database setup!

---

## For Full Backend Testing

You'll need MongoDB (Option 1 or 2 above). I recommend **MongoDB Atlas** for the easiest setup.

Once you have MongoDB:
1. Update `backend/.env` with your connection string
2. Run `npm run dev` in the backend folder
3. Test the full API
