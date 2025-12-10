import express from 'express';
import { getAisConfig } from '../services/aisConfig.js';
import {
  getCustomersByVessel,
  createVesselCustomerAssociation,
  deleteVesselCustomerAssociation,
} from '../data/mockData.js';
import * as vesselDb from '../db/vessels.js';
import * as operationLogsDb from '../db/operationLogs.js';
import { fetchLatestPositionByMmsi } from '../services/aisstream.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { tenantId } = req;
  
  try {
    // Get vessels from database (with fallback to mock data)
    // Note: AISStream is real-time position data only, not vessel lookup
    // Vessel enrichment with AIS data happens on-demand via position endpoints
    const vessels = await vesselDb.getVessels(tenantId);
    res.json(vessels);
  } catch (error) {
    console.error('Error fetching vessels:', error);
    res.status(500).json({ message: 'Failed to fetch vessels' });
  }
});

// GET /api/vessels/preview-position - Get position preview by IMO or MMSI (for form)
router.get('/preview-position', async (req, res) => {
  const { tenantId } = req;
  const { imo, mmsi } = req.query;
  
  if (!imo && !mmsi) {
    return res.status(400).json({ message: 'IMO or MMSI is required' });
  }
  
  // AISStream only supports MMSI, not IMO
  if (!mmsi) {
    return res.status(400).json({ 
      message: 'MMSI is required for AIS position preview. AISStream does not support IMO queries.' 
    });
  }
  
  // Try AISStream
  try {
    const position = await fetchLatestPositionByMmsi(String(mmsi));
    
    if (position && position.lat !== undefined && position.lon !== undefined) {
      const positionData = {
        lat: position.lat,
        lon: position.lon,
        timestamp: position.timestamp || new Date().toISOString(),
        sog: position.sog,
        cog: position.cog,
        heading: position.heading,
        navStatus: position.navStatus,
        source: 'aisstream',
      };
      res.json(positionData);
      return;
    }
  } catch (error) {
    console.warn(`Failed to fetch preview position from AISStream:`, error.message);
    // Fall back to mock data
  }
  
  // Fallback to mock data (if AIS provider not configured, failed, or returned no data)
  const { getMockAisPosition } = await import('../data/mockData.js');
  // Use a temporary vessel ID for mock data
  const tempVesselId = `temp-${mmsi}`;
  const mockPosition = getMockAisPosition(tempVesselId);
  
  // Normalize position data
  const positionData = {
    ...mockPosition,
    lat: mockPosition.lat || mockPosition.Lat,
    lon: mockPosition.lon || mockPosition.Lon,
  };
  
  res.json(positionData);
});

router.post('/', async (req, res) => {
  const { tenantId } = req;
  const { name, imo, mmsi, callSign, flag } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Vessel name is required' });
  }
  
  try {
    // Create vessel in database (with fallback to mock data)
    let newVessel = await vesselDb.createVessel(tenantId, {
      name,
      imo,
      mmsi,
      callSign,
      flag,
    });
    
    // Try to fetch initial position from AISStream if MMSI is provided
    // Note: AISStream only supports MMSI, not IMO
    let initialPosition = null;
    if (mmsi) {
      try {
        const position = await fetchLatestPositionByMmsi(String(mmsi));
        
        if (position && position.lat !== undefined && position.lon !== undefined) {
          initialPosition = position;
          // Store the position in position_history when vessel is created
          try {
            await vesselDb.storePositionHistory(newVessel.id, tenantId, {
              lat: position.lat,
              lon: position.lon,
              timestamp: position.timestamp || new Date().toISOString(),
              sog: position.sog,
              cog: position.cog,
              heading: position.heading,
              navStatus: position.navStatus,
              source: 'aisstream',
            });
            console.log(`[Vessel Creation] Stored initial position for vessel ${newVessel.id} from AISStream`);
          } catch (posError) {
            console.error('Failed to store initial position:', posError);
            // Continue even if position storage fails
          }
        }
      } catch (error) {
        console.error('[Vessel Creation] Failed to fetch initial position from AISStream:', {
          mmsi,
          vesselId: newVessel.id,
          error: error.message,
          errorType: error.constructor.name,
          apiKeyConfigured: !!process.env.AISSTREAM_API_KEY,
        });
        // Continue without AIS position - vessel creation succeeds regardless
      }
    } else if (imo) {
      console.warn(`Vessel created with IMO but no MMSI. AISStream requires MMSI for position queries.`);
    }
    
    // Create operation log for vessel creation
    try {
      await operationLogsDb.createOperationLog({
        tenantId,
        vesselId: newVessel.id,
        eventType: 'VESSEL_CREATED',
        description: `New vessel "${newVessel.name}" was created${newVessel.mmsi ? ` (MMSI: ${newVessel.mmsi})` : ''}${newVessel.imo ? ` (IMO: ${newVessel.imo})` : ''}`,
        positionLat: initialPosition?.lat || null,
        positionLon: initialPosition?.lon || null,
      });
    } catch (logError) {
      console.error('Failed to create operation log for vessel creation:', logError);
      // Don't fail the request if logging fails
    }
    
    res.status(201).json(newVessel);
  } catch (error) {
    console.error('Error creating vessel:', error);
    res.status(500).json({ message: 'Failed to create vessel' });
  }
});

// GET /api/vessels/:id/customers - Get customers associated with vessel
// This must come before /:id route to avoid route conflicts
router.get('/:id/customers', (req, res) => {
  const { tenantId } = req;
  const { id: vesselId } = req.params;
  
  const customers = getCustomersByVessel(tenantId, vesselId);
  res.json(customers);
});

