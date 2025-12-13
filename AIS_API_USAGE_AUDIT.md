# AIS API Usage Audit - Credit Protection

## Summary
This document tracks all AIS API calls in the application to ensure no automatic/unwanted calls consume credits.

**Last Updated:** $(date)
**Status:** ✅ All automatic AIS API calls have been removed

---

## ✅ SAFE - User-Initiated Only

### 1. Vessel Detail Page - Manual Refresh
- **File:** `frontend/src/pages/Vessels/VesselDetail.jsx`
- **Endpoint:** `/vessels/:id/position`
- **Trigger:** User clicks "Refresh Position" button
- **Status:** ✅ SAFE - Manual user action only
- **Note:** `refetchInterval` is explicitly disabled (line 42)

### 2. Vessel Creation - One-Time Fetch
- **File:** `backend/routes/vessels.js` (line 130-171)
- **Endpoint:** AIS API via `fetchLatestPosition`
- **Trigger:** User creates a new vessel
- **Status:** ✅ SAFE - One-time action, stores position for future use
- **Note:** This ensures new vessels appear on dashboard map immediately

### 3. Port Calls from AIS - Tab-Based
- **File:** `frontend/src/pages/OpsSites/PortCallsFromAIS.jsx`
- **Endpoints:** 
  - `/ops-sites/:id/port-estimates`
  - `/ops-sites/:id/port-calls-ais`
  - `/ops-sites/:id/vessels-in-port`
- **Trigger:** User clicks specific tabs (estimates, calls, in-port)
- **Status:** ✅ SAFE - Only enabled when user selects tab
- **Note:** Queries have `enabled: !!siteId && activeTab === '...'` conditions

### 4. AIS Routes - Manual API Calls
- **File:** `backend/routes/ais.js`
- **Endpoints:**
  - `/ais/vessel/last-position` - Manual query by MMSI/IMO
  - `/ais/vessel/track` - Manual query by MMSI/IMO
  - `/ais/zone` - Manual zone query
  - `/ais/vessels/:vesselId/last-position` - Manual vessel position
  - `/ais/vessels/:vesselId/track` - Manual vessel track
- **Trigger:** Explicit API calls from frontend (user-initiated)
- **Status:** ✅ SAFE - All protected by `aisApiLimiter` middleware
- **Note:** These are direct API endpoints, not automatically called

---

## ✅ FIXED - Now Using Stored Positions

### 1. Dashboard Map - Active Vessels
- **File:** `frontend/src/pages/Dashboard.jsx` + `backend/routes/dashboard.js`
- **Endpoint:** `/dashboard/active-vessels`
- **Previous:** Would call AIS API for each vessel
- **Current:** ✅ Uses stored positions from `vessel_position_history` table only
- **Status:** ✅ FIXED - No automatic AIS calls
- **Note:** Line 134-161 in `dashboard.js` explicitly uses `getLatestPosition` from database

### 2. Dashboard Map Component
- **File:** `frontend/src/components/map/DashboardMapMapLibre.tsx`
- **Previous:** Would call zone API automatically
- **Current:** ✅ Explicitly disabled automatic zone API calls (line 35-42)
- **Status:** ✅ FIXED - Comment states "DISABLED: Automatic zone API calls to save credits"

### 3. Fleet Map
- **File:** `frontend/src/pages/FleetMap.jsx`
- **Previous:** Automatically called `/ais/vessels/:id/last-position` for each port call on mount
- **Current:** ✅ Uses `/vessels/:id/position-history?limit=1` (stored positions only)
- **Status:** ✅ FIXED - No automatic AIS API calls

### 4. Port Call Detail
- **File:** `frontend/src/pages/PortCalls/PortCallDetail.jsx`
- **Previous:** Automatically queried AIS API on component mount
- **Current:** ✅ Uses stored positions from `position-history` endpoint
- **Status:** ✅ FIXED - No automatic AIS API calls, `refetchInterval` disabled

---

## 🔒 Backend Protection

### Rate Limiting
- **File:** `backend/middleware/aisApiRateLimit.js`
- **Protection:** All AIS routes protected by `aisApiLimiter` middleware
- **Status:** ✅ Active

### Position Endpoint Priority
- **File:** `backend/routes/vessels.js` (line 240-374)
- **Behavior:** 
  1. ✅ Tries stored position FIRST (saves credits)
  2. Falls back to AIS API only if no stored position exists
- **Status:** ✅ FIXED - Stored positions prioritized

---

## 📊 Dashboard Polling (Non-AIS)

### Dashboard Stats
- **File:** `frontend/src/pages/Dashboard.jsx` (line 22-33)
- **Endpoint:** `/dashboard/stats`
- **Polling:** `refetchInterval: 30000` (30 seconds)
- **Status:** ✅ SAFE - This endpoint does NOT call AIS API, only database queries

### Dashboard Active Vessels
- **File:** `frontend/src/pages/Dashboard.jsx` (line 35-46)
- **Endpoint:** `/dashboard/active-vessels`
- **Polling:** `refetchInterval: 30000` (30 seconds)
- **Status:** ✅ SAFE - Uses stored positions only (no AIS API calls)

### Dashboard Events
- **File:** `frontend/src/pages/Dashboard.jsx` (line 68-79)
- **Endpoint:** `/dashboard/events`
- **Polling:** `refetchInterval: 15000` (15 seconds)
- **Status:** ✅ SAFE - This endpoint does NOT call AIS API, only database queries

---

## ✅ Verification Checklist

- [x] No `refetchInterval` on AIS API queries (except disabled ones)
- [x] Dashboard map uses stored positions only
- [x] Fleet map uses stored positions only
- [x] Port call detail uses stored positions only
- [x] Vessel detail requires manual refresh
- [x] All AIS routes protected by rate limiting
- [x] Position endpoint prioritizes stored positions
- [x] No automatic zone API calls
- [x] No cron jobs or scheduled AIS calls
- [x] No `setInterval` or `setTimeout` for AIS calls

---

## 🎯 Remaining AIS API Usage

The following scenarios WILL consume AIS API credits (all user-initiated):

1. **User clicks "Refresh Position" button** on Vessel Detail page
2. **User creates a new vessel** (one-time fetch to get initial position)
3. **User navigates to Port Calls from AIS tab** and selects a tab
4. **Direct API calls** to `/api/ais/*` endpoints (if any frontend code explicitly calls them)

All of these are intentional, user-initiated actions.

---

## 🚨 Important Notes

1. **Vessel Creation:** Fetches position once when vessel is created. This is intentional to ensure new vessels appear on the dashboard map immediately.

2. **Position Endpoint:** `/vessels/:id/position` tries stored position first, then AIS API. This is safe because:
   - It's only called when user clicks "Refresh Position" button
   - It prioritizes stored positions (saves credits)
   - Falls back to AIS only if no stored position exists

3. **Dashboard Polling:** The `refetchInterval` on dashboard queries is safe because:
   - `/dashboard/stats` - No AIS calls
   - `/dashboard/active-vessels` - Uses stored positions only
   - `/dashboard/events` - No AIS calls

---

## ✅ Conclusion

**All automatic AIS API calls have been removed or replaced with stored position queries.**

The application now:
- ✅ Uses stored positions from `vessel_position_history` table for all automatic displays
- ✅ Only calls AIS API when user explicitly requests it
- ✅ Prioritizes stored positions over AIS API calls
- ✅ Has no polling/automatic refresh for AIS data
- ✅ Protects all AIS routes with rate limiting

**Credits are now only consumed for intentional, user-initiated actions.**

