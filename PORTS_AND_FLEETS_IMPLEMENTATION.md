# Ports and Fleets Implementation

**Date:** 2025-12-11  
**Status:** ✅ **Completed**

## Overview

This implementation connects the existing Ops Sites/Zones and Vessels features to the new Ports and Fleets database tables, enabling persistent storage and full CRUD operations.

## Key Mappings

- **Ports Table = Ops Sites/Zones**: The `ports` table now stores all operational zones (PORT, TERMINAL, BERTH, ANCHORED_ZONE)
- **Fleets Table = Vessel Collections**: The `fleets` table organizes vessels created in the app database

## Changes Made

### 1. Database Schema Updates ✅

**File:** `backend/db/schema.sql`

- Extended `ports` table with Ops Sites fields:
  - `code` - Ops Site code (e.g., 'BRRIO', 'BRRIO-T1')
  - `type` - Type: PORT, TERMINAL, BERTH, ANCHORED_ZONE
  - `polygon` - JSONB field for geofence coordinates
  - `parent_code` - Parent ops site code for hierarchical relationships
- Added indexes for performance

**Migration:** `backend/db/migrations/001_add_ops_sites_fields_to_ports.sql`
- Safe migration script that adds new columns if they don't exist
- Updates existing rows to set `code = unlocode` where applicable

### 2. Database Functions ✅

**File:** `backend/db/ports.js`
- Updated all functions to support Ops Sites fields
- Added `transformPortRow()` to convert database format to API format
- Added `getPortByCode()` for Ops Site code lookups
- Functions now handle polygon JSONB conversion
- Maintains backward compatibility with MyShipTracking port fields

**File:** `backend/db/fleets.js`
- Already created with full CRUD operations
- Functions work with existing vessels table
- Multi-tenant aware

### 3. Route Updates ✅

**File:** `backend/routes/opsSites.js`
- **GET /api/ops-sites** - Now uses ports database, falls back to mock data in development
- **GET /api/ops-sites/:id** - Uses ports database
- **POST /api/ops-sites** - Creates in ports database
- **PUT /api/ops-sites/:id** - Updates in ports database
- **DELETE /api/ops-sites/:id** - Deletes from ports database
- Maintains API compatibility (same request/response format)

**File:** `backend/routes/fleets.js` (NEW)
- **GET /api/fleets** - List all fleets with vessel counts
- **GET /api/fleets/:id** - Get fleet with vessels
- **POST /api/fleets** - Create new fleet
- **PUT /api/fleets/:id** - Update fleet
- **DELETE /api/fleets/:id** - Delete fleet
- **POST /api/fleets/:id/vessels** - Add vessel to fleet
- **DELETE /api/fleets/:id/vessels/:vesselId** - Remove vessel from fleet
- **GET /api/fleets/:id/status** - Get fleet status with vessel positions

**File:** `backend/routes/dashboard.js`
- **GET /api/dashboard/geofences** - Now uses ports database for geofences
- Falls back to mock data in development

**File:** `backend/server.js`
- Added fleet routes: `/api/fleets`

### 4. Migration Utilities ✅

**File:** `backend/db/migrations/002_sync_vessels_to_default_fleet.js`
- Utility to create default fleet for each tenant
- Syncs all existing vessels to default fleet
- Can be run manually or via API endpoint (future enhancement)

## Database Migration Steps

### Step 1: Run Schema Migration

```bash
# Connect to your database and run:
psql $DATABASE_URL -f backend/db/schema.sql
```

This will:
- Create `ports` table with Ops Sites fields
- Create `fleets` table
- Create `fleet_vessels` junction table
- Add all necessary indexes

### Step 2: Run Ops Sites Fields Migration (if ports table already exists)

```bash
psql $DATABASE_URL -f backend/db/migrations/001_add_ops_sites_fields_to_ports.sql
```

This safely adds new columns to existing ports table.

