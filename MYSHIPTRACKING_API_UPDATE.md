# MyShipTracking API Integration Update

## Summary

Updated the MyShipTracking API service to align with the official API documentation. The service now includes all required endpoints for vessel tracking, port operations, and AIS data integration.

## Changes Made

### ✅ Updated API Endpoints

1. **Vessel Current Position API**
   - Endpoint: `/vessels` (with `mmsi` or `imo` parameter)
   - Function: `getVesselCurrentPosition(identifier, identifierType, apiKey, secretKey)`
   - Documentation: https://api.myshiptracking.com/docs/vessel-current-position-api

2. **Vessels in Zone API** (NEW)
   - Endpoint: `/vessels/in-zone`
   - Function: `getVesselsInZone(zone, apiKey, secretKey, options)`
   - Supports polygon or circle zones
   - Documentation: https://api.myshiptracking.com/docs/vessels-in-zone

3. **Vessels Nearby API** (NEW)
   - Endpoint: `/vessels/nearby`
   - Function: `getVesselsNearby(latitude, longitude, radius, apiKey, secretKey, options)`
   - Finds vessels within a radius of a specific location
   - Documentation: https://api.myshiptracking.com/docs/vessels-nearby

4. **Port Details API** (NEW)
   - Endpoint: `/port/details`
   - Function: `getPortDetails(portIdentifier, apiKey, secretKey)`
   - Used for Ops. Sites (ports, terminals, berths)
   - Accepts port_id (numeric) or unloco (text)
   - Documentation: https://api.myshiptracking.com/docs/port-details

5. **Port Search API** (NEW)
   - Endpoint: `/port/search`
   - Function: `searchPorts(query, apiKey, secretKey, options)`
   - Search ports by name, city, country, etc.
   - Documentation: https://api.myshiptracking.com/docs/port-search

6. **In-Port API** (NEW)
   - Endpoint: `/port/in-port`
   - Function: `getVesselsInPort(portIdentifier, apiKey, secretKey, options)`
   - Get vessels currently in a specific port
   - Used for dashboard when zooming into port area
   - Documentation: https://api.myshiptracking.com/docs/in-port-api

7. **Port Estimate Arrivals API** (NEW)
   - Endpoint: `/port/estimate-arrivals`
   - Function: `getPortEstimateArrivals(portIdentifier, apiKey, secretKey, options)`
   - Get estimated vessel arrivals at a port
   - Documentation: https://api.myshiptracking.com/docs/port-estimate-arrivals

8. **Port Calls API** (UPDATED)
   - Endpoint: `/port/calls`
   - Function: `getPortCalls(filters, apiKey, secretKey)`
   - Unified function supporting all filter options:
     - `mmsi` - Vessel MMSI
     - `port_id` or `unloco` - Port identifier
     - `fromdate`, `todate` - Date range (ISO 8601 UTC)
     - `days` - Number of days to look back
     - `type` - Event type (0=all, 1=arrivals, 2=departures)
     - `limit` - Maximum results
   - Helper functions maintained for backward compatibility:
     - `getPortCallsByPort()`
     - `getPortCallsByArea()`
     - `getPortCallsByVessel()`
   - Documentation: https://api.myshiptracking.com/docs/port-calls

## API Structure

All endpoints follow the same authentication pattern:
- API key passed as `apikey` query parameter
- Secret key passed as `secret` query parameter (optional)
- Additional parameters added to query string

## Backward Compatibility

- Legacy functions maintained for existing code:
  - `getVesselPosition()` - Still works, now uses `getVesselCurrentPosition()` internally
  - `getPortCallsByPort()`, `getPortCallsByArea()`, `getPortCallsByVessel()` - All maintained

## Next Steps for Integration

### 1. Dashboard - In-Port Vessels
Update dashboard to use `getVesselsInPort()` when user zooms into a port area:
```javascript
const vesselsInPort = await myshiptracking.getVesselsInPort(
  portId, // or unloco
  apiKey,
  secretKey,
  { limit: 100 }
);
```

### 2. Ops Sites - Port Details
Update Ops Sites to fetch port details:
```javascript
const portDetails = await myshiptracking.getPortDetails(
  site.portId || site.unloco,
  apiKey,
  secretKey
);
```

### 3. Fleet Map - Vessels Nearby
Use `getVesselsNearby()` for map view:
```javascript
const nearbyVessels = await myshiptracking.getVesselsNearby(
  centerLat,
  centerLon,
  radiusInNauticalMiles,
  apiKey,
  secretKey,
  { limit: 200 }
);
```

### 4. Port Search
Add port search functionality:
```javascript
const ports = await myshiptracking.searchPorts(
  searchQuery,
  apiKey,
  secretKey,
  { limit: 50, country: 'BR' }
);
```

### 5. Estimated Arrivals
Show estimated arrivals for ports:
```javascript
const arrivals = await myshiptracking.getPortEstimateArrivals(
  portId,
  apiKey,
  secretKey,
  { hours: 24, limit: 50 }
);
```

## Testing Checklist

- [ ] Test vessel current position with IMO
- [ ] Test vessel current position with MMSI
- [ ] Test vessels in zone (polygon)
- [ ] Test vessels in zone (circle)
- [ ] Test vessels nearby endpoint
- [ ] Test port details with port_id
- [ ] Test port details with unloco
- [ ] Test port search
- [ ] Test in-port API
- [ ] Test port estimate arrivals
- [ ] Test port calls with various filters
- [ ] Verify backward compatibility with existing code

## Notes

- All endpoints handle errors gracefully and fall back to mock data if API fails
- API responses are logged for debugging
- Sensitive data (API keys) are masked in logs
- Empty/null parameters are filtered out before sending requests

