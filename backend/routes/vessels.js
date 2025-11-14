import express from 'express';
import { getMockVessels } from '../data/mockData.js';
import * as myshiptracking from '../services/myshiptracking.js';
import { getAisConfig } from '../services/aisConfig.js';
import {
  getCustomersByVessel,
  createVesselCustomerAssociation,
  deleteVesselCustomerAssociation,
} from '../data/mockData.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { tenantId } = req;
  
  // Try to get vessels from MyShipTracking if configured
  const aisConfig = getAisConfig(tenantId);
  
  if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
    try {
      // For now, return mock vessels but enrich with AIS data
      // In production, you might want to sync vessels from MyShipTracking
      const vessels = getMockVessels(tenantId);
      
      // Enrich each vessel with data from MyShipTracking if MMSI is available
      const enrichedVessels = await Promise.all(
        vessels.map(async (vessel) => {
          if (vessel.mmsi) {
            try {
              const aisData = await myshiptracking.getVesselByMmsi(
                vessel.mmsi,
                aisConfig.apiKey,
                aisConfig.secretKey
              );
              
              // Merge AIS data with vessel data
              return {
                ...vessel,
                ...aisData,
                // Preserve our internal IDs
                id: vessel.id,
                tenantId: vessel.tenantId,
              };
            } catch (error) {
              console.error(`Failed to fetch AIS data for vessel ${vessel.mmsi}:`, error);
              return vessel; // Return original vessel if API call fails
            }
          }
          return vessel;
        })
      );
      
      res.json(enrichedVessels);
      return;
    } catch (error) {
      console.error('Error fetching vessels from MyShipTracking:', error);
      // Fall through to mock data
    }
  }
  
  // Fallback to mock data
  const vessels = getMockVessels(tenantId);
  res.json(vessels);
});

router.post('/', async (req, res) => {
  const { tenantId } = req;
  const { name, imo, mmsi, callSign, flag } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Vessel name is required' });
  }
  
  // In production, create vessel in DB
  // For now, use mock data
  const { createMockVessel } = await import('../data/mockData.js');
  const newVessel = createMockVessel(tenantId, {
    name,
    imo,
    mmsi,
    callSign,
    flag,
  });
  
  // Try to enrich with MyShipTracking data if IMO or MMSI is provided
  const aisConfig = getAisConfig(tenantId);
  
  if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
    try {
      let aisData = null;
      if (mmsi) {
        aisData = await myshiptracking.getVesselByMmsi(
          mmsi,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      } else if (imo) {
        // Remove 'IMO' prefix if present
        const imoNumber = imo.replace(/^IMO/i, '').trim();
        aisData = await myshiptracking.getVesselByImo(
          imoNumber,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      }
      
      if (aisData) {
        // Merge AIS data
        Object.assign(newVessel, aisData);
        // Preserve our internal IDs
        newVessel.id = newVessel.id;
        newVessel.tenantId = tenantId;
      }
    } catch (error) {
      console.error('Failed to fetch AIS data for new vessel:', error);
      // Continue without AIS enrichment
    }
  }
  
  res.status(201).json(newVessel);
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
  
  const vessels = getMockVessels(tenantId);
  const vessel = vessels.find((v) => v.id === id && v.tenantId === tenantId);
  
  if (!vessel) {
    return res.status(404).json({ message: 'Vessel not found' });
  }
  
  const aisConfig = getAisConfig(tenantId);
  
  // Try to get position from AIS provider if configured
  if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
    try {
      let position = null;
      
      if (vessel.mmsi) {
        position = await myshiptracking.getVesselPosition(
          vessel.mmsi,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      } else if (vessel.imo) {
        // Remove 'IMO' prefix if present
        const imoNumber = vessel.imo.replace(/^IMO/i, '').trim();
        position = await myshiptracking.getVesselByImo(
          imoNumber,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      }
      
      if (position && (position.latitude || position.lat)) {
        // Transform MyShipTracking response to our format
        const positionData = {
          lat: position.latitude || position.lat,
          lon: position.longitude || position.lon,
          timestamp: position.timestamp || position.last_position_time || new Date().toISOString(),
          sog: position.speed || position.sog,
          cog: position.course || position.cog,
          heading: position.heading,
          navStatus: position.nav_status || position.status,
          source: 'myshiptracking',
        };
        
        // Store position in history
        try {
          const { storePositionHistory } = await import('../data/mockData.js');
          storePositionHistory(id, tenantId, positionData);
        } catch (error) {
          console.error('Failed to store position history:', error);
          // Don't fail the request if history storage fails
        }
        
        res.json(positionData);
        return;
      }
    } catch (error) {
      // Log error but fall back to mock data instead of returning 500
      console.warn(`Failed to fetch vessel position from AIS provider:`, error.message);
      console.log('Falling back to mock AIS data');
      // Continue to fallback below
    }
  }
  
  // Fallback to mock data (if AIS provider not configured, failed, or returned no data)
  const { getMockAisPosition, storePositionHistory } = await import('../data/mockData.js');
  const mockPosition = getMockAisPosition(id);
  
  // Ensure mock position has tenantId for consistency
  if (mockPosition && !mockPosition.tenantId) {
    mockPosition.tenantId = tenantId;
  }
  
  // Store position in history (only if we have valid coordinates)
  if (mockPosition && (mockPosition.lat || mockPosition.Lat) && (mockPosition.lon || mockPosition.Lon)) {
    try {
      storePositionHistory(id, tenantId, mockPosition);
    } catch (error) {
      console.error('Failed to store position history:', error);
      // Don't fail the request if history storage fails
    }
  }
  
  res.json(mockPosition);
});

// GET /api/vessels/:id/position-history - Get vessel position history
router.get('/:id/position-history', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  
  const vessels = getMockVessels(tenantId);
  const vessel = vessels.find((v) => v.id === id && v.tenantId === tenantId);
  
  if (!vessel) {
    return res.status(404).json({ message: 'Vessel not found' });
  }
  
  const { getPositionHistory } = await import('../data/mockData.js');
  const history = getPositionHistory(id, tenantId, limit);
  
  res.json(history);
});

router.get('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  const vessels = getMockVessels(tenantId);
  let vessel = vessels.find((v) => v.id === id && v.tenantId === tenantId);
  
  if (!vessel) {
    return res.status(404).json({ message: 'Vessel not found' });
  }
  
  // Try to enrich with MyShipTracking data
  const aisConfig = getAisConfig(tenantId);
  
  if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
    try {
      let aisData = null;
      if (vessel.mmsi) {
        aisData = await myshiptracking.getVesselByMmsi(
          vessel.mmsi,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      } else if (vessel.imo) {
        // Remove 'IMO' prefix if present
        const imoNumber = vessel.imo.replace(/^IMO/i, '').trim();
        aisData = await myshiptracking.getVesselByImo(
          imoNumber,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      }
      
      if (aisData) {
        // Merge AIS data with vessel data
        vessel = {
          ...vessel,
          ...aisData,
          // Preserve our internal IDs
          id: vessel.id,
          tenantId: vessel.tenantId,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch AIS data for vessel:`, error);
      // Continue with vessel data without AIS enrichment
    }
  }
  
  res.json(vessel);
});

export default router;

