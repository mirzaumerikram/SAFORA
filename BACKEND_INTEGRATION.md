# Backend Integration Guide - Google Maps Coordinates

## Overview
This guide explains how the backend should handle and validate Google Maps coordinates from the frontend.

## Backend Changes Made to Frontend

The frontend now sends **accurate coordinates** from Google Maps instead of hardcoded values.

### Previous Data Format (Hardcoded):
```json
{
  "pickupLocation": {
    "address": "Gulberg II",
    "lat": 31.5204,
    "lng": 74.3587
  },
  "dropoffLocation": {
    "address": "DHA Phase 5",
    "lat": 31.4504,
    "lng": 74.2667
  }
}
```

### New Data Format (Google Maps - Accurate):
```json
{
  "pickupLocation": {
    "address": "24 Street, Block D, Gulberg II, Lahore, Pakistan",
    "lat": 31.52047,
    "lng": 74.35873
  },
  "dropoffLocation": {
    "address": "DHA Phase 5, Lahore, Pakistan",
    "lat": 31.45042,
    "lng": 74.26667
  },
  "type": "standard"
}
```

## Backend API Update Required

### Current Endpoint: `POST /api/rides/book` or `POST /api/rides/request`

**Status**: ✅ Already compatible with coordinate format
**Location**: `backend/routes/rides.js`

The backend is already configured to:
1. Accept location coordinates with addresses
2. Calculate real distances using Haversine formula
3. Estimate duration based on distance
4. Call AI service for price prediction

### Backend Processing

Current implementation:
```javascript
// From backend/routes/rides.js (lines 1-50)
const distance = calculateHaversineDistance(
  pickupLocation.lat, pickupLocation.lng,
  dropoffLocation.lat, dropoffLocation.lng
);

const estimatedDuration = Math.max(5, Math.round(distance * 3)); // ~3 min/km

const estimatedPrice = await getPricePrediction({
  distance,
  duration: estimatedDuration,
  ...
});
```

## Validation Checklist

### ✅ What's Already Implemented:

1. **Distance Calculation**:
   - Uses Haversine formula ✓
   - Accurate for Pakistan coordinates ✓

2. **Duration Estimation**:
   - 3 minutes per km average ✓
   - Minimum 5 minutes ✓

3. **Pricing**:
   - Base formula: `(distance * 35) + (duration * 5) + 50` ✓
   - AI service integration available ✓

4. **Database Storage**:
   - MongoDB GeoJSON format: `[lng, lat]` ✓
   - Indexed for geospatial queries ✓

5. **Driver Matching**:
   - Uses geospatial $near queries ✓
   - 10km search radius ✓

### ⏳ Optional Enhancements:

1. **Reverse Geocoding** (Get address from coordinates):
   ```bash
   # Call Google Geocoding API to verify/enhance address
   GET https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={apiKey}
   ```

2. **Route Validation** (Check route feasibility):
   - Use Google Directions API
   - Calculate actual route distance vs straight line
   - Estimate more accurate ETA

3. **Area Clustering** (Optimize driver distribution):
   - Group rides by geographic areas
   - Improve driver matching efficiency

## Frontend Data Flow to Backend

```
BookingLocationScreen
    ↓ (user enters locations)
GooglePlacesInput
    ↓ (autocomplete + place details)
Get Coordinates
    ↓ (lat, lng, address)
RideSelectionScreen
    ↓ (user selects ride type)
API Call: /api/rides/book
    ↓ (sends coordinates)
Backend Receives
    ↓ (validates & processes)
Driver Matching
    ↓ (finds nearest drivers)
Ride Created
    ↓ (stores in database)
SearchingScreen
    ↓ (driver found)
TrackingScreen
    ↓ (real-time tracking)
```

## Backend API Schema

### Request Body Structure:

```typescript
{
  pickupLocation: {
    address: string,        // Full formatted address from Google
    lat: number,           // Latitude (-90 to 90)
    lng: number            // Longitude (-180 to 180)
  },
  dropoffLocation: {
    address: string,
    lat: number,
    lng: number
  },
  type: string            // 'eco' | 'standard' | 'pink-pass'
}
```

### Response Structure:

