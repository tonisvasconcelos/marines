import express from 'express';
import { getMockPortCalls, getMockVessels, getMockAisPosition, getMockOpsSites } from '../data/mockData.js';
import * as vesselDb from '../db/vessels.js';
import * as operationLogsDb from '../db/operationLogs.js';
import { fetchLatestPosition, getProviderName } from '../services/ais/index.js';

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

router.get('/stats', async (req, res) => {
  const { tenantId } = req;
  const portCalls = getMockPortCalls(tenantId);
  
  // Get vessels from database (with fallback to mock data)
  let vessels;
  try {
    vessels = await vesselDb.getVessels(tenantId);
    if (vessels.length === 0) {
      vessels = getMockVessels(tenantId);
    }
  } catch (error) {
    console.error('Error fetching vessels from database, using mock data:', error);
    vessels = getMockVessels(tenantId);
  }
  
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
// IMPORTANT: Returns ALL vessels from the tenant's database, attempting to fetch
// positions for each. Vessels without positions will have position: null.
// The frontend map will only display vessels with valid positions.
router.get('/active-vessels', async (req, res) => {
  const { tenantId } = req;
  
  try {
    // Get vessels from database (with fallback to mock data)
    let vessels;
    try {
      vessels = await vesselDb.getVessels(tenantId);
      // If database returns empty array and we're using database, fall back to mock
      if (vessels.length === 0) {
        console.warn('No vessels in database, falling back to mock data');
        vessels = getMockVessels(tenantId);
      }
    } catch (error) {
      console.error('Error fetching vessels from database, using mock data:', error);
      vessels = getMockVessels(tenantId);
    }
    
    console.log(`[dashboard/active-vessels] Found ${vessels.length} vessels in database for tenant ${tenantId}`);
  
  const portCalls = getMockPortCalls(tenantId);
  
  // Log AIS configuration status (always log, not just in dev)
  const providerName = getProviderName();
  const hasAisApiKey = providerName.toLowerCase() === 'datalastic' 
    ? !!process.env.DATALASTIC_API_KEY
    : !!(process.env.MYSHIPTRACKING_API_KEY && process.env.MYSHIPTRACKING_SECRET_KEY);
  console.log('[dashboard/active-vessels] AIS Configuration:', {
    tenantId,
    provider: providerName,
    hasApiKey: hasAisApiKey,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('DATALASTIC') || k.includes('MYSHIPTRACKING') || k.includes('AIS')),
  });
  
  // Normalize provider name (case-insensitive check)
  // Helper function to get AIS position (tries stored position first, then fetches from API if needed)
  // Fetches position from API only if vessel has MMSI/IMO and no stored position exists
  // This ensures vessels are plotted on the map at least once
  const getVesselPosition = async (vessel) => {
    // First: Try to get latest stored position from database
    try {
      const storedPosition = await vesselDb.getLatestPosition(vessel.id, tenantId);
      if (storedPosition && storedPosition.lat && storedPosition.lon) {
        console.log(`[getVesselPosition] Using stored position for vessel ${vessel.id} (${vessel.name})`);
        return {
          lat: storedPosition.lat,
          lon: storedPosition.lon,
          timestamp: storedPosition.timestamp,
          sog: storedPosition.sog,
          cog: storedPosition.cog,
          heading: storedPosition.heading,
          navStatus: storedPosition.navStatus,
          source: storedPosition.source || 'stored',
        };
      }
    } catch (error) {
      console.error(`[getVesselPosition] Error fetching stored position for vessel ${vessel.id}:`, error);
    }
    
    // Second: If no stored position and vessel has MMSI/IMO, fetch from API once
    // This ensures vessels appear on the map at least once
    if ((vessel.mmsi || vessel.imo) && hasAisApiKey) {
      try {
        const providerName = getProviderName();
        console.log(`[getVesselPosition] No stored position, fetching from API for vessel ${vessel.id} (${vessel.name})`);
        
        // Clean IMO prefix if present
        const cleanImo = vessel.imo ? String(vessel.imo).replace(/^IMO/i, '').trim() : null;
        const identifier = vessel.mmsi || cleanImo;
        const type = vessel.mmsi ? 'mmsi' : 'imo';
        
        const position = await fetchLatestPosition(identifier, { type });
        
        if (position && position.lat && position.lon) {
          // Store the position in database for future use
          try {
            await vesselDb.storePositionHistory(vessel.id, tenantId, {
              lat: position.lat,
              lon: position.lon,
              timestamp: position.timestamp || new Date().toISOString(),
              sog: position.sog,
              cog: position.cog,
              heading: position.heading,
              navStatus: position.navStatus,
              source: providerName.toLowerCase(),
            });
            console.log(`[getVesselPosition] Stored position for vessel ${vessel.id} (${vessel.name})`);
          } catch (storeError) {
            console.warn(`[getVesselPosition] Failed to store position for vessel ${vessel.id}:`, storeError.message);
          }
          
          return {
            lat: position.lat,
            lon: position.lon,
            timestamp: position.timestamp,
            sog: position.sog,
            cog: position.cog,
            heading: position.heading,
            navStatus: position.navStatus,
            source: providerName.toLowerCase(),
          };
        }
      } catch (apiError) {
        console.error(`[getVesselPosition] Error fetching position from API for vessel ${vessel.id}:`, apiError.message);
        // Don't throw - return null so vessel is still returned but without position
      }
    }
    
    // No position available
    console.log(`[getVesselPosition] No position available for vessel ${vessel.id} (${vessel.name})`);
    return null;
  };
  
  // Track previous statuses for status change detection
  const previousStatuses = new Map();
  
  const activeVessels = await Promise.all(
    vessels.map(async (vessel) => {
      const portCall = portCalls.find((pc) => pc.vesselId === vessel.id && 
        (pc.status === 'IN_PROGRESS' || pc.status === 'PLANNED'));
      
      // Get previous status from stored position or default
      const previousPosition = await vesselDb.getLatestPosition(vessel.id, tenantId).catch(() => null);
      const previousStatus = previousPosition?.navStatus || 'AT_SEA';
      previousStatuses.set(vessel.id, previousStatus);
      
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
          // Get AIS position (real API)
          try {
            position = await getVesselPosition(vessel);
          } catch (error) {
            console.error(`[Dashboard] Error getting position for vessel ${vessel.id}:`, error.message);
            position = null;
          }
        }
      } else {
        // Vessel at sea - get AIS position (real API)
        // CRITICAL: Always attempt to fetch position for all vessels from database
        try {
          position = await getVesselPosition(vessel);
          if (!position) {
            console.warn(`[Dashboard] No position available for vessel ${vessel.id} (${vessel.name}) - MMSI: ${vessel.mmsi}, IMO: ${vessel.imo}`);
          }
        } catch (error) {
          console.error(`[Dashboard] Error getting position for vessel ${vessel.id} (${vessel.name}):`, {
            error: error.message,
            mmsi: vessel.mmsi,
            imo: vessel.imo,
            hasIdentifier: !!(vessel.mmsi || vessel.imo),
          });
          position = null;
        }
      }
      
      // Detect status change and log it
      // Only create log if vessel exists in database (skip for mock vessels)
      if (position && previousStatus && previousStatus !== status) {
        try {
          // Check if vessel exists in database before creating log
          const vesselExists = await vesselDb.getVesselById(vessel.id, tenantId);
          if (vesselExists) {
            await operationLogsDb.createOperationLog({
              tenantId,
              vesselId: vessel.id,
              eventType: 'STATUS_CHANGE',
              description: `Vessel status changed from ${previousStatus} to ${status}`,
              positionLat: position.lat,
              positionLon: position.lon,
              previousStatus,
              currentStatus: status,
            });
          }
        } catch (logError) {
          // Silently skip logging for mock vessels or database errors
          // Foreign key errors are expected for mock vessels that don't exist in DB
          if (!logError.message?.includes('foreign key constraint')) {
            console.error('Failed to create operation log for status change:', logError);
          }
        }
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
  
  // Check geofence entries for active vessels
  const opsSites = getMockOpsSites(tenantId);
  for (const vessel of activeVessels) {
    if (!vessel.position || !vessel.position.lat || !vessel.position.lon) continue;
    
    const vesselPoint = { lat: vessel.position.lat, lon: vessel.position.lon };
    
    for (const site of opsSites) {
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
      
      // Create operation log for geofence entry
      // Only create log if vessel exists in database (skip for mock vessels)
      if (isInside) {
        try {
          // Check if vessel exists in database before creating log
          const vesselExists = await vesselDb.getVesselById(vessel.id, tenantId);
          if (vesselExists) {
            await operationLogsDb.createOperationLog({
              tenantId,
              vesselId: vessel.id,
              eventType: 'GEOFENCE_ENTRY',
              description: `${vessel.name} entered ${site.name} (${site.type})`,
              positionLat: vessel.position.lat,
              positionLon: vessel.position.lon,
            });
          }
        } catch (logError) {
          // Silently skip logging for mock vessels or database errors
          // Foreign key errors are expected for mock vessels that don't exist in DB
          if (!logError.message?.includes('foreign key constraint')) {
            console.error('Failed to create operation log for geofence entry:', logError);
          }
        }
      }
    }
  }
  
  // IMPORTANT: Return ALL vessels from database, even if position fetch failed
  // This ensures users can see all their vessels on the dashboard
  // Vessels without positions will have position: null, which the frontend can handle
  console.log(`[dashboard/active-vessels] Returning ${activeVessels.length} vessels (${activeVessels.filter(v => v.position).length} with positions)`);
  
  res.json(activeVessels);
  } catch (error) {
    console.error('[Dashboard] Error in active-vessels endpoint:', error);
    res.status(500).json({ 
      message: 'Failed to fetch active vessels',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/dashboard/events - Get recent tactical events
router.get('/events', async (req, res) => {
  const { tenantId } = req;
  
  // Try to get events from operation logs database first
  try {
    const operationLogs = await operationLogsDb.getOperationLogs(tenantId, { limit: 50 });
    
    if (operationLogs && operationLogs.length > 0) {
      // Transform operation logs to event format
      const events = operationLogs.map((log) => {
        // Map event types to severity
        const severityMap = {
          'VESSEL_CREATED': 'info',
          'POSITION_UPDATE': 'info',
          'STATUS_CHANGE': 'warning',
          'GEOFENCE_ENTRY': 'warning',
        };
        
        return {
          id: log.id,
          type: log.eventType,
          severity: severityMap[log.eventType] || 'info',
          timestamp: log.timestamp,
          vesselId: log.vesselId,
          message: log.description,
          data: {
            positionLat: log.positionLat,
            positionLon: log.positionLon,
            previousStatus: log.previousStatus,
            currentStatus: log.currentStatus,
          },
        };
      });
      
      res.json(events);
      return;
    }
  } catch (error) {
    console.error('Error fetching operation logs, falling back to mock events:', error);
    // Fall through to mock events
  }
  
  // Fallback to mock events if database is not available
  const portCalls = getMockPortCalls(tenantId);
  
  // Get vessels from database (with fallback to mock data)
  let vessels;
  try {
    vessels = await vesselDb.getVessels(tenantId);
  if (vessels.length === 0) {
      vessels = getMockVessels(tenantId);
    }
  } catch (error) {
    console.error('Error fetching vessels from database, using mock data:', error);
    vessels = getMockVessels(tenantId);
  }
  
  const now = new Date();
  
  const events = [];
  
  // Generate events from port calls
  portCalls.forEach((pc) => {
    const vessel = vessels.find((v) => v.id === pc.vesselId);
    if (!vessel) return;
    
    // AIS updates - only in development mode
    if (process.env.NODE_ENV !== 'production') {
      const aisPos = getMockAisPosition(pc.vesselId);
      if (aisPos) {
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
      }
    }
    
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
  
  // Check geofence entries (vessel monitoring) - only in development mode
  if (process.env.NODE_ENV !== 'production') {
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
  }
  
  // Sort by timestamp (newest first)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Return last 50 events
  res.json(events.slice(0, 50));
});

// GET /api/dashboard/geofences - Get operational zones for map
router.get('/geofences', async (req, res) => {
  const { tenantId } = req;
  
  try {
    // Try to get from database first
    const portsDb = await import('../db/ports.js');
    const ports = await portsDb.getPorts(tenantId);
    
    const geofences = ports.map((port) => {
      const geofence = {
        id: port.id,
        name: port.name,
        type: port.type || 'PORT',
      };
      
      // If polygon exists, use it; otherwise use circular geofence
      if (port.polygon && Array.isArray(port.polygon) && port.polygon.length >= 3) {
        geofence.polygon = port.polygon;
      } else if (port.lat && port.lon) {
        geofence.center = {
          lat: port.lat || port.latitude,
          lon: port.lon || port.longitude,
        };
        geofence.radius = port.type === 'PORT' ? 5000 : 
                          port.type === 'TERMINAL' ? 2000 : 
                          port.type === 'BERTH' ? 500 : 10000;
      }
      
      return geofence;
    });
    
    // If no ports in database, fallback to mock data (development only)
    if (geofences.length === 0 && process.env.NODE_ENV !== 'production') {
      const opsSites = getMockOpsSites(tenantId);
      const mockGeofences = opsSites.map((site) => {
        const geofence = {
          id: site.id,
          name: site.name,
          type: site.type,
        };
        
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
      
      return res.json(mockGeofences);
    }
    
    res.json(geofences);
  } catch (error) {
    console.error('Error fetching geofences:', error);
    // Fallback to mock data on error (development only)
    if (process.env.NODE_ENV !== 'production') {
      const opsSites = getMockOpsSites(tenantId);
      const geofences = opsSites.map((site) => {
        const geofence = {
          id: site.id,
          name: site.name,
          type: site.type,
        };
        
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
      
      return res.json(geofences);
    }
    
    res.status(500).json({ message: 'Failed to fetch geofences' });
  }
});

export default router;

