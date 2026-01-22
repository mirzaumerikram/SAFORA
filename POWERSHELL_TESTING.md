# PowerShell Testing Commands for SAFORA

## Use These Commands in PowerShell

PowerShell's `curl` is actually `Invoke-WebRequest`. Use these commands instead:

### Test Backend Health

```powershell
Invoke-RestMethod -Uri "http://localhost:5000" -Method Get
```

### Register a User

```powershell
$body = @{
    name = "Test User"
    email = "test@example.com"
    phone = "+923001234567"
    password = "password123"
    cnic = "12345-1234567-1"
    gender = "female"
    role = "passenger"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
```

### Login

```powershell
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.token
Write-Host "Token: $token"
```

### Test Price Prediction (AI Service)

```powershell
$priceBody = @{
    distance = 10
    duration = 20
    time_of_day = 14
    day_of_week = 2
    demand_level = "medium"
    origin_area = 0
    traffic_multiplier = 1.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/pricing/predict" -Method Post -Body $priceBody -ContentType "application/json"
```

### Test Driver Matching

```powershell
$matchingBody = @{
    drivers = @(
        @{
            id = "driver1"
            location = @{ lat = 31.5204; lng = 74.3587 }
            rating = 4.5
            idle_time = 120
            total_online_time = 240
            gender = "female"
        }
    )
    passenger_location = @{ lat = 31.5497; lng = 74.3436 }
    is_pink_pass = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5001/api/matching/rank-drivers" -Method Post -Body $matchingBody -ContentType "application/json"
```

---

## Alternative: Use Git Bash or WSL

If you have Git Bash installed, the original curl commands will work:

```bash
curl http://localhost:5000

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+923001234567","password":"password123","cnic":"12345-1234567-1","gender":"female","role":"passenger"}'
```

---

## Wait for npm install to complete!

Your `npm install` is still running. Wait for it to finish, then:

```powershell
cd C:\Users\mzees\OneDrive\Desktop\SAFORA\backend
npm run dev
```

Then test with the PowerShell commands above! ✅
