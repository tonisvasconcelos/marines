import express from 'express';
import { getMockOpsSites, createMockOpsSite, updateMockOpsSite, deleteMockOpsSite } from '../data/mockData.js';
import * as portsDb from '../db/ports.js';
import * as vesselsDb from '../db/vessels.js';
import { fetchPortEstimates, fetchPortCalls, fetchVesselsInPort } from '../services/ais/index.js';
import { aisApiLimiter } from '../middleware/aisApiRateLimit.js';
import crypto from 'crypto';

const router = express.Router();

// GET /api/ops-sites - List all ops sites for tenant
router.get('/', async (req, res) => {
  const { tenantId } = req;
  const { type } = req.query;
  
  try {
    // Try to get from database first
    const ports = await portsDb.getPorts(tenantId, type || null);
    
    if (ports.length > 0) {
      // Transform ports to ops sites format
      const opsSites = ports.map(port => ({
        id: port.id,
        tenantId: port.tenantId,
        name: port.name,
        code: port.code || port.unlocode,
        type: port.type || 'PORT',
        country: port.countryCode || port.country,
        latitude: port.lat || port.latitude,
        longitude: port.lon || port.longitude,
        polygon: port.polygon,
        parentCode: port.parentCode,
      }));
      
      return res.json(opsSites);
    }
    
    // Fallback to mock data if database is empty (for development)
    if (process.env.NODE_ENV !== 'production') {
      const sites = getMockOpsSites(tenantId);
      return res.json(sites);
    }
    
    res.json([]);
  } catch (error) {
    console.error('Error fetching ops sites:', error);
    // Fallback to mock data on error (development only)
    if (process.env.NODE_ENV !== 'production') {
      const sites = getMockOpsSites(tenantId);
      return res.json(sites);
    }
    res.status(500).json({ message: 'Failed to fetch ops sites' });
  }
});

// GET /api/ops-sites/:id/port-estimates - Get port estimates (expected arrivals) from AIS API
// Returns estimated arrivals for the last 24h, filtered to only show tenant vessels
router.get('/:id/port-estimates', aisApiLimiter, async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    // Get ops site from database
    const site = await portsDb.getPortById(id, tenantId);
    if (!site) {
      return res.status(404).json({ message: 'Ops site not found' });
    }
    
    // Get all tenant vessels to filter results
    const tenantVessels = await vesselsDb.getVessels(tenantId);
    const tenantMmsis = new Set(tenantVessels.map(v => v.mmsi).filter(Boolean));
    const tenantImos = new Set(tenantVessels.map(v => v.imo?.replace(/^IMO/i, '').trim()).filter(Boolean));
    
    // Determine port identifier (port_id or unloco)
    let portId = null;
    let useUnloco = false;
    
    if (site.portId) {
      portId = site.portId;
      useUnloco = false;
    } else if (site.unlocode || site.code) {
      portId = site.unlocode || site.code;
      useUnloco = true;
    } else {
      return res.status(400).json({ 
        message: 'Ops site must have port_id or UN/LOCODE to fetch port estimates' 
      });
    }
    
    // Fetch port estimates from AIS API
    const estimates = await fetchPortEstimates(portId, { useUnloco });
    
    // Filter to only show tenant vessels
    const filteredEstimates = estimates.filter(est => 
      (est.mmsi && tenantMmsis.has(est.mmsi)) ||
      (est.imo && tenantImos.has(est.imo))
    );
    
    res.json(filteredEstimates);
  } catch (error) {
    console.error('[Ops Sites] Error fetching port estimates:', error);
    res.status(500).json({ 
      message: 'Failed to fetch port estimates',
      error: error.message 
    });
  }
});

