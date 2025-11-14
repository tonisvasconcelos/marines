import express from 'express';
import { getMockPortCalls, getMockPorts, getMockVessels } from '../data/mockData.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { tenantId } = req;
  const { limit, sort, status, vesselId } = req.query;
  
  let portCalls = getMockPortCalls(tenantId);
  
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
  
  if (limit) {
    portCalls = portCalls.slice(0, parseInt(limit));
  }
  
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

router.post('/', (req, res) => {
  const { tenantId } = req;
  // In production, create port call in DB
  res.status(201).json({ message: 'Port call created', id: 'new-pc-id' });
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

