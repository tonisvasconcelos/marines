import express from 'express';
import { getMockOpsSites, createMockOpsSite, updateMockOpsSite, deleteMockOpsSite } from '../data/mockData.js';
import * as portsDb from '../db/ports.js';
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

// GET /api/ops-sites/:id/portcalls - Get port calls for an ops site
// This must come before /:id route to avoid route conflicts
router.get('/:id/portcalls', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { limit, days } = req.query;
  
  const sites = getMockOpsSites(tenantId);
  const site = sites.find((s) => s.id === id);
  
  if (!site) {
    return res.status(404).json({ message: 'Ops site not found' });
  }
  
  // Note: AISStream does not provide port calls API
  // Port calls are managed internally via the /api/port-calls endpoint
  // Return empty array - port calls should be fetched from the port-calls endpoint
  // and filtered by ops site if needed
  res.json([]);
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

