/**
 * Fleet Routes
 * Fleets represent collections of vessels in the app
 * Each tenant can create multiple fleets to organize their vessels
 */

import express from 'express';
import * as fleetsDb from '../db/fleets.js';
import * as vesselsDb from '../db/vessels.js';
import crypto from 'crypto';

const router = express.Router();

// GET /api/fleets - List all fleets for tenant
router.get('/', async (req, res) => {
  const { tenantId } = req;
  
  try {
    const fleets = await fleetsDb.getFleets(tenantId);
    
    // Get vessel counts for each fleet
    const fleetsWithCounts = await Promise.all(
      fleets.map(async (fleet) => {
        const vessels = await fleetsDb.getFleetVessels(fleet.id, tenantId);
        return {
          ...fleet,
          vesselCount: vessels.length,
        };
      })
    );
    
    res.json(fleetsWithCounts);
  } catch (error) {
    console.error('Error fetching fleets:', error);
    res.status(500).json({ message: 'Failed to fetch fleets', error: error.message });
  }
});

// GET /api/fleets/:id - Get single fleet with vessels
router.get('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    const fleet = await fleetsDb.getFleetById(id, tenantId);
    
    if (!fleet) {
      return res.status(404).json({ message: 'Fleet not found' });
    }
    
    const vessels = await fleetsDb.getFleetVessels(id, tenantId);
    
    res.json({
      ...fleet,
      vessels,
      vesselCount: vessels.length,
    });
  } catch (error) {
    console.error('Error fetching fleet:', error);
    res.status(500).json({ message: 'Failed to fetch fleet', error: error.message });
  }
});

// POST /api/fleets - Create new fleet
router.post('/', async (req, res) => {
  const { tenantId } = req;
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Fleet name is required' });
  }
  
  try {
    const fleetData = {
      id: `fleet-${crypto.randomUUID()}`,
      tenant_id: tenantId,
      name,
      description: description || null,
    };
    
    const newFleet = await fleetsDb.createFleet(fleetData);
    res.status(201).json({
      ...newFleet,
      vesselCount: 0,
      vessels: [],
    });
  } catch (error) {
    console.error('Error creating fleet:', error);
    res.status(500).json({ message: 'Failed to create fleet', error: error.message });
  }
});

// PUT /api/fleets/:id - Update fleet
router.put('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const { name, description } = req.body;
  
  try {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    
    const updatedFleet = await fleetsDb.updateFleet(id, tenantId, updates);
    
    if (!updatedFleet) {
      return res.status(404).json({ message: 'Fleet not found' });
    }
    
    const vessels = await fleetsDb.getFleetVessels(id, tenantId);
    
    res.json({
      ...updatedFleet,
      vessels,
      vesselCount: vessels.length,
    });
  } catch (error) {
    console.error('Error updating fleet:', error);
    res.status(500).json({ message: 'Failed to update fleet', error: error.message });
  }
});

// DELETE /api/fleets/:id - Delete fleet
router.delete('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    const deleted = await fleetsDb.deleteFleet(id, tenantId);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Fleet not found' });
    }
    
    res.json({ message: 'Fleet deleted' });
  } catch (error) {
    console.error('Error deleting fleet:', error);
    res.status(500).json({ message: 'Failed to delete fleet', error: error.message });
  }
});

// POST /api/fleets/:id/vessels - Add vessel to fleet
router.post('/:id/vessels', async (req, res) => {
  const { tenantId } = req;
  const { id: fleetId } = req.params;
  const { vesselId } = req.body;
  
  if (!vesselId) {
    return res.status(400).json({ message: 'Vessel ID is required' });
  }
  
  try {
    // Verify fleet exists
    const fleet = await fleetsDb.getFleetById(fleetId, tenantId);
    if (!fleet) {
      return res.status(404).json({ message: 'Fleet not found' });
    }
    
    // Verify vessel exists and belongs to tenant
    const vessel = await vesselsDb.getVesselById(vesselId, tenantId);
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    const association = await fleetsDb.addVesselToFleet(fleetId, vesselId, tenantId);
    
    if (!association) {
      return res.status(400).json({ message: 'Vessel is already in this fleet' });
    }
    
    res.status(201).json({ message: 'Vessel added to fleet', association });
  } catch (error) {
    console.error('Error adding vessel to fleet:', error);
    res.status(500).json({ message: 'Failed to add vessel to fleet', error: error.message });
  }
});

// DELETE /api/fleets/:id/vessels/:vesselId - Remove vessel from fleet
router.delete('/:id/vessels/:vesselId', async (req, res) => {
  const { tenantId } = req;
  const { id: fleetId, vesselId } = req.params;
  
  try {
    const removed = await fleetsDb.removeVesselFromFleet(fleetId, vesselId, tenantId);
    
    if (!removed) {
      return res.status(404).json({ message: 'Vessel not found in fleet' });
    }
    
    res.json({ message: 'Vessel removed from fleet' });
  } catch (error) {
    console.error('Error removing vessel from fleet:', error);
    res.status(500).json({ message: 'Failed to remove vessel from fleet', error: error.message });
  }
});

// GET /api/fleets/:id/status - Get fleet status with vessel positions
router.get('/:id/status', async (req, res) => {
  const { tenantId } = req;
  const { id: fleetId } = req.params;
  
  try {
    const fleet = await fleetsDb.getFleetById(fleetId, tenantId);
    
    if (!fleet) {
      return res.status(404).json({ message: 'Fleet not found' });
    }
    
    const vessels = await fleetsDb.getFleetVessels(fleetId, tenantId);
    
    // Get latest positions for each vessel
    const vesselsWithPositions = await Promise.all(
      vessels.map(async (vessel) => {
        try {
          const position = await vesselsDb.getLatestPosition(vessel.id, tenantId);
          return {
            ...vessel,
            position: position || null,
          };
        } catch (error) {
          console.error(`Error fetching position for vessel ${vessel.id}:`, error);
          return {
            ...vessel,
            position: null,
          };
        }
      })
    );
    
    res.json({
      fleet,
      vessels: vesselsWithPositions,
      vesselCount: vesselsWithPositions.length,
      vesselsWithPosition: vesselsWithPositions.filter(v => v.position !== null).length,
    });
  } catch (error) {
    console.error('Error fetching fleet status:', error);
    res.status(500).json({ message: 'Failed to fetch fleet status', error: error.message });
  }
});

export default router;