// POST /api/vessels/:id/customers - Associate customer with vessel
router.post('/:id/customers', (req, res) => {
  const { tenantId } = req;
  const { id: vesselId } = req.params;
  const { customerId } = req.body;
  
  if (!customerId) {
    return res.status(400).json({ message: 'customerId is required' });
  }
  
  const association = createVesselCustomerAssociation(tenantId, vesselId, customerId);
  
  if (!association) {
    return res.status(400).json({ message: 'Association already exists' });
  }
  
  res.status(201).json(association);
});

// DELETE /api/vessels/:id/customers/:customerId - Remove customer association
router.delete('/:id/customers/:customerId', (req, res) => {
  const { tenantId } = req;
  const { id: vesselId, customerId } = req.params;
  
  const deleted = deleteVesselCustomerAssociation(tenantId, vesselId, customerId);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Association not found' });
  }
  
  res.json({ message: 'Association removed' });
});

// GET /api/vessels/:id/position - Get current vessel position from AIS
// This must come before /:id route to avoid route conflicts
router.get('/:id/position', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    const vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // Try AISStream first (now the default provider)
    if (vessel.mmsi) {
      try {
        const position = await fetchLatestPositionByMmsi(String(vessel.mmsi));
        
        if (position && position.lat !== undefined && position.lon !== undefined) {
          const positionData = {
            lat: position.lat,
            lon: position.lon,
            timestamp: position.timestamp || new Date().toISOString(),
            sog: position.sog,
            cog: position.cog,
            heading: position.heading,
            navStatus: position.navStatus,
            source: 'aisstream',
          };
          
          // Store position in history
          try {
            await vesselDb.storePositionHistory(id, tenantId, positionData);
            
            // Create operation log for position update
            await operationLogsDb.createOperationLog({
              tenantId,
              vesselId: id,
              eventType: 'POSITION_UPDATE',
              description: `Vessel position updated: ${positionData.lat.toFixed(6)}, ${positionData.lon.toFixed(6)}${positionData.sog ? ` (Speed: ${positionData.sog} kn)` : ''}`,
              positionLat: positionData.lat,
              positionLon: positionData.lon,
            });
          } catch (error) {
            console.error('Failed to store position history:', error);
            // Don't fail the request if history storage fails
          }
          
          res.json(positionData);
          return;
        }
      } catch (error) {
        console.error('[Vessel Position] Failed to fetch position from AISStream:', {
          vesselId: id,
          mmsi: vessel.mmsi,
          error: error.message,
          errorType: error.constructor.name,
          apiKeyConfigured: !!process.env.AISSTREAM_API_KEY,
        });
        // Fall through to fallback options
      }
    } else {
      console.warn(`Vessel ${id} does not have MMSI. AISStream requires MMSI for position queries.`);
    }
    
    // Fallback 1: Try to get latest stored position from database
    try {
      const latestPosition = await vesselDb.getLatestPosition(id, tenantId);
      if (latestPosition) {
        res.json({
          ...latestPosition,
          source: latestPosition.source || 'stored',
        });
        return;
      }
    } catch (error) {
      console.warn('Failed to fetch stored position:', error.message);
    }
    
    // Fallback 2: Mock data (for development/testing)
    const { getMockAisPosition } = await import('../data/mockData.js');
    const mockPosition = getMockAisPosition(id);
    
    // Ensure mock position has tenantId for consistency
    if (mockPosition && !mockPosition.tenantId) {
      mockPosition.tenantId = tenantId;
    }
    
    // Store mock position in history if valid
    if (mockPosition && (mockPosition.lat || mockPosition.Lat) && (mockPosition.lon || mockPosition.Lon)) {
      try {
        await vesselDb.storePositionHistory(id, tenantId, mockPosition);
        
        const lat = mockPosition.lat || mockPosition.Lat;
        const lon = mockPosition.lon || mockPosition.Lon;
        
        // Create operation log for position update
        await operationLogsDb.createOperationLog({
          tenantId,
          vesselId: id,
          eventType: 'POSITION_UPDATE',
          description: `Vessel position updated (mock): ${lat.toFixed(6)}, ${lon.toFixed(6)}${mockPosition.sog ? ` (Speed: ${mockPosition.sog} kn)` : ''}`,
          positionLat: lat,
          positionLon: lon,
        });
      } catch (error) {
        console.error('Failed to store position history:', error);
        // Don't fail the request if history storage fails
      }
    }
    
    res.json(mockPosition);
  } catch (error) {
    console.error('Error fetching vessel position:', error);
    res.status(500).json({ message: 'Failed to fetch vessel position' });
  }
});

// GET /api/vessels/:id/position-history - Get vessel position history
router.get('/:id/position-history', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // Get position history from database (with fallback to mock data)
    const history = await vesselDb.getPositionHistory(id, tenantId, limit);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching position history:', error);
    res.status(500).json({ message: 'Failed to fetch position history' });
  }
});

router.get('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    let vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
  
  // Note: AISStream is real-time position data only, not vessel lookup
  // Vessel enrichment with AIS data happens on-demand via position endpoints
  res.json(vessel);
  } catch (error) {
    console.error('Error fetching vessel:', error);
    res.status(500).json({ message: 'Failed to fetch vessel' });
  }
});

// DELETE /api/vessels/:id - Delete a vessel
router.delete('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    // Check if vessel exists
    const vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // Delete vessel from database (with fallback to mock data)
    const deleted = await vesselDb.deleteVessel(id, tenantId);
    
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete vessel' });
    }
    
    res.json({ message: 'Vessel deleted successfully' });
  } catch (error) {
    console.error('Error deleting vessel:', error);
    res.status(500).json({ message: 'Failed to delete vessel' });
  }
});

export default router;