// GET /api/ops-sites/:id/port-calls - Get port calls from AIS API
// Returns port call records, filtered to only show tenant vessels
router.get('/:id/port-calls-ais', aisApiLimiter, async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { fromdate, todate, days = 30, type } = req.query;
  
  try {
    // Get ops site from database
    const site = await portsDb.getPortById(id, tenantId);
    if (!site) {
      return res.status(404).json({ message: 'Ops site not found' });
    }
    
    // Get all tenant vessels to filter results
    const tenantVessels = await vesselsDb.getVessels(tenantId);
    const tenantMmsis = new Set(tenantVessels.map(v => v.mmsi).filter(Boolean));
    const tenantImos = new Set(tenantVessels.map(v => v.imo?.replace(/^IMO/i, '').trim()).filter(Boolean));
    
    // Determine port identifier (port_id or unloco)
    let portId = null;
    let useUnloco = false;
    
    if (site.portId) {
      portId = site.portId;
      useUnloco = false;
    } else if (site.unlocode || site.code) {
      portId = site.unlocode || site.code;
      useUnloco = true;
    } else {
      return res.status(400).json({ 
        message: 'Ops site must have port_id or UN/LOCODE to fetch port calls' 
      });
    }
    
    // Build query parameters
    const params = useUnloco ? { unloco: portId } : { portId: Number(portId) };
    if (fromdate) params.fromdate = String(fromdate);
    if (todate) params.todate = String(todate);
    if (days) params.days = Number(days);
    if (type !== undefined) params.type = Number(type);
    
    // Fetch port calls from AIS API
    const calls = await fetchPortCalls(params);
    
    // Filter to only show tenant vessels
    const filteredCalls = calls.filter(call => 
      (call.mmsi && tenantMmsis.has(call.mmsi)) ||
      (call.imo && tenantImos.has(call.imo))
    );
    
    res.json(filteredCalls);
  } catch (error) {
    console.error('[Ops Sites] Error fetching port calls:', error);
    res.status(500).json({ 
      message: 'Failed to fetch port calls',
      error: error.message 
    });
  }
});

// GET /api/ops-sites/:id/vessels-in-port - Get vessels currently in port from AIS API
// Returns vessels currently in port, filtered to only show tenant vessels
router.get('/:id/vessels-in-port', aisApiLimiter, async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    // Get ops site from database
    const site = await portsDb.getPortById(id, tenantId);
    if (!site) {
      return res.status(404).json({ message: 'Ops site not found' });
    }
    
    // Get all tenant vessels to filter results
    const tenantVessels = await vesselsDb.getVessels(tenantId);
    const tenantMmsis = new Set(tenantVessels.map(v => v.mmsi).filter(Boolean));
    const tenantImos = new Set(tenantVessels.map(v => v.imo?.replace(/^IMO/i, '').trim()).filter(Boolean));
    
    // Determine port identifier (port_id or unloco)
    let portId = null;
    let useUnloco = false;
    
    if (site.portId) {
      portId = site.portId;
      useUnloco = false;
    } else if (site.unlocode || site.code) {
      portId = site.unlocode || site.code;
      useUnloco = true;
    } else {
      return res.status(400).json({ 
        message: 'Ops site must have port_id or UN/LOCODE to fetch vessels in port' 
      });
    }
    
    // Fetch vessels in port from AIS API
    const vessels = await fetchVesselsInPort(portId, { useUnloco });
    
    // Filter to only show tenant vessels
    const filteredVessels = vessels.filter(vessel => 
      (vessel.mmsi && tenantMmsis.has(vessel.mmsi)) ||
      (vessel.imo && tenantImos.has(vessel.imo))
    );
    
    res.json(filteredVessels);
  } catch (error) {
    console.error('[Ops Sites] Error fetching vessels in port:', error);
    res.status(500).json({ 
      message: 'Failed to fetch vessels in port',
      error: error.message 
    });
  }
});

// GET /api/ops-sites/:id/portcalls - Get port calls for an ops site (legacy endpoint, kept for compatibility)
// This must come before /:id route to avoid route conflicts
router.get('/:id/portcalls', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { limit, days } = req.query;
  
  try {
    // Get ops site from database
    const site = await portsDb.getPortById(id, tenantId);
    if (!site) {
      return res.status(404).json({ message: 'Ops site not found' });
    }
    
    // Return empty array - use /port-calls-ais endpoint for AIS data
    res.json([]);
  } catch (error) {
    console.error('[Ops Sites] Error:', error);
    res.status(500).json({ message: 'Failed to fetch port calls' });
  }
});

