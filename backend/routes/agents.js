import express from 'express';
import {
  getMockAgents,
  createMockAgent,
  updateMockAgent,
  deleteMockAgent,
  getAgentsByVessel,
  createAgentVesselAssociation,
  deleteAgentVesselAssociation,
  getAgentsByCustomer,
  createAgentCustomerAssociation,
  deleteAgentCustomerAssociation,
  getAgentsByPortCall,
  createAgentPortCallAssociation,
  deleteAgentPortCallAssociation,
} from '../data/mockData.js';

const router = express.Router();

// GET /api/agents - List all agents for tenant
router.get('/', (req, res) => {
  const { tenantId } = req;
  const agents = getMockAgents(tenantId);
  res.json(agents);
});

// POST /api/agents - Create new agent
router.post('/', (req, res) => {
  const { tenantId } = req;
  const { name, email, phone, role, teamId, active } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Agent name is required' });
  }
  
  const newAgent = createMockAgent(tenantId, {
    name,
    email,
    phone,
    role,
    teamId,
    active: active !== undefined ? active : true,
  });
  
  res.status(201).json(newAgent);
});

// GET /api/agents/vessels/:vesselId - Get agents for a vessel
// This must come before /:id route to avoid route conflicts
router.get('/vessels/:vesselId', (req, res) => {
  const { tenantId } = req;
  const { vesselId } = req.params;
  const agents = getAgentsByVessel(tenantId, vesselId);
  res.json(agents);
});

// POST /api/agents/vessels/:vesselId - Associate agent with vessel
router.post('/vessels/:vesselId', (req, res) => {
  const { tenantId } = req;
  const { vesselId } = req.params;
  const { agentId } = req.body;
  
  if (!agentId) {
    return res.status(400).json({ message: 'agentId is required' });
  }
  
  const association = createAgentVesselAssociation(tenantId, agentId, vesselId);
  
  if (!association) {
    return res.status(400).json({ message: 'Association already exists' });
  }
  
  res.status(201).json(association);
});

// DELETE /api/agents/vessels/:vesselId/:agentId - Remove agent-vessel association
router.delete('/vessels/:vesselId/:agentId', (req, res) => {
  const { tenantId } = req;
  const { vesselId, agentId } = req.params;
  
  const deleted = deleteAgentVesselAssociation(tenantId, agentId, vesselId);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Association not found' });
  }
  
  res.json({ message: 'Association removed' });
});

// GET /api/agents/customers/:customerId - Get agents for a customer
router.get('/customers/:customerId', (req, res) => {
  const { tenantId } = req;
  const { customerId } = req.params;
  const agents = getAgentsByCustomer(tenantId, customerId);
  res.json(agents);
});

// POST /api/agents/customers/:customerId - Associate agent with customer
router.post('/customers/:customerId', (req, res) => {
  const { tenantId } = req;
  const { customerId } = req.params;
  const { agentId } = req.body;
  
  if (!agentId) {
    return res.status(400).json({ message: 'agentId is required' });
  }
  
  const association = createAgentCustomerAssociation(tenantId, agentId, customerId);
  
  if (!association) {
    return res.status(400).json({ message: 'Association already exists' });
  }
  
  res.status(201).json(association);
});

// DELETE /api/agents/customers/:customerId/:agentId - Remove agent-customer association
router.delete('/customers/:customerId/:agentId', (req, res) => {
  const { tenantId } = req;
  const { customerId, agentId } = req.params;
  
  const deleted = deleteAgentCustomerAssociation(tenantId, agentId, customerId);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Association not found' });
  }
  
  res.json({ message: 'Association removed' });
});

// GET /api/agents/port-calls/:portCallId - Get agents for a port call
router.get('/port-calls/:portCallId', (req, res) => {
  const { tenantId } = req;
  const { portCallId } = req.params;
  const agents = getAgentsByPortCall(tenantId, portCallId);
  res.json(agents);
});

// POST /api/agents/port-calls/:portCallId - Associate agent with port call
router.post('/port-calls/:portCallId', (req, res) => {
  const { tenantId } = req;
  const { portCallId } = req.params;
  const { agentId } = req.body;
  
  if (!agentId) {
    return res.status(400).json({ message: 'agentId is required' });
  }
  
  const association = createAgentPortCallAssociation(tenantId, agentId, portCallId);
  
  if (!association) {
    return res.status(400).json({ message: 'Association already exists' });
  }
  
  res.status(201).json(association);
});

// DELETE /api/agents/port-calls/:portCallId/:agentId - Remove agent-portcall association
router.delete('/port-calls/:portCallId/:agentId', (req, res) => {
  const { tenantId } = req;
  const { portCallId, agentId } = req.params;
  
  const deleted = deleteAgentPortCallAssociation(tenantId, agentId, portCallId);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Association not found' });
  }
  
  res.json({ message: 'Association removed' });
});

// GET /api/agents/:id - Get single agent
// This must come after all specific routes to avoid route conflicts
router.get('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const agents = getMockAgents(tenantId);
  const agent = agents.find((a) => a.id === id);
  
  if (!agent) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  
  res.json(agent);
});

// PUT /api/agents/:id - Update agent
router.put('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { name, email, phone, role, teamId, active } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Agent name is required' });
  }
  
  const updated = updateMockAgent(tenantId, id, {
    name,
    email,
    phone,
    role,
    teamId,
    active,
  });
  
  if (!updated) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  
  res.json(updated);
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  const deleted = deleteMockAgent(tenantId, id);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  
  res.json({ message: 'Agent deleted' });
});

export default router;