### Step 3: (Optional) Sync Existing Vessels to Default Fleet

After deployment, you can run this utility to create a default fleet and add all existing vessels:

```javascript
// In Node.js REPL or script
import { syncVesselsToDefaultFleet } from './backend/db/migrations/002_sync_vessels_to_default_fleet.js';

// For a specific tenant
await syncVesselsToDefaultFleet('tenant-id');

// Or for all tenants
import { syncAllTenantsVesselsToDefaultFleet } from './backend/db/migrations/002_sync_vessels_to_default_fleet.js';
await syncAllTenantsVesselsToDefaultFleet();
```

## API Endpoints

### Ops Sites (Ports) Endpoints

- `GET /api/ops-sites` - List all ops sites (now from database)
- `GET /api/ops-sites/:id` - Get single ops site
- `POST /api/ops-sites` - Create ops site
- `PUT /api/ops-sites/:id` - Update ops site
- `DELETE /api/ops-sites/:id` - Delete ops site
- `GET /api/ops-sites/:id/portcalls` - Get port calls for ops site

### Fleet Endpoints

- `GET /api/fleets` - List all fleets
- `GET /api/fleets/:id` - Get fleet with vessels
- `POST /api/fleets` - Create fleet
- `PUT /api/fleets/:id` - Update fleet
- `DELETE /api/fleets/:id` - Delete fleet
- `POST /api/fleets/:id/vessels` - Add vessel to fleet
- `DELETE /api/fleets/:id/vessels/:vesselId` - Remove vessel from fleet
- `GET /api/fleets/:id/status` - Get fleet status with positions

## Data Flow

### Ops Sites → Ports Table

```
Frontend Ops Sites Form
    ↓
POST /api/ops-sites
    ↓
portsDb.createPort()
    ↓
ports table (with type, code, polygon, etc.)
    ↓
GET /api/ops-sites (returns from database)
    ↓
Frontend displays Ops Sites
```

### Vessels → Fleets

```
Existing Vessels (in vessels table)
    ↓
POST /api/fleets (create fleet)
    ↓
POST /api/fleets/:id/vessels (add vessels)
    ↓
fleet_vessels junction table
    ↓
GET /api/fleets/:id (returns fleet with vessels)
    ↓
Frontend displays Fleet
```

## Backward Compatibility

- ✅ Ops Sites API maintains same request/response format
- ✅ Falls back to mock data in development if database is empty
- ✅ Existing frontend code works without changes
- ✅ Geofences endpoint updated to use database

## Next Steps (Frontend)

1. **Add Fleet Types:**
   - Add `Fleet` type to `frontend/src/models/types.js`

2. **Create Fleet Components:**
   - `frontend/src/components/fleets/FleetList.jsx`
   - `frontend/src/components/fleets/FleetForm.jsx`
   - `frontend/src/components/fleets/FleetDetail.jsx`

3. **Create React Query Hooks:**
   - `frontend/src/hooks/useFleets.js`
   - `frontend/src/hooks/useFleetStatus.js`

4. **Add Fleet Pages:**
   - `frontend/src/pages/Fleets.jsx`

5. **Update Ops Sites:**
   - No changes needed - API is backward compatible
   - Data now persists to database instead of mock data

## Testing Checklist

- [ ] Run database migrations
- [ ] Test creating ops site via POST /api/ops-sites
- [ ] Test retrieving ops sites via GET /api/ops-sites
- [ ] Test updating ops site via PUT /api/ops-sites/:id
- [ ] Test deleting ops site via DELETE /api/ops-sites/:id
- [ ] Test geofences endpoint GET /api/dashboard/geofences
- [ ] Test creating fleet via POST /api/fleets
- [ ] Test adding vessel to fleet via POST /api/fleets/:id/vessels
- [ ] Test fleet status with positions GET /api/fleets/:id/status
- [ ] Verify multi-tenant isolation (each tenant only sees their own data)