// GET /api/ops-sites/:id - Get single ops site
router.get('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    const port = await portsDb.getPortById(id, tenantId);
    
    if (port) {
      // Transform to ops site format
      const opsSite = {
        id: port.id,
        tenantId: port.tenantId,
        name: port.name,
        code: port.code || port.unlocode,
        type: port.type || 'PORT',
        country: port.countryCode || port.country,
        latitude: port.lat || port.latitude,
        longitude: port.lon || port.longitude,
        polygon: port.polygon,
        parentCode: port.parentCode,
      };
      
      return res.json(opsSite);
    }
    
    // Fallback to mock data (development only)
    if (process.env.NODE_ENV !== 'production') {
      const sites = getMockOpsSites(tenantId);
      const site = sites.find((s) => s.id === id);
      if (site) {
        return res.json(site);
      }
    }
    
    res.status(404).json({ message: 'Ops site not found' });
  } catch (error) {
    console.error('Error fetching ops site:', error);
    res.status(500).json({ message: 'Failed to fetch ops site' });
  }
});

// POST /api/ops-sites - Create new ops site
router.post('/', async (req, res) => {
  const { tenantId } = req;
  const { name, code, type, country, latitude, longitude, polygon, parentCode } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ message: 'Name and type are required' });
  }
  
  try {
    const portData = {
      id: `ops-${crypto.randomUUID()}`,
      tenant_id: tenantId,
      name,
      code: code || null,
      type: type || 'PORT',
      country_code: country || null,
      lat: latitude || null,
      lon: longitude || null,
      polygon: polygon || null,
      parent_code: parentCode || null,
    };
    
    const newPort = await portsDb.createPort(portData);
    
    // Transform to ops site format
    const opsSite = {
      id: newPort.id,
      tenantId: newPort.tenantId,
      name: newPort.name,
      code: newPort.code || newPort.unlocode,
      type: newPort.type || 'PORT',
      country: newPort.countryCode || newPort.country,
      latitude: newPort.lat || newPort.latitude,
      longitude: newPort.lon || newPort.longitude,
      polygon: newPort.polygon,
      parentCode: newPort.parentCode,
    };
    
    res.status(201).json(opsSite);
  } catch (error) {
    console.error('Error creating ops site:', error);
    res.status(500).json({ message: 'Failed to create ops site', error: error.message });
  }
});

// PUT /api/ops-sites/:id - Update ops site
router.put('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { name, code, type, country, latitude, longitude, polygon, parentCode } = req.body;
  
  try {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code;
    if (type !== undefined) updates.type = type;
    if (country !== undefined) updates.country_code = country;
    if (latitude !== undefined) updates.lat = latitude;
    if (longitude !== undefined) updates.lon = longitude;
    if (polygon !== undefined) updates.polygon = polygon;
    if (parentCode !== undefined) updates.parent_code = parentCode;
    
    const updatedPort = await portsDb.updatePort(id, tenantId, updates);
    
    if (!updatedPort) {
      return res.status(404).json({ message: 'Ops site not found' });
    }
    
    // Transform to ops site format
    const opsSite = {
      id: updatedPort.id,
      tenantId: updatedPort.tenantId,
      name: updatedPort.name,
      code: updatedPort.code || updatedPort.unlocode,
      type: updatedPort.type || 'PORT',
      country: updatedPort.countryCode || updatedPort.country,
      latitude: updatedPort.lat || updatedPort.latitude,
      longitude: updatedPort.lon || updatedPort.longitude,
      polygon: updatedPort.polygon,
      parentCode: updatedPort.parentCode,
    };
    
    res.json(opsSite);
  } catch (error) {
    console.error('Error updating ops site:', error);
    res.status(500).json({ message: 'Failed to update ops site', error: error.message });
  }
});

// DELETE /api/ops-sites/:id - Delete ops site
router.delete('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    const deleted = await portsDb.deletePort(id, tenantId);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Ops site not found' });
    }
    
    res.json({ message: 'Ops site deleted' });
  } catch (error) {
    console.error('Error deleting ops site:', error);
    res.status(500).json({ message: 'Failed to delete ops site', error: error.message });
  }
});

export default router;

