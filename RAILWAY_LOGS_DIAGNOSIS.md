# Railway Logs Diagnosis - Mock Data Issue

## Key Findings from Railway Logs

### ✅ What's Working

1. **API Key is Present and Accessible:**
   ```
   [ENV] AISSTREAM_API_KEY present: true
   [ENV] AISSTREAM_API_KEY length: 40
   [AISStream] Fetching position for MMSI: 710003160 { apiKeyPresent: true, apiKeyLength: 40 }
   ```
   ✅ The runtime API key fix is working!

2. **WebSocket Connection is Opening:**
   ```
   [AISStream] WebSocket opened, sending subscription: { boundingBoxesCount: 1, shipMMSI: 1, filterTypes: 3 }
   ```
   ✅ Connection to AISStream is successful

3. **Backend is Receiving Messages:**
   ```
   [AISStream] Received message without valid MMSI: { hasMeta: false, hasPosition: false, messageType: undefined }
   ```
   ✅ AISStream IS sending messages, but we're not parsing them correctly

### ❌ Root Cause Identified

**Problem:** AISStream is sending messages, but our parser isn't extracting the data correctly.

**Evidence:**
- WebSocket opens successfully ✅
- Messages are being received ✅
- But parsing fails: `hasMeta: false, hasPosition: false, messageType: undefined`
- WebSocket closes abnormally: `code: 1006` (abnormal closure)
- No position data extracted: `resultsCount: 0, receivedMmsis: []`

**Possible Causes:**

1. **Message Format Mismatch:**
   - AISStream might be sending messages in a different format than expected
   - Our parser expects `MetaData` + `PositionReport` structure
   - Actual messages might have different structure

2. **Non-Position Messages:**
   - AISStream might send subscription confirmations, status messages, or errors
   - These wouldn't have position data, causing parsing to fail

3. **Vessel Not Broadcasting:**
   - MMSI `710003160` might not be actively broadcasting AIS data
   - AISStream is real-time only - if vessel is offline, no data available

## Fixes Applied

### 1. Enhanced Message Parsing
- Updated `normalizePosition()` to handle multiple message format variations
- Added fallbacks for different property name cases (Lat/Lat, Lon/Lon, etc.)
- Improved MMSI extraction from multiple possible locations

### 2. Comprehensive Logging
- Added logging of raw message structure (`messageKeys`, `topLevelKeys`)
- Log actual message content preview to see what AISStream is sending
- Enhanced WebSocket close logging to identify abnormal closures
- Log received MMSIs to verify data is coming through

### 3. Better Error Handling
- Detect abnormal closures (code 1006) which may indicate API key issues
- Log subscription payload to verify it's formatted correctly

## Next Steps After Redeploy

After Railway redeploys, check the logs for:

### Expected New Logs:

1. **Raw Message Structure:**
   ```
   [AISStream] Raw message received: {
     messageKeys: [...],
     hasMetaData: true/false,
     messageType: '...',
     topLevelKeys: [...]
   }
   ```

2. **Message Content Preview:**
   ```
   rawMessagePreview: '{...actual JSON structure...}'
   ```

3. **Parsing Success:**
   ```
   [AISStream] Successfully parsed position message: {
     mmsi: '710003160',
     lat: ...,
     lon: ...
   }
   ```

### What to Look For:

1. **If messages are subscription confirmations:**
   - Look for `messageType: 'SubscriptionConfirmation'` or similar
   - These are expected and should be ignored

2. **If messages are position reports but parsing fails:**
   - Check `rawMessagePreview` to see actual structure
   - Update parser to match actual format

3. **If no messages are received:**
   - Check if MMSI `710003160` is active in AISStream
   - Verify API key has access to this MMSI
   - Check AISStream documentation for MMSI filtering requirements

## Possible Solutions

### Solution 1: Vessel Not Broadcasting (Most Likely)
If MMSI `710003160` is not actively broadcasting AIS:
- AISStream won't have data for it
- This is expected behavior - AISStream is real-time only
- **Workaround:** Use stored position history or accept mock data fallback

### Solution 2: Message Format Issue
If messages are in unexpected format:
- Use the new logging to see actual structure
- Update parser to match AISStream's actual format
- May need to check AISStream API documentation

### Solution 3: Subscription Format Issue
If subscription payload is incorrect:
- Check AISStream documentation for exact subscription format
- Verify `FiltersShipMMSI` format is correct
- May need to adjust bounding box or filter parameters

## Current Status

- ✅ API key detection fixed (runtime access working)
- ✅ WebSocket connection working
- ✅ Messages being received
- ❌ Message parsing failing (need to see actual message structure)
- ⏳ Enhanced logging deployed - will show actual message format on next request

## Action Required

1. **Wait for Railway redeploy** (should happen automatically)
2. **Fetch vessel position again** in the app
3. **Check Railway logs** for the new detailed message structure logs
4. **Share the logs** showing the actual message format from AISStream
5. **Update parser** based on actual message structure (if needed)

