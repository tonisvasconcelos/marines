import express from 'express';
import {
  getMockTeams,
  createMockTeam,
  updateMockTeam,
  deleteMockTeam,
} from '../data/mockData.js';

const router = express.Router();

// GET /api/teams - List all teams for tenant
router.get('/', (req, res) => {
  const { tenantId } = req;
  const teams = getMockTeams(tenantId);
  res.json(teams);
});

// GET /api/teams/:id - Get single team
router.get('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const teams = getMockTeams(tenantId);
  const team = teams.find((t) => t.id === id);
  
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }
  
  res.json(team);
});

// POST /api/teams - Create new team
router.post('/', (req, res) => {
  const { tenantId } = req;
  const { name, description, color } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Team name is required' });
  }
  
  const newTeam = createMockTeam(tenantId, {
    name,
    description,
    color,
  });
  
  res.status(201).json(newTeam);
});

// PUT /api/teams/:id - Update team
router.put('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { name, description, color } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Team name is required' });
  }
  
  const updated = updateMockTeam(tenantId, id, {
    name,
    description,
    color,
  });
  
  if (!updated) {
    return res.status(404).json({ message: 'Team not found' });
  }
  
  res.json(updated);
});

// DELETE /api/teams/:id - Delete team
router.delete('/:id', (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  const deleted = deleteMockTeam(tenantId, id);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Team not found' });
  }
  
  res.json({ message: 'Team deleted' });
});

export default router;

