# AIS Coordinate Plotting Fix - Analysis & Solution

## Problem Statement
Vessel positions on the dashboard map are NOT plotted in the correct geographic location, while the same AIS position is plotted correctly on other AIS systems (e.g., myshiptracking.com).

## Root Cause Analysis

### 1. Coordinate Flow Path
```
MyShipTracking API → Backend Transform → Frontend Normalize → Leaflet Marker
```

### 2. Potential Issues Identified

#### Issue A: MyShipTracking API Response Format
The API might return coordinates in various formats:
- `{ latitude: -22.8988, longitude: -43.1225 }`
- `{ lat: -22.8988, lon: -43.1225 }`
- `{ position: { lat: -22.8988, lon: -43.1225 } }`

#### Issue B: Backend Transformation
Backend code in `routes/dashboard.js` and `routes/vessels.js`:
```javascript
lat: position.latitude || position.lat,
lon: position.longitude || position.lon,
```
This should handle both formats, but might miss nested structures.

#### Issue C: Frontend Normalization
The `normalizeVesselPosition` function has coordinate swapping logic that might incorrectly swap valid coordinates.

#### Issue D: Leaflet Marker Order
Leaflet requires `[latitude, longitude]` format. Code currently uses:
```javascript
L.marker([normalizedPos.lat, normalizedPos.lon], { icon })
```
This is correct IF coordinates are not swapped.

## Solution

### Step 1: Add Comprehensive Logging
Add detailed logging at each transformation step to capture:
- Raw API response
- Backend transformation result
- Frontend normalization result
- Final Leaflet marker coordinates

### Step 2: Fix Coordinate Normalization
Improve the normalization function to:
- Handle all possible API response formats
- Only swap coordinates if absolutely necessary (when lat > 90 or < -90)
- Preserve original coordinate signs (negative for South/West)
- Validate coordinate ranges strictly

### Step 3: Ensure Correct Leaflet Usage
Verify that Leaflet markers use `[lat, lon]` format consistently.

### Step 4: Test with Known Coordinates
Test with ASGAARD SOPHIA coordinates:
- Expected: Lat: -22.8988, Lon: -43.1225
- Should appear in Guanabara Bay, Rio de Janeiro

