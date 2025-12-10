import express from 'express';
import { getMockOpsSites, createMockOpsSite, updateMockOpsSite, deleteMockOpsSite } from '../data/mockData.js';

const router = express.Router();

// GET /api/ops-sites - List all ops sites for tenant
router.get('/', (req, res) => {
  const { tenantId } = req;
  const sites = getMockOpsSites(tenantId);
  res.json(sites);
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
router.get('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const sites = getMockOpsSites(tenantId);
  const site = sites.find((s) => s.id === id);
  
  if (!site) {
    return res.status(404).json({ message: 'Ops site not found' });
  }
  
  res.json(site);
});

// POST /api/ops-sites - Create new ops site
router.post('/', (req, res) => {
  const { tenantId } = req;
  const { name, code, type, country, latitude, longitude, polygon, parentCode } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ message: 'Name and type are required' });
  }
  
  const newSite = createMockOpsSite(tenantId, {
    name,
    code,
    type,
    country,
    latitude,
    longitude,
    polygon, // Store polygon coordinates
    parentCode, // Store parent code for hierarchical relationships
  });
  
  res.status(201).json(newSite);
});

// PUT /api/ops-sites/:id - Update ops site
router.put('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { name, code, type, country, latitude, longitude, polygon, parentCode } = req.body;
  
  const updated = updateMockOpsSite(tenantId, id, {
    name,
    code,
    type,
    country,
    latitude,
    longitude,
    polygon, // Update polygon coordinates
    parentCode, // Update parent code
  });
  
  if (!updated) {
    return res.status(404).json({ message: 'Ops site not found' });
  }
  
  res.json(updated);
});

// DELETE /api/ops-sites/:id - Delete ops site
router.delete('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  const deleted = deleteMockOpsSite(tenantId, id);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Ops site not found' });
  }
  
  res.json({ message: 'Ops site deleted' });
});

export default router;