```typescript
{
  success: boolean,
  ride: {
    _id: string,
    passenger: string,
    pickupLocation: {
      address: string,
      coordinates: [number, number]  // [lng, lat] for GeoJSON
    },
    dropoffLocation: {
      address: string,
      coordinates: [number, number]
    },
    distance: number,              // km
    estimatedDuration: number,     // minutes
    estimatedPrice: number,        // PKR
    type: string,
    status: 'requested' | 'accepted' | 'started' | 'completed',
    driver?: string,
    createdAt: string
  },
  distance: string,       // "8.2 km"
  estimatedFare: number   // 450 (PKR)
}
```

## Database Model Update

### Current Ride Model (Already Compatible):

```javascript
// From backend/models/Ride.js
pickupLocation: {
  address: String,
  coordinates: {
    type: [Number],      // [longitude, latitude]
    required: true,
    index: '2dsphere'    // Geospatial index
  }
},
dropoffLocation: {
  address: String,
  coordinates: {
    type: [Number],
    required: true
  }
}
```

**Status**: ✅ No changes needed - already supports Google Maps format

## Testing Backend Coordinates

### Test Request:
```bash
curl -X POST http://localhost:5000/api/rides/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pickupLocation": {
      "address": "Block D, Gulberg II, Lahore",
      "lat": 31.52047,
      "lng": 74.35873
    },
    "dropoffLocation": {
      "address": "DHA Phase 5, Lahore",
      "lat": 31.45042,
      "lng": 74.26667
    },
    "type": "standard"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "ride": {
    "_id": "ride_123",
    "distance": 8.23,
    "estimatedDuration": 25,
    "estimatedPrice": 450,
    "status": "requested"
  }
}
```

## Coordinate Validation

### Add this validation to backend (optional enhancement):

```javascript
// Validate coordinate ranges
const validateCoordinates = (lat, lng) => {
  const isLatValid = lat >= -90 && lat <= 90;
  const isLngValid = lng >= -180 && lng <= 180;
  
  // Optional: Check if within Pakistan bounds
  const inPakistan = lat >= 23.5 && lat <= 37.5 && 
                     lng >= 60 && lng <= 77.5;
  
  return { isLatValid, isLngValid, inPakistan };
};
```

## Performance Optimization

### 1. Database Indexes (Already Present):
```javascript
// Geospatial index for fast location queries
db.rides.createIndex({ "pickupLocation.coordinates": "2dsphere" });
db.rides.createIndex({ "dropoffLocation.coordinates": "2dsphere" });
```

### 2. Caching Strategy (Optional):
```javascript
// Cache frequent routes
const routeCache = new Map();
const cacheKey = `${pickup.lat},${pickup.lng}→${dropoff.lat},${dropoff.lng}`;

if (routeCache.has(cacheKey)) {
  return routeCache.get(cacheKey);
}
```

### 3. Batch Processing (For analytics):
```javascript
// Aggregate coordinate data for heatmaps
db.rides.aggregate([
  {
    $group: {
      _id: null,
      avgPickupLat: { $avg: "$pickupLocation.coordinates.0" },
      avgPickupLng: { $avg: "$pickupLocation.coordinates.1" }
    }
  }
]);
```

## Error Handling

### Common Errors & Solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid coordinates | User enters bad location | Validate with Google Places before sending |
| Distance calculation fails | Bad lat/lng format | Ensure numbers, not strings |
| No drivers found | Coordinates outside service area | Expand search radius or inform user |
| Geospatial query slow | Missing index | Create 2dsphere index on coordinates |

## Migration from Old Data

If you have old rides with hardcoded coordinates:

```javascript
// Migration script
db.rides.updateMany(
  { "pickupLocation.lat": 31.5204 },
  { $set: { "pickupLocation.address": "Gulberg II, Lahore" } }
);
```

## Next Steps

1. ✅ Frontend sends accurate coordinates
2. ✅ Backend already handles coordinates
3. ⏳ Test with actual location data
4. ⏳ Monitor distance/pricing accuracy
5. ⏳ Add reverse geocoding for address enhancement
6. ⏳ Implement route optimization

## Support

- **Frontend**: See `GOOGLE_MAPS_SETUP.md`
- **Google Maps API**: https://developers.google.com/maps
- **Backend Issues**: Check `backend/routes/rides.js` error handling
