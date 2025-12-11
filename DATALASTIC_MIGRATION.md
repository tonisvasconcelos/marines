# Datalastic AIS API Migration Guide

## Overview

This document describes the migration from MyShipTracking API to Datalastic API, and the implementation of a provider abstraction layer that supports multiple AIS providers.

## Architecture

### Provider Abstraction Layer

The application now uses a provider abstraction layer that allows switching between different AIS providers without code changes. The abstraction is located in `backend/services/ais/`:

```
backend/services/ais/
├── providers/
│   ├── base.js              # Base provider interface
│   ├── myshiptracking.js    # MyShipTracking implementation
│   └── datalastic.js        # Datalastic implementation
├── providerFactory.js       # Factory to instantiate correct provider
├── index.js                 # Public API (exports same functions as before)
├── errors.js                # Unified error handling
└── cache.js                 # Cache re-exports
```

### Key Differences Between Providers

| Feature | MyShipTracking | Datalastic |
|---------|---------------|------------|
| **Auth** | Bearer token (API key + secret) | Query param `api-key` |
| **Base URL** | `https://api.myshiptracking.com/api/v2/` | `https://api.datalastic.com/api/v0/` |
| **Vessel Position** | `/vessel?mmsi=X` | `/vessel?mmsi=X&api-key=Y` |
| **Vessel Track** | `/vessel/history?mmsi=X&fromdate=Y&todate=Z` | `/vessel_history?mmsi=X&from=Y&to=Z` |
| **Zone Query** | `/vessel/zone?minlat=X&maxlat=Y&minlon=Z&maxlon=W` | `/vessel_inradius?lat=X&lon=Y&radius=Z` |
| **Rate Limit** | 80 calls/minute | 600 calls/minute |
| **Credits** | Per-call credits | Per-result credits (varies by endpoint) |

## Configuration

### Environment Variables

The provider is selected via the `AIS_PROVIDER` environment variable:

- `AIS_PROVIDER=datalastic` (default) - Uses Datalastic API
- `AIS_PROVIDER=myshiptracking` - Uses MyShipTracking API

### Datalastic Configuration

Required environment variables for Datalastic:

```bash
AIS_PROVIDER=datalastic
DATALASTIC_API_KEY=2014bdb0-48ab-4094-81d8-27b2280feaf4
```

### MyShipTracking Configuration

Required environment variables for MyShipTracking:

```bash
AIS_PROVIDER=myshiptracking
MYSHIPTRACKING_API_KEY=<your-api-key>
MYSHIPTRACKING_SECRET_KEY=<your-secret-key>
```

## Zone Query Conversion

Datalastic uses radius-based queries instead of bounding boxes. The conversion algorithm:

1. Calculates center point: `(minlat + maxlat) / 2`, `(minlon + maxlon) / 2`
2. Calculates radius using Haversine formula from center to corner
3. Caps radius at 50 nautical miles (Datalastic maximum)

## Port Endpoints

Datalastic does not currently have direct equivalents for:
- Port estimates (expected arrivals)
- Port calls
- Vessels in port

These endpoints return empty arrays with warning logs. If Datalastic adds these endpoints in the future, they can be implemented in the `DatalasticProvider` class.

## Rate Limiting

Rate limits are automatically adjusted based on the active provider:

- **Datalastic**: 600 calls/minute
- **MyShipTracking**: 80 calls/minute (conservative, below 90/min trial limit)

The rate limiting middleware (`backend/middleware/aisApiRateLimit.js`) automatically detects the provider and applies the appropriate limit.

## Error Handling

Unified error handling is provided in `backend/services/ais/errors.js`. Both providers' error codes are mapped to standardized internal error codes.

## Backward Compatibility

The abstraction layer maintains the same function signatures as the original `myshiptracking.js`, ensuring all existing code continues to work without changes:

- `fetchLatestPosition(identifier, { type })`
- `fetchTrack(identifier, { type, hours })`
- `fetchVesselsInZone(bounds, { max })`
- `fetchPortEstimates(portId, { useUnloco })`
- `fetchPortCalls(params)`
- `fetchVesselsInPort(portId, { useUnloco })`

## Migration Steps

1. **Set Environment Variables**: Add `AIS_PROVIDER=datalastic` and `DATALASTIC_API_KEY` to your environment
2. **Deploy**: The code automatically uses Datalastic when configured
3. **Test**: Verify vessel positions, tracks, and zone queries work correctly
4. **Monitor**: Check logs for any provider-specific issues

## Testing Checklist

- [ ] Vessel position fetching (MMSI and IMO)
- [ ] Vessel track/history fetching
- [ ] Zone queries (bounding box → radius conversion)
- [ ] Error handling for both providers
- [ ] Rate limiting for both providers
- [ ] Caching works correctly
- [ ] Provider switching via environment variable
- [ ] Tenant filtering still works (zone API)

## Files Modified

### Backend

- `backend/services/ais/` - New provider abstraction layer
- `backend/routes/ais.js` - Updated to use AIS service abstraction
- `backend/routes/vessels.js` - Updated to use AIS service abstraction
- `backend/routes/dashboard.js` - Updated to use AIS service abstraction
- `backend/routes/opsSites.js` - Updated to use AIS service abstraction
- `backend/middleware/aisApiRateLimit.js` - Provider-agnostic rate limiting
- `backend/middleware/validateAis.js` - Provider-agnostic validation

### Frontend

- `frontend/src/api/ais.ts` - Renamed from `myshiptracking.ts`, updated comments
- `frontend/src/components/map/MiniPopup.tsx` - Updated import
- `frontend/src/components/map/VesselSearch.tsx` - Updated import

## Notes

1. **Zone Query Conversion**: Datalastic uses radius-based queries instead of bounding boxes. The conversion algorithm needs to calculate the center point and maximum radius from the bounding box.

2. **Port Endpoints**: Some port-related endpoints may not have direct Datalastic equivalents. These will return empty arrays with warning logs until equivalents are identified or implemented.

3. **Backward Compatibility**: The abstraction layer ensures all existing code continues to work without changes. Only the underlying provider implementation changes.

4. **Error Handling**: Datalastic may use different error codes than MyShipTracking. The unified error handler will map both to standardized internal error codes.

5. **Rate Limits**: Datalastic has a higher rate limit (600/min vs 80/min), which may improve performance for high-traffic scenarios.

6. **Credits**: Datalastic uses a credit system where credits are deducted per result (not per call). This means zone queries with many vessels will consume more credits than MyShipTracking's per-call model.

