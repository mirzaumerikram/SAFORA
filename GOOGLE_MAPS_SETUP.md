# Google Maps Integration Guide for SAFORA

## Overview
This guide explains how to set up Google Maps API for real-time location selection in the SAFORA ride-sharing app.

## What's Been Updated

### New Components
1. **GooglePlacesInput.tsx** - Autocomplete location search component using Google Places API
2. **BookingLocationScreen.tsx** - Location selection screen with map preview

### Updated Files
1. **HomeScreen.tsx** - Updated to navigate to BookingLocationScreen
2. **RideSelectionScreen.tsx** - Updated to receive and use real coordinates from booking flow
3. **SaforaMap.tsx** - Updated to display location markers on the map
4. **TrackingScreen.tsx** - Updated to use coordinates passed through navigation
5. **MainNavigator.tsx** - Added BookingLocationScreen to navigation stack

## Setup Instructions

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Maps SDK for Android (for native apps)
   - Maps SDK for iOS (for native apps)

4. Go to **Credentials** → **Create API Key**
5. Restrict your API key to:
   - **Application restrictions**: HTTP referrers (for web) and Android/iOS apps (for mobile)
   - **API restrictions**: Select only the APIs mentioned above

### Step 2: Configure Environment Variables

#### For Web/Expo App:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Google Maps API key:
   ```env
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

   **Important**: The prefix `EXPO_PUBLIC_` is required for Expo to expose the variable to the client-side code.

#### For Backend:

1. Add to your backend `.env`:
   ```env
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

### Step 3: Test the Integration

1. Start the app:
   ```bash
   npm start
   # or for web only:
   npm run web
   ```

2. Navigate to Home → Click "Where to?" search bar
3. You should see:
   - BookingLocationScreen loads
   - Autocomplete input fields appear
   - When you type a location, Google Places suggestions appear
   - Select a location and it shows the coordinates
   - Markers appear on the map

### Step 4: Update Native Configurations (Optional)

#### For Android:
- Add the API key to `app.json`:
  ```json
  {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "your_api_key_here"
        }
      }
    }
  }
  ```

#### For iOS:
- Add the API key to `app.json`:
  ```json
  {
    "ios": {
      "config": {
        "googleMaps": {
          "apiKey": "your_api_key_here"
        }
      }
    }
  }
  ```

## How It Works

### User Flow:
1. **Home Screen** → User taps "Where to?"
2. **Booking Location Screen** → User enters:
   - Pickup location (with autocomplete)
   - Destination (with autocomplete)
3. **Location Selection** → Google Places API provides suggestions
4. **Map Display** → Pickup and dropoff markers show on map
5. **Coordinates Captured** → Lat/Long coordinates stored
6. **Ride Selection** → User selects ride type with real coordinates
7. **Booking** → API receives accurate location data

### API Integration:

#### GooglePlacesInput Component:
- Uses **Places Autocomplete API** for suggestions
- Uses **Place Details API** to get coordinates
- Returns: `{ address, lat, lng }`

#### Booking Coordinates Flow:
```
User Input → Google Places Autocomplete
    ↓
Selected Location → Place Details API
    ↓
Get Coordinates + Address
    ↓
Pass to RideSelectionScreen
    ↓
Send to Backend API
```

#### Backend Receives:
```json
{
  "pickupLocation": {
    "address": "24 Street, Lahore, Pakistan",
    "lat": 31.5204,
    "lng": 74.3587
  },
  "dropoffLocation": {
    "address": "DHA Phase 5, Lahore, Pakistan",
    "lat": 31.4504,
    "lng": 74.2667
  },
  "type": "standard"
}
```

## API Pricing

Google Maps APIs are billed on a pay-as-you-go basis:

- **Places Autocomplete**: ~$0.00583 per request (1000 queries = $5.83)
- **Place Details**: ~$0.0175 per request
- **Maps JavaScript API**: ~$7 per 1000 loads
- **Geocoding**: ~$0.005 per request

**Estimated Monthly Cost** (for 10,000 users making 2 rides/day):
- Places Autocomplete: ~$116/month
- Place Details: ~$350/month
- Maps Display: ~$700/month
- **Total**: ~$1,166/month

## Troubleshooting

### Issue: "Google Maps API key not configured"
**Solution**: Ensure `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`

### Issue: No autocomplete suggestions appearing
**Solution**: 
1. Verify API key is valid and has Places API enabled
2. Check that your query is 3+ characters
3. Verify API restrictions allow your domain

### Issue: Map not showing markers
**Solution**:
- On web: Ensure GooglePlacesInput successfully fetched coordinates
- On mobile: Verify `react-native-maps` and Google Play Services are properly installed

### Issue: "Daily API limit exceeded"
**Solution**: 
1. Set request throttling in your app
2. Implement caching for frequent locations
3. Upgrade billing quota in Google Cloud Console

## Security Best Practices

1. **Restrict API Key**:
   - HTTP referrers: Add your domain(s) only
   - Android: Add your app's package name and signing certificate
   - iOS: Add your bundle ID

2. **Never Commit API Key**:
   - Use `.env.local` (added to `.gitignore`)
   - Never push keys to GitHub

3. **Monitor Usage**:
   - Set up billing alerts in Google Cloud Console
   - Monitor API quota in Quotas page

4. **Implement Caching**:
   - Cache recent locations client-side
   - Reduce API calls for repeat locations

## Advanced Features to Consider

1. **Route Optimization**:
   - Use Directions API to calculate routes
   - Show ETA to user before booking

2. **Fare Prediction**:
   - Use distance from Directions API
   - Provide accurate price estimates

3. **Driver Navigation**:
   - Integrate real-time navigation
   - Show live route updates to passengers

4. **Saved Locations**:
   - Store frequent locations (Home, Work)
   - Quick-select saved places

## Support

For issues or questions:
1. Check [Google Maps Documentation](https://developers.google.com/maps)
2. Review [Places API Guide](https://developers.google.com/maps/documentation/places)
3. Check app logs for API error messages

## Next Steps

1. ✅ Google Places API integration complete
2. ⏳ Test autocomplete with actual locations
3. ⏳ Validate coordinates in backend
4. ⏳ Add route optimization for driver navigation
5. ⏳ Implement saved locations feature
