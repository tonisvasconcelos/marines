import express from 'express';
import { getMockPortCalls, getMockPorts, getMockVessels } from '../data/mockData.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { tenantId } = req;
  const { limit, sort, status, vesselId } = req.query;
  
  let portCalls = getMockPortCalls(tenantId);
  const limitNumber = parseInt(limit, 10);
  // Validate limit is a positive integer, default to 50 if invalid or negative
  const parsedLimit = Number.isFinite(limitNumber) && limitNumber > 0 
    ? Math.min(limitNumber, 200) 
    : 50;
  
  // Filter by status
  if (status) {
    const statuses = status.split(',');
    portCalls = portCalls.filter((pc) => statuses.includes(pc.status));
  }
  
  // Filter by vesselId
  if (vesselId) {
    portCalls = portCalls.filter((pc) => pc.vesselId === vesselId);
  }
  
  // Simple sorting
  if (sort === 'eta:desc') {
    portCalls.sort((a, b) => new Date(b.eta) - new Date(a.eta));
  }
  
  portCalls = portCalls.slice(0, parsedLimit);
  
  res.json(portCalls);
});

router.get('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  const portCalls = getMockPortCalls(tenantId);
  const portCall = portCalls.find((pc) => pc.id === id && pc.tenantId === tenantId);
  
  if (!portCall) {
    return res.status(404).json({ message: 'Port call not found' });
  }
  
  res.json(portCall);
});

router.post('/', async (req, res) => {
  const { tenantId } = req;
  const { vesselId, portId, eta, etd, status = 'PLANNED', localReferenceType, localReferenceNumber } = req.body;
  
  try {
    // Validate required fields
    if (!vesselId) {
      return res.status(400).json({ message: 'vesselId is required' });
    }
    
    // Generate port call ID
    const portCallId = `portcall-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;
    
    // Insert into database
    const { query } = await import('../db/connection.js');
    await query(
      `INSERT INTO port_calls (
        id, tenant_id, vessel_id, port_id, status, eta, etd,
        local_reference_type, local_reference_number, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [portCallId, tenantId, vesselId, portId || null, status, eta || null, etd || null, localReferenceType || null, localReferenceNumber || null]
    );
    
    // Fetch the created port call
    const result = await query(
      'SELECT * FROM port_calls WHERE id = $1 AND tenant_id = $2',
      [portCallId, tenantId]
    );
    
    const portCall = result.rows[0];
    
    res.status(201).json({
      id: portCall.id,
      tenantId: portCall.tenant_id,
      vesselId: portCall.vessel_id,
      portId: portCall.port_id,
      status: portCall.status,
      eta: portCall.eta,
      etd: portCall.etd,
      localReferenceType: portCall.local_reference_type,
      localReferenceNumber: portCall.local_reference_number,
      createdAt: portCall.created_at,
      updatedAt: portCall.updated_at,
    });
  } catch (error) {
    console.error('[Port Calls] Error creating port call:', error);
    res.status(500).json({ message: 'Failed to create port call', error: error.message });
  }
});

router.put('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  // In production, update port call in DB
  res.json({ message: 'Port call updated', id });
});

router.delete('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  // In production, delete port call in DB
  res.json({ message: 'Port call deleted', id });
});

export default router;

