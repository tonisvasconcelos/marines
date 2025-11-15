import express from 'express';
import { getMockPortCalls, getMockVessels, getMockAisPosition, getMockOpsSites } from '../data/mockData.js';
import * as myshiptracking from '../services/myshiptracking.js';
import { getAisConfig } from '../services/aisConfig.js';

const router = express.Router();

// Helper function to check if point is inside polygon (ray casting algorithm)
function checkPointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat;
    const xj = polygon[j].lon, yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lon < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper function to check if point is inside circle
function checkPointInCircle(point, center, radius) {
  const R = 6371000; // Earth radius in meters
  const dLat = (point.lat - center.lat) * Math.PI / 180;
  const dLon = (point.lon - center.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(center.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= radius;
}

router.get('/stats', (req, res) => {
  const { tenantId } = req;
  const portCalls = getMockPortCalls(tenantId);
  const vessels = getMockVessels(tenantId);
  
  const activePortCalls = portCalls.filter((pc) => pc.status === 'IN_PROGRESS').length;
  const shipsAtSea = portCalls.filter((pc) => pc.status === 'PLANNED').length;
  const pendingIssues = portCalls.reduce((sum, pc) => sum + (pc.pendingIssues || 0), 0);
  const totalCargo = portCalls.reduce((sum, pc) => sum + (pc.blCount || 0), 0);
  
  // Enhanced tactical stats
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const arrivalsNext24h = portCalls.filter((pc) => {
    const eta = new Date(pc.eta);
    return eta >= now && eta <= next24h && pc.status === 'PLANNED';
  }).length;
  
  const departuresNext24h = portCalls.filter((pc) => {
    const etd = new Date(pc.etd);
    return etd >= now && etd <= next24h && pc.status === 'IN_PROGRESS';
  }).length;
  
  // Vessel status breakdown
  const vesselsAtSea = vessels.length; // Simplified - in production, check AIS status
  const vesselsInPort = activePortCalls;
  const vesselsAnchored = 0; // Stub - would check ops sites with type ANCHORED_ZONE
  
  res.json({
    activePortCalls,
    shipsAtSea,
    pendingIssues,
    totalCargo,
    arrivalsNext24h,
    departuresNext24h,
    vesselsAtSea,
    vesselsInPort,
    vesselsAnchored,
  });
});

// GET /api/dashboard/active-vessels - Get all active vessels with positions
router.get('/active-vessels', async (req, res) => {
  const { tenantId } = req;
  const vessels = getMockVessels(tenantId);
  const portCalls = getMockPortCalls(tenantId);
  const aisConfig = getAisConfig(tenantId);
  
  // Helper function to get AIS position (tries real API first, falls back to mock)
  const getVesselPosition = async (vessel) => {
    // Try real AIS API if configured
    if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
      try {
        let position = null;
        
        if (vessel.mmsi) {
          position = await myshiptracking.getVesselPosition(
            vessel.mmsi,
            aisConfig.apiKey,
            aisConfig.secretKey
          );
        } else if (vessel.imo) {
          // Remove 'IMO' prefix if present
          const imoNumber = vessel.imo.replace(/^IMO/i, '').trim();
          position = await myshiptracking.getVesselByImo(
            imoNumber,
            aisConfig.apiKey,
            aisConfig.secretKey
          );
        }
        
        if (position && (position.latitude || position.lat)) {
          // Extract coordinates - handle various MyShipTracking API response formats
          // API might return: { latitude, longitude } or { lat, lon } or nested structures
          let lat = position.latitude ?? position.lat ?? null;
          let lon = position.longitude ?? position.lon ?? null;
          
          // Handle nested position object (if API returns { position: { lat, lon } })
          if ((lat === null || lon === null) && position.position) {
            lat = position.position.latitude ?? position.position.lat ?? lat;
            lon = position.position.longitude ?? position.position.lon ?? lon;
          }
          
          // Convert to numbers if strings
          if (typeof lat === 'string') lat = parseFloat(lat);
          if (typeof lon === 'string') lon = parseFloat(lon);
          
          // Validate coordinates are valid numbers
          if (lat !== null && lon !== null && isFinite(lat) && isFinite(lon)) {
            // CRITICAL: Ensure coordinates are in correct order (lat, lon)
            // MyShipTracking API should return latitude/longitude in correct order
            // But we validate to prevent any coordinate swapping issues
            
            // Transform MyShipTracking response to our format (normalize coordinates)
            const positionData = {
              lat: lat,  // CRITICAL: Use extracted lat (not swapped)
              lon: lon,  // CRITICAL: Use extracted lon (not swapped)
              timestamp: position.timestamp || position.last_position_time || new Date().toISOString(),
              sog: position.speed || position.sog,
              cog: position.course || position.cog,
              heading: position.heading,
              navStatus: position.nav_status || position.status,
              source: 'myshiptracking',
            };
            
            // Log in development for debugging
            if (process.env.NODE_ENV !== 'production') {
              console.log('[getVesselPosition] MyShipTracking API response transformed:', {
                vesselId: vessel.id,
                vesselName: vessel.name,
                rawApiResponse: {
                  latitude: position.latitude,
                  longitude: position.longitude,
                  lat: position.lat,
                  lon: position.lon,
                },
                transformed: positionData,
              });
            }
            
            return positionData;
          } else {
            console.warn(`[getVesselPosition] Invalid coordinates from MyShipTracking for vessel ${vessel.id}:`, {
              lat,
              lon,
              position,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch AIS position for vessel ${vessel.id} (${vessel.name}):`, error.message);
        // Fall through to mock data
      }
    }
    
    // Fallback to mock data
    const mockPos = getMockAisPosition(vessel.id);
    return {
      lat: mockPos.lat,
      lon: mockPos.lon,
      timestamp: mockPos.timestamp,
      sog: mockPos.sog,
      cog: mockPos.cog,
      heading: mockPos.heading,
      navStatus: mockPos.navStatus,
      source: 'mock',
    };
  };
  
  const activeVessels = await Promise.all(
    vessels.map(async (vessel) => {
      const portCall = portCalls.find((pc) => pc.vesselId === vessel.id && 
        (pc.status === 'IN_PROGRESS' || pc.status === 'PLANNED'));
      
      let position = null;
      let status = 'AT_SEA';
      
      if (portCall) {
        if (portCall.status === 'IN_PROGRESS') {
          status = 'IN_PORT';
          // Get position from port or ops site - use port coordinates if available, otherwise maritime position
          if (portCall.port?.coordinates) {
            position = {
              lat: portCall.port.coordinates.lat,
              lon: portCall.port.coordinates.lon,
              timestamp: new Date().toISOString(),
            };
          } else {
            // Use a position in Guanabara Bay (in port area)
            position = {
              lat: -22.90 + (Math.random() - 0.5) * 0.03, // Inner bay area
              lon: -43.13 + (Math.random() - 0.5) * 0.03,
              timestamp: new Date().toISOString(),
            };
          }
        } else if (portCall.status === 'PLANNED') {
          status = 'INBOUND';
          // Get AIS position (real API or mock)
          position = await getVesselPosition(vessel);
        }
      } else {
        // Vessel at sea - get AIS position (real API or mock)
        position = await getVesselPosition(vessel);
      }
      
      return {
        ...vessel,
        position,
        status,
        portCallId: portCall?.id,
        portCall: portCall ? {
          id: portCall.id,
          port: portCall.port,
          eta: portCall.eta,
          etd: portCall.etd,
          status: portCall.status,
        } : null,
      };
    })
  );
  
  res.json(activeVessels);
});

// GET /api/dashboard/events - Get recent tactical events
router.get('/events', (req, res) => {
  const { tenantId } = req;
  const portCalls = getMockPortCalls(tenantId);
  const vessels = getMockVessels(tenantId);
  const now = new Date();
  
  const events = [];
  
  // Generate events from port calls
  portCalls.forEach((pc) => {
    const vessel = vessels.find((v) => v.id === pc.vesselId);
    if (!vessel) return;
    
    // AIS updates
    const aisPos = getMockAisPosition(pc.vesselId);
    events.push({
      id: `ais-${pc.vesselId}-${Date.now()}`,
      type: 'AIS_UPDATE',
      severity: 'info',
      timestamp: aisPos.timestamp,
      vessel: vessel.name,
      vesselId: vessel.id,
      message: `AIS update: ${vessel.name} at ${aisPos.lat.toFixed(4)}, ${aisPos.lon.toFixed(4)}`,
      data: {
        sog: aisPos.sog,
        cog: aisPos.cog,
        navStatus: aisPos.navStatus,
      },
    });
    
    // Arrivals
    const eta = new Date(pc.eta);
    if (eta > now && eta <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      events.push({
        id: `arrival-${pc.id}`,
        type: 'ARRIVAL',
        severity: 'warning',
        timestamp: pc.eta,
        vessel: vessel.name,
        vesselId: vessel.id,
        portCallId: pc.id,
        message: `${vessel.name} ETA ${pc.port?.name || 'port'} in ${Math.round((eta - now) / (60 * 60 * 1000))}h`,
        data: { port: pc.port, eta: pc.eta },
      });
    }
    
    // Departures
    const etd = new Date(pc.etd);
    if (etd > now && etd <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      events.push({
        id: `departure-${pc.id}`,
        type: 'DEPARTURE',
        severity: 'info',
        timestamp: pc.etd,
        vessel: vessel.name,
        vesselId: vessel.id,
        portCallId: pc.id,
        message: `${vessel.name} ETD ${pc.port?.name || 'port'} in ${Math.round((etd - now) / (60 * 60 * 1000))}h`,
        data: { port: pc.port, etd: pc.etd },
      });
    }
    
    // Security issues
    if (pc.pendingIssues > 0) {
      events.push({
        id: `security-${pc.id}`,
        type: 'SECURITY_PENDENCY',
        severity: 'error',
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        vessel: vessel.name,
        vesselId: vessel.id,
        portCallId: pc.id,
        message: `${pc.pendingIssues} security pendency${pc.pendingIssues > 1 ? 'ies' : ''} for ${vessel.name}`,
        data: { count: pc.pendingIssues },
      });
    }
  });
  
  // Check geofence entries (vessel monitoring)
  const opsSites = getMockOpsSites(tenantId);
  vessels.forEach((vessel) => {
    const aisPos = getMockAisPosition(vessel.id);
    if (!aisPos) return;
    
    const vesselPoint = { lat: aisPos.lat, lon: aisPos.lon };
    
    opsSites.forEach((site) => {
      let isInside = false;
      
      // Check polygon geofence
      if (site.polygon && site.polygon.length >= 3) {
        isInside = checkPointInPolygon(vesselPoint, site.polygon);
      } 
      // Check circular geofence
      else if (site.latitude && site.longitude) {
        const radius = site.type === 'PORT' ? 5000 : 
                      site.type === 'TERMINAL' ? 2000 : 
                      site.type === 'BERTH' ? 500 : 10000;
        isInside = checkPointInCircle(
          vesselPoint,
          { lat: site.latitude, lon: site.longitude },
          radius
        );
      }
      
      // Generate entry event if inside (simplified - in production would track state per vessel)
      if (isInside && Math.random() > 0.85) { // Random chance to generate event (would be state-based in production)
        events.push({
          id: `geofence-${vessel.id}-${site.id}-${Date.now()}`,
          type: 'GEOFENCE_ENTRY',
          severity: 'warning',
          timestamp: new Date().toISOString(),
          vessel: vessel.name,
          vesselId: vessel.id,
          message: `${vessel.name} entered ${site.name} (${site.type})`,
          data: { 
            geofenceId: site.id, 
            geofenceName: site.name,
            geofenceType: site.type,
          },
        });
      }
    });
  });
  
  // Sort by timestamp (newest first)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Return last 50 events
  res.json(events.slice(0, 50));
});

// GET /api/dashboard/geofences - Get operational zones for map
router.get('/geofences', (req, res) => {
  const { tenantId } = req;
  const opsSites = getMockOpsSites(tenantId);
  
  const geofences = opsSites.map((site) => {
    const geofence = {
      id: site.id,
      name: site.name,
      type: site.type,
    };
    
    // If polygon exists, use it; otherwise use circular geofence
    if (site.polygon && site.polygon.length >= 3) {
      geofence.polygon = site.polygon;
    } else {
      geofence.center = {
        lat: site.latitude,
        lon: site.longitude,
      };
      geofence.radius = site.type === 'PORT' ? 5000 : 
                        site.type === 'TERMINAL' ? 2000 : 
                        site.type === 'BERTH' ? 500 : 10000;
    }
    
    return geofence;
  });
  
  res.json(geofences);
});

export default router;

